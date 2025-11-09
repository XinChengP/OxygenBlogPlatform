// 获取资源路径的工具函数
export function getAssetPath(path: string): string {
  // 检查是否是GitHub Pages环境
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') ||
       window.location.hostname.includes('pages.dev'))) {
    
    // 获取仓库名称
    const pathname = window.location.pathname;
    const repoName = pathname.split('/')[1];
    
    // 如果路径已经包含仓库名称，则直接返回
    if (path.startsWith(`/${repoName}/`)) {
      return path;
    }
    
    // 否则添加仓库名称前缀
    return `/${repoName}${path}`;
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