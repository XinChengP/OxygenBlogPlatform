/**
 * GitHub 推送功能相关的 Server Actions
 * 提供 Git 仓库操作、状态检查和推送到 GitHub 的功能
 * 使用 simple-git 库执行 Git 操作
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的 Git 操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// ============================================
// 类型定义
// ============================================

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

// ============================================
// 静态导出模式：空实现（不使用 'use server'）
// ============================================

function initGitRepoStatic(): Promise<{
  success: boolean;
  message: string;
  isRepo: boolean;
  hasRemote: boolean;
}> {
  return Promise.resolve({
    success: false,
    message: '静态导出模式不支持此功能',
    isRepo: false,
    hasRemote: false,
  });
}

function getGitStatusStatic(): Promise<GitStatus> {
  return Promise.resolve({
    isRepo: false,
    hasRemote: false,
    currentBranch: '',
    hasUncommittedChanges: false,
    uncommittedFiles: [],
    hasPushable: false,
    aheadCount: 0,
    behindCount: 0,
  });
}

function hasUncommittedChangesStatic(): Promise<boolean> {
  return Promise.resolve(false);
}

function isAheadOfRemoteStatic(): Promise<boolean> {
  return Promise.resolve(false);
}

function getUncommittedFilesStatic(): Promise<{
  modified: string[];
  added: string[];
  deleted: string[];
  renamed: string[];
}> {
  return Promise.resolve({ modified: [], added: [], deleted: [], renamed: [] });
}

function pushToGitHubStatic(_message?: string): Promise<GitPushResult> {
  return Promise.resolve({
    success: false,
    message: '静态导出模式不支持此功能',
  });
}

function buildAndPushStatic(
  _buildMessage?: string,
  _pushMessage?: string
): Promise<GitPushResult> {
  return Promise.resolve({
    success: false,
    message: '静态导出模式不支持此功能',
  });
}

function addRemoteStatic(
  _remoteName: string = 'origin',
  _remoteUrl: string
): Promise<{
  success: boolean;
  message: string;
}> {
  return Promise.resolve({
    success: false,
    message: '静态导出模式不支持此功能',
  });
}

function getRemoteListStatic(): Promise<Array<{
  name: string;
  url: string;
}>> {
  return Promise.resolve([]);
}

function getCommitHistoryStatic(
  _count: number = 10
): Promise<Array<{
  hash: string;
  message: string;
  date: string;
  author: string;
}>> {
  return Promise.resolve([]);
}

// ============================================
// 本地开发模式：真实实现（使用 'use server'）
// ============================================

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
let githubActionsReal: {
  initGitRepo: () => Promise<{
    success: boolean;
    message: string;
    isRepo: boolean;
    hasRemote: boolean;
  }>;
  getGitStatus: () => Promise<GitStatus>;
  hasUncommittedChanges: () => Promise<boolean>;
  isAheadOfRemote: () => Promise<boolean>;
  getUncommittedFiles: () => Promise<{
    modified: string[];
    added: string[];
    deleted: string[];
    renamed: string[];
  }>;
  pushToGitHub: (message?: string) => Promise<GitPushResult>;
  buildAndPush: (buildMessage?: string, pushMessage?: string) => Promise<GitPushResult>;
  addRemote: (remoteName?: string, remoteUrl?: string) => Promise<{
    success: boolean;
    message: string;
  }>;
  getRemoteList: () => Promise<Array<{
    name: string;
    url: string;
  }>>;
  getCommitHistory: (count?: number) => Promise<Array<{
    hash: string;
    message: string;
    date: string;
    author: string;
  }>>;
} | null = null;

// 动态导入真实实现（只在非静态导出模式下）
if (!isStaticExport) {
  // 使用 eval 包装 require 动态导入，避免 Turbopack 在构建时解析
  try {
    // eslint-disable-next-line no-eval
    const realModule = eval("require('./githubActions.real')");
    githubActionsReal = realModule;
  } catch {
    // 如果真实实现模块不存在，使用空实现
    githubActionsReal = null;
  }
}

// ============================================
// 导出函数：根据环境选择实现
// ============================================

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
  if (isStaticExport || !githubActionsReal) {
    return initGitRepoStatic();
  }
  return githubActionsReal.initGitRepo();
}

/**
 * 获取 Git 状态信息
 * 返回当前 Git 仓库的完整状态，包括分支、远程、未提交更改等信息
 * 同时检测本地与远程的同步状态（ahead/behind）
 * @returns 返回 GitStatus 对象，描述当前 Git 仓库状态
 */
export async function getGitStatus(): Promise<GitStatus> {
  if (isStaticExport || !githubActionsReal) {
    return getGitStatusStatic();
  }
  return githubActionsReal.getGitStatus();
}

/**
 * 检查是否有未提交的更改
 * 这是一个简化版的检查，用于快速判断工作区是否有待提交的更改
 * @returns 如果有未提交的更改返回 true，否则返回 false
 */
export async function hasUncommittedChanges(): Promise<boolean> {
  if (isStaticExport || !githubActionsReal) {
    return hasUncommittedChangesStatic();
  }
  return githubActionsReal.hasUncommittedChanges();
}

/**
 * 检测本地是否有领先于远程的提交
 * 如果有，说明之前的推送已经完成，不需要重复推送
 * 这用于防止短时间内重复推送相同的提交
 * @returns 如果有领先提交返回 true，否则返回 false
 */
export async function isAheadOfRemote(): Promise<boolean> {
  if (isStaticExport || !githubActionsReal) {
    return isAheadOfRemoteStatic();
  }
  return githubActionsReal.isAheadOfRemote();
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
  if (isStaticExport || !githubActionsReal) {
    return getUncommittedFilesStatic();
  }
  return githubActionsReal.getUncommittedFiles();
}

/**
 * 推送到 GitHub
 * 将所有更改添加到暂存区、提交并推送到远程仓库
 * 如果没有需要推送的内容（工作区干净且没有待推送的提交），会返回提示信息
 * @param message 提交消息，如果未提供则使用包含时间戳的默认消息
 * @returns 返回 GitPushResult，描述推送操作的结果
 */
export async function pushToGitHub(message?: string): Promise<GitPushResult> {
  if (isStaticExport || !githubActionsReal) {
    return pushToGitHubStatic(message);
  }
  return githubActionsReal.pushToGitHub(message);
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
  if (isStaticExport || !githubActionsReal) {
    return buildAndPushStatic(buildMessage, pushMessage);
  }
  return githubActionsReal.buildAndPush(buildMessage, pushMessage);
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
  if (isStaticExport || !githubActionsReal) {
    return addRemoteStatic(remoteName, remoteUrl);
  }
  return githubActionsReal.addRemote(remoteName, remoteUrl);
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
  if (isStaticExport || !githubActionsReal) {
    return getRemoteListStatic();
  }
  return githubActionsReal.getRemoteList();
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
  if (isStaticExport || !githubActionsReal) {
    return getCommitHistoryStatic(count);
  }
  return githubActionsReal.getCommitHistory(count);
}
