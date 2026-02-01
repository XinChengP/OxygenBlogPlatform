const isStaticExport = process.env.NODE_ENV === 'production' || process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ["react-markdown", "remark-gfm", "rehype-katex", "framer-motion", "lucide-react", "@heroicons/react"],
    // 启用现代CSS特性
    optimizeCss: true,
    // 优化构建性能
    webpackBuildWorker: true,
    // 滚动恢复配置
    scrollRestoration: true,
    // 优化内存使用
    workerThreads: false,
    // 启用客户端路由缓存
    clientRouterFilter: true,
  },
  // 启用严格模式
  reactStrictMode: true,
  
  // 编译优化
  compiler: {
    // 移除React开发时的prop-types检查（生产环境）
    reactRemoveProperties: isStaticExport,
    // 移除console.*语句（生产环境）
    removeConsole: isStaticExport ? { exclude: ['error'] } : false,
    // 启用 emotion 优化
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
  
  // 模块化导入优化 - 修复配置问题
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
      preventFullImport: true,
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
      preventFullImport: true,
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      preventFullImport: true,
    },
    'framer-motion': {
      transform: 'framer-motion/{{member}}',
      preventFullImport: true,
    },
  },
  
  // 缓存配置
  generateBuildId: async () => {
    // 使用当前时间戳作为构建ID，确保每次构建都是唯一的
    return new Date().getTime().toString();
  },
  
  // 优化打包
    webpack: (config: any, { isServer }: { isServer: boolean }) => {
      // 优化chunk分割策略，减少首屏加载资源
      if (!isServer) {
        // 配置更细粒度的chunk分割
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          // 启用chunk分割
          chunks: 'all',
          // 最小chunk大小，太小的chunk会增加HTTP请求
          minSize: 15000,
          // 最大chunk大小，太大的chunk会影响加载速度
          maxSize: 180000,
          // 最小引用次数
          minChunks: 1,
          // 最大异步请求数
          maxAsyncRequests: 35,
          // 最大初始请求数
          maxInitialRequests: 35,
          // 使用更清晰的chunk名称
          name: false,
          cacheGroups: {
            // 基础vendor chunk，包含react、react-dom等核心库
            vendor: {
              name: 'vendor-core',
              chunks: 'initial',
              test: /[\\/]node_modules[\\/](react|react-dom|next|next-themes|clsx|tailwind-merge)[\\/]/,
              priority: 25,
            },
            // 工具库chunk
            utilities: {
              name: 'vendor-utilities',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](dompurify|katex)[\\/]/,
              priority: 20,
            },
            // markdown相关库
            markdown: {
              name: 'vendor-markdown',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](marked|react-markdown|rehype|remark|gray-matter)[\\/]/,
              priority: 15,
            },
            // 图标库chunk
            icons: {
              name: 'vendor-icons',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](lucide-react|@heroicons)[\\/]/,
              priority: 12,
            },
            // 动画相关库
            animation: {
              name: 'vendor-animation',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](framer-motion|@tsparticles|motion)[\\/]/,
              priority: 10,
            },
            // 代码高亮相关库
            highlight: {
              name: 'vendor-highlight',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](highlight.js|react-syntax-highlighter)[\\/]/,
              priority: 9,
            },
            // 其他node_modules库
            defaultVendors: {
              name: 'vendor-other',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 5,
              reuseExistingChunk: true,
            },
            // 应用代码chunk - 按功能模块分割
            app: {
              name: 'app',
              chunks: 'all',
              test: /[\\/]src[\\/](app|components)[\\/]/,
              priority: 3,
              minChunks: 2,
              reuseExistingChunk: true,
            },
            // 其他代码
            default: {
              minChunks: 2,
              priority: 0,
              reuseExistingChunk: true,
            },
          },
        };
        
        // 开发环境禁用runtimeChunk，避免chunk加载问题
        if (!isStaticExport) {
          config.optimization.runtimeChunk = false;
        }
      }
    
    // 优化解析
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      path: false,
    };
    
    // 优化资源加载
    config.module.rules.push(
      {
        test: /\.(png|jpg|gif|webp|avif)$/,
        type: 'asset',
        generator: {
          filename: 'static/[hash][ext]',
        },
        parser: {
          dataUrlCondition: {
            maxSize: 8192, // 8KB以下的图片转为base64
          },
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/fonts/[hash][ext]',
        },
      }
    );
    
    return config;
  },
  
  // 头部优化
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