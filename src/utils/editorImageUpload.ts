'use client';

/**
 * 编辑器图片上传工具
 * 在本地开发时调用 Server Action 上传图片
 * 在静态导出模式下返回错误提示
 */

import { uploadLocalImage } from '@/actions/galleryActions';

/**
 * 检查是否在静态导出模式
 */
function isStaticExport(): boolean {
  return process.env.NEXT_PUBLIC_IS_STATIC_EXPORT === 'true';
}

/**
 * 上传图片到指定目录
 */
export async function uploadEditorImage(
  formData: FormData,
  targetDir: 'Blogabout' | 'Momentsabout'
): Promise<{ success: boolean; url: string; message: string }> {
  // 静态导出模式下返回错误
  if (isStaticExport()) {
    return {
      success: false,
      url: '',
      message: '静态导出模式不支持文件上传，请在本地开发环境使用此功能',
    };
  }

  // 本地开发模式下调用 Server Action
  try {
    const result = await uploadLocalImage(formData, targetDir);
    
    if (result.success && result.image) {
      return {
        success: true,
        url: result.image.src,
        message: '上传成功',
      };
    } else {
      return {
        success: false,
        url: '',
        message: result.message || '上传失败',
      };
    }
  } catch (error) {
    console.error('图片上传失败:', error);
    return {
      success: false,
      url: '',
      message: error instanceof Error ? error.message : '上传失败',
    };
  }
}

/**
 * 处理 Base64 图片数据并保存
 * 在静态导出模式下返回错误
 */
export async function uploadBase64Image(
  base64Data: string,
  targetDir: 'Blogabout' | 'Momentsabout'
): Promise<{ success: boolean; url: string; message: string }> {
  // 静态导出模式下返回错误
  if (isStaticExport()) {
    return {
      success: false,
      url: '',
      message: '静态导出模式不支持文件上传，请在本地开发环境使用此功能',
    };
  }

  // TODO: 实现 Base64 图片上传
  return {
    success: false,
    url: '',
    message: 'Base64 上传功能暂未实现',
  };
}
