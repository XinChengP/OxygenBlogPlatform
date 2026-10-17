#!/usr/bin/env node
/**
 * 压缩超出平台上限的图片（一次性维护脚本）
 *
 * 背景：Workers Static Assets 单文件上限 25 MiB。图床里个别超大原图
 * （如 11388x3649 的 27.8MB PNG 横幅）超出上限，直接部署会被 wrangler 拒绝。
 * 本脚本把它们等比缩到 8000px 宽、质量 90 的 JPEG，写回 assets/ 并在
 * overridden.json 里登记，deploy-local.mjs 见到登记就不再按远端大小回源覆盖。
 *
 * 用法：node compress-oversized.mjs   （幂等，重复运行只处理未登记的超限文件）
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// sharp 复用博客项目的依赖（Next 自带），避免本目录装包
const sharp = require('../../node_modules/sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, 'assets');
const overridePath = join(__dirname, 'overridden.json');
const LIMIT = 24 * 1024 * 1024; // 留 1MiB 余量

const overrides = existsSync(overridePath) ? JSON.parse(readFileSync(overridePath, 'utf-8')) : {};

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(assetsDir).filter((f) => {
  const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
  if (!IMAGE_EXTS.includes(ext) || f.endsWith('manifest.json')) return false;
  return statSync(f).size > LIMIT;
});

console.log(`发现 ${files.length} 个超过 ${LIMIT / 1024 / 1024}MB 的文件`);

let changed = false;
for (const file of files) {
  const rel = file.slice(assetsDir.length + 1).split('\\').join('/');
  if (overrides[rel]) {
    console.log(`已登记，跳过: ${rel}`);
    continue;
  }
  const before = statSync(file).size;
  // GIF 动图不能转 JPEG（会丢动画）；超限 GIF 只能人工处理，这里报出来
  if (rel.toLowerCase().endsWith('.gif')) {
    console.error(`✘ 超限 GIF 无法自动压缩（会丢动画），请人工处理: ${rel}`);
    process.exitCode = 1;
    continue;
  }
  const buf = await sharp(file, { limitInputPixels: false })
    .resize({ width: 8000, withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  // 确保扩展名与内容一致：转 JPEG 后统一 .jpg 后缀
  const target = file.replace(/\.(png|webp|avif)$/i, '.jpg');
  writeFileSync(target, buf);
  if (target !== file) {
    statSync(file); // 原文件留着？不：删除，避免 assets 里出现重复
    require('node:fs').unlinkSync(file);
  }
  overrides[rel] = { originalSize: before, compressedSize: buf.length, width: 8000 };
  changed = true;
  console.log(`✔ ${rel}: ${(before / 1024 / 1024).toFixed(1)}MB → ${(buf.length / 1024 / 1024).toFixed(1)}MB`);
}

if (changed) writeFileSync(overridePath, JSON.stringify(overrides, null, 2));
console.log('完成');
