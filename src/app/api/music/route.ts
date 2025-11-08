import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';
import { createPlaylist } from '@/utils/musicUtils';

// 从MusicPlayer导入Song和Playlist类型
interface Song {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  cover?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

// 配置API路由为静态模式
export const dynamic = 'force-static';

export async function GET() {
  try {
    // 获取音乐目录路径
    const musicDir = path.join(process.cwd(), 'public', 'MusicList');
    
    // 读取音乐目录下的所有文件夹
    const folders = await readdir(musicDir, { withFileTypes: true })
      .then(dirents => dirents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name))
      .catch(error => {
        console.error('Error reading music directory:', error);
        return [];
      });
    
    // 为每个文件夹创建播放列表
    const playlists = await Promise.all(
      folders.map(async (folder) => {
        const folderPath = path.join(musicDir, folder);
        
        // 读取文件夹中的所有音乐文件
        const files = await readdir(folderPath)
          .then(fileNames => 
            fileNames.filter(fileName => {
              // 只保留音频文件
              const ext = path.extname(fileName).toLowerCase();
              return ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'].includes(ext);
            })
          )
          .catch(error => {
            console.error(`Error reading folder ${folder}:`, error);
            return [];
          });
        
        return createPlaylist(folder, files);
      })
    );
    
    // 过滤掉没有歌曲的播放列表
    const validPlaylists = playlists.filter((playlist: Playlist) => playlist.songs.length > 0);
    
    return NextResponse.json(validPlaylists);
  } catch (error) {
    console.error('Error in music API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch music playlists' },
      { status: 500 }
    );
  }
}