import { advancedWordCount } from './wordCountUtils';

interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images?: string[];
  pinned?: boolean;
  hidden?: boolean;  // 是否隐藏该动态，用于前台过滤
  filePath: string;
}

/**
 * 从markdown文件中解析YAML front matter
 * @param content markdown文件内容
 * @returns 解析后的元数据和内容
 */
export function parseFrontMatter(content: string): { metadata: any; content: string } {
  // 处理不同的换行符
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  // 使用更灵活的正则表达式匹配YAML前置元数据
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = normalizedContent.match(frontMatterRegex);
  
  if (!match) {
    return { metadata: {}, content };
  }
  
  const [, frontMatter, body] = match;
  const metadata: any = {};
  
  // 解析YAML格式，支持多行数组
  const lines = frontMatter.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];
  
  lines.forEach(line => {
    // 跳过空行和注释
    if (!line.trim() || line.trim().startsWith('#')) {
      return;
    }
    
    // 检查是否是缩进的数组元素
    if (currentKey && (line.trim().startsWith('- ') || line.trim().startsWith('-\t'))) {
      // 处理数组元素
      let value = line.trim().substring(1).trim();
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1);
      }
      currentArray.push(value);
      return;
    }
    
    // 处理之前的数组
    if (currentKey && currentArray.length > 0) {
      metadata[currentKey] = currentArray;
      currentKey = null;
      currentArray = [];
    }
    
    // 处理新的键值对
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return;
    }
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    if (key) {
      // 检查是否是数组开始
      if (value === '') {
        // 多行数组开始
        currentKey = key;
        currentArray = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // 单行数组
        try {
          // 尝试直接解析JSON
          metadata[key] = JSON.parse(value);
        } catch {
          try {
            // 尝试解析YAML格式的数组
            // 移除首尾的方括号，分割元素
            const arrayContent = value.substring(1, value.length - 1).trim();
            if (arrayContent) {
              // 分割元素，处理可能的引号和空格
              const elements = arrayContent.split(',').map(item => {
                const trimmed = item.trim();
                // 移除引号
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
                  return trimmed.slice(1, -1);
                }
                return trimmed;
              });
              metadata[key] = elements;
            } else {
              metadata[key] = [];
            }
          } catch {
            metadata[key] = value;
          }
        }
      } else if (value === 'true') {
        metadata[key] = true;
      } else if (value === 'false') {
        metadata[key] = false;
      } else if (!isNaN(Number(value))) {
        metadata[key] = Number(value);
      } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        metadata[key] = value.slice(1, -1);
      } else {
        metadata[key] = value;
      }
    }
  });
  
  // 处理最后一个数组
  if (currentKey && currentArray.length > 0) {
    metadata[currentKey] = currentArray;
  }
  
  return { metadata, content: body.trim() };
}

/**
 * 服务器端：读取所有动态文件
 * @returns 动态数组，按时间倒序排序
 */
