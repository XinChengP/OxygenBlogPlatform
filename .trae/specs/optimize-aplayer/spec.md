# APlayer 音乐播放器全面优化规格文档

## Why

当前 APlayer 音乐播放器存在以下问题：

1. **代码结构问题**：音乐列表硬编码在组件中，难以维护和扩展
2. **状态管理分散**：全局管理器、组件状态、localStorage 状态同步不一致
3. **性能优化不足**：预加载功能未充分利用，资源加载策略可优化
4. **用户体验缺失**：缺少播放模式切换、播放历史等功能
5. **代码质量待提升**：类型定义不完善、缺少自定义 hooks、错误处理不够健壮

## What Changes

### 架构优化

* 重构音乐列表配置，提取到独立的 JSON 配置文件

* 创建统一的音乐播放器配置管理模块

* 优化全局状态管理，确保状态一致性

* 抽取自定义 hooks 提升代码复用性

* **确保 GitHub Pages 兼容**：所有资源路径使用 `getAssetPath` 处理

### 功能增强

* 添加播放模式切换（顺序播放、随机播放、单曲循环）

* 完善歌词显示控制，支持歌词开关记忆

* 添加播放历史记录功能

* 添加音量记忆和静音状态记忆

* 优化播放进度记忆精度

### 性能优化

* 优化资源预加载策略，优先加载当前播放歌曲

* 添加懒加载机制，减少初始加载时间

* 优化事件监听器管理，防止内存泄漏

* 添加资源缓存策略

### 用户体验优化

* 添加播放器加载状态提示

* 优化错误提示和降级处理

* 优化深色/浅色模式切换过渡效果

### 代码质量提升

* 完善 TypeScript 类型定义

* 添加详细的中文注释

* 抽取可复用的自定义 hooks

* 增强错误处理和边界情况处理

## Impact

* **受影响的文件**：

  * `src/components/MusicPlayer.tsx` - 核心播放器组件

  * `src/utils/globalMusicPlayerManager.ts` - 全局状态管理

  * `src/utils/musicPlayerPreloader.ts` - 预加载器

  * `src/utils/musicPlayerVisibility.ts` - 可见性控制

  * `src/components/aplayer-theme.css` - 样式文件

  * `src/types/aplayer.d.ts` - 类型定义

* **新增文件**：

  * `src/content/music.json` - 音乐列表配置

  * `src/hooks/useMusicPlayer.ts` - 音乐播放器自定义 hook

  * `src/utils/musicConfigManager.ts` - 音乐配置管理器

* **受影响的功能**：

  * 音乐播放器核心功能

  * Live2D 联动功能

  * 设置页面音乐播放器控制

***

## ADDED Requirements

### Requirement: 音乐列表配置管理

系统应提供独立的音乐列表配置文件，支持灵活的音乐管理，**确保 GitHub Pages 静态部署兼容**。

#### Scenario: 加载音乐配置

* **WHEN** 播放器初始化时

* **THEN** 从 `src/content/music.json` 加载音乐列表配置

* **AND** 验证配置文件格式和完整性

* **AND** 处理配置加载失败的情况

* **AND** 所有资源路径使用 `getAssetPath` 处理 basePath

#### Scenario: 音乐配置结构

* **WHEN** 定义音乐配置时

* **THEN** 配置应包含以下字段：

  * `id`: 唯一标识符

  * `name`: 歌曲名称

  * `artist`: 歌手名称

  * `url`: 音频文件路径（相对路径，运行时通过 `getAssetPath` 处理）

  * `cover`: 封面图片路径（可选）

  * `lrc`: 歌词文件路径（可选）

  * `duration`: 时长（可选，用于预加载优化）

#### Scenario: GitHub Pages 部署兼容

* **WHEN** 部署到 GitHub Pages 时

* **THEN** 所有资源路径自动添加仓库前缀

* **AND** 配置文件在构建时正确打包

* **AND** 静态导出模式下功能正常

### Requirement: 播放模式切换

系统应支持多种播放模式，并持久化用户选择。

#### Scenario: 切换播放模式

* **WHEN** 用户点击播放模式按钮

* **THEN** 循环切换播放模式：顺序播放 → 随机播放 → 单曲循环 → 顺序播放

* **AND** 保存播放模式到 localStorage

* **AND** 更新播放器界面显示当前模式

#### Scenario: 恢复播放模式

* **WHEN** 播放器初始化时

* **THEN** 从 localStorage 恢复上次选择的播放模式

* **AND** 应用到当前播放器实例

