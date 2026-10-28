/**
 * 博客知识索引脚本（天依 AI 问答的 RAG 数据源）
 *
 * 知识面覆盖整个博客：
 *   - 文章（src/content/blogs，跳过 hidden）
 *   - 动态（src/content/moments，跳过 hidden）
 *   - 更新日志（src/content/changelogs，标题 + 提交明细）
 *   - 站点知识（src/data/aiKnowledge.json：页面/功能/工具/站长说明）
 *
 * 调用线上互动服务的 /admin/reindex 完成向量化并写入 Vectorize。
 * 运行时机：内容有增删改之后跑一次（重复执行安全，脚本先清空旧向量）。
 *   ADMIN_TOKEN=xxx npm run index:blog
 *   （ADMIN_TOKEN 缺省时读取 cloudflare/interactions/.dev.vars）
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src/content/blogs');
const MOMENTS_DIR = path.join(ROOT, 'src/content/moments');
const CHANGELOGS_DIR = path.join(ROOT, 'src/content/changelogs');
const KNOWLEDGE_FILE = path.join(ROOT, 'src/data/aiKnowledge.json');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://blog.xinchengp.cn').replace(/\/+$/, '');
const REINDEX_URL = `${SITE_URL}/api/interactions/admin/reindex`;

const CHANGELOG_TYPE_LABELS = {
  feature: '新功能',
  optimize: '优化',
  fix: '修复',
  docs: '文档',
  style: '样式',
  refactor: '重构',
};

/** 管理令牌：环境变量优先，其次 cloudflare/interactions/.dev.vars */
async function resolveAdminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  try {
    const vars = await readFile(path.join(ROOT, 'cloudflare/interactions/.dev.vars'), 'utf8');
    const match = /^ADMIN_TOKEN=(.+)$/m.exec(vars);
    if (match) return match[1].trim();
  } catch {
    // 没有 .dev.vars
  }
  console.error('[index-blog] 缺少 ADMIN_TOKEN：请用环境变量传入，或先 wrangler secret put ADMIN_TOKEN');
  process.exit(1);
}

/** 与 src/utils/blogScanner.ts 完全一致的 slug 规则 */
function slugFromRelativePath(relativePath) {
  return relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');
}

async function collectMarkdown(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(full)));
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

/**
 * 按段落聚合切块：目标 ~700 字，优先在空行（段落边界）切开，
 * 单段超长时硬切，保证块与块之间尽量不打断语义。
 */
function chunkContent(text, target = 700) {
  const paragraphs = text
    // 代码块整段保留（内部换行不打断语义）
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (paragraph.length > target * 1.5) {
      // 超长段落：先收掉当前积累，再按句号/长度硬切
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let i = 0; i < paragraph.length; i += target) {
        chunks.push(paragraph.slice(i, i + target));
      }
      continue;
    }
    if (current && current.length + paragraph.length + 2 > target) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.length >= 20);
}

