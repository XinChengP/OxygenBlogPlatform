'use client';

/**
 * 天依猜歌
 *
 * 一局 10 题，每题播放 5 秒片段，从 4 个歌名里选正确答案。
 * 休闲模式：不限时、可重复播放，选完手动进入下一题。
 *
 * 曲库与音频策略见 ./guess-song/songBank.ts 与 ./guess-song/useSnippetPlayer.ts。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Disc3,
  Loader2,
  Music2,
  Play,
  Quote,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { musicConfigManager } from '@/utils/musicConfigManager';
import { cn } from '@/utils/cn';
import {
  MOTION_DISTANCE,
  MOTION_DURATION,
  MOTION_EASE,
} from '@/utils/motion';
import live2dMessageManager from '@/utils/live2dMessageManager';
import {
  GuessSongMessages,
  getRandomMessage,
  renderMessageTemplate,
  type MessageConfig,
} from '@/setting/live2dMessages';
import {
  SnippetPlaybackError,
  useSnippetPlayer,
} from './guess-song/useSnippetPlayer';
import {
  buildQuestions,
  createAudioPrompt,
  DEFAULT_GUESS_MODE,
  getGuessModeConfig,
  getRankTitle,
  GUESS_MODES,
  normalizeSongBank,
  OPTIONS_PER_QUESTION,
  QUESTIONS_PER_GAME,
  shuffle,
  type GuessMode,
  type GuessQuestion,
  type GuessSong,
  type GuessPrompt,
} from './guess-song/songBank';
import { hydrateLyricPrompts } from './guess-song/lyrics';
import {
  getModeStats,
  readGuessSongStats,
  saveGuessSongResult,
  type GuessSongStats,
} from './guess-song/storage';

type Phase = 'menu' | 'playing' | 'result';
type BankStatus = 'loading' | 'ready' | 'unavailable';
type LocalBankStatus = 'loading' | 'ready' | 'error';

/** 跳过本题用的哨兵值：不等于任何一个选项，但仍会进入「已揭晓」状态 */
const SKIPPED = '__skipped__';

const PANEL_MOTION = {
  initial: { opacity: 0, y: MOTION_DISTANCE },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -MOTION_DISTANCE },
  transition: { duration: MOTION_DURATION, ease: MOTION_EASE },
};

/** 左侧提示文案：跟着题型变化 */
function getPromptHint(prompt: GuessPrompt): string {
  if (prompt.type === 'audio') {
    return prompt.startRatio === 0
      ? `听开头 ${prompt.seconds} 秒，可以反复播放`
      : `听 ${prompt.seconds} 秒片段，可以反复播放`;
  }
  return '看这句歌词，猜出歌名';
}

/** 游戏面板：比通用 glass-card 更实一点，保证压在天空插画上的可读性 */
const CARD_CLASS =
  'relative isolate overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/90 backdrop-blur-xl dark:border-white/10';

const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7ad6ff] via-[#5cc2f5] to-[#38a9e6] px-6 py-2.5 text-sm font-semibold text-[#0b2b3c] shadow-[0_10px_24px_-12px_rgba(51,170,221,0.9)] transition hover:brightness-105 hover:shadow-[0_14px_30px_-12px_rgba(51,170,221,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-none disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none';

const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-card/60 px-6 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/15 dark:bg-white/5';

const FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** 卡片顶部的一层天依蓝光晕，给玻璃面板一点纵深 */
function CardGlow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(102,204,255,0.2),transparent_70%)]"
    />
  );
}

