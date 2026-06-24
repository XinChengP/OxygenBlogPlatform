/**
 * 判断是否为静态导出模式
 * 规则：
 * 1. 开发环境 (NODE_ENV=development) 永远不是静态导出模式
 * 2. 只有显式设置 STATIC_EXPORT=true 或 NEXT_PRIVATE_STATIC_EXPORT=true 时才启用静态导出
 * 3. 生产环境默认不启用静态导出，除非显式设置
 */
const isStaticExport = process.env.NODE_ENV !== 'development' && 
  (String(process.env.STATIC_EXPORT).toLowerCase() === 'true' || 
   String(process.env.NEXT_PRIVATE_STATIC_EXPORT).toLowerCase() === 'true');

/**
 * 判断是否为开发环境
 */
const isDev = process.env.NODE_ENV === 'development';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

// 基础配置
const baseConfig = {
  reactStrictMode: true,

  // 禁用左下角 Next.js 开发者指示器（Turbopack 浮层）
  devIndicators: false,

  // 允许的开发环境来源 - 解决跨域问题
  allowedDevOrigins: ['100.143.40.229', 'localhost'],

  // 静态导出模式下使用 webpack，以确保别名配置生效
  // 开发模式使用 Turbopack（Next.js 16 默认）
  turbopack: isStaticExport ? undefined : {},

  compiler: {
    reactRemoveProperties: isStaticExport,
    removeConsole: isStaticExport ? { exclude: ['error'] } : false,
    emotion: true,
  },

  // 性能优化配置
  compress: true,
  
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
};

// 开发环境配置（支持 Server Actions）
const devConfig = {
  ...baseConfig,
  experimental: isStaticExport ? undefined : {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  output: undefined,
  basePath: '',
  assetPrefix: '',
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://giscus.app https://v6.51.la https://sdk.51.la https://static.cloudflareinsights.com https://www.google-analytics.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://giscus.app",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://api.github.com https://giscus.app https://v6.51.la https://sdk.51.la https://collect-v6.51.la https://v1.hitokoto.cn https://cloudflareinsights.com https://www.google-analytics.com https://api.i-meto.com",
              "media-src 'self' https: http:",
              "object-src 'none'",
              "frame-src https://giscus.app https://*.github.com https://player.bilibili.com",
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
};

// 静态导出配置（GitHub Pages）
const staticConfig = {
  ...baseConfig,
  output: "export",
  distDir: 'out',
  trailingSlash: true,
  basePath: (process.env.CUSTOM_DOMAIN === 'true' || process.env.NEXT_PUBLIC_SITE_URL === 'https://blog.xinchengp.cn') ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || ''),
  assetPrefix: (process.env.CUSTOM_DOMAIN === 'true' || process.env.NEXT_PUBLIC_SITE_URL === 'https://blog.xinchengp.cn') ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || ''),
  // 静态导出模式下禁用 Server Actions
  experimental: undefined,
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
    ...baseConfig.env,
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
    NEXT_PUBLIC_GITHUB_REPO_NAME: process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || '',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
    CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN || 'false',
  },
  // 静态导出使用 webpack 构建，避免 Turbopack 生产构建偶发缺失 chunk 的问题
  // 静态导出构建前会通过 prepare-static-export.js 脚本将带 'use server' 的 actions 替换为空实现
};

// 根据环境选择配置
const nextConfig = isStaticExport ? staticConfig : devConfig;

export default nextConfig;
