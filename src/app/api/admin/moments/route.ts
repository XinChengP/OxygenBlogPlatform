/**
 * 动态管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const MOMENTS_DIR = path.join(process.cwd(), 'src', 'content', 'moments');

// 获取动态列表
export async function GET() {
  try {
    if (!fs.existsSync(MOMENTS_DIR)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(MOMENTS_DIR).filter(f => f.endsWith('.md'));
    const moments = files.map(file => {
      const filePath = path.join(MOMENTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data, content: markdownContent } = matter(content);
      
      return {
        id: data.id || file.replace('.md', ''),
        time: data.time || '',
        tags: data.tags || [],
        images: data.images || [],
        pinned: data.pinned || false,
        content: markdownContent,
        filePath,
      };
    });

    moments.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    return NextResponse.json(moments);
  } catch (error) {
    return NextResponse.json({ error: '获取动态列表失败' }, { status: 500 });
  }
}

// 保存动态（新建或更新）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, time, tags, images, content, pinned } = body;

    const frontmatter = {
      id,
      time,
      tags,
      images,
      pinned,
    };

    const fileContent = matter.stringify(content, frontmatter);
    
    if (!fs.existsSync(MOMENTS_DIR)) {
      fs.mkdirSync(MOMENTS_DIR, { recursive: true });
    }
    
    // 查找可能存在的旧文件（文件名可能包含id）
    const existingFiles = fs.readdirSync(MOMENTS_DIR).filter(f => f.endsWith('.md'));
    const oldFile = existingFiles.find(file => {
      const filePath = path.join(MOMENTS_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);
      return data.id === id;
    });
    
    // 如果找到旧文件，删除它
    if (oldFile) {
      const oldFilePath = path.join(MOMENTS_DIR, oldFile);
      fs.unlinkSync(oldFilePath);
    }
    
    // 创建新文件
    const newFilePath = path.join(MOMENTS_DIR, `${id}.md`);
    fs.writeFileSync(newFilePath, fileContent, 'utf-8');

    return NextResponse.json({ success: true, message: '动态保存成功！' });
  } catch (error) {
    return NextResponse.json({ error: '保存动态失败' }, { status: 500 });
  }
}

// 删除动态
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少id参数' }, { status: 400 });
    }

    const filePath = path.join(MOMENTS_DIR, `${id}.md`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '动态不存在' }, { status: 404 });
    }
    
    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true, message: '动态删除成功！' });
  } catch (error) {
    return NextResponse.json({ error: '删除动态失败' }, { status: 500 });
  }
}
