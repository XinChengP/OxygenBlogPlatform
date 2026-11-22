'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Plus,
  Trash2,
  RefreshCw,
  GraduationCap,
  Flame,
  CalendarCheck,
  Clock,
  Upload,
  BookOpenCheck,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import {
  AdminButton,
  AdminConfirm,
  AdminInput,
  toast,
} from '@/components/admin';
import type {
  StudyLog,
  StudyLogFormData,
  StudyMood,
  StudyStats,
} from '@/types/studyLog';
import type { MaimemoStats, MaimemoTokenStatus } from '@/types/maimemo';
import {
  getStudyLogList,
  saveStudyLogEntry,
  deleteStudyLog,
  syncMaimemoData,
  getMaimemoStats,
  saveMaimemoToken,
  clearMaimemoToken,
} from '@/actions/studyLogActions';
import { pushToGitHub } from '@/actions/githubActions';

/**
 * 学习打卡管理客户端组件
 *
 * 提供表单打卡（同一天可多次提交，服务端自动合并科目时长）、
 * 记录列表展示、删除与一键提交推送。
 */

interface StudyManageClientProps {
  initialLogs: StudyLog[];
  initialStats: StudyStats;
  /** 墨墨 Token 配置状态 */
  initialTokenStatus: MaimemoTokenStatus;
  /** 已同步的墨墨数据（未同步过为 null） */
  initialMaimemo: MaimemoStats | null;
}

/** 心情选项 */
const MOOD_OPTIONS: Array<{ value: StudyMood; label: string }> = [
  { value: 'great', label: '🤩 超有状态' },
  { value: 'good', label: '😊 状态不错' },
  { value: 'normal', label: '🙂 一般般' },
  { value: 'hard', label: '😮‍💨 有点吃力' },
];

const MOOD_EMOJI: Record<StudyMood, string> = {
  great: '🤩',
  good: '😊',
  normal: '🙂',
  hard: '😮‍💨',
};

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六'];

/** 2026-10-26 → 10 月 26 日 · 周一 */
function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const weekday = WEEKDAYS_CN[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const yearPrefix = y === new Date().getFullYear() ? '' : `${y} 年 `;
  return `${yearPrefix}${m} 月 ${d} 日 · 周${weekday}`;
}

