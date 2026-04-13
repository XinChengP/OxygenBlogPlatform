/**
 * 判断是否为静态导出模式
 * 规则：
 * 1. 开发环境 (NODE_ENV=development) 永远不是静态导出模式
 * 2. 只有显式设置 STATIC_EXPORT=true 或 NEXT_PRIVATE_STATIC_EXPORT=true 时才启用静态导出
 * 3. 生产环境默认不启用静态导出，除非显式设置
 */
const isStaticExport = process.env.NODE_ENV !== 'development' && 
  (process.env.STATIC_EXPORT === 'true' || process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true');

/**
 * 判断是否为开发环境
 */
const isDev = process.env.NODE_ENV === 'development';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  reactStrictMode: true,

  // 允许的开发环境来源 - 解决跨域问题
  allowedDevOrigins: ['100.143.40.229', 'localhost'],

  turbopack: {},

  compiler: {
    reactRemoveProperties: isStaticExport,
    removeConsole: isStaticExport ? { exclude: ['error'] } : false,
    emotion: true,
  },

  // 性能优化配置
  compress: true,
  
  // Server Actions 配置
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: isStaticExport,
  },

  // 静态导出配置（仅在构建时启用）
  ...(isStaticExport && !isDev && {
    output: "export",
    distDir: 'out',
    trailingSlash: true,
    basePath: (process.env.CUSTOM_DOMAIN === 'true' || process.env.NEXT_PUBLIC_SITE_URL === 'https://blog.xinchengp.cn') ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || ''),
    assetPrefix: (process.env.CUSTOM_DOMAIN === 'true' || process.env.NEXT_PUBLIC_SITE_URL === 'https://blog.xinchengp.cn') ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || ''),
    images: {
      unoptimized: true,
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**",
        },
      ],
    },
    env: {
      NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
      NEXT_PUBLIC_GITHUB_REPO_NAME: process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || '',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
      CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN || 'false',
    },
  }),

  // 开发环境配置（支持 Server Actions）
  ...(isDev && {
    output: undefined,
    basePath: '',
    assetPrefix: '',
  }),

  env: {
    IS_STATIC_EXPORT: isStaticExport.toString(),
    NEXT_PUBLIC_IS_STATIC_EXPORT: isStaticExport.toString(),
    NEXT_PUBLIC_GITHUB_REPO_NAME: repoName,
  },

  pageExtensions: ["tsx", "ts", "jsx", "js"],

  generateBuildId: async () => {
    return new Date().getTime().toString();
  },

  poweredByHeader: false,

  productionBrowserSourceMaps: !isStaticExport,

  ...(isStaticExport ? {} : {
    headers: async () => {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
            // 严格传输安全 - 强制HTTPS
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload',
            },
            // 内容类型选项 - 防止MIME类型嗅探攻击
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            // 框架选项 - 点击劫持防护
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            // XSS防护 - 启用浏览器XSS过滤器
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            // 引用策略 - 控制referrer信息
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            // 权限策略 - 限制浏览器功能
            {
              key: 'Permissions-Policy',
              value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
            },
            // 跨域打开策略
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            // 内容安全策略 - 防止XSS和数据注入
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://giscus.app https://v6.51.la https://sdk.51.la https://www.google-analytics.com https://www.googletagmanager.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: blob: https: http:",
                "font-src 'self' https://fonts.gstatic.com data:",
                "connect-src 'self' https://api.github.com https://giscus.app https://v6.51.la https://sdk.51.la https://www.google-analytics.com",
                "media-src 'self' https: http:",
                "object-src 'none'",
                "frame-src https://giscus.app https://*.github.com",
                "frame-ancestors 'self' https://*.github.io",
                "form-action 'self'",
                "base-uri 'self'",
                "upgrade-insecure-requests",
              ].join('; '),
            },
          ],
        },
        {
          source: '/api/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, max-age=0',
            },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
