import { NextResponse } from 'next/server';

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = 31536000; // 1年缓存

export async function GET() {
  try {
    // 直接重定向到about页面，无论在开发模式还是生产模式
    // 获取基础路径
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    
    // 构建重定向URL
    const redirectUrl = basePath ? `${basePath}/about` : '/about';
    
    // 返回重定向响应
    return NextResponse.redirect(new URL(redirectUrl, process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('Error redirecting to about page:', error);
    return new NextResponse('Redirect failed', { status: 500 });
  }
}