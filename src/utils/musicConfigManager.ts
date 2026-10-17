/**
 * 音乐配置管理器
 *
 * 功能说明：
 * 1. 加载音乐配置文件（music.json）
 * 2. 验证配置格式是否正确
 * 3. 提供默认配置作为降级方案
 * 4. 使用 getAssetPath 处理所有资源路径，确保 GitHub Pages 兼容性
 * 5. 在线歌单优先，本地歌单仅作兜底
 *
 * 加载顺序：
 * - 在线歌单成功时只展示在线歌单，本地歌曲不会混入；
 * - 在线歌单失败/为空时才回退到本地歌单；
 * - 首次初始化会等待在线歌单结果，避免先把本地歌单当成网易云歌单展示；
 * - 管理器已初始化后的刷新在后台进行，不打断当前播放。
 *
 * @author 歆橙
 * @version 4.0
 * @date 2026-10-17
 */

import { getAssetPath } from '@/utils/assetUtils';
import type { MusicSource, ProcessedAudioItem } from '@/types/music';
import { neteasePlaylistService } from '@/services/neteasePlaylistService';

// 重新导出共享类型，保持向后兼容
export type { MusicSource, ProcessedAudioItem };

/**
 * 在线歌单失败时保留旧列表的最长时间
 *
 * Meting 返回的音频 URL 是临时签名地址（约 20 分钟有效），
 * 超过这个时间后旧列表基本无法播放，应清空并回退到本地歌单。
 */
const ONLINE_SONGS_MAX_STALE_MS = 15 * 60 * 1000;

/**
 * 同一个页面会话内在线歌单的复用时间
 *
 * 超过这个时间后再调用 loadOnlineProcessedAudioListAsync() 会重新请求，
 * 避免 SPA 长时间停留时列表永远不更新。手动刷新会忽略该 TTL。
 */
const ONLINE_SONGS_TTL_MS = 2 * 60 * 1000;

/**
 * AI 爬虫 User-Agent 关键词列表
 *
 * 说明：匹配列表中的任意一个关键词（不区分大小写），即可判定为 AI 爬虫。
 * 保留传统搜索引擎（Googlebot、Bingbot、Baiduspider、Sogou、360Spider 等），
 * 只屏蔽以下几类：
 * 1. AI 产品爬虫：Claude、GPT、Perplexity、字节跳动、华为等
 * 2. SEO 工具爬虫：Semrush、Ahrefs、Majestic 等
 * 3. 其他不想被爬取敏感数据的产品：Amazon、Apple 等
 *
 * 【注意】关键词必须全部小写：detectAiCrawler 会先把 UA 转小写再比较。
 * 之前 'claudeBot' 带大写 B，导致 Claude 爬虫实际上从未被拦截。
 */
const AI_CRAWLER_UA_KEYWORDS = [
  // AI 产品
  'claudebot',           // Anthropic Claude
  'anthropic',           // Anthropic 其他产品
  'gptbot',              // OpenAI GPT
  'chatgpt-user',        // ChatGPT 用户爬虫
  'perplexitybot',       // Perplexity AI
  'perplexity',          // Perplexity 其他
  'youbot',              // You.com
  'google-extended',     // Google AI (原 Bard)
  'bytespider',          // 字节跳动（抖音、飞书）
  'petalbot',            // 华为爬虫
  // SEO 工具爬虫
  'semrushbot',          // Semrush
  'semrush',             // Semrush 其他
  'ahrefsbot',           // Ahrefs
  'mj12bot',             // Majestic
  'rogerbot',            // Moz
  'seokicks',            // SEOkicks
  'serpstatbot',         // Serpstat
  'dotbot',              // Dotbot
  // 其他
  'amazonbot',           // Amazon
  'applebot',            // Apple
  'duckduckbot',         // DuckDuckGo
];

/**
 * 检测当前客户端是否为 AI 爬虫
 *
 * 仅在浏览器环境（typeof navigator !== 'undefined'）下有效。
 * 在服务端（SSR）或缺少 User-Agent 时返回 false（不拦截，让页面正常渲染）。
 *
 * 说明：该检测只能影响会执行 JS 的爬虫；不执行 JS 的爬虫本来也不会触发
 * 客户端的在线歌单请求，所以这里的作用是减少被无头浏览器抓取完整歌单。
 *
 * @returns 是否为 AI 爬虫
 */
