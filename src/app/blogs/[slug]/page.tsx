import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import BlogDetailWrapper from '@/app/blogs/[slug]/BlogDetailWrapper';
import 'highlight.js/styles/github-dark.css';
import { formatBlogDate, calculateReadingTime } from '@/utils';
import { getSortedRelatedPosts, type RelatedPost } from '@/utils/relatedPostsUtils';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

/**
 * 博客详情页面的 Props 接口
 * 
 * @interface BlogDetailPageProps
 * @property params - 包含路由参数的 Promise 对象
 * @property params.slug - 博客文章的唯一标识符
 */
interface BlogDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * 博客文章数据结构接口
 * 
 * @interface BlogPost
 * @property title - 文章标题
 * @property date - 发布日期
 * @property category - 文章分类
 * @property tags - 文章标签数组
 * @property readTime - 预估阅读时间（分钟）
 * @property excerpt - 文章摘要
 * @property content - 文章正文内容（Markdown 格式）
 * @property slug - 文章的唯一标识符
 * @property author - 文章作者
 * @property series - 文章系列
 * @property seriesOrder - 系列顺序
 * @property coverImage - 封面图片路径
 * @property language - 文章语言
 * @property canonicalUrl - 规范URL
 * @property seoTitle - SEO标题
 * @property seoDescription - SEO描述
 */
interface BlogPost {
  title: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  readTime: number;
  excerpt: string;
  content: string;
  slug: string;
  author?: string;
  series?: string;
  seriesOrder?: number;
  coverImage?: string;
  language?: string;
  canonicalUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  reference?: Array<{description: string; link: string}>;
  pinned?: boolean;
  pinnedAt?: string;
  hidden?: boolean;
}

interface SeriesArticle {
  title: string;
  slug: string;
  seriesOrder: number;
  date: string;
}

/**
 * Markdown 文件前置元数据（Front Matter）的类型定义
 * 用于 gray-matter 解析 Markdown 文件头部的 YAML 数据
 * 
 * @interface BlogFrontMatter
 * @property title - 可选的文章标题
 * @property date - 可选的发布日期
 * @property category - 可选的文章分类
 * @property tags - 可选的文章标签数组
 * @property readTime - 可选的预估阅读时间
 * @property excerpt - 可选的文章摘要
 * @property [key: string] - 允许其他未知属性的索引签名
 */
interface BlogFrontMatter {
  title?: string;
  date?: string;
  updatedAt?: string;
  category?: string;
  tags?: string[];
  readTime?: number;
  excerpt?: string;
  coverImage?: string;
  series?: string;
  reference?: Array<{description: string; link: string}>;
  pinned?: boolean;
  pinnedAt?: string;
  /*
    hidden 支持布尔值与字符串两种写法。
    这与博客列表页 BlogFrontMatter 的定义保持一致：
    YAML 中若写成 hidden: "true"（带引号）会被解析为字符串，
    只判断布尔值会导致这类文章在列表页隐藏、却在详情页的推荐区泄漏。
  */
  hidden?: boolean | string;
  [key: string]: any; // 允许其他未知属性
}

/**
 * 递归查找指定 slug 对应的 .md 文件
 * 
 * @param dir - 要搜索的目录
 * @param baseDir - 基础目录，用于计算相对路径
 * @param targetSlug - 目标 slug
 * @returns 找到的文件信息或 null
 */
function findMarkdownFileBySlug(dir: string, baseDir: string, targetSlug: string): {filePath: string, relativePath: string} | null {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 递归搜索子目录
        const result = findMarkdownFileBySlug(itemPath, baseDir, targetSlug);
        if (result) return result;
      } else if (item.endsWith('.md')) {
        // 检查这个文件是否匹配目标 slug
        const relativePath = path.relative(baseDir, itemPath);
        const fileSlug = relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');
        
        if (fileSlug === targetSlug) {
          return {
            filePath: itemPath,
            relativePath
          };
        }
      }
    }
  } catch (error) {
    console.error(`Error searching directory ${dir}:`, error);
  }
  
  return null;
}

