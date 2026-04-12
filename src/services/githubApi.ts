/**
 * GitHub API 集成服务
 * 用于将博客文章提交到GitHub仓库
 * 
 * 功能模块：
 * 1. 文件操作 - 创建、更新、删除、获取文件
 * 2. 批量操作 - 批量创建/更新/删除文件
 * 3. 目录操作 - 创建目录、获取目录内容、检查目录是否存在
 * 4. 文件搜索 - 搜索文件、分页获取文件列表
 * 5. 动态管理 - 获取、创建、更新、删除动态
 * 6. 图片管理 - 上传、删除、获取图片
 * 7. 错误处理 - 重试机制、错误消息处理
 */

import { Buffer } from 'buffer';

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
 * 编码路径中的特殊字符（包括中文）
 * @param path - 原始路径
 * @returns 编码后的路径
 */
function encodePath(path: string): string {
  // 将路径按斜杠分割，对每一部分进行编码，然后重新组合
  return path.split('/').map(encodeURIComponent).join('/');
}

/**
 * 构建 GitHub API 请求头
 * 只有在 token 存在时才添加 Authorization 头
 * @param token - GitHub Token
 * @returns 请求头对象
 */
function buildHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token && token.trim() !== '') {
    headers['Authorization'] = `token ${token}`;
  }
  
  return headers;
}

/**
 * 获取GitHub文件
 */
