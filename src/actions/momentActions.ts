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
  return `moment-${Date.now()}`;
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