/**
 * 根据 slug 获取博客文章内容
 * 
 * 支持深层嵌套的单文件模式：
 * - 递归搜索 /content/blogs 目录下的所有 .md 文件
 * - 支持任意深度的文件夹嵌套
 * - 基于路径生成的 slug 进行匹配
 * - 支持外部图片引用（相对路径和绝对路径）
 * 
 * 标题处理逻辑：
 * - 如果元数据中有 title，使用元数据中的 title
 * - 如果没有 title，使用文件名（去除 .md 扩展名）作为标题
 * 
 * @param slug - 博客文章的唯一标识符（基于路径生成）
 * @returns Promise<BlogPost | null> - 返回博客文章数据或 null（如果文章不存在）
 */
async function getBlogContent(slug: string): Promise<BlogPost | null> {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    
    // 查找匹配 slug 的 .md 文件
    const fileInfo = findMarkdownFileBySlug(contentDir, contentDir, slug);
    
    if (!fileInfo) {
      return null;
    }
    
    const { filePath } = fileInfo;
    
    // 读取文件内容，使用 UTF-8 编码处理中文
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let { data, content } = matter(fileContent);
    
    // 类型断言，确保 data 符合 BlogFrontMatter 接口
    const frontMatter = data as BlogFrontMatter;
    
    // 处理图片路径 - 将所有相对路径图片指向 public 目录
    content = content.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
      (match, alt, src: string) => {
        // 如果是相对路径，转换为 public 目录路径
        if (src.startsWith('./') || src.startsWith('../') || (!src.startsWith('/') && !src.startsWith('http'))) {
          // 处理相对路径，统一指向 public 目录
          let publicPath = src;
          
          // 移除相对路径前缀
          if (src.startsWith('./')) {
            publicPath = src.substring(2);
          } else if (src.startsWith('../')) {
            // 处理 ../assets/example.svg 这样的路径
            publicPath = src.replace(/^\.\.\//, '');
          }
          
          // 确保路径以 / 开头
          if (!publicPath.startsWith('/')) {
            publicPath = '/' + publicPath;
          }
          
          return `![${alt}](${publicPath})`;
        }
        
        // 保持原始路径（绝对路径或外部链接）
        return match;
      }
    );
    
    // 处理 HTML <img> 标签中的图片路径
    content = content.replace(
      /<img\s+([^>]*?)src=["'](?!https?:\/\/)([^"']+)["']([^>]*?)>/g,
      (match, before, src: string, after) => {
        // 如果是相对路径，转换为 public 目录路径
        if (src.startsWith('./') || src.startsWith('../') || (!src.startsWith('/') && !src.startsWith('http'))) {
          // 处理相对路径，统一指向 public 目录
          let publicPath = src;
          
          // 移除相对路径前缀
          if (src.startsWith('./')) {
            publicPath = src.substring(2);
          } else if (src.startsWith('../')) {
            // 处理 ../assets/example.svg 这样的路径
            publicPath = src.replace(/^\.\.\//, '');
          }
          
          // 确保路径以 / 开头
          if (!publicPath.startsWith('/')) {
            publicPath = '/' + publicPath;
          }
          
          return `<img ${before}src="${publicPath}"${after}>`;
        }
        
        // 保持原始路径（绝对路径或外部链接）
        return match;
      }
    );
    
    // 标题处理：优先使用元数据中的 title，否则使用文件名
    const fileName = path.basename(filePath, '.md');
    const title = frontMatter.title || fileName;
    
    // 自动计算阅读时长，如果元数据中已有readTime则优先使用
    const readTime = frontMatter.readTime || calculateReadingTime(content);
    
    // 处理封面图片路径 - 与内容中的图片路径处理保持一致
    let processedCoverImage = frontMatter.coverImage;
    if (processedCoverImage && !processedCoverImage.startsWith('http') && !processedCoverImage.startsWith('/')) {
      // 如果是相对路径，转换为绝对路径
      if (processedCoverImage.startsWith('./')) {
        processedCoverImage = processedCoverImage.substring(2);
      } else if (processedCoverImage.startsWith('../')) {
        processedCoverImage = processedCoverImage.replace(/^\.\.\//, '');
      }
      if (!processedCoverImage.startsWith('/')) {
        processedCoverImage = '/' + processedCoverImage;
      }
    }
    
    return {
      title: title,
      date: formatBlogDate(frontMatter.date),
      updatedAt: frontMatter.updatedAt ? formatBlogDate(frontMatter.updatedAt) : undefined,
      category: frontMatter.category || '其他',
      tags: frontMatter.tags || [],
      readTime: readTime,
      excerpt: frontMatter.excerpt || '',
      content: content,
      slug: slug,
      author: frontMatter.author,
      series: frontMatter.series,
      seriesOrder: frontMatter.seriesOrder,
      coverImage: processedCoverImage,
      language: frontMatter.language,
      canonicalUrl: frontMatter.canonicalUrl,
      seoTitle: frontMatter.seoTitle,
      seoDescription: frontMatter.seoDescription,
      reference: frontMatter.reference,
      pinned: frontMatter.pinned || false,
      pinnedAt: frontMatter.pinnedAt ? formatBlogDate(frontMatter.pinnedAt) : undefined,
      /*
        hidden 需要显式归一化为布尔值。
        不能写成 frontMatter.hidden || false：YAML 中 hidden: "false" 会被解析为字符串，
        而字符串 'false' 本身是真值，会让本应可见的文章被误判为隐藏。
      */
      hidden: frontMatter.hidden === true || frontMatter.hidden === 'true'
    };
  } catch (error) {
    console.error('Error reading blog content:', error);
    return null;
  }
}

/**
 * 从 public/LTY_Picture 图集中为文章挑选一张分享配图
 *
 * 为什么不用「真随机」：
 * 本站采用静态导出（output: 'export'），所有 HTML 与页面元数据都在构建期一次性生成，
 * 运行时既没有服务端也没有数据接口，因此无法实现「每次访问随机换一张图」。
 *
 * 这里采用「构建期读取目录 + slug 稳定散列」的方案，兼顾两点体验：
 * - 不同文章会命中不同配图，看起来是随机分配的
 * - 同一篇文章每次构建结果固定，避免社交平台反复抓取时缩略图来回跳变
 *
 * @param slug - 文章的唯一标识符，同时作为散列的种子
 * @returns 站内路径形式的图片地址（以 / 开头）；目录不存在或无可用图片时返回 null
 */
function pickRandomShareImage(slug: string): string | null {
  try {
    // 候选图集所在目录：public 目录下的洛天依图片
    const imageDir = path.join(process.cwd(), 'public', 'LTY_Picture');

    // 只保留常见图片格式，排除目录中的 mp4 等视频文件
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];

    const candidates = fs
      .readdirSync(imageDir)
      // 先过滤扩展名，再确认是文件而非同名目录
      .filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()))
      .filter((file) => fs.statSync(path.join(imageDir, file)).isFile())
      // 排除 og-image.png：它是为上一步专门裁出来的分享兜底图，不属于图集原始成员。
      // 若留在池中，会与下方的兜底逻辑重复，且某些 slug 恰好命中它时，
      // 会让人误以为随机逻辑没有生效
      .filter((file) => file !== 'og-image.png')
      // 必须排序：readdirSync 的原始顺序依赖文件系统，
      // 不排序会导致不同机器、不同次构建挑到不同的图，破坏结果的稳定性
      .sort();

    if (candidates.length === 0) {
      return null;
    }

    // 稳定散列：以 31 为权重逐字符累乘，再用 >>> 0 转成 32 位无符号整数
    // 相比简单累加，乘法散列能让相近的 slug（如 xxx-1、xxx-2）落到差异更大的位置
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
      hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
    }

    // 文件名可能包含中文（如「别害怕了.jpg」），必须编码后才能安全拼进 URL
    return `/LTY_Picture/${encodeURIComponent(candidates[hash % candidates.length])}`;
  } catch (error) {
    // 目录缺失或读取失败时静默降级，交由调用方使用固定兜底图，不影响元数据生成
    console.error('Error picking random share image:', error);
    return null;
  }
}

