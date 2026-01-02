/**
 * 动态加载脚本工具
 * 支持脚本缓存和并发加载优化
 * @param url 脚本URL
 * @param options 加载选项
 * @returns Promise
 */

interface LoadScriptOptions {
  async?: boolean;
  defer?: boolean;
  cache?: boolean;
  timeout?: number;
}

// 脚本加载缓存
const scriptCache = new Map<string, Promise<void>>();
const loadedScripts = new Set<string>();

/**
 * 动态加载脚本
 */
export function loadScript(
  url: string,
  options: LoadScriptOptions = {}
): Promise<void> {
  const {
    async = true,
    defer = false,
    cache = true,
    timeout = 30000
  } = options;

  // 如果脚本已经加载完成，直接返回成功
  if (loadedScripts.has(url)) {
    return Promise.resolve();
  }

  // 如果脚本正在加载中，返回现有Promise
  if (cache && scriptCache.has(url)) {
    return scriptCache.get(url)!;
  }

  // 创建新的加载Promise
  const loadPromise = new Promise<void>((resolve, reject) => {
    // 超时处理
    const timeoutId = setTimeout(() => {
      reject(new Error(`Failed to load script (timeout): ${url}`));
      scriptCache.delete(url);
    }, timeout);

    // 检查DOM中是否已存在该脚本
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      clearTimeout(timeoutId);
      loadedScripts.add(url);
      scriptCache.delete(url);
      resolve();
      return;
    }

    // 创建新脚本元素
    const script = document.createElement('script');
    script.src = url;
    script.async = async;
    script.defer = defer;
    
    script.onload = () => {
      clearTimeout(timeoutId);
      loadedScripts.add(url);
      scriptCache.delete(url);
      resolve();
    };
    
    script.onerror = () => {
      clearTimeout(timeoutId);
      scriptCache.delete(url);
      reject(new Error(`Failed to load script: ${url}`));
    };
    
    document.head.appendChild(script);
  });

  // 缓存加载Promise
  if (cache) {
    scriptCache.set(url, loadPromise);
  }

  return loadPromise;
}

/**
 * 清除脚本缓存
 */
export function clearScriptCache(): void {
  scriptCache.clear();
  loadedScripts.clear();
}

/**
 * 检查脚本是否已加载
 */
export function isScriptLoaded(url: string): boolean {
  return loadedScripts.has(url) || 
    !!document.querySelector(`script[src="${url}"]`);
}

/**
 * 加载多个脚本，支持并行和顺序加载
 */
export async function loadScripts(
  urls: string[],
  options: LoadScriptOptions & { sequential?: boolean } = {}
): Promise<void[]> {
  const { sequential = false, ...loadOptions } = options;
  
  if (sequential) {
    // 顺序加载
    const results: void[] = [];
    for (const url of urls) {
      await loadScript(url, loadOptions);
      results.push(undefined);
    }
    return results;
  } else {
    // 并行加载
    return Promise.all(urls.map(url => loadScript(url, loadOptions)));
  }
}