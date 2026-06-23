/**
 * 内容安全策略(CSP)配置
 * 用于防止XSS攻击、点击劫持、恶意脚本注入等安全威胁
 * 
 * 部署说明：
 * 1. GitHub Pages支持通过<meta>标签设置CSP
 * 2. 本配置针对静态网站设计，平衡安全性和功能性
 * 3. 定期审查和更新允许列表
 */

/**
 * CSP指令类型定义
 */
export interface CSPDirectives {
  // 默认策略，当其他指令未定义时使用
  'default-src'?: string[];
  // 脚本加载策略 - 控制JavaScript执行来源
  'script-src'?: string[];
  // 样式加载策略 - 控制CSS来源
  'style-src'?: string[];
  // 图片加载策略 - 控制图片来源
  'img-src'?: string[];
  // 字体加载策略 - 控制字体来源
  'font-src'?: string[];
  // 连接策略 - 控制XHR、WebSocket等连接
  'connect-src'?: string[];
  // 媒体加载策略 - 控制音视频来源
  'media-src'?: string[];
  // 对象嵌入策略 - 控制Flash等插件
  'object-src'?: string[];
  // 框架嵌入策略 - 控制iframe来源，防止点击劫持
  'frame-src'?: string[];
  // 祖先框架策略 - 控制哪些页面可以嵌入本站
  'frame-ancestors'?: string[];
  // 表单提交策略 - 控制表单提交目标
  'form-action'?: string[];
  // 基础URI策略 - 控制<base>标签
  'base-uri'?: string[];
  // 升级不安全请求 - 自动将HTTP转为HTTPS
  'upgrade-insecure-requests'?: boolean;
  // 阻止混合内容 - 阻止HTTP资源加载
  'block-all-mixed-content'?: boolean;
  // CSP违规报告URI
  'report-uri'?: string[];
  // CSP报告仅模式（不阻止，只报告）
  'report-to'?: string[];
}

/**
 * 生产环境CSP配置
 * 严格模式，只允许白名单内的资源
 */
export const productionCSP: CSPDirectives = {
  // 默认拒绝所有资源
  'default-src': ["'self'"],
  
  // 脚本来源控制
  // 'self' - 同源脚本
  // 'unsafe-inline' - 允许内联脚本（Next.js需要）
  // 'unsafe-eval' - 允许eval（部分库需要）
  // 特定域名 - 允许的外部脚本
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    // GitHub Pages相关
    'https://*.github.io',
    // Giscus评论系统
    'https://giscus.app',
    // 51la统计
    'https://v6.51.la',
    'https://sdk.51.la',
    // Google Analytics（可选）
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
    // Cloudflare Web Analytics
    'https://static.cloudflareinsights.com',
  ],
  
  // 样式来源控制
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Tailwind CSS和styled-components需要
    // Google Fonts
    'https://fonts.googleapis.com',
    // Giscus评论系统样式
    'https://giscus.app',
  ],
  
  // 图片来源控制
  'img-src': [
    "'self'",
    'data:', // 允许Data URI图片
    'blob:', // 允许Blob URL
    // 允许的外部图片域名
    'https:',
    'http:',
    // GitHub相关
    'https://*.githubusercontent.com',
    'https://*.github.io',
  ],
  
  // 字体来源控制
  'font-src': [
    "'self'",
    // Google Fonts
    'https://fonts.gstatic.com',
    'data:', // 允许Data URI字体
  ],
  
  // 连接来源控制（XHR、fetch、WebSocket）
  'connect-src': [
    "'self'",
    // GitHub API
    'https://api.github.com',
    // Giscus 评论系统
    'https://giscus.app',
    // 51la 统计
    'https://v6.51.la',
    'https://sdk.51.la',
    'https://collect-v6.51.la',  // 51la 数据收集
    // 一言API（Live2D看板娘随机句子）
    'https://v1.hitokoto.cn',
    // Cloudflare Web Analytics数据上报
    'https://cloudflareinsights.com',
    // Google Analytics
    'https://www.google-analytics.com',
    // 本地开发
    'http://localhost:*',
    'ws://localhost:*',
  ],
  
  // 媒体来源控制
  'media-src': [
    "'self'",
    'https:',
    'http:',
  ],
  
  // 禁止对象嵌入（Flash等）
  'object-src': ["'none'"],
  
  // iframe来源控制
  'frame-src': [
    // Giscus评论系统
    'https://giscus.app',
    // GitHub相关
    'https://*.github.com',
    'https://*.github.io',
    // B站视频播放器
    'https://player.bilibili.com',
  ],
  
  // 防止被嵌入到恶意网站（点击劫持防护）
  'frame-ancestors': [
    "'self'",
    // 允许的嵌入来源
    'https://*.github.io',
  ],
  
  // 表单提交目标控制
  'form-action': ["'self'"],
  
  // 基础URI控制
  'base-uri': ["'self'"],
  
  // 自动升级HTTP到HTTPS
  'upgrade-insecure-requests': true,
};

