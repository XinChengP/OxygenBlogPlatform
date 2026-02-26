/**
 * 图片上传API
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'Blogabout');

export async function POST(request: NextRequest) {
  try {
    // 确保上传目录存在
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只支持图片文件' }, { status: 400 });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `blog-${timestamp}${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // 读取文件内容并保存
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    // 返回文件路径
    const fileUrl = `/Blogabout/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
