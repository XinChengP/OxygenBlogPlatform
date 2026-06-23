/**
 * HTTP安全响应头配置
 * 用于增强网站安全性，防止各种网络攻击
 * 
 * 说明：
 * 1. GitHub Pages支持部分响应头配置
 * 2. 主要通过_next/headers.json或<meta>标签实现
 * 3. 部分头需要在构建时注入到HTML中
 * 
 * @author 歆橙
 * @version 1.0.0
 */

/**
 * 安全响应头配置接口
 */
export interface SecurityHeaders {
  // 内容安全策略
  'Content-Security-Policy'?: string;
  // 严格传输安全
  'Strict-Transport-Security'?: string;
  // 内容类型选项
  'X-Content-Type-Options'?: string;
  // 框架选项（点击劫持防护）
  'X-Frame-Options'?: string;
  // XSS防护
  'X-XSS-Protection'?: string;
  // 引用策略
  'Referrer-Policy'?: string;
  // 权限策略
  'Permissions-Policy'?: string;
  // 跨域策略
  'Cross-Origin-Embedder-Policy'?: string;
  'Cross-Origin-Opener-Policy'?: string;
  'Cross-Origin-Resource-Policy'?: string;
}

/**
 * 生产环境安全响应头配置
 * 严格的安全策略
 */
export const productionSecurityHeaders: SecurityHeaders = {
  // 内容安全策略 - 防止XSS和数据注入
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://giscus.app https://v6.51.la https://sdk.51.la",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://giscus.app",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://api.github.com https://giscus.app https://v6.51.la https://sdk.51.la https://v1.hitokoto.cn",
    "media-src 'self' https: http:",
    "object-src 'none'",
    "frame-src https://giscus.app https://*.github.com https://player.bilibili.com",
    "frame-ancestors 'self' https://*.github.io",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
  
  // 严格传输安全 - 强制HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // 内容类型选项 - 防止MIME类型嗅探
  'X-Content-Type-Options': 'nosniff',
  
  // 框架选项 - 点击劫持防护
  'X-Frame-Options': 'DENY',
  
  // XSS防护 - 浏览器内置XSS过滤器
  'X-XSS-Protection': '1; mode=block',
  
  // 引用策略 - 控制 referrer 信息
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // 权限策略 - 限制浏览器功能
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),
  
  // 跨域嵌入策略
  'Cross-Origin-Embedder-Policy': 'require-corp',
  
  // 跨域打开策略
  'Cross-Origin-Opener-Policy': 'same-origin',
  
  // 跨域资源策略
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

/**
 * 开发环境安全响应头配置
 * 相对宽松，方便调试
 */
export const developmentSecurityHeaders: SecurityHeaders = {
  ...productionSecurityHeaders,
  // 开发环境允许更多连接来源
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *",
    "style-src 'self' 'unsafe-inline' *",
    "img-src 'self' data: blob: *",
    "font-src 'self' * data:",
    "connect-src 'self' *",
    "media-src 'self' *",
    "object-src 'none'",
    "frame-src *",
    "frame-ancestors 'self' *",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; '),
  // 开发环境禁用HSTS
  'Strict-Transport-Security': '',
};

/**
 * 获取当前环境的安全响应头
 * @returns 当前环境的安全响应头配置
 */
export function getCurrentSecurityHeaders(): SecurityHeaders {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return developmentSecurityHeaders;
  }
  
  // 浏览器环境检测
  if (typeof window !== 'undefined') {
    const isDevelopment = 
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    
    return isDevelopment ? developmentSecurityHeaders : productionSecurityHeaders;
  }
  
  return productionSecurityHeaders;
}

/**
 * 生成<meta http-equiv>标签HTML字符串
 * @returns meta标签HTML字符串数组
 */
export function generateSecurityMetaTags(): string[] {
  const headers = getCurrentSecurityHeaders();
  const metaTags: string[] = [];
  
  for (const [key, value] of Object.entries(headers)) {
    if (value && value.trim()) {
      metaTags.push(`<meta http-equiv="${key}" content="${value}">`);
    }
  }
  
  return metaTags;
}

/**
 * 生成Next.js headers配置
 * 用于next.config.js中的headers函数
 * @returns Next.js headers配置数组
 */
