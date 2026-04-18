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

// 空实现函数 - 在静态导出模式下返回默认值（不使用 async，不返回 Promise）
export function changeRestorePassword(
  oldPassword: string,
  newPassword: string
): { success: boolean; message: string } {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function verifyRestorePassword(password: string): boolean {
  return false;
}

export function getBackupPath(): string {
  return '';
}

export function backupDirExists(): boolean {
  return false;
}

export function initBackupRepo(): BackupResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function performBackup(): BackupResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getBackupHistory(limit: number = 10): BackupResult & { history?: BackupHistory[] } {
  return { success: false, message: '静态导出模式不支持此功能', history: [] };
}

export function restoreBackup(commitHash?: string, password?: string): BackupResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getBackupStatus(): BackupResult & { totalCommits?: number; lastBackup?: string; trackedFiles?: number; hasRemote?: boolean; remoteUrl?: string } {
  return { success: false, message: '静态导出模式不支持此功能', totalCommits: 0, lastBackup: '', trackedFiles: 0, hasRemote: false };
}

export function configureRemote(config: PushConfig): BackupResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function pushToRemote(config?: PushConfig): BackupResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getRemoteInfo(): BackupResult & { remoteUrl?: string; branch?: string; ahead?: number } {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function testRemoteConnection(config: PushConfig): BackupResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}