/**
 * 生成博客详情页面的 SEO 元数据
 * 
 * @param props - 包含 params 参数的对象
 * @returns 包含 title 和 description 的 Metadata 对象
 */
export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  
  // Next.js 已经自动解码了URL参数，但为了安全起见，我们尝试解码
  let decodedSlug: string;
  try {
    // 检查是否需要解码（如果包含%字符，说明可能是编码的）
    if (resolvedParams.slug.includes('%')) {
      decodedSlug = decodeURIComponent(resolvedParams.slug);
    } else {
      decodedSlug = resolvedParams.slug;
    }
  } catch {
    decodedSlug = resolvedParams.slug;
  }

  const blogData = await getBlogContent(decodedSlug);
  
  if (!blogData) {
    return {
      title: '文章未找到 - OxygenBlogPlatform',
      description: '抱歉，您要查找的文章不存在。'
    };
  }

  // 优先使用元数据中的 SEO 标题和描述，否则使用默认值
  const seoTitle = blogData.title || '博客文章';
  const seoDescription = blogData.excerpt || `阅读这篇关于${blogData.category}的文章，了解更多技术知识。`;

  /**
   * 站点根地址
   *
   * 与 layout.tsx 中的 BASE_URL 取值保持一致，均优先读取环境变量，
   * 未配置时回退到线上正式域名。这里必须使用绝对地址，
   * 因为社交平台抓取页面元数据时无法解析相对路径。
   */
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blog.xinchengp.cn';

  /** 本文的规范访问地址，供社交平台识别链接归属并去重 */
  const articleUrl = blogData.canonicalUrl || `${siteUrl}/blogs/${encodeURIComponent(blogData.slug)}`;

  /**
   * 分享卡片配图
   *
   * 优先使用文章 frontmatter 中的封面图（coverImage），
   * 该字段已在 getBlogContent 中统一处理过路径格式。
   *
   * 需区分两种情况：
   * - 封面为站内相对路径（以 / 开头）：需拼上站点域名，转为社交平台可访问的绝对地址
   * - 封面本身已是完整外链（以 http 开头）：原样使用，重复拼接会导致地址失效
   *
   * 若文章未配置封面，则从 public/LTY_Picture 图集中按 slug 散列挑一张作为配图；
   * 万一图集目录不可用（返回 null），再退回固定默认图，保证分享时始终有图可展示。
   */
  const fallbackImage = pickRandomShareImage(blogData.slug) || '/LTY_Picture/og-image.png';

  const shareImage = blogData.coverImage
    ? blogData.coverImage.startsWith('http')
      ? blogData.coverImage
      : `${siteUrl}${blogData.coverImage}`
    : `${siteUrl}${fallbackImage}`;

  /** 分享配图的替代文本，同时用于图片可访问性 */
  const shareImageAlt = `《${seoTitle}》封面图`;

  return {
    title: `${seoTitle} - OxygenBlogPlatform`,
    description: seoDescription,
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: 'article',
      url: articleUrl,
      siteName: '心想事成的个人博客',
      locale: 'zh_CN',
      publishedTime: blogData.date,
      modifiedTime: blogData.updatedAt,
      authors: blogData.author ? [blogData.author] : undefined,
      tags: blogData.tags,
      // 配图采用数组形式，社交平台会按顺序取第一张作为缩略图
      images: [
        {
          url: shareImage,
          alt: shareImageAlt,
        },
      ],
    },
    twitter: {
      // summary_large_image 表示大图卡片，与上方 openGraph.images 配套使用
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [shareImage],
    }
  };
}

