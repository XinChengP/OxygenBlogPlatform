/**
 * 构建期预渲染开发日志正文
 *
 * 为什么不在 app/changelogs/page.tsx 里直接 renderToStaticMarkup：
 * Next.js 禁止服务端组件导入 react-dom/server。
 *
 * 本脚本在 Next 构建之外用 tsx 执行，把每条日志的 Markdown 渲染成独立 HTML
 * 片段写入 public/_changelog-content/<id>.html。页面初始不下发正文，
 * 用户第一次展开某条日志时再按需 fetch 对应片段。
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { getServerChangelogs } from '../src/utils/changelogUtils';
import ChangelogMarkdown from '../src/components/changelogs/ChangelogMarkdown';

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'public', '_changelog-content');

function main() {
  const changelogs = getServerChangelogs();

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalBytes = 0;
  for (const changelog of changelogs) {
    const html = renderToStaticMarkup(
      <ChangelogMarkdown content={changelog.content} />
    );
    const filePath = path.join(OUTPUT_DIR, `${changelog.id}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
    totalBytes += Buffer.byteLength(html, 'utf8');
  }

  console.log(
    `[changelog-html] 已生成 ${changelogs.length} 个正文片段，合计 ${(totalBytes / 1024).toFixed(0)}KB`
  );
}

main();
