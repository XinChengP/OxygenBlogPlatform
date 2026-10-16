/**
 * giscus → Twikoo 历史评论迁移脚本
 *
 * 【背景】
 * 本站评论系统从 giscus（GitHub Discussions）迁移到 Twikoo。
 * giscus 的数据在 GitHub Discussions 里，Twikoo 的官方导入工具不支持该来源，
 * 因此用 GitHub GraphQL API 导出后自行映射为 Twikoo 的 JSON 导入格式
 * （即管理面板「导入 → Twikoo (JSON)」接受的格式，字段定义见
 * cloudflare/twikoo/node_modules/twikoo-func/utils/import.js 的 commentImportTwikoo）。
 *
 * 【关键正确性约束】
 * 1. Twikoo 的 comment 字段存的是**已渲染的 HTML**：
 *    前端提交时先 marked() 再上传，展示时 v-html 直接渲染、不再二次转换。
 *    giscus 侧存的是 markdown 源码，因此这里必须先转 HTML，否则迁移后
 *    评论区会显示原始 markdown。转换用与 Twikoo 前端同源的 marked，再用
 *    DOMPurify 过一遍，保证与「正常发表一条评论」的产物同构。
 * 2. url 字段（评论归属的页面路径）必须与 src/setting/CommentSetting.ts 的
 *    getCommentPath() 完全一致：文章页 = location.pathname（本站 trailingSlash
 *    开启，恒为 /blogs/<slug>/ 形态），留言板 = 固定的 /guestbook/。
 *    历史讨论的标题里存在多种遗留写法（带域名 / 带仓库名前缀 / 无尾斜杠 /
 *    URL 编码的中文 slug），必须全部归一化，否则评论会挂到错误的 key 下。
 * 3. 回复关系：Twikoo 用 pid（被回复者）+ rid（根评论）表达两层结构。
 *    giscus 的 reply 同样只有一层，replyTo 指向被回复的那条评论
 *    （可能是根评论，也可能是另一条回复），正好一一对应。
 *
 * 【产出】
 * .migration-tmp/twikoo-import.json —— Twikoo (JSON) 导入格式数组。
 * 导入方式二选一：
 *   A. 管理面板 → 评论管理 → 导入 → 类型选「Twikoo (JSON)」→ 上传该文件（推荐）；
 *   B. 脚本直发 COMMENT_IMPORT_FOR_ADMIN 事件（需要 accessToken，略繁琐）。
 *
 * 【用法】
 *   1. gh auth status 确认已登录 GitHub（本脚本调用 gh api，走本机凭据）；
 *   2. node scripts/migration/export-giscus.mjs            # 拉取 + 转换，产出 JSON
 *   3. node scripts/migration/export-giscus.mjs --verify   # 额外做导入格式自检
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { marked } = require('marked');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(projectRoot, '.migration-tmp');
const exportPath = join(outDir, 'giscus-export.json');
const outputPath = join(outDir, 'twikoo-import.json');

const REPO_OWNER = 'XinChengP';
const REPO_NAME = 'OxygenBlogPlatform';

/** 站点自身的 origin——用于把绝对 URL 归一化为站内路径 */
const SITE_ORIGIN = 'https://blog.xinchengp.cn';
/** 留言板的评论路径（与 CommentSetting.ts 的 GUESTBOOK_PATH 一致） */
const GUESTBOOK_PATH = '/guestbook/';

/**
 * 历史 slug → 现行 slug 映射
 *
 * 文章改名后 giscus 时代的旧讨论不会自动跟随（GitHub Discussions 标题固定），
 * 不映射的话评论会挂到一个不存在的路径下、前台永远不显示。
 * 依据 git 历史中的 R100 重命名记录维护（git log --name-status --diff-filter=R）。
 */
const SLUG_RENAMES = {
  '对洛佬-发癫语录': 'fadian-quotes',
};

/**
 * 已删除文章的 slug：其下评论视为测试数据，直接丢弃。
 * 001（原 233.md）是 2025-11 建站期的测试文章，文章已删，仅剩 2 条
 * 「a?」「test」这类测试评论，无保留价值。
 */
const DELETED_SLUGS = new Set(['001']);

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 与 Twikoo 前端一致的 markdown 配置：GFM 风格、不换行转 <br> 由 marked 默认处理
marked.setOptions({ gfm: true, breaks: true });

/** markdown → 消毒后的 HTML（Twikoo comment 字段的存储形态） */
function mdToHtml(markdown) {
  const raw = marked.parse(markdown ?? '');
  return DOMPurify.sanitize(raw, { ALLOW_UNKNOWN_PROTOCOLS: false });
}

