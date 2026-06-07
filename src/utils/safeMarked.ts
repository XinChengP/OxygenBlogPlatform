/**
 * 安全的marked库包装器
 * 防止String.repeat错误并使用DOMPurify防止XSS攻击
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

// 缓存配置
const CACHE_CONFIG = {
  // 最大缓存条目数
  maxSize: 100,
  // 缓存过期时间（毫秒）- 30分钟
  ttl: 30 * 60 * 1000,
};

// 带过期时间的缓存项接口
interface CacheEntry {
  value: string;
  timestamp: number;
}

// 缓存机制：用于存储已处理的Markdown内容
const markdownCache = new Map<string, CacheEntry>();

// 保存原始的String.repeat方法
const originalRepeat = String.prototype.repeat;

/**
 * 设置缓存项，自动处理过期和容量限制
 * @param key - 缓存键
 * @param value - 缓存值
 */
function setCacheItem(key: string, value: string): void {
  // 如果缓存已满，删除最旧的条目
  if (markdownCache.size >= CACHE_CONFIG.maxSize) {
    const oldestKey = markdownCache.keys().next().value;
    if (oldestKey !== undefined) {
      markdownCache.delete(oldestKey);
    }
  }
  
  markdownCache.set(key, {
    value,
    timestamp: Date.now(),
  });
}

/**
 * 获取缓存项，自动检查过期
 * @param key - 缓存键
 * @returns 缓存值或undefined
 */
function getCacheItem(key: string): string | undefined {
  const entry = markdownCache.get(key);
  
  if (!entry) {
    return undefined;
  }
  
  // 检查是否过期
  if (Date.now() - entry.timestamp > CACHE_CONFIG.ttl) {
    markdownCache.delete(key);
    return undefined;
  }
  
  return entry.value;
}

/**
 * 清理过期的缓存项
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of markdownCache.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.ttl) {
      markdownCache.delete(key);
    }
  }
}

// 创建安全的repeat方法
function safeRepeat(this: string, count: number): string {
  // 确保count是非负整数
  if (count < 0 || !Number.isInteger(count)) {
    return '';
  }
  // 如果count为0，返回空字符串
  if (count === 0) {
    return '';
  }
  // 调用原始的repeat方法
  return originalRepeat.call(this, count);
}

// 替换String.prototype.repeat
String.prototype.repeat = safeRepeat;

/**
 * 生成统一的代码块 HTML 结构
 * 消除 safeMarkdownToHtml 与 fallbackMarkdownToHtml 中的重复模板代码
 * @param code - 代码内容
 * @param language - 编程语言（可选）
 * @returns 完整的代码块 HTML 字符串
 */
function generateCodeBlockHtml(code: string, language?: string): string {
  const codeId = `code-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  // 标准化语言显示名称
  let displayLanguage = '代码';
  if (language) {
    const normalized = language.toLowerCase().trim();
    const languageMap: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      'c++': 'C++',
      html: 'HTML',
      css: 'CSS',
    };
    displayLanguage = languageMap[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return `<div class="my-8 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white dark:bg-gray-900" data-code-id="${codeId}">
    <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-6 py-3 border-b-2 border-blue-200 dark:border-gray-600">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 bg-red-400 rounded-full"></span>
          <span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
          <span class="w-3 h-3 bg-green-400 rounded-full"></span>
        </div>
        <span class="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">${displayLanguage}</span>
      </div>
      <button class="copy-button inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md px-4 py-2" title="复制代码">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
        复制代码
      </button>
    </div>
    <div class="p-6 bg-gray-50 dark:bg-gray-950">
      <pre class="text-sm leading-relaxed"><code>${code}</code></pre>
    </div>
  </div>`;
}

// 直接配置marked选项
marked.setOptions({
  breaks: true,
  gfm: true,
  silent: true, // 静默模式，减少错误抛出
});

/**
 * 安全的Markdown转HTML函数
 * 添加缓存机制，提高性能
 * 
 * 缓存策略：
 * - 最大缓存100条记录
 * - 缓存过期时间30分钟
 * - 使用LRU策略清理旧缓存
 */
export async function safeMarkdownToHtml(markdown: string): Promise<string> {
  // 定期清理过期缓存（每10次调用清理一次）
  if (Math.random() < 0.1) {
    cleanupCache();
  }
  
  // 检查缓存中是否已有处理结果
  const cached = getCacheItem(markdown);
  if (cached !== undefined) {
    return cached;
  }
  
  try {
    // 使用await确保html是字符串类型
    let html = await marked.parse(markdown);
    
    // 对marked的输出进行后处理，添加增强的代码块样式
    // 匹配带或不带class属性的pre>code结构
    const codeBlockRegex = /<pre(?:\s+class="[^"]*")?><code(?:\s+class="[^"]*")?>([\s\S]*?)<\/code><\/pre>/g;
    html = html.replace(codeBlockRegex, (match: string, code: string) => {
      // 复用统一的代码块 HTML 生成函数，消除与 fallbackMarkdownToHtml 的重复模板
      return generateCodeBlockHtml(code);
    });
    
    // 处理行内代码样式 - 简洁的视觉样式
    const inlineCodeRegex = /<code>(.*?)<\/code>/g;
    html = html.replace(inlineCodeRegex, '<code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">$1</code>');
    
    // 使用DOMPurify清理HTML，防止XSS攻击
    const sanitizedHtml = DOMPurify.sanitize(html);
    
    // 缓存结果（使用改进的缓存机制）
    setCacheItem(markdown, sanitizedHtml);
    
    return sanitizedHtml;
  } catch {
    const result = fallbackMarkdownToHtml(markdown);
    // 缓存结果（使用改进的缓存机制）
    setCacheItem(markdown, result);
    return result;
  }
}

/**
 * 备用的Markdown转HTML实现
 */
function fallbackMarkdownToHtml(markdown: string): string {
  let html = markdown;
  
  try {
    // 代码块 - 使用与博客一致的风格
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      let cleanCode = language ? code.split('\n').slice(1).join('\n') : code;

      // 移除开头的换行符
      cleanCode = cleanCode.replace(/^\n/, '');

      // 复用统一的代码块 HTML 生成函数，消除与 safeMarkdownToHtml 的重复模板
      return generateCodeBlockHtml(cleanCode, language);
    });
    
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 行内代码（不在代码块内的）- 简洁的视觉样式
    html = html.replace(/`(.*?)`/g, (match, code) => {
      return `<code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">${code}</code>`;
    });
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" />');
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // 使用DOMPurify清理HTML，防止XSS攻击
    const sanitizedHtml = DOMPurify.sanitize(html);
    
    return sanitizedHtml;
  } catch (error) {
    console.error('备用Markdown解析失败:', error);
    return markdown; // 最坏情况下返回原始内容
  }
}

/**
 * 恢复原始的String.repeat方法（用于测试或清理）
 */
export function restoreOriginalRepeat(): void {
  String.prototype.repeat = originalRepeat;
}

const safeMarked = {
  safeMarkdownToHtml,
  restoreOriginalRepeat,
};

export default safeMarked;