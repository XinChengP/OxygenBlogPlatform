# 学习打卡模块说明

`/study` 页面用于记录每日学习（如 CAD、SolidWorks），包含打卡热力图、连续天数、
累计时长、科目分布和近 30 天趋势。

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