/**
 * 博客详情页面组件（服务端组件）
 * 
 * 功能特点：
 * - 支持动态路由，根据 slug 参数显示对应的博客文章
 * - 在服务端读取 Markdown 文件内容
 * - 将数据传递给客户端组件进行渲染
 * 
 * @param params - 包含 slug 参数的对象
 * @returns 渲染的博客详情页面
 */
export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  // 在服务端获取博客内容
   const resolvedParams = await params;
   
   // Next.js 已经自动解码了URL参数，但为了安全起见，我们尝试解码
   let decodedSlug: string;
   try {
     // 检查是否需要解码（如果包含%字符，说明可能是编码的）
     if (resolvedParams.slug.includes('%')) {
       decodedSlug = decodeURIComponent(resolvedParams.slug);
     } else {
       decodedSlug = resolvedParams.slug;
     }
   } catch {
     decodedSlug = resolvedParams.slug;
   }
  
  const blogData = await getBlogContent(decodedSlug);
  
  if (!blogData) {
    notFound();
  }

  // 如果文章属于系列，获取同系列的其他文章
  let seriesArticles: SeriesArticle[] = [];
  if (blogData.series) {
    seriesArticles = await getSeriesArticles(blogData.series, decodedSlug);
  }

  // 计算相关文章推荐（全体文章参与，按分类/标签/系列/时间多维打分）
  const relatedArticles = await getRelatedArticles(decodedSlug, blogData.date, {
    category: blogData.category,
    tags: blogData.tags,
    series: blogData.series,
  });

  return (
    <BlogDetailWrapper
      blog={blogData}
      seriesArticles={seriesArticles}
      relatedArticles={relatedArticles}
    />
  );
}

