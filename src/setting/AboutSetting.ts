// 导入路径工具函数，必须放在文件最顶部
import { getAssetPath } from '../utils/assetUtils';

//主标题部分配置
export const title = "关于"; //主标题
export const BeforeAnimationText = "Keep "; //在动画字前面的字
export const AnimationText = "Going"; //动画字
export const isRainbowGradient = true; //控制 BeforeAnimationText 的颜色效果，观察是否开启彩虹渐变

//个人信息部分配置
const AVATAR_FILENAME = "星球卑.jpg"; //头像配置，头像需要放进public文件夹内，这里只写文件名和后缀

// 处理头像路径的函数
export const getAvatarPath = (): string => {
  // 使用工具函数处理路径，确保在GitHub Pages环境下正确加载
  return getAssetPath(AVATAR_FILENAME);
};
export const isBorder = true; //控制头像边框是否显示
export const name = "歆橙"; //名字
export const slogan =
  "Like a fish that out of water."; //个人宣言

// 随机宣言配置
// 点击关于我页面名字/宣言区域时，会从这个列表中随机切换显示
export const slogans: string[] = [
  "Like a fish that out of water.",
  "机械的心率带动血肉的共鸣",
  "至少在这一刻，热爱不问为何",
  "我知道，再笨拙的翅膀也能抓住风",
  "你是珍珠要亲手捧出你自己",
  "就在这场停不下的雨中，唱吧"
];

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
// 关于我页面右侧各区块配置
// 将页面中的大段文字抽离到配置中，方便后续维护和内容修改
export interface AboutSectionConfig {
  id: string; // 区块唯一标识
  title: string; // 区块标题
  coverImage: string; // 手风琴面板封面图片路径
  coverHorizontalPosition?: string; // 封面水平位置，默认居中，例如 '40%'
  coverVerticalPosition?: string; // 封面垂直位置，默认居中，例如 '30%'
  coverSize?: string; // 封面图片缩放比例，默认 '120%'
  paragraphs: string[]; // 段落内容数组
  quote?: { // 可选：引用/比喻区块
    intro: string; // 引用前导语
    text: string; // 引用内容
  };
  footer?: string; // 可选：区块底部强调文字
}

export const aboutSections: AboutSectionConfig[] = [
  {
    id: 'about-me',
    title: '关于我',
    coverImage: '/aboutme/1.jpg',
    coverHorizontalPosition: '51%',
    coverVerticalPosition: '50%',
    coverSize: '100%',
    paragraphs: [
      '天津工业大学机械工程专业就读，预计2029年毕业。',
      '一个机械工程专业的25级大学牲。总想搞一些东西，总是在焦虑之中，总爱碎碎念。。。'
    ],
    quote: {
      intro: '来个超绝比喻介绍一下自己：',
      text: '就像冬日清晨的桥梁，\n热爱就在桥的另一侧，\n明明有路，却总被雾笼罩着。\n至于无感的事物，\n就好似桥梁站在桥边，\n举目望去，\n唯有一片空白。'
    }
  },
  {
    id: 'about-site',
    title: '关于本站',
    coverImage: '/aboutme/3.jpeg',
    coverVerticalPosition: '60%',
    coverHorizontalPosition: '75%',
    coverSize: '100%',
    paragraphs: [
      '这就要追溯到longlong years ago了（',
      '初三（还是初二？）那会在QQ空间看到有好友（不熟的那种）搞了个网站，觉得挺厉害，然后就没有然后了（bushi）。高一，超绝班级职务是四大部门，然后稀里糊涂整了个宣传部网络分部（宣网部）部长，我就寻思给班级搞个网站，然后了解了一点，发现一窍不通，而且财力不济，然后就咕咕咕了。',
      '之后就是本博客的故事了，首先登场的是额滴高中哥们，来自TUT（怎么这么像颜文字qwq）的Allenwdk，在高考完的暑假里用他学长搞的模版（没错我也用了这个模版）搞了个博客，我了解到消息后鸽了三个月菜严肃学习，然后本博客诞生了。后来瞎搞了一段时间后，想搞一搞动态博客，买了个五年的域名（xinchengp.cn），又斥巨资租了一年的服务器（俺颇有家资），到手里发现一点不会搞，磕磕绊绊在b站上搜教程，看文档，头都要大了，最后折腾了一番放弃了（看看事故现场www.xinchengp.cn，26年12月就到期了），还是老老实实的整现在的小博客吧。就顺手把买的那个域名替换掉了原来github自带的。（blog.xinchengp.cn）'
    ],
    footer: '关于本站的故事未完待续。。。'
  },
  {
    id: 'about-domain',
    title: '关于域名',
    coverImage: '/aboutme/2.png',
    coverHorizontalPosition: '55%',
    coverVerticalPosition: '50%',
    coverSize: '140%',

    paragraphs: [
      'Longlonglong years ago，我的QQ昵称就叫心想事成，一直没换过（别问为啥没换过，单纯就是取名废）。',
      '后来其他平台上用过各式各样的id，比如菜鷄（Cay_Jir），诶嘿（Eiheir），用久了总感觉这不是我自己（雾）',
      '高三那年三四月的时候，大半夜的感觉无聊，那就入坑一下崩铁吧，于是直接用鸽子的米游社账号（额滴原神账号也是这个）注册一个，然后就是喜闻乐见的起名环节了，思来想去不知道起什么好，就决定从我的QQ昵称入手，先取了首尾俩字“心成”，但是看上去怪怪的，又联想到心想事“橙”这个经典语录，那就“心橙”，又寻思再把“心”谐音换掉，由于高中沉迷原神，那段时间天天刷余响套（来歆余响），嗯，这个“歆”挺好，于是乎就这样我的第4代（或者1代ProplusMax）互联网id歆橙（Xincheng）诞生了，至于域名多了个p，一是因为这个域名被注册了，二是因为我想做一个P主（调歌！），所以在后面加了一个p。',
      '至于选择.cn，一个是因为权威（确信），一个是因为相对比较便宜（超绝.com贵上天了，只恨财力不济）。'
    ]
  }
];

