const isStaticExport = process.env.NODE_ENV === 'production' || process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  reactStrictMode: true,

  turbopack: {},

  compiler: {
    reactRemoveProperties: isStaticExport,
    removeConsole: isStaticExport ? { exclude: ['error'] } : false,
    emotion: true,
  },

  // 性能优化配置
  // 启用HTTP压缩
  compress: true,
  // 优化图像加载
  images: {
    // 启用图像优化
    formats: ['image/avif', 'image/webp'],
    // 配置图像域名
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // 静态导出时必须禁用图片优化
    unoptimized: isStaticExport,
  },

  // 静态导出配置
  ...(isStaticExport && {
    // 静态导出配置
    output: "export",
    distDir: 'out',
    trailingSlash: true,

    // 使用环境变量设置basePath和assetPrefix，确保GitHub Pages部署正常
    // 对于静态导出模式，优先使用空字符串作为基础路径
    basePath: (process.env.CUSTOM_DOMAIN === 'true' || process.env.NEXT_PUBLIC_SITE_URL === 'https://blog.xinchengp.cn') ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || ''),
    assetPrefix: (process.env.CUSTOM_DOMAIN === 'true' || process.env.NEXT_PUBLIC_SITE_URL === 'https://blog.xinchengp.cn') ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || ''),

    // 图片配置（仅在静态导出模式下需要）
    images: {
      // 静态导出时必须禁用图片优化
      unoptimized: true,
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**",
        },
      ],
    },

    // 确保环境变量正确注入
    env: {
      NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
      NEXT_PUBLIC_GITHUB_REPO_NAME: process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || '',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
      CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN || 'false',
    },
  }),

  // 开发环境配置（非静态导出）
  ...(!isStaticExport && {
    // 开发环境禁用静态导出
    output: undefined,
    // 开发环境不使用basePath
    basePath: '',
    assetPrefix: '',
  }),

  // 环境变量配置
  env: {
    // 静态导出标识
    IS_STATIC_EXPORT: isStaticExport.toString(),
    // GitHub仓库名
    NEXT_PUBLIC_GITHUB_REPO_NAME: repoName,
  },

  // 确保正确处理Unicode字符
  pageExtensions: ["tsx", "ts", "jsx", "js"],

  // 缓存配置
  generateBuildId: async () => {
    return new Date().getTime().toString();
  },

  poweredByHeader: false,

  // 生成源映射（仅在开发环境）
  productionBrowserSourceMaps: !isStaticExport,

  // 优化HTTP头 (仅在非静态导出模式下启用)
  ...(isStaticExport ? {} : {
    headers: async () => {
      return [
        {
          // 所有路由
          source: '/:path*',
          headers: [
            // 缓存静态资源
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
            // 预连接到关键域名
            {
              key: 'Link',
              value: '<https://fonts.googleapis.com>; rel=preconnect; crossorigin',
            },
            // 启用HSTS
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload',
            },
            // 防止XSS攻击
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            // 防止点击劫持
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            // 防止MIME类型嗅探
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
          ],
        },
        // API路由不缓存
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
