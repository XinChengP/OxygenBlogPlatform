---
name: "admin-manage"
description: "后台管理系统操作指南。Invoke when user wants to access the admin panel, manage blog content, or perform CRUD operations on todos and other data."
---

# 后台管理技能

## 概述

本技能用于帮助用户使用博客的后台管理系统，进行内容管理和数据操作。

**重要提示**: 后台管理功能仅在本地开发环境（`NODE_ENV=development`）可用。GitHub Pages 静态部署不支持后台管理功能。

## 访问方式

### 进入后台管理

- **URL**: `/admin`
- **前提**: 必须在本地开发环境（`NODE_ENV=development`）
- **说明**: GitHub Pages 静态部署不支持后台管理功能

### 后台页面结构

```
/admin                      # 管理后台首页（仪表盘）
/admin/blogs               # 文章管理列表
/admin/blogs/edit          # 撰写/编辑文章
/admin/moments             # 动态管理列表
/admin/moments/edit        # 发布/编辑动态
/admin/todo                # 待办事项管理
/admin/changelogs          # 更新日志列表
/admin/changelogs/edit     # 撰写/编辑日志
/admin/gallery/local       # 本地图床管理
/admin/gallery/remote      # 远程图床管理
/admin/gallery/settings    # 图床设置
/admin/backup              # 代码备份管理
/admin/settings            # 系统设置
```

## 后台管理组件库

项目提供了统一的 UI 组件库，位于 `src/components/admin/`：

### 基础组件

| 组件 | 功能 | 说明 |
|------|------|------|
| AdminLayout | 后台布局 | 提供统一的页面布局结构，包含侧边栏和顶部工具栏 |
| AdminSidebar | 侧边栏导航 | 响应式导航菜单，支持折叠/展开 |
| AdminCard | 卡片容器 | 用于包裹各类管理内容 |
| AdminButton | 按钮 | 支持多种样式和状态 |
| AdminInput | 输入框 | 支持文本、数字等输入 |
| AdminForm | 表单 | 表单容器，支持验证 |
| AdminTable | 表格 | 数据列表展示 |
| AdminModal | 模态框 | 弹窗确认和编辑 |
| AdminConfirm | 确认对话框 | 确认操作，如删除 |
| AdminLoading | 加载状态 | 数据加载中提示 |
| AdminToast | 消息提示 | 操作成功/失败提示（支持全局调用） |
| AdminSearchBar | 搜索栏 | 关键词搜索功能 |
| DashboardClient | 仪表盘 | 后台首页数据概览组件 |
| BackupManager | 备份管理 | 本地Git备份管理界面 |

### 组件使用示例

```typescript
'use client';

import { AdminLayout, AdminCard, AdminButton, AdminInput, AdminModal, toast } from '@/components/admin';

export default function MyAdminPage() {
  const handleSave = async () => {
    // 操作成功后显示提示
    toast.success('保存成功');
  };

  return (
    <AdminLayout>
      <AdminCard title="页面标题">
        {/* 管理内容 */}
        <AdminInput placeholder="请输入内容" />
        <AdminButton onClick={handleSave}>保存</AdminButton>
      </AdminCard>
    </AdminLayout>
  );
}
```

## 仪表盘功能

仪表盘（`/admin`）提供以下功能模块：

### 快捷操作区
- 新建文章 → `/admin/blogs/edit`
- 发布动态 → `/admin/moments/edit`
- 撰写日志 → `/admin/changelogs/edit`
- 添加待办 → `/admin/todo`
- 上传图片 → `/admin/gallery/local`
- 本地备份 → `/admin/backup`

### 数据概览
- 文章总数、字数统计
- 动态总数、字数统计
- 日志总数、字数统计
- 图片总数
- 待办完成进度
- 文章分类分布（环形图）
- 日志类型分布（环形图）
- 内容发布趋势（折线图）
- 热门标签云

## 待办事项管理

详细操作请参考 `todo-manage` 技能。