// MBTI 配置
// 展示个人 MBTI 类型和卡片主题色
export interface MBTIConfig {
  type: string; // MBTI 四字母类型，例如 'INTP'
  color: string; // 卡片主题色，用于高亮和装饰
}

export const mbti: MBTIConfig = {
  type: 'INTP',
  color: '#66ccff',
};

// 个人歌单配置
// 用于在关于页面展示外部音乐平台歌单入口
export interface MusicPlaylistConfig {
  name: string; // 歌单名称
  description: string; // 歌单简介
  coverImage: string; // 封面图片路径，相对于 public 目录
  url: string; // 外部歌单链接
  buttonText: string; // 跳转按钮文案
}

export const musicPlaylist: MusicPlaylistConfig = {
  name: '华风夏韵，洛水天依',
  description: '任天地之间，吟游四方\n《歌行四方》夯爆了，入坑曲好吧\n （歌单也可以在左下播放器里播放）',
  coverImage: '/aboutme/musiclistcover/gexingsifang.jpg',
  url: 'https://music.163.com/playlist?id=14349636887&uct2=U2FsdGVkX19EskAPIF87AMNeAZEiTZ6kJr8vlF0T/og=',
  buttonText: '去听听',
};

// 兴趣爱好配置
// 每个兴趣关联一个Lucide图标标识，在页面中映射为具体图标组件
export interface HobbyConfig {
  name: string; // 兴趣名称
  icon: string; // Lucide图标标识
}

export const hobbies: HobbyConfig[] = [
  { name: '洛天依', icon: 'Music' },
  { name: '乒乓球', icon: 'Dribbble' },
  { name: '围棋', icon: 'CircleDot' },
  { name: '做视频', icon: 'Video' },
  { name: '打游戏', icon: 'Gamepad2' },
  { name: '瞎捣鼓', icon: 'Box' }
];

// 游戏库配置
// 用于在关于页面以手风琴形式展示个人游戏库
export interface GameConfig {
  id: string; // 唯一标识
  name: string; // 游戏名称
  coverImage: string; // 封面图片路径，相对于 public 目录
  description: string; // 一句话简介或评价
  coverHorizontalPosition?: string; // 封面水平位置，默认居中，例如 '40%'
  coverVerticalPosition?: string; // 封面垂直位置，默认居中，例如 '30%'
  coverSize?: string; // 封面图片缩放比例，默认 '120%'
}

