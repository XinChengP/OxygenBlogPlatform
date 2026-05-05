/**
 * 预获取网易云歌单数据脚本
 * 
 * 功能说明：
 * 1. 在构建时从网易云 API 获取歌单数据
 * 2. 将数据保存为静态 JSON 文件
 * 3. 生产环境直接读取静态文件，避免跨域问题
 * 
 * 使用方式：
 * node scripts/fetch-netease-playlist.js
 * 
 * @author 歆橙
 * @version 1.0
 * @date 2026-05-05
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 第三方 API 基础 URL
const API_BASE_URL = 'api.toolkal.com';

// 请求超时时间（毫秒）
const TIMEOUT = 30000;

/**
 * 发送 HTTPS 请求
 * @param {string} endpoint API 端点
 * @param {Record<string, string | number>} params 查询参数
 * @returns {Promise<unknown>} 响应数据
 */
function fetchFromNeteaseApi(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    // 构建查询字符串
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    queryParams.append('timestamp', Date.now().toString());

    const options = {
      hostname: API_BASE_URL,
      path: `${endpoint}?${queryParams.toString()}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: TIMEOUT,
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`解析 JSON 失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

/**
 * 获取歌单所有歌曲
 * @param {string | number} playlistId 歌单 ID
 * @param {number} limit 限制数量
 * @returns {Promise<Array<{
 *   id: number;
 *   name: string;
 *   ar: Array<{ id: number; name: string }>;
 *   al: { id: number; name: string; picUrl: string };
 *   dt: number;
 * }>>} 歌曲列表
 */
async function getPlaylistTracks(playlistId, limit = 100) {
  const data = await fetchFromNeteaseApi('/playlist/track/all', {
    id: playlistId,
    limit,
    offset: 0,
  });

  if (data.code !== 200) {
    throw new Error(`获取歌单歌曲失败，错误码: ${data.code}`);
  }

  return data.songs || [];
}

/**
 * 获取歌曲播放链接
 * @param {number[]} songIds 歌曲 ID 数组
 * @returns {Promise<Map<number, string>>} 歌曲 URL 映射
 */
async function getSongUrls(songIds) {
  const ids = songIds.join(',');
  const data = await fetchFromNeteaseApi('/song/url/v1', {
    id: ids,
    level: 'exhigh',
  });

  if (data.code !== 200) {
    throw new Error(`获取歌曲链接失败，错误码: ${data.code}`);
  }

  const urlMap = new Map();
  data.data.forEach((item) => {
    if (item.url) {
      urlMap.set(item.id, item.url);
    }
  });

  return urlMap;
}

/**
 * 获取歌词
 * @param {number} songId 歌曲 ID
 * @returns {Promise<string | undefined>} 歌词内容
 */
async function getLyric(songId) {
  try {
    const data = await fetchFromNeteaseApi('/lyric', {
      id: songId,
    });

    if (data.code === 200 && data.lrc?.lyric) {
      return data.lrc.lyric;
    }
    return undefined;
  } catch (error) {
    console.warn(`获取歌词失败: ${songId}`, error.message);
    return undefined;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🎵 开始获取网易云歌单数据...');

    // 读取 music.json 配置
    const configPath = path.join(process.cwd(), 'public', 'content', 'music.json');
    if (!fs.existsSync(configPath)) {
      console.error('❌ 未找到 music.json 配置文件');
      process.exit(1);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // 检查是否启用了网易云歌单
    if (!config.sources?.netease?.enabled) {
      console.log('ℹ️ 网易云歌单未启用，跳过获取');
      process.exit(0);
    }

    const playlistId = config.sources.netease.playlistId;
    const limit = config.sources.netease.limit || 100;

    if (!playlistId) {
      console.error('❌ 未配置歌单 ID');
      process.exit(1);
    }

    console.log(`📋 歌单 ID: ${playlistId}`);
    console.log(`🔢 限制数量: ${limit}`);

    // 获取歌单歌曲列表
    console.log('🎶 正在获取歌曲列表...');
    const tracks = await getPlaylistTracks(playlistId, limit);
    console.log(`✅ 获取到 ${tracks.length} 首歌曲`);

    if (tracks.length === 0) {
      console.log('⚠️ 歌单为空');
      process.exit(0);
    }

    // 获取歌曲 ID 列表
    const songIds = tracks.map((track) => track.id);

    // 获取歌曲播放链接
    console.log('🔗 正在获取播放链接...');
    const urlMap = await getSongUrls(songIds);
    console.log(`✅ 获取到 ${urlMap.size} 个播放链接`);

    // 获取歌词（并行请求，限制并发数）
    console.log('📝 正在获取歌词...');
    const lyricMap = new Map();
    const batchSize = 10; // 每批 10 首歌曲

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      const lyricPromises = batch.map(async (track) => {
        const lyric = await getLyric(track.id);
        return { id: track.id, lyric };
      });

      const results = await Promise.all(lyricPromises);
      results.forEach((result) => {
        lyricMap.set(result.id, result.lyric);
      });

      console.log(`  进度: ${Math.min(i + batchSize, tracks.length)}/${tracks.length}`);
    }
    console.log(`✅ 歌词获取完成`);

    // 转换为标准格式
    const songs = tracks
      .map((track) => {
        const songUrl = urlMap.get(track.id);
        if (!songUrl) {
          console.warn(`⚠️ 歌曲无播放链接: ${track.name} (${track.id})`);
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
          source: 'netease',
          neteaseId: track.id,
          duration: Math.floor(track.dt / 1000),
        };
      })
      .filter((song) => song !== null);

    console.log(`✅ 成功处理 ${songs.length}/${tracks.length} 首歌曲`);

    // 保存到静态文件
    const outputDir = path.join(process.cwd(), 'public', 'content');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'netease-playlist.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      playlistId,
      total: songs.length,
      songs,
    }, null, 2));

    console.log(`💾 数据已保存到: ${outputPath}`);
    console.log('🎉 网易云歌单数据获取完成！');

  } catch (error) {
    console.error('❌ 获取失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();
