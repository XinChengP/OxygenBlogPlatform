// 工具函数：处理静态资源路径
// 确保在GitHub Pages部署环境下正确加载资源

export const getAssetPath = (path: string): string => {
  // 如果路径已经是完整URL，直接返回
  if (path.startsWith('http')) {
    return path;
  }
  
  // 确保路径以/开头
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // 在浏览器环境中，检查当前URL路径
  if (typeof window !== 'undefined') {
    // 开发环境：直接返回路径
    if (process.env.NODE_ENV === 'development') {
      return cleanPath;
    }
    
    // 优先使用环境变量中的配置（通过next.config.ts注入）
    const envBasePath = (window as any).__NEXT_DATA__?.buildId ? 
                       (window as any).__NEXT_DATA__.runtimeConfig?.basePath || '' : '';
    
    if (envBasePath) {
      return `${envBasePath}${cleanPath}`;
    }
    
    // 检查是否是GitHub Pages环境
    if (isGitHubPages()) {
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(segment => segment);
      
      // GitHub Pages的典型路径结构是 /username/repo-name/
      // 我们需要识别真正的仓库名，而不是页面路径
      if (pathSegments.length >= 2) {
        // 通常GitHub Pages的URL是 username.github.io/repo-name
        // 所以第二个段通常是仓库名
        const repoName = pathSegments[1];
        // 验证这是否是一个有效的仓库名（不是常见的页面路径）
        const commonPages = ['about', 'archive', 'blogs', 'guestbook', 'settings', 'tools'];
        if (!commonPages.includes(repoName)) {
          return `/${pathSegments[0]}/${repoName}${cleanPath}`;
        }
      }
    }
    
    // 否则直接返回路径
    return cleanPath;
  }
  
  // 在服务器环境中，使用环境变量
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || 
                   (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME ? `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}` : '');
  
  // 开发环境直接返回路径
  if (process.env.NODE_ENV === 'development') {
    return cleanPath;
  }
  
  // 生产环境：如果basePath为空（根域名部署），直接使用路径；否则添加basePath
  return basePath ? `${basePath}${cleanPath}` : cleanPath;
};

// 检查是否是GitHub Pages环境
export function isGitHubPages(): boolean {
  return typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') ||
       window.location.hostname.includes('pages.dev'));
}

// 获取基础路径
export function getBasePath(): string {
  // 在浏览器环境中，检查当前URL路径
  if (typeof window !== 'undefined') {
    // 优先使用Next.js注入的运行时配置
    const envBasePath = (window as any).__NEXT_DATA__?.runtimeConfig?.basePath || '';
    if (envBasePath) {
      return envBasePath;
    }
    
    // 检查是否是GitHub Pages环境
    if (isGitHubPages()) {
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(segment => segment);
      
      // GitHub Pages的典型路径结构是 /username/repo-name/
      if (pathSegments.length >= 2) {
        // 通常GitHub Pages的URL是 username.github.io/repo-name
        // 所以第二个段通常是仓库名
        const repoName = pathSegments[1];
        // 验证这是否是一个有效的仓库名（不是常见的页面路径）
        const commonPages = ['about', 'archive', 'blogs', 'guestbook', 'settings', 'tools'];
        if (!commonPages.includes(repoName)) {
          return `/${pathSegments[0]}/${repoName}`;
        }
      }
    }
  }
  
  // 在构建环境中，优先使用NEXT_PUBLIC_BASE_PATH，如果没有则使用NEXT_PUBLIC_GITHUB_REPO_NAME
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  
  if (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME) {
    return `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}`;
  }
  
  return '';
}