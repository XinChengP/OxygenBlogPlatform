/**
 * 网易云音乐 API 代理路由
 * 
 * 功能说明：
 * 1. 作为前端和网易云 API 之间的代理，解决跨域问题
 * 2. 获取歌单详情和歌曲列表
 * 3. 获取歌曲播放链接
 * 4. 获取歌词
 * 
 * 使用方式：
 * GET /api/netease/playlist?id=14349636887&limit=100
 * 
 * @author 歆橙
 * @version 1.0
 * @date 2026-05-05
 */

import { NextRequest, NextResponse } from 'next/server';

// API 基础 URL
const API_BASE_URL = 'https://api.toolkal.com';

// 请求超时时间（毫秒）
const TIMEOUT = 30000;

/**
 * 发送请求到网易云 API
 * @param endpoint API 端点
 * @param params 查询参数
 * @returns 响应数据
 */
async function fetchFromNeteaseApi(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<unknown> {
  const url = new URL(endpoint, API_BASE_URL);
  
  // 添加查询参数
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  // 添加时间戳防止缓存
  url.searchParams.append('timestamp', Date.now().toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * GET 请求处理
 * 获取歌单歌曲列表
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // 验证参数
    if (!playlistId) {
      return NextResponse.json(
        { error: '缺少歌单 ID 参数' },
        { status: 400 }
      );
    }

    console.log(`[Netease API] 获取歌单: ${playlistId}, 限制: ${limit}`);

    // 获取歌单所有歌曲
    const tracksData = await fetchFromNeteaseApi('/playlist/track/all', {
      id: playlistId,
      limit,
      offset: 0,
    }) as {
      code: number;
      songs: Array<{
        id: number;
        name: string;
        ar: Array<{ id: number; name: string }>;
        al: { id: number; name: string; picUrl: string };
        dt: number;
      }>;
    };

    if (tracksData.code !== 200) {
      return NextResponse.json(
        { error: '获取歌单失败', code: tracksData.code },
        { status: 500 }
      );
    }

    const tracks = tracksData.songs || [];

    if (tracks.length === 0) {
      return NextResponse.json({
        code: 200,
        data: [],
        message: '歌单为空',
      });
    }

    // 获取歌曲 ID 列表
    const songIds = tracks.map((track) => track.id);

    // 获取歌曲播放链接
    const urlsData = await fetchFromNeteaseApi('/song/url/v1', {
      id: songIds.join(','),
      level: 'exhigh',
    }) as {
      code: number;
      data: Array<{
        id: number;
        url: string | null;
        br: number;
        size: number;
        type: string;
      }>;
    };

    // 构建 URL 映射
    const urlMap = new Map<number, string>();
    if (urlsData.code === 200 && urlsData.data) {
      urlsData.data.forEach((item) => {
        if (item.url) {
          urlMap.set(item.id, item.url);
        }
      });
    }

    // 获取歌词（并行请求）
    const lyricPromises = tracks.map(async (track) => {
      try {
        const lyricData = await fetchFromNeteaseApi('/lyric', {
          id: track.id,
        }) as {
          code: number;
          lrc?: { lyric: string };
        };

        if (lyricData.code === 200 && lyricData.lrc?.lyric) {
          return { id: track.id, lyric: lyricData.lrc.lyric };
        }
        return { id: track.id, lyric: undefined };
      } catch {
        return { id: track.id, lyric: undefined };
      }
    });

    const lyricsResults = await Promise.all(lyricPromises);
    const lyricMap = new Map<number, string | undefined>();
    lyricsResults.forEach((result) => {
      lyricMap.set(result.id, result.lyric);
    });

    // 转换为标准格式
    const songs = tracks
      .map((track) => {
        const songUrl = urlMap.get(track.id);
        if (!songUrl) {
          console.warn(`[Netease API] 歌曲无播放链接: ${track.name} (${track.id})`);
          return null;
        }

        const artistNames = track.ar.map((artist) => artist.name).join('、');

        return {
          id: `netease-${track.id}`,
          name: track.name,
          artist: artistNames,
          url: songUrl,
          cover: track.al.picUrl,
          lrc: lyricMap.get(track.id),
          source: 'netease' as const,
          neteaseId: track.id,
          duration: Math.floor(track.dt / 1000),
        };
      })
      .filter((song): song is NonNullable<typeof song> => song !== null);

    console.log(`[Netease API] 成功获取 ${songs.length}/${tracks.length} 首歌曲`);

    return NextResponse.json({
      code: 200,
      data: songs,
      total: songs.length,
    });
  } catch (error) {
    console.error('[Netease API] 处理请求失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return NextResponse.json(
      { error: '服务器内部错误', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 配置 CORS 头
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