async function main() {
  const token = await resolveAdminToken();

  const chunks = [];
  const blogPosts = [];
  let blogCount = 0;
  let momentCount = 0;
  let changelogCount = 0;
  let skipped = 0;

  // ===== 文章（type: blog） =====
  const files = await collectMarkdown(CONTENT_DIR);
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { data, content } = matter(raw);
    if (data.hidden === true || String(data.hidden).toLowerCase() === 'true') {
      skipped += 1;
      continue;
    }
    const slug = slugFromRelativePath(path.relative(CONTENT_DIR, file));
    const title = data.title || slug;
    // 索引用纯文本：正文里的图片语法对检索是噪音，替换为 alt
    const plain = content.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
    const pieces = chunkContent(plain);
    pieces.forEach((text, index) => {
      chunks.push({
        id: `blog:${slug}-${index + 1}`,
        text,
        title,
        type: 'blog',
        url: `/blogs/${slug}/`,
      });
    });
    blogCount += 1;
    // 记录元数据用于生成「最新文章」提示块（口径与 RSS 一致：updatedAt 优先）
    blogPosts.push({
      slug,
      title,
      date: data.updatedAt || data.date || '',
      url: `/blogs/${slug}/`,
    });
  }

  // ===== 最新文章提示块（type: site）=====
  // 语义检索不懂「最新」：问「最近更新的文章」时，按内容相似度很难召回
  // 时间上最新但内容不相关的文章。这里按日期生成显式的时效性知识块补上这个盲区。
  const recentPosts = [...blogPosts]
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .slice(0, 3);
  recentPosts.forEach((post, index) => {
    chunks.push({
      id: `site:latest-post-${index + 1}`,
      text: `截至本次索引，博客最新发布的文章第 ${index + 1} 新的是《${post.title}》（发布于 ${post.date}）。读者问「最新/最近的文章或更新」时，就推荐这一篇。`,
      title: `最新文章：《${post.title}》`,
      type: 'site',
      url: post.url,
    });
  });

  // ===== 动态（type: moment）=====
  try {
    for (const file of await collectMarkdown(MOMENTS_DIR)) {
      const raw = await readFile(file, 'utf8');
      const { data, content } = matter(raw);
      if (data.hidden === true || String(data.hidden).toLowerCase() === 'true') continue;
      const text = content.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
      if (text.length < 10) continue;
      const time = String(data.time ?? '').slice(0, 16);
      const title = `动态${time ? ` ${time}` : ''}：${text.slice(0, 24)}${text.length > 24 ? '…' : ''}`;
      const momentId = String(data.id || path.basename(file, '.md'));
      const id = `moment:${momentId}`;
      // 动态全部渲染在同一页：url 带锚点，落地后滚动定位到该条并高亮
      chunks.push({
        id,
        text: `${time} 的动态：${text}`.slice(0, 3000),
        title,
        type: 'moment',
        url: `/moments/#moment-${momentId}`,
      });
      momentCount += 1;
    }
  } catch {
    // 目录不存在时跳过
  }

  // ===== 更新日志（type: changelog）=====
  try {
    for (const file of await collectMarkdown(CHANGELOGS_DIR)) {
      const raw = await readFile(file, 'utf8');
      const { data } = matter(raw);
      const date = String(data.date ?? path.basename(file, '.md'));
      const typeLabel = CHANGELOG_TYPE_LABELS[data.type] ?? data.type ?? '更新';
      const commits = Array.isArray(data.commits) ? data.commits : [];
      const text = [`${date} 的更新日志（${typeLabel}）：${data.title ?? ''}`, ...commits.map((c) => `- ${c}`)]
        .filter(Boolean)
        .join('\n');
      // 日志 id 即日期文件名，页面上有对应锚点并会自动展开
      chunks.push({
        id: `changelog:${date}`,
        text: text.slice(0, 3000),
        title: `更新日志 ${date}：${data.title ?? typeLabel}`,
        type: 'changelog',
        url: `/changelogs/#changelog-${date}`,
      });
      changelogCount += 1;
    }
  } catch {
    // 目录不存在时跳过
  }

  // ===== 站点知识（type: site）=====
  try {
    const knowledge = JSON.parse(await readFile(KNOWLEDGE_FILE, 'utf8'));
    for (const entry of knowledge.entries ?? []) {
      chunks.push({
        id: `site:${entry.id}`,
        text: String(entry.text ?? '').slice(0, 3000),
        title: String(entry.title ?? entry.id),
        type: 'site',
        url: String(entry.url ?? '/'),
      });
    }
  } catch (error) {
    console.warn('[index-blog] 站点知识文件读取失败（跳过）：', error.message);
  }

  console.log(
    `[index-blog] 文章 ${blogCount} 篇 / 动态 ${momentCount} 条 / 日志 ${changelogCount} 篇 → 共 ${chunks.length} 个内容块`
  );

  // 分批提交（单请求上限 100 块），首批带 reset 清空旧向量
  for (let i = 0; i < chunks.length; i += 80) {
    const batch = chunks.slice(i, i + 80);
    const response = await fetch(REINDEX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reset: i === 0, chunks: batch }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      console.error(`[index-blog] 批次 ${i} 失败：${response.status} ${await response.text()}`);
      process.exitCode = 1;
      return;
    }
    const result = await response.json();
    console.log(`[index-blog] 批次 ${i}-${i + batch.length}：已索引 ${result.indexed} 块${result.reset ? '（已清空旧向量）' : ''}`);
  }

  console.log('[index-blog] 完成：博客知识已写入 Vectorize');
}

main().catch((error) => {
  console.error('[index-blog] 执行失败：', error);
  process.exitCode = 1;
});
