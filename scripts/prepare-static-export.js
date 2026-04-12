/**
 * 静态导出准备脚本
 * 在静态导出构建前，将 Server Actions 替换为静态兼容版本
 */

const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, '..', 'src', 'actions');
const backupDir = path.join(__dirname, '..', '.backup', 'actions');

// 检查是否在静态导出模式 - 支持多种环境变量名称
const isStaticExport = process.env.STATIC_EXPORT === 'true' || 
                       process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' ||
                       process.env.NODE_ENV === 'production';

if (!isStaticExport) {
  console.log('📝 非静态导出模式，跳过准备步骤');
  process.exit(0);
}

console.log('🔄 准备静态导出...');

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 定义每个文件的特定内容（不使用 'use client' 或 'use server'）
const fileContents = {
  'blogActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

// 类型定义
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  content: string;
  coverImage?: string;
  readingTime?: number;
  wordCount?: number;
  updatedAt?: string;
  filePath: string;
  hidden?: boolean;
  pinned?: boolean;
  pinnedAt?: string;
}

export interface BlogPostData {
  title: string;
  content: string;
  date?: string;
  category: string;
  tags?: string[];
  excerpt?: string;
  coverImage?: string;
  slug?: string;
}

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

// 空实现函数 - 在静态导出模式下返回默认值
export async function getBlogDetail(id: string): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getBlogList(): Promise<BlogPost[]> {
  return [];
}

