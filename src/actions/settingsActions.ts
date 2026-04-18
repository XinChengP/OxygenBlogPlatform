/**
 * 系统设置管理相关的 Server Actions
 * 提供系统设置的增删改查功能
 * 设置数据使用 JSON 格式存储
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    author: string;
    email: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage?: string;
  };
  social: {
    github?: string;
    twitter?: string;
    weibo?: string;
    bilibili?: string;
    email?: string;
  };
  advanced: {
    enablePwa: boolean;
    enableAnalytics: boolean;
    enableComments: boolean;
    maintenanceMode: boolean;
  };
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ============================================
// 静态导出模式：空实现（不使用 'use server'）
// ============================================

/**
 * 默认系统设置配置
 */
const DEFAULT_SETTINGS: SystemSettings = {
  general: {
    siteName: '心想事成 的 Blog',
    siteDescription: '以洛天依为主题的个人博客',
    siteUrl: '',
    author: '心想事成',
    email: '',
  },
  seo: {
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    ogImage: '',
  },
  social: {
    github: '',
    twitter: '',
    weibo: '',
    bilibili: '',
    email: '',
  },
  advanced: {
    enablePwa: true,
    enableAnalytics: false,
    enableComments: true,
    maintenanceMode: false,
  },
};

function getSettingsStatic(): Promise<ActionResult<SystemSettings>> {
  return Promise.resolve({ success: true, message: '静态导出模式返回默认配置', data: DEFAULT_SETTINGS });
}

function saveSettingsStatic(): Promise<ActionResult<SystemSettings>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持保存设置' });
}

function resetSettingsStatic(): Promise<ActionResult<SystemSettings>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持重置设置' });
}

function updateGeneralSettingsStatic(): Promise<ActionResult<SystemSettings>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持更新设置' });
}

function updateSeoSettingsStatic(): Promise<ActionResult<SystemSettings>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持更新设置' });
}

function updateSocialSettingsStatic(): Promise<ActionResult<SystemSettings>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持更新设置' });
}

function updateAdvancedSettingsStatic(): Promise<ActionResult<SystemSettings>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持更新设置' });
}

// ============================================
// 本地开发模式：真实实现（使用 'use server'）
// ============================================

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
let settingsActionsReal: {
  getSettings: () => Promise<ActionResult<SystemSettings>>;
  saveSettings: (settings: Partial<SystemSettings>) => Promise<ActionResult<SystemSettings>>;
  resetSettings: () => Promise<ActionResult<SystemSettings>>;
  updateGeneralSettings: (general: Partial<SystemSettings['general']>) => Promise<ActionResult<SystemSettings>>;
  updateSeoSettings: (seo: Partial<SystemSettings['seo']>) => Promise<ActionResult<SystemSettings>>;
  updateSocialSettings: (social: Partial<SystemSettings['social']>) => Promise<ActionResult<SystemSettings>>;
  updateAdvancedSettings: (advanced: Partial<SystemSettings['advanced']>) => Promise<ActionResult<SystemSettings>>;
} | null = null;

// 动态导入真实实现（只在非静态导出模式下）
if (!isStaticExport) {
  // 使用 eval 包装 require 动态导入，避免 Turbopack 在构建时解析
  try {
    // eslint-disable-next-line no-eval
    const realModule = eval("require('./settingsActions.real')");
    settingsActionsReal = realModule;
  } catch {
    // 如果真实实现模块不存在，使用空实现
    settingsActionsReal = null;
  }
}

// ============================================
// 导出函数：根据环境选择实现
// ============================================

/**
 * 获取系统设置
 * @returns 包含成功状态和设置数据的操作结果
 */
export async function getSettings(): Promise<ActionResult<SystemSettings>> {
  if (isStaticExport || !settingsActionsReal) {
    return getSettingsStatic();
  }
  return settingsActionsReal.getSettings();
}

/**
 * 保存系统设置
 * @param settings 要更新的部分设置对象
 * @returns 包含成功状态和更新后数据的操作结果
 */
export async function saveSettings(
  settings: Partial<SystemSettings>
): Promise<ActionResult<SystemSettings>> {
  if (isStaticExport || !settingsActionsReal) {
    return saveSettingsStatic();
  }
  return settingsActionsReal.saveSettings(settings);
}

/**
 * 重置系统设置为默认值
 * @returns 包含成功状态和默认设置数据的操作结果
 */
export async function resetSettings(): Promise<ActionResult<SystemSettings>> {
  if (isStaticExport || !settingsActionsReal) {
    return resetSettingsStatic();
  }
  return settingsActionsReal.resetSettings();
}

/**
 * 更新通用设置
 * @param general 通用设置对象
 * @returns 操作结果
 */
export async function updateGeneralSettings(
  general: Partial<SystemSettings['general']>
): Promise<ActionResult<SystemSettings>> {
  if (isStaticExport || !settingsActionsReal) {
    return updateGeneralSettingsStatic();
  }
  return settingsActionsReal.updateGeneralSettings(general);
}

/**
 * 更新 SEO 设置
 * @param seo SEO 设置对象
 * @returns 操作结果
 */
export async function updateSeoSettings(
  seo: Partial<SystemSettings['seo']>
): Promise<ActionResult<SystemSettings>> {
  if (isStaticExport || !settingsActionsReal) {
    return updateSeoSettingsStatic();
  }
  return settingsActionsReal.updateSeoSettings(seo);
}

/**
 * 更新社交链接设置
 * @param social 社交链接设置对象
 * @returns 操作结果
 */
export async function updateSocialSettings(
  social: Partial<SystemSettings['social']>
): Promise<ActionResult<SystemSettings>> {
  if (isStaticExport || !settingsActionsReal) {
    return updateSocialSettingsStatic();
  }
  return settingsActionsReal.updateSocialSettings(social);
}

/**
 * 更新高级设置
 * @param advanced 高级设置对象
 * @returns 操作结果
 */
export async function updateAdvancedSettings(
  advanced: Partial<SystemSettings['advanced']>
): Promise<ActionResult<SystemSettings>> {
  if (isStaticExport || !settingsActionsReal) {
    return updateAdvancedSettingsStatic();
  }
  return settingsActionsReal.updateAdvancedSettings(advanced);
}
