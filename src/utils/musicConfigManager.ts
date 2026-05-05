/**
 * 音乐配置管理器
 * 
 * 功能说明：
 * 1. 加载音乐配置文件（music.json）
 * 2. 支持本地音乐和网易云歌单混合模式
 * 3. 验证配置格式是否正确
 * 4. 提供默认配置作为降级方案
 * 5. 使用 getAssetPath 处理所有资源路径，确保 GitHub Pages 兼容性
 * 
 * @author 歆橙
 * @version 2.0
 * @date 2026-05-05
 */

import { getAssetPath } from '@/utils/assetUtils';
import { neteaseMusicApi, ConvertedNeteaseSong } from '@/services/neteaseMusicApi';

/**
 * 音乐来源类型
 */
export type MusicSource = 'local' | 'netease';

/**
 * 本地音乐源配置接口
 */
export interface LocalSourceConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 描述信息 */
  description: string;
}

/**
 * 网易云音乐源配置接口
 */
export interface NeteaseSourceConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 描述信息 */
  description: string;
  /** API 基础 URL */
  apiBaseUrl: string;
  /** 歌单 ID */
  playlistId: string;
  /** 获取歌曲数量限制 */
  limit: number;
}

/**
 * 音乐源配置接口
 */
export interface MusicSourcesConfig {
  /** 本地音乐源配置 */
  local: LocalSourceConfig;
  /** 网易云音乐源配置 */
  netease: NeteaseSourceConfig;
}

/**
 * 单首歌曲的配置接口
 * 定义了歌曲的所有必要属性
 */
export interface SongConfig {
  /** 唯一标识符，用于歌曲识别 */
  id: string;
  /** 歌曲名称，显示在播放器中 */
  name: string;
  /** 歌手名称，支持多位歌手（如"洛天依、乐正绫"） */
  artist: string;
  /** 音频文件路径，相对于 public 目录（本地音乐）或直接 URL（网易云） */
  url: string;
  /** 封面图片路径，可选，相对于 public 目录或直接 URL */
  cover?: string;
  /** 歌词文件路径，可选，相对于 public 目录或歌词内容 */
  lrc?: string;
  /** 音乐来源 */
  source?: MusicSource;
  /** 网易云歌曲 ID（仅网易云音乐使用） */
  neteaseId?: number;
  /** 歌曲时长（秒，仅网易云音乐使用） */
  duration?: number;
}

/**
 * 音乐配置文件的完整结构接口
 * 包含版本信息、更新时间和歌曲列表
 */
export interface MusicConfig {
  /** 配置文件版本号，用于后续升级兼容 */
  version: string;
  /** 配置文件最后更新日期 */
  lastUpdated: string;
  /** 配置文件描述信息 */
  description?: string;
  /** 音乐源配置 */
  sources?: MusicSourcesConfig;
  /** 歌曲列表数组 */
  songs: SongConfig[];
}

/**
 * 处理后的音频项接口
 * 用于 APlayer 播放器，所有路径已通过 getAssetPath 处理
 */
export interface ProcessedAudioItem {
  /** 歌曲名称 */
  name: string;
  /** 歌手名称 */
  artist: string;
  /** 处理后的音频文件完整路径或 URL */
  url: string;
  /** 处理后的封面图片完整路径或 URL（可选） */
  cover?: string;
  /** 处理后的歌词文件完整路径或歌词内容（可选） */
  lrc?: string;
  /** 音乐来源 */
  source?: MusicSource;
  /** 网易云歌曲 ID（仅网易云音乐使用） */
  neteaseId?: number;
}

/**
 * 默认音乐配置
 * 当配置文件加载失败或格式验证不通过时使用此配置
 * 确保播放器始终有可播放的内容
 */
