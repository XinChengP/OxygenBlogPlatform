/**
 * 静态导出模式下的空 actions 实现
 * 所有函数返回不支持的错误信息
 */

// 导入类型
import type { ImageSource } from '@/types/gallery';

// ============================================
// Todo Actions
// ============================================
export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TodoConfig {
  title: string;
  items: TodoItem[];
  showStats: boolean;
}

export const getTodoConfig = async (): Promise<{ success: boolean; message: string; data: TodoConfig | null }> => ({ 
  success: false, 
  message: '静态导出模式不支持此功能',
  data: null
});

export const getTodoList = async (): Promise<{ success: boolean; message: string; data: TodoItem[] }> => ({ success: false, message: '静态导出模式不支持此功能', data: [] });
export const getTodoItem = async (_id?: string): Promise<{ success: boolean; message: string; data: TodoItem | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const createTodoItem = async (_data?: any): Promise<{ success: boolean; message: string; data: TodoItem | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const updateTodoItem = async (_id?: string, _data?: any): Promise<{ success: boolean; message: string; data: TodoItem | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const deleteTodoItem = async (_id?: string): Promise<{ success: boolean; message: string; data: string | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const toggleTodoComplete = async (_id?: string): Promise<{ success: boolean; message: string; data: TodoItem | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const batchDeleteTodoItems = async (_ids?: string[]): Promise<{ success: boolean; message: string; data: string[] }> => ({ success: false, message: '静态导出模式不支持此功能', data: [] });
export const updateTodoConfigSettings = async (_config?: any): Promise<{ success: boolean; message: string; data: TodoConfig | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });

// ============================================
// GitHub Actions
// ============================================
export const pushToGitHub = async (_message?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const buildAndPush = async (_buildMessage?: string, _pushMessage?: string): Promise<GitPushResult> => ({ success: false, message: '静态导出模式不支持此功能' });
export interface GitStatus {
  ahead: number;
  behind: number;
  modified: string[];
  untracked: string[];
  hasPushable: boolean;
}

export interface GitPushResult {
  success: boolean;
  message: string;
}

export const getGitStatus = async (): Promise<GitStatus> => ({ 
  ahead: 0, 
  behind: 0, 
  modified: [], 
  untracked: [],
  hasPushable: false
});

// ============================================
// Gallery Actions
// ============================================
export const uploadLocalImage = async (_formData?: FormData, _path?: string): Promise<{ success: boolean; message: string; image?: GalleryImage }> => ({ success: false, message: '静态导出模式不支持此功能' });
export interface GalleryImage {
  id: string;
  src: string;
  fallbackSrc?: string;
  thumbnail?: string;
  alt: string;
  source: ImageSource;
  category: string;
  subCategory?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt?: string;
  size?: number;
}

export const getLocalGalleryImages = async (_path?: string): Promise<GalleryImage[]> => [];
export const deleteLocalImage = async (_path?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const getLocalGalleryStats = async () => ({ success: false, message: '静态导出模式不支持此功能', data: { total: 0, used: 0, remaining: 0 } });
export const getLocalGalleryDirectoryTree = async (_path?: string) => ({ success: false, message: '静态导出模式不支持此功能', data: [] });
export const getLocalGallerySubDirectories = async (_path?: string) => ({ success: false, message: '静态导出模式不支持此功能', data: [] });
export type DirectoryTree = { name: string; path: string; type: 'file' | 'directory'; children?: DirectoryTree[] };

// ============================================
// Moment Actions
// ============================================
export const getMomentList = async (_page?: number, _pageSize?: number): Promise<{ success: boolean; message: string; data: Moment[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> => ({ success: false, message: '静态导出模式不支持此功能', data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });
export const getMomentById = async (_id?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const getMomentDetail = async (_id?: string): Promise<{ success: boolean; message: string; data: Moment | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const createMoment = async (_data?: any) => ({ success: false, message: '静态导出模式不支持此功能' });
export const updateMoment = async (_id?: string, _data?: any) => ({ success: false, message: '静态导出模式不支持此功能' });
export const deleteMoment = async (_id?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const toggleMomentLike = async (_id?: string) => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const toggleMomentHidden = async (_id?: string): Promise<{ success: boolean; message: string; data: Moment | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const toggleMomentPinned = async (_id?: string): Promise<{ success: boolean; message: string; data: Moment | null }> => ({ success: false, message: '静态导出模式不支持此功能', data: null });
export const batchDeleteMoments = async (_ids?: string[]) => ({ success: false, message: '静态导出模式不支持此功能' });
export const batchToggleMomentPinned = async (_ids?: string[], _pinned?: boolean) => ({ success: false, message: '静态导出模式不支持此功能' });
export const batchToggleMomentHidden = async (_ids?: string[], _hidden?: boolean) => ({ success: false, message: '静态导出模式不支持此功能' });
export const getMomentTags = async (): Promise<string[]> => [];
export const generateNewMomentId = async (): Promise<string> => '';
export const getMomentConfig = async () => ({ success: false, message: '静态导出模式不支持此功能' });
export const updateMomentConfig = async (_config?: any) => ({ success: false, message: '静态导出模式不支持此功能' });

// 类型定义
export type Moment = { id: string; content: string; date: string; time: string; tags: string[]; likes: number; isHidden: boolean; hidden: boolean; isPinned: boolean; pinned: boolean; images: string[] };
export type MomentData = Partial<Moment>;

// ============================================
// Backup Actions
// ============================================
export interface BackupResult {
  success: boolean;
  message: string;
  backupId?: string;
  timestamp?: string;
  error?: string;
}

export interface BackupHistory {
  id: string;
  commitHash: string;
  timestamp: string;
  message: string;
  author: string;
  size: number;
  filesCount: number;
}

export interface PushConfig {
  remoteUrl: string;
  branch: string;
  token?: string;
}

export const getBackupList = async () => ({ success: false, message: '静态导出模式不支持此功能', data: [] });
export const createBackup = async (_password?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const restoreBackup = async (_hash?: string, _password?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const deleteBackup = async (_id?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const verifyBackupPassword = async (_password?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const changeRestorePassword = async (_oldPassword?: string, _newPassword?: string) => ({ success: false, message: '静态导出模式不支持此功能' });
export const getBackupPath = async () => '';
export const backupDirExists = async () => false;
export const initBackupRepo = async () => ({ success: false, message: '静态导出模式不支持此功能' });
export const performBackup = async () => ({ success: false, message: '静态导出模式不支持此功能' });
export const getBackupHistory = async (_limit?: number) => ({ success: false, message: '静态导出模式不支持此功能', history: [] });
export const getBackupStatus = async (): Promise<{ success: boolean; message: string; hasPassword: boolean; lastBackup: string | null; totalCommits?: number; trackedFiles?: number; isGitRepo?: boolean; hasRemote?: boolean; remoteUrl?: string }> => ({ success: false, message: '静态导出模式不支持此功能', hasPassword: false, lastBackup: null });
export const configureRemote = async (_config?: PushConfig) => ({ success: false, message: '静态导出模式不支持此功能' });
export const pushToRemote = async (_config?: PushConfig) => ({ success: false, message: '静态导出模式不支持此功能' });
export const getRemoteInfo = async (): Promise<{ success: boolean; message: string; remoteUrl: string; branch: string; ahead?: number }> => ({ success: false, message: '静态导出模式不支持此功能', remoteUrl: '', branch: '' });
export const testRemoteConnection = async (_config?: PushConfig) => ({ success: false, message: '静态导出模式不支持此功能' });

// ============================================
// Settings Actions
// ============================================
export const getSettings = async () => ({ success: false, message: '静态导出模式不支持此功能' });
export const updateSettings = async (_settings?: any) => ({ success: false, message: '静态导出模式不支持此功能' });

// ============================================
// Blog Actions
// ============================================
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  excerpt: string;
  content: string;
  coverImage?: string;
  filePath: string;
  hidden?: boolean;
  pinned?: boolean;
  pinnedAt?: string;
}

export interface BlogPostData {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  content?: string;
  coverImage?: string;
}

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export const getBlogList = async (): Promise<BlogPost[]> => [];
export const getBlogDetail = async (_id: string): Promise<ActionResult<BlogPost>> => ({ success: false, message: '静态导出模式不支持此功能' });
export const createBlog = async (_data: BlogPostData): Promise<ActionResult<BlogPost>> => ({ success: false, message: '静态导出模式不支持此功能' });
export const updateBlog = async (_id: string, _data: Partial<BlogPostData>): Promise<ActionResult<BlogPost>> => ({ success: false, message: '静态导出模式不支持此功能' });
export const deleteBlog = async (_id: string): Promise<ActionResult> => ({ success: false, message: '静态导出模式不支持此功能' });
export const batchDeleteBlogs = async (_ids: string[]): Promise<ActionResult> => ({ success: false, message: '静态导出模式不支持此功能' });
export const batchUpdateBlogCategory = async (_ids: string[], _category: string): Promise<ActionResult> => ({ success: false, message: '静态导出模式不支持此功能' });
export const getBlogCategories = async (): Promise<string[]> => [];
export const saveBlogMarkdown = async (_slug: string, _content: string): Promise<ActionResult> => ({ success: false, message: '静态导出模式不支持此功能' });
export const toggleBlogHidden = async (_id: string): Promise<ActionResult<BlogPost>> => ({ success: false, message: '静态导出模式不支持此功能' });
export const batchToggleBlogHidden = async (_ids: string[], _hidden: boolean): Promise<ActionResult> => ({ success: false, message: '静态导出模式不支持此功能' });

// ============================================
// Changelog Actions
// ============================================
export type ChangelogType = 'feature' | 'optimize' | 'fix' | 'docs' | 'style' | 'refactor';
export type ChangelogAchievement = 'tired' | 'exhausted' | 'smallButComplete' | 'lively';

export interface Changelog {
  id: string;
  date: string;
  title: string;
  content: string;
  type: ChangelogType;
  commits: string[];
  filePath: string;
  achievements: ChangelogAchievement[];
  honors?: { name: string; color: string }[];
}

export const getChangelogs = async (): Promise<Changelog[]> => [];
export const getChangelogByDate = async (_date: string): Promise<Changelog | null> => null;
export const checkChangelogExists = async (_date: string): Promise<boolean> => false;
export const createChangelog = async (_data: { date: string; type: string; content: string; title?: string; commits?: string[]; honors?: { name: string; color: string }[] }): Promise<{ success: boolean; message: string; data?: Changelog }> => ({ success: false, message: '静态导出模式不支持此功能' });
export const updateChangelog = async (_date: string, _data: Partial<{ type: string; content: string; title?: string; commits?: string[]; honors?: { name: string; color: string }[] }>): Promise<{ success: boolean; message: string; data?: Changelog }> => ({ success: false, message: '静态导出模式不支持此功能' });
export const deleteChangelog = async (_date: string): Promise<{ success: boolean; message: string }> => ({ success: false, message: '静态导出模式不支持此功能' });
