/**
 * 博文管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOGS_DIR = path.join(process.cwd(), 'src', 'content', 'blogs');

// 获取博文列表
export async function GET() {
  try {
    if (!fs.existsSync(BLOGS_DIR)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith('.md'));
    const blogs = files.map(file => {
      const filePath = path.join(BLOGS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data, content: markdownContent } = matter(content);
      
      return {
        slug: file.replace('.md', ''),
        title: data.title || file.replace('.md', ''),
        date: data.date || '',
        category: data.category || '其他',
        tags: data.tags || [],
        excerpt: data.excerpt || '',
        coverImage: data.coverImage,
        pinned: data.pinned || false,
        content: markdownContent,
        filePath,
      };
    });

    blogs.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json(blogs);
  } catch (error) {
    return NextResponse.json({ error: '获取博文列表失败' }, { status: 500 });
  }
}

// 保存博文（新建或更新）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, title, date, category, tags, excerpt, coverImage, content, pinned } = body;

    // 验证必填字段
    if (!slug || !title || !date || !category || !content) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 构建frontmatter，确保不包含undefined值
    const frontmatter: any = {
      title,
      date,
      category,
      tags,
    };
    
    // 只添加有值的属性
    if (excerpt) {
      frontmatter.excerpt = excerpt;
    }
    if (coverImage) {
      frontmatter.coverImage = coverImage;
    }
    if (pinned !== undefined && pinned !== null) {
      frontmatter.pinned = pinned;
    }

    const fileContent = matter.stringify(content, frontmatter);
    const filePath = path.join(BLOGS_DIR, `${slug}.md`);
    
    if (!fs.existsSync(BLOGS_DIR)) {
      fs.mkdirSync(BLOGS_DIR, { recursive: true });
    }
    
    fs.writeFileSync(filePath, fileContent, 'utf-8');

    return NextResponse.json({ success: true, message: '博文保存成功！' });
  } catch (error) {
    console.error('保存博文失败:', error);
    return NextResponse.json({ 
      error: '保存博文失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 删除博文
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json({ error: '缺少slug参数' }, { status: 400 });
    }

    const filePath = path.join(BLOGS_DIR, `${slug}.md`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '博文不存在' }, { status: 404 });
    }
    
    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true, message: '博文删除成功！' });
  } catch (error) {
    return NextResponse.json({ error: '删除博文失败' }, { status: 500 });
  }
}
