/**
 * Admin代码本地备份相关的 Server Actions
 * 提供备份、恢复、查看历史、推送到远程仓库等功能
 * 版本恢复功能支持密码验证
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

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
  remoteUrl: string;      // 远程仓库地址
  branch?: string;        // 分支名，默认为 main
  token?: string;         // GitHub/GitLab Token（可选）
}

// ============================================
// 静态导出模式：空实现（不使用 'use server'）
// ============================================

function changeRestorePasswordStatic(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function verifyRestorePasswordStatic(password: string): Promise<boolean> {
  return Promise.resolve(false);
}

function getBackupPathStatic(): Promise<string> {
  return Promise.resolve('');
}

function backupDirExistsStatic(): Promise<boolean> {
  return Promise.resolve(false);
}

function initBackupRepoStatic(): Promise<BackupResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function performBackupStatic(): Promise<BackupResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function getBackupHistoryStatic(limit?: number): Promise<BackupResult & { history?: BackupHistory[] }> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function restoreBackupStatic(commitHash?: string, password?: string): Promise<BackupResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function getBackupStatusStatic(): Promise<BackupResult & {
  totalCommits?: number;
  lastBackup?: string;
  trackedFiles?: number;
  hasRemote?: boolean;
  remoteUrl?: string;
}> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function configureRemoteStatic(config: PushConfig): Promise<BackupResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function pushToRemoteStatic(config?: PushConfig): Promise<BackupResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function getRemoteInfoStatic(): Promise<BackupResult & {
  remoteUrl?: string;
  branch?: string;
  ahead?: number;
}> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function testRemoteConnectionStatic(config: PushConfig): Promise<BackupResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

// ============================================
// 本地开发模式：真实实现（使用 'use server'）
// ============================================

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
let backupActionsReal: {
  changeRestorePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  verifyRestorePassword: (password: string) => Promise<boolean>;
  getBackupPath: () => Promise<string>;
  backupDirExists: () => Promise<boolean>;
  initBackupRepo: () => Promise<BackupResult>;
  performBackup: () => Promise<BackupResult>;
  getBackupHistory: (limit?: number) => Promise<BackupResult & { history?: BackupHistory[] }>;
  restoreBackup: (commitHash?: string, password?: string) => Promise<BackupResult>;
  getBackupStatus: () => Promise<BackupResult & {
    totalCommits?: number;
    lastBackup?: string;
    trackedFiles?: number;
    hasRemote?: boolean;
    remoteUrl?: string;
  }>;
  configureRemote: (config: PushConfig) => Promise<BackupResult>;
  pushToRemote: (config?: PushConfig) => Promise<BackupResult>;
  getRemoteInfo: () => Promise<BackupResult & {
    remoteUrl?: string;
    branch?: string;
    ahead?: number;
  }>;
  testRemoteConnection: (config: PushConfig) => Promise<BackupResult>;
} | null = null;

// 动态导入真实实现（只在非静态导出模式下）
if (!isStaticExport) {
  // 使用 eval 包装 require 动态导入，避免 Turbopack 在构建时解析
  try {
    // eslint-disable-next-line no-eval
    const realModule = eval("require('./backupActions.real')");
    backupActionsReal = realModule;
  } catch {
    // 如果真实实现模块不存在，使用空实现
    backupActionsReal = null;
  }
}

// ============================================
// 导出函数：根据环境选择实现
// ============================================

/**
 * 修改恢复密码
 * @param oldPassword - 旧密码（用于验证身份）
 * @param newPassword - 新密码
 * @returns 操作结果
 */
export async function changeRestorePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (isStaticExport || !backupActionsReal) {
    return changeRestorePasswordStatic(oldPassword, newPassword);
  }
  return backupActionsReal.changeRestorePassword(oldPassword, newPassword);
}

/**
 * 验证恢复密码是否正确
 * @param password - 要验证的密码
 * @returns 验证结果
 */
export async function verifyRestorePassword(password: string): Promise<boolean> {
  if (isStaticExport || !backupActionsReal) {
    return verifyRestorePasswordStatic(password);
  }
  return backupActionsReal.verifyRestorePassword(password);
}

/**
 * 获取备份目录路径
 */
export async function getBackupPath(): Promise<string> {
  if (isStaticExport || !backupActionsReal) {
    return getBackupPathStatic();
  }
  return backupActionsReal.getBackupPath();
}

/**
 * 检查备份目录是否存在
 */
export async function backupDirExists(): Promise<boolean> {
  if (isStaticExport || !backupActionsReal) {
    return backupDirExistsStatic();
  }
  return backupActionsReal.backupDirExists();
}

/**
 * 初始化备份目录的Git仓库
 */
export async function initBackupRepo(): Promise<BackupResult> {
  if (isStaticExport || !backupActionsReal) {
    return initBackupRepoStatic();
  }
  return backupActionsReal.initBackupRepo();
}

/**
 * 执行备份操作
 * 将admin相关代码复制到备份目录并提交
 */
export async function performBackup(): Promise<BackupResult> {
  if (isStaticExport || !backupActionsReal) {
    return performBackupStatic();
  }
  return backupActionsReal.performBackup();
}

/**
 * 获取备份历史记录
 * @param limit - 限制返回的记录数量，默认为10
 */
export async function getBackupHistory(limit?: number): Promise<BackupResult & { history?: BackupHistory[] }> {
  if (isStaticExport || !backupActionsReal) {
    return getBackupHistoryStatic(limit);
  }
  return backupActionsReal.getBackupHistory(limit);
}

/**
 * 从指定提交恢复备份（带密码验证）
 * @param commitHash - 要恢复的提交哈希，不传则恢复最新版本
 * @param password - 恢复密码，用于验证操作权限
 */
export async function restoreBackup(commitHash?: string, password?: string): Promise<BackupResult> {
  if (isStaticExport || !backupActionsReal) {
    return restoreBackupStatic(commitHash, password);
  }
  return backupActionsReal.restoreBackup(commitHash, password);
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
  if (isStaticExport || !backupActionsReal) {
    return getBackupStatusStatic();
  }
  return backupActionsReal.getBackupStatus();
}

/**
 * 配置远程仓库
 * @param config - 推送配置
 */
export async function configureRemote(config: PushConfig): Promise<BackupResult> {
  if (isStaticExport || !backupActionsReal) {
    return configureRemoteStatic(config);
  }
  return backupActionsReal.configureRemote(config);
}

/**
 * 推送到远程仓库
 * @param config - 推送配置（可选，如果已配置过远程仓库）
 */
export async function pushToRemote(config?: PushConfig): Promise<BackupResult> {
  if (isStaticExport || !backupActionsReal) {
    return pushToRemoteStatic(config);
  }
  return backupActionsReal.pushToRemote(config);
}

/**
 * 获取远程仓库信息
 */
export async function getRemoteInfo(): Promise<BackupResult & {
  remoteUrl?: string;
  branch?: string;
  ahead?: number;
}> {
  if (isStaticExport || !backupActionsReal) {
    return getRemoteInfoStatic();
  }
  return backupActionsReal.getRemoteInfo();
}

/**
 * 测试远程仓库连接
 * @param config - 推送配置
 */
export async function testRemoteConnection(config: PushConfig): Promise<BackupResult> {
  if (isStaticExport || !backupActionsReal) {
    return testRemoteConnectionStatic(config);
  }
  return backupActionsReal.testRemoteConnection(config);
}