// 常玩游戏
export const frequentGames: GameConfig[] = [
  {
    id: 'rocokingdom',
    name: '洛克王国',
    coverHorizontalPosition: '45%',
    coverVerticalPosition: '50%',
    coverSize: '120%',
    coverImage: '/aboutme/games/Rocokingdom.jpg',
    description: '十五年牢玩家在此，天天天梯坐牢啊',
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    coverHorizontalPosition: '25%',
    coverVerticalPosition: '50%',
    coverSize: '120%',
    coverImage: '/aboutme/games/Minecraft.jpg',
    description: '味大无需多盐',
  },
  {
    id: 'genshin',
    name: '原神',
    coverHorizontalPosition: '52%',
    coverVerticalPosition: '50%',
    coverSize: '120%',
    coverImage: '/aboutme/games/Genshinimpact.jpg',
    description: '原神，启动！',
  },
];

// 偶尔玩/通关
export const occasionalGames: GameConfig[] = [

  {
    id: 'dancingline',
    name: '跳舞的线',
    coverHorizontalPosition: '55%',
    coverVerticalPosition: '50%',
    coverSize: '120%',
    coverImage: '/aboutme/games/Dancingline.jpg',
    description: '第一个也是唯一一个接触的（亚）音游',
  },
  {
    id: 'ittakestwo',
    name: '双人成行',
    coverHorizontalPosition: '70%',
    coverVerticalPosition: '50%',
    coverSize: '120%',
    coverImage: '/aboutme/games/ittakestwo.jpg',
    description: '神作',
  },
  {
    id: 'untitledgoose',
    name: '大鹅模拟器',
    coverHorizontalPosition: '60%',
    coverVerticalPosition: '50%',
    coverSize: '100%',
    coverImage: '/aboutme/games/UntitledGoose.jpg',
    description: '这集神了',
  },
  {
    id: 'biped',
    name: '知只大冒险',
    coverHorizontalPosition: '76%',
    coverVerticalPosition: '50%',
    coverSize: '100%',
    coverImage: '/aboutme/games/Biped.jpg',
    description: '确实有意思嗷',
  },
  {
    id: 'whmx',
    name: '物华弥新',
    coverHorizontalPosition: '40%',
    coverVerticalPosition: '50%',
    coverSize: '120%',
    coverImage: '/aboutme/games/whmx.jpg',
    description: '“心动的故事，这里应有尽有”',
  },
  {
    id: 'deliverme',
    name: '妄想症',
    coverHorizontalPosition: '64%',
    coverVerticalPosition: '50%',
    coverSize: '100%',
    coverImage: '/aboutme/games/deliverme.jpg',
    description: '“比十年更早之前，我便歌颂着明天”',
  },
];

// 我的设备配置
// 用于在关于页面展示个人使用的设备
export interface DeviceConfig {
  id: string; // 唯一标识
  name: string; // 设备名称
  backContent?: string[]; // 可选：背面显示的内容，每行一个配置项
}

// 我追的番配置
export interface AnimeConfig {
  id: string;
  name: string;
  coverImage: string;
  description: string;
  status: string;
  coverHorizontalPosition?: string; // 封面水平位置，默认 'center'
  coverVerticalPosition?: string; // 封面垂直位置，默认 'center'
  coverSize?: string; // 封面缩放比例，默认 '100%'
}

