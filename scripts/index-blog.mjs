/**
 * 博客知识索引脚本（天依 AI 问答的 RAG 数据源）
 *
 * 知识面覆盖整个博客：
 *   - 文章（src/content/blogs，跳过 hidden）
 *   - 动态（src/content/moments，跳过 hidden）
 *   - 开发日志（src/content/changelogs，标题 + 更新概述 + 提交明细）
 *   - 站点知识（src/data/aiKnowledge.json：页面/功能/工具/站长说明）
 *
 * 除原始内容外，还会生成几类「派生知识块」，专门补语义检索的盲区：
 *   - 全部文章清单（按分类列出标题/日期/置顶），回答「有哪些文章」
 *   - 分类文章清单（技术/学习/生活/随笔/洛天依），回答「有哪些 XX 文章」
 *   - 最新发布 / 最近更新（分别按 date / updatedAt 排序），回答「最新文章 / 最近更新了什么」
 *   - 最近的开发日志（按时间倒序），回答「最近更新了什么」
 *
 * 调用线上互动服务的 /admin/reindex 完成向量化并写入 Vectorize。
 * 运行时机：内容有增删改之后跑一次（重复执行安全，脚本先清空旧向量）。
 *   ADMIN_TOKEN=xxx npm run index:blog
 *   （ADMIN_TOKEN 缺省时读取 cloudflare/interactions/.dev.vars）
 *   加 --dry-run 只打印派生块，不调用线上接口。
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

/** 分类展示顺序：与 blogSetting.ts 的 categories 保持一致 */
const CATEGORY_ORDER = ['技术', '学习', '生活', '随笔', '洛天依'];

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

/** 日期字符串的比较值；缺失或非法日期按 0 处理（排在最后） */
function dateValue(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isNaN(time) ? 0 : time;
}

/** 取日期前 10 位，避免 frontmatter 带时间时把标题/正文弄乱 */
function shortDate(value) {
  return String(value ?? '').trim().slice(0, 10);
}

/**
 * 把正文清洗成适合检索的纯文本：
 * - 去掉 <style>/<script>（部分文章的聊天记录样式就是一大段 CSS，对语义检索是纯噪音）
 * - 图片保留 alt、去掉 HTML 标签，代码块保留
 */
