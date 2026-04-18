// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

/**
 * Git 操作结果接口
 */
export interface GitPushResult {
  success: boolean;
  message: string;
  commitHash?: string;
  pushedFiles?: string[];
}

/**
 * Git 状态接口
 */
export interface GitStatus {
  isRepo: boolean;
  hasRemote: boolean;
  currentBranch: string;
  hasUncommittedChanges: boolean;
  uncommittedFiles: string[];
  trackingBranch?: string;
  hasPushable: boolean;
  aheadCount: number;
  behindCount: number;
}

// 空实现函数（不使用 async，不返回 Promise）
export function initGitRepo(): {
  success: boolean;
  message: string;
  isRepo: boolean;
  hasRemote: boolean;
} {
  return { success: false, message: '静态导出模式不支持此功能', isRepo: false, hasRemote: false };
}

export function getGitStatus(): GitStatus {
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

export function hasUncommittedChanges(): boolean {
  return false;
}

export function isAheadOfRemote(): boolean {
  return false;
}

export function getUncommittedFiles(): {
  modified: string[];
  created: string[];
  deleted: string[];
  renamed: string[];
} {
  return { modified: [], created: [], deleted: [], renamed: [] };
}

export function pushToGitHub(message?: string): GitPushResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function buildAndPush(
  buildMessage?: string,
  pushMessage?: string
): GitPushResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function addRemote(
  name: string,
  url: string
): { success: boolean; message: string } {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getRemoteList(): Array<{
  name: string;
  url: string;
}> {
  return [];
}

export function getCommitHistory(
  limit?: number
): Array<{
  hash: string;
  message: string;
  date: string;
  author: string;
}> {
  return [];
}
