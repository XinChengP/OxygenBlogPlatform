'use server';

/**
 * 图床管理器进程操作（Server Action）
 *
 * 后台仅在本地开发环境使用，因此启动/关闭能力也只在该环境下开放。
 * 静态导出构建时，scripts/prepare-static-export.js 会把本文件替换为
 * actions/index.static.ts 的空实现，保证线上构建不引入 Node 进程操作代码。
 */

import {
  getGalleryManagerProcessStatus,
  startManagerProcess,
  stopManagerProcess,
  type GalleryManagerProcessStatus,
  type GalleryManagerProcessResult,
} from '@/utils/galleryManagerProcess';

/**
 * 是否允许执行进程操作
 * dev server 下为 true；静态导出构建与线上环境一律拒绝
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 查询图床管理器进程状态（是否可启动、是否在线、PID、端口）
 */
export async function getGalleryManagerStatus(): Promise<GalleryManagerProcessStatus> {
  if (!isDevelopment) {
    return {
      available: false,
      running: false,
      pid: null,
      port: 3210,
    };
  }

  return getGalleryManagerProcessStatus();
}

/**
 * 启动图床管理器
 */
export async function startGalleryManager(): Promise<GalleryManagerProcessResult> {
  if (!isDevelopment) {
    return { success: false, message: '仅本地开发环境支持启动图床管理器' };
  }

  return startManagerProcess();
}

/**
 * 关闭图床管理器
 */
export async function stopGalleryManager(): Promise<GalleryManagerProcessResult> {
  if (!isDevelopment) {
    return { success: false, message: '仅本地开发环境支持关闭图床管理器' };
  }

  return stopManagerProcess();
}