/** 黑胶唱片：播放时旋转，答完题后露出封面 */
function VinylDisc({
  playing,
  revealed,
  cover,
}: {
  playing: boolean;
  revealed: boolean;
  cover?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-28 w-28 sm:h-40 sm:w-40" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
      <motion.div
        className="absolute inset-0 rounded-full shadow-2xl ring-1 ring-white/10"
        style={{
          background:
            'radial-gradient(circle at 35% 30%, #475569 0%, #1e293b 45%, #0f172a 100%)',
        }}
        animate={
          playing && !reduceMotion ? { rotate: 360 } : { rotate: 0 }
        }
        transition={
          playing && !reduceMotion
            ? { duration: 6, repeat: Infinity, ease: 'linear' }
            : { duration: 0.3 }
        }
      >
        <span className="absolute inset-3 rounded-full border border-white/5" />
        <span className="absolute inset-7 rounded-full border border-white/5" />
        <span className="absolute inset-11 rounded-full border border-white/5" />

        <div className="absolute inset-[29%] flex items-center justify-center overflow-hidden rounded-full border-2 border-white/10 bg-primary/15">
          <Disc3 className="h-8 w-8 text-primary" />
          {revealed && cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
        </div>

        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background ring-2 ring-black/20" />
      </motion.div>
    </div>
  );
}

/** 歌词题：把一句歌词做成题面 */
function LyricPrompt({ line }: { line: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.06] p-3">
      <Quote className="h-5 w-5 text-primary/60" aria-hidden="true" />
      <p className="line-clamp-5 font-heading text-sm italic leading-relaxed text-foreground sm:text-base">
        {line}
      </p>
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Lyrics
      </span>
    </div>
  );
}