// 禁用动态参数，只允许预生成的路由
export const dynamicParams = false;

/**
 * 获取同系列的所有文章（排除当前文章）
 */
async function getSeriesArticles(series: string, currentSlug: string): Promise<SeriesArticle[]> {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);
    
    const seriesArticles: SeriesArticle[] = [];
    
    for (const file of markdownFiles) {
      if (file.slug === currentSlug) continue;
      
      try {
        const fileContent = fs.readFileSync(file.filePath, 'utf8');
        const { data } = matter(fileContent);
        const frontMatter = data as BlogFrontMatter;
        
        if (frontMatter.series === series && !frontMatter.hidden) {
          seriesArticles.push({
            title: frontMatter.title || path.basename(file.filePath, '.md'),
            slug: file.slug,
            seriesOrder: frontMatter.seriesOrder || 0,
            date: formatBlogDate(frontMatter.date),
          });
        }
      } catch {
        // 跳过无法读取的文件
      }
    }
    
    // 按 seriesOrder 排序
    seriesArticles.sort((a, b) => a.seriesOrder - b.seriesOrder);
    
    return seriesArticles;
  } catch (error) {
    console.error('Error getting series articles:', error);
    return [];
  }
}

/**
 * 获取用于「相关文章」推荐的候选列表（已按关联度排序）
 *
 * 与 getSeriesArticles 的分工：
 * - getSeriesArticles 只处理「同系列」这一种强关系，产出系列导航
 * - 本函数则面向全体文章做多维度打分，产出「相关文章」推荐
 * 两者互不替代，可同时展示。
 *
 * 实现要点：
 * - 排除当前文章自身，避免把自己推荐给自己
 * - 排除 hidden 为 true 的文章，与博客列表页保持一致，避免隐藏内容从详情页泄漏
 * - 摘要缺失时退而使用正文前 80 字，保证卡片不会出现空白描述
 * - 所有候选在构建期一次性读取完毕，客户端直接拿结果渲染
 *
 * @param currentSlug - 当前文章的 slug
 * @param currentDate - 当前文章日期，作为时间新鲜度的基准
 * @param context - 当前文章的分类、标签、系列信息，用于打分
 * @returns 按关联度降序排列的相关文章数组
 */
