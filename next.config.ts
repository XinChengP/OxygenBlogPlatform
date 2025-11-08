const nextConfig = {
  // 只在构建时启用静态导出，开发时禁用以避免 generateStaticParams 错误
  // 注释掉静态导出配置，因为API路由不支持静态导出
  // ...(process.env.NODE_ENV === "production" && { output: "export" }),
  trailingSlash: true,
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
  // 静态导出时的资源前缀配置
  ...(process.env.NODE_ENV === "production" && {
    // 动态获取仓库名，支持多种方式：
    // 1. 环境变量 GITHUB_REPOSITORY (格式: owner/repo)
    // 2. 环境变量 REPO_NAME (直接设置仓库名)
    // 3. 默认从 package.json 的 name 字段获取
    // 特殊处理：如果是 username.github.io 仓库，不设置 basePath
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
    // 移除assetPrefix，basePath已经足够处理资源路径
  }),
  images: {
    // 使用新的remotePatterns配置替代已弃用的domains配置
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
    // 图片格式优化
    formats: ["image/webp", "image/avif"],
    // 静态导出时必须禁用图片优化
    unoptimized: process.env.NODE_ENV === "production",
    // 图片尺寸配置
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // 启用实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ["react-markdown", "remark-gfm", "rehype-katex"],
  },
  // 压缩配置
  compress: true,
  // 确保正确处理Unicode字符
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  // 只在非静态导出模式下启用rewrites
  ...(process.env.NODE_ENV !== "production" && {
    async rewrites() {
      return {
        beforeFiles: [],
        afterFiles: [],
        fallback: [],
      };
    },
  }),
};

export default nextConfig;
