# 日志成就标签功能规范

## Why
为开发日志增加趣味性的成就标签系统，通过统计日志的关联提交数量和日志行数，自动授予不同的成就称号。这些成就标签仅用于展示，不参与任何统计计算，增加日志页面的趣味性和成就感。

## What Changes
- **新增** 成就类型定义和成就计算函数
- **新增** 成就标签组件，显示在类型标签左侧
- **修改** Changelog 类型定义，增加 achievements 字段
- **修改** 日志卡片组件，展示成就标签
- 成就标签支持同时显示多个成就

## Impact
- 受影响文件:
  - `src/types/changelogTypes.ts` - 新增成就类型和计算函数
  - `src/utils/changelogUtils.ts` - 解析时计算成就
  - `src/components/changelogs/ClientChangelogsPage.tsx` - 展示成就标签

## ADDED Requirements

### Requirement: 成就类型定义
系统 SHALL 定义以下成就类型：

| 成就名称 | 触发条件 | 颜色 |
|---------|---------|------|
| 略感疲惫 | 关联提交数量 >= 10 且 < 25 | #7366ff |
| 肝爆了 | 关联提交数量 >= 25 | #e566ff |
| 麻雀虽小五脏俱全 | 关联提交 = 1 且 日志行数 > 55 | #ff66a6 |
| 人声鼎沸 | 日志行数 > 250 | #ff9966 |

**预留颜色（用于后续拓展）**: #f2ff66, #80ff66, #66ffbf

### Requirement: 成就计算逻辑
- **WHEN** 解析日志文件时
- **THEN** 根据以下条件计算成就：
  - `commits.length >= 10 && commits.length < 25` → 获得「略感疲惫」
  - `commits.length >= 25` → 获得「肝爆了」
  - `commits.length === 1 && contentLineCount > 55` → 获得「麻雀虽小五脏俱全」
  - `contentLineCount > 250` → 获得「人声鼎沸」

### Requirement: 成就标签展示
- **WHEN** 渲染日志卡片时
- **THEN** 在类型标签的左侧显示成就标签
- **AND** 可以同时显示多个成就（按成就优先级排序）
- **AND** 成就标签使用不同颜色区分

### Requirement: 成就不参与统计
- **GIVEN** 成就标签仅用于展示
- **THEN** 成就计算不影响任何现有统计功能
- **AND** 成就标签不纳入类型统计、时间统计等
