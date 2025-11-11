const nextConfig = {
  // 跳过API路由的静态生成
  skipTrailingSlashRedirect: true,
  // 顶层配置
  serverExternalPackages: ['all'],
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ["react-markdown", "remark-gfm", "rehype-katex"]
  },
  // 禁用RSC
  reactStrictMode: false,
  
  // 只在生产模式下启用静态导出和GitHub Pages配置
  ...(process.env.NODE_ENV === "production" && {
    // GitHub Pages静态导出配置
    output: "export",
    // 使用out目录作为输出目录
    distDir: 'out',
    trailingSlash: true,
    
    // 静态导出时的资源前缀配置
    basePath: (() => {
      if (!process.env.GITHUB_ACTIONS) return "";
      
      const repoName = process.env.REPO_NAME || 
                      process.env.GITHUB_REPOSITORY?.split("/")[1] || 
                      "blog-platform";
      
      // 如果仓库名以 .github.io 结尾，说明是用户主页仓库，不需要 basePath
      if (repoName.endsWith(".github.io")) {
        return "";
      }
      
      return `/${repoName}`;
    })(),
    
    // 图片配置（仅在静态导出模式下需要）
    images: {
      // 使用新的remotePatterns配置
      remotePatterns: [
        {
          protocol: "https",
          hostname: "nextjs.org",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "tailwindcss.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "vercel.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "github.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "developer.mozilla.org",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "stackoverflow.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "images.unsplash.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "cdn.jsdelivr.net",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "raw.githubusercontent.com",
          pathname: "/**",
        },
      ],
      // 静态导出时必须禁用图片优化
      unoptimized: true,
    },
  }),
  
  // 环境变量配置，供客户端组件使用
  env: {
    NEXT_PUBLIC_BASE_PATH: (() => {
      if (!process.env.GITHUB_ACTIONS) return "";
      
      const repoName = process.env.REPO_NAME || 
                      process.env.GITHUB_REPOSITORY?.split("/")[1] || 
                      "blog-platform";
      
      // 如果仓库名以 .github.io 结尾，说明是用户主页仓库，不需要 basePath
      if (repoName.endsWith(".github.io")) {
        return "";
      }
      
      return `/${repoName}`;
    })()
  },
  
  // 压缩配置
  compress: true,
  
  // 确保正确处理Unicode字符
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  
  // 只在非静态导出模式下启用重写规则
  ...(process.env.NODE_ENV !== "production" && {
    async rewrites() {
      return [
        // 开发模式下的重写规则
      ];
    },
  }),
};

export default nextConfig;