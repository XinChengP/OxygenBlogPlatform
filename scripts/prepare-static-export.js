/**
 * 静态导出准备脚本
 * 在静态导出构建前，将 Server Actions 替换为静态兼容版本
 */

const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, '..', 'src', 'actions');
// 将备份存储在 node_modules 中，避免被 Next.js 扫描到
const backupDir = path.join(__dirname, '..', 'node_modules', '.backup-actions');

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

// 定义每个文件的特定内容（不使用 'use client' 或 'use server'，不使用 async，不返回 Promise）
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

// 空实现函数 - 在静态导出模式下返回默认值（不使用 async，不返回 Promise）
export function getBlogDetail(id: string): ActionResult<BlogPost> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getBlogList(): BlogPost[] {
  return [];
}

export function createBlog(data: BlogPostData): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function updateBlog(id: string, data: Partial<BlogPostData>): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function deleteBlog(id: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchDeleteBlogs(ids: string[]): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchUpdateBlogCategory(ids: string[], category: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getBlogCategories(): string[] {
  return [];
}

export function saveBlogMarkdown(slug: string, content: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function toggleBlogHidden(id: string): ActionResult<BlogPost> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchToggleBlogHidden(ids: string[], hidden: boolean): ActionResult {
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

// 空实现函数（不使用 async，不返回 Promise）
export function getMomentDetail(id: string): ActionResult<Moment> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getMomentList(): ActionResult<Moment[]> {
  return { success: true, message: '', data: [] };
}

export function createMoment(data: MomentData): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function updateMoment(id: string, data: Partial<MomentData>): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function deleteMoment(id: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchDeleteMoments(ids: string[]): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function toggleMomentPinned(id: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchToggleMomentPinned(ids: string[], pinned: boolean): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function generateNewMomentId(): string {
  return 'moment-' + Date.now();
}

export function getMomentTags(): string[] {
  return [];
}

export function toggleMomentHidden(id: string): ActionResult<Moment> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchToggleMomentHidden(ids: string[], hidden: boolean): ActionResult {
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

// 空实现函数（不使用 async，不返回 Promise）
export function getLocalGalleryImages(subPath?: string): GalleryImage[] {
  return [];
}

export function getLocalGalleryDirectories(subPath?: string): string[] {
  return [];
}

export function getLocalGalleryDirectoryTree(): DirectoryTree[] {
  return [];
}

export function getLocalGallerySubDirectories(parentPath?: string): {
  name: string;
  path: string;
  imageCount: number;
}[] {
  return [];
}

export function deleteLocalImage(imagePath: string): { success: boolean; message: string } {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function uploadLocalImage(formData: FormData, targetPath?: string): UploadResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function uploadLocalImages(formDataList: FormData[], targetPath?: string): UploadMultipleResult {
  return { success: false, message: '不支持', images: [], failed: [] };
}

export function getLocalGalleryStats(): GalleryStats {
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

// 空实现函数（不使用 async，不返回 Promise）
export function getSettings(): SystemSettings {
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

export function saveSettings(settings: Partial<SystemSettings>): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function resetSettings(): ActionResult {
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
`,

  'todoActions.ts': `// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

import type { TodoItem, TodoConfig, TodoFormData, TodoActionResult } from '@/types/todo';

// 空实现函数（不使用 async，不返回 Promise）
export function getTodoConfig(): TodoActionResult<TodoConfig> {
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

export function getTodoList(): TodoActionResult<TodoItem[]> {
  return { success: true, message: '获取成功', data: [] };
}

export function getTodoItem(id: string): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function createTodoItem(data: TodoFormData): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function updateTodoItem(
  id: string,
  data: Partial<TodoFormData>
): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function deleteTodoItem(id: string): TodoActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function toggleTodoComplete(id: string): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchDeleteTodoItems(ids: string[]): TodoActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function updateTodoConfigSettings(
  settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>
): TodoActionResult<TodoConfig> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
`
};

// 检查文件是否是原始 Server Actions 文件（包含 'use server'）
function isOriginalServerAction(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.includes("'use server'") || content.includes('"use server"');
}

// 备份并替换文件
Object.entries(fileContents).forEach(([file, content]) => {
  const srcPath = path.join(actionsDir, file);
  const backupPath = path.join(backupDir, file);
  
  if (fs.existsSync(srcPath)) {
    // 只有当文件是原始 Server Actions 文件时才备份
    if (isOriginalServerAction(srcPath)) {
      fs.copyFileSync(srcPath, backupPath);
      console.log(`✅ 已备份: ${file}`);
    }
    
    // 写入静态导出版本
    fs.writeFileSync(srcPath, content);
    console.log(`📝 已替换为静态版本: ${file}`);
  }
});

console.log('✨ 静态导出准备完成');