async function getFile(config: GitHubConfig, path: string): Promise<any> {
  try {
    const encodedPath = encodePath(path);
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}?ref=${config.branch}`,
      {
        headers: buildHeaders(config.token),
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
  const encodedPath = encodePath(path);
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`,
    {
      method: 'PUT',
      headers: {
        ...buildHeaders(config.token),
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
  const encodedPath = encodePath(path);
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`,
    {
      method: 'PUT',
      headers: {
        ...buildHeaders(config.token),
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
 * 支持公开仓库（无需 Token）和私有仓库（需要 Token）
 */
export async function getRepositoryInfo(config: GitHubConfig): Promise<any> {
  // 构建请求头，只有存在 token 时才添加 Authorization
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (config.token && config.token.trim() !== '') {
    headers['Authorization'] = `token ${config.token}`;
  }
  
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}`,
    {
      headers,
    }
  );

  if (!response.ok) {
    // 提供更详细的错误信息
    if (response.status === 404) {
      throw new Error(`仓库不存在或无权访问: ${config.owner}/${config.repo}`);
    }
    if (response.status === 401) {
      throw new Error('GitHub Token 无效或已过期');
    }
    if (response.status === 403) {
      throw new Error('API 请求次数已达上限或没有权限');
    }
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
    const encodedPath = path ? encodePath(path) : '';
    const url = encodedPath
      ? `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}?ref=${config.branch}`
      : `https://api.github.com/repos/${config.owner}/${config.repo}/contents?ref=${config.branch}`;
    
    // 构建请求头，只有存在 token 时才添加 Authorization
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (config.token && config.token.trim() !== '') {
      headers['Authorization'] = `token ${config.token}`;
    }
    
    const response = await fetch(url, { headers });

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
        // 注意：GitHub API 返回的 path 已经是解码后的中文路径
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
    const encodedFullPath = encodePath(fullPath);
    
    // 调用 GitHub API 上传
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedFullPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Upload image: ${filename}`,
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
    const encodedPath = encodePath(path);
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete image: ${path}`,
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

// ============================================
// 错误处理和重试机制
// ============================================

/**
 * 延迟函数
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的 API 调用
 * 当请求失败时自动重试，适用于网络不稳定或 GitHub API 限流的情况
 * @param fn - 要执行的函数
 * @param maxRetries - 最大重试次数，默认 3 次
 * @param retryDelay - 重试间隔（毫秒），默认 1000ms
 * @returns 执行结果
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果是 404 错误，不需要重试
      if (lastError.message.includes('404')) {
        throw lastError;
      }
      
      // 如果是认证错误，不需要重试
      if (lastError.message.includes('401') || lastError.message.includes('403')) {
        throw lastError;
      }
      
      // 如果还有重试机会，等待后重试
      if (attempt < maxRetries) {
        console.warn(`第 ${attempt} 次尝试失败，${retryDelay}ms 后重试...`, lastError.message);
        await delay(retryDelay);
        // 指数退避：每次重试增加等待时间
        retryDelay *= 1.5;
      }
    }
  }
  
  throw lastError || new Error('重试次数已用尽');
}

/**
 * 处理 GitHub API 错误
 * 将技术性错误转换为用户友好的错误消息
 * @param error - 错误对象
 * @returns 用户友好的错误消息
 */
export function handleGitHubError(error: unknown): string {
  // 如果是网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return '网络连接失败，请检查网络设置后重试';
  }
  
  // 如果是 HTTP 错误
  if (error instanceof Error) {
    const message = error.message;
    
    // 401 未授权
    if (message.includes('401')) {
      return 'GitHub Token 无效或已过期，请重新配置';
    }
    
    // 403 禁止访问
    if (message.includes('403')) {
      return '没有权限访问该仓库，请检查 Token 权限设置';
    }
    
    // 404 未找到
    if (message.includes('404')) {
      return '请求的资源不存在，请检查仓库地址和分支名称';
    }
    
    // 409 冲突
    if (message.includes('409')) {
      return '文件冲突，可能已被其他操作修改，请刷新后重试';
    }
    
    // 422 参数错误
    if (message.includes('422')) {
      return '请求参数错误，请检查输入内容';
    }
    
    // 速率限制
    if (message.includes('rate limit')) {
      return 'GitHub API 请求次数已达上限，请稍后重试';
    }
    
    // 返回原始错误消息
    return message;
  }
  
  return '未知错误，请稍后重试';
}

// ============================================
// 批量文件操作 API
// ============================================

/**
 * 批量创建或更新文件
 * 适用于需要同时处理多个文件的场景，如批量上传图片、批量创建文章等
 * @param config - GitHub 配置
 * @param files - 文件列表，包含路径、内容和提交信息
 * @returns 操作结果，包含成功状态、每个文件的结果和错误信息
 */
export async function batchCreateOrUpdateFiles(
  config: GitHubConfig,
  files: Array<{
    path: string;
    content: string;
    message: string;
  }>
): Promise<{ success: boolean; results: Array<{ path: string; success: boolean; data?: unknown; error?: string }>; errors: string[] }> {
  const results: Array<{ path: string; success: boolean; data?: unknown; error?: string }> = [];
  const errors: string[] = [];
  
  for (const file of files) {
    try {
      // 使用重试机制执行单个文件操作
      const result = await withRetry(() => 
        createOrUpdateFile(config, file.path, {
          message: file.message,
          content: file.content,
        })
      );
      results.push({
        path: file.path,
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = handleGitHubError(error);
      errors.push(`${file.path}: ${errorMessage}`);
      results.push({
        path: file.path,
        success: false,
        error: errorMessage,
      });
    }
  }
  
  return {
    success: errors.length === 0,
    results,
    errors,
  };
}

/**
 * 批量删除文件
 * 适用于需要同时删除多个文件的场景
 * @param config - GitHub 配置
 * @param files - 文件列表，包含路径和 SHA 值
 * @returns 操作结果，包含成功状态、每个文件的结果和错误信息
 */
export async function batchDeleteFiles(
  config: GitHubConfig,
  files: Array<{
    path: string;
    sha: string;
  }>
): Promise<{ success: boolean; results: Array<{ path: string; success: boolean; data?: unknown; error?: string }>; errors: string[] }> {
  const results: Array<{ path: string; success: boolean; data?: unknown; error?: string }> = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      // 使用重试机制执行删除操作
      const result = await withRetry(() =>
        deleteFileBySha(config, file.path, file.sha)
      );
      results.push({
        path: file.path,
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = handleGitHubError(error);
      errors.push(`${file.path}: ${errorMessage}`);
      results.push({
        path: file.path,
        success: false,
        error: errorMessage,
      });
    }
  }
  
  return {
    success: errors.length === 0,
    results,
    errors,
  };
}

/**
 * 通过 SHA 删除文件（内部使用）
 * @param config - GitHub 配置
 * @param path - 文件路径
 * @param sha - 文件 SHA 值
 * @returns 删除结果
 */
async function deleteFileBySha(
  config: GitHubConfig,
  path: string,
  sha: string
): Promise<any> {
  const encodedPath = encodePath(path);
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          message: `Delete file: ${path}`,
          sha: sha,
          branch: config.branch,
        }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`删除文件失败: ${errorData.message}`);
  }

  return await response.json();
}

// ============================================
// 目录操作 API
// ============================================

/**
 * 创建目录
 * Git 不支持空目录，通过创建 .gitkeep 文件来实现目录创建
 * @param config - GitHub 配置
 * @param dirPath - 目录路径
 * @returns 操作结果
 */
export async function createDirectory(
  config: GitHubConfig,
  dirPath: string
): Promise<any> {
  // 规范化目录路径，移除首尾斜杠
  const normalizedPath = dirPath.replace(/^\/|\/$/g, '');
  const gitkeepPath = `${normalizedPath}/.gitkeep`;
  
  // 检查目录是否已存在
  const exists = await directoryExists(config, normalizedPath);
  if (exists) {
    return {
      success: true,
      message: '目录已存在',
      path: normalizedPath,
    };
  }
  
  // 创建 .gitkeep 文件
  const encodedPath = encodePath(gitkeepPath);
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          message: `Create directory: ${normalizedPath}`,
          content: '', // 空文件
          branch: config.branch,
        }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`创建目录失败: ${errorData.message}`);
  }

  const result = await response.json();
  return {
    success: true,
    message: '目录创建成功',
    path: normalizedPath,
    data: result,
  };
}

