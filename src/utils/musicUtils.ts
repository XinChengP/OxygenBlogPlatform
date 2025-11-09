import { Song, Playlist } from '@/components/MusicPlayer';

// 获取音乐文件列表
export async function getMusicPlaylists(): Promise<Playlist[]> {
  // 在静态环境下，使用预生成的静态数据
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // 静态环境（文件协议），使用静态数据
    return getStaticMusicPlaylists();
  }
  
  // 开发环境或生产环境，尝试调用API
  try {
    // 在实际应用中，这里应该调用API获取音乐文件列表
    // 现在我们模拟从public/MusicList目录获取音乐文件
    
    // 模拟API响应，注意使用尾随斜杠
    const response = await fetch('/api/music/');
    if (!response.ok) {
      throw new Error('Failed to fetch music playlists');
    }
    
    const playlists = await response.json() as Playlist[];
    return playlists;
  } catch (error) {
    console.error('Error fetching music playlists:', error);
    
    // 如果API调用失败，返回静态数据作为后备
    return getStaticMusicPlaylists();
  }
}

// 获取静态音乐播放列表数据（用于静态环境）
function getStaticMusicPlaylists(): Playlist[] {
  // 这里返回预生成的静态数据
  // 在实际应用中，这些数据应该在构建时生成
  return [{
    id: '2025Producer',
    name: '闪耀的Producer',
    songs: [
      {
        id: '2025Producer-0',
        title: '珍珠',
        artist: '洛天依',
        url: '/MusicList/2025Producer/珍珠.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-1',
        title: '权御天下',
        artist: '洛天依',
        url: '/MusicList/2025Producer/权御天下.mp3',
        cover: '/placeholder-album.svg'
      }
    ]
  }];
}

// 解析音乐文件名获取歌曲信息
export function parseSongInfo(filename: string): { title: string; artist?: string } {
  // 移除文件扩展名
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // 尝试从文件名中提取艺术家和歌曲名
  // 这里使用简单的规则，实际应用中可能需要更复杂的解析
  let title = nameWithoutExt;
  let artist: string | undefined;
  
  // 检查是否包含常见的艺术家分隔符
  const separators = [' - ', '—', '–', '｜', '|', '【', '「'];
  for (const sep of separators) {
    if (nameWithoutExt.includes(sep)) {
      const parts = nameWithoutExt.split(sep);
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(sep).trim();
        break;
      }
    }
  }
  
  // 如果没有找到分隔符，尝试其他模式
  if (!artist) {
    // 检查是否包含"feat."或"ft."
    const featMatch = nameWithoutExt.match(/(.+?)\s+(?:feat\.|ft\.)\s+(.+)/i);
    if (featMatch) {
      title = featMatch[1].trim();
      artist = featMatch[2].trim();
    }
  }
  
  // 清理标题中的特殊字符
  title = title.replace(/^["'【「《]/, '').replace(/["'】】》]$/, '');
  
  return { title, artist };
}

// 创建播放列表对象
export function createPlaylist(folderName: string, files: string[]): Playlist {
  // 特殊处理播放列表名称
  let displayName = folderName;
  if (folderName === '2025Producer') {
    displayName = '闪耀的Producer';
  }
  
  const songs: Song[] = files.map((file, index) => {
    const { title, artist } = parseSongInfo(file);
    // 尝试构建封面URL，假设封面与音频文件同名但扩展名为.jpg或.png
    const baseName = file.replace(/\.[^/.]+$/, "");
    const coverUrl = `/MusicList/${folderName}/${encodeURIComponent(baseName)}.jpg`;
    
    return {
      id: `${folderName}-${index}`,
      title,
      artist,
      url: `/MusicList/${folderName}/${encodeURIComponent(file)}`,
      cover: coverUrl
    };
  });
  
  return {
    id: folderName,
    name: displayName,
    songs
  };
}