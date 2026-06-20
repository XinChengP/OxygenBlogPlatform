/**
 * Admin代码本地备份相关的 Server Actions
 * 提供备份、恢复、查看历史、推送到远程仓库等功能
 * 版本恢复功能支持密码验证
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

'use server';

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
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

export interface PushConfig {
  remoteUrl: string;
  branch?: string;
  token?: string;
}

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'admin-backup');
const PASSWORD_FILE = path.join(BACKUP_DIR, '.restore-password');

const BACKUP_ITEMS = [
  'src/app/admin/',
  'src/components/admin/',
  'src/actions/',
  'src/types/admin.ts',
  'src/types/todo.ts',
];

async function execGit(command: string, cwd: string = BACKUP_DIR): Promise<string> {
  try {
    const { stdout } = await execAsync(command, { cwd });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Git command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function ensureBackupDir(): Promise<void> {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

async function initGitRepo(): Promise<void> {
  await ensureBackupDir();
  try {
    await execGit('git init');
    await execGit('git config user.email "admin@backup.local"');
    await execGit('git config user.name "Admin Backup"');
  } catch {
    // 可能已经初始化过，忽略错误
  }
}

async function copyItem(src: string, dest: string): Promise<void> {
  const stat = await fs.stat(src);

  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const items = await fs.readdir(src);
    for (const item of items) {
      await copyItem(path.join(src, item), path.join(dest, item));
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}

async function clearDir(dir: string): Promise<void> {
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      if (item === '.git') continue;
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        await fs.rm(itemPath, { recursive: true });
      } else {
        await fs.unlink(itemPath);
      }
    }
  } catch {
    // 目录可能不存在，忽略错误
  }
}

export async function changeRestorePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    await ensureBackupDir();

    let currentPassword = '';
    try {
      currentPassword = await fs.readFile(PASSWORD_FILE, 'utf-8');
    } catch {
      // 密码文件不存在，视为首次设置
    }

    if (currentPassword && currentPassword !== oldPassword) {
      return { success: false, message: 'Old password is incorrect' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: 'New password must be at least 4 characters' };
    }

    await fs.writeFile(PASSWORD_FILE, newPassword, 'utf-8');

    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function verifyRestorePassword(password: string): Promise<boolean> {
  if (isStaticExport) return false;
  
  try {
    const storedPassword = await fs.readFile(PASSWORD_FILE, 'utf-8');
    return storedPassword === password;
  } catch {
    return true;
  }
}

export async function getBackupPath(): Promise<string> {
  return BACKUP_DIR;
}

export async function backupDirExists(): Promise<boolean> {
  try {
    await fs.access(BACKUP_DIR);
    return true;
  } catch {
    return false;
  }
}

export async function initBackupRepo(): Promise<BackupResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    await initGitRepo();
    return { success: true, message: 'Backup repository initialized successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function performBackup(): Promise<BackupResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    await initGitRepo();
    await clearDir(BACKUP_DIR);

    let filesCount = 0;
    for (const item of BACKUP_ITEMS) {
      const srcPath = path.join(process.cwd(), item);
      const destPath = path.join(BACKUP_DIR, item);

      try {
        await fs.access(srcPath);
        await copyItem(srcPath, destPath);
        filesCount++;
      } catch {
        // 源文件不存在，跳过
      }
    }

    await execGit('git add -A');
    const timestamp = new Date().toISOString();
    const commitMessage = `Backup at ${timestamp}`;

    try {
      await execGit(`git commit -m "${commitMessage}"`);
    } catch {
      // 可能没有变更需要提交
    }

    const commitHash = await execGit('git rev-parse HEAD');

    return {
      success: true,
      message: 'Backup completed successfully',
      backupPath: BACKUP_DIR,
      commitHash,
      filesCount,
      timestamp,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getBackupHistory(
  limit: number = 10
): Promise<BackupResult & { history?: BackupHistory[] }> {
  if (isStaticExport) {
    return { success: true, message: 'Static export mode', history: [] };
  }
  
  try {
    await ensureBackupDir();

    try {
      await execGit('git rev-parse --git-dir');
    } catch {
      return { success: true, message: 'No backup history', history: [] };
    }

    const format = '%H|%s|%ci';
    const output = await execGit(`git log --format="${format}" -n ${limit}`);

    if (!output) {
      return { success: true, message: 'No backup history', history: [] };
    }

    const history: BackupHistory[] = output.split('\n').map((line) => {
      const [commitHash, message, timestamp] = line.split('|');
      return { commitHash, message, timestamp, filesCount: 0 };
    });

    return { success: true, message: 'Success', history };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function restoreBackup(
  commitHash?: string,
  password?: string
): Promise<BackupResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    await ensureBackupDir();

    const isPasswordValid = await verifyRestorePassword(password || '');
    if (!isPasswordValid) {
      return { success: false, message: 'Restore password is incorrect' };
    }

    try {
      await execGit('git rev-parse --git-dir');
    } catch {
      return { success: false, message: 'Backup repository not initialized' };
    }

    const targetCommit = commitHash || (await execGit('git rev-parse HEAD'));
    const tempDir = path.join(BACKUP_DIR, '.restore-temp');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      await execGit(`git archive ${targetCommit} | tar -x -C "${tempDir}"`);
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true });
      return { success: false, message: error instanceof Error ? error.message : 'Failed to export backup files' };
    }

    for (const item of BACKUP_ITEMS) {
      const srcPath = path.join(tempDir, item);
      const destPath = path.join(process.cwd(), item);

      try {
        await fs.access(srcPath);
        try {
          const stat = await fs.stat(destPath);
          if (stat.isDirectory()) {
            await fs.rm(destPath, { recursive: true });
          } else {
            await fs.unlink(destPath);
          }
        } catch {
          // 原文件不存在，忽略
        }
        await copyItem(srcPath, destPath);
      } catch {
        // 备份中不存在此文件，跳过
      }
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    return {
      success: true,
      message: `Successfully restored to version ${targetCommit.slice(0, 7)}`,
      commitHash: targetCommit,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getBackupStatus(): Promise<
  BackupResult & {
    totalCommits?: number;
    lastBackup?: string;
    trackedFiles?: number;
    hasRemote?: boolean;
    remoteUrl?: string;
  }
> {
  if (isStaticExport) {
    return { success: true, message: 'Static export mode', totalCommits: 0, trackedFiles: 0, hasRemote: false };
  }
  
  try {
    await ensureBackupDir();

    let isGitRepo = false;
    try {
      await execGit('git rev-parse --git-dir');
      isGitRepo = true;
    } catch {
      // 不是 Git 仓库
    }

    if (!isGitRepo) {
      return {
        success: true,
        message: 'Backup repository not initialized',
        totalCommits: 0,
        trackedFiles: 0,
        hasRemote: false,
      };
    }

    let totalCommits = 0;
    try {
      const commitCount = await execGit('git rev-list --count HEAD');
      totalCommits = parseInt(commitCount, 10) || 0;
    } catch {
      // 无提交记录
    }

    let lastBackup = '';
    try {
      lastBackup = await execGit('git log -1 --format=%ci');
    } catch {
      // 无提交记录
    }

    let trackedFiles = 0;
    try {
      const lsFiles = await execGit('git ls-files | wc -l');
      trackedFiles = parseInt(lsFiles, 10) || 0;
    } catch {
      // 无法获取
    }

    let hasRemote = false;
    let remoteUrl = '';
    try {
      remoteUrl = await execGit('git remote get-url origin');
      hasRemote = true;
    } catch {
      // 无远程仓库
    }

    return {
      success: true,
      message: 'Success',
      totalCommits,
      lastBackup,
      trackedFiles,
      hasRemote,
      remoteUrl,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function configureRemote(config: PushConfig): Promise<BackupResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    await initGitRepo();

    if (!config.remoteUrl) {
      return { success: false, message: 'Remote repository URL cannot be empty' };
    }

    try {
      await execGit('git remote remove origin');
    } catch {
      // 远程仓库可能不存在，忽略错误
    }

    await execGit(`git remote add origin "${config.remoteUrl}"`);

    return { success: true, message: 'Remote repository configured successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function pushToRemote(config?: PushConfig): Promise<BackupResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    await ensureBackupDir();

    if (config?.remoteUrl) {
      const configResult = await configureRemote(config);
      if (!configResult.success) {
        return configResult;
      }
    }

    try {
      await execGit('git remote get-url origin');
    } catch {
      return { success: false, message: 'Remote repository not configured' };
    }

    const branch = config?.branch || 'main';
    let remoteUrl = await execGit('git remote get-url origin');

    if (config?.token) {
      const urlMatch = remoteUrl.match(/^(https?:\/\/)([^\/]+)(\/.*)$/);
      if (urlMatch) {
        const [, protocol, host, pathPart] = urlMatch;
        remoteUrl = `${protocol}${config.token}@${host}${pathPart}`;
      }
    }

    try {
      await execAsync(`git fetch origin ${branch}`, { cwd: BACKUP_DIR });
    } catch {
      // 远程分支可能不存在，忽略错误
    }

    await execAsync(`git push "${remoteUrl}" ${branch}`, { cwd: BACKUP_DIR });

    return { success: true, message: 'Push completed successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getRemoteInfo(): Promise<
  BackupResult & {
    remoteUrl?: string;
    branch?: string;
    ahead?: number;
  }
> {
  if (isStaticExport) {
    return { success: true, message: 'Static export mode' };
  }
  
  try {
    await ensureBackupDir();

    let remoteUrl = '';
    try {
      remoteUrl = await execGit('git remote get-url origin');
    } catch {
      return { success: true, message: 'Remote repository not configured' };
    }

    let branch = '';
    try {
      branch = await execGit('git branch --show-current');
    } catch {
      branch = 'main';
    }

    let ahead = 0;
    try {
      const aheadCount = await execGit(`git rev-list --count ${branch}...origin/${branch}`);
      ahead = parseInt(aheadCount, 10) || 0;
    } catch {
      // 无法获取，设为 0
    }

    return { success: true, message: 'Success', remoteUrl, branch, ahead };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testRemoteConnection(config: PushConfig): Promise<BackupResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    if (!config.remoteUrl) {
      return { success: false, message: 'Remote repository URL cannot be empty' };
    }

    let testUrl = config.remoteUrl;
    if (config.token) {
      const urlMatch = config.remoteUrl.match(/^(https?:\/\/)([^\/]+)(\/.*)$/);
      if (urlMatch) {
        const [, protocol, host, pathPart] = urlMatch;
        testUrl = `${protocol}${config.token}@${host}${pathPart}`;
      }
    }

    await execAsync(`git ls-remote "${testUrl}" HEAD`, { cwd: BACKUP_DIR });

    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}