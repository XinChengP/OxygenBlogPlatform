import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = 31536000; // 1年缓存

export async function GET() {
  try {
    // 读取about.txt文件
    const filePath = path.join(process.cwd(), 'public', 'about.txt');
    const fileContents = await readFile(filePath, 'utf8');
    
    // 返回文件内容，设置正确的Content-Type
    return new NextResponse(fileContents, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400', // 缓存1天
      },
    });
  } catch (error) {
    console.error('Error reading about.txt:', error);
    return new NextResponse('File not found', { status: 404 });
  }
}