/**
 * 开发环境CSP配置
 * 相对宽松，方便开发调试
 */
export const developmentCSP: CSPDirectives = {
  ...productionCSP,
  // 开发环境允许更多来源
  'connect-src': [
    "'self'",
    '*', // 开发环境允许所有连接
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    '*', // 开发环境允许所有图片
  ],
};

/**
 * 将CSP配置对象转换为meta标签内容字符串
 * @param directives CSP指令配置
 * @returns CSP策略字符串
 */
export function generateCSPString(directives: CSPDirectives): string {
  const entries: string[] = [];

  for (const [key, value] of Object.entries(directives)) {
    // frame-ancestors 指令不能通过 meta 标签设置，只能通过 HTTP 响应头设置
    // 参考: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors
    if (key === 'frame-ancestors') {
      continue;
    }

    if (key === 'upgrade-insecure-requests' && value === true) {
      entries.push('upgrade-insecure-requests');
    } else if (key === 'block-all-mixed-content' && value === true) {
      entries.push('block-all-mixed-content');
    } else if (Array.isArray(value)) {
      entries.push(`${key} ${value.join(' ')}`);
    }
  }

  return entries.join('; ');
}

/**
 * 获取当前环境的CSP配置
 * @returns 当前环境的CSP配置
 */
export function getCurrentCSP(): CSPDirectives {
  // 检查是否在浏览器环境
  if (typeof window === 'undefined') {
    return productionCSP;
  }
  
  // 开发环境检测
  const isDevelopment = 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    process.env.NODE_ENV === 'development';
  
  return isDevelopment ? developmentCSP : productionCSP;
}

/**
 * 生成CSP meta标签HTML字符串
 * @returns 完整的meta标签HTML
 */
export function generateCSPMetaTag(): string {
  const csp = getCurrentCSP();
  const cspString = generateCSPString(csp);
  
  return `<meta http-equiv="Content-Security-Policy" content="${cspString}">`;
}

/**
 * 生成CSP nonce（一次性随机数）
 * 用于允许特定的内联脚本
 * @returns 随机nonce字符串
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  
  // 检查是否有crypto API
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // 降级方案
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证URL是否在CSP白名单中
 * @param url 要验证的URL
 * @param directive CSP指令类型
 * @returns 是否允许
 */
export function isUrlAllowed(url: string, directive: keyof CSPDirectives): boolean {
  const csp = getCurrentCSP();
  const allowedSources = csp[directive];
  
  if (!allowedSources || !Array.isArray(allowedSources)) {
    return false;
  }
  
  // 检查特殊值
  if (allowedSources.includes("'self'") && url.startsWith(window.location.origin)) {
    return true;
  }
  
  if (allowedSources.includes('*')) {
    return true;
  }
  
  if (allowedSources.includes('https:') && url.startsWith('https://')) {
    return true;
  }
  
  if (allowedSources.includes('http:') && url.startsWith('http://')) {
    return true;
  }
  
  if (allowedSources.includes('data:') && url.startsWith('data:')) {
    return true;
  }
  
  if (allowedSources.includes('blob:') && url.startsWith('blob:')) {
    return true;
  }
  
  // 检查具体域名
  for (const source of allowedSources) {
    // 跳过特殊值
    if (source.startsWith("'") || source === '*') {
      continue;
    }
    
    // 处理通配符域名
    if (source.includes('*')) {
      const pattern = source.replace(/\./g, '\\.').replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}`);
      if (regex.test(url)) {
        return true;
      }
    } else if (url.startsWith(source)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 报告URI配置
 * 用于收集CSP违规报告
 */
export const CSP_REPORT_URI = ''; // 可以配置为收集CSP违规的端点

/**
 * 生成包含报告功能的CSP配置
 * @param reportUri 报告接收地址
 * @returns 增强版CSP配置
 */
export function generateCSPWithReporting(reportUri?: string): CSPDirectives {
  const csp = getCurrentCSP();
  
  if (reportUri) {
    return {
      ...csp,
      // 添加报告URI
      'report-uri': [reportUri] as string[],
    };
  }
  
  return csp;
}

// 导出默认配置
export default productionCSP;
