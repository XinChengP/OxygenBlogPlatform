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
            /*
              开发环境的缓存策略（必须禁用强缓存）

              原值为 public, max-age=31536000, immutable，即「一年强缓存 + 永不重新验证」。
              这在开发模式下是有害的，原因有二：
              1. dev 模式产出的 chunk 文件名不含内容哈希（形如
                 src_app_blogs_[slug]_ClientBlogDetail_tsx_41968b2e._.js，
                 其中 41968b2e 是稳定的模块图标识，不随源码内容变化）。
              2. immutable 的语义是「此资源永远不会改变」，浏览器据此不再发请求，
                 连硬刷新（Ctrl+Shift+R）也不会重新验证。

              两者叠加的结果：改了源码、甚至重启了 dev server，
              浏览器仍在使用旧 chunk，表现为「改代码不生效」或
              「HMR 报某模块的模块工厂不存在（module factory is not available）」。

              因此开发环境改为 no-store，让每次请求都拿最新内容。
              注意：生产环境走 staticConfig，其未配置 headers 字段，不受此处影响，
              GitHub Pages 上仍由各平台默认策略处理。
            */
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
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
              "connect-src 'self' https://api.github.com https://giscus.app https://v6.51.la https://sdk.51.la https://collect-v6.51.la https://v1.hitokoto.cn https://cloudflareinsights.com https://www.google-analytics.com https://api.injahow.cn",
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
      {
        /*
          评论区自定义主题样式表的跨域许可（仅开发环境需要）

          背景：评论区由 giscus.app 域下的 iframe 渲染，它通过
          <link rel="stylesheet" crossorigin="anonymous"> 加载本站的
          /giscus-theme/giscus-light.css 与 giscus-dark.css。
          带 crossorigin 的标签属于跨域请求，服务器必须回 Access-Control-Allow-Origin，
          否则浏览器会拒绝应用该样式表，评论区只能回落到 giscus 默认外观。

          线上 blog.xinchengp.cn 由 Cloudflare 统一返回 ACAO: *（实测连 404 响应都带此头），
          因此生产环境不需要这条配置；但 Next.js 的 dev server 默认不发送该头，
          会导致本地开发时完全看不到自定义主题的效果。

          注意：此 headers 配置只在开发环境生效（生产走 staticConfig，其未配置 headers 字段），
          所以这条仅用于让本地预览与线上行为保持一致，不会影响线上。
          样式表是公开静态资源，不含任何隐私数据，故允许任意来源读取。
        */
        source: '/giscus-theme/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
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
