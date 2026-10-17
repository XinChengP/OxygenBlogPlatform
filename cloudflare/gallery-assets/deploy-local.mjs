#!/usr/bin/env node
/**
 * 画廊图床本机部署脚本（Workers Static Assets 模式）
 *
 * 流程：
 *  1. 通过 GitHub Trees API 拉取图床仓库 Eiheir/Luo_Tianyi_Image 的文件清单
 *  2. 下载 LTYpicture/** 下的图片到 ./assets/LTYpicture/**（跳过本地已存在且
 *     大小一致的文件，增量省流量；manager/ 等仓库代码不下载）
 *  3. 生成 ./assets/manifest.json（图片清单，画廊浏览器端数据源）
 *  4. npx wrangler deploy（首次部署上传全部资产，后续 wrangler 按内容哈希增量）
 *
 * 用法：
 *   node deploy-local.mjs                 # 全量同步 + 部署
 *   node deploy-local.mjs --manifest-only # 只重建清单并部署（不动图片文件）
 *   node deploy-local.mjs --dry-run       # 只拉清单生成 manifest，不下载不部署
 *
 * 图片 URL 约定：https://img.xinchengp.cn/{仓库相对路径}
 */

import { existsSync, mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  owner: 'Eiheir',
  repo: 'Luo_Tianyi_Image',
  branch: 'main',
  imagePrefix: 'LTYpicture/', // 只同步该前缀下的图片，manager/ 等代码天然排除
  extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'],
  assetsDir: join(__dirname, 'assets'),
  concurrency: 6, // 并发下载数
  // 下载源候选，依次回退：本机 hosts 可能把 GitHub 域劫持到 127.0.0.1
  // （Watt Toolkit 未运行时不可达），jsDelivr 官方备用域名走 Cloudflare 边缘通常可达。
  // jsDelivr 有单文件 20MB 上限（超限 403），超大文件必须走 gh api（GitHub CLI raw 通道）。
  downloadSources: [
    'https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}',
    'https://testingcf.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}',
  ],
  // >= 20MB 的文件直接只用 gh api（jsDelivr 403，raw 可能被本机 hosts 劫持）
  oversizedViaGhApi: true,
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const manifestOnly = args.includes('--manifest-only');

const isImage = (p) => {
  const dot = p.lastIndexOf('.');
  if (dot <= 0) return false;
  return CONFIG.extensions.includes(p.slice(dot).toLowerCase());
};

/** 拉取图床目录树，过滤出 LTYpicture/ 下的图片
 * 源优先级：GitHub Trees API → 本地缓存 tree.json（可手工放置，见 README）→ jsDelivr 数据 API
 */
async function fetchTree() {
  const build = (files) =>
    files
      .filter((t) => t.type === 'blob' && t.path.startsWith(CONFIG.imagePrefix) && isImage(t.path))
      .map((t) => ({ path: t.path, size: t.size, sha: t.sha }));

  const ghUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=1`;
  try {
    const res = await fetch(ghUrl, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'gallery-deploy' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.truncated) throw new Error('目录树被截断，图片数超出 API 单次返回上限');
    return build(data.tree || []);
  } catch (e) {
    console.log(`   GitHub Trees API 不可达（${e.message}），尝试本地缓存...`);
  }

  // 本地缓存：把任意一次成功的 Trees API 响应存为 tree.json 即可离线/被劫持时使用
  const cachePath = join(__dirname, 'tree.json');
  if (existsSync(cachePath)) {
    console.log('   使用本地 tree.json 缓存');
    const data = JSON.parse(readFileSync(cachePath, 'utf-8'));
    if (data.truncated) throw new Error('本地缓存的目录树被截断，请更新缓存');
    return build(data.tree || []);
  }

  console.log('   无本地缓存，回退 jsDelivr 数据 API...');
  const res = await fetch(
    `https://data.jsdelivr.com/v1/packages/gh/${CONFIG.owner}/${CONFIG.repo}@${CONFIG.branch}?structure=flat`,
    { signal: AbortSignal.timeout(30000) }
  );
  if (!res.ok) throw new Error(`jsDelivr 数据 API 也失败: HTTP ${res.status}`);
  const data = await res.json();
  // jsDelivr flat 结构：{ files: [{ name: "/LTYpicture/...", size, hash }] }
  const files = (data.files || []).map((f) => ({
    type: 'blob',
    path: f.name.replace(/^\//, ''),
    size: f.size,
  }));
  const result = build(files);
  if (result.length === 0) throw new Error('jsDelivr 数据 API 返回空清单（可能仓库超限被拒）');
  return result;
}

/** 下载单个文件（带重试与多源回退），已存在且大小一致时跳过 */
async function downloadOne(entry) {
  const dest = join(CONFIG.assetsDir, entry.path);

  // 本地压缩覆盖记录：某些原图超出 Workers 25MiB 资产上限（或 jsDelivr 20MB 上限），
  // 已被压缩为小体积版本（见 compress-oversized.mjs）。这些文件以本地为准，
  // 不再按远端大小回源覆盖。
  const overridePath = join(__dirname, 'overridden.json');
  const overrides = existsSync(overridePath) ? JSON.parse(readFileSync(overridePath, 'utf-8')) : {};
  if (overrides[entry.path] && existsSync(dest)) return 'skip';

  if (existsSync(dest)) {
    const localSize = statSync(dest).size;
    if (localSize === entry.size) return 'skip';
    console.log(`  大小不一致，重新下载: ${entry.path} (远端 ${entry.size} / 本地 ${localSize})`);
  }
  const encodedPath = entry.path.split('/').map(encodeURIComponent).join('/');

  // 超过 jsDelivr 20MB 单文件上限：走 gh api（GitHub CLI，raw 内容通道）下载。
  // execFileSync 输出直接重定向到目标文件，避免大文件过 Node 内存。
  if (CONFIG.oversizedViaGhApi && entry.size >= 20 * 1024 * 1024) {
    const { execSync } = await import('node:child_process');
    mkdirSync(dirname(dest), { recursive: true });
    execSync(
      `gh api "repos/${CONFIG.owner}/${CONFIG.repo}/contents/${encodedPath.replace(/&/g, '\\&')}"` +
      ` -H "Accept: application/vnd.github.raw" > "${dest}"`,
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 300000, shell: true }
    );
    if (!existsSync(dest) || statSync(dest).size !== entry.size) {
      throw new Error(`gh api 下载大小校验失败: ${entry.path}`);
    }
    return 'ok';
  }

  const urls = CONFIG.downloadSources.map((tpl) =>
    tpl
      .replace('{owner}', CONFIG.owner)
      .replace('{repo}', CONFIG.repo)
      .replace('{branch}', CONFIG.branch)
      .replace('{path}', encodedPath)
  );
  let lastErr;
  for (const url of urls) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length !== entry.size) throw new Error(`大小校验失败: ${buf.length} != ${entry.size}`);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, buf);
        return 'ok';
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }
  throw new Error(`下载失败 ${entry.path}（所有源）: ${lastErr.message}`);
}

