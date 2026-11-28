/**
 * 猜歌本地成绩存储
 *
 * 猜歌暂不做云端排行榜，成绩只落在当前浏览器：
 * - 全局 bestCorrect / bestScore / games（兼容旧数据）
 * - modes：按玩法分别记录最佳与局数，菜单上显示「本模式最佳」
 * - lastRunNames：上一局出现过的歌名，在线曲库足够大时下一局优先避开
 *
 * 所有读写都包 try/catch：隐私模式、存储配额满、旧版本脏数据
 * 都不应该让游戏本身打不开。
 */

import {
  DEFAULT_GUESS_MODE,
  GUESS_MODES,
  type GuessMode,
} from './songBank';

const VALID_MODES = new Set<string>(GUESS_MODES.map((mode) => mode.id));

export interface GuessModeStats {
  bestCorrect: number;
  bestScore: number;
  games: number;
}

export interface GuessSongStats {
  bestCorrect: number;
  bestScore: number;
  games: number;
  lastRunNames: string[];
  modes: Record<string, GuessModeStats>;
}

export interface SaveGuessSongResultInput {
  mode: GuessMode;
  correct: number;
  score: number;
  total: number;
  answerNames: string[];
}

const STORAGE_KEY = 'guess-song:stats:v1';

const EMPTY_STATS: GuessSongStats = {
  bestCorrect: 0,
  bestScore: 0,
  games: 0,
  lastRunNames: [],
  modes: {},
};

const EMPTY_MODE_STATS: GuessModeStats = {
  bestCorrect: 0,
  bestScore: 0,
  games: 0,
};

/** 把任意值收敛成非负整数，避免 localStorage 里的脏数据把 UI 算崩 */
function toSafeInt(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(Math.floor(value), max);
}

function emptyStats(): GuessSongStats {
  return { ...EMPTY_STATS, modes: {} };
}

export function readGuessSongStats(): GuessSongStats {
  if (typeof window === 'undefined') {
    return emptyStats();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStats();
    }

    const parsed = JSON.parse(raw) as Partial<GuessSongStats> | null;
    if (!parsed || typeof parsed !== 'object') {
      return emptyStats();
    }

    const modes: Record<string, GuessModeStats> = {};
    if (parsed.modes && typeof parsed.modes === 'object') {
      for (const [key, value] of Object.entries(parsed.modes)) {
        if (!VALID_MODES.has(key)) continue;
        if (!value || typeof value !== 'object') continue;
        const modeValue = value as Partial<GuessModeStats>;
        modes[key] = {
          bestCorrect: toSafeInt(modeValue.bestCorrect, 20),
          bestScore: toSafeInt(modeValue.bestScore, 2000),
          games: toSafeInt(modeValue.games),
        };
      }
    }

    return {
      // 单局最多 10 题，留一点余量即可，避免旧数据无限膨胀
      bestCorrect: toSafeInt(parsed.bestCorrect, 20),
      bestScore: toSafeInt(parsed.bestScore, 2000),
      games: toSafeInt(parsed.games),
      lastRunNames: Array.isArray(parsed.lastRunNames)
        ? parsed.lastRunNames
            .filter((name): name is string => typeof name === 'string')
            .slice(0, 20)
        : [],
      modes,
    };
  } catch {
    return emptyStats();
  }
}

export function getModeStats(
  stats: GuessSongStats,
  mode: GuessMode
): GuessModeStats {
  return stats.modes[mode] ?? EMPTY_MODE_STATS;
}

export function saveGuessSongResult(
  input: SaveGuessSongResultInput
): { stats: GuessSongStats; isNewBest: boolean } {
  const previous = readGuessSongStats();
  const total = Math.max(1, input.total);
  const correct = Math.min(Math.max(0, Math.floor(input.correct)), total);
  const score = Math.max(0, Math.floor(input.score));
  // 旧版本/HMR 可能传进 undefined，统一落到默认模式，避免出现 modes.undefined
  const mode: GuessMode = VALID_MODES.has(input.mode)
    ? input.mode
    : DEFAULT_GUESS_MODE;
  const previousMode = getModeStats(previous, mode);

  const isNewBest =
    (previousMode.games === 0 && correct > 0) ||
    correct > previousMode.bestCorrect ||
    (correct > 0 &&
      correct === previousMode.bestCorrect &&
      score > previousMode.bestScore);

  const stats: GuessSongStats = {
    bestCorrect: Math.max(previous.bestCorrect, correct),
    bestScore: Math.max(previous.bestScore, score),
    games: previous.games + 1,
    lastRunNames: input.answerNames
      .filter(
        (name): name is string => typeof name === 'string' && name.length > 0
      )
      .slice(0, 20),
    modes: {
      ...previous.modes,
      [mode]: {
        bestCorrect: Math.max(previousMode.bestCorrect, correct),
        bestScore: Math.max(previousMode.bestScore, score),
        games: previousMode.games + 1,
      },
    },
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // 存储不可用时只影响「下次还记得」，本次结算照常展示
    }
  }

  return { stats, isNewBest };
}
