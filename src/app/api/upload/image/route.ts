/**
 * 图片上传API路由处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageUploadService } from '@/services/imageUploadService';

// 错误响应包装
function errorResponse(message: string, code: string = 'INTERNAL_ERROR', status: number = 500) {
  return NextResponse.json(
    { error: message, code },
    { status }
  );
}

// 成功响应包装
function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message
  });
}

// POST /api/upload/image - 上传图片
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return errorResponse('未找到图片文件', 'NO_FILE', 400);
    }
    
    const result = await imageUploadService.uploadToLocal(file);
    return successResponse(result, '图片上传成功');
  } catch (error) {
    console.error('图片上传失败:', error);
    const message = error instanceof Error ? error.message : '图片上传失败';
    return errorResponse(message, 'UPLOAD_ERROR', 400);
  }
}