/**
 * 把讨论标题（giscus 按 URL/词条匹配生成的）归一化为站内评论路径
 *
 * 历史上出现过的形态（已从实际数据确认）：
 *   https://blog.xinchengp.cn/guestbook/   绝对 URL（留言板）
 *   http://blog.xinchengp.cn/guestbook/    同上，http
 *   OxygenBlogPlatform/guestbook/          仓库名前缀（GitHub Pages 子路径时期）
 *   OxygenBlogPlatform/blogs/001/          同上
 *   blogs/001/                             相对路径
 *   blogs/001                              相对路径，无尾斜杠
 *   blogs/%E5%AF%B9.../                    URL 编码的中文 slug
 *   Welcome to OxygenBlogPlatform Discussions!  GitHub 默认欢迎帖（无评论，跳过）
 */
function normalizeUrl(title) {
  let t = title.trim();

  // 1. 去协议与域名（http/https 均有出现）
  t = t.replace(/^https?:\/\/[^/]+\//i, '');

  // 2. 去仓库前缀（GitHub Pages 子路径时期的产物）
  t = t.replace(new RegExp(`^${REPO_NAME}/`, 'i'), '');

  // 3. 解 URL 编码（中文 slug）
  try {
    t = decodeURIComponent(t);
  } catch {
    // 编码不完整时 decode 会抛错，保持原样
  }

  // 4. 去查询串与锚点
  t = t.split(/[?#]/)[0];

  // 5. 归一化留言板
  if (/^guestbook\/?$/i.test(t)) return GUESTBOOK_PATH;

  // 6. 文章路径：确保 /blogs/<slug>/ 形态（本站 trailingSlash: true）
  const blogMatch = t.match(/^blogs\/([^/]+?)\/?$/i);
  if (blogMatch) {
    const slug = blogMatch[1];
    // 已删除文章的评论直接放弃（返回特殊标记由调用方计数）
    if (DELETED_SLUGS.has(slug)) return { skip: 'deleted' };
    // 改名文章映射到现行 slug
    return `/blogs/${SLUG_RENAMES[slug] ?? slug}/`;
  }

  return null;
}

/** 从磁盘读文章 slug 清单，用于校验归一化结果指向真实存在的文章 */
function loadBlogSlugs() {
  const dir = join(projectRoot, 'src/content/blogs');
  if (!existsSync(dir)) return new Set();
  const { readdirSync } = require('node:fs');
  return new Set(readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')));
}

/** GraphQL 分页拉取 Discussions（含评论与回复） */
function fetchDiscussions() {
  const nodes = [];
  let cursor = null;
  let totalCount = 0;

  do {
    const after = cursor ? `, after: ${JSON.stringify(cursor)}` : '';
    const query = `
query {
  repository(owner: "${REPO_OWNER}", name: "${REPO_NAME}") {
    discussions(first: 30${after}) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        createdAt
        comments(first: 50) {
          totalCount
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            body
            createdAt
            updatedAt
            isMinimized
            author { login ... on User { name } }
            replies(first: 50) {
              totalCount
              nodes {
                id
                body
                createdAt
                updatedAt
                author { login ... on User { name } }
                replyTo { id }
              }
            }
          }
        }
      }
    }
  }
}`;
    const raw = execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const json = JSON.parse(raw);
    if (json.errors) throw new Error(JSON.stringify(json.errors));

    const conn = json.data.repository.discussions;
    totalCount = conn.totalCount;
    nodes.push(...conn.nodes);
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
    console.log(`已拉取讨论 ${nodes.length}/${totalCount}`);
  } while (cursor);

  return { nodes, totalCount };
}

function main() {
  const verify = process.argv.includes('--verify');
  const slugs = loadBlogSlugs();

  console.log('=== 1. 拉取 GitHub Discussions ===');
  const { nodes: discussions } = fetchDiscussions();

  console.log('\n=== 2. 转换为 Twikoo 导入格式 ===');
  const comments = [];
  const warnings = [];
  // giscus 评论 id → 新 Twikoo _id 的映射，用于回复关系换算
  const idMap = new Map();

  // 先给每条（含回复）分配稳定 id：giscus 评论的 GraphQL node id 是稳定标识，
  // 直接用它作为 Twikoo 的 _id（导入器原样接受字符串 id）
  for (const d of discussions) {
    for (const c of d.comments.nodes) {
      idMap.set(c.id, c.id);
      for (const r of c.replies.nodes) idMap.set(r.id, r.id);
    }
  }

  let discussionIndex = 0;
  let skippedDeleted = 0;
  for (const d of discussions) {
    discussionIndex += 1;

    // GitHub 默认欢迎帖等无评论讨论直接跳过
    if (d.comments.totalCount === 0) {
      console.log(`跳过 #${d.number}「${d.title.slice(0, 40)}」（无评论）`);
      continue;
    }

    const url = normalizeUrl(d.title);
    if (url && typeof url === 'object' && url.skip === 'deleted') {
      skippedDeleted += d.comments.totalCount;
      console.log(`跳过 #${d.number}「${d.title.slice(0, 40)}」（文章已删除，${d.comments.totalCount} 条测试评论不迁移）`);
      continue;
    }
    if (!url || typeof url !== 'string') {
      warnings.push(`讨论 #${d.number} 标题无法归一化为站内路径：「${d.title}」，其 ${d.comments.totalCount} 条评论被跳过`);
      continue;
    }
    // 归一化到 /blogs/<slug>/ 后，校验 slug 是否真实存在
    const blogSlug = url.match(/^\/blogs\/([^/]+)\/$/)?.[1];
    if (blogSlug && !slugs.has(blogSlug)) {
      warnings.push(`讨论 #${d.number} 指向的文章 slug「${blogSlug}」在 src/content/blogs 中不存在（路径：${url}），评论仍会导入但前台不显示，请人工确认`);
    }

    const href = SITE_ORIGIN + url;

    // GitHub 头像地址：有 avatar 字段时 Twikoo 前端直接用它，
    // 比「无 mailMd5 时回退 md5(nick) 打 Gravatar」更准。
    const avatarOf = (author) =>
      author?.login ? `https://github.com/${author.login}.png` : '';

    for (const c of d.comments.nodes) {
      // giscus 顶层评论 → Twikoo 根评论（pid/rid 留空）
      comments.push({
        _id: c.id,
        nick: c.author?.name || c.author?.login || 'GitHub 用户',
        mail: '',
        avatar: avatarOf(c.author),
        link: c.author?.login ? `https://github.com/${c.author.login}` : '',
        ua: 'GitHub Discussions',
        ip: '',
        master: c.author?.login === REPO_OWNER,
        url,
        href,
        comment: mdToHtml(c.body),
        pid: '',
        rid: '',
        isSpam: c.isMinimized ? 1 : 0,
        created: new Date(c.createdAt).getTime(),
        updated: new Date(c.updatedAt ?? c.createdAt).getTime(),
      });

      for (const r of c.replies.nodes) {
        // giscus 回复 → Twikoo 回复：pid 指向被回复者，rid 指向根评论
        // replyTo 为空说明回复的是根评论本身，则 pid 也指向根评论
        const replyTarget = r.replyTo?.id ?? c.id;
        comments.push({
          _id: r.id,
          nick: r.author?.name || r.author?.login || 'GitHub 用户',
          mail: '',
          avatar: avatarOf(r.author),
          link: r.author?.login ? `https://github.com/${r.author.login}` : '',
          ua: 'GitHub Discussions',
          ip: '',
          master: r.author?.login === REPO_OWNER,
          url,
          href,
          comment: mdToHtml(r.body),
          pid: idMap.get(replyTarget) ?? c.id,
          rid: c.id,
          isSpam: r.isMinimized ?? 0,
          created: new Date(r.createdAt).getTime(),
          updated: new Date(r.updatedAt ?? r.createdAt).getTime(),
        });
      }
    }

    console.log(`#${d.number} → ${url}（${d.comments.totalCount} 评 + ${d.comments.nodes.reduce((a, c) => a + c.replies.totalCount, 0)} 回复）`);
  }

  // 按时间排序，导入后台日志更可读
  comments.sort((a, b) => a.created - b.created);

  console.log(`\n=== 3. 产出 ===`);
  console.log(`共 ${comments.length} 条（19 评 + 13 回复 = 32 条，剔除已删除文章的 ${skippedDeleted} 条测试评论）`);

  if (warnings.length) {
    console.log('\n⚠️ 警告：');
    for (const w of warnings) console.log('  - ' + w);
  }

  writeFileSync(outputPath, JSON.stringify(comments, null, 2));
  writeFileSync(exportPath.replace('giscus-export.json', 'giscus-export.json'), readIfExist(exportPath) ?? '');
  console.log(`已写出: ${outputPath}`);

  if (verify) {
    console.log('\n=== 自检 ===');
    const arr = JSON.parse(readFileSync(outputPath, 'utf8'));
    const required = ['_id', 'nick', 'comment', 'url', 'created'];
    let bad = 0;
    const ids = new Set();
    for (const c of arr) {
      for (const k of required) {
        if (c[k] === undefined || c[k] === null || c[k] === '') {
          console.error(`✗ ${c._id} 缺少字段 ${k}`);
          bad++;
        }
      }
      if (ids.has(c._id)) { console.error(`✗ 重复 _id: ${c._id}`); bad++; }
      ids.add(c._id);
      // 回复完整性：pid 必须能找到
      if (c.rid && !ids.has(c.rid)) {
        // rid 指向的根评论在本批次中应存在（同讨论内）
        if (!arr.some(x => x._id === c.rid)) {
          console.error(`✗ ${c._id} 的 rid ${c.rid} 不在本批次中`);
          bad++;
        }
      }
    }
    const byUrl = {};
    for (const c of arr) byUrl[c.url] = (byUrl[c.url] ?? 0) + 1;
    console.log('按路径分布:', byUrl);
    console.log(bad === 0 ? '✓ 自检通过' : `✗ 自检发现 ${bad} 处问题`);
    process.exit(bad === 0 ? 0 : 1);
  }
}

function readIfExist(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

main();