### 功能入口

- **路径**: `/admin/todo`
- **数据文件**: `src/content/todo.json`

### Server Actions

```typescript
import {
  getTodoConfig,      // 获取待办配置
  getTodoList,        // 获取待办列表
  getTodoItem,        // 获取单个待办
  createTodoItem,     // 创建待办
  updateTodoItem,     // 更新待办
  deleteTodoItem,     // 删除待办
  toggleTodoComplete, // 切换完成状态
  batchDeleteTodoItems, // 批量删除
} from '@/actions/todoActions';
```

## 更新日志管理

详细操作请参考 `changelog-manage` 技能。

### 功能入口

- **路径**: `/admin/changelogs`
- **数据文件**: `src/content/changelogs/`

## 代码备份管理

### 功能入口

- **路径**: `/admin/backup`
- **备份存储**: 项目根目录的 `admin-backup` 文件夹

### 支持的操作

- **创建备份**: 将Admin相关代码复制到本地Git仓库
- **查看备份历史**: 查看所有本地备份记录
- **恢复备份**: 从指定提交恢复代码状态
- **Git版本控制**: 自动初始化Git仓库，支持版本回溯

### Server Actions

```typescript
import {
  performBackup,      // 执行备份
  getBackupStatus,    // 获取备份状态
  getBackupHistory,   // 获取备份历史
  restoreBackup,      // 恢复备份
} from '@/actions/backupActions';
```

### 备份内容

备份包含以下目录：
- `src/app/admin/` - 后台页面
- `src/components/admin/` - 后台组件
- `src/actions/` - Server Actions
- `src/types/admin.ts`, `src/types/todo.ts` - 类型定义

## 图床管理

详细操作请参考 `gallery-manage` 技能。

### 功能入口

- **路径**: `/admin/gallery/local`（本地图床）
- **路径**: `/admin/gallery/remote`（远程图床）
- **路径**: `/admin/gallery/settings`（图床设置）

## Server Actions 规范

后台管理使用 Next.js Server Actions 进行数据操作：

### 通用返回格式

```typescript
interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
```

### 使用示例

```typescript
'use server';

import { createTodoItem } from '@/actions/todoActions';
import { revalidatePath } from 'next/cache';

// 创建待办
export async function handleCreateTodo(formData: FormData) {
  const content = formData.get('content') as string;
  const priority = formData.get('priority') as 'high' | 'medium' | 'low';

  const result = await createTodoItem({
    content,
    priority,
  });

  if (result.success) {
    // 重新验证相关页面缓存
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
  }

  return result;
}
```

## 工具函数

后台管理相关的工具函数位于 `src/utils/adminUtils.ts`：

### 文件名生成

```typescript
import { generateBlogFileName, generateImageFileName } from '@/utils/adminUtils';

// 生成文章文件名
const fileName = generateBlogFileName('我的文章标题');
// 输出: "我的文章标题"

// 生成图片文件名
const imageName = generateImageFileName('screenshot.png');
// 输出: "screenshot-1234567890.png"
```

### Token 加密存储

```typescript
import { 
  encryptAndStoreToken, 
  getDecryptedToken, 
  clearStoredToken,
  validateGitHubToken 
} from '@/utils/adminUtils';

// 存储GitHub Token（自动加密）
encryptAndStoreToken('ghp_xxxxxxxxxxxx');

// 获取Token（自动解密）
const token = getDecryptedToken();

// 验证Token格式
const isValid = validateGitHubToken(token);
```

### 本地存储管理

```typescript
import { saveAdminConfig, getAdminConfig, saveDraft, getDraft } from '@/utils/adminUtils';

// 保存配置
saveAdminConfig({
  githubOwner: 'username',
  githubRepo: 'repo',
  githubBranch: 'main',
  imageRepo: 'images',
  theme: 'system'
});

// 保存草稿
saveDraft('blog', '# 草稿内容');
const draft = getDraft('blog');
```

### 路径编码

