# GitHub Pages 音乐播放器部署指南 🎵

## 概述

本项目已针对 GitHub Pages 部署进行了全面优化，音乐播放器可以在 GitHub Pages 上正常工作，包括处理 basePath 配置和音频文件路径。

## 主要优化内容

### 1. 🎵 音频文件路径处理
- **动态路径处理**: 在 `MusicPlayer.tsx` 中添加了 `formatAudioUrl` 函数
- **basePath 支持**: 自动检测并适配 GitHub Pages 子目录部署
- **环境变量**: 使用 `NEXT_PUBLIC_BASE_PATH` 处理构建时的路径

### 2. 🔧 静态导出配置
- **next.config.ts**: 优化了静态导出配置
- **basePath 处理**: 正确处理用户名.github.io 和项目仓库的差异
- **assetPrefix**: 静态资源路径前缀配置

### 3. 🎨 深色模式优化
- **aplayer-theme.css**: 完整的深色模式样式支持
- **颜色对比度**: 优化了暗色主题下的可读性
- **交互效果**: 增强了按钮和控件的视觉效果

## 部署步骤

### 1. 仓库设置
确保你的 GitHub 仓库已启用 GitHub Pages：

```yaml
# 仓库设置
Settings -> Pages -> Source -> GitHub Actions
```

### 2. GitHub Actions 配置
项目已包含完整的 `.github/workflows/deploy.yml` 配置，支持：
- 自动构建和部署
- 静态文件导出
- basePath 自动处理

### 3. 环境变量配置
在 GitHub Actions 中设置以下环境变量：

```yaml
# 在 GitHub Actions 中设置
env:
  GITHUB_REPOSITORY: ${{ github.repository }}
  REPO_NAME: ${{ github.event.repository.name }}
```

## 音乐播放器特性

### 🎵 内置音乐列表
- 10 首洛天依歌曲
- 自动路径处理
- 播放状态保存

### 🌙 深色模式支持
- 自动主题检测
- 优化的颜色对比度
- 平滑过渡动画

### 📱 响应式设计
- 移动端适配
- 吸底模式
- 列表折叠/展开

## 音频文件管理

### 文件位置
所有音频文件存储在 `public/music/` 目录：

```
public/music/
├── 一半一半 - 洛天依.mp3
├── 三月雨 - 洛天依.mp3
├── 夏虫 - 洛天依.mp3
├── 天星问 - 洛天依.mp3
├── 流光 (Light Me Up) - 洛天依.mp3
├── 啥啊 - 洛天依.mp3
├── 异样的风暴中心 - 洛天依.mp3
├── 歌行四方 - 洛天依.mp3
├── 蝴蝶 - 洛天依.mp3
└── 霜雪千年 - 洛天依、乐正绫.mp3
```

### 添加新音乐
1. 将音频文件放入 `public/music/` 目录
2. 更新 `MusicPlayer.tsx` 中的 `defaultMusicList` 数组
3. 重新构建和部署

## 故障排除

### 音频文件无法播放
1. **检查文件路径**: 确保音频文件在 `public/music/` 目录中
2. **文件名编码**: 使用正确的 Unicode 字符编码
3. **文件大小**: 确保文件大小适中（建议 < 10MB）

### 深色模式显示问题
1. **CSS 加载**: 检查 `aplayer-theme.css` 是否正确加载
2. **主题检测**: 确认浏览器支持 `prefers-color-scheme`
3. **缓存清理**: 清理浏览器缓存后重试

### GitHub Pages 部署问题
1. **构建状态**: 检查 GitHub Actions 构建日志
2. **basePath 配置**: 确认仓库名称配置正确
3. **文件权限**: 确保所有文件都有正确的权限

## 技术细节

### basePath 处理逻辑
```typescript
const getBasePath = () => {
  if (typeof window !== 'undefined') {
    const pathArray = window.location.pathname.split('/');
    const basePath = pathArray.slice(0, -1).join('/');
    return basePath || '';
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
};
```

### 音频 URL 格式化
```typescript
const formatAudioUrl = (url: string) => {
  const basePath = getBasePath();
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return basePath ? `${basePath}${cleanUrl}` : cleanUrl;
};
```

## 测试清单

部署完成后，请测试以下功能：

- [ ] 音乐播放器正常加载
- [ ] 音频文件可以播放
- [ ] 播放列表展开/折叠正常
- [ ] 深色模式样式正确
- [ ] 响应式布局在不同设备上正常
- [ ] 播放状态保存和恢复
- [ ] 主题切换动画流畅

## 支持与维护

### 定期检查
- 每月检查 GitHub Pages 状态
- 监控音频文件加载情况
- 更新依赖包版本

### 问题反馈
如遇到问题，请检查：
1. 浏览器控制台错误信息
2. 网络请求状态
3. 文件访问权限

---

🎵 **音乐播放器现已完全适配 GitHub Pages，享受你的音乐博客之旅！**