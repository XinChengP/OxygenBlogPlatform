/**
 * GitHub API 集成服务
 * 用于将博客文章提交到GitHub仓库
 */

export interface GitHubFileContent {
  message: string;
  content: string; // base64编码的内容
  sha?: string; // 如果文件已存在，需要提供SHA
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

/**
 * 创建或更新GitHub文件
 */
export async function createOrUpdateFile(
  config: GitHubConfig,
  path: string,
  content: GitHubFileContent
): Promise<any> {
  try {
    // 首先检查文件是否已存在
    const existingFile = await getFile(config, path);
    
    if (existingFile) {
      // 文件已存在，更新它
      content.sha = existingFile.sha;
      return await updateFile(config, path, content);
    } else {
      // 文件不存在，创建新文件
      return await createFile(config, path, content);
    }
  } catch (error) {
    console.error('GitHub API 错误:', error);
    throw error;
  }
}

/**
 * 获取GitHub文件
 */
async function getFile(config: GitHubConfig, path: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`,
      {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.status === 404) {
      return null; // 文件不存在
    }

    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null; // 文件不存在
    }
    throw error;
  }
}

/**
 * 创建新文件
 */
async function createFile(config: GitHubConfig, path: string, content: GitHubFileContent): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content.message,
        content: content.content,
        branch: config.branch,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`创建文件失败: ${errorData.message}`);
  }

  return await response.json();
}

/**
 * 更新现有文件
 */
async function updateFile(config: GitHubConfig, path: string, content: GitHubFileContent): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content.message,
        content: content.content,
        sha: content.sha,
        branch: config.branch,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`更新文件失败: ${errorData.message}`);
  }

  return await response.json();
}

/**
 * 获取GitHub仓库信息
 */
export async function getRepositoryInfo(config: GitHubConfig): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}`,
    {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`获取仓库信息失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 生成唯一的文件名
 */
export function generateBlogFileName(title: string): string {
  // 移除特殊字符，转换为小写，用连字符连接
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 如果为空，使用时间戳
  const fileName = sanitized || Date.now().toString();
  
  // 添加.md扩展名
  return `${fileName}.md`;
}