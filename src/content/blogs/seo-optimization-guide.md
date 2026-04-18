---
title: "怎么在搜索引擎找到博客？"
date: "2026-04-12"
category: "技术"
tags: ["nextjs", "seo", "github pages", "教程"]
excerpt: "这能被搜到多是一件美逝啊"
coverImage: "/Blogabout/seo-optimization-guide/cover.jpg"
---
## 〇、背景

闲来无事看大佬们的博客，发现他们的博客都可由用高级搜索搜到，我就对我的博客逝了世、、、结果嘛23333
![啊哈哈哈哈哈，只有我当冤大头买的那个服务器的搜索结果，就发了个笨鸥的](/Blogabout/seo-optimization-guide/图一.png)
下面懒得放图片了，就这样吧

> 宇宙安全声明：以下寄术部分全是ai升成的，菜鸡博主嘛也不会
## 一、问题诊断

在优化之前，我在bing搜索 `site:xinchengp.cn` 只能看到主域名，完全找不到 `blog.xinchengp.cn` 的任何内容。扔给ai分析发现问题主要有三个：

1. **缺少 `robots.txt`** - 搜索引擎不知道哪些页面可以抓取
2. **缺少 `sitemap.xml`** - 搜索引擎难以发现网站的所有页面
3. **Metadata 配置过于简单** - 缺少关键词、描述、Open Graph 等 SEO 必需的元数据

> 我嘞个ai大人

## 二、解决方案

### 1. 创建 robots.txt

在 `public/robots.txt` 创建爬虫规则文件：

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Sitemap: https://your-domain.com/sitemap.xml
```

**作用说明：**
- `User-agent: *` - 允许所有搜索引擎爬虫
- `Allow: /` - 允许访问所有页面
- `Disallow: /admin` - 禁止访问后台管理页面
- `Sitemap` - 告诉搜索引擎站点地图的位置

### 2. 创建动态站点地图

Next.js App Router 支持通过 `sitemap.ts` 自动生成站点地图。在 `src/app/sitemap.ts` 创建：

```typescript
import { MetadataRoute } from 'next';

// 强制静态生成，确保与 output: 'export' 兼容
export const dynamic = 'force-static';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页面
  const staticPages = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/blog/`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    // ... 其他页面
  ];
  
  // 动态生成的博客文章页面
  const blogPosts = await getBlogPosts(); // 读取所有文章
  const blogPages = blogPosts.map(post => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: post.updatedAt || post.date,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
  
  return [...staticPages, ...blogPages];
}
```

**关键点：**
- 使用 `export const dynamic = 'force-static'` 确保静态导出兼容
- 自动读取文章目录下的所有文章
- 为不同类型的页面设置不同的优先级和更新频率

### 3. 增强 Metadata 配置

在 `src/app/layout.tsx` 中完善 SEO 元数据：

```typescript
export const metadata: Metadata = {
  // 标题模板
  title: {
    default: "你的博客标题",
    template: "%s | 你的博客标题",
  },
  
  // 详细描述
  description: "你的博客描述，介绍博客内容和主题",
  
  // 关键词
  keywords: ["关键词1", "关键词2", "个人博客", "技术博客"],
  
  // 作者信息
  authors: [{ name: "作者名", url: "https://your-domain.com" }],
  
  // 规范 URL
  alternates: { canonical: "https://your-domain.com" },
  
  // 爬虫配置
  robots: {
    index: true,
    follow: true,
  },
  
  // Open Graph（社交媒体分享）
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://your-domain.com',
    siteName: "你的博客标题",
    title: "你的博客标题",
    description: "你的博客描述...",
    images: [{
      url: 'https://your-domain.com/og-image.png',
      width: 1200,
      height: 630,
    }],
  },

  // 搜索引擎验证
  verification: {
    // Google Search Console 验证
    google: '你的Google验证码',

    // 百度搜索资源平台 + Bing Webmaster Tools 验证
    // 注意：百度和 Bing 都需要放在 other 对象中
    other: {
      'baidu-site-verification': '你的百度验证码',
      'msvalidate.01': '你的Bing验证码',
    },
  },
};
```

## 三、搜索引擎收录

### Google Search Console

1. 访问 https://search.google.com/search-console
2. 选择「网址前缀」，输入 `https://your-domain.com`
3. 选择验证方式：
   - **HTML 文件**：下载验证文件放到 `public/` 目录
   - **HTML 标签**：将 meta 标签添加到 layout.tsx
4. 部署后点击验证
5. 提交站点地图：`https://your-domain.com/sitemap.xml`

### Bing Webmaster Tools

**推荐方式：Import from Google Search Console**

如果已经在 Google Search Console 验证过，可以直接导入：
1. 访问 https://www.bing.com/webmasters
2. 点击「Import」按钮
3. 选择 Google 账号和网站
4. 自动完成验证和站点地图导入

**手动添加方式：**
1. 输入网址 `https://your-domain.com`
2. 选择「HTML Meta Tag」验证
3. 将 Bing 提供的 meta 标签添加到 layout.tsx
4. 部署后点击验证

### 百度站长平台

1. 访问 https://ziyuan.baidu.com/site/index
2. 添加网站 `https://your-domain.com`
3. 选择验证方式（推荐 HTML 文件验证）
4. 提交站点地图

超绝百度我实名认证了愣是说我没认证，服了都

## 四、验证优化效果

部署完成后，可以通过以下方式验证 SEO 优化效果：

1. **检查 robots.txt**：访问 `https://your-domain.com/robots.txt`
2. **检查 sitemap.xml**：访问 `https://your-domain.com/sitemap.xml`
3. **查看页面源码**：确认 meta 标签是否正确渲染
4. **使用搜索引擎**：`site:your-domain.com` 查看收录情况

## 五、收录时间预期

- **Google**：通常几天到几周
- **Bing**：通常较快，几天内
- **百度**：可能需要 1-4 周

> 都是ai说的，实际我也不到

到时候能搜出来再更新

**注意事项：**
- 新网站收录需要时间
- 持续更新优质内容有助于提高收录速度（咕咕咕）
- 可以在搜索引擎站长平台查看抓取和索引状态

## 六、总结

下面有请孱弱的博主说两句：
>阿巴阿巴，这个意大利面就应该拌42号混凝土，因为这个螺丝钉的长度，它很容易会直接影响到挖掘机的扭矩你知道吧，你往里砸的时候，一瞬间它就会产生大量的高能蛋白，俗称UFO，会严重影响经济的发展，甚至对整个太平洋以及充电器都会造成一定的核污染

好的感谢博主发言，再有请超模的ai大人发言
> ヽ(#ﾟДﾟ)ﾉ┌┛Σ(ノ´Д`)ノ

好的我们看到屑博主给ai踹飞了
那我们下次再见，拜拜~

---

**参考链接：**
- [Next.js Metadata 文档](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Sitemap 协议](https://www.sitemaps.org/protocol.html)
