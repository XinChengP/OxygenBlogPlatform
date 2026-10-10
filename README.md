# 🌸 个人博客 - 洛天依主题

*最后更新: 2026年10月10日*

一个温馨可爱的个人博客，以虚拟歌手洛天依为主题，适合记录生活感悟和技术学习心得。

**Live站点**: [https://blog.xinchengp.cn](https://blog.xinchengp.cn)

## 🛠️ 技术栈

### 核心框架
- **Next.js 16.3.8** - App Router，开发模式使用 Turbopack，静态导出构建使用 webpack
- **React 19.x** - 函数组件 + hооk
- **TypeScript 5.x** - 严格模式，类型安全
- **Node.js 24** - 运行环境要求（engines 强制 >=24.0.0）

### 样式系统
- **Tailwind CSS 4** - 原子化CSS，深色模式支持
- **shadcn/ui 语义化 CSS 变量** - 统一语义化设计令牌，主题切换平滑过渡
- **CSS Variables** - 主题色系统，锁定天依蓝配色
- **Framer Motion** - 动画和过渡效果

### 主要依赖
- **next-themes** - 主题切换
- **marked / react-markdown** - Markdown渲染
- **gray-matter** - Frontmatter解析
- **highlight.js / react-syntax-highlighter** - 代码语法高亮
- **remark-gfm / remark-math / rehype-katex** - Markdown扩展（表格、数学公式）
- **rehype-sanitize / remark-emoji** - Markdown 安全过滤与表情支持
- **recharts** - 数据可视化图表（更新日志统计、技能雷达图）
- **howler** - 音乐播放器核心（HowlerPlayerManager 单例管理）
- **@tsparticles/react** - 粒子动画背景
- **leaflet / react-leaflet** - 旅行足迹地图
- **katex** - 数学公式渲染
- **dompurify** - XSS防护
- **qrcode.react** - 二维码生成（博客分享）
- **octokit** - GitHub API集成
- **simple-git** - Git操作（后台推送）
- **chinese-lunar-calendar** - 农历节日计算
- **lucide-react / @heroicons/react** - 图标库

### 开发工具
- **ESLint 9.x** - 代码检查
- **tsx** - TypeScript脚本执行器（画廊数据、站点地图生成）
- **sharp** - 图片处理
- **express / compression** - 本地静态预览服务器
- **Electron 34** - 桌面应用打包

## ✨ 主要功能

### ✨ 洛天依特色
- **互动看板娘** - 可爱的洛天依陪你逛博客，支持音乐/主题/页面联动与彩蛋消息
- **消息优先级系统** - 配置化消息模板 + 优先级队列（彩蛋 10 > 紧急 9 > 高 7 > 中 5 > 普通 3 > 低 1），高优先级可中断当前消息，彩蛋/烟花/歌词模式互斥屏蔽
- **上下文感知** - 根据滚动速度、停留时长、深夜活跃、回访次数等行为智能推送消息（30秒冷却）
- **一言接入** - 原生 fetch 调用一言 API，由 React 组件生命周期托管定时器，8秒超时静默降级
- **精选音乐** - 内置多首洛天依歌曲
- **主题配色** - 以天依蓝为主色调，清新自然

### 📝 博客功能
- **轻松写文** - 支持Markdown格式，简单易用
- **时光河流归档** - 水平波浪时间线布局，按年份自动分组，支持标签点击筛选
- **文章目录** - 自动生成目录导航，滚动高亮定位
- **相关文章** - 基于分类和标签的相关推荐
- **分享面板** - 支持链接复制和二维码分享
- **评论互动** - 基于GitHub Discussions的Giscus评论系统
- **阅读统计** - 自动计算阅读时间
- **隐藏文章** - 支持标记文章为隐藏状态
- **时效性提示** - 技术文章自动显示更新时效提示
- **多媒体渲染** - 支持KaTeX数学公式、视频文件自动渲染为播放器、B站视频嵌入
- **长代码折叠** - 超过30行的带语言代码块自动折叠，支持展开/收起与完整复制，避免长代码拖慢页面
- **文件下载链接** - Markdown链接支持download属性，可直接提供本地文件下载
- **路由级兜底** - 各主要页面提供 `loading.tsx` 骨架屏与 `error.tsx` 错误兜底，统一为 RouteSkeleton / RouteErrorFallback 组件，弱网或异常时不再白屏
- **博客渲染重构** - 拆分 BlogMarkdownBase / ServerBlogMarkdown / BlogArticleImage / BlogArticleIframe / ThemeAwareCodeBlock，服务端与客户端渲染统一
- **Markdown 安全** - rehype-sanitize 配置独立 sanitizeSchema，过滤危险标签属性
- **RSS 订阅** - 内置 `/rss.xml` 订阅源（构建期静态生成），与 sitemap 共用统一的博客扫描工具（blogScanner），页脚提供订阅入口

### 🎵 音乐播放器
- **Howler驱动** - 基于 Howler.js 的全局播放管理器，播放状态跨页面持久化
- **侧边滑出** - 隐藏在屏幕左侧，鼠标移入热区或点击独立按钮滑出
- **播放模式** - 顺序、随机（防重复）、单曲循环
- **歌词显示** - 支持歌词面板与高亮滚动
- **播放历史** - 记录最近播放，快速回听
- **精细控制** - 进度条拖拽、音量滑块、播放列表定位

### 🎯 个人动态
- **动态发布** - 记录生活点滴，支持置顶功能
- **时间显示** - 精确到秒的时间记录
- **九宫格图片** - 图片以九宫格布局展示，支持灯箱预览
- **画廊选图** - 发布动态时可直接从画廊选择图片
- **隐藏动态** - 支持标记动态为隐藏状态
- **侧边栏组件** - 待办事项、时间进度、节日倒计时

### 🖼️ 画廊系统
- **图片管理** - 集中管理博客图片资源
- **分类筛选** - 按分类浏览和筛选图片
- **图片预览** - 灯箱放大控制、左右翻页
- **递归扫描** - 自动递归扫描子目录图片
- **目录树导航** - 子目录快速导航和数量统计

### 📋 更新日志
- **开发日志** - 记录项目开发过程和功能更新
- **时间线展示** - 按时间顺序展示更新历史
- **分类标记** - 区分功能新增、优化、修复等类型
- **数据可视化** - 时间趋势折线图和类型分布环形图
- **成就标签** - 根据提交数量和日志规模自动计算成就

### 🛠️ 后台管理
- **本地管理** - 开发环境访问 `/admin` 进行后台管理
- **内容管理** - 博客、动态、更新日志的增删改查与编辑
- **画廊管理** - 本地图片上传与远程图床管理
- **待办管理** - 待办事项的增删改查操作
- **代码备份** - 本地代码备份快照管理，支持密码保护
- **GitHub推送** - 直接推送更改到远程仓库
- **站点设置** - 站点配置在线调整

### 🎨 关于页面
- **技能雷达图** - Recharts雷达图展示技能水平，支持悬停查看详情
- **旅行足迹** - Leaflet地图标记旅行地点
- **游戏库** - 展示常玩游戏收藏
- **设备卡片** - 翻转动画展示常用设备

### 🌐 其他亮点
- **深色模式** - 自动跟随系统或手动切换，暗色图片智能滤镜
- **浏览器检测** - 自动检测浏览器兼容性并提示
- **代码复制** - 代码块一键复制功能
- **外链安全守卫** - 全局拦截站外链接点击，弹出跳转提醒（/redirect 中转页 + 全站事件委托守卫），支持继续访问/返回，尊重 Ctrl/Cmd 新标签页习惯
- **相关链接页** - 品牌图标识别、搜索与分类导航，视觉规范统一
- **友链申请** - 友链页面新增申请占位卡，统一卡片样式与交互
- **网站统计** - 接入51la统计分析
- **SEO优化** - 自动生成robots.txt、sitemap.xml 和 RSS 订阅源（/rss.xml）
- **安全防护** - XSS防护、CSP策略、防劫持检测、外链跳转拦截
- **实用工具** - 站内工具（拼音转换器、Markdown编辑器、洛克王国阵容搭配模拟器）+ 外部开源工具收录（CNC G 代码生成、自动弹原琴、B站弹幕爬取），支持仓库直达入口

## 🚀 本地体验

### 准备工作
- 需要安装 [Node.js](https://nodejs.org/zh-cn/) **24.0 及以上版本**（package.json engines 强制要求）
- npm 10.0 及以上版本
- 安装完成后，打开命令行工具

### 开始步骤

1. **获取代码**
   ```bash
   git clone https://github.com/XinChengP/OxygenBlogPlatform.git
   cd OxygenBlogPlatform
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动博客**
   ```bash
   npm run dev
   ```

4. **访问博客**
   打开浏览器，输入 `http://localhost:7120` 即可看到博客（开发端口固定为7120）

## 📝 内容管理

### 添加新文章
1. 在 `src/content/blogs` 文件夹中创建新的Markdown文件（.md结尾）
2. 在文件开头添加文章信息，示例：
   ```yaml
   ---
   title: "文章标题"
   date: "2025-12-31"
   updatedAt: "2025-12-31"  # 可选：文章更新时间
   category: "生活感悟"
   tags: ["日常", "洛天依"]
   excerpt: "这里是文章的简短摘要"
   coverImage: "/Blogabout/文章名/cover.png"  # 可选：封面图片路径
   hidden: false  # 可选：设置为true隐藏文章
   ---
   ```
3. 接下来用Markdown格式写正文内容

### 发布动态
1. 在 `src/content/moments` 文件夹中创建新的Markdown文件（.md结尾）
2. 在文件开头添加动态信息，示例：
   ```yaml
   ---
   id: "1"
   time: "2026-09-22 10:30:00"
   pinned: false  # 可选，设置为true可置顶动态
   hidden: false  # 可选，设置为true隐藏动态
   tags: ["测试", "动态"]
   images: ["/Momentsabout/图片1.jpg", "/LTY_Picture/图片2.png"]  # 可选，支持多张图片
   ---
   ```
3. 接下来写动态内容

### 图片功能
- **九宫格布局**: 图片会以传统九宫格的形式排列，正方形缩小显示
- **图片预览**: 点击图片可以放大显示，支持左右翻页
- **高级放大功能**: 支持精细的缩放控制（+/-/0键）、鼠标拖拽查看、缩放百分比显示
- **加载状态**: 图片加载过程中显示加载动画，提升用户体验
- **错误处理**: 图片加载失败时显示错误信息并提供重试按钮
- **图片格式**: 建议使用WebP格式，每张图片大小不超过5MB
- **图片来源**: 支持两种图片添加方式：
  1. **本地上传**: 直接从本地设备上传图片，自动压缩和存储
  2. **画廊选择**: 从博客的画廊(gallery)中选择已有的图片，支持按分类筛选

### 更新日志管理
- **日志位置**: `src/content/changelogs/` 目录
- **内容格式**: Markdown格式，frontmatter 中 type 字段区分类型
- **自动展示**: 在更新日志页面按时间线展示
- **后台管理**: 开发环境可通过 `/admin/changelogs` 可视化管理

## 🌐 部署到线上

### GitHub Actions 自动部署（推荐）
本项目已配置自动部署流程（`.github/workflows/deploy.yml`）：

1. **Fork 本仓库** 到你的GitHub账号
2. **启用 GitHub Pages**：仓库Settings → Pages → Source 选择 GitHub Actions
3. **推送代码**：推送到 main 分支即自动触发构建部署（也可在Actions页面手动触发）
4. **等待部署**：GitHub Actions 自动完成以下步骤：
   - 安装依赖（Node.js 24环境）
   - 执行 `npm run build:pages` 静态导出（构建期自动生成 sitemap.xml）
   - 部署到 GitHub Pages

### 环境变量配置
部署时的环境变量已内置在 deploy.yml 中，本地部署需自行配置：

```bash
# 生产环境 (.env.production) - 自定义域名模式（当前使用）
STATIC_EXPORT=true                  # 启用静态导出
NEXT_PUBLIC_SITE_URL=https://blog.xinchengp.cn
CUSTOM_DOMAIN=true                  # 使用自定义域名，无路径前缀

# 生产环境 - GitHub Pages 默认域名模式
STATIC_EXPORT=true
NEXT_PUBLIC_SITE_URL=https://你的用户名.github.io
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=/你的仓库名   # GitHub Pages路径前缀
CUSTOM_DOMAIN=false
```

### 使用自定义域名
1. 在GitHub仓库Settings → Pages中绑定你的域名
2. 设置环境变量 `CUSTOM_DOMAIN=true` 和 `NEXT_PUBLIC_SITE_URL=你的域名`
3. 推送代码后等待部署完成

## 🖥️ 桌面应用（可选）

本项目支持使用 Electron 34 打包为桌面应用：

```bash
# 运行桌面应用
npm run electron
```

## ⚠️ 注意事项

1. **Node.js版本**：必须使用Node.js 24或以上版本（engines字段强制要求）
2. **依赖安装**：如果安装依赖失败，尝试使用 `npm install --legacy-peer-deps`
3. **图片大小**：建议图片大小不超过500KB，确保加载速度
4. **文章命名**：文章文件名建议使用英文或拼音，避免特殊字符
5. **本地测试**：每次修改后，建议先在本地测试再推送到线上
6. **构建命令**：静态导出必须使用 `npm run build:pages`，它会自动处理Server Actions的临时替换与恢复
7. **开发端口**：开发服务器固定使用7120端口，桌面应用默认连接该端口
8. **浏览器兼容**：建议使用现代浏览器（Chrome、Firefox、Safari、Edge）以获得最佳体验
9. **隐藏内容**：隐藏的文章和动态仅在后台可见，构建后不会显示在前台
10. **敏感变量**：不要在 .env.local 中设置 NEXT_PRIVATE_STATIC_EXPORT，否则开发服务器会进入静态导出模式，导致后台所有操作返回空数据

## 🌟 特色亮点

- **静态生成** - 加载速度快，SEO友好
- **免费托管** - GitHub Pages自动部署，无需服务器
- **易于定制** - 主题和功能可根据需求调整
- **持续更新** - 定期优化和添加新功能
- **类型安全** - 使用TypeScript确保代码质量
- **响应式设计** - 适配各种设备屏幕
- **桌面支持** - 可打包为桌面应用

## 📄 许可证

MIT License - 可自由使用和修改

---

<div align="center">

**🌸 一个温馨的小天地，记录生活与成长的美好时光**

[⬆️ 返回顶部](#-个人博客---洛天依主题)

</div>
