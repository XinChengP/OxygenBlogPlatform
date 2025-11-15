/**
 * 安全的marked库包装器
 * 防止String.repeat错误
 */

// 保存原始的String.repeat方法
const originalRepeat = String.prototype.repeat;

// 创建安全的repeat方法
function safeRepeat(this: string, count: number): string {
  // 确保count是非负整数
  if (count < 0 || !Number.isInteger(count)) {
    console.warn(`String.repeat接收到无效参数: ${count}，返回空字符串`);
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

// 动态导入marked库
let marked: any;

export async function initializeMarked() {
  if (!marked) {
    try {
      const markedModule = await import('marked');
      marked = markedModule.marked || markedModule;
      
      // 配置marked选项
      if (marked && typeof marked.setOptions === 'function') {
        marked.setOptions({
          breaks: true,
          gfm: true,
          silent: true, // 静默模式，减少错误抛出
        });
      }
      
      console.log('Marked库初始化成功');
    } catch (error) {
      console.error('Marked库初始化失败:', error);
      throw error;
    }
  }
  return marked;
}

/**
 * 安全的Markdown转HTML函数
 */
export async function safeMarkdownToHtml(markdown: string): Promise<string> {
  try {
    const markedInstance = await initializeMarked();
    
    if (!markedInstance || typeof markedInstance.parse !== 'function') {
      console.warn('Marked库不可用，使用备用方案');
      return fallbackMarkdownToHtml(markdown);
    }
    
    let html = markedInstance.parse(markdown);
    
    // 对marked的输出进行后处理，添加增强的代码块样式
    // 匹配带或不带class属性的pre>code结构
    html = html.replace(/<pre(?:\s+class="[^"]*")?><code(?:\s+class="[^"]*")?>([\s\S]*?)<\/code><\/pre>/g, (match: string, code: string) => {
      // 返回增强的HTML结构 - 更明显的代码块
      return `<div class="my-8 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white dark:bg-gray-900" data-code-id="code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}">
        <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-6 py-3 border-b-2 border-blue-200 dark:border-gray-600">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 bg-red-400 rounded-full"></span>
              <span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
              <span class="w-3 h-3 bg-green-400 rounded-full"></span>
            </div>
            <span class="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">代码</span>
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
    });
    
    // 处理行内代码样式 - 增强的视觉样式
    html = html.replace(/<code>(.*?)<\/code>/g, '<code class="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md text-sm font-mono border border-yellow-200 dark:border-yellow-700 shadow-sm hover:shadow-md transition-all duration-200">$1</code>');
    
    return html;
  } catch (error) {
    console.error('Marked解析失败，使用备用方案:', error);
    return fallbackMarkdownToHtml(markdown);
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
      
      // 标准化语言名称
      const normalizedLanguage = language ? language.toLowerCase().trim() : '';
      const displayLanguage = normalizedLanguage ? 
        (normalizedLanguage === 'javascript' ? 'JavaScript' :
         normalizedLanguage === 'typescript' ? 'TypeScript' :
         normalizedLanguage === 'python' ? 'Python' :
         normalizedLanguage === 'java' ? 'Java' :
         normalizedLanguage === 'cpp' || normalizedLanguage === 'c++' ? 'C++' :
         normalizedLanguage === 'html' ? 'HTML' :
         normalizedLanguage === 'css' ? 'CSS' :
         normalizedLanguage.charAt(0).toUpperCase() + normalizedLanguage.slice(1)) : '';
      
      // 返回增强的HTML结构 - 更明显的代码块
      return `<div class="my-8 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white dark:bg-gray-900" data-code-id="code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}">
        <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-6 py-3 border-b-2 border-blue-200 dark:border-gray-600">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 bg-red-400 rounded-full"></span>
              <span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
              <span class="w-3 h-3 bg-green-400 rounded-full"></span>
            </div>
            <span class="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">${displayLanguage || '代码'}</span>
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
          <pre class="text-sm leading-relaxed"><code>${cleanCode}</code></pre>
        </div>
      </div>`;
    });
    
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 行内代码（不在代码块内的）- 增强的视觉样式
    html = html.replace(/`(.*?)`/g, (match, code) => {
      return `<code class="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md text-sm font-mono border border-yellow-200 dark:border-yellow-700 shadow-sm hover:shadow-md transition-all duration-200">${code}</code>`;
    });
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" />');
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    return html;
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
  initializeMarked,
  restoreOriginalRepeat,
};

export default safeMarked;