---
name: "admin-manage"
description: "后台管理系统操作指南。Invoke when user wants to access the admin panel, manage blog content, or perform CRUD operations on todos and other data."
---

# 后台管理技能

## 概述

本技能用于帮助用户使用博客的后台管理系统，进行内容管理和数据操作。

## 访问方式

### 进入后台管理

- **URL**: `/admin`
- **前提**: 必须在本地开发环境（`NODE_ENV=development`）
- **说明**: GitHub Pages 静态部署不支持后台管理功能

### 后台页面结构

```
/admin                 # 管理后台首页
/admin/todo           # 待办事项管理
/admin/content        # 内容管理（预留）
```

## 后台管理组件库

项目提供了统一的 UI 组件库，位于 `src/components/admin/`：

### 基础组件

| 组件 | 功能 | 说明 |
|------|------|------|
| AdminLayout | 后台布局 | 提供统一的页面布局结构 |
| AdminCard | 卡片容器 | 用于包裹各类管理内容 |
| AdminButton | 按钮 | 支持多种样式和状态 |
| AdminInput | 输入框 | 支持文本、数字等输入 |
| AdminForm | 表单 | 表单容器，支持验证 |
| AdminTable | 表格 | 数据列表展示 |
| AdminModal | 模态框 | 弹窗确认和编辑 |
| AdminConfirm | 确认对话框 | 确认操作，如删除 |
| AdminLoading | 加载状态 | 数据加载中提示 |
| AdminToast | 消息提示 | 操作成功/失败提示 |
| AdminSearchBar | 搜索栏 | 关键词搜索功能 |
| AdminSidebar | 侧边栏 | 后台导航菜单 |

### 组件使用示例

```typescript
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/AdminCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminInput from '@/components/admin/AdminInput';
import AdminModal from '@/components/admin/AdminModal';

export default function TodoManagePage() {
  return (
    <AdminLayout>
      <AdminCard title="待办管理">
        {/* 管理内容 */}
      </AdminCard>
    </AdminLayout>
  );
}
```

## 待办事项管理

详细操作请参考 `todo-manage` 技能。

### 功能入口

- **路径**: `/admin/todo`
- **数据文件**: `src/content/todo.json`

### 支持的操作

- 添加新待办
- 编辑待办内容/优先级/截止日期
- 删除待办
- 切换完成状态
- 筛选（状态/优先级）
- 关键词搜索

## Server Actions

后台管理使用 Next.js Server Actions 进行数据操作：

### 待办相关 Actions

| 函数 | 文件 | 说明 |
|------|------|------|
| `getTodoConfig()` | `src/services/todoActions.ts` | 获取待办配置 |
| `getTodoList()` | `src/services/todoActions.ts` | 获取待办列表 |
| `createTodoItem()` | `src/services/todoActions.ts` | 创建新待办 |
| `updateTodoItem()` | `src/services/todoActions.ts` | 更新待办 |
| `deleteTodoItem()` | `src/services/todoActions.ts` | 删除待办 |
| `toggleTodoComplete()` | `src/services/todoActions.ts` | 切换完成状态 |
| `batchDeleteTodoItems()` | `src/services/todoActions.ts` | 批量删除 |

### 使用示例

```typescript
'use server';

import { createTodoItem, updateTodoItem, deleteTodoItem } from '@/services/todoActions';

// 创建待办
async function handleCreateTodo(formData: FormData) {
  const content = formData.get('content') as string;
  const priority = formData.get('priority') as 'high' | 'medium' | 'low';

  await createTodoItem({
    content,
    priority,
  });
}

// 更新待办
async function handleUpdateTodo(id: string, updates: Partial<TodoItem>) {
  await updateTodoItem(id, updates);
}

// 删除待办
async function handleDeleteTodo(id: string) {
  await deleteTodoItem(id);
}
```

## 注意事项

### 环境限制

- **后台管理仅限本地开发环境使用**
- 静态部署（GitHub Pages）无法使用后台管理
- 修改数据后需要重新构建才能在静态版本生效

### 数据持久化

- 待办数据存储在 `src/content/todo.json` 文件中
- 每次操作后数据会自动保存到文件

### 安全考虑

- 后台管理目前无权限验证，请勿在公共环境部署
- Server Actions 在构建时会被执行，注意数据操作安全

### 操作规范

- 删除操作前建议二次确认
- 批量操作前建议提示用户影响范围
- 敏感操作记录日志便于排查问题

## 常见问题

### 后台页面404

检查是否在开发环境：
```bash
NODE_ENV=development npm run dev
```

### 数据未保存

确认 `src/content/todo.json` 文件是否有写入权限。

### 操作失败

检查浏览器控制台是否有错误信息，常见原因：
- 文件路径错误
- 权限不足
- 数据格式错误