function detectAiCrawler(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return AI_CRAWLER_UA_KEYWORDS.some(keyword => ua.includes(keyword));
}

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
 * 网易云音乐歌单源配置接口
 */
export interface NeteaseSourceConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 歌单 ID */
  playlistId: string;
  /** Meting API 地址（主 API） */
  api: string;
  /** 备用 Meting API 地址（主 API 失败时按顺序尝试） */
  fallbackApis?: string[];
  /** 描述信息 */
  description?: string;
}

/**
 * 音乐源配置接口
 */
export interface MusicSourcesConfig {
  /** 本地音乐源配置 */
  local: LocalSourceConfig;
  /** 网易云音乐歌单源配置 */
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
  /** 音频文件路径或 URL；本地音乐相对于 public 目录，网易云音乐为完整 URL */
  url: string;
  /** 封面图片路径或 URL，可选 */
  cover?: string;
  /** 歌词文件路径或 URL，可选 */
  lrc?: string;
  /** 音乐来源 */
  source?: MusicSource;
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
 * 默认音乐配置
 * 当配置文件加载失败或格式验证不通过时使用此配置
 * 确保播放器始终有可播放的内容
 *
 * 封面已统一转为 256×256 WebP（原图最大 5.9MB，实际只显示 48px）。
 */
const DEFAULT_MUSIC_CONFIG: MusicConfig = {
  version: "4.0",
  lastUpdated: "2026-10-17",
  description: "默认音乐配置（降级方案）",
  sources: {
    local: {
      enabled: true,
      description: "本地音乐文件"
    },
    netease: {
      enabled: true,
      playlistId: "14349636887",
      // qijieya 的 playlist 接口返回完整歌单；injahow 作为备用
      // （injahow 的 playlist 接口有服务端缓存，实测会少 5 首）
      api: "https://api.qijieya.cn/meting/",
      fallbackApis: ["https://api.injahow.cn/meting/"],
      description: "网易云音乐歌单（通过 Meting API 加载）"
    }
  },
  songs: [
    {
      id: "yiban-yiban",
      name: "一半一半",
      artist: "洛天依",
      url: "/music/一半一半 - 洛天依.mp3",
      cover: "/music/covers/一半一半 - 洛天依.webp",
      lrc: "/music/lyrics/一半一半 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "sanyue-yu",
      name: "三月雨",
      artist: "洛天依",
      url: "/music/三月雨 - 洛天依.mp3",
      cover: "/music/covers/三月雨 - 洛天依.webp",
      lrc: "/music/lyrics/三月雨 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "xiachong",
      name: "夏虫",
      artist: "洛天依",
      url: "/music/夏虫 - 洛天依.mp3",
      cover: "/music/covers/夏虫 - 洛天依.webp",
      lrc: "/music/lyrics/夏虫 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "tianxing-wen",
      name: "天星问",
      artist: "洛天依",
      url: "/music/天星问 - 洛天依.mp3",
      cover: "/music/covers/天星问 - 洛天依.webp",
      lrc: "/music/lyrics/天星问 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "liuguang",
      name: "流光 (Light Me Up)",
      artist: "洛天依",
      url: "/music/流光 (Light Me Up) - 洛天依.mp3",
      cover: "/music/covers/流光 (Light Me Up) - 洛天依.webp",
      lrc: "/music/lyrics/流光 (Light Me Up) - 洛天依.lrc",
      source: "local"
    },
    {
      id: "sha-a",
      name: "啥啊",
      artist: "洛天依",
      url: "/music/啥啊 - 洛天依.mp3",
      cover: "/music/covers/啥啊 - 洛天依.webp",
      lrc: "/music/lyrics/啥啊 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "yiyang-defengbao-zhongxin",
      name: "异样的风暴中心",
      artist: "洛天依",
      url: "/music/异样的风暴中心 - 洛天依.mp3",
      cover: "/music/covers/异样的风暴中心 - 洛天依.webp",
      lrc: "/music/lyrics/异样的风暴中心 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "gehang-sifang",
      name: "歌行四方",
      artist: "洛天依",
      url: "/music/歌行四方 - 洛天依.mp3",
      cover: "/music/covers/歌行四方 - 洛天依.webp",
      lrc: "/music/lyrics/歌行四方 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "hudie",
      name: "蝴蝶",
      artist: "洛天依",
      url: "/music/蝴蝶 - 洛天依.mp3",
      cover: "/music/covers/蝴蝶 - 洛天依.webp",
      lrc: "/music/lyrics/蝴蝶 - 洛天依.lrc",
      source: "local"
    },
    {
      id: "baishixi",
      name: "白石溪",
      artist: "洛天依、乐正绫",
      url: "/music/白石溪 - 洛天依、乐正绫.mp3",
      cover: "/music/covers/白石溪 - 洛天依、乐正绫.webp",
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

  if (s.source !== undefined && s.source !== 'local' && s.source !== 'netease') {
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
  // 判断是否为网易云音乐来源
  const isNetease = song.source === 'netease';

  const processedItem: ProcessedAudioItem = {
    name: song.name,
    artist: song.artist,
    // 本地音乐使用 getAssetPath 处理路径；网易云音乐已经是完整 URL，直接使用
    url: isNetease ? song.url : getAssetPath(song.url),
    source: song.source || 'local',
  };

  // 如果有封面图片，处理封面路径
  if (song.cover) {
    processedItem.cover = isNetease ? song.cover : getAssetPath(song.cover);
  }

  // 如果有歌词，处理歌词路径
  if (song.lrc) {
    processedItem.lrc = isNetease ? song.lrc : getAssetPath(song.lrc);
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

  /** 当前加载的配置（music.json，仅包含本地歌曲） */
  private config: MusicConfig | null = null;

  /** 本地歌曲（已处理为可直接播放的格式） */
  private localSongs: ProcessedAudioItem[] = [];

  /** 在线歌曲（网易云，已处理为可直接播放的格式） */
  private onlineSongs: ProcessedAudioItem[] = [];

  /** 在线歌曲最近一次成功加载的时间戳（用于判断旧列表是否还值得保留） */
  private onlineSongsCachedAt = 0;

  /** 本地配置是否已加载 */
  private isLoaded = false;

  /** 是否正在加载本地配置中（防止重复加载） */
  private isLoading = false;

  /** 本地配置加载 Promise 缓存，用于并发请求时复用 */
  private loadPromise: Promise<MusicConfig> | null = null;

  /** 在线歌单是否已尝试加载完成（失败时保持 false，便于后续重试） */
  private onlineLoaded = false;

  /** 在线歌单加载 Promise 缓存（防止并发重复请求） */
  private onlineLoadPromise: Promise<ProcessedAudioItem[]> | null = null;

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
   * 加载本地音乐配置文件
   * 从 /content/music.json 加载配置，验证格式并缓存
   *
   * 注意：本方法不再等待网易云歌单，避免第三方接口拖慢首屏。
   * 在线歌单请调用 loadOnlineProcessedAudioListAsync()。
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
   * 实际执行本地配置获取的方法
   * 支持客户端和服务端两种环境
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
          // 允许浏览器按 HTTP 缓存策略复用；静态文件部署时通常带 ETag/Last-Modified
          cache: 'default'
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
          this.applyLocalConfig(DEFAULT_MUSIC_CONFIG);
          return DEFAULT_MUSIC_CONFIG;
        }

        const fileContent = fs.readFileSync(configFilePath, 'utf-8');
        config = JSON.parse(fileContent);
      }

      // 验证配置格式
      if (!validateMusicConfig(config)) {
        console.warn('[MusicConfigManager] 配置格式验证失败，使用默认配置');
        this.applyLocalConfig(DEFAULT_MUSIC_CONFIG);
        return DEFAULT_MUSIC_CONFIG;
      }

      // 过滤出本地歌曲
      const localSongs = config.songs.filter(song => song.source === 'local' || !song.source);

      // 如果没有本地歌曲，使用默认配置中的本地歌曲
      config.songs = localSongs.length > 0
        ? [...localSongs]
        : [...DEFAULT_MUSIC_CONFIG.songs];

      this.applyLocalConfig(config);

      console.log(`[MusicConfigManager] 本地配置加载成功，共 ${this.localSongs.length} 首歌曲`);
      return config;
    } catch (error) {
      // 加载失败时使用默认配置作为降级方案
      console.error('[MusicConfigManager] 加载配置文件失败:', error);
      console.log('[MusicConfigManager] 使用默认配置作为降级方案');
      this.applyLocalConfig(DEFAULT_MUSIC_CONFIG);
      return DEFAULT_MUSIC_CONFIG;
    }
  }

  /**
   * 应用本地配置并生成处理后的本地歌曲列表
   */
  private applyLocalConfig(config: MusicConfig): void {
    this.config = config;
    this.localSongs = config.songs
      .filter(song => song.source === 'local' || !song.source)
      .map(processSongConfig);
    this.isLoaded = true;
  }

  /**
   * 加载在线歌单（网易云）
   *
   * 该方法与本地配置解耦。在线歌单成功时，它才是播放器的主列表；
   * 失败时才回退到本地歌单。
   *
   * @param options.forceRefresh 是否忽略所有缓存强制请求最新数据
   * @returns Promise<ProcessedAudioItem[]> 在线歌曲列表
   */
  public async loadOnlineProcessedAudioListAsync(
    options: { forceRefresh?: boolean } = {}
  ): Promise<ProcessedAudioItem[]> {
    const forceRefresh = options.forceRefresh === true;

    // 已经成功加载过且仍在复用期内，直接返回缓存
    if (
      !forceRefresh &&
      this.onlineLoaded &&
      this.onlineSongs.length > 0 &&
      Date.now() - this.onlineSongsCachedAt < ONLINE_SONGS_TTL_MS
    ) {
      return [...this.onlineSongs];
    }

    // 正在加载中：
    // - 普通调用复用同一个 Promise；
    // - 强制刷新则等当前请求结束后再发起一次，避免并发覆盖。
    if (this.onlineLoadPromise) {
      if (!forceRefresh) {
        return this.onlineLoadPromise;
      }
      try {
        await this.onlineLoadPromise;
      } catch {
        // 忽略上一次请求的错误，继续强制刷新
      }
    }

    this.onlineLoadPromise = this.fetchOnlineSongs(forceRefresh);

    try {
      return await this.onlineLoadPromise;
    } finally {
      this.onlineLoadPromise = null;
    }
  }

  /**
   * 实际加载在线歌单
   * @param forceRefresh 是否绕过网易云服务的内存/localStorage 缓存
   */
  private async fetchOnlineSongs(forceRefresh: boolean): Promise<ProcessedAudioItem[]> {
    if (typeof window === 'undefined') return [];

    const neteaseConfig = this.getConfig().sources?.netease;

    if (!neteaseConfig?.enabled) {
      this.onlineSongs = [];
      this.onlineSongsCachedAt = 0;
      this.onlineLoaded = true;
      return [];
    }

    // 【反爬防护】检测 AI 爬虫 User-Agent，对它们跳过网易云歌单加载
    // 保留传统搜索引擎（Googlebot、Bingbot 等），只屏蔽 AI 产品和 SEO 工具爬虫
    if (detectAiCrawler()) {
      console.log('[MusicConfigManager] 检测到 AI 爬虫 UA，跳过在线歌单加载');
      this.onlineSongs = [];
      this.onlineSongsCachedAt = 0;
      this.onlineLoaded = true;
      return [];
    }

    try {
      const neteaseResult = await neteasePlaylistService.loadPlaylist(
        neteaseConfig,
        { forceRefresh }
      );
      if (neteaseResult.success && neteaseResult.songs.length > 0) {
        this.onlineSongs = neteaseResult.songs;
        this.onlineSongsCachedAt = Date.now();
        this.onlineLoaded = true;
        console.log(`[MusicConfigManager] 已加载网易云歌单，共 ${neteaseResult.songs.length} 首歌曲`);
      } else {
        // 失败时保留已加载的在线歌单：
        // - 全页刷新时本来就没有旧数据，结果仍是空；
        // - 同一页面内从首页切回内容页时，避免列表闪回本地 10 首。
        // onlineLoaded 保持 false，允许用户点击重试或下次启用时再次加载。
        this.onlineLoaded = false;
        this.dropExpiredOnlineSongs();
        if (!neteaseResult.success) {
          console.warn('[MusicConfigManager] 网易云歌单加载失败:', neteaseResult.error);
        }
      }
    } catch (error) {
      this.onlineLoaded = false;
      this.dropExpiredOnlineSongs();
      console.warn('[MusicConfigManager] 加载网易云歌单时出错:', error);
    }

    return [...this.onlineSongs];
  }

  /**
   * 在线歌单加载失败时，根据缓存年龄决定是否丢弃旧列表
   *
   * - 15 分钟内：保留旧列表，避免同一页面内切页回来时列表闪回本地 10 首；
   * - 超过 15 分钟：签名 URL 基本失效，清空并回退到本地歌单。
   */
  private dropExpiredOnlineSongs(): void {
    if (this.onlineSongs.length === 0) return;
    if (Date.now() - this.onlineSongsCachedAt > ONLINE_SONGS_MAX_STALE_MS) {
      this.onlineSongs = [];
      this.onlineSongsCachedAt = 0;
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
   *
   * 规则：在线歌单可用时只返回在线歌单；在线歌单为空/加载失败时才返回本地歌单。
   * 本地歌单只作为兜底，不会混入网易云歌单。
   *
   * @returns ProcessedAudioItem[] 处理后的音频列表
   */
  public getProcessedAudioList(): ProcessedAudioItem[] {
    if (this.onlineSongs.length > 0) {
      return [...this.onlineSongs];
    }
    return [...this.localSongs];
  }

  /**
   * 获取本地音乐的处理后列表
   *
   * @returns ProcessedAudioItem[] 本地音乐列表
   */
  public getLocalProcessedAudioList(): ProcessedAudioItem[] {
    return [...this.localSongs];
  }

  /**
   * 获取在线音乐的处理后列表
   *
   * @returns ProcessedAudioItem[] 在线音乐列表
   */
  public getOnlineProcessedAudioList(): ProcessedAudioItem[] {
    return [...this.onlineSongs];
  }

  /**
   * 异步获取本地音乐列表（只等待 music.json，不等待在线歌单）
   *
   * @returns Promise<ProcessedAudioItem[]> 本地音乐列表
   */
  public async getLocalProcessedAudioListAsync(): Promise<ProcessedAudioItem[]> {
    await this.loadConfig();
    return this.getLocalProcessedAudioList();
  }

  /**
   * 异步获取音频列表（在线优先，失败时本地兜底）
   *
   * 注意：该方法会等待在线歌单结果（主 API + 备用 API 的超时时间）。
   * MusicPlayer 首次初始化使用它，避免先把本地歌单当成网易云歌单展示；
   * 已初始化后的刷新请直接调用 loadOnlineProcessedAudioListAsync()。
   *
   * @returns Promise<ProcessedAudioItem[]> 处理后的音频列表
   */
  public async getProcessedAudioListAsync(): Promise<ProcessedAudioItem[]> {
    await this.loadConfig();
    await this.loadOnlineProcessedAudioListAsync();
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
   * 获取歌曲总数（本地 + 已加载的在线歌曲）
   *
   * @returns number 歌曲总数
   */
  public getSongCount(): number {
    return this.getProcessedAudioList().length;
  }

  /**
   * 获取特定来源的歌曲数量
   *
   * @param source - 音乐源类型
   * @returns number 歌曲数量
   */
  public getSongCountBySource(source: MusicSource): number {
    if (source === 'local') return this.localSongs.length;
    return this.onlineSongs.length;
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
    this.localSongs = [];
    this.onlineSongs = [];
    this.onlineSongsCachedAt = 0;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.onlineLoaded = false;
    this.onlineLoadPromise = null;
    // 同时清空网易云歌单服务缓存，确保下次重新加载最新数据
    neteasePlaylistService.clearCache();
    console.log('[MusicConfigManager] 配置已重置');
  }
}

// 导出单例实例，方便直接使用
export const musicConfigManager = MusicConfigManager.getInstance();

// 导出类，允许需要时创建新实例（一般不需要）
export default MusicConfigManager;
