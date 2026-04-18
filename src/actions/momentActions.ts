/**
 * 动态管理相关的 Server Actions
 * 提供动态的增删改查功能
 * 动态文件使用 Markdown 格式存储（带 frontmatter）
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
export interface MomentData {
  time: string;
  content: string;
  tags?: string[];
  images?: string[];
  pinned?: boolean;
  hidden?: boolean; // 隐藏状态，true 表示该动态被隐藏，前台不显示
}

export interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images: string[];
  pinned: boolean;
  hidden: boolean; // 隐藏状态，true 表示该动态被隐藏，前台不显示
}

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

// ============================================
// 静态导出模式：空实现（不使用 'use server'）
// ============================================

function getMomentListStatic(): Promise<ActionResult<Moment[]>> {
  return Promise.resolve({ success: true, message: '静态导出模式', data: [] });
}

function getMomentDetailStatic(): Promise<ActionResult<Moment>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function createMomentStatic(): Promise<ActionResult<Moment>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function updateMomentStatic(): Promise<ActionResult<Moment>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function deleteMomentStatic(): Promise<ActionResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function batchDeleteMomentsStatic(): Promise<ActionResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function toggleMomentPinnedStatic(): Promise<ActionResult<Moment>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function batchToggleMomentPinnedStatic(): Promise<ActionResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function generateNewMomentIdStatic(): Promise<string> {
  return Promise.resolve('000001');
}

function getMomentTagsStatic(): Promise<string[]> {
  return Promise.resolve([]);
}

function toggleMomentHiddenStatic(): Promise<ActionResult<Moment>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function batchToggleMomentHiddenStatic(): Promise<ActionResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

// ============================================
// 本地开发模式：真实实现（使用 'use server'）
// ============================================

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
let momentActionsReal: {
  getMomentList: () => Promise<ActionResult<Moment[]>>;
  getMomentDetail: (id: string) => Promise<ActionResult<Moment>>;
  createMoment: (data: MomentData) => Promise<ActionResult<Moment>>;
  updateMoment: (id: string, data: Partial<MomentData>) => Promise<ActionResult<Moment>>;
  deleteMoment: (id: string) => Promise<ActionResult>;
  batchDeleteMoments: (ids: string[]) => Promise<ActionResult>;
  toggleMomentPinned: (id: string) => Promise<ActionResult<Moment>>;
  batchToggleMomentPinned: (ids: string[], pinned: boolean) => Promise<ActionResult>;
  generateNewMomentId: () => Promise<string>;
  getMomentTags: () => Promise<string[]>;
  toggleMomentHidden: (id: string) => Promise<ActionResult<Moment>>;
  batchToggleMomentHidden: (ids: string[], hidden: boolean) => Promise<ActionResult>;
} | null = null;

// 动态导入真实实现（只在非静态导出模式下）
if (!isStaticExport) {
  // 使用 eval 包装 require 动态导入，避免 Turbopack 在构建时解析
  try {
    // eslint-disable-next-line no-eval
    const realModule = eval("require('./momentActions.real')");
    momentActionsReal = realModule;
  } catch {
    // 如果真实实现模块不存在，使用空实现
    momentActionsReal = null;
  }
}

// ============================================
// 导出函数：根据环境选择实现
// ============================================

export async function getMomentList(): Promise<ActionResult<Moment[]>> {
  if (isStaticExport || !momentActionsReal) {
    return getMomentListStatic();
  }
  return momentActionsReal.getMomentList();
}

export async function getMomentDetail(id: string): Promise<ActionResult<Moment>> {
  if (isStaticExport || !momentActionsReal) {
    return getMomentDetailStatic();
  }
  return momentActionsReal.getMomentDetail(id);
}

export async function createMoment(data: MomentData): Promise<ActionResult<Moment>> {
  if (isStaticExport || !momentActionsReal) {
    return createMomentStatic();
  }
  return momentActionsReal.createMoment(data);
}

export async function updateMoment(id: string, data: Partial<MomentData>): Promise<ActionResult<Moment>> {
  if (isStaticExport || !momentActionsReal) {
    return updateMomentStatic();
  }
  return momentActionsReal.updateMoment(id, data);
}

export async function deleteMoment(id: string): Promise<ActionResult> {
  if (isStaticExport || !momentActionsReal) {
    return deleteMomentStatic();
  }
  return momentActionsReal.deleteMoment(id);
}

export async function batchDeleteMoments(ids: string[]): Promise<ActionResult> {
  if (isStaticExport || !momentActionsReal) {
    return batchDeleteMomentsStatic();
  }
  return momentActionsReal.batchDeleteMoments(ids);
}

export async function toggleMomentPinned(id: string): Promise<ActionResult<Moment>> {
  if (isStaticExport || !momentActionsReal) {
    return toggleMomentPinnedStatic();
  }
  return momentActionsReal.toggleMomentPinned(id);
}

export async function batchToggleMomentPinned(ids: string[], pinned: boolean): Promise<ActionResult> {
  if (isStaticExport || !momentActionsReal) {
    return batchToggleMomentPinnedStatic();
  }
  return momentActionsReal.batchToggleMomentPinned(ids, pinned);
}

export async function generateNewMomentId(): Promise<string> {
  if (isStaticExport || !momentActionsReal) {
    return generateNewMomentIdStatic();
  }
  return momentActionsReal.generateNewMomentId();
}

export async function getMomentTags(): Promise<string[]> {
  if (isStaticExport || !momentActionsReal) {
    return getMomentTagsStatic();
  }
  return momentActionsReal.getMomentTags();
}

export async function toggleMomentHidden(id: string): Promise<ActionResult<Moment>> {
  if (isStaticExport || !momentActionsReal) {
    return toggleMomentHiddenStatic();
  }
  return momentActionsReal.toggleMomentHidden(id);
}

export async function batchToggleMomentHidden(ids: string[], hidden: boolean): Promise<ActionResult> {
  if (isStaticExport || !momentActionsReal) {
    return batchToggleMomentHiddenStatic();
  }
  return momentActionsReal.batchToggleMomentHidden(ids, hidden);
}
