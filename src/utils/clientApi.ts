/**
 * 客户端 API 工具
 * 用于在浏览器中直接操作 GitHub API 和本地存储
 * 替代 Server Actions，支持 GitHub Pages 静态托管
 */

import { Octokit } from "octokit";

// GitHub 配置接口
interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

// 从 localStorage 获取 GitHub 配置
function getGitHubConfig(): GitHubConfig | null {
  if (typeof window === "undefined") return null;

  const config = localStorage.getItem("github_config");
  if (!config) return null;

  try {
    return JSON.parse(config);
  } catch {
    return null;
  }
}

// 获取 Octokit 实例
function getOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

/**
 * 获取文件内容
 */
export async function getFileContent(
  path: string
): Promise<{ content: string; sha: string } | null> {
  const config = getGitHubConfig();
  if (!config) throw new Error("GitHub 未配置");

  try {
    const octokit = getOctokit(config.token);
    const response = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
      ref: config.branch,
    });

    if ("content" in response.data) {
      const content = atob(response.data.content);
      return { content, sha: response.data.sha };
    }
    return null;
  } catch (error) {
    console.error("获取文件失败:", error);
    return null;
  }
}

/**
 * 创建或更新文件
 */
export async function createOrUpdateFile(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<boolean> {
  const config = getGitHubConfig();
  if (!config) throw new Error("GitHub 未配置");

  try {
    const octokit = getOctokit(config.token);
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path,
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      sha,
      branch: config.branch,
    });
    return true;
  } catch (error) {
    console.error("保存文件失败:", error);
    return false;
  }
}

/**
 * 删除文件
 */
export async function deleteFile(
  path: string,
  sha: string,
  message: string
): Promise<boolean> {
  const config = getGitHubConfig();
  if (!config) throw new Error("GitHub 未配置");

  try {
    const octokit = getOctokit(config.token);
    await octokit.rest.repos.deleteFile({
      owner: config.owner,
      repo: config.repo,
      path,
      message,
      sha,
      branch: config.branch,
    });
    return true;
  } catch (error) {
    console.error("删除文件失败:", error);
    return false;
  }
}

/**
 * 获取目录内容列表
 */
export async function getDirectoryContents(
  path: string
): Promise<Array<{ name: string; path: string; type: string; sha: string }>> {
  const config = getGitHubConfig();
  if (!config) throw new Error("GitHub 未配置");

  try {
    const octokit = getOctokit(config.token);
    const response = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
      ref: config.branch,
    });

    if (Array.isArray(response.data)) {
      return response.data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sha: item.sha,
      }));
    }
    return [];
  } catch (error) {
    console.error("获取目录失败:", error);
    return [];
  }
}

/**
 * 上传图片到 GitHub
 */
export async function uploadImageToGitHub(
  file: File,
  targetPath: string
): Promise<{ success: boolean; url: string; message: string }> {
  const config = getGitHubConfig();
  if (!config) {
    return { success: false, url: "", message: "GitHub 未配置" };
  }

  try {
    // 读取文件为 base64
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除 data:image/xxx;base64, 前缀
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const octokit = getOctokit(config.token);

    // 生成文件名
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "png";
    const fileName = `image-${timestamp}.${ext}`;
    const fullPath = targetPath
      ? `${targetPath}/${fileName}`
      : fileName;

    // 上传到 GitHub
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path: fullPath,
      message: `Upload image: ${fileName}`,
      content: base64Content,
      branch: config.branch,
    });

    // 构建图片 URL
    const imageUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${fullPath}`;

    return { success: true, url: imageUrl, message: "上传成功" };
  } catch (error) {
    console.error("上传图片失败:", error);
    return {
      success: false,
      url: "",
      message: error instanceof Error ? error.message : "上传失败",
    };
  }
}

/**
 * 本地存储设置
 */
export const clientSettings = {
  get: (key: string): any => {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem(`settings_${key}`);
    return value ? JSON.parse(value) : null;
  },
  set: (key: string, value: any): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`settings_${key}`, JSON.stringify(value));
  },
  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`settings_${key}`);
  },
};

/**
 * 检查是否在客户端
 */
export function isClient(): boolean {
  return typeof window !== "undefined";
}
