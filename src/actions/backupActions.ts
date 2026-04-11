'use server';

/**
 * Admin代码本地备份相关的Server Actions
 * 提供备份、恢复、查看历史、推送到远程仓库等功能
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'admin-backup');

export interface BackupResult {
  success: boolean;
  message: string;
  backupPath?: string;
  commitHash?: string;
  filesCount?: number;
  timestamp?: string;
}

export interface BackupHistory {
  commitHash: string;
  message: string;
  timestamp: string;
  filesCount: number;
}

/**
 * 推送配置接口
 */
export interface PushConfig {
  remoteUrl: string;      // 远程仓库地址
  branch?: string;        // 分支名，默认为 main
  token?: string;         // GitHub/GitLab Token（可选）
}

/**
 * 获取备份目录路径
 */
export async function getBackupPath(): Promise<string> {
  return BACKUP_DIR;
}

/**
 * 检查备份目录是否存在
 */
export async function backupDirExists(): Promise<boolean> {
  try {
    await fs.access(BACKUP_DIR);
    return true;
  } catch {
    return false;
  }
}

/**
 * 初始化备份目录的Git仓库
 */
export async function initBackupRepo(): Promise<BackupResult> {
  try {
    if (!(await backupDirExists())) {
      return {
        success: false,
        message: '备份目录不存在，请先运行备份脚本'
      };
    }

    const gitDir = path.join(BACKUP_DIR, '.git');

    try {
      await fs.access(gitDir);
    } catch {
      await execAsync('git init', { cwd: BACKUP_DIR });
      await execAsync('git config user.email "admin@local.backup"', { cwd: BACKUP_DIR });
      await execAsync('git config user.name "Admin Local Backup"', { cwd: BACKUP_DIR });
    }

    return {
      success: true,
      message: 'Git仓库已初始化',
      backupPath: BACKUP_DIR
    };
  } catch (error) {
    return {
      success: false,
      message: `初始化失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 执行备份操作
 * 将admin相关代码复制到备份目录并提交
 */
export async function performBackup(): Promise<BackupResult> {
  try {
    const projectRoot = process.cwd();
    const timestamp = new Date().toISOString();

    // 确保备份目录存在
    if (!(await backupDirExists())) {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    }

    const copyDir = async (src: string, dest: string) => {
      try {
        await fs.access(src);
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
          } else {
            await fs.copyFile(srcPath, destPath);
          }
        }
      } catch {
        // 目录不存在，跳过
      }
    };

    // 复制admin相关代码
    const dirsToBackup = [
      { src: path.join(projectRoot, 'src', 'app', 'admin'), dest: path.join(BACKUP_DIR, 'src', 'app', 'admin') },
      { src: path.join(projectRoot, 'src', 'components', 'admin'), dest: path.join(BACKUP_DIR, 'src', 'components', 'admin') },
      { src: path.join(projectRoot, 'src', 'actions'), dest: path.join(BACKUP_DIR, 'src', 'actions') },
    ];

    // 复制types中的相关文件
    const typesDir = path.join(projectRoot, 'src', 'types');
    const typesBackupDir = path.join(BACKUP_DIR, 'src', 'types');
    await fs.mkdir(typesBackupDir, { recursive: true });

    try {
      const typeFiles = await fs.readdir(typesDir);
      for (const file of typeFiles) {
        if (file.startsWith('admin') || file.startsWith('todo')) {
          await fs.copyFile(
            path.join(typesDir, file),
            path.join(typesBackupDir, file)
          );
        }
      }
    } catch {
      // 忽略
    }

    // 复制目录
    for (const dir of dirsToBackup) {
      await copyDir(dir.src, dir.dest);
    }

    // 创建.gitignore
    const gitignore = `node_modules/
.next/
out/
build/
.env*
*.local
.idea/
.vscode/
*.swp
.DS_Store
*.log
*secret*
*password*
*.pem
`;
    await fs.writeFile(path.join(BACKUP_DIR, '.gitignore'), gitignore, 'utf-8');

    // 初始化git仓库（如果不存在）
    const gitDir = path.join(BACKUP_DIR, '.git');
    let isNewRepo = false;

    try {
      await fs.access(gitDir);
    } catch {
      await execAsync('git init', { cwd: BACKUP_DIR });
      await execAsync('git config user.email "admin@local.backup"', { cwd: BACKUP_DIR });
      await execAsync('git config user.name "Admin Local Backup"', { cwd: BACKUP_DIR });
      isNewRepo = true;
    }

    // 添加所有文件并提交
    await execAsync('git add .', { cwd: BACKUP_DIR });

    try {
      await execAsync('git diff --cached --quiet', { cwd: BACKUP_DIR });
      // 如果没有变化
      return {
        success: true,
        message: '没有新的更改需要备份',
        backupPath: BACKUP_DIR,
        timestamp
      };
    } catch {
      // 有变化，继续提交
    }

    const commitMessage = `Admin代码备份 - ${new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })}`;

    await execAsync(`git commit -m "${commitMessage}"`, { cwd: BACKUP_DIR });

    // 获取提交hash
    let commitHash = '';
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: BACKUP_DIR });
      commitHash = stdout.trim();
    } catch {
      // 忽略
    }

    // 统计文件数量
    let filesCount = 0;
    try {
      const { stdout } = await execAsync('git ls-files', { cwd: BACKUP_DIR });
      filesCount = stdout.trim().split('\n').filter(Boolean).length;
    } catch {
      // 忽略
    }

    return {
      success: true,
      message: isNewRepo ? '首次备份完成' : '备份已更新',
      backupPath: BACKUP_DIR,
      commitHash,
      filesCount,
      timestamp
    };
  } catch (error) {
    return {
      success: false,
      message: `备份失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 获取备份历史记录
 */
export async function getBackupHistory(limit: number = 10): Promise<BackupResult & { history?: BackupHistory[] }> {
  try {
    if (!(await backupDirExists())) {
      return {
        success: false,
        message: '备份目录不存在'
      };
    }

    const gitDir = path.join(BACKUP_DIR, '.git');
    try {
      await fs.access(gitDir);
    } catch {
      return {
        success: false,
        message: '备份目录不是Git仓库'
      };
    }

    const { stdout } = await execAsync(
      `git log --oneline -${limit} --format="%H|%s|%ad|%s" --date=iso`,
      { cwd: BACKUP_DIR }
    );

    const lines = stdout.trim().split('\n').filter(Boolean);
    const history: BackupHistory[] = [];

    for (const line of lines) {
      const [commitHash, ...rest] = line.split('|');
      const message = rest.join('|');

      // 使用异步方式获取文件数量
      let filesCount = 0;
      try {
        const { stdout: filesStdout } = await execAsync('git ls-files', { cwd: BACKUP_DIR });
        filesCount = filesStdout.trim().split('\n').filter(Boolean).length;
      } catch {
        // 忽略
      }

      history.push({
        commitHash: commitHash.substring(0, 7),
        message,
        timestamp: new Date().toISOString(),
        filesCount
      });
    }

    return {
      success: true,
      message: '获取成功',
      history
    };
  } catch (error) {
    return {
      success: false,
      message: `获取历史失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 从指定提交恢复备份
 */
export async function restoreBackup(commitHash?: string): Promise<BackupResult> {
  try {
    if (!(await backupDirExists())) {
      return {
        success: false,
        message: '备份目录不存在'
      };
    }

    const gitDir = path.join(BACKUP_DIR, '.git');
    try {
      await fs.access(gitDir);
    } catch {
      return {
        success: false,
        message: '备份目录不是Git仓库'
      };
    }

    // 如果没有指定commit，使用最新的
    if (!commitHash) {
      const { stdout } = await execAsync('git log --oneline -1', { cwd: BACKUP_DIR });
      commitHash = stdout.trim().split(' ')[0];
    }

    // 获取该提交的文件列表
    const { stdout: files } = await execAsync(
      `git ls-tree -r --name-only ${commitHash}`,
      { cwd: BACKUP_DIR }
    );

    const filesList = files.trim().split('\n').filter(Boolean);

    // 恢复到项目目录
    const projectRoot = process.cwd();

    for (const file of filesList) {
      const backupFilePath = path.join(BACKUP_DIR, file);
      const projectFilePath = path.join(projectRoot, file);

      // 确保目录存在
      const fileDir = path.dirname(projectFilePath);
      await fs.mkdir(fileDir, { recursive: true });

      try {
        const content = await fs.readFile(backupFilePath);
        await fs.writeFile(projectFilePath, content);
      } catch {
        // 文件可能不存在
      }
    }

    return {
      success: true,
      message: `已恢复到提交 ${commitHash?.substring(0, 7)}`,
      backupPath: BACKUP_DIR
    };
  } catch (error) {
    return {
      success: false,
      message: `恢复失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 获取备份目录状态
 */
export async function getBackupStatus(): Promise<BackupResult & {
  totalCommits?: number;
  lastBackup?: string;
  trackedFiles?: number;
  hasRemote?: boolean;
  remoteUrl?: string;
}> {
  try {
    if (!(await backupDirExists())) {
      return {
        success: false,
        message: '备份目录不存在'
      };
    }

    const gitDir = path.join(BACKUP_DIR, '.git');
    let isGitRepo = false;

    try {
      await fs.access(gitDir);
      isGitRepo = true;
    } catch {
      // 不是git仓库
    }

    if (!isGitRepo) {
      return {
        success: true,
        message: 'Git仓库未初始化',
        trackedFiles: 0,
        totalCommits: 0,
        hasRemote: false
      };
    }

    // 获取提交数量
    let totalCommits = 0;
    try {
      const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: BACKUP_DIR });
      totalCommits = parseInt(stdout.trim(), 10);
    } catch {
      // 忽略
    }

    // 获取最后提交时间
    let lastBackup = '';
    try {
      const { stdout } = await execAsync('git log -1 --format="%ai"', { cwd: BACKUP_DIR });
      lastBackup = stdout.trim();
    } catch {
      // 忽略
    }

    // 获取追踪文件数量
    let trackedFiles = 0;
    try {
      const { stdout } = await execAsync('git ls-files', { cwd: BACKUP_DIR });
      trackedFiles = stdout.trim().split('\n').filter(Boolean).length;
    } catch {
      // 忽略
    }

    // 检查是否有远程仓库
    let hasRemote = false;
    let remoteUrl = '';
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: BACKUP_DIR });
      remoteUrl = stdout.trim();
      hasRemote = true;
    } catch {
      // 没有远程仓库
    }

    return {
      success: true,
      message: '状态获取成功',
      totalCommits,
      lastBackup,
      trackedFiles,
      hasRemote,
      remoteUrl
    };
  } catch (error) {
    return {
      success: false,
      message: `获取状态失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 配置远程仓库
 * @param config 推送配置
 */
export async function configureRemote(config: PushConfig): Promise<BackupResult> {
  try {
    if (!(await backupDirExists())) {
      return {
        success: false,
        message: '备份目录不存在，请先执行备份'
      };
    }

    const gitDir = path.join(BACKUP_DIR, '.git');
    try {
      await fs.access(gitDir);
    } catch {
      return {
        success: false,
        message: '备份目录不是Git仓库，请先执行备份'
      };
    }

    const branch = config.branch || 'main';
    let remoteUrl = config.remoteUrl;

    // 如果提供了token，将token嵌入到URL中（用于HTTPS推送）
    if (config.token && remoteUrl.includes('github.com')) {
      // 转换URL格式： https://github.com/user/repo.git -> https://token@github.com/user/repo.git
      remoteUrl = remoteUrl.replace('https://', `https://${config.token}@`);
    }

    // 检查是否已有origin远程仓库
    let hasOrigin = false;
    try {
      await execAsync('git remote get-url origin', { cwd: BACKUP_DIR });
      hasOrigin = true;
    } catch {
      hasOrigin = false;
    }

    // 添加或更新远程仓库
    if (hasOrigin) {
      await execAsync(`git remote set-url origin "${remoteUrl}"`, { cwd: BACKUP_DIR });
    } else {
      await execAsync(`git remote add origin "${remoteUrl}"`, { cwd: BACKUP_DIR });
    }

    // 设置当前分支的上游分支
    try {
      await execAsync(`git branch -M ${branch}`, { cwd: BACKUP_DIR });
    } catch {
      // 忽略错误，分支可能已存在
    }

    return {
      success: true,
      message: `远程仓库配置成功: ${config.remoteUrl}`,
      backupPath: BACKUP_DIR
    };
  } catch (error) {
    return {
      success: false,
      message: `配置远程仓库失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 推送到远程仓库
 * @param config 推送配置（可选，如果已配置过远程仓库）
 */
export async function pushToRemote(config?: PushConfig): Promise<BackupResult> {
  try {
    if (!(await backupDirExists())) {
      return {
        success: false,
        message: '备份目录不存在，请先执行备份'
      };
    }

    const gitDir = path.join(BACKUP_DIR, '.git');
    try {
      await fs.access(gitDir);
    } catch {
      return {
        success: false,
        message: '备份目录不是Git仓库，请先执行备份'
      };
    }

    // 如果提供了配置，先配置远程仓库
    if (config && config.remoteUrl) {
      const configResult = await configureRemote(config);
      if (!configResult.success) {
        return configResult;
      }
    }

    // 检查是否有远程仓库
    try {
      await execAsync('git remote get-url origin', { cwd: BACKUP_DIR });
    } catch {
      return {
        success: false,
        message: '未配置远程仓库，请先配置远程仓库地址'
      };
    }

    const branch = config?.branch || 'main';

    // 获取当前提交hash（用于返回信息）
    let commitHash = '';
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: BACKUP_DIR });
      commitHash = stdout.trim().substring(0, 7);
    } catch {
      // 忽略
    }

    // 执行推送
    try {
      // 先尝试普通推送
      await execAsync(`git push -u origin ${branch}`, { cwd: BACKUP_DIR });
    } catch (pushError) {
      // 如果推送失败，尝试强制推送（仅当远程仓库为空时）
      try {
        await execAsync(`git push -u origin ${branch} --force`, { cwd: BACKUP_DIR });
      } catch (forceError) {
        throw pushError; // 抛出原始错误
      }
    }

    return {
      success: true,
      message: `推送成功: ${commitHash} -> origin/${branch}`,
      commitHash,
      backupPath: BACKUP_DIR
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 提供更友好的错误提示
    if (errorMessage.includes('Authentication failed')) {
      return {
        success: false,
        message: '认证失败，请检查Token是否正确'
      };
    } else if (errorMessage.includes('Could not resolve host')) {
      return {
        success: false,
        message: '无法连接到远程仓库，请检查网络或URL'
      };
    } else if (errorMessage.includes('rejected')) {
      return {
        success: false,
        message: '推送被拒绝，远程仓库可能有冲突，请尝试先拉取更新'
      };
    }

    return {
      success: false,
      message: `推送失败: ${errorMessage}`
    };
  }
}

/**
 * 获取远程仓库信息
 */
export async function getRemoteInfo(): Promise<BackupResult & {
  remoteUrl?: string;
  branch?: string;
  ahead?: number;
}> {
  try {
    if (!(await backupDirExists())) {
      return {
        success: false,
        message: '备份目录不存在'
      };
    }

    const gitDir = path.join(BACKUP_DIR, '.git');
    try {
      await fs.access(gitDir);
    } catch {
      return {
        success: false,
        message: '备份目录不是Git仓库'
      };
    }

    // 获取远程仓库地址
    let remoteUrl = '';
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: BACKUP_DIR });
      remoteUrl = stdout.trim();
      // 隐藏token信息
      if (remoteUrl.includes('@')) {
        remoteUrl = remoteUrl.replace(/https:\/\/[^@]+@/, 'https://***@');
      }
    } catch {
      return {
        success: true,
        message: '未配置远程仓库',
        remoteUrl: '',
        branch: '',
        ahead: 0
      };
    }

    // 获取当前分支
    let branch = '';
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: BACKUP_DIR });
      branch = stdout.trim();
    } catch {
      branch = 'main';
    }

    // 检查本地领先远程的提交数
    let ahead = 0;
    try {
      const { stdout } = await execAsync(`git rev-list --count origin/${branch}..HEAD`, { cwd: BACKUP_DIR });
      ahead = parseInt(stdout.trim(), 10);
    } catch {
      // 可能还没有推送到远程
      try {
        const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: BACKUP_DIR });
        ahead = parseInt(stdout.trim(), 10);
      } catch {
        ahead = 0;
      }
    }

    return {
      success: true,
      message: '获取成功',
      remoteUrl,
      branch,
      ahead
    };
  } catch (error) {
    return {
      success: false,
      message: `获取远程信息失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 测试远程仓库连接
 * @param config 推送配置
 */
export async function testRemoteConnection(config: PushConfig): Promise<BackupResult> {
  try {
    let remoteUrl = config.remoteUrl;
    
    // 如果提供了token，将token嵌入到URL中
    if (config.token && remoteUrl.includes('github.com')) {
      remoteUrl = remoteUrl.replace('https://', `https://${config.token}@`);
    }

    // 使用git ls-remote测试连接
    await execAsync(`git ls-remote "${remoteUrl}" HEAD`, { cwd: process.cwd() });

    return {
      success: true,
      message: '连接成功，可以正常访问远程仓库'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    if (errorMessage.includes('Authentication failed')) {
      return {
        success: false,
        message: '认证失败，请检查Token是否正确'
      };
    } else if (errorMessage.includes('Could not resolve host')) {
      return {
        success: false,
        message: '无法连接到远程仓库，请检查URL是否正确'
      };
    } else if (errorMessage.includes('not found')) {
      return {
        success: false,
        message: '仓库不存在，请检查URL是否正确'
      };
    }

    return {
      success: false,
      message: `连接失败: ${errorMessage}`
    };
  }
}
