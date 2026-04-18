//主标题部分配置
export const title = "关于"; //主标题
export const BeforeAnimationText = "Keep "; //在动画字前面的字
export const AnimationText = "Going"; //动画字
export const isRainbowGradient = true; //控制 BeforeAnimationText 的颜色效果，观察是否开启彩虹渐变

//个人信息部分配置
const AVATAR_FILENAME = "星球卑.jpg"; //头像配置，头像需要放进public文件夹内，这里只写文件名和后缀
// 导入路径工具函数
import { getAssetPath } from '../utils/assetUtils';

// 处理头像路径的函数
export const getAvatarPath = (): string => {
  // 使用工具函数处理路径，确保在GitHub Pages环境下正确加载
  return getAssetPath(AVATAR_FILENAME);
};
export const isBorder = true; //控制头像边框是否显示
export const name = "歆橙"; //名字
export const slogan =
  "开开心心每一天"; //个人宣言

//https://simpleicons.org 图云的图标配置
const slugs = [
  "typescript",
  "javascript",
  "react",
  "Dart",
  "Flutter",
  "html5",
  "css",
  "C",
  "C++",
  "git",
  "github",
  "gitlab",
];
/*
  关于技术栈图云配置说明
1. 可以使用 https://simpleicons.org 提供的图标，图标名称需要与 slugs 中的名称一致
2. 如果想上传自定义图片，将image配置成自定义图片的url数组
*/

//simpleicons版本，如果你使用网站提供的图标，这里不用动
export const images = slugs.map(
  (slug) => `https://cdn.simpleicons.org/${slug}/${slug}`
);

//自定义图片版本，如果你使用自定义图片的话，将上面的代码注释掉，下面的代码解除注释，写法如下
/*
export const images = [
  "/avatar.jpg",
  "/icon-VOCALOID.jpg",
  "/icon-minecraft.jpg",
  "/icon-roco.jpg",
];
*/
//关于我页面一二三段
export const aboutMeP1 = "天津工业大学机械工程专业就读，预计2029年毕业 ";
export const aboutMeP2 = "热爱技术，热爱生活，希望自己能创造更多价值 ";
export const aboutMeP3 = "（成分复杂）";

//联系我页面配置
export const mainContactMeDescription =
  "如果你对我的文章感兴趣，欢迎与我联系！"; //联系我页面主描述
export const subContactMeDescription = "我会尽快回复你的消息 ✨"; //联系我页面补充描述
export const mail = "2574386537@qq.com"; //邮箱配置
export const github = "https://github.com/XinChengP"; //github网站配置
export const bilibili = "https://space.bilibili.com/522845412?spm_id_from=333.1007.0.0";

// 友链分类类型
export type FriendLinkCategory = 'developer' | 'designer' | 'blog' | 'other';

// 友链分类标签映射
export const friendCategoryLabels: Record<FriendLinkCategory, string> = {
  developer: '开发者',
  designer: '设计师',
  blog: '博客',
  other: '其他'
};

// 友链分类颜色映射
export const friendCategoryColors: Record<FriendLinkCategory, string> = {
  developer: '#3b82f6', // 蓝色
  designer: '#ec4899',  // 粉色
  blog: '#10b981',      // 绿色
  other: '#8b5cf6'      // 紫色
};

// 友链数据接口
export interface FriendLink {
  name: string;
  url: string;
  description: string;
  avatar?: string;
  category?: FriendLinkCategory;
  tags?: string[];
}

//友情链接配置
export const friendsLinks: FriendLink[] = [
  {
    name: "Allenwdk's Blog",
    url: "https://allenwdk.github.io/OxygenBlog/",
    description: "A Novice Developer",
    avatar: "/friendlink/Allenwdk.jpg",
    category: 'developer',
    tags: ['Next.js', '博客']
  }
];

// 相关链接分类定义
export type RelatedLinkCategory = 'framework' | 'tool' | 'ui' | 'tutorial' | 'project';

// 分类显示名称映射
export const categoryLabels: Record<RelatedLinkCategory, string> = {
  framework: '技术框架',
  tool: '开发工具',
  ui: 'UI组件',
  tutorial: '教程资源',
  project: '项目源码'
};

// 分类颜色映射
export const categoryColors: Record<RelatedLinkCategory, string> = {
  framework: '#3b82f6', // 蓝色
  tool: '#10b981',      // 绿色
  ui: '#8b5cf6',        // 紫色
  tutorial: '#f59e0b',  // 橙色
  project: '#ec4899'    // 粉色
};

// 相关链接配置
export interface RelatedLink {
  name: string;
  url: string;
  description: string;
  category: RelatedLinkCategory;
  icon?: string;
  tags?: string[];
}

