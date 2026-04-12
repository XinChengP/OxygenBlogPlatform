// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

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

// 空实现函数 - 在静态导出模式下返回默认值
export async function changeRestorePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function verifyRestorePassword(password: string): Promise<boolean> {
  return false;
}

export async function getBackupPath(): Promise<string> {
  return '';
}

export async function backupDirExists(): Promise<boolean> {
  return false;
}

export async function initBackupRepo(): Promise<BackupResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function performBackup(): Promise<BackupResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getBackupHistory(limit: number = 10): Promise<BackupResult & { history?: BackupHistory[] }> {
  return { success: false, message: '静态导出模式不支持此功能', history: [] };
}

export async function restoreBackup(commitHash?: string, password?: string): Promise<BackupResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getBackupStatus(): Promise<BackupResult & { totalCommits?: number; lastBackup?: string; trackedFiles?: number; hasRemote?: boolean; remoteUrl?: string }> {
  return { success: false, message: '静态导出模式不支持此功能', totalCommits: 0, lastBackup: '', trackedFiles: 0, hasRemote: false };
}

export async function configureRemote(config: PushConfig): Promise<BackupResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function pushToRemote(config?: PushConfig): Promise<BackupResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getRemoteInfo(): Promise<BackupResult & { remoteUrl?: string; branch?: string; ahead?: number }> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function testRemoteConnection(config: PushConfig): Promise<BackupResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
