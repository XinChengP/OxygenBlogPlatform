'use server';

/**
 * GitHub 推送功能的后端逻辑
 * 提供 Git 仓库操作、状态检查和推送到 GitHub 的功能
 * 使用 simple-git 库执行 Git 操作
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Git 操作结果接口
 * 用于描述每次 Git 操作的成功/失败状态及详细信息
 */
export interface GitPushResult {
  success: boolean;
  message: string;
  commitHash?: string;
  pushedFiles?: string[];
}

/**
 * Git 状态接口
 * 用于描述当前 Git 仓库的完整状态信息
 */
export interface GitStatus {
  isRepo: boolean;
  hasRemote: boolean;
  currentBranch: string;
  hasUncommittedChanges: boolean;
  uncommittedFiles: string[];
  trackingBranch?: string;
  /** 是否有待推送的提交（本地有提交但远程没有） */
  hasPushable: boolean;
  /** 本地领先的提交数量 */
  aheadCount: number;
  /** 本地落后的提交数量 */
  behindCount: number;
}

/**
 * 获取 Git 仓库根目录路径
 * 使用 process.cwd() 获取当前工作目录，即项目根目录
 */
function getRepoPath(): string {
  return process.cwd();
}

/**
 * 初始化 Git 仓库实例
 * 创建一个 simple-git 实例，指向项目根目录
 */
function getGit(): SimpleGit {
  return simpleGit(getRepoPath());
}

/**
 * 检查指定目录是否是 Git 仓库
 * @param dirPath 要检查的目录路径
 * @returns 如果是 Git 仓库返回 true，否则返回 false
 */
async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const git = simpleGit(dirPath);
    await git.checkIsRepo();
    return true;
  } catch {
    return false;
  }
}

/**
 * 初始化 Git 仓库
 * 检查当前目录是否是 Git 仓库，如果不是则初始化一个新的仓库
 * 同时检查是否存在远程仓库配置
 * @returns 返回初始化操作的结果，包含仓库状态和远程仓库信息
 */
export async function initGitRepo(): Promise<{
  success: boolean;
  message: string;
  isRepo: boolean;
  hasRemote: boolean;
}> {
  try {
    const repoPath = getRepoPath();

    // 检查当前目录是否已经是 Git 仓库
    const isRepo = await isGitRepository(repoPath);

    if (!isRepo) {
      // 如果不是 Git 仓库，初始化一个新的仓库
      const git = simpleGit(repoPath);
      await git.init();

      return {
        success: true,
        message: 'Git 仓库初始化成功，但尚未配置远程仓库',
        isRepo: true,
        hasRemote: false,
      };
    }

    // 检查是否存在远程仓库配置
    const git = getGit();
    const remotes = await git.getRemotes();

    if (remotes.length === 0) {
      return {
        success: true,
        message: '当前是 Git 仓库，但尚未配置远程仓库。请先添加远程仓库地址。',
        isRepo: true,
        hasRemote: false,
      };
    }

    return {
      success: true,
      message: 'Git 仓库已就绪',
      isRepo: true,
      hasRemote: true,
    };
  } catch (error) {
    console.error('初始化 Git 仓库失败:', error);
    return {
      success: false,
      message: `初始化 Git 仓库失败: ${error instanceof Error ? error.message : '未知错误'}`,
      isRepo: false,
      hasRemote: false,
    };
  }
}

/**
 * 获取 Git 状态信息
 * 返回当前 Git 仓库的完整状态，包括分支、远程、未提交更改等信息
 * 同时检测本地与远程的同步状态（ahead/behind）
 * @returns 返回 GitStatus 对象，描述当前 Git 仓库状态
 */