### Requirement: 播放历史记录

系统应记录用户播放历史，支持快速访问。

#### Scenario: 记录播放历史

* **WHEN** 歌曲开始播放时

* **THEN** 记录歌曲信息到播放历史

* **AND** 最多保存最近 50 首歌曲

* **AND** 去重相同歌曲

#### Scenario: 查看播放历史

* **WHEN** 用户请求查看播放历史

* **THEN** 显示最近播放的歌曲列表

* **AND** 支持快速播放历史歌曲

### Requirement: 增强的状态持久化

系统应完善播放状态的持久化机制。

#### Scenario: 保存播放状态

* **WHEN** 播放状态发生变化时

* **THEN** 保存以下信息到 localStorage：

  * 当前播放索引

  * 播放进度（精确到秒）

  * 音量大小

  * 静音状态

  * 播放模式

  * 歌词显示状态

#### Scenario: 恢复播放状态

* **WHEN** 播放器初始化时

* **THEN** 从 localStorage 恢复所有保存的状态

* **AND** 验证状态有效性

* **AND** 处理无效状态的降级

### Requirement: 资源预加载优化

系统应优化资源加载策略，提升用户体验。

#### Scenario: 优先加载当前歌曲

* **WHEN** 播放器初始化时

* **THEN** 优先加载当前播放歌曲的音频和封面

* **AND** 延迟加载其他歌曲资源

#### Scenario: 智能预加载

* **WHEN** 当前歌曲播放到 80% 时

* **THEN** 开始预加载下一首歌曲

* **AND** 根据播放模式决定预加载策略

### Requirement: 自定义 Hooks 抽取

系统应抽取可复用的自定义 hooks。

#### Scenario: useMusicPlayer Hook

* **WHEN** 组件需要访问播放器功能时

* **THEN** 使用 `useMusicPlayer` hook 获取：

  * 播放器实例

  * 当前播放状态

  * 播放控制方法

  * 播放列表操作

### Requirement: 错误处理增强

系统应完善错误处理机制。

#### Scenario: 资源加载失败

* **WHEN** 音频或封面加载失败时

* **THEN** 显示默认占位内容

* **AND** 记录错误日志

* **AND** 不影响其他歌曲播放

#### Scenario: 配置文件解析失败

* **WHEN** 音乐配置文件解析失败时

* **THEN** 使用内置的默认配置

* **AND** 显示配置加载失败提示

* **AND** 允许用户手动刷新

***

## MODIFIED Requirements

### Requirement: 全局播放器管理器优化

原有的全局播放器管理器需要进行以下优化：

1. **状态管理增强**：

   * 添加播放模式状态管理

   * 添加歌词显示状态管理

   * 添加播放历史管理

   * 优化状态同步机制

2. **事件系统完善**：

   * 添加播放模式变化事件

   * 添加音量变化事件

   * 添加播放历史更新事件

   * 优化事件订阅管理

3. **类型定义完善**：

   * 完善播放状态类型

   * 添加播放模式类型

   * 添加播放历史类型

### Requirement: 播放器组件重构

原有的 MusicPlayer 组件需要进行以下重构：

1. **配置加载**：

   * 从配置文件加载音乐列表

   * 支持动态更新配置

   * 处理配置加载失败

   * **确保所有资源路径使用** **`getAssetPath`** **处理**

2. **状态管理**：

   * 使用自定义 hooks 管理状态

   * 优化状态更新逻辑

   * 减少不必要的渲染

3. **功能集成**：

   * 集成播放模式切换

   * 集成播放历史

   * 优化 Live2D 联动

### Requirement: 样式优化

原有的 aplayer-theme.css 需要进行以下优化：

1. **播放模式指示器样式**：

   * 添加播放模式图标样式

   * 添加模式切换动画

2. **加载状态样式**：

   * 添加加载动画

   * 添加错误状态样式

3. **响应式优化**：

   * 优化移动端显示

   * 优化小屏幕交互

***

## REMOVED Requirements

### Requirement: 硬编码音乐列表

**Reason**: 音乐列表应从配置文件加载，便于维护和扩展

**Migration**:

* 将硬编码的音乐列表迁移到 `src/content/music.json`

* 更新播放器组件从配置文件加载音乐列表

* 保留默认配置作为降级方案

### Requirement: 分散的状态管理

**Reason**: 状态管理分散导致同步问题，应统一管理

**Migration**:

* 将所有播放器状态统一到全局管理器

* 使用自定义 hooks 访问状态

* 确保状态变更的一致性

