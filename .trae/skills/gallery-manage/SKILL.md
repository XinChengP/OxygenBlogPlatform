---
name: "gallery-manage"
description: "管理画廊图片资源。Invoke when user wants to add images to gallery, organize gallery categories, or configure gallery display settings."
---

# 画廊管理技能

## 概述

本技能用于帮助用户管理博客画廊系统的图片资源，包括图片上传、分类管理和展示配置。

## 画廊文件结构

### 图片存储位置

- **画廊图片**: `public/LTY_Picture/`
- **博客文章图片**: `public/Blogabout/文章名/`

### 画廊页面

- **页面路径**: `src/app/gallery/page.tsx`
- **组件位置**: `src/components/gallery/`

## 画廊功能特性

- 图片管理和展示
- 分类筛选
- 图片预览（模态框）
- 高级放大控制
- 响应式网格布局
- 图片懒加载

## 图片管理规范

### 图片命名

- 使用有意义的文件名
- 避免中文和特殊字符
- 推荐使用英文、数字和下划线
- 示例：`luotianyi_concert_2025.webp`

### 图片格式

- **推荐格式**: WebP、AVIF
- **兼容格式**: JPEG、PNG
- **避免使用**: BMP、TIFF 等大体积格式

### 图片尺寸

- 建议宽度不超过 1920px
- 单张图片大小建议不超过 2MB
- 使用适当的压缩比例

## 画廊组件

### 主要组件

| 组件 | 路径 | 功能 |
|------|------|------|
| CategoryFilter | `src/components/gallery/CategoryFilter.tsx` | 分类筛选器 |
| ImageCard | `src/components/gallery/ImageCard.tsx` | 图片卡片 |
| ImagePreview | `src/components/gallery/ImagePreview.tsx` | 图片预览模态框 |

### 图片预览功能

- 点击放大显示
- 支持左右翻页
- 精细缩放控制（+/-/0键）
- 鼠标拖拽查看
- 缩放百分比显示

## 添加图片到画廊步骤

1. 准备图片文件（推荐 WebP 格式）
2. 将图片放入 `public/LTY_Picture/` 目录
3. 在动态或文章中引用图片路径
4. 刷新页面查看效果

## 画廊配置

### 分类配置

画廊支持按分类筛选图片，分类可以在页面组件中配置：

```typescript
const categories = [
  { id: 'all', name: '全部' },
  { id: 'concert', name: '演唱会' },
  { id: 'fanart', name: '同人图' },
  { id: 'screenshot', name: '截图' },
];
```

### 响应式布局

- **移动端**: 单列或双列
- **平板端**: 三列
- **桌面端**: 四列或更多

## 注意事项

- 图片路径使用绝对路径，如 `/LTY_Picture/image.webp`
- 确保图片文件存在，避免 404 错误
- 定期清理未使用的图片
- 建议使用 WebP 格式优化加载速度
- 图片懒加载会自动处理，无需额外配置
