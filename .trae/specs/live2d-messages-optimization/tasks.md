# Live2D 消息系统优化任务列表

## 任务概述

本次任务旨在将画廊页面的硬编码消息迁移到配置系统，并为个人动态和更新日志页面添加 Live2D 联动。

---

## 任务 1：在 live2dMessages.ts 中新增画廊消息配置

- [x] 在 `src/setting/live2dMessages.ts` 中添加 `GalleryMessages` 配置
- [x] 添加 `PAGE_VISIT` - 画廊页面访问消息（4条）
- [x] 添加 `CATEGORY_CHANGE` - 分类切换消息（支持{category}占位符，4条）
- [x] 添加 `IMAGE_CLICK` - 图片点击消息（5条）
- [x] 添加 `IMAGE_PREVIEW` - 图片预览消息（4条）
- [x] 添加 `PREVIEW_CLOSE` - 关闭预览消息（3条）
- [x] 添加 `SCROLL` - 滚动浏览消息（4条）

**依赖**: 无

---

## 任务 2：在 live2dMessages.ts 中新增个人动态消息配置

- [x] 在 `src/setting/live2dMessages.ts` 中添加 `MomentsMessages` 配置
- [x] 添加 `PAGE_VISIT` - 动态页面访问消息（4条）

**依赖**: 任务1

---

## 任务 3：在 live2dMessages.ts 中新增更新日志消息配置

- [x] 在 `src/setting/live2dMessages.ts` 中添加 `ChangelogsMessages` 配置
- [x] 添加 `PAGE_VISIT` - 更新日志页面访问消息（4条）

**依赖**: 任务2

---

## 任务 4：在 Live2DMessageHelper 中添加新的helper方法

- [x] 在 `src/utils/live2dMessageManager.ts` 中添加 `showGalleryMessage()` 方法
- [x] 在 `src/utils/live2dMessageManager.ts` 中添加 `showMomentsMessage()` 方法
- [x] 在 `src/utils/live2dMessageManager.ts` 中添加 `showChangelogsMessage()` 方法

**依赖**: 任务1、任务2、任务3

---

## 任务 5：修改 GalleryClient.tsx 使用配置化消息

- [x] 修改 `src/app/gallery/GalleryClient.tsx` 的导入语句，使用 `Live2DMessageHelper`
- [x] 修改分类切换处理函数，使用 `showGalleryMessage('CATEGORY_CHANGE')`
- [x] 修改图片点击处理函数，使用 `showGalleryMessage('IMAGE_CLICK')`
- [x] 修改预览打开/关闭处理函数，使用对应的消息方法
- [x] 修改页面加载欢迎消息，使用 `showGalleryMessage('PAGE_VISIT')`
- [x] 修改滚动消息，使用 `showGalleryMessage('SCROLL')`

**依赖**: 任务4

---

## 任务 6：在个人动态页面添加 Live2D 联动

- [x] 查看 `src/app/moments/ClientMomentsPage.tsx` 的结构
- [x] 添加必要的导入（`Live2DMessageHelper`）
- [x] 在页面加载时调用 `showMomentsMessage('PAGE_VISIT')`

**依赖**: 任务4

---

## 任务 7：在更新日志页面添加 Live2D 联动

- [x] 查看 `src/app/changelogs/page.tsx` 的结构
- [x] 添加必要的导入
- [x] 在页面加载时调用 `showChangelogsMessage('PAGE_VISIT')`

**依赖**: 任务4

---

## 任务 8：验证 GitHub Pages 兼容性

- [x] 确保所有路径使用 `getAssetPath()` 处理
- [x] 确保所有事件在客户端运行
- [x] 确保消息配置为静态数据

**依赖**: 任务5、任务6、任务7

---

## 任务依赖关系图

```
任务1 (画廊消息配置)
    ↓
任务4 (helper方法) ← 任务2 (动态消息配置) ← 任务3 (更新日志消息配置)
    ↓
任务5 (画廊组件修改)
任务6 (动态页面修改)
任务7 (更新日志页面修改)
    ↓
任务8 (验证兼容性)
```

---

## 预估工作量

- **任务1**: 约 30 分钟
- **任务2**: 约 15 分钟
- **任务3**: 约 15 分钟
- **任务4**: 约 30 分钟
- **任务5**: 约 30 分钟
- **任务6**: 约 20 分钟
- **任务7**: 约 20 分钟
- **任务8**: 约 15 分钟

**总计**: 约 3 小时
