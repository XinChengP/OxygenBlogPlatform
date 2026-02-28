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

/**
 * 获取 GitHub 仓库中的所有图片文件（递归遍历子目录）
 */
export async function getImagesFromRepo(config: GitHubConfig, path: string = ''): Promise<any[]> {
  try {
    const url = path
      ? `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`
      : `https://api.github.com/repos/${config.owner}/${config.repo}/contents?ref=${config.branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取图片列表失败：${response.status}`);
    }

    const data = await response.json();
    
    // 支持的图片格式
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
    
    // 收集所有图片
    const images: any[] = [];
    
    // 遍历目录内容
    for (const item of data) {
      if (item.type === 'file') {
        // 检查是否是图片文件
        const ext = item.name.toLowerCase().substring(item.name.lastIndexOf('.'));
        if (imageExtensions.includes(ext)) {
          images.push(item);
        }
      } else if (item.type === 'dir') {
        // 递归获取子目录中的图片
        const subImages = await getImagesFromRepo(config, item.path);
        images.push(...subImages);
      }
    }
    
    return images;
  } catch (error) {
    console.error('获取 GitHub 图片列表失败:', error);
    throw error;
  }
}

/**
 * 上传图片到 GitHub 仓库
 */
export async function uploadImageToGitHub(
  config: GitHubConfig,
  file: File,
  uploadPath: string = ''
): Promise<any> {
  try {
    // 读取文件并转换为 base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = Buffer.from(arrayBuffer).toString('base64');
    
    // 生成唯一的文件名
    const timestamp = Date.now();
    const extension = file.name.substring(file.name.lastIndexOf('.'));
    const sanitizedName = file.name
      .substring(0, file.name.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-');
    const filename = `${sanitizedName}-${timestamp}${extension}`;
    
    const fullPath = uploadPath ? `${uploadPath}/${filename}` : filename;
    
    // 调用 GitHub API 上传
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${fullPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `上传图片：${filename}`,
          content: base64Content,
          branch: config.branch,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`上传失败：${errorData.message}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      url: result.content.download_url,
      path: result.content.path,
      sha: result.content.sha,
      name: filename,
      size: file.size,
    };
  } catch (error) {
    console.error('上传到 GitHub 失败:', error);
    throw error;
  }
}

/**
 * 从 GitHub 仓库删除图片
 */
export async function deleteImageFromGitHub(
  config: GitHubConfig,
  path: string,
  sha?: string
): Promise<boolean> {
  try {
    // 如果没有提供 SHA，先获取
    let fileSha = sha;
    if (!fileSha) {
      const fileData = await getFile(config, path);
      if (!fileData) {
        throw new Error('文件不存在');
      }
      fileSha = fileData.sha;
    }
    
    // 调用 GitHub API 删除
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `删除图片：${path}`,
          sha: fileSha,
          branch: config.branch,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`删除失败：${errorData.message}`);
    }

    return true;
  } catch (error) {
    console.error('从 GitHub 删除失败:', error);
    throw error;
  }
}

/**
 * 获取图片的下载 URL
 */
export function getImageDownloadUrl(config: GitHubConfig, path: string): string {
  return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${path}`;
}