const isStaticExport = process.env.NODE_ENV === 'production' || process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  // 实验性功能
  experimental: {
    // 优化包导入 - 移除有问题的react-syntax-highlighter
    optimizePackageImports: ["react-markdown", "remark-gfm", "rehype-katex", "framer-motion", "lucide-react", "@heroicons/react"],
    // 启用现代CSS特性
    optimizeCss: true,
    // 优化构建性能
    webpackBuildWorker: true,
    // 滚动恢复配置
    scrollRestoration: true,
    // 优化内存使用
    workerThreads: false,
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
  
  // 性能优化配置 - 移除重复的swcMinify配置
  // 启用HTTP压缩
  compress: true,
  
  // GitHub Pages静态导出配置
  ...(isStaticExport && {
    // 静态导出配置
    output: "export",
    distDir: 'out',
    trailingSlash: true,
    
    // GitHub Pages basePath配置
    basePath: `/${repoName}`,
    assetPrefix: `/${repoName}`,
    
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
  
  // 压缩配置
  compress: true,
  
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
  webpack: (config, { isServer }) => {
    // 优化chunk分割
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // 第三方库单独打包
          ...['react', 'react-dom', 'framer-motion', 'next'].reduce((acc, name) => {
            acc[name] = {
              name,
              priority: 30,
              test: new RegExp(`[\\/]node_modules[\\/]${name}[\\/]`),
              chunks: 'all',
            };
            return acc;
          }, {} as any),
        },
      };
    }
    
    // 优化解析
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  
  // 头部优化
  poweredByHeader: false,
  
  // 生成源映射（仅在开发环境）
  productionBrowserSourceMaps: !isStaticExport,
};

export default nextConfig;