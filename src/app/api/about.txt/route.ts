import { NextResponse } from 'next/server';

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = 31536000; // 1年缓存

/*
  站点信息文本端点（/api/about.txt）
  原实现返回 200 + Location 头，但 200 不是重定向状态码，
  Location 头会被浏览器忽略——移除这一无效头，
  静态导出时该路由输出为静态文本文件。
*/
export async function GET() {
  return new NextResponse(
    'About page: https://blog.xinchengp.cn/about',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    }
  );
}
