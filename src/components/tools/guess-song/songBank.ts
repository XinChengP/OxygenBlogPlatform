/**
 * 猜歌曲库与出题逻辑
 *
 * 曲库来源复用站内音乐播放器：
 * - 在线歌单（Meting）能拿到约 800+ 首，但音频 URL 约 20 分钟后失效
 * - 本地 public/music 固定 10 首，断网时仍可玩
 *
 * 这里只做纯数据整理，不碰 DOM / 音频 / 网络，方便单测和排查问题。
 */

import type { ProcessedAudioItem } from '@/types/music';

/** 一局题目数量；曲库不足时会自动缩减 */
export const QUESTIONS_PER_GAME = 10;

/** 每题选项数量（1 个正确 + 3 个干扰） */
export const OPTIONS_PER_QUESTION = 4;

/** 每题播放片段长度（秒） */
export const SNIPPET_SECONDS = 5;

/** 四种玩法：经典听歌、前奏、歌词、综合 */
export type GuessMode = 'classic' | 'intro' | 'lyrics' | 'mixed';

export interface GuessSong {
  name: string;
  artist: string;
  url: string;
  cover?: string;
  lrc?: string;
}

/** 题目提示：音频片段 / 歌词 */
export type GuessPrompt =
  | { type: 'audio'; startRatio: number; seconds: number }
  | { type: 'lyrics'; line: string };

export interface GuessQuestion {
  /** 正确答案 */
  answer: GuessSong;
  /** 4 个选项（已洗牌） */
  options: string[];
  /** 本题以什么形式出题 */
  prompt: GuessPrompt;
}

export interface GuessModeConfig {
  id: GuessMode;
  label: string;
  description: string;
  icon: string;
  rules: readonly string[];
}

export const GUESS_MODES: readonly GuessModeConfig[] = [
  {
    id: 'classic',
    label: '经典听歌',
    description: '听 5 秒副歌片段，猜出这首歌',
    icon: '🎧',
    rules: ['10 题一局', '副歌 5 秒', '4 选 1', '不限时'],
  },
  {
    id: 'intro',
    label: '前奏挑战',
    description: '只听开头 5 秒，还能认出来吗',
    icon: '⏮️',
    rules: ['10 题一局', '前奏 5 秒', '4 选 1', '不限时'],
  },
  {
    id: 'lyrics',
    label: '歌词猜歌',
    description: '看一句随机歌词，猜出这首歌',
    icon: '📝',
    rules: ['10 题一局', '看歌词', '4 选 1', '不限时'],
  },
  {
    id: 'mixed',
    label: '综合挑战',
    description: '听歌、歌词随机出题',
    icon: '🎲',
    rules: ['10 题一局', '随机题型', '4 选 1', '不限时'],
  },
];

export const DEFAULT_GUESS_MODE: GuessMode = 'classic';

export function getGuessModeConfig(mode: GuessMode): GuessModeConfig {
  return GUESS_MODES.find((item) => item.id === mode) ?? GUESS_MODES[0];
}

export interface GuessRank {
  title: string;
  comment: string;
  emoji: string;
}

/** Fisher-Yates 洗牌，返回新数组，不改动入参 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 创建音频题提示：intro 从 0 秒开始，其余从 25%–50% 处开始 */
export function createAudioPrompt(
  intro = false,
  seconds = SNIPPET_SECONDS
): GuessPrompt {
  return {
    type: 'audio',
    // 前奏模式从 0 开始；普通模式避开前奏，落在主歌/副歌附近
    startRatio: intro ? 0 : 0.25 + Math.random() * 0.25,
    seconds,
  };
}

/** 在线歌单里会混入占位曲目，猜歌没有任何意义，直接剔除 */
const IGNORED_TITLE_PATTERNS: readonly RegExp[] = [
  /^xxx/i,
  /^test$/i,
  /^demo$/i,
  /^未知/,
];

/**
 * 过滤不可播放项并按歌名去重。
 *
 * 在线歌单里可能混有空 URL、占位曲目、重复版本；
 * 猜歌只显示歌名，同名歌曲无法区分，直接保留第一条。
 */
