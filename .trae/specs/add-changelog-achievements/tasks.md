# 任务列表

## Task 1: 定义成就类型和计算函数
- [x] 在 `src/types/changelogTypes.ts` 中新增成就类型定义
  - [x] 定义 `ChangelogAchievement` 联合类型
  - [x] 定义成就配置对象（名称、颜色、图标）
  - [x] 实现 `calculateAchievements()` 计算函数
  - [x] 实现 `getAchievementLabel()` 获取成就名称函数
  - [x] 实现 `getAchievementColor()` 获取成就颜色函数

## Task 2: 修改 Changelog 接口
- [x] 在 `src/types/changelogTypes.ts` 中修改 `Changelog` 接口
  - [x] 添加 `achievements: ChangelogAchievement[]` 字段

## Task 3: 更新日志解析逻辑
- [x] 在 `src/utils/changelogUtils.ts` 中更新 `getServerChangelogs()` 函数
  - [x] 解析日志内容计算行数
  - [x] 调用 `calculateAchievements()` 计算成就
  - [x] 将成就数组添加到返回的 Changelog 对象中

## Task 4: 实现成就标签展示
- [x] 在 `src/components/changelogs/ClientChangelogsPage.tsx` 中
  - [x] 导入成就相关的类型和函数
  - [x] 在日志卡片头部添加成就标签渲染
  - [x] 确保成就标签显示在类型标签左侧
  - [x] 多个成就时按优先级排序显示

## Task 5: 运行代码检查
- [x] 运行 `npm run lint` 检查代码规范