/**
 * 获取目录内容列表
 * 获取指定目录下的所有文件和子目录
 * @param config - GitHub 配置
 * @param path - 目录路径，默认为根目录
 * @returns 目录内容数组
 */
export async function getDirectoryContents(
  config: GitHubConfig,
  path: string = ''
): Promise<any[]> {
  try {
    const encodedPath = path ? encodePath(path) : '';
    const url = encodedPath
      ? `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}?ref=${config.branch}`
      : `https://api.github.com/repos/${config.owner}/${config.repo}/contents?ref=${config.branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 404) {
      return []; // 目录不存在，返回空数组
    }

    if (!response.ok) {
      throw new Error(`获取目录内容失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 如果返回的是文件对象（单个文件），转换为数组
    if (!Array.isArray(data)) {
      return [data];
    }
    
    return data;
  } catch (error) {
    console.error('获取目录内容失败:', error);
    throw error;
  }
}

/**
 * 检查目录是否存在
 * 通过尝试获取目录内容来判断目录是否存在
 * @param config - GitHub 配置
 * @param path - 目录路径
 * @returns 是否存在
 */
export async function directoryExists(
  config: GitHubConfig,
  path: string
): Promise<boolean> {
  try {
    const contents = await getDirectoryContents(config, path);
    // 如果返回的是数组，说明是目录
    return Array.isArray(contents);
  } catch (error) {
    return false;
  }
}

// ============================================
// 文件搜索 API
// ============================================

/**
 * 搜索仓库中的文件
 * 使用 GitHub 代码搜索 API 查找匹配的文件
 * @param config - GitHub 配置
 * @param query - 搜索关键词
 * @param path - 搜索路径（可选），限定搜索范围
 * @returns 匹配的文件列表
 */
