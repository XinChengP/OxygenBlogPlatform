'use server';

/**
 * 编辑器图片上传工具
 * 支持从剪贴板粘贴或拖拽上传图片到本地文件夹
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * 上传图片到指定目录
 * @param formData - 包含图片文件的 FormData
 * @param targetDir - 目标目录（Blogabout 或 Momentsabout）
 * @returns 上传结果，包含图片访问路径
 */
export async function uploadEditorImage(
  formData: FormData,
  targetDir: 'Blogabout' | 'Momentsabout'
): Promise<{ success: boolean; url: string; message: string }> {
  try {
    const file = formData.get('image') as File;
    
    if (!file) {
      return { success: false, url: '', message: '未找到图片文件' };
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, url: '', message: '不支持的图片格式' };
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, url: '', message: '图片大小超过 10MB 限制' };
    }

    // 确保目标目录在 public 下
    const publicDir = path.join(process.cwd(), 'public');
    const targetPath = path.join(publicDir, targetDir);
    
    // 安全检查
    const resolvedTarget = path.resolve(targetPath);
    const resolvedPublic = path.resolve(publicDir);
    
    if (!resolvedTarget.startsWith(resolvedPublic)) {
      return { success: false, url: '', message: '无效的目标路径' };
    }

    // 创建目录（如果不存在）
    await fs.mkdir(targetPath, { recursive: true });

    // 生成文件名
    const timestamp = Date.now();
    const ext = path.extname(file.name) || '.png';
    const fileName = `image-${timestamp}${ext}`;
    const filePath = path.join(targetPath, fileName);

    // 写入文件
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // 返回可访问的 URL
    const url = `/${targetDir}/${fileName}`;
    
    return { success: true, url, message: '上传成功' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    console.error('编辑器图片上传失败:', error);
    return { success: false, url: '', message: `上传失败: ${errorMessage}` };
  }
}

/**
 * 处理 Base64 图片数据并保存
 * @param base64Data - Base64 编码的图片数据
 * @param targetDir - 目标目录
 * @returns 上传结果
 */
export async function uploadBase64Image(
  base64Data: string,
  targetDir: 'Blogabout' | 'Momentsabout'
): Promise<{ success: boolean; url: string; message: string }> {
  try {
    // 解析 Base64 数据
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return { success: false, url: '', message: '无效的图片数据' };
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    
    // 验证文件大小
    const buffer = Buffer.from(data, 'base64');
    const maxSize = 10 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return { success: false, url: '', message: '图片大小超过 10MB 限制' };
    }

    // 确保目标目录
    const publicDir = path.join(process.cwd(), 'public');
    const targetPath = path.join(publicDir, targetDir);
    
    const resolvedTarget = path.resolve(targetPath);
    const resolvedPublic = path.resolve(publicDir);
    
    if (!resolvedTarget.startsWith(resolvedPublic)) {
      return { success: false, url: '', message: '无效的目标路径' };
    }

    await fs.mkdir(targetPath, { recursive: true });

    // 生成文件名并保存
    const timestamp = Date.now();
    const fileName = `paste-${timestamp}.${ext}`;
    const filePath = path.join(targetPath, fileName);
    
    await fs.writeFile(filePath, buffer);

    const url = `/${targetDir}/${fileName}`;
    return { success: true, url, message: '上传成功' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    console.error('Base64 图片上传失败:', error);
    return { success: false, url: '', message: `上传失败: ${errorMessage}` };
  }
}
