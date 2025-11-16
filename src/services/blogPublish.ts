/**
 * 博客发布服务
 * 处理博客文章的GitHub提交
 */

import { createOrUpdateFile, generateBlogFileName, GitHubConfig, GitHubFileContent } from './githubApi';

export interface BlogPost {
  title: string;
  content: string;
  date: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
  readTime?: number;
  author?: string;
  slug?: string;
  coverImage?: string;
  draft?: boolean;
  featured?: boolean;
  series?: string;
  seriesOrder?: number;
  language?: string;
  canonicalUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * 将博客内容转换为Markdown格式（包含frontmatter）
 */
export function convertToMarkdownWithFrontmatter(post: BlogPost): string {
  const frontmatter = {
    title: post.title,
    date: post.date,
    category: post.category || '未分类',
    tags: post.tags || [],
    excerpt: post.excerpt || '',
    readTime: post.readTime || 0,
    author: post.author || '歆橙',
    slug: post.slug || '',
    coverImage: post.coverImage || '',
    draft: post.draft || false,
    featured: post.featured || false,
    series: post.series || '',
    seriesOrder: post.seriesOrder || 0,
    language: post.language || 'zh-CN',
    canonicalUrl: post.canonicalUrl || '',
    seoTitle: post.seoTitle || post.title,
    seoDescription: post.seoDescription || post.excerpt || '',
  };

  // 构建frontmatter
  const frontmatterStr = Object.entries(frontmatter)
    .filter(([, value]) => {
      if (value === '' || value === false || value === 0) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map(tag => `"${tag}"`).join(', ')}]`;
      } else if (typeof value === 'boolean') {
        return `${key}: ${value}`;
      } else if (typeof value === 'number') {
        return `${key}: ${value}`;
      } else {
        return `${key}: "${value}"`;
      }
    })
    .join('\n');

  return `---\n${frontmatterStr}\n---\n\n${post.content}`;
}

/**
 * 发布博客到GitHub仓库
 */
export async function publishBlogToGitHub(
  config: GitHubConfig,
  blogPost: BlogPost
): Promise<{ success: boolean; message: string; filePath?: string; commitUrl?: string }> {
  try {
    // 验证配置
    if (!config.owner || !config.repo || !config.token) {
      return {
        success: false,
        message: 'GitHub配置不完整，请检查仓库设置'
      };
    }

    // 生成文件名
    const fileName = generateBlogFileName(blogPost.title);
    const filePath = `src/content/blogs/${fileName}`;

    // 转换内容为Markdown格式
    const markdownContent = convertToMarkdownWithFrontmatter(blogPost);

    // Base64编码内容
    const base64Content = Buffer.from(markdownContent, 'utf-8').toString('base64');

    // 创建提交信息
    const commitMessage = blogPost.series 
      ? `发布博客: ${blogPost.title} (${blogPost.series})`
      : `发布博客: ${blogPost.title}`;

    const fileContent: GitHubFileContent = {
      message: commitMessage,
      content: base64Content,
    };

    // 提交到GitHub
    const result = await createOrUpdateFile(config, filePath, fileContent);

    return {
      success: true,
      message: '博客发布成功！',
      filePath: filePath,
      commitUrl: result.commit?.html_url || ''
    };
  } catch (error) {
    console.error('发布博客失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '发布博客失败，请检查网络连接和GitHub配置'
    };
  }
}

/**
 * 验证GitHub配置是否有效
 */
export async function validateGitHubConfig(config: GitHubConfig): Promise<boolean> {
  try {
    if (!config.owner || !config.repo || !config.token) {
      return false;
    }

    // 简单的配置验证，实际使用时可以调用API验证
    return true;
  } catch {
    return false;
  }
}