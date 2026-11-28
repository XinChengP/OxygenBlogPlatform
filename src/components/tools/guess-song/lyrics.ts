/**
 * 歌词模式的数据准备
 *
 * 本地歌曲的 lrc 是 public/music/lyrics/*.lrc，
 * 在线歌曲的 lrc 是 Meting 的 type=lrc 接口（CORS 允许 *）。
 * 这里统一 fetch + parse，并把"没有合适歌词"的题退回音频题，
 * 避免歌词接口不稳定时整个模式开不了。
 */

import { getAssetPath } from '@/utils/assetUtils';
import { parseLrc } from '@/utils/lrcParser';
import { createAudioPrompt, type GuessQuestion } from './songBank';

/** 单首歌词请求超时；超时就退回音频题 */
const LYRIC_TIMEOUT_MS = 6000;

/** 同一 URL 的歌词只抓一次，跨局复用 */
const lyricCache = new Map<string, string[]>();

/** 去掉空格、标点、符号，用于判断歌词里是否直接出现了歌名 */
function normalizeForCompare(text: string): string {
  return text
    .replace(/[\s\p{P}\p{S}]/gu, '')
    .toLowerCase();
}

/** 元数据行（作词/作曲等）不适合当题干 */
const METADATA_LINE_REGEX =
  /^(作词|作曲|编曲|混音|调校|调教|演唱|原唱|出品|策划|曲绘|PV|母带|吉他|和声|制作人)\s*[:：]/i;

/**
 * 从歌词里挑一句适合出题的：
 * - 至少 6 个字符，过滤纯标点和空行
 * - 不含歌名，否则等于直接送答案
 * - 优先取中段（更像主歌/副歌），避开开头报幕和结尾淡出
 */
export function pickLyricLine(
  lines: readonly string[],
  songTitle: string
): string | null {
  const titleNorm = normalizeForCompare(songTitle);
  const usable = lines
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 6) return false;
      if (METADATA_LINE_REGEX.test(line)) return false;
      const lineNorm = normalizeForCompare(line);
      if (titleNorm.length >= 2 && lineNorm.includes(titleNorm)) return false;
      return true;
    });

  if (usable.length === 0) return null;

  const start = Math.floor(usable.length * 0.15);
  const end = Math.max(start + 1, Math.floor(usable.length * 0.85));
  const pool = usable.slice(start, end);

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

async function fetchLyricLines(url: string): Promise<string[]> {
  const resolvedUrl = new URL(
    getAssetPath(url),
    window.location.href
  ).href;

  const cached = lyricCache.get(resolvedUrl);
  if (cached) return cached;

  try {
    const response = await fetch(resolvedUrl, {
      cache: 'force-cache',
      signal: AbortSignal.timeout(LYRIC_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const lines = parseLrc(text)
      .map((line) => line.text.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error('empty_lyrics');
    }

    lyricCache.set(resolvedUrl, lines);
    return lines;
  } catch (error) {
    // 失败不缓存，下次进游戏可以重试
    lyricCache.delete(resolvedUrl);
    throw error;
  }
}

/**
 * 把 buildQuestions 生成的歌词占位题干补成真实歌词。
 * 任何一首失败都回退成音频题，保证一局 10 题都能玩。
 */
export async function hydrateLyricPrompts(
  questions: readonly GuessQuestion[]
): Promise<GuessQuestion[]> {
  return Promise.all(
    questions.map(async (question) => {
      if (question.prompt.type !== 'lyrics') {
        return question;
      }

      if (!question.answer.lrc) {
        return { ...question, prompt: createAudioPrompt(false) };
      }

      try {
        const lines = await fetchLyricLines(question.answer.lrc);
        const line = pickLyricLine(lines, question.answer.name);
        if (!line) {
          return { ...question, prompt: createAudioPrompt(false) };
        }
        return { ...question, prompt: { type: 'lyrics', line } };
      } catch {
        return { ...question, prompt: createAudioPrompt(false) };
      }
    })
  );
}
