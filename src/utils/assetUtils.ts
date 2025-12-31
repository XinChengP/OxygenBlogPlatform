// 工具函数：处理静态资源路径
// 确保在GitHub Pages部署环境下正确加载资源

// 缓存机制：用于存储已处理的路径
const pathCache = new Map<string, string>();

/**
 * 处理静态资源路径，确保在各种环境下正确加载
 * @param path - 资源路径
 * @returns 处理后的完整路径
 */
export const getAssetPath = (path: string): string => {
  // 如果路径已经是完整URL，直接返回
  if (path.startsWith("http")) {
    return path;
  }
  
  // 检查缓存中是否已有处理结果
  if (pathCache.has(path)) {
    return pathCache.get(path)!;
  }
  
  // 确保路径以/开头
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  let resultPath = cleanPath;
  
  // 在浏览器环境中，检查当前URL路径
  if (typeof window !== 'undefined') {
    // 开发环境：直接返回路径
    if (process.env.NODE_ENV === 'development') {
      pathCache.set(path, resultPath);
      return resultPath;
    }
    
    // 本地服务器环境（如Python HTTP服务器）：直接返回路径
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      pathCache.set(path, resultPath);
      return resultPath;
    }
    
    // 优先使用Next.js注入的运行时配置
    const runtimeConfig = (window as any).__NEXT_DATA__?.runtimeConfig;
    if (runtimeConfig?.basePath) {
      resultPath = `${runtimeConfig.basePath}${cleanPath}`;
      pathCache.set(path, resultPath);
      return resultPath;
    }
    
    // 检查是否是GitHub Pages环境
    if (isGitHubPages()) {
      // 对于自定义域名blog.xinchengp.cn，直接返回路径
      if (window.location.hostname === 'blog.xinchengp.cn') {
        pathCache.set(path, resultPath);
        return resultPath;
      }
      
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(segment => segment);
      
      // GitHub Pages的典型路径结构是 /username/repo-name/
      if (pathSegments.length >= 2) {
        // 通常GitHub Pages的URL是 username.github.io/repo-name
        // 第一个段是用户名，第二个段是仓库名
        const username = pathSegments[0];
        const repoName = pathSegments[1];
        
        // 验证这是否是一个有效的仓库名（不是常见的页面路径）
        const commonPages = ['about', 'archive', 'blogs', 'guestbook', 'settings', 'tools', 'debug', 'test'];
        if (!commonPages.includes(repoName)) {
          resultPath = `/${username}/${repoName}${cleanPath}`;
          pathCache.set(path, resultPath);
          return resultPath;
        }
      }
      
      // 如果环境变量中配置了仓库名，使用它
      if (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME) {
        resultPath = `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}${cleanPath}`;
        pathCache.set(path, resultPath);
        return resultPath;
      }
    }
    
    // 如果环境变量中配置了基础路径（包括空字符串），使用它
    if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
      resultPath = `${process.env.NEXT_PUBLIC_BASE_PATH}${cleanPath}`;
      pathCache.set(path, resultPath);
      return resultPath;
    }
  } else {
    // 在服务器环境中，使用环境变量
    // 注意：检查NEXT_PUBLIC_BASE_PATH是否已定义，而不是检查其是否为真值
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined 
      ? process.env.NEXT_PUBLIC_BASE_PATH 
      : (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME ? `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}` : '');
    
    // 开发环境直接返回路径
    if (process.env.NODE_ENV === 'development') {
      pathCache.set(path, resultPath);
      return resultPath;
    }
    
    // 生产环境：如果basePath为空（根域名部署），直接使用路径；否则添加basePath
    if (basePath) {
      resultPath = `${basePath}${cleanPath}`;
    }
  }
  
  // 缓存结果
  pathCache.set(path, resultPath);
  
  return resultPath;
};

// 检查是否是GitHub Pages环境（包括自定义域名）
export function isGitHubPages(): boolean {
  return typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') ||
       window.location.hostname.includes('pages.dev') ||
       window.location.hostname === 'blog.xinchengp.cn');
}

// 获取基础路径
export function getBasePath(): string {
  // 在浏览器环境中，检查当前URL路径
  if (typeof window !== 'undefined') {
    // 本地服务器环境（如Python HTTP服务器）：返回空字符串
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '';
    }
    
    // 优先使用Next.js注入的运行时配置
    const runtimeConfig = (window as any).__NEXT_DATA__?.runtimeConfig;
    if (runtimeConfig?.basePath) {
      return runtimeConfig.basePath;
    }
    
    // 检查是否是GitHub Pages环境
    if (isGitHubPages()) {
      // 对于自定义域名blog.xinchengp.cn，返回空字符串
      if (window.location.hostname === 'blog.xinchengp.cn') {
        return '';
      }
      
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(segment => segment);
      
      // GitHub Pages的典型路径结构是 /username/repo-name/
      if (pathSegments.length >= 2) {
        // 通常GitHub Pages的URL是 username.github.io/repo-name
        // 第一个段是用户名，第二个段是仓库名
        const username = pathSegments[0];
        const repoName = pathSegments[1];
        
        // 验证这是否是一个有效的仓库名（不是常见的页面路径）
        const commonPages = ['about', 'archive', 'blogs', 'guestbook', 'settings', 'tools', 'debug', 'test'];
        if (!commonPages.includes(repoName)) {
          return `/${username}/${repoName}`;
        }
      }
      
      // 如果环境变量中配置了仓库名，使用它
      if (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME) {
        return `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}`;
      }
    }
    
    // 如果环境变量中配置了基础路径（包括空字符串），使用它
    if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
      return process.env.NEXT_PUBLIC_BASE_PATH;
    }
  }
  
  // 在构建环境中，优先使用NEXT_PUBLIC_BASE_PATH（包括空字符串）
  if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  
  if (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME) {
    return `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}`;
  }
  
  return '';
}