export async function getGitStatus(): Promise<GitStatus> {
  try {
    const repoPath = getRepoPath();
    const isRepo = await isGitRepository(repoPath);

    // 如果不是 Git 仓库，返回默认值
    if (!isRepo) {
      return {
        isRepo: false,
        hasRemote: false,
        currentBranch: '',
        hasUncommittedChanges: false,
        uncommittedFiles: [],
        hasPushable: false,
        aheadCount: 0,
        behindCount: 0,
      };
    }

    const git = getGit();

    // 获取当前分支名称
    const branchSummary = await git.branchLocal();
    const currentBranch = branchSummary.current;

    // 获取文件状态（检测未提交的更改）
    const status = await git.status();

    // 获取跟踪分支信息
    const trackingBranch = status.tracking || undefined;

    // 获取远程仓库列表
    const remotes = await git.getRemotes();
    const hasRemote = remotes.length > 0;

    // 检测是否有未提交的更改
    const hasUncommittedChanges = !status.isClean();

    // 获取未提交的文件列表
    const uncommittedFiles: string[] = [];
    if (!status.isClean()) {
      // 收集已修改的文件
      if (status.modified.length > 0) {
        uncommittedFiles.push(...status.modified);
      }
      // 收集未跟踪的文件（新增文件）
      if (status.not_added.length > 0) {
        uncommittedFiles.push(...status.not_added);
      }
      // 收集已删除的文件
      if (status.deleted.length > 0) {
        uncommittedFiles.push(...status.deleted);
      }
      // 收集已重命名的文件（取重命名后的路径）
      if (status.renamed.length > 0) {
        uncommittedFiles.push(...status.renamed.map(r => r.to));
      }
      // 收集已暂存的文件
      if (status.staged.length > 0) {
        uncommittedFiles.push(...status.staged);
      }
    }

    // 获取本地与远程的同步状态
    // ahead: 本地有提交但远程没有
    // behind: 远程有提交但本地没有
    const aheadCount = status.ahead;
    const behindCount = status.behind;
    const hasPushable = aheadCount > 0;

    return {
      isRepo: true,
      hasRemote,
      currentBranch,
      hasUncommittedChanges,
      uncommittedFiles: [...new Set(uncommittedFiles)], // 去重
      trackingBranch,
      hasPushable,
      aheadCount,
      behindCount,
    };
  } catch (error) {
    console.error('获取 Git 状态失败:', error);
    return {
      isRepo: false,
      hasRemote: false,
      currentBranch: '',
      hasUncommittedChanges: false,
      uncommittedFiles: [],
      hasPushable: false,
      aheadCount: 0,
      behindCount: 0,
    };
  }
}

/**
 * 检查是否有未提交的更改
 * 这是一个简化版的检查，用于快速判断工作区是否有待提交的更改
 * @returns 如果有未提交的更改返回 true，否则返回 false
 */
export async function hasUncommittedChanges(): Promise<boolean> {
  try {
    const repoPath = getRepoPath();
    const isRepo = await isGitRepository(repoPath);

    if (!isRepo) {
      return false;
    }

    const git = getGit();
    const status = await git.status();

    return !status.isClean();
  } catch (error) {
    console.error('检查未提交更改失败:', error);
    return false;
  }
}

/**
 * 检测本地是否有领先于远程的提交
 * 如果有，说明之前的推送已经完成，不需要重复推送
 * 这用于防止短时间内重复推送相同的提交
 * @returns 如果有领先提交返回 true，否则返回 false
 */
export async function isAheadOfRemote(): Promise<boolean> {
  try {
    const repoPath = getRepoPath();
    const isRepo = await isGitRepository(repoPath);

    if (!isRepo) {
      return false;
    }

    const git = getGit();
    const status = await git.status();

    // 如果 ahead > 0，说明有本地提交还未推送到远程
    return status.ahead > 0;
  } catch (error) {
    console.error('检测远程同步状态失败:', error);
    return false;
  }
}

/**
 * 获取未提交文件的详细列表
 * 返回所有有变化的文件的完整信息
 * @returns 返回包含修改类型和文件路径的数组
 */
export async function getUncommittedFiles(): Promise<{
  modified: string[];
  added: string[];
  deleted: string[];
  renamed: string[];
}> {
  try {
    const repoPath = getRepoPath();
    const isRepo = await isGitRepository(repoPath);

    if (!isRepo) {
      return { modified: [], added: [], deleted: [], renamed: [] };
    }

    const git = getGit();
    const status = await git.status();

    return {
      modified: status.modified,
      added: status.not_added,
      deleted: status.deleted,
      renamed: status.renamed.map(r => r.to),
    };
  } catch (error) {
    console.error('获取未提交文件列表失败:', error);
    return { modified: [], added: [], deleted: [], renamed: [] };
  }
}

/**
 * 推送到 GitHub
 * 将所有更改添加到暂存区、提交并推送到远程仓库
 * 如果没有需要推送的内容（工作区干净且没有待推送的提交），会返回提示信息
 * @param message 提交消息，如果未提供则使用包含时间戳的默认消息
 * @returns 返回 GitPushResult，描述推送操作的结果
 */
