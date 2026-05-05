/**
 * 预获取网易云歌单数据脚本
 * 
 * 功能说明：
 * 1. 在构建时从网易云 API 获取歌单数据
 * 2. 将数据保存为静态 JSON 文件
 * 3. 生产环境直接读取静态文件，避免跨域问题
 * 4. 支持重试机制和降级处理
 * 
 * 使用方式：
 * node scripts/fetch-netease-playlist.js
 * 
 * @author 歆橙
 * @version 2.0
 * @date 2026-05-05
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 第三方 API 基础 URL
const API_BASE_URL = 'api.toolkal.com';

// 请求超时时间（毫秒）
const TIMEOUT = 30000;

// 重试次数
const MAX_RETRIES = 3;

// 重试延迟（毫秒）
const RETRY_DELAY = 2000;

/**
 * 延迟函数
 * @param {number} ms 毫秒
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 发送 HTTPS 请求（带重试）
 * @param {string} endpoint API 端点
 * @param {Record<string, string | number>} params 查询参数
 * @param {number} retryCount 当前重试次数
 * @returns {Promise<unknown>} 响应数据
 */
async function fetchFromNeteaseApi(endpoint, params = {}, retryCount = 0) {
  try {
    return await new Promise((resolve, reject) => {
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
  } catch (error) {
    // 如果还有重试次数，延迟后重试
    if (retryCount < MAX_RETRIES) {
      console.log(`  请求失败，${RETRY_DELAY / 1000}秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY);
      return fetchFromNeteaseApi(endpoint, params, retryCount + 1);
    }
    throw error;
  }
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
 * 检查是否已有缓存的静态文件
 * @returns {boolean} 是否存在缓存文件
 */
function hasCachedPlaylist() {
  const outputPath = path.join(process.cwd(), 'public', 'content', 'netease-playlist.json');
  return fs.existsSync(outputPath);
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

    // 检查是否已有缓存文件
    const hasCache = hasCachedPlaylist();
    if (hasCache) {
      console.log('💾 发现已缓存的歌单数据');
    }

    // 获取歌单歌曲列表
    console.log('🎶 正在获取歌曲列表...');
    let tracks;
    try {
      tracks = await getPlaylistTracks(playlistId, limit);
      console.log(`✅ 获取到 ${tracks.length} 首歌曲`);
    } catch (error) {
      console.error(`❌ 获取歌曲列表失败: ${error.message}`);
      
      // 如果有缓存，使用缓存数据
      if (hasCache) {
        console.log('⚠️ 使用已缓存的歌单数据继续构建');
        process.exit(0);
      }
      
      // 没有缓存，创建一个空的歌单文件
      console.log('⚠️ 创建空歌单文件，构建将继续');
      createEmptyPlaylist(playlistId);
      process.exit(0);
    }

    if (tracks.length === 0) {
      console.log('⚠️ 歌单为空');
      createEmptyPlaylist(playlistId);
      process.exit(0);
    }

    // 获取歌曲 ID 列表
    const songIds = tracks.map((track) => track.id);

    // 获取歌曲播放链接
    console.log('🔗 正在获取播放链接...');
    let urlMap;
    try {
      urlMap = await getSongUrls(songIds);
      console.log(`✅ 获取到 ${urlMap.size} 个播放链接`);
    } catch (error) {
      console.error(`❌ 获取播放链接失败: ${error.message}`);
      
      // 如果有缓存，使用缓存数据
      if (hasCache) {
        console.log('⚠️ 使用已缓存的歌单数据继续构建');
        process.exit(0);
      }
      
      // 没有缓存，创建一个空的歌单文件
      console.log('⚠️ 创建空歌单文件，构建将继续');
      createEmptyPlaylist(playlistId);
      process.exit(0);
    }

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

        // 将 HTTP URL 转换为 HTTPS，避免混合内容问题
        const httpsUrl = songUrl.replace(/^http:/, 'https:');
        const httpsCover = track.al.picUrl.replace(/^http:/, 'https:');

        return {
          id: `netease-${track.id}`,
          name: track.name,
          artist: artistNames,
          url: httpsUrl,
          cover: httpsCover,
          lrc: lyricMap.get(track.id),
          source: 'netease',
          neteaseId: track.id,
          duration: Math.floor(track.dt / 1000),
        };
      })
      .filter((song) => song !== null);

    console.log(`✅ 成功处理 ${songs.length}/${tracks.length} 首歌曲`);

    // 保存到静态文件
    savePlaylist(playlistId, songs);
    console.log('🎉 网易云歌单数据获取完成！');

  } catch (error) {
    console.error('❌ 获取失败:', error.message);
    
    // 如果有缓存，使用缓存数据
    if (hasCachedPlaylist()) {
      console.log('⚠️ 使用已缓存的歌单数据继续构建');
      process.exit(0);
    }
    
    // 没有缓存，创建一个空的歌单文件
    console.log('⚠️ 创建空歌单文件，构建将继续');
    createEmptyPlaylist('unknown');
    process.exit(0);
  }
}

/**
 * 保存歌单数据到文件
 * @param {string} playlistId 歌单 ID
 * @param {Array} songs 歌曲列表
 */
function savePlaylist(playlistId, songs) {
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
}

/**
 * 创建空歌单文件（降级方案）
 * @param {string} playlistId 歌单 ID
 */
function createEmptyPlaylist(playlistId) {
  const outputDir = path.join(process.cwd(), 'public', 'content');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'netease-playlist.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    playlistId,
    total: 0,
    songs: [],
  }, null, 2));

  console.log(`💾 空歌单文件已创建: ${outputPath}`);
}

// 执行主函数
main();