export function getServerMoments(): Moment[] {
  let moments: Moment[] = [];
  
  try {
    // 动态导入fs和path模块
    const fs = require('fs');
    const path = require('path');
    
    const momentsDir = path.join(process.cwd(), 'src', 'content', 'moments');
    
    // 检查目录是否存在
    if (!fs.existsSync(momentsDir) || !fs.statSync(momentsDir).isDirectory()) {
      return [];
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(momentsDir);
    
    // 过滤出markdown文件
    const mdFiles = files.filter((file: string) => file.endsWith('.md'));
    
    // 读取和解析每个文件
    moments = mdFiles.map((file: string) => {
      const filePath = path.join(momentsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { metadata, content: body } = parseFrontMatter(content);
      
      return {
                    id: metadata.id || file.replace('.md', ''),
                    time: metadata.time || '',
                    content: body,
                    tags: metadata.tags || [],
                    images: metadata.images || [],
                    pinned: metadata.pinned === 'true' || metadata.pinned === true,
                    // 解析 hidden 属性：支持字符串 'true' 或布尔值 true
                    hidden: metadata.hidden === 'true' || metadata.hidden === true,
                    filePath: file
                  };
    });
    
    // 过滤隐藏的动态：只返回 hidden 为 false 或未设置的动态
    // 这样可以确保 GitHub Pages 静态部署时不会显示隐藏的内容
    moments = moments.filter(moment => !moment.hidden);
    
    // 按置顶状态和时间倒序排序
    moments.sort((a, b) => {
      // 置顶的动态优先显示
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // 都置顶或都不置顶时，按时间倒序排序
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  } catch (error) {
    console.error('读取动态文件失败:', error);
  }
  
  return moments;
}

/**
 * 客户端：获取空的动态数组（客户端不读取文件系统）
 * @returns 空数组
 */
export function getClientMoments(): Moment[] {
  return [];
}

/**
 * 根据环境返回相应的动态获取函数
 */
export function getMoments(): Moment[] {
  // 检查是否在浏览器环境
  if (typeof window !== 'undefined') {
    return getClientMoments();
  }
  return getServerMoments();
}

/**
 * 根据ID获取单个动态
 * @param id 动态ID
 * @returns 动态对象或undefined
 */
export function getMomentById(id: string): Moment | undefined {
  const moments = getMoments();
  return moments.find(moment => moment.id === id);
}

/**
 * 检查动态目录是否存在
 * @returns 是否存在
 */
export function momentsDirExists(): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }
  
  try {
    const fs = require('fs');
    const path = require('path');
    const momentsDir = path.join(process.cwd(), 'src', 'content', 'moments');
    return fs.existsSync(momentsDir) && fs.statSync(momentsDir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 博客文章接口
 */
export interface BlogPost {
  id: string;
  title: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  excerpt: string;
  coverImage?: string;
  hidden?: boolean;  // 是否隐藏该博客，用于前台过滤
  content: string;
  filePath: string;
}

/**
 * 服务器端：获取博客文章数量
 * @returns 博客文章数量
 */
export function getBlogCount(): number {
  try {
    // 动态导入fs和path模块
    const fs = require('fs');
    const path = require('path');
    
    const blogsDir = path.join(process.cwd(), 'src', 'content', 'blogs');
    
    // 检查目录是否存在
    if (!fs.existsSync(blogsDir) || !fs.statSync(blogsDir).isDirectory()) {
      return 0;
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(blogsDir);
    
    // 过滤出markdown文件
    const mdFiles = files.filter((file: string) => file.endsWith('.md'));
    
    return mdFiles.length;
  } catch (error) {
    console.error('读取博客文件失败:', error);
    return 0;
  }
}

/**
 * 服务器端：读取所有博客文章
 * @returns 博客文章数组，按时间倒序排序
 */
export function getServerBlogs(): BlogPost[] {
  try {
    // 动态导入fs和path模块
    const fs = require('fs');
    const path = require('path');
    
    const blogsDir = path.join(process.cwd(), 'src', 'content', 'blogs');
    
    // 检查目录是否存在
    if (!fs.existsSync(blogsDir) || !fs.statSync(blogsDir).isDirectory()) {
      return [];
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(blogsDir);
    
    // 过滤出markdown文件
    const mdFiles = files.filter((file: string) => file.endsWith('.md'));
    
    // 读取和解析每个文件
    const blogs = mdFiles.map((file: string) => {
      const filePath = path.join(blogsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { metadata, content: body } = parseFrontMatter(content);
      
      return {
        id: file.replace('.md', ''),
        title: metadata.title || '无标题',
        date: metadata.date || '',
        updatedAt: metadata.updatedAt,
        category: metadata.category || '未分类',
        tags: metadata.tags || [],
        excerpt: metadata.excerpt || '',
        coverImage: metadata.coverImage,
        // 解析 hidden 属性：支持字符串 'true' 或布尔值 true
        hidden: metadata.hidden === 'true' || metadata.hidden === true,
        content: body,
        filePath: file
      };
    });
    
    // 过滤隐藏的博客：只返回 hidden 为 false 或未设置的博客
    // 这样可以确保 GitHub Pages 静态部署时不会显示隐藏的内容
    const filteredBlogs = blogs.filter((blog: BlogPost) => !blog.hidden);
    
    // 按时间倒序排序
    filteredBlogs.sort((a: BlogPost, b: BlogPost) => {
      const dateA = new Date(a.updatedAt || a.date).getTime();
      const dateB = new Date(b.updatedAt || b.date).getTime();
      return dateB - dateA;
    });
    
    return filteredBlogs;
  } catch (error) {
    console.error('读取博客文件失败:', error);
    return [];
  }
}

/**
 * 服务器端：计算所有博客文章的总字数
 * @returns 博客总字数
 */
export function getBlogTotalWordCount(): number {
  try {
    // 动态导入fs和path模块
    const fs = require('fs');
    const path = require('path');
    
    const blogsDir = path.join(process.cwd(), 'src', 'content', 'blogs');
    
    // 检查目录是否存在
    if (!fs.existsSync(blogsDir) || !fs.statSync(blogsDir).isDirectory()) {
      return 0;
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(blogsDir);
    
    // 过滤出markdown文件
    const mdFiles = files.filter((file: string) => file.endsWith('.md'));
    
    let totalWords = 0;
    
    // 读取和解析每个文件，计算字数
    mdFiles.forEach((file: string) => {
      const filePath = path.join(blogsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { content: body } = parseFrontMatter(content);
      
      const wordCount = advancedWordCount(body);
      totalWords += wordCount.totalWords;
    });
    
    return totalWords;
  } catch (error) {
    console.error('计算博客字数失败:', error);
    return 0;
  }
}
