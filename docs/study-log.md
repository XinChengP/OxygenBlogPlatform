# 学习打卡模块说明

`/study` 页面用于记录每日学习（如 CAD、SolidWorks），包含打卡热力图、连续天数、
累计时长、科目分布和近 30 天趋势，以及「英语背单词」数据卡片（墨墨背单词）。

## 英语背单词数据（墨墨背单词）

前台「英语背单词」卡片的数据来自墨墨背单词官方开放 API（open.maimemo.com），
展示累计已背词数、今日进度和近 30 天每日新学单词数。

### Token 配置（后台一站式，推荐）

打开 **后台 → 学习打卡 → 墨墨背单词** 卡片：

1. 点「粘贴墨墨 Token」输入框，把 Token 粘贴进去（输入不可见）
2. 点 **保存并同步**：Token 用 Windows DPAPI 加密保存为本机 `.maimemo-token.enc`
   （不落明文、不入库、仅本机当前用户可解密），并自动同步一次验证
3. 之后点 **同步墨墨** 拉数据、**提交推送** 发布；卡片上会显示上次同步时间、
   累计词数和今日进度，配置状态一目了然
4. 点 **清除本机 Token** 可随时删掉本机保存的凭据

Token 在墨墨背单词 App：**我的 → 更多设置 → 实验功能 → 开放 API** 生成。

> 备注：后台保存的 Token 只用于**本机**同步与预览。线上官网的自动更新走
> `cloudflare/maimemo-stats` Worker（Token 存 Worker Secret），见下方「数据同步」。

### 命令行方式（可选）

习惯终端的话也可以：

### 数据同步（三种方式）

| 方式 | 操作 | 适用 |
| --- | --- | --- |
| 线上自动（推荐） | 部署 `cloudflare/maimemo-stats` Worker（一次性），Token 存 Worker Secret；前台访问时自动读取，边缘缓存 10 分钟 | 日常零操作 |
| 后台按钮 | 「学习打卡」页点 **同步墨墨**，再点 **提交推送**（写构建期快照） | 本地预览/兜底 |
| 命令行 | `npm run maimemo -- --push` | 终端党 |

线上自动更新的部署步骤（只需做一次）：

```bash
cd cloudflare/maimemo-stats
npm install
npx wrangler secret put MAIMEMO_API_TOKEN   # 粘贴墨墨 Token（Windows 可直接双击 set-secret.bat）
npx wrangler deploy
```

详细说明见 `cloudflare/maimemo-stats/README.md`。部署后访问
`https://blog.xinchengp.cn/api/maimemo/stats` 能看到 JSON 即成功——**不需要
GitHub Secret、不需要提交数据文件、也不需要重新构建网站**。

数据说明：

- 前台优先请求 `/api/maimemo/stats`（Worker，运行时最新）；请求失败时回退到
  构建期快照 `src/data/maimemo-stats.json`（后台按钮/命令行同步生成，可不存在）
- 卡片展示：累计已背、今日进度、今日学习时长、连续背词天数、近 30 天新学趋势
  （含日均/单日最高）、今日新学、待复习（依据最近 1000 条记录估算）、顽固词数量、
  最近学习的 5 个单词
- 「每日新学单词数」由单词记录的**首次学习日期**聚合而来（按北京时间换算），
  单次最多拉取 1000 条记录；「累计已背」以接口返回的总数为准
- 「今日进度」是接口实时返回的快照（Worker 场景下每次请求/缓存刷新时更新）
- 未配置 Token 或未同步过、且 Worker 不可用时，前台不展示该卡片
- 本地明文 `.env` 的 `MAIMEMO_API_TOKEN` 仍然兼容（旧配置），推荐用后台或 Worker Secret

## 后台打卡（推荐）

启动本地开发服务后，打开 `http://localhost:7120/admin/study`（侧边栏「学习打卡」）：

