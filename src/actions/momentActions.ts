// 静态导出模式 - Server Actions 被替换为静态兼容版本
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
