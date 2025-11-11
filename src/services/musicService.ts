// 音乐平台API服务，用于从网易云、QQ音乐等平台获取音乐数据

import { Song, Playlist, Artist, Album, MusicServer, MusicType } from '@/types/music';

import { getAssetPath } from '@/utils/assetUtils';

// 音乐平台API基础URL
const API_BASE_URLS = {
  [MusicServer.NETEASE]: 'https://api.injahow.cn/meting',
  [MusicServer.TENCENT]: 'https://api.injahow.cn/meting',
  [MusicServer.KUGOU]: 'https://api.injahow.cn/meting',
  [MusicServer.XIAMI]: 'https://api.injahow.cn/meting',
  [MusicServer.BAIDU]: 'https://api.injahow.cn/meting'
};

// GitHub Pages兼容性：检查是否在静态部署环境中
const isStaticEnvironment = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1' && 
  process.env.NODE_ENV === 'production';

// 获取音乐数据
export async function fetchMusicData(
  server: MusicServer = MusicServer.NETEASE,
  type: MusicType = MusicType.PLAYLIST,
  id: string | number = '167985096'
): Promise<Playlist | null> {
  try {
    // 在静态环境中，使用JSONP或CORS代理来避免CORS问题
    let url = `${API_BASE_URLS[server]}?type=${type}&id=${id}&server=${server}`;
    
    // 如果在静态环境中，使用CORS代理
    if (isStaticEnvironment) {
      url = `https://cors-anywhere.herokuapp.com/${url}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch music data: ${response.status}`);
    }
    
    const data = await response.json() as ApiResponse | ApiResponse[];
    
    // 根据返回的数据类型处理
    if (Array.isArray(data)) {
      // 歌曲列表
      const songs = data.map((item: ApiResponse) => parseSongItem(item as Record<string, any>));
      return {
        id: `${server}-${type}-${id}`,
        name: `${server} ${type} ${id}`,
        songs
      };
    } else if (data && typeof data === 'object' && 'data' in data) {
      // 单个歌单或专辑
      if (data.data && Array.isArray(data.data)) {
        const songs = data.data.map((item: ApiResponse) => parseSongItem(item as Record<string, any>));
        return {
          id: `${server}-${type}-${id}`,
          name: (data.name || data.title || `${server} ${type} ${id}`) as string,
          songs
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching music data:', error);
    // 在静态环境中，如果API调用失败，返回一个示例歌单
    if (isStaticEnvironment) {
      return getFallbackPlaylist(type, id);
    }
    return null;
  }
}

// 定义API响应的类型
interface ApiResponse {
  url?: string;
  lrc?: string;
  name?: string;
  title?: string;
  data?: unknown;
  coverImgUrl?: string;
  picUrl?: string;
  description?: string;
  pic?: string;
  cover?: string;
  ar?: Array<{ name: string }>;
  al?: { picUrl: string };
  artist?: unknown;
  artistName?: string;
  briefDesc?: string;
  desc?: string;
  avatar?: string;
}

// 解析歌曲数据
function parseSongItem(item: Record<string, any>): Song {
  const ar = item.ar as Array<{ name: string }> | undefined;
  const al = item.al as { picUrl: string } | undefined;
  
  return {
    id: String(item.id || item.rid || ''),
    title: String(item.name || item.title || ''),
    artist: String(item.artist || ar?.[0]?.name || item.author || ''),
    url: String(item.url || ''),
    cover: String(item.pic || item.cover || al?.picUrl || ''),
    lrc: String(item.lrc || ''),
    duration: Number(item.time || item.dt || item.duration || 0)
  };
}

// 获取歌曲URL
export async function fetchSongUrl(
  songId: string,
  server: MusicServer = MusicServer.NETEASE
): Promise<string | null> {
  try {
    let url = `${API_BASE_URLS[server]}?type=url&id=${songId}&server=${server}`;
    
    // 如果在静态环境中，使用CORS代理
    if (isStaticEnvironment) {
      url = `https://cors-anywhere.herokuapp.com/${url}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch song URL: ${response.status}`);
    }
    
    const data = await response.json() as ApiResponse;
    return data.url || null;
  } catch (error) {
    console.error('Error fetching song URL:', error);
    return null;
  }
}

// 获取歌词
export async function fetchLyrics(
  songId: string,
  server: MusicServer = MusicServer.NETEASE
): Promise<string | null> {
  try {
    let url = `${API_BASE_URLS[server]}?type=lrc&id=${songId}&server=${server}`;
    
    // 如果在静态环境中，使用CORS代理
    if (isStaticEnvironment) {
      url = `https://cors-anywhere.herokuapp.com/${url}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch lyrics: ${response.status}`);
    }
    
    const data = await response.json() as ApiResponse;
    return data.lrc || null;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
}

// 搜索音乐
export async function searchMusic(
  keyword: string,
  server: MusicServer = MusicServer.NETEASE,
  limit: number = 20
): Promise<Song[]> {
  try {
    let url = `${API_BASE_URLS[server]}?type=search&keywords=${encodeURIComponent(keyword)}&server=${server}&limit=${limit}`;
    
    // 如果在静态环境中，使用CORS代理
    if (isStaticEnvironment) {
      url = `https://cors-anywhere.herokuapp.com/${url}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to search music: ${response.status}`);
    }
    
    const data = await response.json() as ApiResponse;
    
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((item: ApiResponse) => parseSongItem(item as Record<string, any>));
    }
    
    return [];
  } catch (error) {
    console.error('Error searching music:', error);
    // 在静态环境中，如果API调用失败，返回示例歌曲
    if (isStaticEnvironment) {
      return getFallbackSongs();
    }
    return [];
  }
}

