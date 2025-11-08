// Giscus 评论系统配置
// 请根据你的 GitHub 仓库信息修改以下配置
// 获取配置信息请访问：https://giscus.app/zh-CN

export const giscusConfig = {
  // 你的 GitHub 仓库，格式为 "用户名/仓库名"
  repo: 'YOUR_GITHUB_USERNAME/YOUR_REPOSITORY',
  
  // 仓库 ID，在 giscus 配置页面可以找到
  repoId: 'YOUR_REPOSITORY_ID',
  
  // 讨论分类名称
  category: 'Announcements',
  
  // 分类 ID，在 giscus 配置页面可以找到
  categoryId: 'YOUR_CATEGORY_ID',
  
  // 评论映射方式
  // 'pathname': 使用页面路径作为讨论标识符
  // 'url': 使用完整 URL 作为讨论标识符
  // 'title': 使用页面标题作为讨论标识符
  // 'og:title': 使用 Open Graph 标题作为讨论标识符
  // 'specific': 使用特定术语作为讨论标识符
  // 'number': 使用特定的讨论编号
  mapping: 'specific' as const,
  
  // 严格模式
  // 0: 不严格，如果找不到匹配的讨论，会尝试创建一个
  // 1: 严格，如果找不到匹配的讨论，不会创建新的
  strict: 0,
  
  // 是否启用反应功能
  reactionsEnabled: 1,
  
  // 是否发送元数据
  emitMetadata: 0,
  
  // 输入框位置
  // 'top': 在评论列表上方
  // 'bottom': 在评论列表下方
  inputPosition: 'bottom' as const,
  
  // 默认主题
  // 可以是 'light', 'dark', 'dark_dimmed', 'dark_high_contrast', 'dark_tritanopia', 'light_high_contrast', 'light_tritanopia' 或自定义主题
  theme: 'preferred_color_scheme',
  
  // 语言设置
  lang: 'zh-CN',
  
  // 跨域设置
  crossorigin: 'anonymous' as const,
};

// 获取 Giscus 脚本属性
export function getGiscusAttributes(id: string, isDark: boolean) {
  return {
    src: 'https://giscus.app/client.js',
    'data-repo': giscusConfig.repo,
    'data-repo-id': giscusConfig.repoId,
    'data-category': giscusConfig.category,
    'data-category-id': giscusConfig.categoryId,
    'data-mapping': giscusConfig.mapping,
    'data-term': id,
    'data-strict': giscusConfig.strict,
    'data-reactions-enabled': giscusConfig.reactionsEnabled,
    'data-emit-metadata': giscusConfig.emitMetadata,
    'data-input-position': giscusConfig.inputPosition,
    'data-theme': isDark ? 'dark' : 'light',
    'data-lang': giscusConfig.lang,
    crossorigin: giscusConfig.crossorigin,
    async: true,
  };
}