// 获取资源路径的工具函数
export function getAssetPath(path: string): string {
  // 检查是否是GitHub Pages环境
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') ||
       window.location.hostname.includes('pages.dev'))) {
    
    // 获取仓库名称
    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/').filter(segment => segment);
    
    // 如果路径已经包含仓库名称，则直接返回
    if (pathSegments.length > 0 && path.startsWith(`/${pathSegments[0]}/`)) {
      return path;
    }
    
    // 否则添加仓库名称前缀
    // 注意：这里不进行额外的编码，因为调用者可能已经对路径进行了编码
    if (pathSegments.length > 0) {
      return `/${pathSegments[0]}${path}`;
    }
  }
  
  // 检查是否在静态导出环境中
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_PATH) {
    // 如果路径已经包含基础路径，则直接返回
    if (path.startsWith(process.env.NEXT_PUBLIC_BASE_PATH)) {
      return path;
    }
    
    // 否则添加基础路径前缀
    return `${process.env.NEXT_PUBLIC_BASE_PATH}${path}`;
  }
  
  // 非GitHub Pages环境，直接返回原路径
  return path;
}

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
    const pathname = window.location.pathname;
    // 如果路径包含仓库名，则提取它作为基础路径
    const pathSegments = pathname.split('/').filter(segment => segment);
    if (pathSegments.length > 0 && pathSegments[0] !== '' && pathSegments[0] !== 'settings') {
      return `/${pathSegments[0]}`;
    }
  }
  
  // 在构建环境中，使用环境变量
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  
  return '';
}