function toPlainText(markdown) {
  return markdown
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');
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

/** 提取开发日志的「更新概述」段落，给检索补充语义信息 */
function extractOverview(markdown) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const match = /##\s*更新概述\s*\n([\s\S]*?)(?=\n##\s|$)/.exec(normalized);
  const section = match ? match[1] : normalized;
  return toPlainText(section)
    .replace(/[#*>`|_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

/** 分类排序：先按固定顺序，再按字母序兜底 */
function sortCategories(categories) {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
    return a.localeCompare(b, 'zh-CN');
  });
}

async function main() {
  // --dry-run：只生成内容块并打印摘要，不调用线上接口（本地检查索引用途）
  const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const token = dryRun ? '' : await resolveAdminToken();

  const chunks = [];
  const blogPosts = [];
  const changelogEntries = [];
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
    const title = String(data.title || slug);
    const date = shortDate(data.date);
    const updatedAt = shortDate(data.updatedAt);
    const category = String(data.category || '未分类');
    const tags = Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)).filter(Boolean) : [];
    // 索引用纯文本：图片语法与 HTML/CSS 对检索是噪音
    const plain = toPlainText(content);
    const pieces = chunkContent(plain);
    // 每个块都带上文章级元信息：embedding 能更好地把标题/分类/标签与正文关联起来
    const metaLine = [
      `《${title}》`,
      `分类：${category}`,
      tags.length ? `标签：${tags.join('、')}` : '',
      date ? `发布：${date}` : '',
    ].filter(Boolean).join(' | ');
    pieces.forEach((text, index) => {
      chunks.push({
        id: `blog:${slug}-${index + 1}`,
        text: `${metaLine}\n${text}`,
        title,
        type: 'blog',
        url: `/blogs/${slug}/`,
      });
    });
    blogCount += 1;
    // 记录元数据用于生成文章清单与时效性提示块
    blogPosts.push({
      slug,
      title,
      date,
      updatedAt,
      category,
      tags,
      pinned: data.pinned === true,
      url: `/blogs/${slug}/`,
    });
  }

  // ===== 全部文章清单（type: site）=====
  // 语义检索对「有哪些 XX 文章」这类聚合问题很弱：单篇正文块彼此竞争，
  // 很难召回完整列表。这里生成一份按分类组织的清单，让模型能准确回答
  // 「某分类下有哪些文章」，而不是凭空编造或回答「没有」。
  const categoryMap = new Map();
  for (const post of blogPosts) {
    const list = categoryMap.get(post.category) ?? [];
    list.push(post);
    categoryMap.set(post.category, list);
  }
  const inventoryLines = sortCategories(categoryMap.keys()).map((category) => {
    const posts = [...categoryMap.get(category)].sort((a, b) => dateValue(b.date) - dateValue(a.date));
    // 清单只放标题/日期/置顶：Worker 侧 metadata.text 上限 800 字，
    // 带上标签会把末尾的「洛天依」分类截掉；标签已写进每篇正文块，不影响检索
    const list = posts.map((post) => {
      const extra = [post.date, post.pinned ? '置顶' : ''].filter(Boolean).join('，');
      return `《${post.title}》（${extra}）`;
    }).join('；');
    return `【${category}】${list}`;
  });
  chunks.push({
    id: 'site:article-inventory',
    text: `截至本次索引，博客共有 ${blogPosts.length} 篇公开文章。按分类列出：\n${inventoryLines.join('\n')}`,
    title: `全部文章清单（共 ${blogPosts.length} 篇，按分类）`,
    type: 'site',
    url: '/blogs/',
  });

  // ===== 分类文章清单（type: site）=====
  // 「有哪些洛天依/技术/学习相关的文章」是高频问法。整站清单的标题太泛，
  // 向量检索容易只召回其中一篇正文；按分类各生成一个短块，标题直接带分类名，
  // 召回更稳，也让模型能列出该分类下的完整文章列表。
  const CATEGORY_ID_SLUGS = {
    技术: 'tech',
    学习: 'study',
    生活: 'life',
    随笔: 'essay',
    洛天依: 'tianyi',
  };
  sortCategories(categoryMap.keys()).forEach((category, index) => {
    const posts = [...categoryMap.get(category)].sort((a, b) => dateValue(b.date) - dateValue(a.date));
    const list = posts.map((post) => `《${post.title}》（${post.date}${post.pinned ? '，置顶' : ''}）`).join('；');
    chunks.push({
      id: `site:category-${CATEGORY_ID_SLUGS[category] ?? `cat${index + 1}`}`,
      text: `截至本次索引，${category}分类共有 ${posts.length} 篇文章：${list}。读者问「有哪些${category}文章 / ${category}相关的文章」时，可以按这份清单回答。`,
      title: `${category}分类的文章（共 ${posts.length} 篇）`,
      type: 'site',
      url: '/blogs/',
    });
  });

  // ===== 最新发布 / 最近更新（type: blog）=====
  // 语义检索不懂「最新」：问「最近更新」时，按内容相似度很难召回
  // 时间上最新但内容不相关的文章。这里按日期生成显式的时效性知识块。
  const latestPosts = [...blogPosts]
    .filter((post) => post.date)
    .sort((a, b) => dateValue(b.date) - dateValue(a.date))
    .slice(0, 3);
  latestPosts.forEach((post, index) => {
    chunks.push({
      id: `site:latest-post-${index + 1}`,
      text: `截至本次索引，博客最新发布的文章（按发布日期）第 ${index + 1} 新的是《${post.title}》（${post.date} 发布，分类：${post.category}${post.tags.length ? `，标签：${post.tags.join('、')}` : ''}）。读者问「最新文章 / 最近发布了什么」时推荐这一篇。`,
      // 标题保持文章原名：前端会把【编号】渲染成标题，带「最新文章：」前缀会读出重复文案
      title: post.title,
      type: 'blog',
      url: post.url,
    });
  });

  // 「最近更新」与「最新发布」是两个口径：前者按 updatedAt，后者按 date。
  // 只收录 updatedAt 与 date 不同的文章，避免同一篇在两套块里重复。
  const recentUpdatedPosts = [...blogPosts]
    .filter((post) => post.updatedAt && post.date && post.updatedAt !== post.date)
    .sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt))
    .slice(0, 3);
  recentUpdatedPosts.forEach((post, index) => {
    chunks.push({
      id: `site:recent-updated-${index + 1}`,
      text: `截至本次索引，最近更新过的文章（按更新日期）第 ${index + 1} 新的是《${post.title}》（${post.date} 发布，最近更新于 ${post.updatedAt}）。读者问「最近更新 / 最近改了什么文章」时推荐这一篇。`,
      title: post.title,
      type: 'blog',
      url: post.url,
    });
  });

  // ===== 动态（type: moment） =====
  try {
    for (const file of await collectMarkdown(MOMENTS_DIR)) {
      const raw = await readFile(file, 'utf8');
      const { data, content } = matter(raw);
      if (data.hidden === true || String(data.hidden).toLowerCase() === 'true') continue;
      const text = toPlainText(content).trim();
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

  // ===== 开发日志（type: changelog） =====
  try {
    for (const file of await collectMarkdown(CHANGELOGS_DIR)) {
      const raw = await readFile(file, 'utf8');
      const { data, content } = matter(raw);
      const date = shortDate(data.date ?? path.basename(file, '.md'));
      const title = String(data.title ?? '');
      const typeLabel = CHANGELOG_TYPE_LABELS[data.type] ?? data.type ?? '更新';
      const commits = Array.isArray(data.commits) ? data.commits.map((c) => String(c)) : [];
      const overview = extractOverview(content);
      const text = [
        `${date} 的开发日志（${typeLabel}）：${title}`,
        overview ? `概述：${overview}` : '',
        ...commits.map((c) => `- ${c}`),
      ].filter(Boolean).join('\n');
      changelogEntries.push({ date, title: title || typeLabel, typeLabel, commits, text });
      // 日志 id 即日期文件名，页面上有对应锚点并会自动展开
      chunks.push({
        id: `changelog:${date}`,
        text: text.slice(0, 3000),
        title: `开发日志 ${date}：${title || typeLabel}`,
        type: 'changelog',
        url: `/changelogs/#changelog-${date}`,
      });
      changelogCount += 1;
    }
  } catch {
    // 目录不存在时跳过
  }

  // ===== 最近的开发日志（type: changelog）=====
  // 与文章「最新」块同理：所有日志的文本高度相似，语义检索容易
  // 随机命中几年前的日志。显式给出时间倒序的最近几条，回答才可靠。
  const latestChangelogs = [...changelogEntries]
    .filter((entry) => entry.date)
    .sort((a, b) => dateValue(b.date) - dateValue(a.date))
    .slice(0, 3);
  latestChangelogs.forEach((entry, index) => {
    const highlights = entry.commits.slice(0, 4).join('；');
    chunks.push({
      id: `site:latest-changelog-${index + 1}`,
      text: `截至本次索引，最近一次开发日志（按日期倒序第 ${index + 1} 新）是 ${entry.date}《${entry.title}》（${entry.typeLabel}）${highlights ? `，主要变更：${highlights}` : ''}。读者问「最近更新了什么 / 最新开发进度」时推荐这条。`,
      title: entry.title,
      type: 'changelog',
      url: `/changelogs/#changelog-${entry.date}`,
    });
  });
  if (latestChangelogs.length > 0) {
    chunks.push({
      id: 'site:latest-changelog-list',
      text: `截至本次索引，最近的开发日志按时间倒序为：${latestChangelogs.map((entry) => `${entry.date}《${entry.title}》`).join('；')}。读者问「最近更新 / 最近做了什么」时可以按这个顺序回答。`,
      title: '最近的开发日志',
      type: 'changelog',
      url: '/changelogs/',
    });
  }

  // ===== 站点知识（type: site） =====
  try {
    const knowledge = JSON.parse(await readFile(KNOWLEDGE_FILE, 'utf8'));
    for (const entry of knowledge.entries ?? []) {
      chunks.push({
        id: `site:${entry.id}`,
        // 「当前站点说明」标记与 Worker 提示词里的权威优先级对应：
        // 涉及当前功能时，站点说明优先于历史开发日志
        text: `当前站点说明（以此为准）：${String(entry.text ?? '').slice(0, 3000)}`,
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

  if (dryRun) {
    const byType = chunks.reduce((acc, chunk) => {
      acc[chunk.type] = (acc[chunk.type] ?? 0) + 1;
      return acc;
    }, {});
    console.log('[index-blog] dry-run 类型统计：', byType);
    const derived = chunks.filter((chunk) => chunk.id.startsWith('site:article-inventory')
      || chunk.id.startsWith('site:latest-post-')
      || chunk.id.startsWith('site:recent-updated-')
      || chunk.id.startsWith('site:latest-changelog'));
    derived.forEach((chunk) => console.log(`\n[${chunk.id}] ${chunk.title}\n${chunk.text}`));
    return;
  }

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