/** 分钟数格式化为「X 小时 Y 分钟」 */
function formatStudyMinutes(minutes: number): string {
  if (minutes <= 0) return '0 分钟';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} 分钟`;
  if (rest === 0) return `${hours} 小时`;
  return `${hours} 小时 ${rest} 分钟`;
}

/** 把 Markdown 笔记压成一行纯文本用于预览 */
function notePreview(content: string): string {
  const text = content
    .split('\n')
    .map(line => line.replace(/^-\s*\*\*[\d:]+\*\*\s*/, '').trim())
    .filter(Boolean)
    .join('；');
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export default function StudyManageClient({
  initialLogs,
  initialStats,
  initialTokenStatus,
  initialMaimemo,
}: StudyManageClientProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 记录与统计
  const [logs, setLogs] = useState<StudyLog[]>(initialLogs);
  const [stats, setStats] = useState<StudyStats>(initialStats);
  const [refreshing, setRefreshing] = useState(false);

  // 墨墨背单词：Token 状态与同步数据
  const [tokenStatus, setTokenStatus] = useState<MaimemoTokenStatus>(initialTokenStatus);
  const [maimemo, setMaimemo] = useState<MaimemoStats | null>(initialMaimemo);
  const [tokenInput, setTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [clearingToken, setClearingToken] = useState(false);

  // 打卡表单（日期默认今天，挂载后再设置避免水合不一致）
  const [form, setForm] = useState<StudyLogFormData>({
    date: '',
    subject: 'CAD',
    minutes: 60,
    mood: 'good',
    tags: [],
    note: '',
  });
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [syncingMaimemo, setSyncingMaimemo] = useState(false);

  // 删除确认弹窗
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    date: string;
    loading: boolean;
  }>({ open: false, date: '', loading: false });

  // 挂载后填入今天的日期
  useEffect(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setForm(prev => ({ ...prev, date: `${now.getFullYear()}-${m}-${d}` }));
  }, []);

  /**
   * 从服务端刷新记录列表与统计
   */
  const refreshList = async () => {
    setRefreshing(true);
    try {
      const result = await getStudyLogList();
      if (result.success && result.data) {
        setLogs(result.data.logs);
        setStats(result.data.stats);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刷新失败，请稍后重试');
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 提交打卡：同一天多次提交由服务端自动合并
   */
  const handleSubmit = async () => {
    if (!form.date) {
      toast.error('请选择打卡日期');
      return;
    }
    if (!form.subject.trim()) {
      toast.error('请填写科目名称');
      return;
    }

    setSaving(true);
    try {
      const payload: StudyLogFormData = {
        ...form,
        subject: form.subject.trim(),
        minutes: Number(form.minutes),
        tags: tagsText
          .split(/[,，]/)
          .map(tag => tag.trim())
          .filter(Boolean),
      };
      const result = await saveStudyLogEntry(payload);
      if (result.success) {
        toast.success(result.message);
        // 保留日期与科目方便连续打卡，清空笔记
        setForm(prev => ({ ...prev, note: '' }));
        setTagsText('');
        await refreshList();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打卡失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 确认删除某天的记录
   */
  const handleDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      const result = await deleteStudyLog(deleteConfirm.date);
      if (result.success) {
        toast.success(result.message);
        await refreshList();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败，请稍后重试');
    } finally {
      setDeleteConfirm({ open: false, date: '', loading: false });
    }
  };

  /**
   * 刷新墨墨数据的展示（累计词数、今日进度等）
   */
  const refreshMaimemoStats = async () => {
    const refreshed = await getMaimemoStats();
    if (refreshed.success) {
      setMaimemo(refreshed.data ?? null);
    }
  };

  /**
   * 同步墨墨背单词数据（写入 src/data/maimemo-stats.json）
   */
  const handleSyncMaimemo = async () => {
    setSyncingMaimemo(true);
    try {
      const result = await syncMaimemoData();
      if (result.success) {
        toast.success(result.message);
        await refreshMaimemoStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '同步失败，请稍后重试');
    } finally {
      setSyncingMaimemo(false);
    }
  };

  /**
   * 保存 Token（DPAPI 加密，不落明文）并自动同步一次验证
   */
  const handleSaveToken = async () => {
    setSavingToken(true);
    try {
      const saved = await saveMaimemoToken(tokenInput);
      if (!saved.success) {
        toast.error(saved.message);
        return;
      }
      if (saved.data) {
        setTokenStatus(saved.data);
      }
      setTokenInput('');

      // 保存后自动同步一次，顺便验证 Token 是否有效
      const synced = await syncMaimemoData();
      if (synced.success) {
        toast.success(`Token 已保存并同步成功：${synced.message}`);
        await refreshMaimemoStats();
      } else {
        toast.error(`Token 已保存，但同步失败：${synced.message}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败，请稍后重试');
    } finally {
      setSavingToken(false);
    }
  };

  /**
   * 清除本机加密保存的 Token
   */
  const handleClearToken = async () => {
    setClearingToken(true);
    try {
      const result = await clearMaimemoToken();
      if (result.success) {
        toast.success(result.message);
        if (result.data) {
          setTokenStatus(result.data);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '清除失败，请稍后重试');
    } finally {
      setClearingToken(false);
    }
  };

  /**
   * 把打卡改动提交并推送到 GitHub（等价于 git add . + commit + push）
   */
  const handlePush = async () => {
    setPushing(true);
    try {
      const result = await pushToGitHub(`study-log: 更新学习打卡 ${new Date().toLocaleDateString('zh-CN')}`);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '推送失败，请稍后重试');
    } finally {
      setPushing(false);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDark
      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
  } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`;

  const cardClass = `rounded-xl p-6 backdrop-blur-md ${
    isDark
      ? 'bg-gray-800/50 border border-gray-700/50'
      : 'bg-white/70 border border-gray-200/50'
  }`;

  return (
    <div className="space-y-6">
      {/* 页面标题与统计概览 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <GraduationCap className="w-7 h-7 text-[#66ccff]" />
            学习打卡管理
          </h1>
          <div className={`flex flex-wrap items-center gap-4 mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="flex items-center gap-1">
              <CalendarCheck className="w-4 h-4" /> 累计 {stats.totalDays} 天
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-4 h-4" /> 连续 {stats.currentStreak} 天
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> 共 {formatStudyMinutes(stats.totalMinutes)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminButton type="ghost" size="sm" onClick={refreshList} loading={refreshing}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </AdminButton>
          <AdminButton type="secondary" size="sm" onClick={handleSyncMaimemo} loading={syncingMaimemo}>
            <BookOpenCheck className="w-4 h-4 mr-1" />
            同步墨墨
          </AdminButton>
          <AdminButton type="secondary" size="sm" onClick={handlePush} loading={pushing}>
            <Upload className="w-4 h-4 mr-1" />
            提交推送
          </AdminButton>
        </div>
      </motion.div>

      {/* 打卡表单 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cardClass}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          记一次打卡
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              日期
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              科目
            </label>
            <input
              type="text"
              value={form.subject}
              placeholder="如 CAD / SolidWorks"
              onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              时长（分钟）
            </label>
            <input
              type="number"
              min={0}
              value={Number.isNaN(Number(form.minutes)) ? '' : form.minutes}
              onChange={e => setForm(prev => ({ ...prev, minutes: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              心情（可选）
            </label>
            <select
              value={form.mood || ''}
              onChange={e => setForm(prev => ({ ...prev, mood: (e.target.value || undefined) as StudyMood | undefined }))}
              className={inputClass}
            >
              <option value="">不记录</option>
              {MOOD_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              标签（可选，逗号分隔）
            </label>
            <input
              type="text"
              value={tagsText}
              placeholder="草图, 约束"
              onChange={e => setTagsText(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              打卡笔记（可选，同一天多次会按时间追加）
            </label>
            <AdminInput
              value={form.note || ''}
              placeholder="今天学了修剪、偏移和镜像"
              onChange={value => setForm(prev => ({ ...prev, note: value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            同一天可多次打卡：科目时长自动累加，笔记按时间追加
          </p>
          <AdminButton onClick={handleSubmit} loading={saving}>
            <Plus className="w-4 h-4 mr-1" />
            打卡
          </AdminButton>
        </div>
      </motion.div>

      {/* 墨墨背单词：Token 配置与同步状态 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className={cardClass}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <BookOpenCheck className="w-5 h-5 text-[#66ccff]" />
            墨墨背单词
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
              tokenStatus.configured
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : isDark
                  ? 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            {tokenStatus.configured ? <ShieldCheck className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
            {tokenStatus.configured
              ? tokenStatus.source === 'env'
                ? '已配置 · 环境变量 / GitHub Secrets'
                : '已配置 · 本机加密'
              : '未配置 Token'}
          </span>
        </div>

        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {maimemo
            ? `上次同步 ${maimemo.updatedAt.slice(0, 16).replace('T', ' ')} · 累计 ${maimemo.totalWords} 词${
                maimemo.today ? ` · 今日 ${maimemo.today.finished}/${maimemo.today.total}` : ''
              }${
                maimemo.todayNewWords !== undefined ? ` · 今日新学 ${maimemo.todayNewWords} 词` : ''
              }`
            : '还没有同步过数据，配置 Token 后点「同步墨墨」或下方「保存并同步」。'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={tokenInput}
            placeholder="粘贴墨墨 Token（输入不可见）"
            onChange={e => setTokenInput(e.target.value)}
            className={`flex-1 min-w-[240px] px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
            } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
          />
          <AdminButton onClick={handleSaveToken} loading={savingToken} disabled={!tokenInput.trim() || savingToken}>
            保存并同步
          </AdminButton>
          {tokenStatus.configured && tokenStatus.source === 'dpapi' && (
            <AdminButton type="ghost" onClick={handleClearToken} loading={clearingToken}>
              清除本机 Token
            </AdminButton>
          )}
        </div>

        <div className={`mt-4 pt-3 border-t text-xs space-y-1 ${isDark ? 'border-gray-700/50 text-gray-500' : 'border-gray-200/60 text-gray-400'}`}>
          <p>
            Token 在墨墨 App「我的 → 更多设置 → 实验功能 → 开放 API」获取，保存后使用 Windows DPAPI 加密存储，不落明文。
          </p>
          <p>
            线上自动更新由 Cloudflare Worker 提供（cloudflare/maimemo-stats，Token 存 Worker Secret），
            前台每次访问自动读取，无需构建或推送；本机保存的 Token 只用于本地同步与预览。
          </p>
        </div>
      </motion.div>

      {/* 记录列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={cardClass}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          打卡记录（{logs.length} 天）
        </h2>

        {logs.length === 0 ? (
          <p className={`py-10 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            还没有打卡记录，用上面的表单记下第一天吧
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => {
              const dayTotal = stats.dayMinutes[log.date] || 0;
              return (
                <div
                  key={log.date}
                  className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700/30 border-gray-600/50'
                      : 'bg-gray-50/80 border-gray-200/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatDateLabel(log.date)}
                      </span>
                      {log.mood && <span aria-hidden>{MOOD_EMOJI[log.mood]}</span>}
                      {log.subjects.map(subject => (
                        <span
                          key={subject.name}
                          className="px-2 py-0.5 rounded-full bg-[#66ccff]/10 text-xs text-[#66ccff]"
                        >
                          {subject.name} · {formatStudyMinutes(subject.minutes)}
                        </span>
                      ))}
                      {log.subjects.length > 1 && (
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          共 {formatStudyMinutes(dayTotal)}
                        </span>
                      )}
                    </div>
                    {log.content.trim() && (
                      <p className={`mt-1 text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notePreview(log.content)}
                      </p>
                    )}
                  </div>
                  <AdminButton
                    type="danger"
                    size="sm"
                    onClick={() => setDeleteConfirm({ open: true, date: log.date, loading: false })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </AdminButton>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* 删除确认弹窗 */}
      <AdminConfirm
        open={deleteConfirm.open}
        title="删除打卡记录"
        message={`确定要删除 ${deleteConfirm.date} 的打卡记录吗？该操作不可恢复。`}
        confirmText="删除"
        type="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm({ open: false, date: '', loading: false })}
      />
    </div>
  );
}