```typescript
import { encodeChinesePath, decodeChinesePath } from '@/utils/adminUtils';

// 编码中文路径（用于GitHub API）
const encoded = encodeChinesePath('src/content/博客文章.md');
// 输出: "src/content/%E5%8D%9A%E5%AE%A2%E6%96%87%E7%AB%A0.md"
```

### 格式化函数

```typescript
import { formatFileSize, formatDateTime, formatRelativeTime } from '@/utils/adminUtils';

// 格式化文件大小
formatFileSize(1024 * 1024); // "1.00 MB"

// 格式化日期时间
formatDateTime(new Date()); // "2026-04-11 15:30"

// 格式化相对时间
formatRelativeTime(new Date(Date.now() - 3600000)); // "1小时前"
```

### 剪贴板操作

```typescript
import { copyToClipboard } from '@/utils/adminUtils';

// 复制到剪贴板
const success = await copyToClipboard('要复制的文本');
if (success) {
  toast.success('已复制到剪贴板');
}
```

## 类型定义

后台管理相关的类型定义位于 `src/types/admin.ts`：

```typescript
import type {
  AdminUser,           // 管理员用户
  AdminConfig,         // 后台配置
  BlogFormData,        // 博客文章表单
  MomentFormData,      // 动态表单
  AdminNavItem,        // 导航项
  AdminStatCard,       // 统计卡片
  AdminTableColumn,    // 表格列
  AdminActionResult,   // 操作结果
  AdminGalleryImage,   // 图床图片
  GallerySettings,     // 图床设置
  SystemSettings,      // 系统设置
  AdminPagination,     // 分页参数
  AdminQueryParams,    // 查询参数
  AdminNotification,   // 通知
  AdminActivityLog,    // 活动日志
} from '@/types/admin';
```

## 注意事项

### 环境限制

- **后台管理仅限本地开发环境使用**
- 静态部署（GitHub Pages）无法使用后台管理
- 修改数据后需要重新构建才能在静态版本生效

### 数据持久化

- 待办数据存储在 `src/content/todo.json` 文件中
- 文章数据存储在 `src/content/blogs/` 目录中
- 动态数据存储在 `src/content/moments/` 目录中
- 日志数据存储在 `src/content/changelogs/` 目录中
- 每次操作后数据会自动保存到文件

### 安全考虑

- 后台管理目前无权限验证，请勿在公共环境部署
- Server Actions 在构建时会被执行，注意数据操作安全
- GitHub Token 使用 XOR 加密存储在 localStorage 中

### 操作规范

- 删除操作前建议二次确认
- 批量操作前建议提示用户影响范围
- 敏感操作记录日志便于排查问题

### 样式隔离

后台页面自动隐藏以下前台组件：
- Live2D 洛天依看板娘
- 音乐播放器
- 滚动到顶部按钮
- 红灯笼装饰

## 常见问题

### 后台页面404

检查是否在开发环境：
```bash
NODE_ENV=development npm run dev
```

### 数据未保存

确认相关文件是否有写入权限：
- `src/content/todo.json`
- `src/content/blogs/`
- `src/content/moments/`
- `src/content/changelogs/`

### 操作失败

检查浏览器控制台是否有错误信息，常见原因：
- 文件路径错误
- 权限不足
- 数据格式错误
- Server Action 调用失败

### 如何添加新的后台页面

1. 在 `src/app/admin/` 下创建新的页面目录（如 `new-feature/page.tsx`）
2. 使用 `AdminLayout` 作为布局包裹
3. 在 `AdminSidebar` 中添加导航项
4. 如需数据操作，创建对应的 Server Actions

示例：
```typescript
// src/app/admin/new-feature/page.tsx
'use client';

import { AdminLayout, AdminCard } from '@/components/admin';

export default function NewFeaturePage() {
  return (
    <AdminLayout>
      <AdminCard title="新功能">
        {/* 页面内容 */}
      </AdminCard>
    </AdminLayout>
  );
}
```
