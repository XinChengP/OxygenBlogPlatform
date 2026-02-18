/**
 * 说说（动态）API路由处理
 * 基于客户端的API模拟，适用于静态导出项目
 */

import { NextRequest, NextResponse } from 'next/server';
import { momentsService } from '@/services/momentsService';
import { CreateMomentRequest } from '@/types/moments';

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

// GET /api/moments - 获取说说列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    const result = await momentsService.getMoments(page, pageSize);
    return successResponse(result);
  } catch (error) {
    console.error('获取说说列表失败:', error);
    return errorResponse('获取说说列表失败', 'FETCH_ERROR');
  }
}

// POST /api/moments - 创建说说
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, images, mood } = body as CreateMomentRequest;
    
    if (!content || content.trim().length === 0) {
      return errorResponse('说说内容不能为空', 'VALIDATION_ERROR', 400);
    }
    
    const result = await momentsService.createMoment({
      content: content.trim(),
      images,
      mood
    });
    
    return successResponse(result, '说说发布成功');
  } catch (error) {
    console.error('创建说说失败:', error);
    const message = error instanceof Error ? error.message : '创建说说失败';
    return errorResponse(message, 'CREATE_ERROR', 400);
  }
}

// PUT /api/moments/[id] - 更新说说
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const result = await momentsService.updateMoment(id, body);
    return successResponse(result, '说说更新成功');
  } catch (error) {
    console.error('更新说说失败:', error);
    const message = error instanceof Error ? error.message : '更新说说失败';
    return errorResponse(message, 'UPDATE_ERROR', 400);
  }
}

// DELETE /api/moments/[id] - 删除说说
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await momentsService.deleteMoment(id);
    return successResponse(null, '说说删除成功');
  } catch (error) {
    console.error('删除说说失败:', error);
    const message = error instanceof Error ? error.message : '删除说说失败';
    return errorResponse(message, 'DELETE_ERROR', 400);
  }
}

