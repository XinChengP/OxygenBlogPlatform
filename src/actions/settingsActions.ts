'use server';

/**
 * 系统设置 Server Actions
 * 用于保存和读取系统设置
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * 系统设置接口
 */
export interface SystemSettings {
  // 基本设置
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  author: string;
  email: string;
  // SEO 设置
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
  // 社交链接
  github: string;
  twitter: string;
  weibo: string;
  bilibili: string;
  socialEmail: string;
  // 高级设置
  enablePwa: boolean;
  enableAnalytics: boolean;
  enableComments: boolean;
  maintenanceMode: boolean;
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: SystemSettings = {
  siteName: '心想事成 的 Blog',
  siteDescription: '以洛天依为主题的个人博客，记录技术学习与生活感悟',
  siteUrl: 'https://example.com',
  author: '心想事成',
  email: 'admin@example.com',
  metaTitle: '心想事成 的 Blog - 洛天依主题博客',
  metaDescription: '以洛天依为主题的个人博客，记录技术学习与生活感悟',
  keywords: '博客,洛天依,技术,前端,Next.js',
  ogImage: '/LTY_Picture/光与影.png',
  github: 'https://github.com/username',
  twitter: '',
  weibo: '',
  bilibili: '',
  socialEmail: 'admin@example.com',
  enablePwa: true,
  enableAnalytics: false,
  enableComments: true,
  maintenanceMode: false,
};

/**
 * 设置文件路径
 */
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

/**
 * 确保数据目录存在
 */
async function ensureDataDir() {
  const dataDir = path.dirname(SETTINGS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * 获取系统设置
 * @returns 系统设置
 */
export async function getSettings(): Promise<SystemSettings> {
  try {
    await ensureDataDir();
    
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch {
      // 文件不存在或读取失败，返回默认设置
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error('获取设置失败:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存系统设置
 * @param settings - 要保存的设置
 * @returns 操作结果
 */
export async function saveSettings(
  settings: Partial<SystemSettings>
): Promise<{ success: boolean; message: string }> {
  try {
    await ensureDataDir();
    
    // 读取现有设置
    const existingSettings = await getSettings();
    
    // 合并设置
    const newSettings = { ...existingSettings, ...settings };
    
    // 写入文件
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(newSettings, null, 2), 'utf-8');
    
    return { success: true, message: '设置保存成功' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '保存失败';
    console.error('保存设置失败:', error);
    return { success: false, message: `保存失败: ${errorMessage}` };
  }
}

/**
 * 重置设置为默认值
 * @returns 操作结果
 */
export async function resetSettings(): Promise<{ success: boolean; message: string }> {
  try {
    await ensureDataDir();
    
    // 写入默认设置
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    
    return { success: true, message: '设置已重置为默认值' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '重置失败';
    console.error('重置设置失败:', error);
    return { success: false, message: `重置失败: ${errorMessage}` };
  }
}
