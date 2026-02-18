/**
 * 点赞API路由处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { momentsService } from '@/services/momentsService';
import { LikeRequest } from '@/types/moments';

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

// POST /api/likes - 点赞/取消点赞
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetId, targetType } = body as LikeRequest;
    
    if (!targetId || !targetType) {
      return errorResponse('缺少必要参数', 'VALIDATION_ERROR', 400);
    }
    
    if (!['moment', 'comment'].includes(targetType)) {
      return errorResponse('无效的目标类型', 'VALIDATION_ERROR', 400);
    }
    
    const isLiked = await momentsService.toggleLike(targetId, targetType);
    
    return successResponse({ 
      isLiked,
      targetId,
      targetType
    }, isLiked ? '点赞成功' : '取消点赞成功');
  } catch (error) {
    console.error('点赞操作失败:', error);
    const message = error instanceof Error ? error.message : '点赞操作失败';
    return errorResponse(message, 'LIKE_ERROR', 400);
  }
}