/** 封面题：答题前高斯模糊，揭晓后还原 */
/** 播放时的均衡器动画 */
function Equalizer({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const bars = [0.55, 0.9, 0.7, 1, 0.5];

  return (
    <div className="flex h-8 items-end justify-center gap-1" aria-hidden="true">
      {bars.map((height, index) => (
        <motion.span
          key={index}
          className="w-1.5 origin-bottom rounded-full bg-primary"
          style={{ height: `${height * 100}%` }}
          animate={
            active && !reduceMotion
              ? { scaleY: [0.35, 1, 0.55, 0.85, 0.35] }
              : { scaleY: 0.35 }
          }
          transition={
            active && !reduceMotion
              ? {
                  duration: 0.9 + index * 0.08,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.07,
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
}

/** 顶部进度点：当前题加宽，答对绿、答错红 */
function ProgressDots({
  total,
  current,
  answers,
}: {
  total: number;
  current: number;
  answers: boolean[];
}) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => {
        const state =
          index === current
            ? 'current'
            : answers[index] === true
              ? 'correct'
              : answers[index] === false
                ? 'wrong'
                : 'pending';

        return (
          <span
            key={index}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              state === 'current' && 'w-6 bg-primary',
              state === 'correct' && 'w-2 bg-emerald-400',
              state === 'wrong' && 'w-2 bg-rose-400',
              state === 'pending' && 'w-2 bg-border'
            )}
          />
        );
      })}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-center">
      <div className="text-lg font-bold leading-tight text-foreground tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default function GuessSongGame() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [localBank, setLocalBank] = useState<GuessSong[]>([]);
  const [localStatus, setLocalStatus] = useState<LocalBankStatus>('loading');
  const [onlineBank, setOnlineBank] = useState<GuessSong[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<BankStatus>('loading');

  const [questions, setQuestions] = useState<GuessQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [stats, setStats] = useState<GuessSongStats>(() => readGuessSongStats());
  const [isNewBest, setIsNewBest] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mode, setMode] = useState<GuessMode>(DEFAULT_GUESS_MODE);
  const [isPreparing, setIsPreparing] = useState(false);

  const modeConfig = getGuessModeConfig(mode);
  const modeStats = getModeStats(stats, mode);

  const startTokenRef = useRef(0);
  const preparingRef = useRef(false);

  const lastRefreshAtRef = useRef(0);
  // 音频刷新是异步的：完成时用户可能已经作答或进入下一题，用 ref 读取最新状态
  const indexRef = useRef(index);
  const selectedRef = useRef(selected);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  /*
    三个阶段（开始/答题/结算）内容高度不同。
    用 ResizeObserver 量内容高度，把外层容器的高度做成可过渡的数值，
    切换时就不会"啪"地一下跳高跳矮；卡片阴影挪到外层，避免被裁切。
  */
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = cardContentRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (typeof next === 'number' && next > 0) {
        setCardHeight(Math.round(next));
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const {
    status: snippetStatus,
    progress,
    error: snippetError,
    play,
    stop,
    clearError,
  } = useSnippetPlayer();

  /** 读本地 10 首 + 拉在线歌单；两边并行，本地先就绪就能先开玩 */
  const loadBanks = useCallback(async () => {
    setLocalStatus('loading');
    setOnlineStatus('loading');

    const localPromise = musicConfigManager
      .getLocalProcessedAudioListAsync()
      .then((songs) => normalizeSongBank(songs))
      .catch(() => [] as GuessSong[]);

    const onlinePromise = musicConfigManager
      .loadOnlineProcessedAudioListAsync({ forceRefresh: true })
      .then((songs) => normalizeSongBank(songs))
      .catch(() => [] as GuessSong[]);

    const local = await localPromise;
    setLocalBank(local);
    setLocalStatus(
      local.length >= OPTIONS_PER_QUESTION ? 'ready' : 'error'
    );

    const online = await onlinePromise;
    setOnlineBank(online);
    setOnlineStatus(
      online.length >= OPTIONS_PER_QUESTION ? 'ready' : 'unavailable'
    );
  }, []);

  useEffect(() => {
    void loadBanks();
  }, [loadBanks]);

  const notifyTianyi = useCallback(
    (config: MessageConfig, data: Record<string, string> = {}) => {
      const text = renderMessageTemplate(getRandomMessage(config), data);
      live2dMessageManager.showMessage(text, config.duration, config.priority);
    },
    []
  );

  const onlineReady = onlineStatus === 'ready' && onlineBank.length >= OPTIONS_PER_QUESTION;
  const localReady = localStatus === 'ready' && localBank.length >= OPTIONS_PER_QUESTION;
  const canStart = onlineReady || localReady;

  const startGame = useCallback(
    async (useLocal: boolean) => {
      if (preparingRef.current) return;

      const bank = useLocal ? localBank : onlineBank;
      if (bank.length < OPTIONS_PER_QUESTION) {
        setNotice('曲库还没准备好，稍等一下再试～');
        return;
      }

      // 直接读一次最新存储，避免「刚玩完立刻再来一局」时 state 还没刷新
      const latestStats = readGuessSongStats();
      let nextQuestions = buildQuestions(bank, {
        avoidNames: latestStats.lastRunNames,
        mode,
      });

      if (nextQuestions.length === 0) {
        setNotice('曲库里的歌不够出题，换一套曲库试试～');
        return;
      }

      // 歌词/综合模式要先把歌词抓回来；失败的题会自动退回音频题
      if (mode === 'lyrics' || mode === 'mixed') {
        const token = ++startTokenRef.current;
        preparingRef.current = true;
        setIsPreparing(true);
        setNotice('正在准备歌词…');

        try {
          nextQuestions = await hydrateLyricPrompts(nextQuestions);
        } catch {
          // 极端情况下保留占位题，下面会按音频题处理
        } finally {
          preparingRef.current = false;
          if (startTokenRef.current === token) {
            setIsPreparing(false);
          }
        }

        if (startTokenRef.current !== token) {
          return;
        }
      }

      stop();
      clearError();
      setStats(latestStats);
      setQuestions(nextQuestions);
      setIndex(0);
      setAnswers([]);
      setSelected(null);
      indexRef.current = 0;
      selectedRef.current = null;
      setIsNewBest(false);
      setNotice(null);
      setPhase('playing');

      notifyTianyi(GuessSongMessages.START, { mode: modeConfig.label });
    },
    [
      localBank,
      onlineBank,
      mode,
      modeConfig.label,
      stop,
      clearError,
      notifyTianyi,
    ]
  );

  const currentQuestion = questions[index] as GuessQuestion | undefined;

  /**
   * 在线音频失效：先节流刷新一次歌单，把整局题目的签名 URL 都换新；
   * 刷新不到同一首时，换一首本局没出现过的歌，保证还能继续玩。
   */
  const handleAudioFailure = useCallback(
    async (question: GuessQuestion) => {
      if (selected !== null) {
        setNotice('这首音频暂时播不了，直接选一个答案或跳过这题吧～');
        return;
      }
      if (isRefreshing) return;

      let refreshed: GuessSong[] = [];
      const now = Date.now();

      if (now - lastRefreshAtRef.current >= 60_000) {
        lastRefreshAtRef.current = now;
        setIsRefreshing(true);
        setNotice('在线音频失效了，正在刷新曲库…');

        try {
          refreshed = normalizeSongBank(
            await musicConfigManager.loadOnlineProcessedAudioListAsync({
              forceRefresh: true,
            })
          );
        } catch {
          refreshed = [];
        } finally {
          setIsRefreshing(false);
        }

        if (refreshed.length >= OPTIONS_PER_QUESTION) {
          setOnlineBank(refreshed);
          setOnlineStatus('ready');

          // 整局都换成新签名 URL，避免后面每首歌都失败一次
          setQuestions((previous) =>
            previous.map((item) => {
              const fresh = refreshed.find(
                (song) => song.name === item.answer.name
              );
              return fresh ? { ...item, answer: fresh } : item;
            })
          );

          // 刷新期间用户可能已经作答或进入下一题，此时只保留新 URL，不再打扰
          if (indexRef.current !== index || selectedRef.current !== null) {
            return;
          }

          if (refreshed.some((song) => song.name === question.answer.name)) {
            setNotice('曲库已刷新，再点一次播放试试～');
            return;
          }
        }
      }

      if (indexRef.current !== index || selectedRef.current !== null) {
        return;
      }

      // 刷新失败或刷新后仍然没有这首：从可用曲库里换一首没出现过的歌
      const byName = new Map<string, GuessSong>();
      for (const song of [...refreshed, ...onlineBank, ...localBank]) {
        if (!byName.has(song.name)) {
          byName.set(song.name, song);
        }
      }

      const usedNames = new Set(questions.map((item) => item.answer.name));
      const pool = [...byName.values()];
      const replacement = shuffle(
        pool.filter((song) => !usedNames.has(song.name))
      )[0];

      if (!replacement) {
        setNotice('这首音频暂时播不了，直接选一个答案或跳过这题吧～');
        return;
      }

      const allNames = pool.map((song) => song.name);
      const distractors = shuffle(
        allNames.filter((name) => name !== replacement.name)
      ).slice(0, OPTIONS_PER_QUESTION - 1);

      if (distractors.length < OPTIONS_PER_QUESTION - 1) {
        setNotice('这首音频暂时播不了，直接选一个答案或跳过这题吧～');
        return;
      }

      const replacementQuestion: GuessQuestion = {
        answer: replacement,
        options: shuffle([replacement.name, ...distractors]),
        prompt: createAudioPrompt(false),
      };

      setQuestions((previous) =>
        previous.map((item, i) => (i === index ? replacementQuestion : item))
      );
      setNotice('这首歌的音频失效了，已为你换了一首，重新播放试试～');
    },
    [
      selected,
      isRefreshing,
      questions,
      index,
      onlineBank,
      localBank,
    ]
  );

  const handlePlay = useCallback(async () => {
    if (
      !currentQuestion ||
      currentQuestion.prompt.type !== 'audio' ||
      isRefreshing
    ) {
      return;
    }

    const prompt = currentQuestion.prompt;
    setNotice(null);
    try {
      await play(currentQuestion.answer, prompt.startRatio, prompt.seconds);
    } catch (error) {
      // 浏览器自动播放策略拦截时刷新曲库没有意义，直接让用户再点一次
      if (error instanceof SnippetPlaybackError && error.reason === 'blocked') {
        return;
      }
      await handleAudioFailure(currentQuestion);
    }
  }, [currentQuestion, isRefreshing, play, handleAudioFailure]);

  const handleSelect = useCallback(
    (option: string) => {
      if (selected !== null || !currentQuestion) return;

      const correct = option === currentQuestion.answer.name;

      stop();
      clearError();
      setNotice(null);
      setSelected(option);
      selectedRef.current = option;
      setAnswers((previous) => {
        const next = [...previous];
        next[index] = correct;
        return next;
      });

      if (correct) {
        notifyTianyi(GuessSongMessages.CORRECT, {
          song: currentQuestion.answer.name,
        });
      } else {
        notifyTianyi(GuessSongMessages.WRONG, {
          song: currentQuestion.answer.name,
        });
      }
    },
    [selected, currentQuestion, stop, clearError, index, notifyTianyi]
  );

  const handleSkip = useCallback(() => {
    if (selected !== null || !currentQuestion) return;

    stop();
    clearError();
    setNotice(null);
    setSelected(SKIPPED);
    selectedRef.current = SKIPPED;
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = false;
      return next;
    });

    notifyTianyi(GuessSongMessages.WRONG, {
      song: currentQuestion.answer.name,
    });
  }, [selected, currentQuestion, stop, clearError, index, notifyTianyi]);

  const handleNext = useCallback(() => {
    stop();
    clearError();
    setNotice(null);

    if (index + 1 >= questions.length) {
      const total = questions.length;
      const correct = answers.filter(Boolean).length;
      const score = correct * 100;
      const result = saveGuessSongResult({
        mode,
        correct,
        score,
        total,
        answerNames: questions.map((question) => question.answer.name),
      });

      setStats(result.stats);
      setIsNewBest(result.isNewBest);
      setPhase('result');

      notifyTianyi(GuessSongMessages.FINISH, {
        correct: String(correct),
        total: String(total),
        score: String(score),
      });
      return;
    }

    const nextIndex = index + 1;
    setIndex(nextIndex);
    indexRef.current = nextIndex;
    setSelected(null);
    selectedRef.current = null;
  }, [
    index,
    questions,
    answers,
    mode,
    stop,
    clearError,
    notifyTianyi,
  ]);

  const handleRestart = useCallback(() => {
    void startGame(onlineStatus !== 'ready');
  }, [startGame, onlineStatus]);

  /** 回到菜单换模式；同时让正在进行的歌词准备失效 */
  const handleChangeMode = useCallback(() => {
    startTokenRef.current += 1;
    preparingRef.current = false;
    setIsPreparing(false);
    setNotice(null);
    setPhase('menu');
  }, []);

  const answeredCorrectCount = useMemo(
    () => answers.filter(Boolean).length,
    [answers]
  );

  const totalQuestions = questions.length;
  const rank = useMemo(
    () => getRankTitle(answeredCorrectCount, totalQuestions),
    [answeredCorrectCount, totalQuestions]
  );

  const startLabel = onlineReady
    ? '开始游戏'
    : localReady
      ? onlineStatus === 'loading'
        ? '先用本地 10 首开玩'
        : '开始游戏（本地曲库）'
      : '曲库准备中…';

  const bankMessage = onlineReady
    ? `在线曲库已就绪 · ${onlineBank.length} 首`
    : localReady
      ? onlineStatus === 'loading'
        ? '在线曲库加载中，可先用本地曲库开玩'
        : `在线曲库不可用，本局使用本地曲库 · ${localBank.length} 首`
      : onlineStatus === 'loading'
        ? '曲库加载中…'
        : '曲库加载失败，请重试';

  const bankTone = onlineReady
    ? 'bg-emerald-400'
    : localReady
      ? 'bg-amber-400'
      : 'bg-rose-400';

  return (
    <div
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[1.75rem] shadow-[0_24px_70px_-30px_rgba(15,40,90,0.45)] transition-[height] duration-300 ease-out dark:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.65)]"
      style={{ height: cardHeight != null ? `${cardHeight}px` : undefined }}
    >
      <div ref={cardContentRef}>
        <AnimatePresence mode="popLayout" initial={false}>
        {phase === 'menu' && (
          <motion.div
            key="menu"
            {...PANEL_MOTION}
            className={`${CARD_CLASS} p-6 sm:p-8`}
          >
            <CardGlow />
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
              <div className="shrink-0">
                <VinylDisc playing={false} revealed={false} />
              </div>

              <div className="flex w-full flex-1 flex-col items-center sm:items-start">
                <span className="hidden items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary sm:inline-flex">
                  <Music2 className="h-3 w-3" aria-hidden="true" />
                  Tianyi Music Quiz
                </span>

                <h2 className="mt-0 font-heading text-2xl font-bold text-foreground sm:mt-2 sm:text-3xl">
                  选一种玩法，猜歌名
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  听副歌、听前奏、看歌词，或者来一局随机综合挑战。
                </p>

                <div className="mt-4 w-full">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      选择模式
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {modeConfig.rules.slice(0, 2).join(' · ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {GUESS_MODES.map((item) => {
                      const active = item.id === mode;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setMode(item.id)}
                          disabled={isPreparing}
                          aria-pressed={active}
                          className={cn(
                            'relative flex items-start gap-2 rounded-xl border p-2.5 text-left transition',
                            FOCUS_RING_CLASS,
                            active
                              ? 'border-primary/60 bg-primary/10 shadow-[0_8px_24px_-18px_rgba(51,170,221,0.8)]'
                              : 'border-border/60 bg-card/55 hover:border-primary/30 hover:bg-primary/5'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm',
                              active ? 'bg-primary/20' : 'bg-primary/10'
                            )}
                            aria-hidden="true"
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0 pr-2">
                            <span className="block text-xs font-semibold text-foreground">
                              {item.label}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                          {active && (
                            <Check
                              className="absolute right-2 top-2 h-3.5 w-3.5 text-primary"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {modeConfig.rules.map((rule) => (
                    <span
                      key={rule}
                      className="rounded-full border border-border/60 bg-card/55 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {rule}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-medium text-primary">
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                    本模式最佳 {modeStats.bestCorrect}/{QUESTIONS_PER_GAME}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-muted-foreground">
                    <Music2 className="h-3.5 w-3.5" aria-hidden="true" />
                    已玩 {modeStats.games} 局
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void startGame(!onlineReady)}
                  disabled={!canStart || isPreparing}
                  className={`${PRIMARY_BUTTON_CLASS} mt-5 w-full px-8 py-3 sm:w-auto`}
                >
                  {isPreparing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isPreparing ? '正在准备歌词…' : startLabel}
                </button>

                <span className="mt-3 inline-flex max-w-full items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-card/55 px-3 py-1 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bankTone}`} />
                  {bankMessage}
                </span>

                {!canStart && onlineStatus === 'unavailable' && (
                  <button
                    type="button"
                    onClick={() => void loadBanks()}
                    className={`mt-2 text-xs text-primary underline-offset-2 hover:underline ${FOCUS_RING_CLASS}`}
                  >
                    重新加载曲库
                  </button>
                )}

                {notice && (
                  <p
                    className="mt-3 text-xs text-amber-600 dark:text-amber-400"
                    role="status"
                  >
                    {notice}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'playing' && currentQuestion && (
          <motion.div
            key="playing"
            {...PANEL_MOTION}
            className={`${CARD_CLASS} p-4 sm:p-6`}
          >
            <CardGlow />
            <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-3 py-2">
              <ProgressDots
                total={questions.length}
                current={index}
                answers={answers}
              />
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">
                得分 {answeredCorrectCount * 100}
              </span>
            </div>

            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: MOTION_EASE }}
              className="mt-4 grid gap-5 sm:grid-cols-[176px_1fr] sm:items-stretch sm:gap-6"
            >
              {/* 左：题面（音频/歌词/封面）与播放控制 */}
              <div className="flex min-h-[300px] flex-col items-center rounded-2xl border border-border/50 bg-gradient-to-b from-primary/[0.06] to-transparent p-2 text-center sm:min-h-[360px] sm:p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
                  {modeConfig.icon} {modeConfig.label} · 第 {index + 1} /{' '}
                  {questions.length} 题
                </div>

                <div className="flex w-full flex-1 flex-col items-center justify-center py-1">
                  {currentQuestion.prompt.type === 'audio' ? (
                    <>
                      <VinylDisc
                        playing={snippetStatus === 'playing'}
                        revealed={selected !== null}
                        cover={currentQuestion.answer.cover}
                      />

                      <div className="mt-2">
                        <Equalizer active={snippetStatus === 'playing'} />
                      </div>

                      <div className="mt-2 flex w-full flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePlay()}
                          disabled={snippetStatus === 'loading' || isRefreshing}
                          className={`${PRIMARY_BUTTON_CLASS} w-full px-4 py-2.5 disabled:cursor-wait`}
                        >
                          {snippetStatus === 'loading' || isRefreshing ? (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : snippetStatus === 'playing' ? (
                            <Music2 className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Play className="h-4 w-4" aria-hidden="true" />
                          )}
                          {isRefreshing
                            ? '刷新曲库中…'
                            : snippetStatus === 'loading'
                              ? '缓冲中…'
                              : snippetStatus === 'playing'
                                ? '正在播放…'
                                : '播放片段'}
                        </button>

                        <div
                          className="h-1 w-full max-w-[144px] overflow-hidden rounded-full bg-muted"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-[#33aadd] transition-[width] duration-150"
                            style={{ width: `${Math.round(progress * 100)}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <LyricPrompt line={currentQuestion.prompt.line} />
                  )}
                </div>

                <div className="mt-2 flex w-full flex-col items-center gap-2">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {getPromptHint(currentQuestion.prompt)}
                  </p>

                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={selected !== null}
                    aria-hidden={selected !== null}
                    tabIndex={selected !== null ? -1 : 0}
                    className={cn(
                      'text-[11px] text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline',
                      FOCUS_RING_CLASS,
                      selected !== null && 'invisible'
                    )}
                  >
                    跳过这题
                  </button>

                  {(snippetError || notice) && (
                    <p
                      className="max-w-full text-xs leading-relaxed text-amber-600 dark:text-amber-400"
                      role="status"
                    >
                      {notice ?? snippetError}
                    </p>
                  )}
                </div>
              </div>

              {/* 右：选项、答案揭晓与下一题 */}
              <div className="flex min-w-0 flex-col justify-center sm:h-full sm:border-l sm:border-border/40 sm:pl-5">
                <div className="grid auto-rows-fr gap-2.5 sm:grid-cols-2">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const revealed = selected !== null;
                    const isAnswer = option === currentQuestion.answer.name;
                    const isPicked = selected === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={revealed}
                        title={option}
                        onClick={() => handleSelect(option)}
                        className={cn(
                          'flex h-14 items-center gap-2.5 rounded-2xl border px-3 py-2 text-left text-sm font-medium transition duration-200',
                          FOCUS_RING_CLASS,
                          !revealed &&
                            'border-border/70 bg-card/60 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_10px_24px_-16px_rgba(51,170,221,0.8)]',
                          revealed &&
                            isAnswer &&
                            'border-emerald-400/70 bg-emerald-500/10 text-emerald-700 shadow-[0_8px_24px_-18px_rgba(16,185,129,0.7)] dark:text-emerald-300',
                          revealed &&
                            isPicked &&
                            !isAnswer &&
                            'border-rose-400/70 bg-rose-500/10 text-rose-700 shadow-[0_8px_24px_-18px_rgba(244,63,94,0.7)] dark:text-rose-300',
                          revealed &&
                            !isAnswer &&
                            !isPicked &&
                            'border-border/50 bg-card/40 text-muted-foreground opacity-60'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            revealed && isAnswer
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : revealed && isPicked
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                : 'bg-gradient-to-br from-primary/25 to-primary/5 text-primary ring-1 ring-primary/20'
                          )}
                        >
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span className="line-clamp-2 min-w-0 flex-1 leading-snug">
                          {option}
                        </span>
                        {revealed && isAnswer && (
                          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        {revealed && isPicked && !isAnswer && (
                          <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex min-h-20 flex-1 flex-col justify-center py-2 sm:py-3">
                  <AnimatePresence mode="wait" initial={false}>
                    {selected === null ? (
                      <motion.div
                        key="hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border/60 bg-card/30 p-3 text-xs text-muted-foreground"
                      >
                        <Sparkles
                          className="h-4 w-4 shrink-0 text-primary/60"
                          aria-hidden="true"
                        />
                        选一个答案，揭晓歌名和封面
                      </motion.div>
                    ) : (
                      <motion.div
                        key="reveal"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: MOTION_EASE }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-2xl border border-l-4 bg-card/60 p-2.5',
                          selected === currentQuestion.answer.name
                            ? 'border-l-emerald-400'
                            : 'border-l-rose-400'
                        )}
                        aria-live="polite"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-border/60">
                          {currentQuestion.answer.cover ? (
                            <img
                              src={currentQuestion.answer.cover}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Music2
                              className="h-5 w-5 text-primary"
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {currentQuestion.answer.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {currentQuestion.answer.artist}
                          </div>
                        </div>

                        <div
                          className={cn(
                            'ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold',
                            selected === currentQuestion.answer.name
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {selected === currentQuestion.answer.name ? (
                            <>
                              <Check className="h-4 w-4" aria-hidden="true" />
                              答对 +100
                            </>
                          ) : selected === SKIPPED ? (
                            <>
                              <X className="h-4 w-4" aria-hidden="true" />
                              已跳过
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4" aria-hidden="true" />
                              正确答案
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex">
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={selected === null}
                    className={`${PRIMARY_BUTTON_CLASS} w-full px-7`}
                  >
                    {index + 1 >= questions.length ? '查看结果' : '下一题'}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            {...PANEL_MOTION}
            className={`${CARD_CLASS} p-6 text-center sm:p-9`}
          >
            <CardGlow />
            <div className="relative mx-auto h-28 w-28">
              <Sparkles
                className="absolute -right-1 -top-1 h-4 w-4 text-primary/70"
                aria-hidden="true"
              />
              <Sparkles
                className="absolute -left-2 bottom-1 h-3 w-3 text-primary/50"
                aria-hidden="true"
              />
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-[3px] border-primary/30 bg-[radial-gradient(circle_at_50%_0%,rgba(102,204,255,0.22),transparent_70%)] shadow-[0_0_40px_-12px_rgba(102,204,255,0.7)]">
                <span className="text-3xl font-bold leading-none text-foreground tabular-nums">
                  {answeredCorrectCount}
                  <span className="text-base font-medium text-muted-foreground">
                    /{totalQuestions}
                  </span>
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  答对
                </span>
              </div>
            </div>

            <div className="mt-4 text-4xl drop-shadow-[0_4px_10px_rgba(15,40,90,0.2)]" aria-hidden="true">
              {rank.emoji}
            </div>
            <h2 className="mt-1 font-heading text-2xl font-bold text-foreground">
              {rank.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{rank.comment}</p>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span aria-hidden="true">{modeConfig.icon}</span>
              {modeConfig.label}
            </div>

            {isNewBest && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                新纪录！
              </div>
            )}

            <div className="mt-5 flex justify-center">
              <ProgressDots
                total={totalQuestions}
                current={-1}
                answers={answers}
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <StatBox label="得分" value={answeredCorrectCount * 100} />
              <StatBox
                label="本模式最佳"
                value={`${modeStats.bestCorrect}/${QUESTIONS_PER_GAME}`}
              />
              <StatBox label="已玩" value={`${modeStats.games} 局`} />
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleRestart}
                disabled={isPreparing}
                className={`${PRIMARY_BUTTON_CLASS} px-7`}
              >
                {isPreparing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                )}
                {isPreparing ? '正在准备…' : '再来一局'}
              </button>
              <button
                type="button"
                onClick={handleChangeMode}
                disabled={isPreparing}
                className={SECONDARY_BUTTON_CLASS}
              >
                换个模式
              </button>
            </div>

            <Link
              href="/tools"
              className="mt-3 inline-block text-xs text-muted-foreground underline-offset-2 transition hover:text-primary hover:underline"
            >
              回到小工具
            </Link>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
