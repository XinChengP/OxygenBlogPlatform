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

  try {
    // 验证 Base64 格式
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
    if (!base64Regex.test(base64Data)) {
      return {
        success: false,
        url: '',
        message: '无效的 Base64 图片格式',
      };
    }

    // 提取 MIME 类型和数据
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return {
        success: false,
        url: '',
        message: '无法解析 Base64 数据',
      };
    }

    const mimeType = matches[1];
    const base64Content = matches[2];

    // 转换为 Blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${mimeType}` });

    // 创建 FormData
    const formData = new FormData();
    const filename = `base64-image-${Date.now()}.${mimeType}`;
    formData.append('file', blob, filename);

    // 调用 Server Action 上传
    const result = await uploadLocalImage(formData, targetDir);

    if (result.success && result.image) {
      return {
        success: true,
        url: result.image.src,
        message: 'Base64 图片上传成功',
      };
    } else {
      return {
        success: false,
        url: '',
        message: result.message || 'Base64 图片上传失败',
      };
    }
  } catch (error) {
    console.error('Base64 图片上传失败:', error);
    return {
      success: false,
      url: '',
      message: error instanceof Error ? error.message : 'Base64 图片上传失败',
    };
  }
}