- 表单填日期、科目、时长、心情、标签和笔记，点「打卡」即可
- 同一天可多次提交：科目时长自动累加，笔记按时间追加到正文
- 记录列表支持删除某天的记录（删除后前台统计同步变化）
- 「提交推送」按钮把当前所有改动 `git add . + commit + push`，等 CI 构建后网页更新。
  注意它会提交仓库里的全部改动，不只是打卡文件

## 命令行打卡

在项目根目录运行：

```bash
npm run study -- "今天学了修剪、偏移和镜像" -s CAD -m 60
```

常用参数：

| 参数 | 说明 | 示例 |
| --- | --- | --- |
| （第一个参数） | 打卡内容（一句话笔记） | `"画完第一张三视图"` |
| `-s, --subject` | 科目名称 | `-s SolidWorks` |
| `-m, --minutes` | 学习时长（分钟），配合 `-s` 使用 | `-m 90` |
| `--mood` | 心情：`great` / `good` / `normal` / `hard` | `--mood good` |
| `-t, --tags` | 标签，逗号分隔 | `-t 草图,约束` |
| `--date` | 指定日期补卡（YYYY-MM-DD） | `--date 2026-10-25` |
| `--push` | 打卡后自动 git 提交并推送 | |

同一天可以运行多次，脚本会把科目时长累加、笔记按时间追加：

```bash
npm run study -- "上午学基础命令" -s CAD -m 45
npm run study -- "下午练草图" -s CAD -m 60 --push
```

打卡后推送，GitHub Actions 重新构建，网页上的统计就更新了。

## 数据文件格式

每条记录是 `src/content/study-log/` 下的一个 Markdown 文件，文件名即日期
（如 `2026-10-26.md`）。也可以直接手动创建/编辑这些文件：

```markdown
---
date: "2026-10-26"
subjects:
  - name: "CAD"
    minutes: 60
  - name: "SolidWorks"
    minutes: 45
mood: "good"
tags:
  - "草图"
---

- **19:30** 学了拉伸、旋转和切除
- **21:00** 练习完全定义草图，发现漏标注尺寸
```

字段说明：

- `date`：记录日期，缺省时取文件名
- `subjects`：当天的科目与时长（分钟），同名科目会自动合并；也支持单科目简写
  `subject: "CAD"` + `minutes: 60`
- `mood`：可选心情标记，影响记录卡片右上角的表情
- `tags`：可选标签
- `hidden: true`：隐藏这条记录（不展示，也不参与统计）
- 正文：Markdown，支持图片、列表、代码块等，展示在记录卡片里

## 代码位置

| 文件 | 作用 |
| --- | --- |
| `src/app/study/page.tsx` | 页面入口（构建期读数据 + SEO 元数据） |
| `src/components/study/ClientStudyPage.tsx` | 页面主体（统计卡片、时间线） |
| `src/components/study/HeatmapCalendar.tsx` | 打卡热力图 |
| `src/components/study/StudyTrendChart.tsx` | 近 30 天趋势图 |
| `src/utils/studyLogUtils.ts` | 数据读取与统计（连续天数、科目汇总） |
| `src/types/studyLog.ts` | 类型定义 |
| `scripts/add-study-log.ts` | 快速打卡脚本（`npm run study`） |
| `src/actions/studyLogActions.ts` | 后台打卡的 Server Actions |
| `src/app/admin/study/` | 后台打卡管理页 |
| `src/utils/maimemoSync.ts` | 墨墨开放 API 拉取与聚合逻辑 |
| `scripts/fetch-maimemo.ts` | 墨墨同步脚本（`npm run maimemo`） |
| `src/data/maimemo-stats.json` | 墨墨数据构建期快照（后台/命令行同步生成，可不存在） |
| `cloudflare/maimemo-stats/` | 线上数据接口 Worker（运行时自动拉取 + 边缘缓存） |
| `src/components/study/MaimemoCard.tsx` | 前台背单词数据卡片（运行时拉取，快照兜底） |