export const relatedLinks: RelatedLink[] = [
  {
    name: "博客模版",
    url: "https://github.com/seasalt-haiyan/OxygenBlogPlatform",
    description: "本博客使用的模版，基于Next.js构建的洛天依主题博客",
    category: 'project',
    icon: "template",
    tags: ['Next.js', 'React', '博客']
  },
  {
    name: "Next.js",
    url: "https://nextjs.org/",
    description: "React框架，提供服务端渲染、静态生成等功能",
    category: 'framework',
    icon: "nextjs",
    tags: ['React', 'SSR', '前端']
  },
  {
    name: "Live2D",
    url: "https://github.com/unsignedzhang/luotianyi-live2d?tab=readme-ov-file",
    description: "洛天依Live2D看板娘，为博客添加可爱的交互角色",
    category: 'ui',
    icon: "live2d",
    tags: ['动画', '交互', '洛天依']
  },
  {
    name: "APlayer",
    url: "https://github.com/DIYgod/APlayer",
    description: "漂亮的HTML5音乐播放器，支持歌词显示",
    category: 'ui',
    icon: "aplayer",
    tags: ['音乐', '播放器', '音频']
  },
  {
    name: "Giscus",
    url: "https://giscus.app/zh-CN",
    description: "基于GitHub Discussions的评论系统，无服务器部署",
    category: 'tool',
    icon: "giscus",
    tags: ['评论', 'GitHub', '免费']
  },
  {
    name: "Markdown编辑器",
    url: "https://github.com/XinChengP/Markdown-Editor",
    description: "本站使用的Markdown编辑器工具，支持实时预览",
    category: 'project',
    icon: "markdown",
    tags: ['Markdown', '编辑器', '工具']
  },
  {
    name: "拼音转换器",
    url: "https://github.com/XinChengP/Pinyin-converter",
    description: "汉字转拼音工具，支持多音字识别",
    category: 'project',
    icon: "pinyin",
    tags: ['拼音', '工具', '中文']
  },
  {
    name: "3D红灯笼",
    url: "https://blog.ybyq.wang/archives/1681.html",
    description: "为博客添加春节3D灯笼效果的教程",
    category: 'tutorial',
    icon: "globe",
    tags: ['3D', '春节', '特效']
  },
  {
    name: "烟花效果",
    url: "https://www.bilibili.com/video/BV1Qq4y1d76b",
    description: "基于HTML5 Canvas的烟花效果实现教程",
    category: 'tutorial',
    icon: "globe",
    tags: ['Canvas', '动画', '特效']
  },
  {
    name: "Tailwind CSS",
    url: "https://tailwindcss.com/",
    description: "实用优先的CSS框架，快速构建现代界面",
    category: 'framework',
    icon: "tailwind",
    tags: ['CSS', '样式', '框架']
  },
  {
    name: "Framer Motion",
    url: "https://www.framer.com/motion/",
    description: "React动画库，提供流畅的动画效果",
    category: 'tool',
    icon: "framer",
    tags: ['动画', 'React', '交互']
  },
  {
    name: "shadcn/ui",
    url: "https://ui.shadcn.com/",
    description: "高质量的React组件库，支持主题定制",
    category: 'ui',
    icon: "shadcn",
    tags: ['组件库', 'React', 'UI']
  },
  {
    name: "TypeScript",
    url: "https://www.typescriptlang.org/",
    description: "JavaScript的超集，提供静态类型检查",
    category: 'framework',
    icon: "typescript",
    tags: ['类型系统', 'JavaScript', '开发']
  },
  {
    name: "Lucide React",
    url: "https://lucide.dev/",
    description: "精美的开源图标库，本站所有图标来源",
    category: 'ui',
    icon: "lucide",
    tags: ['图标', 'React', '设计']
  },
  {
    name: "tsParticles",
    url: "https://particles.js.org/",
    description: "轻量级粒子动画库，博客背景粒子效果",
    category: 'ui',
    icon: "particles",
    tags: ['粒子', '动画', '背景']
  },
  {
    name: "Recharts",
    url: "https://recharts.org/",
    description: "React图表库，更新日志数据可视化",
    category: 'ui',
    icon: "recharts",
    tags: ['图表', '数据可视化', 'React']
  },
  {
    name: "react-markdown",
    url: "https://github.com/remarkjs/react-markdown",
    description: "React Markdown渲染组件，博客文章展示",
    category: 'tool',
    icon: "markdown",
    tags: ['Markdown', 'React', '渲染']
  },
  {
    name: "gray-matter",
    url: "https://github.com/jonschlinkert/gray-matter",
    description: "Frontmatter解析库，解析文章元数据",
    category: 'tool',
    icon: "yaml",
    tags: ['Frontmatter', 'YAML', '解析']
  },
  {
    name: "date-fns",
    url: "https://date-fns.org/",
    description: "现代JavaScript日期处理库",
    category: 'tool',
    icon: "calendar",
    tags: ['日期', '时间', '工具']
  },
  {
    name: "next-themes",
    url: "https://github.com/pacocoursey/next-themes",
    description: "Next.js主题切换方案，支持深色模式",
    category: 'tool',
    icon: "theme",
    tags: ['主题', '深色模式', 'Next.js']
  },
  {
    name: "KaTeX",
    url: "https://katex.org/",
    description: "快速的数学公式渲染引擎",
    category: 'ui',
    icon: "math",
    tags: ['数学', '公式', 'LaTeX']
  },
  {
    name: "react-syntax-highlighter",
    url: "https://github.com/react-syntax-highlighter/react-syntax-highlighter",
    description: "React代码语法高亮组件",
    category: 'ui',
    icon: "code",
    tags: ['代码高亮', '语法', 'React']
  },
  {
    name: "DOMPurify",
    url: "https://github.com/cure53/DOMPurify",
    description: "XSS攻击防护库，净化HTML内容",
    category: 'tool',
    icon: "shield",
    tags: ['安全', 'XSS', '防护']
  },
  {
    name: "Tailwind Typography",
    url: "https://github.com/tailwindlabs/tailwindcss-typography",
    description: "Tailwind文章排版插件，美化文章样式",
    category: 'tool',
    icon: "typography",
    tags: ['排版', 'Tailwind', '文章']
  },
  {
    name: "yet-another-react-lightbox",
    url: "https://yet-another-react-lightbox.com/",
    description: "React图片灯箱组件，画廊图片预览",
    category: 'ui',
    icon: "image",
    tags: ['图片', '灯箱', '画廊']
  }
];