async function main() {
  console.log('① 拉取图床目录树...');
  const entries = await fetchTree();
  const totalMB = (entries.reduce((s, e) => s + e.size, 0) / 1024 / 1024).toFixed(0);
  console.log(`   图片 ${entries.length} 张，共 ${totalMB} MB`);

  // 生成 manifest（/list 数据源）
  const manifest = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    images: entries.map((e) => ({ path: e.path, size: e.size })),
  };

  if (dryRun) {
    mkdirSync(CONFIG.assetsDir, { recursive: true });
    writeFileSync(join(CONFIG.assetsDir, 'manifest.json'), JSON.stringify(manifest));
    console.log('✔ dry-run：manifest.json 已生成，未下载图片、未部署');
    return;
  }

  if (!manifestOnly) {
    console.log('② 下载图片到 assets/（增量，跳过已存在文件）...');
    let done = 0, skipped = 0;
    const queue = [...entries];
    await Promise.all(
      Array.from({ length: CONFIG.concurrency }, async () => {
        while (queue.length) {
          const entry = queue.shift();
          if (!entry) break;
          const r = await downloadOne(entry);
          r === 'skip' ? skipped++ : done++;
          if ((done + skipped) % 50 === 0) console.log(`   进度 ${done + skipped}/${entries.length}`);
        }
      })
    );
    console.log(`   下载 ${done} 张，跳过（已存在）${skipped} 张`);
  }

  console.log('③ 写入 manifest.json...');
  writeFileSync(join(CONFIG.assetsDir, 'manifest.json'), JSON.stringify(manifest));
  console.log(`   ${manifest.count} 张，generatedAt=${manifest.generatedAt}`);

  console.log('④ wrangler deploy（资产按内容哈希增量上传）...');
  const { execSync } = await import('node:child_process');
  execSync('npx wrangler deploy', { cwd: __dirname, stdio: 'inherit' });
  console.log('✔ 部署完成：https://img.xinchengp.cn/manifest.json');
}

main().catch((e) => {
  console.error('✘ 部署失败:', e.message);
  process.exit(1);
});
