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
import { exec, execFile } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const BACKUP_DIR = path.join(process.cwd(), 'admin-backup');
const PASSWORD_FILE = path.join(BACKUP_DIR, '.restore-password');

/*
  后台备份清单

  为什么要包含这些看起来「不属于后台目录」的文件：
  src/app/admin 下的页面直接引用了后台专用 Hooks、工具函数、类型与服务。
  原清单只备份页面、组件和 actions，从备份仓库恢复后会缺依赖而无法编译。
  因此这里把后台运行时真正需要的模块一并纳入，保证备份是一份完整快照。
*/
const BACKUP_ITEMS = [
  // 后台页面与组件
  'src/app/admin/',
  'src/components/admin/',
  // 后台 Server Actions
  'src/actions/',
  // 后台专用 Hooks
  'src/hooks/useAdminBlogs.ts',
  'src/hooks/useAdminMoments.ts',
  'src/hooks/useGitHubPush.ts',
  'src/hooks/useGallery.ts',
  // 后台依赖的工具函数
  'src/utils/adminUtils.ts',
  'src/utils/imageUtils.ts',
  'src/utils/editorImageUpload.ts',
  'src/utils/clipboard.ts',
  'src/utils/frontMatterUtils.ts',
  'src/utils/cn.ts',
  'src/utils/server/adminStats.ts',
  // 后台图床依赖的 GitHub 服务
  'src/services/githubApi.ts',
  // 后台相关类型
  'src/types/admin.ts',
  'src/types/todo.ts',
  'src/types/gallery.ts',
  'src/types/changelogTypes.ts',
  // 后台依赖的站点配置
  'src/setting/AboutSetting.ts',
  'src/setting/blogSetting.ts',
];

async function execGit(command: string, cwd: string = BACKUP_DIR): Promise<string> {
  try {
    const { stdout } = await execAsync(command, { cwd });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Git command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 以「可执行文件 + 参数数组」的方式执行 git 命令
 *
 * 为什么必须用它：exec 会把整条字符串交给 shell 解析，
 * 只要参数来自前端（远程地址、分支名、提交哈希、数量），就可能被
 * `"`、`;`、`|` 等字符拼接出额外命令。execFile 不经过 shell，
 * 参数会原样传递给 git，从根源上消除命令注入。
 *
 * @param args git 参数数组
 * @param cwd 工作目录
 * @returns 标准输出（已去除首尾空白）
 */
async function execGitArgs(args: string[], cwd: string = BACKUP_DIR): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Unknown error';
    // 错误信息里可能带 `https://token@host/...`，返回前端前必须脱敏
    throw new Error(`Git command failed: ${raw.replace(/\/\/[^@\s]+@/g, '//***@')}`);
  }
}

/**
 * 校验远程仓库地址
 * 只允许 http(s)、git、ssh 协议，禁止空白与 shell 元字符。
 */
function isSafeGitRemoteUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return /^(https?:\/\/|git:\/\/|ssh:\/\/|git@)[^\s"'`;|&<>]+$/.test(url);
}

/**
 * 校验分支名，禁止 `..`、空格与 shell 元字符
 */
function isSafeBranchName(branch: string): boolean {
  if (!branch || typeof branch !== 'string') {
    return false;
  }
  return /^[A-Za-z0-9._/-]+$/.test(branch) && !branch.includes('..');
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

/**
 * 复制文件或目录
 * @returns 实际复制的文件数量（目录会递归累加）
 */
async function copyItem(src: string, dest: string): Promise<number> {
  const stat = await fs.stat(src);

  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const items = await fs.readdir(src);
    let count = 0;
    for (const item of items) {
      count += await copyItem(path.join(src, item), path.join(dest, item));
    }
    return count;
  }

  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
  return 1;
}