const DEFAULT_MUSIC_CONFIG: MusicConfig = {
  version: "2.0",
  lastUpdated: "2026-05-05",
  description: "默认音乐配置（降级方案）",
  sources: {
    local: {
      enabled: true,
      description: "本地音乐文件"
    },
    netease: {
      enabled: false,
      description: "网易云音乐歌单",
      apiBaseUrl: "https://api.toolkal.com",
      playlistId: "",
      limit: 100
    }
  },
  songs: [
    {
      id: "yiban-yiban",
      name: "一半一半",
      artist: "洛天依",
      url: "/music/一半一半 - 洛天依.mp3",
      cover: "/music/covers/一半一半 - 洛天依.jpg",
      lrc: "/music/lyrics/一半一半 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "sanyue-yu",
      name: "三月雨",
      artist: "洛天依",
      url: "/music/三月雨 - 洛天依.mp3",
      cover: "/music/covers/三月雨 - 洛天依.png",
      lrc: "/music/lyrics/三月雨 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "xiachong",
      name: "夏虫",
      artist: "洛天依",
      url: "/music/夏虫 - 洛天依.mp3",
      cover: "/music/covers/夏虫 - 洛天依.jpg",
      lrc: "/music/lyrics/夏虫 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "tianxing-wen",
      name: "天星问",
      artist: "洛天依",
      url: "/music/天星问 - 洛天依.mp3",
      cover: "/music/covers/天星问 - 洛天依.jpg",
      lrc: "/music/lyrics/天星问 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "liuguang",
      name: "流光 (Light Me Up)",
      artist: "洛天依",
      url: "/music/流光 (Light Me Up) - 洛天依.mp3",
      cover: "/music/covers/流光 (Light Me Up) - 洛天依.jpg",
      lrc: "/music/lyrics/流光 (Light Me Up) - 洛天依.lrc",
      source: "local"
    },
    {
      id: "sha-a",
      name: "啥啊",
      artist: "洛天依",
      url: "/music/啥啊 - 洛天依.mp3",
      cover: "/music/covers/啥啊 - 洛天依.jpg",
      lrc: "/music/lyrics/啥啊 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "yiyang-defengbao-zhongxin",
      name: "异样的风暴中心",
      artist: "洛天依",
      url: "/music/异样的风暴中心 - 洛天依.mp3",
      cover: "/music/covers/异样的风暴中心 - 洛天依.jpg",
      lrc: "/music/lyrics/异样的风暴中心 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "gehang-sifang",
      name: "歌行四方",
      artist: "洛天依",
      url: "/music/歌行四方 - 洛天依.mp3",
      cover: "/music/covers/歌行四方 - 洛天依.jpg",
      lrc: "/music/lyrics/歌行四方 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "hudie",
      name: "蝴蝶",
      artist: "洛天依",
      url: "/music/蝴蝶 - 洛天依.mp3",
      cover: "/music/covers/蝴蝶 - 洛天依.jpg",
      lrc: "/music/lyrics/蝴蝶 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "baishixi",
      name: "白石溪",
      artist: "洛天依、乐正绫",
      url: "/music/白石溪 - 洛天依、乐正绫.mp3",
      cover: "/music/covers/白石溪 - 洛天依、乐正绫.png",
      lrc: "/music/lyrics/白石溪 - 洛天依、乐正绫.lrc",
      source: "local"
    }
  ]
};

/**
 * 验证歌曲配置是否有效
 * 检查必需字段是否存在且类型正确
 * 
 * @param song - 待验证的歌曲配置对象
 * @returns 如果配置有效返回 true，否则返回 false
 */
function validateSongConfig(song: unknown): song is SongConfig {
  // 检查 song 是否为对象
  if (typeof song !== 'object' || song === null) {
    return false;
  }

  const s = song as Record<string, unknown>;

  // 验证必需字段：id、name、artist、url 都必须是字符串
  if (
    typeof s.id !== 'string' || s.id.trim() === '' ||
    typeof s.name !== 'string' || s.name.trim() === '' ||
    typeof s.artist !== 'string' || s.artist.trim() === '' ||
    typeof s.url !== 'string' || s.url.trim() === ''
  ) {
    return false;
  }

  // 验证可选字段：如果存在，必须是正确的类型
  if (s.cover !== undefined && typeof s.cover !== 'string') {
    return false;
  }

  if (s.lrc !== undefined && typeof s.lrc !== 'string') {
    return false;
  }

  if (s.source !== undefined && !['local', 'netease'].includes(s.source as string)) {
    return false;
  }

  if (s.neteaseId !== undefined && typeof s.neteaseId !== 'number') {
    return false;
  }

  if (s.duration !== undefined && typeof s.duration !== 'number') {
    return false;
  }

  return true;
}

/**
 * 验证完整的音乐配置文件格式
 * 检查配置结构是否正确，所有必需字段是否存在
 * 
 * @param config - 待验证的配置对象
 * @returns 如果配置格式有效返回 true，否则返回 false
 */
