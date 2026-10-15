/**
 * 部署前精简依赖，让打包体积落进 Workers 免费版的 1 MiB 限制内。
 *
 * 【为什么需要这一步】
 * Twikoo 的后端逻辑来自 twikoo-func 包，它把几块能力作为硬依赖一起装了进来：
 *   - jsdom                     服务端渲染 HTML（用于评论内容处理）
 *   - tencentcloud-sdk-nodejs*  腾讯云内容审核
 *   - nodemailer                直连 SMTP 发信
 * 这些体积很大。做法是把它们的入口文件清空，使打包器扫不到实现代码。
 *
 * 【关于「1 MiB 上限」这个说法已经过时】
 * 上游 README 声称免费版有 1 MiB 打包体积限制、因此必须精简。实测并非如此：
 * Cloudflare 官方当前的限制是**未压缩 64 MiB**，且明确「没有压缩后大小限制」。
 * 本适配器实测数据（wrangler deploy --dry-run）：
 *     不精简：7216 KiB（gzip 1146 KiB）
 *     精简后：1571 KiB（gzip  299 KiB）
 * 两者都远低于上限，也就是说**精简不再是能不能部署的前提**。
 *
 * 保留这一步的真实理由只剩两条：
 *   1. 包体缩小到约 1/4.6，直接改善冷启动耗时。Workers 的启动时限是 1 秒，
 *      而 Twikoo 在这套部署上「冷启动 <0.5s」正是选它的主要卖点之一；
 *   2. 被清掉的三个能力里，邮件本来就不要（迁移到 Twikoo 的起因就是别再给读者发邮件），
 *      内容审核需要额外申请腾讯云密钥，jsdom 在上游文档里本就被标注为
 *      「因 Node 兼容性问题无法使用」—— 清掉它们不损失任何实际可用的功能。
 * 如果将来需要腾讯云内容审核，可以删掉本脚本并去掉 package.json 的 predeploy 钩子，
 * 包体变大但仍在限制内。
 *
 * 【这样做的代价】
 * 清空后对应的功能在 Workers 上不可用：
 *   - 腾讯云内容审核不可用；
 *   - 直连 SMTP 不可用 —— 这本来就是 Workers 的限制（出站 25/587/465 端口被屏蔽），
 *     上游文档也说明只能用 SendGrid / MailChannels / Resend 这类 HTTP 邮件通道。
 *
 * 【为什么按包名匹配、而不是硬编码入口文件路径】
 * 上游 README 给的是三个写死的路径，其中
 * `node_modules/tencentcloud-sdk-nodejs/tencentcloud/index.js` 已经失效 ——
 * 该包后来改名为 `tencentcloud-sdk-nodejs-tms`，照抄上游会导致这个包没被精简、
 * 打包体积超限，而失败点要到 wrangler deploy 时才暴露。
 * 因此这里改为按包名前缀匹配目录，再从各包自己的 package.json 解析入口字段，
 * 上游改名或调整目录结构都不会让本脚本静默失效。
 *
 * 【为什么 main / module / browser 三个字段都要清】
 * 打包器对不同字段有优先级（esbuild 通常优先 module，Node 用 main），
 * 只清 main 可能仍被 module 指向的文件撑大体积。
 *
 * 用法：npm run strip（部署前执行一次；npm install 之后需要重跑）
 */

import { writeFileSync, existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const nodeModules = join(projectRoot, 'node_modules');

/**
 * 需要清空的依赖
 *
 * match 是包名前缀：完全相等或以「前缀 + -」开头都算命中，
 * 因此 `tencentcloud-sdk-nodejs` 能同时匹配到改名后的 `tencentcloud-sdk-nodejs-tms`。
 */
const TARGETS = [
  { match: 'jsdom', feature: '评论内容服务端渲染' },
  { match: 'tencentcloud-sdk-nodejs', feature: '腾讯云内容审核' },
  { match: 'nodemailer', feature: '直连 SMTP 发信' },
];

/** package.json 中可能指向入口的字段 */
const ENTRY_FIELDS = ['main', 'module', 'browser'];

/** 在 node_modules 下按前缀找包目录 */
function findPackages(prefix) {
  if (!existsSync(nodeModules)) return [];
  return readdirSync(nodeModules, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name === prefix || name.startsWith(`${prefix}-`));
}

let failed = false;
let strippedCount = 0;

for (const target of TARGETS) {
  const packages = findPackages(target.match);

  if (packages.length === 0) {
    // 包本身没装，说明这个功能不在当前依赖树里，没有需要精简的东西。
    // 这不是错误 —— 上游可能已经把它从依赖中移除了。
    console.log(`· 跳过 ${target.match}（${target.feature}）：当前依赖树中不存在该包`);
    continue;
  }

  for (const name of packages) {
    const pkgJsonPath = join(nodeModules, name, 'package.json');
    if (!existsSync(pkgJsonPath)) {
      console.error(`✗ ${name} 缺少 package.json，无法解析入口`);
      failed = true;
      continue;
    }

    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    // 入口字段的值可能是 './lib/x.js' 或 'lib/x.js'，统一去掉前导 './'
    const entries = ENTRY_FIELDS
      .map((field) => pkg[field])
      .filter((value) => typeof value === 'string' && value.length > 0)
      .map((value) => value.replace(/^\.\//, ''));

    let stripped = 0;
    for (const entry of entries) {
      const absolute = join(nodeModules, name, entry);
      // 字段可能指向目录（如 exports 场景）而非文件，跳过不存在的路径
      if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;

      const before = statSync(absolute).size;
      writeFileSync(absolute, '');
      stripped += 1;
      strippedCount += 1;
      // 报的是文件本身的大小，注意它远小于实际的打包体积收益：
      // 这些入口多是几十字节的转发文件，清空它们的意义在于让打包器
      // 无法顺着 import 追进真正的实现目录，收益体现在整个依赖子图上。
      console.log(`✓ 已清空 ${name}/${entry}（${target.feature}），原 ${before} 字节`);
    }

    if (stripped === 0) {
      // 包在，但没有任何入口字段指向真实文件：说明包结构变了，
      // 此时包仍然完整地留在依赖树里、会撑大打包体积，必须显式失败。
      console.error(`✗ ${name} 存在但未找到可清空的入口文件（字段：${entries.join(', ') || '无'}）—— 包结构可能已变化`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\n精简未全部完成，请先解决上面的问题再执行 wrangler deploy。');
  process.exit(1);
}

console.log(`\n精简完成，共清空 ${strippedCount} 个入口文件，可以执行 npm run deploy 了。`);
