/**
 * 说说详情API路由处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { momentsService } from '@/services/momentsService';

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

// GET /api/moments/[id] - 获取单条说说
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const moment = await momentsService.getMoment(id);
    
    if (!moment) {
      return errorResponse('说说不存在', 'NOT_FOUND', 404);
    }
    
    return successResponse(moment);
  } catch (error) {
    console.error('获取说说失败:', error);
    return errorResponse('获取说说失败', 'FETCH_ERROR');
  }
}

// PUT /api/moments/[id] - 更新说说
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await momentsService.deleteMoment(id);
    return successResponse(null, '说说删除成功');
  } catch (error) {
    console.error('删除说说失败:', error);
    const message = error instanceof Error ? error.message : '删除说说失败';
    return errorResponse(message, 'DELETE_ERROR', 400);
  }
}