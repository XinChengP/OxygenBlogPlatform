// 静态导出模式 - Server Actions 被替换为静态兼容版本
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
