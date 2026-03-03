# 待办事件小组件实现计划

## 需求概述

为动态页面（moments）的侧边栏增加一个待办事件小组件：

* **前台展示**：静态展示待办事项，兼容 GitHub Pages 静态部署

* **后台管理**：本地后台提供完整的增删改查功能，使用 Server Actions

## 技术方案

### 1. 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages 部署                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  前台展示（静态生成）                                     ││
│  │  - /moments 页面包含 TodoWidget 组件                     ││
│  │  - 数据在构建时从 todo.json 读取                         ││
│  │  - 无需 API 调用，完全静态                               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    本地开发环境                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  后台管理（Server Actions）                              ││
│  │  - /admin/todo 页面                                     ││
│  │  - 使用 'use server' 指令的 Server Actions              ││
│  │  - 直接操作本地文件系统 (src/content/todo.json)         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2. 数据结构设计

```typescript
// 待办事项数据结构
interface TodoItem {
  id: string;           // 唯一标识符
  content: string;      // 待办内容
  completed: boolean;   // 是否完成
  priority?: 'high' | 'medium' | 'low';  // 优先级（可选）
  dueDate?: string;     // 截止日期（可选）
  createdAt: string;    // 创建时间
  updatedAt?: string;   // 更新时间
}

// 待办配置结构
interface TodoConfig {
  title: string;        // 小组件标题
  items: TodoItem[];    // 待办事项列表
  showStats: boolean;   // 是否显示统计
}
```

### 3. 文件结构

```
src/
├── app/
│   ├── moments/
│   │   └── page.tsx              # 修改：服务器端读取配置
│   └── admin/
│       └── todo/
│           ├── page.tsx          # 新建：待办管理入口（服务端组件）
│           └── TodoManageClient.tsx  # 新建：待办管理客户端组件
├── components/moments/
│   └── TodoWidget.tsx            # 新建：待办事件展示组件
├── content/
│   └── todo.json                 # 新建：待办事项配置文件
├── actions/
│   └── todoActions.ts            # 新建：待办管理 Server Actions
└── types/
    └── todo.ts                   # 新建：待办类型定义
```

### 4. 实现步骤

#### 步骤 1：创建类型定义 (`src/types/todo.ts`)

定义 TodoItem 和 TodoConfig 接口类型。

#### 步骤 2：创建待办配置文件 (`src/content/todo.json`)

初始配置文件，包含示例数据：

```json
{
  "title": "待办事项",
  "showStats": true,
  "items": []
}
```

#### 步骤 3：创建 Server Actions (`src/actions/todoActions.ts`)

参考现有的 `momentActions.ts` 实现模式：

服务器端操作函数：

* `getTodoConfig()`: 读取待办配置

* `saveTodoConfig()`: 保存待办配置

* `getTodoList()`: 获取待办列表

* `getTodoItem()`: 获取单个待办

* `createTodoItem()`: 创建待办

* `updateTodoItem()`: 更新待办

* `deleteTodoItem()`: 删除待办

* `toggleTodoComplete()`: 切换完成状态

#### 步骤 4：创建待办事件展示组件 (`src/components/moments/TodoWidget.tsx`)

前台展示组件：

* 从 props 接收待办数据

* 静态展示待办列表

* 显示完成状态（复选框样式）

* 显示待办统计信息

* 支持优先级标识

#### 步骤 5：修改动态页面 (`src/app/moments/page.tsx`)

* 服务器端读取 todo.json

* 将数据传递给 ClientMomentsPage

#### 步骤 6：修改客户端动态页面 (`src/components/moments/ClientMomentsPage.tsx`)

* 接收待办数据 props

* 在侧边栏添加 TodoWidget 组件

#### 步骤 7：创建后台管理页面 (`src/app/admin/todo/`)

参考现有的 `admin/moments/` 实现模式：

**page.tsx（服务端组件）：**

* 调用 Server Actions 获取初始数据

* 传递给客户端组件

**TodoManageClient.tsx（客户端组件）：**

* 待办列表展示（表格形式）

* 添加新待办（表单）

* 编辑待办（表单）

* 删除待办（确认弹窗）

* 标记完成/取消完成

* 筛选功能（全部/未完成/已完成）

### 5. UI 设计规范

#### 前台展示组件样式

```css
/* 与现有小组件保持一致 */
p-6 rounded-lg border transition-all duration-300 
backdrop-blur-md bg-card/90 border-border shadow-lg 
supports-[backdrop-filter]:bg-card/75
```

#### 待办项样式

* 未完成：正常文本颜色，空心复选框图标

* 已完成：文本添加删除线，颜色变淡，实心复选框图标

* 高优先级：左侧显示红色/橙色标记

#### 后台管理样式

* 与现有后台管理页面风格一致

* 使用表格展示待办列表

* 表单使用卡片样式

### 6. 功能细节

#### 前台展示

* 未完成项显示在上方

* 已完成项显示在下方

* 按优先级排序（高 > 中 > 低）

* 显示统计：总数/已完成数/完成率

#### 后台管理

* 表格展示所有待办

* 支持筛选（全部/未完成/已完成）

* 支持搜索待办内容

* 添加/编辑表单包含：内容、优先级、截止日期

* 删除需二次确认

* 操作后调用 Server Actions 更新文件

### 7. 响应式设计

* 前台：移动端组件宽度自适应，桌面端固定在侧边栏

* 后台：表格在移动端转为卡片列表

### 8. GitHub Pages 兼容性

* 前台展示完全静态，数据在构建时嵌入

* 后台管理使用 Server Actions，仅在本地开发环境可用

* 修改后重新构建部署即可更新前台展示

## 实现文件清单

| 文件路径                                           | 操作 | 说明                  |
| ---------------------------------------------- | -- | ------------------- |
| `src/types/todo.ts`                            | 新建 | 待办类型定义              |
| `src/content/todo.json`                        | 新建 | 待办事项配置文件            |
| `src/actions/todoActions.ts`                   | 新建 | 待办管理 Server Actions |
| `src/components/moments/TodoWidget.tsx`        | 新建 | 前台展示组件              |
| `src/app/moments/page.tsx`                     | 修改 | 服务器端读取配置            |
| `src/components/moments/ClientMomentsPage.tsx` | 修改 | 引入展示组件              |
| `src/app/admin/todo/page.tsx`                  | 新建 | 后台管理入口              |
| `src/app/admin/todo/TodoManageClient.tsx`      | 新建 | 后台管理客户端组件           |

## 预期效果

### 前台展示（GitHub Pages）

1. 动态页面侧边栏显示待办事件小组件
2. 静态展示待办列表，无需交互
3. 显示完成状态和统计信息
4. UI 风格与现有小组件一致
5. 完全兼容 GitHub Pages 静态部署

### 后台管理（本地开发环境）

1. 访问 `/admin/todo` 进入待办管理页面
2. 可以添加、编辑、删除待办事项
3. 可以标记完成/取消完成
4. 支持筛选和搜索
5. 使用 Server Actions 直接操作文件系统

## 使用流程

1. 本地运行 `npm run dev` 启动开发服务器
2. 访问 `/admin/todo` 管理待办事项
3. 添加/修改/删除待办后，数据保存到 `src/content/todo.json`
4. 运行 `npm run build:pages` 构建静态站点
5. 部署到 GitHub Pages
6. 前台展示最新的待办内容（静态）

