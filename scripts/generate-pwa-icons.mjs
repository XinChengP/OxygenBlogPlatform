/**
 * PWA 图标生成脚本
 *
 * 从站点头像（public/星球卑.jpg）裁切生成 manifest 用的 PNG 图标：
 *   - icon-512.png / icon-192.png（manifest.icons）
 *   - apple-touch-icon.png（180，iOS 添加到主屏幕）
 *
 * 运行：node scripts/generate-pwa-icons.mjs
 * sharp 已是项目依赖（devDependencies），无需额外安装。
 * 源图更换时重跑一次即可。
 */

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_CANDIDATES = ['public/星球卑.jpg', 'public/icon-VOCALOID.jpg'];
const OUTPUTS = [
  { size: 512, file: 'public/icon-512.png' },
  { size: 192, file: 'public/icon-192.png' },
  { size: 180, file: 'public/apple-touch-icon.png' },
];

const source = SOURCE_CANDIDATES.find((file) => fs.existsSync(path.resolve(file)));
if (!source) {
  console.error('[pwa-icons] 找不到源图：', SOURCE_CANDIDATES.join(' / '));
  process.exit(1);
}

for (const { size, file } of OUTPUTS) {
  await sharp(source)
    // cover 裁成方形；头像类源图中心即主体
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(path.resolve(file));
  console.log(`[pwa-icons] 生成 ${file}（${size}x${size}）← ${source}`);
}