export const animeList: AnimeConfig[] = [
    {
    id: 'anime',
    name: '我的三体罗辑传',
    coverImage: '/aboutme/anime/wosan-logic.jpg',
    description: '“面壁者罗辑，我是你的破壁人”',
    status: '已追完',
    coverHorizontalPosition: '50%',
    coverVerticalPosition: '30%',
    coverSize: '100%',
  },
  {
    id: 'anime2',
    name: '我的三体章北海传',
    coverImage: '/aboutme/anime/zbhz.jpg',
    description: '致以第五位面壁者章北海最高敬意',
    status: '已追完',
    coverHorizontalPosition: '50%',
    coverVerticalPosition: '30%',
    coverSize: '100%',
  },
  {
    id: 'anime3',
    name: '某科学の超电磁炮',
    coverImage: '/aboutme/anime/railgun.jpg',
    description: '入站必看（确信',
    status: '已追完',
    coverHorizontalPosition: '50%',
    coverVerticalPosition: '15%',
    coverSize: '100%',
  },
  {
    id: 'anime4',
    name: '某科学の超电磁炮S',
    coverImage: '/aboutme/anime/railgunS.jpg',
    description: '放电妹（bushi）',
    status: '已追完',
    coverHorizontalPosition: '50%',
    coverVerticalPosition: '29%',
    coverSize: '100%',
  },
  {
    id: 'anime5',
    name: '某科学の超电磁炮T',
    coverImage: '/aboutme/anime/railgunT.jpg',
    description: '原来炮姐咋这么强的吗，感觉前两季没表现出来',
    status: '已追完',
    coverHorizontalPosition: '50%',
    coverVerticalPosition: '10%',
    coverSize: '100%',
  },
  {
    id: 'anime6',
    name: '命运拳台',
    coverImage: '/aboutme/anime/Myqt.webp',
    description: '差点忘了看过这个（话说第二季啥时候出）\n画风和配音都很有特点，以及模糊的三次元回忆杀（初见给我惊艳到了）；梗是真的多，刀也是真的刀。爱看',
    status: '已追完',
    coverHorizontalPosition: '50%',
    coverVerticalPosition: '22.5%',
    coverSize: '100%',
  },

];

export const devices: DeviceConfig[] = [
  {
    id: 'desktop',
    name: '台式机',
    backContent: [
      'CPU：i5-9400f',
      'GPU：GTX 1660s',
      '内存：8G * 2',
    ],
  },
  { id: 'laptop',
    name: '游戏本',
    backContent: [
      '华硕天选6Pro魔幻青',
      'CPU：i7-14650HX',
      'GPU：GTX 5060',
      '内存：16G * 2',
    ],
  },
  { id: 'phone', 
    name: '手机',
    backContent: [
      '现用：荣耀X50',
      '吃灰：荣耀500Pro',
    ],
  },
  { id: 'tablet', 
    name: 'iPad',
    backContent: [
      'iPad（第 8 代）',
    ],
  },
  { id: 'keyboard',
    name: '键盘',
    backContent: [
      '双飞燕FGK3',
    ],
  },
  { id: 'mouse', 
    name: '鼠标',
    backContent: [
      '前行者X23SE',
    ],
  },
  { id: 'watch',
    name: '手表',
    backContent: [
      '华为Watch4',
    ],
  },
  { id: 'headphones',
    name: '耳机',
    backContent: [
      '头戴式：iKF-T3',
      '蓝牙：荣耀亲选耳夹式耳机2pro',
    ],
  },
];

//关于我页面一二三段（保留以兼容旧用法，建议后续使用 aboutSections 配置）
export const aboutMeP1 = "天津工业大学机械工程专业就读，预计2029年毕业 ";
export const aboutMeP2 = "热爱技术，热爱生活，希望自己能创造更多价值 ";
export const aboutMeP3 = "（成分复杂）";

//联系我页面配置
export const mainContactMeDescription =
  "如果你对我的文章感兴趣，欢迎与我联系！"; //联系我页面主描述
export const subContactMeDescription = "我会尽快回复你的消息"; //联系我页面补充描述
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
export type RelatedLinkCategory = 'framework' | 'tool' | 'ui' | 'tutorial' | 'project' | 'fish';

// 分类显示名称映射
export const categoryLabels: Record<RelatedLinkCategory, string> = {
  framework: '技术框架',
  tool: '开发工具',
  ui: 'UI组件',
  tutorial: '教程资源',
  project: '项目源码',
  fish: '摸鱼教程'
};

// 分类颜色映射
export const categoryColors: Record<RelatedLinkCategory, string> = {
  framework: '#3b82f6', // 蓝色
  tool: '#10b981',      // 绿色
  ui: '#8b5cf6',        // 紫色
  tutorial: '#f59e0b',  // 橙色
  project: '#ec4899',   // 粉色
  fish: '#06b6d4'       // 青色（水/鱼主题）
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
  },
  {
    name: "页脚小鱼特效",
    url: "https://www.cnblogs.com/zhangshuhao1116/p/14913926.html",
    description: "为博客页脚添加可爱的小鱼游动特效，增加页面互动性",
    category: 'tutorial',
    icon: "fish",
    tags: ['特效', '动画', '页脚']
  }
];
