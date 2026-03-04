---
name: "todo-manage"
description: "管理待办事项。Invoke when user wants to add, edit, delete, or view todo items, or needs help with todo management."
---

# 待办事项管理技能

## 概述

本技能用于帮助用户管理待办事项，包括添加、编辑、删除和查看待办。

## 待办数据结构

待办数据存储在 `src/content/todo.json` 文件中。

### 数据格式

```json
{
  "title": "待办事项",
  "showStats": true,
  "items": [
    {
      "id": "唯一标识符",
      "content": "待办内容",
      "completed": false,
      "priority": "medium",
      "dueDate": "2026-03-10",
      "createdAt": "2026-03-03T10:00:00",
      "updatedAt": "2026-03-03T12:00:00"
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| id | 是 | 唯一标识符，自动生成 |
| content | 是 | 待办内容 |
| completed | 是 | 是否完成，`true` 或 `false` |
| priority | 否 | 优先级：`high`（高）、`medium`（中）、`low`（低） |
| dueDate | 否 | 截止日期，格式 `YYYY-MM-DD` |
| createdAt | 是 | 创建时间，ISO 格式 |
| updatedAt | 否 | 更新时间，ISO 格式 |

### 优先级说明

| 优先级 | 标签 | 颜色 |
|--------|------|------|
| high | 高优先级 | 红色 |
| medium | 中优先级 | 黄色 |
| low | 低优先级 | 绿色 |

## 功能入口

### 前台展示
- **路径**: `/moments`
- **位置**: 页面右侧侧边栏
- **功能**: 静态展示待办列表，显示完成进度统计

### 后台管理
- **路径**: `/admin/todo`
- **功能**: 完整的增删改查操作
- **支持**: 筛选、搜索、批量删除

## 操作说明

### 添加待办

1. 访问 `/admin/todo` 页面
2. 点击右上角"添加待办"按钮
3. 填写待办内容（必填）
4. 选择优先级（可选）
5. 设置截止日期（可选）
6. 点击"添加"保存

### 编辑待办

1. 在待办列表中找到目标待办
2. 点击编辑图标（铅笔）
3. 修改内容、优先级或截止日期
4. 点击"保存"更新

### 删除待办

1. 在待办列表中找到目标待办
2. 点击删除图标（垃圾桶）
3. 确认删除操作

### 标记完成

1. 点击待办左侧的圆圈图标
2. 待办状态切换为已完成/未完成
3. 已完成项目显示删除线效果

### 筛选功能

- **状态筛选**: 全部 / 未完成 / 已完成
- **优先级筛选**: 全部 / 高 / 中 / 低
- **关键词搜索**: 搜索待办内容

## Server Actions

待办管理使用 Server Actions 进行数据操作：

| 函数 | 说明 |
|------|------|
| `getTodoConfig()` | 获取待办配置 |
| `getTodoList()` | 获取待办列表 |
| `createTodoItem()` | 创建新待办 |
| `updateTodoItem()` | 更新待办 |
| `deleteTodoItem()` | 删除待办 |
| `toggleTodoComplete()` | 切换完成状态 |
| `batchDeleteTodoItems()` | 批量删除 |

## 注意事项

- **静态部署**: 前台展示完全静态，修改后需重新构建部署
- **数据持久化**: 数据存储在 `todo.json` 文件中
- **GitHub Pages**: 后台管理功能仅在本地开发环境可用
- **构建命令**: `npm run build:pages`

## 示例

### 创建高优先级待办

```json
{
  "id": "abc123",
  "content": "完成项目文档",
  "completed": false,
  "priority": "high",
  "dueDate": "2026-03-15",
  "createdAt": "2026-03-03T10:00:00"
}
```

### 标记待办完成

修改 `completed` 字段为 `true`，并添加 `updatedAt` 时间戳。