async function getRelatedArticles(
  currentSlug: string,
  currentDate: string,
  context: { category: string; tags: string[]; series?: string }
): Promise<RelatedPost[]> {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');

    if (!fs.existsSync(contentDir)) {
      return [];
    }

    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);
    const candidates: RelatedPost[] = [];

    for (const file of markdownFiles) {
      // 跳过当前文章：推荐自己给自己没有意义
      if (file.slug === currentSlug) continue;

      try {
        const fileContent = fs.readFileSync(file.filePath, 'utf8');
        const { data, content } = matter(fileContent);
        const frontMatter = data as BlogFrontMatter;

        // 跳过隐藏文章，保持与列表页一致的可见性规则（兼容布尔值与字符串 'true' 两种写法）
        if (frontMatter.hidden === true || frontMatter.hidden === 'true') continue;

        const fileName = path.basename(file.filePath, '.md');

        /*
          摘要兜底策略：
          部分文章未填写 excerpt，若直接留空，卡片会出现一块空描述的凹陷。
          这里退而截取正文前 80 个字符，并剔除 Markdown 的常见标记，
          让兜底摘要读起来仍是自然的一段文字而不是符号堆。
        */
        const fallbackExcerpt = content
          .replace(/```[\s\S]*?```/g, '')        // 去掉代码块，代码不适合做摘要
          .replace(/!\[[^\]]*\]\([^)]*\)/g, '')  // 去掉图片语法
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接只保留文字
          /*
            只去掉行首的 Markdown 块级标记（#、>、-、*、数字列表等），
            而不用字符类逐个剔除：
            前者能准确清掉标题与列表符号，后者会把正文里的英文连字符误删，
            例如 machine-learning 会被破坏成 machinelearning。
          */
          .replace(/^[ \t]*(#{1,6}|>|[-*+]|\d+\.)[ \t]+/gm, '')
          .replace(/[*_`~]/g, '')                // 行内强调标记可安全剔除
          .replace(/\s+/g, ' ')                  // 压缩连续空白
          .trim()
          .slice(0, 80);

        // 封面路径处理：与正文图片保持一致，相对路径统一转成以 / 开头的站内路径
        let coverImage = frontMatter.coverImage;
        if (coverImage && !coverImage.startsWith('http') && !coverImage.startsWith('/')) {
          coverImage = coverImage.replace(/^\.\//, '').replace(/^\.\.\//, '');
          coverImage = '/' + coverImage;
        }

        candidates.push({
          title: frontMatter.title || fileName,
          slug: file.slug,
          date: formatBlogDate(frontMatter.date),
          category: frontMatter.category || '其他',
          tags: frontMatter.tags || [],
          excerpt: frontMatter.excerpt || fallbackExcerpt,
          readTime: frontMatter.readTime || calculateReadingTime(content),
          coverImage,
          series: frontMatter.series,
        });
      } catch {
        // 跳过无法读取的文件，单篇异常不应影响整页渲染
      }
    }

    // 交由工具层按多维度加权评分排序，保证服务端与客户端排序逻辑只有一份实现
    return getSortedRelatedPosts(candidates, {
      slug: currentSlug,
      category: context.category,
      tags: context.tags,
      series: context.series,
      date: currentDate,
    });
  } catch (error) {
    console.error('Error getting related articles:', error);
    return [];
  }
}

/**
 * 生成静态参数函数
 * 用于静态导出时预生成所有博客文章的路由参数
 * 
 * @returns 包含所有博客文章 slug 的参数数组
 */
export async function generateStaticParams() {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    
    if (!fs.existsSync(contentDir)) {
      return [];
    }
    
    // 递归扫描所有 .md 文件
    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);
    
    return markdownFiles.map(({ slug }) => ({
      slug: slug  // 不需要在这里编码，Next.js会自动处理
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

/**
 * 递归扫描目录中的 Markdown 文件
 * 
 * @param dir - 要扫描的目录路径
 * @param baseDir - 基础目录路径，用于计算相对路径
 * @returns 包含文件路径、相对路径和 slug 的对象数组
 */
function scanMarkdownFiles(dir: string, baseDir: string): Array<{
  filePath: string;
  relativePath: string;
  slug: string;
}> {
  const results: Array<{
    filePath: string;
    relativePath: string;
    slug: string;
  }> = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 递归扫描子目录
        results.push(...scanMarkdownFiles(itemPath, baseDir));
      } else if (item.endsWith('.md')) {
        // 找到 .md 文件
        const relativePath = path.relative(baseDir, itemPath);
        // 生成 slug：使用相对路径，去除 .md 扩展名，将路径分隔符替换为连字符
        const slug = relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');
        
        results.push({
          filePath: itemPath,
          relativePath,
          slug
        });
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return results;
}