// 获取热门歌单
export async function getHotPlaylists(
  server: MusicServer = MusicServer.NETEASE,
  limit: number = 10
): Promise<Playlist[]> {
  try {
    const hotPlaylistIds: Record<MusicServer, string[]> = {
      [MusicServer.NETEASE]: ['3778678', '3779629', '2884035'],
      [MusicServer.TENCENT]: ['1374268666', '19723749'],
      [MusicServer.KUGOU]: ['3778678'], // 使用网易云热歌榜ID作为占位符
      [MusicServer.XIAMI]: ['3779629'], // 使用网易云飙升榜ID作为占位符
      [MusicServer.BAIDU]: ['2884035']  // 使用网易云新歌榜ID作为占位符
    };
    
    const playlistIds = hotPlaylistIds[server].slice(0, limit);
    
    // 使用 Promise.all 并行请求提高效率
    const playlistPromises = playlistIds.map(async (id) => {
      try {
        let url = `${API_BASE_URLS[server]}?type=playlist&id=${id}&server=${server}`;
        
        // 如果在静态环境中，使用CORS代理
        if (isStaticEnvironment) {
          url = `https://cors-anywhere.herokuapp.com/${url}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`Failed to fetch playlist ${id}: ${response.status}`);
          return null;
        }
        
        const data = await response.json() as ApiResponse;
        
        if (data.name && (data.coverImgUrl || data.picUrl)) {
          return {
            id,
            name: String(data.name),
            cover: String(data.coverImgUrl || data.picUrl),
            description: String(data.description || ''),
            songs: []
          };
        }
        
        return null;
      } catch (error) {
        console.error(`Error fetching playlist ${id}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(playlistPromises);
    const playlists = results.filter(playlist => playlist !== null) as Playlist[];
    
    // 在静态环境中，如果没有获取到歌单，返回示例歌单
    if (isStaticEnvironment && playlists.length === 0) {
      return getFallbackPlaylists();
    }
    
    return playlists;
  } catch (error) {
    console.error('Error fetching hot playlists:', error);
    // 在静态环境中，如果API调用失败，返回示例歌单
    if (isStaticEnvironment) {
      return getFallbackPlaylists();
    }
    return [];
  }
}

// 获取歌手信息
export async function getArtistInfo(
  artistId: string,
  server: MusicServer = MusicServer.NETEASE
): Promise<{ artist: Artist; songs: Song[] }> {
  try {
    const url = `${API_BASE_URLS[server]}?type=artist&id=${artistId}&server=${server}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch artist info: ${response.status}`);
    }
    
    const data = await response.json() as ApiResponse;
    
    const artist: Artist = {
      id: artistId,
      name: String(data.name || ''),
      avatar: String(data.picUrl || data.avatar || ''),
      description: String(data.briefDesc || data.description || '')
    };
    
    const songs = data.data && Array.isArray(data.data) 
      ? data.data.map((item: ApiResponse) => parseSongItem(item as Record<string, any>))
      : [];
    
    return { artist, songs };
  } catch (error) {
    console.error('Error fetching artist info:', error);
    return { 
      artist: { id: artistId, name: '', avatar: '', description: '' }, 
      songs: [] 
    };
  }
}

// 获取专辑信息
export async function getAlbumInfo(
  albumId: string,
  server: MusicServer = MusicServer.NETEASE
): Promise<{ album: Album; songs: Song[] }> {
  try {
    const url = `${API_BASE_URLS[server]}?type=album&id=${albumId}&server=${server}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch album info: ${response.status}`);
    }
    
    const data = await response.json() as ApiResponse;
    
    const artistField = data.artist;
    const artistName = typeof artistField === 'object' && artistField !== null && 'name' in artistField 
      ? String((artistField as { name: string }).name) 
      : String(artistField || data.artistName || '');
    
    const album: Album = {
      id: albumId,
      name: String(data.name || data.title || ''),
      cover: String(data.picUrl || data.cover || ''),
      artist: artistName,
      description: String(data.description || data.desc || '')
    };
    
    const songs = data.data && Array.isArray(data.data) 
      ? data.data.map((item: ApiResponse) => parseSongItem(item as Record<string, any>))
      : [];
    
    return { album, songs };
  } catch (error) {
    console.error('Error fetching album info:', error);
    return { 
      album: { id: albumId, name: '', cover: '', artist: '', description: '' }, 
      songs: [] 
    };
  }
}

