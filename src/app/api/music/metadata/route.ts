import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import * as musicMetadata from 'music-metadata';

// 配置API路由为静态模式
export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    // 从查询参数中获取音乐文件路径
    const { searchParams } = new URL(request.url);
    const musicPath = searchParams.get('path');
    
    if (!musicPath) {
      return NextResponse.json(
        { error: 'Music path is required' },
        { status: 400 }
      );
    }
    
    // 解码URL编码的路径
    const decodedPath = decodeURIComponent(musicPath);
    
    // 构建完整的文件路径
    const fullPath = path.join(process.cwd(), 'public', decodedPath);
    
    try {
      // 读取音乐文件
      const fileBuffer = await readFile(fullPath);
      
      // 提取元数据
      const metadata = await musicMetadata.parseBuffer(fileBuffer);
      
      // 提取封面图片
      let coverData: string | null = null;
      let coverFormat: string = '';
      
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        coverFormat = picture.format;
        
        // 将图片数据转换为base64
        const base64 = Buffer.from(picture.data).toString('base64');
        coverData = `data:${picture.format};base64,${base64}`;
      }
      
      // 返回元数据和封面
      return NextResponse.json({
        title: metadata.common.title || '',
        artist: metadata.common.artist || '',
        album: metadata.common.album || '',
        duration: metadata.format.duration || 0,
        cover: coverData,
        coverFormat: coverFormat,
        // 其他可能有用的元数据
        year: metadata.common.year,
        genre: metadata.common.genre,
        track: metadata.common.track
      });
    } catch (fileError) {
      console.error('Error processing music file:', fileError);
      return NextResponse.json(
        { error: 'Failed to process music file', details: fileError instanceof Error ? fileError.message : String(fileError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in metadata API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}