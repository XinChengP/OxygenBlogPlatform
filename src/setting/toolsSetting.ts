// 工具分类配置
export const toolCategories = [
  "all", 
  "文本工具", 
  "图像工具", 
  "颜色工具", 
  "编码工具",
  "其他"
];

// 工具项接口
export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string; // 使用图标或emoji
  isActive: boolean; // 是否已经开发完成
  path?: string; // 如果已开发完成，提供路径
  featured?: boolean; // 是否为特色工具
}

// 可用工具配置
export const availableTools: ToolItem[] = [
  {
    id: 'markdown-editor',
    name: 'Markdown 编辑器',
    description: '功能强大的在线 Markdown 编辑器，支持实时预览、语法高亮和博客格式适配',
    category: '文本工具',
    icon: '📝',
    isActive: true,
    path: '/tools/markdown-editor',
    featured: true
  },
  {
    id: 'pinyin-converter',
    name: '拼音转换器',
    description: '智能汉字转拼音工具，支持多音字识别、多种声调格式和灵活的输出选项',
    category: '文本工具',
    icon: '🔤',
    isActive: true,
    path: '/tools/pinyin-converter',
    featured: true
  },
  {
    id: 'image-compressor',
    name: '图片压缩器',
    description: '在线图片压缩工具，支持多种格式，保持质量的同时减小文件大小',
    category: '图像工具',
    icon: '🖼️',
    isActive: false
  },
  {
    id: 'color-picker',
    name: '颜色选择器',
    description: '强大的颜色工具，支持调色板、颜色转换和对比度检测',
    category: '颜色工具',
    icon: '🎨',
    isActive: false
  },
  {
    id: 'code-formatter',
    name: '代码格式化',
    description: '支持多种编程语言的代码格式化工具，让代码更整洁美观',
    category: '编码工具',
    icon: '⚡',
    isActive: false
  },
  {
    id: 'json-validator',
    name: 'JSON 验证器',
    description: '在线 JSON 格式验证和美化工具，支持语法检查和错误提示',
    category: '编码工具',
    icon: '🔧',
    isActive: false
  },
  {
    id: 'url-shortener',
    name: '短链接生成',
    description: '生成简洁美观的短链接，方便分享和管理',
    category: '其他',
    icon: '🔗',
    isActive: false
  }
];

// 根据分类筛选工具（仅返回已激活的工具）
export const getToolsByCategory = (category: string): ToolItem[] => {
  const activeTools = availableTools.filter(tool => tool.isActive);
  if (category === 'all') {
    return activeTools;
  }
  return activeTools.filter(tool => tool.category === category);
};

// 获取特色工具（仅返回已激活的特色工具）
export const getFeaturedTools = (): ToolItem[] => {
  return availableTools.filter(tool => tool.featured && tool.isActive);
};