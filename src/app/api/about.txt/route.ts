import { NextResponse } from 'next/server';

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = 31536000; // 1年缓存

export async function GET() {
  try {
    // 对于静态导出模式，返回简单的文本响应
    return new NextResponse('About page redirect', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Location': '/about'
      }
    });
  } catch (error) {
    console.error('Error handling about.txt request:', error);
    return new NextResponse('Error', { status: 500 });
  }
}