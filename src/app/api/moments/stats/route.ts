/**
 * 说说统计API路由处理
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

// GET /api/moments/stats - 获取统计信息
export async function GET(request: NextRequest) {
  try {
    const stats = await momentsService.getStats();
    return successResponse(stats);
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return errorResponse('获取统计信息失败', 'STATS_ERROR');
  }
}