function validateMusicConfig(config: unknown): config is MusicConfig {
  // 检查 config 是否为对象
  if (typeof config !== 'object' || config === null) {
    console.warn('[MusicConfigManager] 配置不是有效的对象');
    return false;
  }

  const c = config as Record<string, unknown>;

  // 验证 version 字段
  if (typeof c.version !== 'string' || c.version.trim() === '') {
    console.warn('[MusicConfigManager] 缺少有效的 version 字段');
    return false;
  }

  // 验证 lastUpdated 字段
  if (typeof c.lastUpdated !== 'string' || c.lastUpdated.trim() === '') {
    console.warn('[MusicConfigManager] 缺少有效的 lastUpdated 字段');
    return false;
  }

  // 验证 songs 字段：必须是数组
  if (!Array.isArray(c.songs)) {
    console.warn('[MusicConfigManager] songs 字段不是数组');
    return false;
  }

  // 验证数组不为空
  if (c.songs.length === 0) {
    console.warn('[MusicConfigManager] songs 数组为空');
    return false;
  }

  // 验证每首歌曲的配置
  for (let i = 0; i < c.songs.length; i++) {
    if (!validateSongConfig(c.songs[i])) {
      console.warn(`[MusicConfigManager] 第 ${i + 1} 首歌曲配置无效`);
      return false;
    }
  }

  return true;
}

/**
 * 处理单个歌曲配置，转换所有资源路径
 * 使用 getAssetPath 确保路径在 GitHub Pages 环境下正确
 * 
 * @param song - 原始歌曲配置
 * @returns 处理后的音频项，所有路径已转换
 */
function processSongConfig(song: SongConfig): ProcessedAudioItem {
  const processedItem: ProcessedAudioItem = {
    name: song.name,
    artist: song.artist,
    // 本地音乐使用 getAssetPath 处理路径，网易云音乐直接使用 URL
    url: song.source === 'netease' ? song.url : getAssetPath(song.url),
    source: song.source || 'local',
  };

  // 如果有封面图片，处理封面路径
  if (song.cover) {
    processedItem.cover = song.source === 'netease' 
      ? song.cover 
      : getAssetPath(song.cover);
  }

  // 如果有歌词，处理歌词
  if (song.lrc) {
    // 网易云音乐的歌词是内容字符串，本地音乐是文件路径
    processedItem.lrc = song.lrc;
  }

  // 如果是网易云音乐，保存歌曲 ID
  if (song.neteaseId) {
    processedItem.neteaseId = song.neteaseId;
  }

  return processedItem;
}

/**
 * 将网易云歌曲转换为标准 SongConfig 格式
 * @param neteaseSong 转换后的网易云歌曲
 * @returns 标准 SongConfig 格式
 */
function convertNeteaseSongToConfig(neteaseSong: ConvertedNeteaseSong): SongConfig {
  return {
    id: neteaseSong.id,
    name: neteaseSong.name,
    artist: neteaseSong.artist,
    url: neteaseSong.url,
    cover: neteaseSong.cover,
    lrc: neteaseSong.lrc,
    source: 'netease',
    neteaseId: neteaseSong.neteaseId,
    duration: neteaseSong.duration,
  };
}

/**
 * 音乐配置管理器类
 * 单例模式，确保全局只有一个配置管理器实例
 * 提供配置加载、验证和处理功能
 * 支持本地音乐和网易云歌单混合模式
 */
class MusicConfigManager {
  /** 单例实例 */
  private static instance: MusicConfigManager;
  
  /** 当前加载的配置 */
  private config: MusicConfig | null = null;
  
  /** 配置是否已加载 */
  private isLoaded = false;
  
  /** 是否正在加载中（防止重复加载） */
  private isLoading = false;
  
  /** 加载 Promise 缓存，用于并发请求时复用 */
  private loadPromise: Promise<MusicConfig> | null = null;

  /** 网易云歌曲缓存 */
  private neteaseSongsCache: SongConfig[] | null = null;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {}

  /**
   * 获取单例实例
   * @returns MusicConfigManager 的唯一实例
   */
  public static getInstance(): MusicConfigManager {
    if (!MusicConfigManager.instance) {
      MusicConfigManager.instance = new MusicConfigManager();
    }
    return MusicConfigManager.instance;
  }

