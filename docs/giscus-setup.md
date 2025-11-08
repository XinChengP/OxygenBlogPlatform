# Giscus 评论系统配置指南

本博客已集成 Giscus 评论系统，基于 GitHub Discussions，让访客可以通过 GitHub 账户进行评论。

## 配置步骤

### 1. 准备 GitHub 仓库

1. 确保你的博客仓库是**公开的**
2. 在仓库设置中启用 **Discussions** 功能：
   - 进入仓库的 Settings 页面
   - 在 "Features" 部分勾选 "Discussions"

### 2. 安装 Giscus 应用

1. 访问 [giscus.app](https://giscus.app/zh-CN)
2. 点击页面上的 "安装 Giscus 应用" 按钮
3. 选择要安装 Giscus 的仓库（你的博客仓库）
4. 完成安装流程

### 3. 获取配置参数

1. 在 [giscus.app/zh-CN](https://giscus.app/zh-CN) 页面上填写以下信息：
   - 仓库：选择你的博客仓库
   - 页面 ↔️ 讨论 映射：选择 "特定"
   - 讨论 分类：选择或创建一个分类（如 "Announcements"）
   - 特性：根据需要选择

2. 页面会生成配置代码，你需要记录以下信息：
   - `data-repo`: 你的 GitHub 仓库（用户名/仓库名）
   - `data-repo-id`: 仓库 ID
   - `data-category`: 讨论分类名称
   - `data-category-id`: 分类 ID

### 4. 更新配置文件

1. 打开 `src/config/giscus.ts` 文件
2. 替换以下占位符为你的实际配置：

```typescript
export const giscusConfig = {
  // 替换为你的 GitHub 仓库
  repo: 'YOUR_GITHUB_USERNAME/YOUR_REPOSITORY',
  
  // 替换为你的仓库 ID
  repoId: 'YOUR_REPOSITORY_ID',
  
  // 替换为你的讨论分类名称
  category: 'Announcements',
  
  // 替换为你的分类 ID
  categoryId: 'YOUR_CATEGORY_ID',
  
  // 其他配置保持默认即可
  // ...
};
```

### 5. 测试评论系统

1. 启动博客应用
2. 访问任意博客文章页面
3. 在页面底部应该能看到 Giscus 评论组件
4. 使用 GitHub 账户登录并发表测试评论

## 自定义选项

### 主题

Giscus 评论系统会自动适配博客的主题（浅色/深色）。你也可以在 `giscusConfig` 中修改默认主题：

```typescript
// 可选主题: 'light', 'dark', 'dark_dimmed', 'dark_high_contrast', 
// 'dark_tritanopia', 'light_high_contrast', 'light_tritanopia'
theme: 'preferred_color_scheme',
```

### 语言

默认设置为中文 (`zh-CN`)，你可以修改为其他语言：

```typescript
lang: 'en', // 英文
lang: 'ja', // 日文
// 其他语言代码...
```

### 评论映射方式

默认使用 `specific` 映射，即每篇文章使用文章 ID 作为讨论标识符。你也可以选择其他映射方式：

```typescript
mapping: 'pathname', // 使用页面路径
mapping: 'url',      // 使用完整 URL
mapping: 'title',    // 使用页面标题
// 其他映射方式...
```

## 常见问题

### 评论不显示

1. 检查仓库是否为公开仓库
2. 确认已安装 Giscus 应用
3. 确认已启用 Discussions 功能
4. 检查配置参数是否正确

### 无法登录评论

1. 确保使用的是 GitHub 账户
2. 检查浏览器是否阻止了第三方 Cookie

### 评论主题不匹配

1. 检查 `useTheme` hook 是否正确配置
2. 确认主题切换功能正常工作

## 更多信息

- [Giscus 官方文档](https://giscus.app/zh-CN)
- [GitHub Discussions 文档](https://docs.github.com/en/discussions)