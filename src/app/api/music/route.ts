import { NextResponse } from 'next/server';

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

// 在静态导出模式下，API路由不会被包含在构建中
// 这里提供一个简单的静态数据返回，避免构建错误
export async function GET() {
  // 在静态导出模式下，返回空的播放列表
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json([{
      id: 'static-export',
      name: '音乐播放列表',
      songs: []
    }]);
  }
  
  // 开发模式下，返回真实的音乐数据
  try {
    const { readdir } = await import('fs/promises');
    const path = await import('path');
    // 由于 @/utils/musicUtils 模块不存在，直接在本地实现 createPlaylist 函数
    const createPlaylist = (folderName: string, audioFiles: string[]): Playlist => {
      const songs: Song[] = audioFiles.map((file, index) => ({
        id: `${folderName}-${index}`,
        title: file.replace(/\.(mp3|wav|ogg|m4a)$/i, ''),
        url: `/MusicList/${folderName}/${file}`,
        cover: undefined,
        duration: undefined,
      }));

      return {
        id: folderName,
        name: folderName,
        songs,
      };
    };
    
    console.log('Music API called (development mode)');
    
    // 构建音乐目录路径
    const musicDir = path.join(process.cwd(), 'public', 'MusicList');
    console.log('Music directory:', musicDir);
    
    // 读取MusicList目录
    const playlistFolders = await readdir(musicDir, { withFileTypes: true });
    console.log('Found playlist folders:', playlistFolders.map(f => f.name));
    
    const playlists: Playlist[] = [];
    
    // 遍历每个播放列表文件夹
    for (const folder of playlistFolders) {
      if (folder.isDirectory()) {
        try {
          const folderPath = path.join(musicDir, folder.name);
          const files = await readdir(folderPath);
          
          // 过滤出音频文件
          const audioFiles = files.filter(file => 
            file.toLowerCase().endsWith('.mp3') ||
            file.toLowerCase().endsWith('.wav') ||
            file.toLowerCase().endsWith('.ogg') ||
            file.toLowerCase().endsWith('.m4a')
          );
          
          console.log(`Found ${audioFiles.length} audio files in ${folder.name}`);
          
          if (audioFiles.length > 0) {
            // 创建播放列表
            const playlist = createPlaylist(folder.name, audioFiles);
            playlists.push(playlist);
          }
        } catch (folderError) {
          console.error(`Error reading folder ${folder.name}:`, folderError);
        }
      }
    }
    
    // 如果没有找到任何播放列表，返回默认播放列表
    if (playlists.length === 0) {
      console.log('No playlists found, returning default playlist');
      playlists.push({
        id: 'default',
        name: '默认播放列表',
        songs: []
      });
    }
    
    console.log('Returning playlists:', playlists);
    
    return NextResponse.json(playlists);
  } catch (error) {
    console.error('Error in music API:', error);
    
    // 如果出现错误，返回一个默认的播放列表
    const defaultPlaylist = {
      id: 'error-fallback',
      name: '音乐播放列表',
      songs: []
    };
    
    return NextResponse.json([defaultPlaylist]);
  }
}