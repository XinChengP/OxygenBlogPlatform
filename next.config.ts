const isStaticExport = process.env.NODE_ENV === 'production';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ["react-markdown", "remark-gfm", "rehype-katex", "framer-motion", "lucide-react"],
    // 启用现代CSS特性
    optimizeCss: true,
    // 优化构建性能
    webpackBuildWorker: true,
    // 启用React 18的并发特性
    reactRoot: true,
  },
  // 启用严格模式
  reactStrictMode: true,
  
  // 生产环境优化
  swcMinify: true,
  
  // 编译优化
  compiler: {
    // 移除React开发时的prop-types检查（生产环境）
    reactRemoveProperties: isStaticExport,
    // 移除console.*语句（生产环境）
    removeConsole: isStaticExport ? { exclude: ['error'] } : false,
  },
  
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
  
  // 性能优化：模块化导入
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  
  // 头部优化
  poweredByHeader: false,
  
  // 生成源映射（仅在开发环境）
  productionBrowserSourceMaps: !isStaticExport,
};

export default nextConfig;