/**
 * 判断是否为静态导出模式
 * 规则：
 * 1. 开发环境 (NODE_ENV=development) 永远不是静态导出模式
 * 2. 只有显式设置 STATIC_EXPORT=true 或 NEXT_PRIVATE_STATIC_EXPORT=true 时才启用静态导出
 * 3. 生产环境默认不启用静态导出，除非显式设置
 */

/*
  安全策略统一从 src/utils 派生，避免白名单在多处硬编码而不同步：
  - src/utils/cspSources.ts                域名白名单唯一数据源
  - src/utils/cspConfig.ts 的 productionCSP 生产严格策略
  - generateCSPString                       负责把策略对象序列化为字符串

  这里使用相对路径而非 @/ 别名：next.config.ts 由 Next.js 在 Node 构建环境加载，
  此时 tsconfig 的 path 别名未必生效，相对路径最稳妥。
*/
import { productionCSP, developmentServerCSP, generateCSPString } from './src/utils/cspConfig';

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
    /*
      白名单而非 hostname: '**'：宽松配置会让 dev/SSR 模式的
      /_next/image?url=... 端点成为可被滥用的开放图片代理。
      静态导出模式 images.unoptimized = true，/_next/image 端点不存在，
      此白名单在 GitHub Pages 生产环境不参与工作；这里主要约束本地开发。
      新增图床时在下面追加一行即可。
    */
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: 'cdnjs.cloudflare.com' },
      { protocol: 'https', hostname: 'api.qijieya.cn' },
      { protocol: 'https', hostname: 'api.injahow.cn' },
      { protocol: 'https', hostname: 'i0.hdslb.com' },
      { protocol: 'https', hostname: 'i1.hdslb.com' },
      { protocol: 'https', hostname: 'i2.hdslb.com' },
    ],
    unoptimized: isStaticExport,
  },

  env: {
    IS_STATIC_EXPORT: isStaticExport.toString(),
    NEXT_PUBLIC_IS_STATIC_EXPORT: isStaticExport.toString(),
    NEXT_PUBLIC_GITHUB_REPO_NAME: repoName,
  },

  pageExtensions: ["tsx", "ts", "jsx", "js"],

  /*
    不再自定义 generateBuildId：
    原实现用 new Date().getTime()，每次构建都产生新 id，
    两次部署之间回访用户的 RSC/预取缓存全部失效。
    删除后 Next 使用默认的构建 id 生成策略。
  */

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
  /*
    本地开发把互动接口（浏览量/表情/订阅，cloudflare/interactions Worker）
    转发到 wrangler dev 的默认端口。生产环境不需要：Cloudflare 的
    blog.xinchengp.cn/api/interactions/* 路由在静态站点之前接管请求，
    前端统一请求同源 /api/interactions/*，两种环境代码零差异。

    wrangler 未启动时转发会连接失败，前端已做静默降级，不影响页面。
  */
  rewrites: async () => [
    {
      source: '/api/interactions/:path*',
      destination: `${process.env.INTERACTIONS_DEV_URL || 'http://127.0.0.1:8787'}/api/interactions/:path*`,
    },
  ],
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
            /*
              开发服务器的 CSP 响应头。

              白名单不再在此硬编码：域名统一登记在 src/utils/cspSources.ts，
              由 src/utils/cspConfig.ts 按指令组装，这里只负责把它序列化成字符串。

              这里使用 developmentServerCSP 而非 productionCSP：
              它仅额外放行 'unsafe-eval'（React Refresh / 调试工具需要），
              connect-src 等其余指令与线上完全一致，
              既避免开发环境被 eval 拦截，也不会像 developmentCSP 那样放宽连接来源、
              从而掩盖真实的 CSP 拦截问题。

              includeFrameAncestors: true —— 这里是 HTTP 响应头场景，
              frame-ancestors 指令可以且需要下发（meta 标签不支持该指令）。
            */
            key: 'Content-Security-Policy',
            value: isDev
              ? generateCSPString(developmentServerCSP, { includeFrameAncestors: true })
              : generateCSPString(productionCSP, { includeFrameAncestors: true }),
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
    // 白名单与 baseConfig 保持一致；unoptimized 下实际不参与构建，
    // 仅在将来切换 SSR 部署时生效（见 baseConfig 中的说明）
    remotePatterns: baseConfig.images.remotePatterns,
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
