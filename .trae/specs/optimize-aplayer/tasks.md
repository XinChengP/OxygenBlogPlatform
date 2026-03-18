# Tasks

## 阶段一：基础设施优化

- [x] Task 1: 创建音乐配置文件和管理器
  - [x] SubTask 1.1: 创建 `src/content/music.json` 音乐列表配置文件
  - [x] SubTask 1.2: 创建 `src/utils/musicConfigManager.ts` 配置管理器
  - [x] SubTask 1.3: 迁移现有硬编码音乐列表到配置文件
  - [x] SubTask 1.4: 添加配置验证和错误处理
  - [x] SubTask 1.5: 确保所有资源路径使用 `getAssetPath` 处理（GitHub Pages 兼容）

- [x] Task 2: 完善 TypeScript 类型定义
  - [x] SubTask 2.1: 扩展 `src/types/aplayer.d.ts` 添加播放模式类型
  - [x] SubTask 2.2: 添加播放状态类型定义
  - [x] SubTask 2.3: 添加播放历史类型定义
  - [x] SubTask 2.4: 添加配置文件类型定义

## 阶段二：核心功能重构

- [x] Task 3: 优化全局播放器管理器
  - [x] SubTask 3.1: 添加播放模式状态管理
  - [x] SubTask 3.2: 添加歌词显示状态管理
  - [x] SubTask 3.3: 添加播放历史管理功能
  - [x] SubTask 3.4: 优化状态持久化机制
  - [x] SubTask 3.5: 完善事件系统

- [x] Task 4: 创建自定义 Hooks
  - [x] SubTask 4.1: 创建 `src/hooks/useMusicPlayer.ts` 播放器核心 hook
  - [x] SubTask 4.2: 创建 `src/hooks/useMusicHistory.ts` 播放历史 hook

- [x] Task 5: 重构 MusicPlayer 组件
  - [x] SubTask 5.1: 更新组件使用配置文件加载音乐列表
  - [x] SubTask 5.2: 集成播放模式切换功能
  - [x] SubTask 5.3: 优化状态管理和渲染性能
  - [x] SubTask 5.4: 完善错误处理和降级逻辑
  - [x] SubTask 5.5: 确保 GitHub Pages 部署兼容性
  
  ## 阶段三：性能优化
  
- [x] Task 6: 优化资源预加载策略
  - [x] SubTask 6.1: 更新预加载器支持优先级加载
  - [x] SubTask 6.2: 实现智能预加载（播放到 80% 预加载下一首）
  - [x] SubTask 6.3: 添加资源缓存策略
  - [x] SubTask 6.4: 优化事件监听器管理
  
  ## 阶段四：用户体验优化
  
- [x] Task 7: 优化播放器样式
  - [x] SubTask 7.1: 添加播放模式指示器样式
  - [x] SubTask 7.2: 添加加载状态和错误状态样式
  - [x] SubTask 7.3: 优化响应式布局
  - [x] SubTask 7.4: 优化深色/浅色模式过渡效果
  
- [x] Task 8: 添加用户提示和反馈
  - [x] SubTask 8.1: 添加播放器加载状态提示
  - [x] SubTask 8.2: 优化错误提示信息

## 阶段五：测试和验证

- [x] Task 9: 功能测试和验证
  - [x] SubTask 9.1: 测试音乐配置加载功能
  - [x] SubTask 9.2: 测试播放模式切换功能
  - [x] SubTask 9.3: 测试状态持久化功能
  - [x] SubTask 9.4: 测试 Live2D 联动功能
  - [x] SubTask 9.5: 测试错误处理和降级逻辑
  - [x] SubTask 9.6: 测试 GitHub Pages 部署兼容性

---

# Task Dependencies

- Task 2 依赖 Task 1（需要配置文件结构定义类型）
- Task 3 依赖 Task 2（需要类型定义）
- Task 4 依赖 Task 3（hooks 依赖全局管理器）
- Task 5 依赖 Task 1, Task 3, Task 4（组件依赖配置、管理器和 hooks）
- Task 6 依赖 Task 5（预加载优化需要组件支持）
- Task 7 依赖 Task 5（样式需要配合新功能）
- Task 8 依赖 Task 5, Task 7（提示需要配合功能和样式）
- Task 9 依赖所有前置任务

# Parallelizable Work

以下任务可以并行执行：
- Task 1 和 Task 2 可以并行
- Task 7 和 Task 8 可以在 Task 5 完成后并行
- Task 9 的各子任务可以并行测试
