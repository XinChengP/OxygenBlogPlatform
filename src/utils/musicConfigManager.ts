/**
 * 音乐配置管理器
 * 
 * 功能说明：
 * 1. 加载音乐配置文件（music.json）
 * 2. 验证配置格式是否正确
 * 3. 提供默认配置作为降级方案
 * 4. 使用 getAssetPath 处理所有资源路径，确保 GitHub Pages 兼容性
 * 
 * @author 歆橙
 * @version 1.0
 * @date 2026-03-18
 */

import { getAssetPath } from '@/utils/assetUtils';

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
  /** 音频文件路径，相对于 public 目录 */
  url: string;
  /** 封面图片路径，可选，相对于 public 目录 */
  cover?: string;
  /** 歌词文件路径，可选，相对于 public 目录 */
  lrc?: string;
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
  /** 处理后的音频文件完整路径 */
  url: string;
  /** 处理后的封面图片完整路径（可选） */
  cover?: string;
  /** 处理后的歌词文件完整路径（可选） */
  lrc?: string;
}

/**
 * 默认音乐配置
 * 当配置文件加载失败或格式验证不通过时使用此配置
 * 确保播放器始终有可播放的内容
 */
const DEFAULT_MUSIC_CONFIG: MusicConfig = {
  version: "1.0",
  lastUpdated: "2026-03-18",
  description: "默认音乐配置（降级方案）",
  songs: [
    {
      id: "yiban-yiban",
      name: "一半一半",
      artist: "洛天依",
      url: "/music/一半一半 - 洛天依.mp3",
      cover: "/music/covers/一半一半 - 洛天依.jpg",
      lrc: "/music/lyrics/一半一半 - 洛天依.lrc"
    },
    {
      id: "sanyue-yu",
      name: "三月雨",
      artist: "洛天依",
      url: "/music/三月雨 - 洛天依.mp3",
      cover: "/music/covers/三月雨 - 洛天依.png",
      lrc: "/music/lyrics/三月雨 - 洛天依.lrc"
    },
    {
      id: "xiachong",
      name: "夏虫",
      artist: "洛天依",
      url: "/music/夏虫 - 洛天依.mp3",
      cover: "/music/covers/夏虫 - 洛天依.jpg",
      lrc: "/music/lyrics/夏虫 - 洛天依.lrc"
    },
    {
      id: "tianxing-wen",
      name: "天星问",
      artist: "洛天依",
      url: "/music/天星问 - 洛天依.mp3",
      cover: "/music/covers/天星问 - 洛天依.jpg",
      lrc: "/music/lyrics/天星问 - 洛天依.lrc"
    },
    {
      id: "liuguang",
      name: "流光 (Light Me Up)",
      artist: "洛天依",
      url: "/music/流光 (Light Me Up) - 洛天依.mp3",
      cover: "/music/covers/流光 (Light Me Up) - 洛天依.jpg",
      lrc: "/music/lyrics/流光 (Light Me Up) - 洛天依.lrc"
    },
    {
      id: "sha-a",
      name: "啥啊",
      artist: "洛天依",
      url: "/music/啥啊 - 洛天依.mp3",
      cover: "/music/covers/啥啊 - 洛天依.jpg",
      lrc: "/music/lyrics/啥啊 - 洛天依.lrc"
    },
    {
      id: "yiyang-defengbao-zhongxin",
      name: "异样的风暴中心",
      artist: "洛天依",
      url: "/music/异样的风暴中心 - 洛天依.mp3",
      cover: "/music/covers/异样的风暴中心 - 洛天依.jpg",
      lrc: "/music/lyrics/异样的风暴中心 - 洛天依.lrc"
    },
    {
      id: "gehang-sifang",
      name: "歌行四方",
      artist: "洛天依",
      url: "/music/歌行四方 - 洛天依.mp3",
      cover: "/music/covers/歌行四方 - 洛天依.jpg",
      lrc: "/music/lyrics/歌行四方 - 洛天依.lrc"
    },
    {
      id: "hudie",
      name: "蝴蝶",
      artist: "洛天依",
      url: "/music/蝴蝶 - 洛天依.mp3",
      cover: "/music/covers/蝴蝶 - 洛天依.jpg",
      lrc: "/music/lyrics/蝴蝶 - 洛天依.lrc"
    },
    {
      id: "baishixi",
      name: "白石溪",
      artist: "洛天依、乐正绫",
      url: "/music/白石溪 - 洛天依、乐正绫.mp3",
      cover: "/music/covers/白石溪 - 洛天依、乐正绫.png",
      lrc: "/music/lyrics/白石溪 - 洛天依、乐正绫.lrc"
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

  // 验证可选字段：如果存在，必须是字符串类型
  if (s.cover !== undefined && typeof s.cover !== 'string') {
    return false;
  }

  if (s.lrc !== undefined && typeof s.lrc !== 'string') {
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
    // 使用 getAssetPath 处理音频文件路径，确保 GitHub Pages 兼容性
    url: getAssetPath(song.url)
  };

  // 如果有封面图片，处理封面路径
  if (song.cover) {
    processedItem.cover = getAssetPath(song.cover);
  }

  // 如果有歌词文件，处理歌词路径
  if (song.lrc) {
    processedItem.lrc = getAssetPath(song.lrc);
  }

  return processedItem;
}

/**
 * 音乐配置管理器类
 * 单例模式，确保全局只有一个配置管理器实例
 * 提供配置加载、验证和处理功能
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
   * 
   * @returns Promise<MusicConfig> 配置对象
   */
  private async fetchConfig(): Promise<MusicConfig> {
    try {
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

        const config = await response.json();
        
        // 验证配置格式
        if (validateMusicConfig(config)) {
          this.config = config;
          this.isLoaded = true;
          console.log(`[MusicConfigManager] 配置加载成功，共 ${config.songs.length} 首歌曲`);
          return config;
        } else {
          console.warn('[MusicConfigManager] 配置格式验证失败，使用默认配置');
          this.config = DEFAULT_MUSIC_CONFIG;
          this.isLoaded = true;
          return DEFAULT_MUSIC_CONFIG;
        }
      } else {
        // 在服务端环境中，使用文件系统读取
        // 从 public 目录读取配置文件（与客户端保持一致）
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
        const config = JSON.parse(fileContent);

        // 验证配置格式
        if (validateMusicConfig(config)) {
          this.config = config;
          this.isLoaded = true;
          console.log(`[MusicConfigManager] 服务端配置加载成功，共 ${config.songs.length} 首歌曲`);
          return config;
        } else {
          console.warn('[MusicConfigManager] 配置格式验证失败，使用默认配置');
          this.config = DEFAULT_MUSIC_CONFIG;
          this.isLoaded = true;
          return DEFAULT_MUSIC_CONFIG;
        }
      }
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
   * 获取歌曲总数
   * 
   * @returns number 歌曲总数
   */
  public getSongCount(): number {
    const config = this.getConfig();
    return config.songs.length;
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
   * 重置配置管理器
   * 清除缓存的配置，下次调用时会重新加载
   * 用于配置更新后刷新
   */
  public reset(): void {
    this.config = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    console.log('[MusicConfigManager] 配置已重置');
  }
}

// 导出单例实例，方便直接使用
export const musicConfigManager = MusicConfigManager.getInstance();

// 导出类，允许需要时创建新实例（一般不需要）
export default MusicConfigManager;
