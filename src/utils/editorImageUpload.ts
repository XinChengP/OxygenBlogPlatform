'use client';

/**
 * 编辑器图片上传工具
 * 支持从剪贴板粘贴或拖拽上传图片到本地文件夹
 * 注意：此文件在静态导出模式下不可用
 */

import { GalleryImage } from '@/types/gallery';

/**
 * 上传图片到指定目录
 * 在静态导出模式下返回错误
 */
export async function uploadEditorImage(
  formData: FormData,
  targetDir: 'Blogabout' | 'Momentsabout'
): Promise<{ success: boolean; url: string; message: string }> {
  return {
    success: false,
    url: '',
    message: '静态导出模式不支持文件上传，请在本地开发环境使用此功能',
  };
}

/**
 * 处理 Base64 图片数据并保存
 * 在静态导出模式下返回错误
 */
export async function uploadBase64Image(
  base64Data: string,
  targetDir: 'Blogabout' | 'Momentsabout'
): Promise<{ success: boolean; url: string; message: string }> {
  return {
    success: false,
    url: '',
    message: '静态导出模式不支持文件上传，请在本地开发环境使用此功能',
  };
}
