# 灯笼拖拽手感优化与碰撞箱修复 - 实现计划

## 问题分析

经过代码审查，我发现了以下问题：

### 1. 碰撞箱问题
- **问题所在**：灯笼容器（`.deng-box`）没有设置明确的宽度和高度，导致碰撞箱大小不确定
- **影响**：右侧灯笼碰撞箱右侧有大片空白，拖拽和碰撞检测不准确
- **原因**：`.lantern-3d` 的尺寸为 120px × 100px，但父容器没有明确尺寸

### 2. 拖拽手感问题
- 拖拽时有缩放动画（scale: 1.1）导致位置计算复杂
- 惯性效果可能不够流畅
- 缩放时的位置偏移计算可能有问题

---

## 任务列表

### [ ] 任务 1: 修复灯笼碰撞箱尺寸问题
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 为 `.deng-box` 容器添加明确的宽度和高度
  - 确保碰撞箱与灯笼实际视觉大小一致
  - 调整右侧两个灯笼（deng-box3 和 deng-box4）的碰撞箱
- **Success Criteria**:
  - 灯笼碰撞箱精确匹配视觉大小
  - 右侧灯笼不再有右侧空白碰撞区域
  - 拖拽时鼠标能精准抓住灯笼
- **Test Requirements**:
  - `programmatic` TR-1.1: 检查 `.deng-box` 元素有明确的 width 和 height 属性
  - `human-judgement` TR-1.2: 手动测试拖拽时鼠标能精准抓住灯笼的任意位置

---

### [ ] 任务 2: 优化拖拽手感
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 简化拖拽时的位置计算逻辑
  - 优化惯性效果，使其更自然流畅
  - 改进缩放时的位置偏移计算
  - 确保拖拽过程中灯笼跟随鼠标移动更丝滑
- **Success Criteria**:
  - 拖拽手感流畅自然
  - 惯性效果平滑过渡
  - 缩放时位置准确
- **Test Requirements**:
  - `human-judgement` TR-2.1: 拖拽灯笼感受顺滑，鼠标移动时灯笼跟随及时
  - `human-judgement` TR-2.2: 释放时惯性效果自然，停止平滑

---

### [ ] 任务 3: 测试与验证
- **Priority**: P2
- **Depends On**: 任务 1, 任务 2
- **Description**:
  - 全面测试所有灯笼的拖拽功能
  - 验证碰撞检测功能正常
  - 确保所有功能在不同屏幕尺寸下正常工作
- **Success Criteria**:
  - 所有灯笼拖拽功能正常
  - 碰撞检测准确
  - 响应式布局正常
- **Test Requirements**:
  - `programmatic` TR-3.1: 所有4个灯笼都能正常拖拽
  - `human-judgement` TR-3.2: 碰撞检测功能正常触发