export async function searchFiles(
  config: GitHubConfig,
  query: string,
  path?: string
): Promise<any[]> {
  try {
    // 构建搜索查询
    // GitHub 搜索语法：repo:owner/repo path:directory keyword
    let searchQuery = `${query} repo:${config.owner}/${config.repo}`;
    if (path) {
      searchQuery += ` path:${path}`;
    }
    
    const encodedQuery = encodeURIComponent(searchQuery);
    const response = await fetch(
      `https://api.github.com/search/code?q=${encodedQuery}`,
      {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`搜索失败: ${errorData.message}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('搜索文件失败:', error);
    throw error;
  }
}

/**
 * 获取文件列表（支持分页）
 * 获取指定目录下的文件列表，支持分页查询
 * @param config - GitHub 配置
 * @param path - 目录路径，默认为根目录
 * @param page - 页码，从 1 开始
 * @param perPage - 每页数量，默认 30，最大 100
 * @returns 文件列表及分页信息
 */
export async function getFileList(
  config: GitHubConfig,
  path: string = '',
  page: number = 1,
  perPage: number = 30
): Promise<{
  files: any[];
  hasMore: boolean;
  totalCount: number;
}> {
  try {
    // GitHub Contents API 不支持分页，但我们可以模拟
    // 获取所有内容后进行分页处理
    const allContents = await getDirectoryContents(config, path);
    
    // 过滤出文件（排除目录）
    const files = allContents.filter(item => item.type === 'file');
    const totalCount = files.length;
    
    // 计算分页
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedFiles = files.slice(startIndex, endIndex);
    
    return {
      files: paginatedFiles,
      hasMore: endIndex < totalCount,
      totalCount,
    };
  } catch (error) {
    console.error('获取文件列表失败:', error);
    throw error;
  }
}

// ============================================
// 动态管理 API
// ============================================

/**
 * 动态元数据接口
 */
export interface MomentMetadata {
  time: string;
  tags: string[];
  images?: string[];
  pinned?: boolean;
}

/**
 * 获取所有动态文件
 * 从 content/moments 目录获取所有动态 Markdown 文件
 * @param config - GitHub 配置
 * @returns 动态文件列表
 */
export async function getMoments(config: GitHubConfig): Promise<any[]> {
  try {
    const momentsPath = 'content/moments';
    const contents = await getDirectoryContents(config, momentsPath);
    
    // 过滤出 .md 文件
    const momentFiles = contents.filter(
      item => item.type === 'file' && item.name.endsWith('.md')
    );
    
    return momentFiles;
  } catch (error) {
    console.error('获取动态列表失败:', error);
    // 如果目录不存在，返回空数组
    return [];
  }
}

/**
 * 创建或更新动态
 * 在 content/moments 目录下创建或更新动态 Markdown 文件
 * @param config - GitHub 配置
 * @param id - 动态 ID
 * @param content - 动态内容（Markdown 格式）
 * @param metadata - 动态元数据（时间、标签、图片、置顶等）
 * @returns 操作结果
 */
export async function createOrUpdateMoment(
  config: GitHubConfig,
  id: string,
  content: string,
  metadata: MomentMetadata
): Promise<any> {
  // 构建动态文件路径
  const momentPath = `content/moments/${id}.md`;
  
  // 构建 frontmatter
  const frontmatter: string[] = [
    '---',
    `id: "${id}"`,
    `time: "${metadata.time}"`,
  ];
  
  // 添加标签
  if (metadata.tags && metadata.tags.length > 0) {
    const tagsStr = metadata.tags.map(tag => `"${tag}"`).join(', ');
    frontmatter.push(`tags: [${tagsStr}]`);
  }
  
  // 添加图片
  if (metadata.images && metadata.images.length > 0) {
    const imagesStr = metadata.images.map(img => `"${img}"`).join(', ');
    frontmatter.push(`images: [${imagesStr}]`);
  }
  
  // 添加置顶标记
  if (metadata.pinned) {
    frontmatter.push('pinned: true');
  }
  
  frontmatter.push('---');
  frontmatter.push('');
  
  // 组合完整内容
  const fullContent = frontmatter.join('\n') + content;
  
  // 转换为 base64
  const base64Content = Buffer.from(fullContent, 'utf-8').toString('base64');
  
  // 创建或更新文件
  return await createOrUpdateFile(config, momentPath, {
    message: metadata.pinned ? `Create/Update pinned moment: ${id}` : `Create/Update moment: ${id}`,
    content: base64Content,
  });
}

/**
 * 删除动态
 * 删除指定的动态文件
 * @param config - GitHub 配置
 * @param id - 动态 ID
 * @param sha - 文件 SHA 值
 * @returns 是否删除成功
 */
export async function deleteMoment(
  config: GitHubConfig,
  id: string,
  sha: string
): Promise<boolean> {
  try {
    const momentPath = `content/moments/${id}.md`;
    await deleteFileBySha(config, momentPath, sha);
    return true;
  } catch (error) {
    console.error('删除动态失败:', error);
    throw error;
  }
}

/**
 * 获取单个动态详情
 * 获取指定动态的完整内容
 * @param config - GitHub 配置
 * @param id - 动态 ID
 * @returns 动态详情（包含内容和元数据）
 */
export async function getMomentDetail(
  config: GitHubConfig,
  id: string
): Promise<{
  id: string;
  content: string;
  metadata: MomentMetadata;
  sha: string;
} | null> {
  try {
    const momentPath = `content/moments/${id}.md`;
    const fileData = await getFile(config, momentPath);
    
    if (!fileData) {
      return null;
    }
    
    // 解码内容
    const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    
    // 解析 frontmatter
    const { metadata, content } = parseMomentFrontmatter(decodedContent);
    
    return {
      id,
      content,
      metadata,
      sha: fileData.sha,
    };
  } catch (error) {
    console.error('获取动态详情失败:', error);
    return null;
  }
}

/**
 * 解析动态的 frontmatter
 * 从 Markdown 内容中提取元数据和正文
 * @param rawContent - 原始 Markdown 内容
 * @returns 解析后的元数据和正文
 */
function parseMomentFrontmatter(
  rawContent: string
): { metadata: MomentMetadata; content: string } {
  const defaultMetadata: MomentMetadata = {
    time: '',
    tags: [],
    images: [],
    pinned: false,
  };
  
  // 检查是否有 frontmatter
  if (!rawContent.startsWith('---')) {
    return { metadata: defaultMetadata, content: rawContent };
  }
  
  // 提取 frontmatter 部分
  const endIndex = rawContent.indexOf('---', 3);
  if (endIndex === -1) {
    return { metadata: defaultMetadata, content: rawContent };
  }
  
  const frontmatterStr = rawContent.substring(3, endIndex).trim();
  const content = rawContent.substring(endIndex + 3).trim();
  
  // 解析 frontmatter
  const metadata: MomentMetadata = { ...defaultMetadata };
  
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    
    switch (key) {
      case 'time':
        metadata.time = value.replace(/"/g, '');
        break;
      case 'tags':
        // 解析数组格式：[tag1, tag2]
        const tagsMatch = value.match(/\[(.*)\]/);
        if (tagsMatch) {
          metadata.tags = tagsMatch[1]
            .split(',')
            .map(tag => tag.trim().replace(/"/g, ''))
            .filter(tag => tag);
        }
        break;
      case 'images':
        // 解析数组格式
        const imagesMatch = value.match(/\[(.*)\]/);
        if (imagesMatch) {
          metadata.images = imagesMatch[1]
            .split(',')
            .map(img => img.trim().replace(/"/g, ''))
            .filter(img => img);
        }
        break;
      case 'pinned':
        metadata.pinned = value === 'true';
        break;
    }
  }
  
  return { metadata, content };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取文件的 SHA 值
 * 如果不知道文件 SHA，可以通过此函数获取
 * @param config - GitHub 配置
 * @param path - 文件路径
 * @returns 文件 SHA 值，如果文件不存在则返回 null
 */
export async function getFileSha(
  config: GitHubConfig,
  path: string
): Promise<string | null> {
  const fileData = await getFile(config, path);
  return fileData?.sha || null;
}

/**
 * 检查文件是否存在
 * @param config - GitHub 配置
 * @param path - 文件路径
 * @returns 是否存在
 */
export async function fileExists(
  config: GitHubConfig,
  path: string
): Promise<boolean> {
  const fileData = await getFile(config, path);
  return fileData !== null;
}

/**
 * 获取文件内容
 * 获取文件的解码后内容
 * @param config - GitHub 配置
 * @param path - 文件路径
 * @returns 文件内容，如果文件不存在则返回 null
 */
export async function getFileContent(
  config: GitHubConfig,
  path: string
): Promise<string | null> {
  const fileData = await getFile(config, path);
  
  if (!fileData) {
    return null;
  }
  
  return Buffer.from(fileData.content, 'base64').toString('utf-8');
}

/**
 * 获取带重试的文件
 * 使用重试机制获取文件信息
 * @param config - GitHub 配置
 * @param path - 文件路径
 * @returns 文件数据
 */
export async function getFileWithRetry(
  config: GitHubConfig,
  path: string
): Promise<any> {
  return withRetry(() => getFile(config, path));
}