# Twikoo 评论后端（Cloudflare Workers + D1）

本站评论区由 giscus（GitHub Discussions）迁移到 Twikoo 后的后端部分。本目录是 Twikoo
官方独立 Worker 适配器 [`twikoojs/twikoo-cloudflare`](https://github.com/twikoojs/twikoo-cloudflare)
的部署副本，与博客前端完全解耦：前端只通过 `envId` 指向本 Worker 的地址，两边可以各自独立更新。

**为什么选这个适配器**：Twikoo 2.0 的官方 Cloudflare 适配器位于其 monorepo 的
`packages/server-cloudflare`，`private: true` 且依赖 `workspace:*`，无法从 npm 安装，
必须用 Node 26 + pnpm 构建整个 monorepo 才能产出可部署的产物。本目录使用的 1.x 独立适配器
是单文件纯 JS Worker，`wrangler deploy` 即可，没有构建步骤，部署成本低得多。

---

## 部署步骤

前置条件：Node.js 18+、一个 Cloudflare 账号、`xinchengp.cn` 已托管在 Cloudflare。

### 1. 安装依赖

```bash
npm install
```

注意 `package.json` 的 `overrides` 把 `axios` 指向了一个 git 仓库
（`wuzhengmao/axios-cf-worker`），这是 Workers 环境能跑通 `pushoo` 推送的前提，
因此 `npm install` 需要本机能访问 GitHub。

**如果报 `ENOSPC: no space left on device`**：这是 npm 的缓存与临时目录所在盘满了
（默认在 `C:\Users\<用户名>\AppData\Local\npm-cache`），与本项目所在盘无关。
把这两处改到空间充足的盘即可，例如：

```bash
export npm_config_cache=W:/tmp/npmcache
export TMPDIR=W:/tmp/npmtmp TEMP=W:/tmp/npmtmp TMP=W:/tmp/npmtmp
npm install
```

注意 `TMPDIR` / `TEMP` / `TMP` 三个都要设：npm 及其子进程（包括为 git 依赖触发的
内层 npm）会读不同的变量，只设其中一个仍可能落到满盘上。

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

会打开浏览器完成 OAuth 授权。

### 3. 创建 D1 数据库

```bash
npx wrangler d1 create twikoo
```

输出里会带 `database_name` 和 `database_id`。**把 `database_id` 填进 `wrangler.toml`
的 `[[d1_databases]]` 段**，替换掉占位符 `REPLACE_WITH_YOUR_D1_DATABASE_ID`。
这个 id 是账号级唯一标识，无法预设，必须手动粘贴。

### 4. 建表

```bash
npx wrangler d1 execute twikoo --remote --file=./schema.sql
```

建出 `comment`、`config`、`counter` 三张表。`config` 是单行表，Twikoo 的全部后台配置
（含管理员密码哈希）都以一个 JSON 串存在这一行里。

### 5. 部署

```bash
npm run deploy
```

`deploy` 前面挂了 `predeploy`，会自动先跑一遍 `scripts/strip-heavy-deps.mjs`。
该脚本把 `jsdom`、`tencentcloud-sdk-nodejs*`、`nodemailer` 几个依赖的入口文件清空，
使打包器扫不到它们的实现代码。

**关于「1 MiB 打包体积上限」这个说法已经过时。** 上游 README 称免费版有 1 MiB 限制、
必须精简才能部署，实测并非如此：Cloudflare 官方当前的限制是**未压缩 64 MiB**，
并明确说明「没有压缩后大小限制」。本适配器的实测数据（`wrangler deploy --dry-run`）：

| | 未压缩 | gzip |
| --- | --- | --- |
| 不精简 | 7216 KiB | 1146 KiB |
| 精简后 | 1571 KiB | 299 KiB |

两者都远低于上限，也就是说**精简不再是能否部署的前提**。保留这一步的理由只剩两条：
包体缩小到约 1/4.6 能直接改善冷启动耗时（Workers 启动时限 1 秒，而 Twikoo 在这套
部署上「冷启动 < 0.5s」正是选它的主要卖点）；且被清掉的三个能力里，邮件本来就不要、
内容审核需额外申请腾讯云密钥、jsdom 在上游文档里本就被标注为「因 Node 兼容性问题
无法使用」——清掉它们不损失任何实际可用的功能。

将来若需要腾讯云内容审核，删掉该脚本并去掉 `package.json` 里的 `predeploy` 钩子即可，
包体变大但仍在限制内。

成功后命令行会输出 Worker 地址，形如 `https://twikoo.<你的账号>.workers.dev`。
浏览器访问它，正常时应看到：

```json
{"code":100,"message":"Twikoo 云函数运行正常，请参考 https://twikoo.js.org/frontend.html 完成前端的配置","version":"..."}
```

### 6. 绑定自定义域名

`*.workers.dev` 在中国大陆存在 DNS 污染，直接访问会超时，**必须绑自定义域名**才能达到
「国内可用」的目标。

Cloudflare 控制台 → Workers & Pages → 选中 `twikoo` → Settings → Domains & Routes →
Add → Custom Domain → 填 `twikoo.xinchengp.cn`。

因为 `xinchengp.cn` 已经在 Cloudflare 上托管，这里不需要改 DNS 记录，Cloudflare 会自动
创建所需记录并签发证书。生效后这个地址（含 `https://`）就是前端的 `envId`。

### 7. 配置博客前端

在博客仓库的 `.env`（以及 `.env.production`、`.env.custom-domain`）里设置：

```bash
export NEXT_PUBLIC_TWIKOO_ENV_ID=https://twikoo.xinchengp.cn
```

这是 `NEXT_PUBLIC_` 前缀的变量，会在构建时内联进前端产物，因此**改完必须重新构建部署**
才生效，不是运行时读取。

### 8. 设置管理员密码

第一次打开博客评论区时，Twikoo 会检测到尚未设置密码，提示你创建。
密码以 md5 存进 D1 的 `config` 表。**这一步必须由你本人完成，密码不要交给任何人。**

设好密码后，评论区右下角会出现管理入口，进去可以配置：评论审核、是否允许匿名、
表情包、以及下面提到的推送通知。

---

## 与本站目标相关的两个关键配置

### 不给读者发邮件

Twikoo 的邮件通知是**默认不发**的：它只有在配置了 SMTP 之后才会发，而且行为与 giscus
完全不同 —— 只在「有人回复了你」时发给被回复的那一个人，不会像 GitHub Discussions
那样把整条讨论串推给所有参与者。

本站的做法是**完全不配置 SMTP**。管理端的「有新评论」通知改走 `pushoo`：
在管理面板的通知设置里填微信 / QQ / Telegram / 飞书 / 钉钉 / Bark 的 webhook 即可，
全程不碰邮件。上游 README 也确认 `pushoo` 在本适配器上工作正常。

顺带说明：即使你想配 SMTP 也配不了 —— `nodemailer` 已被精简脚本清空，且 Workers 免费版
屏蔽了出站 25/587/465 端口。上游只支持 SendGrid / MailChannels / Resend 这类 HTTP 邮件通道。

### 评论路径

前端的 `path` 统一取 `location.pathname`，与 giscus 原先的 `pathname` 映射规则一致。
本站 `next.config.ts` 设置了 `trailingSlash: true`，所以文章路径恒定是 `/blogs/<slug>/` 这种
带尾斜杠的形态，不会出现上游 README 第 5 条提到的「同一页面有两种路径写法导致评论分裂」的问题。

---

## 本适配器的已知限制

来自上游 README，逐条说明对本站的影响：

| 限制 | 对本站的影响 |
| --- | --- |
| 不支持 `process.env` 控制行为 | 无影响。所有配置都在 Twikoo 管理面板里改，包括 CORS 白名单 |
| 无法接入腾讯云内容审核 | 内容审核需在管理面板手动处理，或改用关键词过滤 |
| 无法按 IP 解析地理位置 | 评论里不会显示「来自 xx」，这是功能缺失，不是配置问题 |
| 用 `xss` 而非 `dompurify` 做 XSS 过滤 | 无影响，两者都是成熟的过滤库 |
| 路径不做尾斜杠归一化 | 无影响，见上一节 |
| 不支持直连 SMTP | 与本站目标一致（本来就不想发邮件） |

---

## 关于免费额度

Cloudflare Workers 免费版是 **100,000 请求/天**，每天 00:00 UTC 重置，折合约 300 万/月。
这个额度对个人博客的评论量非常宽裕。打包体积上限是未压缩 64 MiB（见上文，1 MiB 的说法已过时）。

需要留意的是免费版 **CPU 时间上限为 10ms/次**，以及**启动时限 1 秒**。Cloudflare 的
CPU 时间**不包含**等待数据库 IO 的时间，所以实际余量比字面数字大；但如果某篇文章积累了
上千条评论，单次请求里解析和序列化 JSON 的 CPU 开销有可能触碰这个上限。真遇到再考虑
升级付费版（$5/月）即可。

另外免费版不支持直连 SMTP、Akismet 和腾讯云内容审核，这三点对本站均无影响。

---

## 数据导出与迁移

Twikoo 管理面板内置导入 / 导出，导出为 JSON，格式与 `twikoo-func` 的导入格式一致
（管理面板的导入源里就有「Twikoo (JSON)」选项）。因此数据始终可以完整取回，
不会被锁死在这个平台上。

从 giscus 迁移已有评论需要单独处理 —— 三家主流 Twikoo/Waline/Artalk 的官方迁移工具
都不支持 GitHub Discussions，需要用 GitHub GraphQL API 自行导出并映射字段。
这部分脚本与本站的 URL 映射规则另行提供。

---

## 前端与后端的版本配对

**本目录已把 `twikoo-func` 锁死在 `1.6.45`（去掉 `^`），前端自托管脚本同为 1.6.45。**
这不是随手锁版本 —— 是一个真实的坑：

上游适配器 `twikoojs/twikoo-cloudflare` 的代码按 **1.6** 的 API 编写（`utils/lib`
模块导出 `getCheerio` 等函数），而它声明的依赖范围 `^1.6.44` 会解析到 **1.7.24**；
`twikoo-func` 1.7 重构了 `utils/lib`，**删除了 `getCheerio`**。两者错位的结果是
Worker 能通过打包，却在部署验证阶段抛
`Uncaught TypeError: (0 , Lr.getCheerio) is not a function`，部署直接失败。
这是上游自己的版本断档（截至 2026-10 上游尚未适配 1.7），锁死 1.6.45 是当前唯一
能让两者对齐的方式。

因此**升级后端前必须先确认上游适配器已适配新版 API**，并同步升级前端脚本：
`twikoo` 前端包同时存在 1.6.x / 1.7.x / 2.0.x 三条线，npm 的 `latest` 标签指向
2.0.x —— **不要照 `latest` 取前端**，前后端协议或 API 版本不一致会出难以定位的异常。

---

## 更新上游代码

本目录的 `src/index.js` 与 `schema.sql` 来自上游 `main` 分支。升级时：

1. 重新从上游拉取这两个文件；
2. 检查 `package.json` 的依赖版本是否同步（`twikoo-func` 若跨到 2.x，前端也要换到 2.x）；
3. 确认 `scripts/strip-heavy-deps.mjs` 仍能匹配到依赖目录 —— 它按包名前缀匹配、
   从各包自己的 `package.json` 解析入口，上游改名不会让它静默失效（这正是它
   取代上游 README 里写死路径的原因：`tencentcloud-sdk-nodejs` 已改名为
   `tencentcloud-sdk-nodejs-tms`，照抄旧路径会漏掉这个包）；
4. 如果上游改了表结构，用 `npx wrangler d1 execute twikoo --remote --file=./schema.sql`
   重跑（脚本用的是 `CREATE TABLE IF NOT EXISTS`，对已有库是幂等的）。
