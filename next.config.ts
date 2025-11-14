const isStaticExport = process.env.NODE_ENV === 'production';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  // 跳过API路由的静态生成
  skipTrailingSlashRedirect: true,
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ["react-markdown", "remark-gfm", "rehype-katex"]
  },
  // 启用严格模式
  reactStrictMode: true,
  
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
};

export default nextConfig;