  /**
   * 加载音乐配置文件
   * 从 /content/music.json 加载配置，验证格式并缓存
   * 如果启用了网易云歌单，会同时加载网易云歌曲
   * 
   * @returns Promise<MusicConfig> 加载完成的配置对象
   */
  public async loadConfig(): Promise<MusicConfig> {
    // 如果已经加载完成，直接返回缓存的配置
    if (this.isLoaded && this.config) {
      return this.config;
    }

    // 如果正在加载中，返回现有的 Promise，避免重复请求
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // 标记为加载中
    this.isLoading = true;

    // 创建加载 Promise
    this.loadPromise = this.fetchConfig();

    try {
      const config = await this.loadPromise;
      return config;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 实际执行配置获取的方法
   * 支持客户端和服务端两种环境
   * 支持混合加载本地音乐和网易云歌单
   * 
   * @returns Promise<MusicConfig> 配置对象
   */
  private async fetchConfig(): Promise<MusicConfig> {
    try {
      let config: MusicConfig;

      // 在客户端环境中，使用 fetch 从静态资源路径获取
      if (typeof window !== 'undefined') {
        // 使用 getAssetPath 处理配置文件路径，确保 GitHub Pages 兼容性
        const configPath = getAssetPath('/content/music.json');
        
        const response = await fetch(configPath, {
          // 使用 cache: 'no-store' 确保获取最新配置
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP 错误: ${response.status}`);
        }

        config = await response.json();
      } else {
        // 在服务端环境中，使用文件系统读取
        const fs = await import('fs');
        const path = await import('path');
        
        // 服务端从 public 目录读取配置文件
        const configFilePath = path.join(process.cwd(), 'public', 'content', 'music.json');
        
        // 检查文件是否存在
        if (!fs.existsSync(configFilePath)) {
          console.warn('[MusicConfigManager] 配置文件不存在，使用默认配置');
          this.config = DEFAULT_MUSIC_CONFIG;
          this.isLoaded = true;
          return DEFAULT_MUSIC_CONFIG;
        }

        const fileContent = fs.readFileSync(configFilePath, 'utf-8');
        config = JSON.parse(fileContent);
      }

      // 验证配置格式
      if (!validateMusicConfig(config)) {
        console.warn('[MusicConfigManager] 配置格式验证失败，使用默认配置');
        this.config = DEFAULT_MUSIC_CONFIG;
        this.isLoaded = true;
        return DEFAULT_MUSIC_CONFIG;
      }

      // 处理音乐源加载逻辑
      // 策略：优先加载网易云音乐，如果失败则降级到本地音乐
      if (typeof window !== 'undefined') {
        const neteaseConfig = config.sources?.netease;
        const localConfig = config.sources?.local;
        
        // 获取本地歌曲列表（默认隐藏，作为备用）
        const localSongs = config.songs.filter(song => song.source === 'local');
        
        // 标记是否成功加载了网络音乐
        let neteaseLoaded = false;
        
        // 如果启用了网易云，尝试加载
        if (neteaseConfig?.enabled && neteaseConfig.playlistId) {
          try {
            console.log('[MusicConfigManager] 正在加载网易云歌单...');
            
            // 首先尝试从预获取的静态文件加载（生产环境）
            const staticNeteaseSongs = await this.loadStaticNeteasePlaylist();
            if (staticNeteaseSongs && staticNeteaseSongs.length > 0) {
              this.neteaseSongsCache = staticNeteaseSongs;
              config.songs = [...this.neteaseSongsCache];
              neteaseLoaded = true;
              console.log(`[MusicConfigManager] 从静态文件加载了 ${staticNeteaseSongs.length} 首网易云歌曲`);
            } else {
              // 静态文件不存在或为空，尝试实时获取（开发环境）
              console.log('[MusicConfigManager] 静态文件不存在，尝试实时获取...');
              
              // 设置 API 基础 URL
              neteaseMusicApi.setConfig({ baseUrl: neteaseConfig.apiBaseUrl });
              
              // 先测试 API 连接
              const isConnected = await neteaseMusicApi.testConnection();
              if (!isConnected) {
                console.warn('[MusicConfigManager] 无法连接到网易云 API 服务');
              } else {
                // 获取网易云歌曲
                const neteaseSongs = await neteaseMusicApi.getFullPlaylistSongs(
                  neteaseConfig.playlistId,
                  neteaseConfig.limit
                );

                if (neteaseSongs.length > 0) {
                  // 转换为标准格式并缓存
                  this.neteaseSongsCache = neteaseSongs.map(convertNeteaseSongToConfig);
                  
                  // 只使用网易云歌曲（本地音乐默认隐藏）
                  config.songs = [...this.neteaseSongsCache];
                  neteaseLoaded = true;

                  console.log(`[MusicConfigManager] 成功加载 ${this.neteaseSongsCache.length} 首网易云歌曲`);
                } else {
                  console.warn('[MusicConfigManager] 网易云歌单为空');
                }
              }
            }
          } catch (error) {
            console.error('[MusicConfigManager] 加载网易云歌单失败:', error);
          }
        }
        
        // 如果网易云音乐加载失败且启用了本地音乐，则降级到本地音乐
        if (!neteaseLoaded && localConfig?.enabled && localSongs.length > 0) {
          console.log('[MusicConfigManager] 网易云音乐加载失败，降级到本地音乐');
          config.songs = [...localSongs];
        }
        
        // 如果两者都未加载成功，使用默认配置
        if (config.songs.length === 0) {
          console.warn('[MusicConfigManager] 没有可用的音乐源，使用默认配置');
          config.songs = [...DEFAULT_MUSIC_CONFIG.songs];
        }
      }

      this.config = config;
      this.isLoaded = true;
      console.log(`[MusicConfigManager] 配置加载成功，共 ${config.songs.length} 首歌曲`);
      return config;
    } catch (error) {
      // 加载失败时使用默认配置作为降级方案
      console.error('[MusicConfigManager] 加载配置文件失败:', error);
      console.log('[MusicConfigManager] 使用默认配置作为降级方案');
      this.config = DEFAULT_MUSIC_CONFIG;
      this.isLoaded = true;
      return DEFAULT_MUSIC_CONFIG;
    }
  }

  /**
   * 同步获取已加载的配置
   * 如果配置未加载，返回默认配置
   * 
   * @returns MusicConfig 配置对象
   */
  public getConfig(): MusicConfig {
    if (this.config) {
      return this.config;
    }
    return DEFAULT_MUSIC_CONFIG;
  }

  /**
   * 从静态文件加载网易云歌单
   * 用于生产环境，避免跨域问题
   * 
   * @returns Promise<SongConfig[] | null> 歌曲列表，如果文件不存在返回 null
   */
  private async loadStaticNeteasePlaylist(): Promise<SongConfig[] | null> {
    try {
      const response = await fetch(getAssetPath('/content/netease-playlist.json'), {
        cache: 'no-store',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (!data.songs || !Array.isArray(data.songs) || data.songs.length === 0) {
        return null;
      }

      // 验证并转换歌曲格式
      const songs: SongConfig[] = data.songs
        .filter((song: unknown) => this.isValidNeteaseSong(song))
        .map((song: ConvertedNeteaseSong) => ({
          id: song.id,
          name: song.name,
          artist: song.artist,
          url: song.url,
          cover: song.cover,
          lrc: song.lrc,
          source: 'netease' as const,
          neteaseId: song.neteaseId,
          duration: song.duration,
        }));

      return songs;
    } catch (error) {
      console.warn('[MusicConfigManager] 加载静态网易云歌单失败:', error);
      return null;
    }
  }

  /**
   * 验证网易云歌曲格式是否有效
   * 
   * @param song - 待验证的歌曲对象
   * @returns boolean 是否有效
   */
  private isValidNeteaseSong(song: unknown): song is ConvertedNeteaseSong {
    if (typeof song !== 'object' || song === null) {
      return false;
    }

    const s = song as Record<string, unknown>;

    return (
      typeof s.id === 'string' &&
      typeof s.name === 'string' &&
      typeof s.artist === 'string' &&
      typeof s.url === 'string' &&
      typeof s.cover === 'string' &&
      s.source === 'netease' &&
      typeof s.neteaseId === 'number'
    );
  }

  /**
   * 获取处理后的音频列表
   * 所有资源路径已通过 getAssetPath 处理，可直接用于 APlayer
   * 
   * @returns ProcessedAudioItem[] 处理后的音频列表
   */
  public getProcessedAudioList(): ProcessedAudioItem[] {
    const config = this.getConfig();
    return config.songs.map(song => processSongConfig(song));
  }

  /**
   * 异步获取处理后的音频列表
   * 先确保配置已加载，再返回处理后的列表
   * 
   * @returns Promise<ProcessedAudioItem[]> 处理后的音频列表
   */
  public async getProcessedAudioListAsync(): Promise<ProcessedAudioItem[]> {
    await this.loadConfig();
    return this.getProcessedAudioList();
  }

  /**
   * 根据 ID 获取歌曲配置
   * 
   * @param id - 歌曲唯一标识符
   * @returns SongConfig | undefined 歌曲配置，如果未找到返回 undefined
   */
  public getSongById(id: string): SongConfig | undefined {
    const config = this.getConfig();
    return config.songs.find(song => song.id === id);
  }

  /**
   * 根据名称搜索歌曲
   * 支持模糊匹配，返回所有名称包含搜索词的歌曲
   * 
   * @param name - 搜索的歌曲名称
   * @returns SongConfig[] 匹配的歌曲列表
   */
  public searchSongsByName(name: string): SongConfig[] {
    const config = this.getConfig();
    const lowerName = name.toLowerCase();
    return config.songs.filter(song => 
      song.name.toLowerCase().includes(lowerName)
    );
  }

  /**
   * 根据歌手筛选歌曲
   * 支持模糊匹配，返回所有歌手名包含搜索词的歌曲
   * 
   * @param artist - 搜索的歌手名称
   * @returns SongConfig[] 匹配的歌曲列表
   */
  public filterSongsByArtist(artist: string): SongConfig[] {
    const config = this.getConfig();
    const lowerArtist = artist.toLowerCase();
    return config.songs.filter(song => 
      song.artist.toLowerCase().includes(lowerArtist)
    );
  }

  /**
   * 根据音乐源筛选歌曲
   * 
   * @param source - 音乐源类型
   * @returns SongConfig[] 匹配的歌曲列表
   */
  public filterSongsBySource(source: MusicSource): SongConfig[] {
    const config = this.getConfig();
    return config.songs.filter(song => song.source === source);
  }

  /**
   * 获取歌曲总数
   * 
   * @returns number 歌曲总数
   */
  public getSongCount(): number {
    const config = this.getConfig();
    return config.songs.length;
  }

  /**
   * 获取特定来源的歌曲数量
   * 
   * @param source - 音乐源类型
   * @returns number 歌曲数量
   */
  public getSongCountBySource(source: MusicSource): number {
    return this.filterSongsBySource(source).length;
  }

  /**
   * 检查配置是否已加载
   * 
   * @returns boolean 是否已加载
   */
  public isConfigLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * 检查网易云歌单是否已启用
   * 
   * @returns boolean 是否启用
   */
  public isNeteaseEnabled(): boolean {
    const config = this.getConfig();
    return config.sources?.netease?.enabled ?? false;
  }

  /**
   * 获取网易云歌单配置
   * 
   * @returns NeteaseSourceConfig | undefined 网易云配置
   */
  public getNeteaseConfig(): NeteaseSourceConfig | undefined {
    const config = this.getConfig();
    return config.sources?.netease;
  }

  /**
   * 重置配置管理器
   * 清除缓存的配置，下次调用时会重新加载
   * 用于配置更新后刷新
   */
  public reset(): void {
    this.config = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.neteaseSongsCache = null;
    console.log('[MusicConfigManager] 配置已重置');
  }

  /**
   * 刷新网易云歌单
   * 清除缓存并重新加载网易云歌曲
   * 
   * @returns Promise<boolean> 是否刷新成功
   */
  public async refreshNeteasePlaylist(): Promise<boolean> {
    const config = this.getConfig();
    
    if (!config.sources?.netease?.enabled || !config.sources.netease.playlistId) {
      console.warn('[MusicConfigManager] 网易云歌单未启用或未配置');
      return false;
    }

    try {
      const neteaseConfig = config.sources.netease;
      
      // 设置 API 基础 URL
      neteaseMusicApi.setConfig({ baseUrl: neteaseConfig.apiBaseUrl });
      
      // 获取网易云歌曲
      const neteaseSongs = await neteaseMusicApi.getFullPlaylistSongs(
        neteaseConfig.playlistId,
        neteaseConfig.limit
      );

      // 转换为标准格式并缓存
      this.neteaseSongsCache = neteaseSongs.map(convertNeteaseSongToConfig);

      // 合并本地歌曲和网易云歌曲
      const localSongs = config.songs.filter(song => song.source === 'local');
      config.songs = [...localSongs, ...this.neteaseSongsCache];

      console.log(`[MusicConfigManager] 成功刷新网易云歌单，共 ${this.neteaseSongsCache.length} 首歌曲`);
      return true;
    } catch (error) {
      console.error('[MusicConfigManager] 刷新网易云歌单失败:', error);
      return false;
    }
  }
}

// 导出单例实例，方便直接使用
export const musicConfigManager = MusicConfigManager.getInstance();

// 导出类，允许需要时创建新实例（一般不需要）
export default MusicConfigManager;