export async function createBlog(data: BlogPostData): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function updateBlog(id: string, data: Partial<BlogPostData>): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function deleteBlog(id: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchDeleteBlogs(ids: string[]): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchUpdateBlogCategory(ids: string[], category: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getBlogCategories(): Promise<string[]> {
  return [];
}

export async function saveBlogMarkdown(slug: string, content: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function toggleBlogHidden(id: string): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchToggleBlogHidden(ids: string[], hidden: boolean): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
`,

  'momentActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

// 类型定义
export interface MomentData {
  time: string;
  content: string;
  tags?: string[];
  images?: string[];
  pinned?: boolean;
  hidden?: boolean;
}

export interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images: string[];
  pinned: boolean;
  hidden: boolean;
}

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

// 空实现函数
export async function getMomentDetail(id: string): Promise<ActionResult<Moment>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getMomentList(): Promise<ActionResult<Moment[]>> {
  return { success: true, message: '', data: [] };
}

export async function createMoment(data: MomentData): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function updateMoment(id: string, data: Partial<MomentData>): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function deleteMoment(id: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchDeleteMoments(ids: string[]): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function toggleMomentPinned(id: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchToggleMomentPinned(ids: string[], pinned: boolean): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function generateNewMomentId(): string {
  return \`moment-\${Date.now()}\`;
}

export async function getMomentTags(): Promise<string[]> {
  return [];
}

export async function toggleMomentHidden(id: string): Promise<ActionResult<Moment>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchToggleMomentHidden(ids: string[], hidden: boolean): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
`,

  'galleryActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

import { GalleryImage } from '@/types/gallery';

export interface UploadResult {
  success: boolean;
  message: string;
  image?: GalleryImage;
}

export interface UploadMultipleResult {
  success: boolean;
  message: string;
  images: GalleryImage[];
  failed: string[];
}

export interface GalleryStats {
  totalImages: number;
  totalSize: number;
  directories: number;
}

export interface DirectoryTree {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  children?: DirectoryTree[];
  imageCount?: number;
}

// 空实现函数
export async function getLocalGalleryImages(subPath?: string): Promise<GalleryImage[]> {
  return [];
}

export async function getLocalGalleryDirectories(subPath?: string): Promise<string[]> {
  return [];
}

export async function getLocalGalleryDirectoryTree(): Promise<DirectoryTree[]> {
  return [];
}

export async function getLocalGallerySubDirectories(parentPath?: string): Promise<{
  name: string;
  path: string;
  imageCount: number;
}[]> {
  return [];
}

export async function deleteLocalImage(imagePath: string): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function uploadLocalImage(formData: FormData, targetPath?: string): Promise<UploadResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function uploadLocalImages(formDataList: FormData[], targetPath?: string): Promise<UploadMultipleResult> {
  return { success: false, message: '不支持', images: [], failed: [] };
}

export async function getLocalGalleryStats(): Promise<GalleryStats> {
  return { totalImages: 0, totalSize: 0, directories: 0 };
}
`,

  'settingsActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

// 类型定义
export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  author: string;
  email: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
  github: string;
  twitter: string;
  weibo: string;
  bilibili: string;
  socialEmail: string;
  enablePwa: boolean;
  enableAnalytics: boolean;
  enableComments: boolean;
  maintenanceMode: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

// 空实现函数
export async function getSettings(): Promise<SystemSettings> {
  return {
    siteName: '心想事成 的 Blog',
    siteDescription: '以洛天依为主题的个人博客',
    siteUrl: '',
    author: '心想事成',
    email: '',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    ogImage: '',
    github: '',
    twitter: '',
    weibo: '',
    bilibili: '',
    socialEmail: '',
    enablePwa: true,
    enableAnalytics: false,
    enableComments: true,
    maintenanceMode: false,
  };
}

export async function saveSettings(settings: Partial<SystemSettings>): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function resetSettings(): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
`,

  'backupActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
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
`,

  'githubActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
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

// 空实现函数
export async function initGitRepo(): Promise<{
  success: boolean;
  message: string;
  isRepo: boolean;
  hasRemote: boolean;
}> {
  return { success: false, message: '静态导出模式不支持此功能', isRepo: false, hasRemote: false };
}

export async function getGitStatus(): Promise<GitStatus> {
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

export async function hasUncommittedChanges(): Promise<boolean> {
  return false;
}

export async function isAheadOfRemote(): Promise<boolean> {
  return false;
}

export async function getUncommittedFiles(): Promise<{
  modified: string[];
  created: string[];
  deleted: string[];
  renamed: string[];
}> {
  return { modified: [], created: [], deleted: [], renamed: [] };
}

export async function pushToGitHub(message?: string): Promise<GitPushResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function buildAndPush(
  buildMessage?: string,
  pushMessage?: string
): Promise<GitPushResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function addRemote(
  name: string,
  url: string
): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getRemoteList(): Promise<Array<{
  name: string;
  url: string;
}>> {
  return [];
}

export async function getCommitHistory(
  limit?: number
): Promise<Array<{
  hash: string;
  message: string;
  date: string;
  author: string;
}>> {
  return [];
}
`,

  'todoActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

import type { TodoItem, TodoConfig, TodoFormData, TodoActionResult } from '@/types/todo';

// 空实现函数
export async function getTodoConfig(): Promise<TodoActionResult<TodoConfig>> {
  return {
    success: true,
    message: '获取成功',
    data: {
      title: '待办事项',
      items: [],
      showStats: true,
    },
  };
}

export async function getTodoList(): Promise<TodoActionResult<TodoItem[]>> {
  return { success: true, message: '获取成功', data: [] };
}

export async function getTodoItem(id: string): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function createTodoItem(data: TodoFormData): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function updateTodoItem(
  id: string,
  data: Partial<TodoFormData>
): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function deleteTodoItem(id: string): Promise<TodoActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function toggleTodoComplete(id: string): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchDeleteTodoItems(ids: string[]): Promise<TodoActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function updateTodoConfigSettings(
  settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>
): Promise<TodoActionResult<TodoConfig>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
`
};

// 备份并替换文件
Object.entries(fileContents).forEach(([file, content]) => {
  const srcPath = path.join(actionsDir, file);
  const backupPath = path.join(backupDir, file);
  
  if (fs.existsSync(srcPath)) {
    // 备份原始文件
    fs.copyFileSync(srcPath, backupPath);
    console.log(`✅ 已备份: ${file}`);
    
    // 写入静态导出版本
    fs.writeFileSync(srcPath, content);
    console.log(`📝 已替换为静态版本: ${file}`);
  }
});

console.log('✨ 静态导出准备完成');