async function clearDir(dir: string): Promise<void> {
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      /*
        .git 保存备份仓库的提交历史，必须保留；
        .restore-password 是恢复密码文件，业务上也必须保留。
        原实现只跳过 .git，导致每次备份都会把密码文件一并删除，
        之后恢复功能对已设置密码的用户永久失效。
      */
      if (item === '.git' || item === '.restore-password') continue;
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
    /*
      密码文件读取失败（不存在/无权限）时必须拒绝（fails-closed）。
      原实现 catch 里 return true：密码文件缺失时任何密码都能通过校验，
      等于恢复功能的最后一道防线在异常情况下自动放行。
    */
    return false;
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
        // 累加真实文件数，而不是把每个备份条目只算作 1
        filesCount += await copyItem(srcPath, destPath);
      } catch {
        // 源文件不存在，跳过
      }
    }

    await execGit('git add -A');
    const timestamp = new Date().toISOString();
    const commitMessage = `Backup at ${timestamp}`;

    try {
      // 使用参数数组，提交信息即使包含引号也不会破坏命令
      await execGitArgs(['commit', '-m', commitMessage]);
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
    // limit 来自客户端，先收敛到 1-100，避免拼接出异常参数
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const output = await execGitArgs(['log', `--format=${format}`, '-n', String(safeLimit)]);

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
      // 使用中文错误信息，与前端「密码错误」的分支判断保持一致
      return { success: false, message: '恢复密码不正确' };
    }

    try {
      await execGit('git rev-parse --git-dir');
    } catch {
      return { success: false, message: 'Backup repository not initialized' };
    }

    const targetCommit = commitHash || (await execGit('git rev-parse HEAD'));
    // 提交哈希来自客户端，必须严格校验，防止被当作额外命令参数
    if (!/^[0-9a-f]{4,40}$/i.test(targetCommit)) {
      return { success: false, message: '无效的提交哈希' };
    }

    const tempDir = path.join(BACKUP_DIR, '.restore-temp');
    const archivePath = path.join(BACKUP_DIR, '.restore-archive.tar');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      /*
        不再使用 `git archive | tar` 管道：
        管道依赖 shell，且 Windows cmd 下二进制数据容易损坏。
        改为先导出 tar 文件，再用参数数组调用 tar 解压。
      */
      await execGitArgs(['archive', '--format=tar', `--output=${archivePath}`, targetCommit]);
      await execFileAsync('tar', ['-x', '-f', archivePath, '-C', tempDir], { maxBuffer: 10 * 1024 * 1024 });
      await fs.rm(archivePath, { force: true });
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.rm(archivePath, { force: true });
      return { success: false, message: error instanceof Error ? error.message : 'Failed to export backup files' };
    }

    /*
      恢复顺序：先把现有内容改名为 .restore-old 作为回滚点，
      再复制备份内容；复制失败时立即还原，避免「删了旧的、新的没拷进去」。
      原实现先 rm 目标、再拷贝，且静默吞掉异常并返回成功，存在文件永久丢失风险。
    */
    const failedItems: string[] = [];

    for (const item of BACKUP_ITEMS) {
      const srcPath = path.join(tempDir, item);
      const destPath = path.join(process.cwd(), item);

      // 备份中不存在该条目属于正常情况，直接跳过
      try {
        await fs.access(srcPath);
      } catch {
        continue;
      }

      const rollbackPath = `${destPath}.restore-old`;
      let hasRollback = false;

      try {
        // 清理可能残留的旧回滚目录，再把当前内容移走
        await fs.rm(rollbackPath, { recursive: true, force: true });
        try {
          await fs.rename(destPath, rollbackPath);
          hasRollback = true;
        } catch {
          // 目标原本不存在，无需回滚点
        }

        await copyItem(srcPath, destPath);

        // 复制成功，删除回滚点
        if (hasRollback) {
          await fs.rm(rollbackPath, { recursive: true, force: true });
        }
      } catch (error) {
        // 复制失败：还原原内容，并记录失败条目
        console.error(`恢复条目失败: ${item}`, error);
        if (hasRollback) {
          await fs.rm(destPath, { recursive: true, force: true }).catch(() => undefined);
          await fs.rename(rollbackPath, destPath).catch(() => undefined);
        }
        failedItems.push(item);
      }
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    if (failedItems.length > 0) {
      return {
        success: false,
        message: `恢复未完成，以下条目恢复失败：${failedItems.join('、')}`,
        commitHash: targetCommit,
      };
    }

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
    /** 是否已初始化备份 Git 仓库，前端据此显示状态，不能再用 totalCommits 是否存在来判断 */
    isGitRepo?: boolean;
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
        isGitRepo: false,
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
      /*
        原实现是 `git ls-files | wc -l`：
        Windows 没有 wc，异常被 catch 吞掉后永远显示 0 个跟踪文件。
        改为直接读取 ls-files 输出并按行计数，跨平台一致。
      */
      const lsFiles = await execGitArgs(['ls-files']);
      trackedFiles = lsFiles ? lsFiles.split('\n').filter(Boolean).length : 0;
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
      isGitRepo: true,
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

    // 远程地址来自前端，必须先校验协议与字符
    if (!isSafeGitRemoteUrl(config.remoteUrl)) {
      return { success: false, message: '无效的远程仓库地址' };
    }

    /*
      原实现先 `remote remove origin` 再 `remote add`：
      一旦 add 失败（地址非法），原来的远程配置就被删掉了。
      改为「存在则改地址、不存在才新增」，避免丢失配置。
    */
    try {
      await execGitArgs(['remote', 'set-url', 'origin', config.remoteUrl]);
    } catch {
      await execGitArgs(['remote', 'add', 'origin', config.remoteUrl]);
    }

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
    if (!isSafeBranchName(branch)) {
      return { success: false, message: '无效的分支名称' };
    }
    let remoteUrl = await execGit('git remote get-url origin');

    if (config?.token) {
      const urlMatch = remoteUrl.match(/^(https?:\/\/)([^\/]+)(\/.*)$/);
      if (urlMatch) {
        const [, protocol, host, pathPart] = urlMatch;
        remoteUrl = `${protocol}${config.token}@${host}${pathPart}`;
      }
    }

    try {
      // 分支名已校验，使用参数数组避免命令注入
      await execGitArgs(['fetch', 'origin', branch]);
    } catch {
      // 远程分支可能不存在，忽略错误
    }

    await execGitArgs(['push', remoteUrl, branch]);

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
      if (isSafeBranchName(branch)) {
        const aheadCount = await execGitArgs(['rev-list', '--count', `${branch}...origin/${branch}`]);
        ahead = parseInt(aheadCount, 10) || 0;
      }
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

    if (!isSafeGitRemoteUrl(config.remoteUrl)) {
      return { success: false, message: '无效的远程仓库地址' };
    }

    let testUrl = config.remoteUrl;
    if (config.token) {
      const urlMatch = config.remoteUrl.match(/^(https?:\/\/)([^\/]+)(\/.*)$/);
      if (urlMatch) {
        const [, protocol, host, pathPart] = urlMatch;
        testUrl = `${protocol}${config.token}@${host}${pathPart}`;
      }
    }

    await execGitArgs(['ls-remote', testUrl, 'HEAD']);

    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
