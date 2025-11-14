// 工具函数：处理静态资源路径
// 确保在GitHub Pages部署环境下正确加载资源

export const getAssetPath = (path: string): string => {
  // 优先使用NEXT_PUBLIC_BASE_PATH，如果没有则使用NEXT_PUBLIC_GITHUB_REPO_NAME构建basePath
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || 
                   (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME ? `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}` : '');
  
  // 如果路径已经是完整URL，直接返回
  if (path.startsWith('http')) {
    return path;
  }
  
  // 确保路径以/开头
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
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
    const pathname = window.location.pathname;
    // 如果路径包含仓库名，则提取它作为基础路径
    const pathSegments = pathname.split('/').filter(segment => segment);
    if (pathSegments.length > 0 && pathSegments[0] !== '' && pathSegments[0] !== 'settings') {
      return `/${pathSegments[0]}`;
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