export async function pushToGitHub(message?: string): Promise<GitPushResult> {
  try {
    const repoPath = getRepoPath();

    // 首先检查是否是 Git 仓库
    const isRepo = await isGitRepository(repoPath);
    if (!isRepo) {
      return {
        success: false,
        message: '当前目录不是 Git 仓库，请先初始化仓库',
      };
    }

    const git = getGit();

    // 检查是否有远程仓库
    const remotes = await git.getRemotes();
    if (remotes.length === 0) {
      return {
        success: false,
        message: '尚未配置远程仓库，请先添加远程仓库地址（git remote add origin <url>）',
      };
    }

    // 获取当前状态
    const status = await git.status();

    // 如果没有更改且没有待推送的提交，直接返回
    if (status.isClean() && status.ahead === 0) {
      return {
        success: true,
        message: '没有需要推送的内容（工作区干净且已同步到远程）',
        commitHash: undefined,
        pushedFiles: [],
      };
    }

    // 如果工作区干净但有待推送的提交，说明之前的更改已经提交但尚未推送
    if (status.isClean() && status.ahead > 0) {
      // 直接推送已有的提交
      const currentBranch = status.current;
      if (!currentBranch) {
        return {
          success: false,
          message: '无法获取当前分支名称',
        };
      }

      const remoteName = remotes[0]?.name;
      if (!remoteName) {
        return {
          success: false,
          message: '未找到远程仓库',
        };
      }

      try {
        await git.push(remoteName, currentBranch);
        return {
          success: true,
          message: `推送成功（${status.ahead} 个提交已同步到远程）`,
          commitHash: undefined,
          pushedFiles: [],
        };
      } catch (pushError) {
        return {
          success: false,
          message: `推送失败: ${pushError instanceof Error ? pushError.message : '未知错误'}`,
        };
      }
    }

    // 收集所有需要推送的文件
    const pushedFiles: string[] = [];
    if (status.modified.length > 0) {
      pushedFiles.push(...status.modified);
    }
    if (status.not_added.length > 0) {
      pushedFiles.push(...status.not_added);
    }
    if (status.deleted.length > 0) {
      pushedFiles.push(...status.deleted);
    }
    if (status.renamed && status.renamed.length > 0) {
      pushedFiles.push(...status.renamed.map(r => r.to));
    }

    // 添加所有更改到暂存区
    await git.add('.');

    // 生成提交消息
    const commitMessage = message || `更新于 ${new Date().toLocaleString('zh-CN')}`;

    // 提交更改
    const commitResult = await git.commit(commitMessage);

    // 获取提交哈希
    const commitHash = commitResult.commit;

    // 获取当前分支名称和远程仓库名称
    const currentBranch = status.current;
    if (!currentBranch) {
      return {
        success: false,
        message: '无法获取当前分支名称',
      };
    }

    const remoteName = remotes[0]?.name;
    if (!remoteName) {
      return {
        success: false,
        message: '未找到远程仓库',
      };
    }

    // 推送到远程仓库
    try {
      // 尝试推送到当前分支的跟踪分支
      await git.push(remoteName, currentBranch);
    } catch (pushError) {
      // 如果推送失败，尝试设置上游分支并推送
      const commonUpstreamBranches = ['main', 'master', 'develop'];
      let pushed = false;

      for (const upstreamBranch of commonUpstreamBranches) {
        try {
          await git.push(remoteName, `${currentBranch}:${upstreamBranch}`, ['--set-upstream']);
          pushed = true;
          break;
        } catch {
          continue;
        }
      }

      // 如果还是失败，尝试直接推送当前分支并设置上游
      if (!pushed) {
        await git.push(remoteName, currentBranch, ['--set-upstream']);
      }
    }

    return {
      success: true,
      message: '推送成功',
      commitHash,
      pushedFiles: [...new Set(pushedFiles)],
    };
  } catch (error) {
    console.error('推送失败:', error);
    return {
      success: false,
      message: `推送失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 构建并推送
 * 先执行 npm run build:pages 构建项目，然后推送所有更改到 GitHub
 * @param buildMessage 构建相关的提交消息前缀
 * @param pushMessage 推送时的提交消息，如果未提供则使用包含时间戳的默认消息
 * @returns 返回 GitPushResult，描述构建和推送操作的结果
 */
export async function buildAndPush(
  buildMessage?: string,
  pushMessage?: string
): Promise<GitPushResult> {
  try {
    const repoPath = getRepoPath();

    // 记录开始构建的信息
    console.log('开始构建项目...');
    const buildStartTime = Date.now();

    // 执行 npm run build:pages 命令
    try {
      const { stdout: buildStdout, stderr: buildStderr } = await execAsync(
        'npm run build:pages',
        {
          cwd: repoPath,
          timeout: 30 * 60 * 1000, // 30 分钟超时
          maxBuffer: 50 * 1024 * 1024, // 50MB 缓冲区
        }
      );

      const buildEndTime = Date.now();
      const buildDuration = ((buildEndTime - buildStartTime) / 1000).toFixed(2);

      console.log(`构建完成，耗时: ${buildDuration} 秒`);
      if (buildStdout) {
        console.log('构建输出:', buildStdout);
      }
      if (buildStderr) {
        console.warn('构建警告:', buildStderr);
      }
    } catch (buildError) {
      console.error('构建失败:', buildError);
      return {
        success: false,
        message: `构建失败: ${buildError instanceof Error ? buildError.message : '未知错误'}`,
      };
    }

    // 构建成功后，执行 Git 推送
    const defaultPushMessage = pushMessage ||
      `构建完成推送于 ${new Date().toLocaleString('zh-CN')}`;

    const finalCommitMessage = buildMessage
      ? `${buildMessage} - ${defaultPushMessage}`
      : defaultPushMessage;

    // 执行 Git 推送操作
    const pushResult = await pushToGitHub(finalCommitMessage);

    return pushResult;
  } catch (error) {
    console.error('构建并推送失败:', error);
    return {
      success: false,
      message: `构建并推送失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 添加远程仓库
 * 为当前 Git 仓库添加一个新的远程仓库地址
 * @param remoteName 远程仓库名称，默认是 'origin'
 * @param remoteUrl 远程仓库的 URL 地址
 * @returns 返回操作结果
 */
export async function addRemote(
  remoteName: string = 'origin',
  remoteUrl: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const repoPath = getRepoPath();

    const isRepo = await isGitRepository(repoPath);
    if (!isRepo) {
      return {
        success: false,
        message: '当前目录不是 Git 仓库，请先初始化仓库',
      };
    }

    const git = getGit();

    // 检查远程仓库是否已存在
    const existingRemotes = await git.getRemotes();
    const remoteExists = existingRemotes.some(r => r.name === remoteName);

    if (remoteExists) {
      await git.remote([`set-url`, remoteName, remoteUrl]);
      return {
        success: true,
        message: `远程仓库 ${remoteName} 的 URL 已更新`,
      };
    }

    await git.remote(['add', remoteName, remoteUrl]);

    return {
      success: true,
      message: `成功添加远程仓库 ${remoteName}`,
    };
  } catch (error) {
    console.error('添加远程仓库失败:', error);
    return {
      success: false,
      message: `添加远程仓库失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 获取远程仓库列表
 * 返回当前 Git 仓库配置的所有远程仓库信息
 * @returns 返回远程仓库信息数组
 */
export async function getRemoteList(): Promise<Array<{
  name: string;
  url: string;
}>> {
  try {
    const repoPath = getRepoPath();

    const isRepo = await isGitRepository(repoPath);
    if (!isRepo) {
      return [];
    }

    const git = getGit();
    const remotes = await git.getRemotes(true);

    return remotes.map(remote => ({
      name: remote.name,
      url: remote.refs?.fetch || remote.refs?.push || '',
    }));
  } catch (error) {
    console.error('获取远程仓库列表失败:', error);
    return [];
  }
}

/**
 * 获取提交历史
 * 返回最近的 N 条提交记录
 * @param count 返回的提交记录数量，默认 10 条
 * @returns 返回提交记录数组
 */
export async function getCommitHistory(
  count: number = 10
): Promise<Array<{
  hash: string;
  message: string;
  date: string;
  author: string;
}>> {
  try {
    const repoPath = getRepoPath();

    const isRepo = await isGitRepository(repoPath);
    if (!isRepo) {
      return [];
    }

    const git = getGit();

    const { stdout } = await execAsync(
      `git log --pretty=format:"%H|%s|%ad|%an" --date=iso -n ${count}`,
      { cwd: repoPath }
    );

    if (!stdout.trim()) {
      return [];
    }

    const commits = stdout.trim().split('\n').map(line => {
      const [hash, message, date, author] = line.split('|');
      return { hash, message, date, author };
    });

    return commits;
  } catch (error) {
    console.error('获取提交历史失败:', error);
    return [];
  }
}
