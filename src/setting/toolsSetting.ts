// 工具项接口
export interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: string; // 使用图标或emoji
  isActive: boolean; // 是否已经开发完成
  path?: string; // 如果已开发完成，提供路径；外部工具存放完整网址
  external?: boolean; // 是否为外部链接（如 GitHub 仓库），为 true 时新标签页打开
  repoUrl?: string; // 站内工具对应的源码仓库地址（外部工具直接用 path，无需配置）
  featured?: boolean; // 是否为特色工具
}

// 可用工具配置
export const availableTools: ToolItem[] = [
  {
    id: 'markdown-editor',
    name: 'Markdown 编辑器',
    description: '功能强大的在线 Markdown 编辑器，支持实时预览、语法高亮和博客格式适配',
    icon: '📝',
    isActive: true,
    path: '/tools/markdown-editor',
    repoUrl: 'https://github.com/XinChengP/Markdown-Editor',
    featured: true
  },
  {
    id: 'pinyin-converter',
    name: '拼音转换器',
    description: '智能汉字转拼音工具，支持多音字识别、多种声调格式和灵活的输出选项',
    icon: '🔤',
    isActive: true,
    path: '/tools/pinyin-converter',
    repoUrl: 'https://github.com/XinChengP/Pinyin-converter',
    featured: true
  },
  {
    id: 'image-compressor',
    name: '图片压缩器',
    description: '在线图片压缩工具，支持多种格式，保持质量的同时减小文件大小',
    icon: '🖼️',
    isActive: false
  },
  {
    id: 'color-picker',
    name: '颜色选择器',
    description: '强大的颜色工具，支持调色板、颜色转换和对比度检测',
    icon: '🎨',
    isActive: false
  },
  {
    id: 'code-formatter',
    name: '代码格式化',
    description: '支持多种编程语言的代码格式化工具，让代码更整洁美观',
    icon: '⚡',
    isActive: false
  },
  {
    id: 'json-validator',
    name: 'JSON 验证器',
    description: '在线 JSON 格式验证和美化工具，支持语法检查和错误提示',
    icon: '🔧',
    isActive: false
  },
  {
    id: 'url-shortener',
    name: '短链接生成',
    description: '生成简洁美观的短链接，方便分享和管理',
    icon: '🔗',
    isActive: false
  },
  {
    id: 'roco-team',
    name: '阵容搭配模拟器',
    description: '洛克王国天梯赛宠物一览和阵容搭配模拟器，支持禁赛设置、外观切换、血脉选择',
    icon: '🎮',
    isActive: true,
    path: '/tools/roco-team',
    featured: true
  },
  {
    // CNC G 代码生成工具（外部开源项目，托管于 GitHub）
    id: 'cnc-gcode-generator',
    name: 'CNC G 代码生成工具',
    description: '将图纸自动转化为G代码，支持批量转换与刀路预览界面',
    icon: '⚙️',
    isActive: true,
    path: 'https://github.com/XinChengP/G-code-generation-tool',
    external: true
  },
  {
    // 原神原琴 MIDI 转按键工具（外部开源项目，托管于 GitHub）
    id: 'midigenshin',
    name: '自 动 弹 原 琴',
    description: '将 MIDI 乐曲自动转换为《原神》PC 端原琴可弹的按键时序',
    icon: '🎹',
    isActive: true,
    path: 'https://github.com/XinChengP/MidiGenshin',
    external: true
  }
];

// 获取全部已激活的工具
export const getActiveTools = (): ToolItem[] => {
  return availableTools.filter(tool => tool.isActive);
};

// 获取特色工具（仅返回已激活的特色工具）
export const getFeaturedTools = (): ToolItem[] => {
  return availableTools.filter(tool => tool.featured && tool.isActive);
};