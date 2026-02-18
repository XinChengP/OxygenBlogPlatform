/**
 * 评论API路由处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { momentsService } from '@/services/momentsService';
import { CreateCommentRequest } from '@/types/moments';

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

// POST /api/comments - 创建评论
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { momentId, content } = body as CreateCommentRequest;
    
    if (!momentId || !content || content.trim().length === 0) {
      return errorResponse('评论内容不能为空', 'VALIDATION_ERROR', 400);
    }
    
    const result = await momentsService.addComment({
      momentId,
      content: content.trim()
    });
    
    return successResponse(result, '评论发布成功');
  } catch (error) {
    console.error('创建评论失败:', error);
    const message = error instanceof Error ? error.message : '创建评论失败';
    return errorResponse(message, 'CREATE_ERROR', 400);
  }
}

// DELETE /api/comments/[id] - 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await momentsService.deleteComment(id);
    return successResponse(null, '评论删除成功');
  } catch (error) {
    console.error('删除评论失败:', error);
    const message = error instanceof Error ? error.message : '删除评论失败';
    return errorResponse(message, 'DELETE_ERROR', 400);
  }
}