export function generateNextJSHeaders(): Array<{
  source: string;
  headers: Array<{ key: string; value: string }>;
}> {
  const headers = getCurrentSecurityHeaders();
  const headerEntries: Array<{ key: string; value: string }> = [];
  
  for (const [key, value] of Object.entries(headers)) {
    if (value && value.trim()) {
      headerEntries.push({ key, value });
    }
  }
  
  return [
    {
      source: '/:path*',
      headers: headerEntries,
    },
  ];
}

/**
 * 生成静态HTML的head内容
 * 用于直接插入到HTML模板中
 * @returns 完整的head安全标签内容
 */
export function generateSecurityHeadContent(): string {
  const metaTags = generateSecurityMetaTags();
  return metaTags.join('\n');
}

/**
 * 验证安全响应头配置
 * @param headers 要验证的响应头
 * @returns 验证结果
 */
export function validateSecurityHeaders(headers: SecurityHeaders): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // 检查CSP
  if (!headers['Content-Security-Policy']) {
    warnings.push('未配置Content-Security-Policy，建议添加以防止XSS攻击');
  } else {
    const csp = headers['Content-Security-Policy'];
    
    // 检查不安全的CSP配置
    if (csp.includes("'unsafe-inline'") && !csp.includes('nonce')) {
      warnings.push('CSP使用了unsafe-inline，建议配合nonce使用');
    }
    
    if (csp.includes('*') && !csp.includes('frame-ancestors')) {
      warnings.push('CSP使用了通配符*，建议明确指定允许的域名');
    }
    
    // 检查是否包含必要的指令
    if (!csp.includes('frame-ancestors')) {
      warnings.push('CSP未包含frame-ancestors指令，可能存在点击劫持风险');
    }
  }
  
  // 检查HSTS
  if (!headers['Strict-Transport-Security']) {
    warnings.push('未配置Strict-Transport-Security，建议启用HTTPS强制');
  }
  
  // 检查X-Frame-Options
  if (!headers['X-Frame-Options']) {
    warnings.push('未配置X-Frame-Options，建议添加以防止点击劫持');
  }
  
  // 检查X-Content-Type-Options
  if (!headers['X-Content-Type-Options']) {
    warnings.push('未配置X-Content-Type-Options，建议添加以防止MIME嗅探');
  }
  
  // 检查Referrer-Policy
  if (!headers['Referrer-Policy']) {
    warnings.push('未配置Referrer-Policy，建议添加以控制referrer信息');
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * 安全响应头报告
 * 用于调试和监控
 */
export interface SecurityHeadersReport {
  timestamp: string;
  headers: SecurityHeaders;
  validation: ReturnType<typeof validateSecurityHeaders>;
  score: number;
  recommendations: string[];
}

/**
 * 生成安全响应头报告
 * @returns 安全响应头报告
 */
export function generateSecurityReport(): SecurityHeadersReport {
  const headers = getCurrentSecurityHeaders();
  const validation = validateSecurityHeaders(headers);
  
  // 计算安全分数
  let score = 100;
  score -= validation.warnings.length * 5;
  score -= validation.errors.length * 20;
  score = Math.max(0, score);
  
  // 生成建议
  const recommendations: string[] = [];
  
  if (!headers['Content-Security-Policy']?.includes('upgrade-insecure-requests')) {
    recommendations.push('建议在CSP中添加upgrade-insecure-requests以自动升级HTTP请求');
  }
  
  if (!headers['Permissions-Policy']) {
    recommendations.push('建议配置Permissions-Policy以限制不必要的浏览器功能');
  }
  
  return {
    timestamp: new Date().toISOString(),
    headers,
    validation,
    score,
    recommendations,
  };
}

/**
 * 检测当前页面的安全响应头
 * 仅在浏览器环境有效
 * @returns 当前页面的响应头信息
 */
export async function detectCurrentHeaders(): Promise<Record<string, string> | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const response = await fetch(window.location.href, {
      method: 'HEAD',
      cache: 'no-cache',
    });
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    return headers;
  } catch (error) {
    console.error('[安全检测] 获取响应头失败:', error);
    return null;
  }
}

/**
 * 导出默认配置
 */
export default productionSecurityHeaders;
