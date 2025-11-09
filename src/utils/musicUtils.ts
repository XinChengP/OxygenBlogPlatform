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
  // 返回public/MusicList目录中实际存在的音乐文件
  // 根据目录结构，目前有2025Producer文件夹
  return [{
    id: '2025Producer',
    name: '闪耀的Producer',
    songs: [
      {
        id: '2025Producer-0',
        title: '珍珠',
        artist: '洛天依',
        url: '/MusicList/2025Producer/官方投稿 【洛天依原创曲】珍珠【2025官方生贺曲】.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-1',
        title: '权御天下',
        artist: '洛天依',
        url: '/MusicList/2025Producer/官方投稿｜权御天下「2025官方重置版」【洛天依ST乌龟SuiCreuzer】.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-2',
        title: '白石溪',
        artist: '洛天依 乐正绫',
        url: '/MusicList/2025Producer/特别收录 【洛天依乐正绫原创】白石溪【2025官方重置版】.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-3',
        title: '超超超计算机世纪',
        artist: '洛天依',
        url: '/MusicList/2025Producer/特别收录 【洛天依原创】超超超计算机世纪【Chord分解和弦P】.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-4',
        title: '流光（Light Me Up）',
        artist: '洛天依',
        url: '/MusicList/2025Producer/特别收录｜跟随《流光（Light Me Up）》，点亮我们的蔚蓝色海洋吧！.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-5',
        title: '偷猎时间的天才',
        artist: '洛天依',
        url: '/MusicList/2025Producer/官方投稿 《时光代理人》全新单曲「偷猎时间的天才」（洛天依 ver）MV公开.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-6',
        title: 'MAO！',
        artist: '洛天依 神山羊 纳兰寻风',
        url: '/MusicList/2025Producer/红·发起人 【官方MV】MAO！- 洛天依&神山羊-有機酸&纳兰寻风.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-7',
        title: 'code：TY712',
        artist: '洛天依',
        url: '/MusicList/2025Producer/红·发起人 【洛天依原创】code：TY712【COP】.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-8',
        title: '捉迷藏',
        artist: '洛天依',
        url: '/MusicList/2025Producer/红·发起人｜捉迷藏(鬼ごっこ) - 春野 feat.洛天依 官方MV.mp3',
        cover: '/placeholder-album.svg'
      },
      {
        id: '2025Producer-9',
        title: '下等马',
        artist: '洛天依',
        url: '/MusicList/2025Producer/红、一等奖 【洛天依】下等马【ChiliChill】.mp3',
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
  // 针对实际的音乐文件名进行优化解析
  let title = nameWithoutExt;
  let artist: string | undefined;
  
  // 1. 首先处理常见的音乐文件命名格式
  // 格式：【艺术家】歌曲名【其他信息】
  const bracketMatch = nameWithoutExt.match(/【([^】]+)】([^【]+)(?:【[^】]*】)?/);
  if (bracketMatch) {
    artist = bracketMatch[1].trim();
    title = bracketMatch[2].trim();
  }
  
  // 2. 处理官方投稿格式：官方投稿 【艺术家】歌曲名【信息】
  if (!artist && nameWithoutExt.startsWith('官方投稿')) {
    const officialMatch = nameWithoutExt.match(/官方投稿[\s]*【([^】]+)】([^【]+)/);
    if (officialMatch) {
      artist = officialMatch[1].trim();
      title = officialMatch[2].trim();
    }
  }
  
  // 3. 处理特别收录格式：特别收录 【艺术家】歌曲名【信息】
  if (!artist && nameWithoutExt.startsWith('特别收录')) {
    const specialMatch = nameWithoutExt.match(/特别收录[\s]*【([^】]+)】([^【]+)/);
    if (specialMatch) {
      artist = specialMatch[1].trim();
      title = specialMatch[2].trim();
    }
  }
  
  // 4. 处理红/蓝系列格式：红 【艺术家】歌曲名【信息】
  if (!artist && (nameWithoutExt.startsWith('红') || nameWithoutExt.startsWith('蓝'))) {
    const colorMatch = nameWithoutExt.match(/^(?:红|蓝)(?:[·、]\S+)?[\s]*【([^】]+)】([^【]+)/);
    if (colorMatch) {
      artist = colorMatch[1].trim();
      title = colorMatch[2].trim();
    }
  }
  
  // 5. 处理包含feat.的格式
  if (!artist) {
    const featMatch = nameWithoutExt.match(/(.+?)\s+(?:feat\.|ft\.|Feat\.|Ft\.)\s+(.+)/i);
    if (featMatch) {
      title = featMatch[1].trim();
      artist = featMatch[2].trim();
    }
  }
  
  // 6. 处理其他分隔符格式
  if (!artist) {
    const separators = [' - ', '—', '–', '｜', '|', '【', '「', '《', '》'];
    for (const sep of separators) {
      if (nameWithoutExt.includes(sep)) {
        const parts = nameWithoutExt.split(sep);
        if (parts.length >= 2) {
          // 尝试识别哪部分是艺术家，哪部分是歌曲名
          // 通常艺术家信息在前，歌曲名在后
          artist = parts[0].trim();
          title = parts.slice(1).join(sep).trim();
          break;
        }
      }
    }
  }
  
  // 清理标题中的特殊字符和多余信息
  title = title
    .replace(/^["'【「《]/, '')
    .replace(/["'】】》]$/, '')
    .replace(/【[^】]*】$/, '') // 移除末尾的【信息】
    .replace(/\s*\([^)]*\)$/, '') // 移除末尾的括号内容
    .replace(/\s*\[[^\]]*\]$/, '') // 移除末尾的方括号内容
    .trim();
  
  // 如果艺术家信息包含多个部分，进行适当清理
  if (artist) {
    artist = artist
      .replace(/^["'【「《]/, '')
      .replace(/["'】】》]$/, '')
      .trim();
  }
  
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