export function normalizeSongBank(
  items: readonly ProcessedAudioItem[]
): GuessSong[] {
  const seen = new Set<string>();
  const bank: GuessSong[] = [];

  for (const item of items) {
    const name = item.name?.trim();
    const url = item.url?.trim();
    if (!name || !url) continue;
    if (IGNORED_TITLE_PATTERNS.some((pattern) => pattern.test(name))) continue;
    if (seen.has(name)) continue;

    seen.add(name);
    bank.push({
      name,
      artist: item.artist?.trim() || '洛天依',
      url,
      cover: item.cover?.trim() || undefined,
      lrc: item.lrc?.trim() || undefined,
    });
  }

  return bank;
}

export interface BuildQuestionsOptions {
  avoidNames?: readonly string[];
  count?: number;
  mode?: GuessMode;
}

/**
 * 生成一局题目。
 *
 * 歌词模式只生成占位题干，真正的歌词由 hydrateLyricPrompts 异步补齐；
 * 补齐失败的题会退回音频题，保证游戏一定能开。
 */
export function buildQuestions(
  bank: readonly GuessSong[],
  options: BuildQuestionsOptions = {}
): GuessQuestion[] {
  const mode = options.mode ?? DEFAULT_GUESS_MODE;

  // 歌词模式优先使用有歌词的歌，素材不足时退回完整曲库
  let sourceBank = bank;
  if (mode === 'lyrics') {
    const withLrc = bank.filter((song) => Boolean(song.lrc));
    if (withLrc.length >= OPTIONS_PER_QUESTION) sourceBank = withLrc;
  }

  if (sourceBank.length < OPTIONS_PER_QUESTION) {
    return [];
  }

  const count = Math.min(options.count ?? QUESTIONS_PER_GAME, sourceBank.length);
  const avoid = new Set(options.avoidNames ?? []);

  // 只有避开之后仍够出题才真正避开，否则忽略上一局记录
  let pool = sourceBank.filter((song) => !avoid.has(song.name));
  if (pool.length < count) {
    pool = [...sourceBank];
  }

  const answers = shuffle(pool).slice(0, count);
  const allNames = sourceBank.map((song) => song.name);

  return answers.map((answer) => {
    const distractorPool = allNames.filter((name) => name !== answer.name);
    const distractors = shuffle(distractorPool).slice(0, OPTIONS_PER_QUESTION - 1);

    let prompt: GuessPrompt;
    if (mode === 'lyrics') {
      prompt = { type: 'lyrics', line: '' };
    } else if (mode === 'intro') {
      prompt = createAudioPrompt(true);
    } else if (mode === 'mixed') {
      prompt = createMixedPrompt();
    } else {
      prompt = createAudioPrompt(false);
    }

    return {
      answer,
      options: shuffle([answer.name, ...distractors]),
      prompt,
    };
  });
}

/** 综合模式：音频 / 歌词各占一部分 */
function createMixedPrompt(): GuessPrompt {
  return Math.random() < 0.5
    ? { type: 'lyrics', line: '' }
    : createAudioPrompt(false);
}

/** 结算评级：按答对比例给称号，题库不足 10 题时也不会误判 */
export function getRankTitle(correct: number, total: number): GuessRank {
  const ratio = total > 0 ? correct / total : 0;

  if (total > 0 && correct === total) {
    return {
      title: '天依本依',
      comment: '这题库怕不是你出的吧',
      emoji: '🏆',
    };
  }
  if (ratio >= 0.8) {
    return {
      title: '资深锦依卫',
      comment: '平时没少单曲循环',
      emoji: '🎵',
    };
  }
  if (ratio >= 0.6) {
    return {
      title: '曲库常客',
      comment: '一半是熟悉的味道',
      emoji: '🎧',
    };
  }
  if (ratio >= 0.3) {
    return {
      title: '路人听众',
      comment: '有几首确实耳熟',
      emoji: '🌱',
    };
  }
  return {
    title: '下次一定',
    comment: '天依说她不认识你（bushi）',
    emoji: '🍊',
  };
}