// 获取音乐平台的详细信息
export function getMusicServerInfo(server: MusicServer): {
  name: string;
  displayName: string;
  color: string;
} {
  const serverInfo: Record<MusicServer, { name: string; displayName: string; color: string }> = {
    [MusicServer.NETEASE]: {
      name: 'netease',
      displayName: '网易云音乐',
      color: '#C20C0C'
    },
    [MusicServer.TENCENT]: {
      name: 'tencent',
      displayName: 'QQ音乐',
      color: '#31C27C'
    },
    [MusicServer.KUGOU]: {
      name: 'kugou',
      displayName: '酷狗音乐',
      color: '#2E8EE8'
    },
    [MusicServer.XIAMI]: {
      name: 'xiami',
      displayName: '虾米音乐',
      color: '#FF6A00'
    },
    [MusicServer.BAIDU]: {
      name: 'baidu',
      displayName: '百度音乐',
      color: '#3067D3'
    }
  };
  
  return serverInfo[server] || serverInfo[MusicServer.NETEASE];
}

// 获取音乐类型的详细信息
export function getMusicTypeInfo(type: MusicType): {
  name: string;
  displayName: string;
} {
  const typeInfo: Record<MusicType, { name: string; displayName: string }> = {
    [MusicType.SONG]: {
      name: 'song',
      displayName: '歌曲'
    },
    [MusicType.PLAYLIST]: {
      name: 'playlist',
      displayName: '歌单'
    },
    [MusicType.ALBUM]: {
      name: 'album',
      displayName: '专辑'
    },
    [MusicType.SEARCH]: {
      name: 'search',
      displayName: '搜索'
    },
    [MusicType.ARTIST]: {
      name: 'artist',
      displayName: '歌手'
    }
  };
  
  return typeInfo[type] || typeInfo[MusicType.PLAYLIST];
}

// GitHub Pages兼容性：提供示例数据，当API调用失败时使用
function getFallbackPlaylist(
  type: MusicType = MusicType.PLAYLIST,
  id: string | number = '167985096'
): Playlist {
  return {
    id: `fallback-${type}-${id}`,
    name: '示例歌单 (API不可用)',
    songs: getFallbackSongs()
  };
}

// 获取示例歌曲列表
function getFallbackSongs(): Song[] {
  return [
    {
      id: '1',
      title: '示例歌曲 1',
      artist: '示例艺术家',
      url: getAssetPath('/music/sample1.mp3'),
      duration: 180,
      cover: getAssetPath('/placeholder-album.svg'),
      lrc: '[00:00.00]示例歌词 1\n[00:05.00]这只是示例歌词\n[00:10.00]在GitHub Pages环境中'
    },
    {
      id: '2',
      title: '示例歌曲 2',
      artist: '示例艺术家',
      url: getAssetPath('/music/sample2.mp3'),
      duration: 240,
      cover: getAssetPath('/placeholder-album.svg'),
      lrc: '[00:00.00]示例歌词 2\n[00:05.00]这只是示例歌词\n[00:10.00]在GitHub Pages环境中'
    },
    {
      id: '3',
      title: '示例歌曲 3',
      artist: '示例艺术家',
      url: getAssetPath('/music/sample3.mp3'),
      duration: 200,
      cover: getAssetPath('/placeholder-album.svg'),
      lrc: '[00:00.00]示例歌词 3\n[00:05.00]这只是示例歌词\n[00:10.00]在GitHub Pages环境中'
    }
  ];
}

// 获取示例歌单列表
function getFallbackPlaylists(): Playlist[] {
  return [
    {
      id: 'fallback-playlist-1',
      name: 'GitHub Pages 热门歌单',
      songs: getFallbackSongs()
    },
    {
      id: 'fallback-playlist-2',
      name: 'GitHub Pages 推荐歌单',
      songs: getFallbackSongs()
    },
    {
      id: 'fallback-playlist-3',
      name: 'GitHub Pages 最新歌单',
      songs: getFallbackSongs()
    }
  ];
}