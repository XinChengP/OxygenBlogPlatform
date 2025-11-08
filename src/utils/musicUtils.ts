import { Song, Playlist } from '@/components/MusicPlayer';

// 获取音乐文件列表
export async function getMusicPlaylists(): Promise<Playlist[]> {
  try {
    // 在实际应用中，这里应该调用API获取音乐文件列表
    // 现在我们模拟从public/MusicList目录获取音乐文件
    
    // 模拟API响应，注意使用尾随斜杠
    const response = await fetch('/api/music/');
    if (!response.ok) {
      throw new Error('Failed to fetch music playlists');
    }
    
    const playlists = await response.json();
    return playlists;
  } catch (error) {
    console.error('Error fetching music playlists:', error);
    
    // 如果API调用失败，返回一个默认播放列表
    return [{
      id: 'default',
      name: '默认播放列表',
      songs: []
    }];
  }
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