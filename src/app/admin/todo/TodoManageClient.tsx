'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle,
  X,
  Clock,
  Flag,
  FileText,
  Calendar,
  RefreshCw,
  StickyNote,
  Bell,
  Settings,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  AdminButton,
  AdminConfirm,
  AdminModal,
  AdminEmptyState,
  toast,
} from '@/components/admin';
import type { TodoItem, TodoConfig, TodoFormData, TodoPriority } from '@/types/todo';
import {
  createTodoItem,
  updateTodoItem,
  deleteTodoItem,
  setTodoComplete,
  batchDeleteTodoItems,
  syncTodoFromRemote,
  updateTodoConfigSettings,
} from '@/actions/todoActions';
import { formatDateTime } from '@/utils/adminUtils';
import {
  datetimeLocalToMs,
  formatTodoDueDate,
  formatTodoRemindAt,
  getTodoStats,
  isTodoOverdue,
  msToDatetimeLocal,
  sortTodoItems,
} from '@/utils/todoDisplay';

/**
 * 客户端组件 Props
 */
interface TodoManageClientProps {
  initialConfig: TodoConfig;
  /** 服务端读取异常或回退快照时的提示 */
  notice?: string;
}

/**
 * 优先级配置
 */
const PRIORITY_OPTIONS = [
  { value: 'high', label: '高优先级', color: 'text-red-500', bgColor: 'bg-red-500/20' },
  { value: 'medium', label: '中优先级', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
  { value: 'low', label: '低优先级', color: 'text-green-500', bgColor: 'bg-green-500/20' },
];

/**
 * 编辑表单的本地状态
 * priority 用 null 表示「无优先级」，与远端整数 0 对应
 */
interface TodoEditForm {
  content: string;
  notes: string;
  priority: TodoPriority | null;
  dueDate: string;
  remindAt: number | null;
}

/**
 * 待办管理页面客户端组件
 */
export default function TodoManageClient({ initialConfig, notice }: TodoManageClientProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 待办列表状态
  const [items, setItems] = useState<TodoItem[]>(initialConfig.items);
  const [title, setTitle] = useState(initialConfig.title);
  const [showStats, setShowStats] = useState(initialConfig.showStats);

  // 服务端读取失败或回退快照时的提示
  const [noticeText, setNoticeText] = useState<string | undefined>(notice);
  // 同步进行中标记
  const [syncing, setSyncing] = useState(false);
  // 最近一次同步完成时间
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // 筛选条件
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // 选中的待办 ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /**
   * 筛选条件变化后清空选择，避免批量操作误伤当前不可见的待办
   */
  useEffect(() => {
    setSelectedIds([]);
  }, [searchQuery, statusFilter, priorityFilter]);

  // 编辑弹窗
  const [editModal, setEditModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    item?: TodoItem;
    loading: boolean;
  }>({
    open: false,
    mode: 'create',
    loading: false,
  });

  // 表单数据
  const [formData, setFormData] = useState<TodoEditForm>({
    content: '',
    notes: '',
    priority: 'medium',
    dueDate: '',
    remindAt: null,
  });

  // 删除确认弹窗
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    ids: string[];
    loading: boolean;
  }>({
    open: false,
    ids: [],
    loading: false,
  });

  // 设置弹窗（侧栏标题、是否显示完成进度）
  const [settingsModal, setSettingsModal] = useState<{
    open: boolean;
    title: string;
    showStats: boolean;
    loading: boolean;
  }>({
    open: false,
    title: '',
    showStats: true,
    loading: false,
  });

  /**
   * 筛选后的待办列表
   */
  const filteredItems = useMemo(() => {
    let result = [...items];

    // 按关键词搜索（内容、备注、ID）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.content.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }

    // 按完成状态筛选
    if (statusFilter === 'completed') {
      result = result.filter(item => item.completed);
    } else if (statusFilter === 'pending') {
      result = result.filter(item => !item.completed);
    }

    // 按优先级筛选
    if (priorityFilter) {
      result = result.filter(item => item.priority === priorityFilter);
    }

    return sortTodoItems(result);
  }, [items, searchQuery, statusFilter, priorityFilter]);

  /** 当前列表的统计信息 */
  const stats = useMemo(() => getTodoStats(items), [items]);
  /** 当前筛选结果是否已全选 */
  const allSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

  /**
   * 组件挂载后设置状态
   */
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 避免水合错误
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  /**
   * 从线上 API 全量同步待办
   * 这是唯一会写本地快照的动作，同步完成后直接刷新列表
   */
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncTodoFromRemote();
      if (result.success && result.data) {
        setItems(result.data.config.items);
        setTitle(result.data.config.title);
        setShowStats(result.data.config.showStats);
        setLastSyncedAt(result.data.syncedAt);
        setNoticeText(undefined);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('同步失败，请稍后重试');
    } finally {
      setSyncing(false);
    }
  };

  /** 打开设置弹窗，带入当前标题与统计开关 */
  const openSettingsModal = () => {
    setSettingsModal({ open: true, title, showStats, loading: false });
  };

  /** 保存侧栏展示设置（标题与是否显示完成进度） */
  const handleSaveSettings = async () => {
    const nextTitle = settingsModal.title.trim();
    if (!nextTitle) {
      toast.error('请输入待办标题');
      return;
    }

    setSettingsModal(prev => ({ ...prev, loading: true }));
    try {
      const result = await updateTodoConfigSettings({
        title: nextTitle,
        showStats: settingsModal.showStats,
      });
      if (result.success && result.data) {
        setTitle(result.data.title);
        setShowStats(result.data.showStats);
        setSettingsModal(prev => ({ ...prev, open: false, loading: false }));
        toast.success('设置已保存');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('保存失败，请稍后重试');
    } finally {
      setSettingsModal(prev => ({ ...prev, loading: false }));
    }
  };

  /**
   * 打开创建弹窗
   */
  const openCreateModal = () => {
    setFormData({
      content: '',
      notes: '',
      priority: 'medium',
      dueDate: '',
      remindAt: null,
    });
    setEditModal({ open: true, mode: 'create', loading: false });
  };

  /**
   * 打开编辑弹窗
   */
  const openEditModal = (item: TodoItem) => {
    setFormData({
      content: item.content,
      notes: item.notes ?? '',
      priority: item.priority ?? null,
      dueDate: item.dueDate ?? '',
      remindAt: item.remindAt ?? null,
    });
    setEditModal({ open: true, mode: 'edit', item, loading: false });
  };

  /**
   * 把表单状态转换为 Action 需要的表单数据
   * 备注始终传字符串：空字符串代表清空远端备注，
   * 传 undefined 会被 updateTodoItem 视为「未修改」，导致备注删不掉
   */
  const toFormPayload = (): TodoFormData => ({
    content: formData.content.trim(),
    notes: formData.notes.trim(),
    priority: formData.priority,
    dueDate: formData.dueDate,
    remindAt: formData.remindAt,
  });

  /**
   * 处理提交表单
   */
  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      toast.error('请输入待办内容');
      return;
    }

    setEditModal(prev => ({ ...prev, loading: true }));

    try {
      const payload = toFormPayload();

      if (editModal.mode === 'create') {
        const result = await createTodoItem(payload);
        if (!result.success || !result.data) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        setItems(prev => [result.data as TodoItem, ...prev]);
      } else if (editModal.item) {
        const result = await updateTodoItem(editModal.item.id, payload);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        // 服务器返回的是字段级 LWW 裁决后的最终状态，直接用它覆盖本地
        const updated = result.data;
        setItems(prev =>
          prev.map(item =>
            item.id === editModal.item?.id
              ? updated ?? {
                  ...item,
                  content: payload.content,
                  notes: payload.notes || undefined,
                  priority: payload.priority ?? undefined,
                  dueDate: payload.dueDate || undefined,
                  remindAt: typeof payload.remindAt === 'number' ? payload.remindAt : undefined,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
      } else {
        return;
      }

      setEditModal({ open: false, mode: 'create', loading: false });
    } catch (err) {
      toast.error('操作失败，请稍后重试');
    } finally {
      setEditModal(prev => ({ ...prev, loading: false }));
    }
  };

  /**
   * 设置待办完成状态
   * 由界面传入目标状态，而不是让服务端「取反」，避免多端并发歧义
   */
  const handleSetComplete = async (item: TodoItem) => {
    const nextCompleted = !item.completed;
    try {
      const result = await setTodoComplete(item.id, nextCompleted);
      if (result.success) {
        // 以服务器最终状态为准：并发写入输掉时本地不能停留在乐观结果
        const finalCompleted = result.data?.completed ?? nextCompleted;
        setItems(prev =>
          prev.map(entry => (entry.id === item.id
            ? { ...entry, completed: finalCompleted, updatedAt: new Date().toISOString() }
            : entry))
        );
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('操作失败，请稍后重试');
    }
  };

  /**
   * 处理删除
   */
  const handleDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));

    try {
      let result;
      if (deleteConfirm.ids.length === 1) {
        result = await deleteTodoItem(deleteConfirm.ids[0]);
      } else {
        result = await batchDeleteTodoItems(deleteConfirm.ids);
      }

      if (result.success) {
        toast.success(result.message);
        setItems(prev => prev.filter(item => !deleteConfirm.ids.includes(item.id)));
        setSelectedIds([]);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleteConfirm({ open: false, ids: [], loading: false });
    }
  };

  /**
   * 打开删除确认弹窗
   */
  const openDeleteConfirm = (ids: string[]) => {
    setDeleteConfirm({ open: true, ids, loading: false });
  };

  /**
   * 切换选择
   */
  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id));
    }
  };

  /**
   * 获取优先级配置
   */
  const getPriorityConfig = (priority?: string) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            管理你的待办事项，规划工作与生活
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openSettingsModal}
              className={`inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors shadow-md ${
                isDark
                  ? 'bg-gray-700/70 text-gray-200 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Settings className="w-5 h-5 mr-2" />
              设置
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors shadow-md ${
                isDark
                  ? 'bg-gray-700/70 text-gray-200 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              } ${syncing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同步中...' : '从线上同步'}
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5 mr-2" />
              添加待办
            </button>
          </div>
          {lastSyncedAt && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              最近同步：{formatDateTime(lastSyncedAt)}
            </span>
          )}
        </div>
      </div>

      {/* 服务端数据提示：回退快照或读取失败时告知原因 */}
      {noticeText && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            {noticeText}
            <p className="mt-1 text-xs opacity-80">
              当前展示的可能不是最新线上数据，请检查同步令牌与网络后重新同步。
            </p>
          </div>
          <button
            onClick={() => setNoticeText(undefined)}
            aria-label="关闭提示"
            title="关闭提示"
            className="p-1 rounded hover:bg-amber-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 统计概览 */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`px-2.5 py-1 rounded-full ${isDark ? 'bg-gray-800/60 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
          共 {stats.total} 条
        </span>
        <span className={`px-2.5 py-1 rounded-full ${isDark ? 'bg-[#66ccff]/10 text-[#66ccff]' : 'bg-[#66ccff]/10 text-[#3399cc]'}`}>
          待完成 {stats.pending}
        </span>
        {stats.overdue > 0 && (
          <span className={`px-2.5 py-1 rounded-full ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
            已逾期 {stats.overdue}
          </span>
        )}
        <span className={`px-2.5 py-1 rounded-full ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
          已完成 {stats.completed}
        </span>
        <span className={`px-2.5 py-1 rounded-full ${isDark ? 'bg-gray-800/60 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
          完成率 {stats.completionRate}%
        </span>
      </div>

      {/* 搜索和筛选栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-xl p-4 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="搜索待办内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
          </div>

          {/* 完成状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'pending')}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
            } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
          >
            <option value="all">全部状态</option>
            <option value="pending">未完成</option>
            <option value="completed">已完成</option>
          </select>

          {/* 优先级筛选 */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
            } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
          >
            <option value="">全部优先级</option>
            {PRIORITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* 批量操作栏 */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl ${
            isDark
              ? 'bg-[#66ccff]/10 border border-[#66ccff]/30'
              : 'bg-[#66ccff]/5 border border-[#66ccff]/20'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-medium ${isDark ? 'text-[#66ccff]' : 'text-[#66ccff]'}`}>
              已选择 {selectedIds.length} 条待办
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton
              type="danger"
              size="sm"
              onClick={() => openDeleteConfirm(selectedIds)}
            >
              批量删除
            </AdminButton>
            <AdminButton
              type="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              取消选择
            </AdminButton>
          </div>
        </motion.div>
      )}

      {/* 列表工具栏：全选与筛选结果数量 */}
      {filteredItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <button
            onClick={toggleSelectAll}
            aria-pressed={allSelected}
            className={`inline-flex items-center gap-2 text-sm transition-colors ${
              isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 text-[#66ccff]" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            {allSelected ? '取消全选' : '全选'}
          </button>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            显示 {filteredItems.length} / {items.length} 条
          </span>
        </div>
      )}

      {/* 待办列表 */}
      {filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl backdrop-blur-md bg-card/85 border border-border shadow-sm"
        >
          <AdminEmptyState
            icon={<FileText className="w-12 h-12" />}
            title="暂无待办"
            description={
              searchQuery || statusFilter !== 'all' || priorityFilter
                ? '没有找到符合条件的待办'
                : '开始添加你的第一条待办吧'
            }
            action={
              !searchQuery && statusFilter === 'all' && !priorityFilter ? (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  添加待办
                </button>
              ) : undefined
            }
          />
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => {
            const priorityConfig = getPriorityConfig(item.priority);
            const overdue = isTodoOverdue(item);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.05 }}
                className={`rounded-xl p-4 backdrop-blur-md ${
                  isDark
                    ? 'bg-gray-800/50 border border-gray-700/50'
                    : 'bg-white/70 border border-gray-200/50'
                } shadow-lg ${
                  selectedIds.includes(item.id)
                    ? 'ring-2 ring-[#66ccff]'
                    : ''
                } ${
                  item.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* 选择框 */}
                  <button
                    onClick={() => toggleSelection(item.id)}
                    aria-label={selectedIds.includes(item.id) ? '取消选择该待办' : '选择该待办'}
                    aria-pressed={selectedIds.includes(item.id)}
                    title={selectedIds.includes(item.id) ? '取消选择' : '选择'}
                    className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedIds.includes(item.id)
                        ? 'bg-[#66ccff] border-[#66ccff] text-white'
                        : isDark
                          ? 'border-gray-600 hover:border-[#66ccff]'
                          : 'border-gray-300 hover:border-[#66ccff]'
                    }`}
                  >
                    {selectedIds.includes(item.id) && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </button>

                  {/* 完成状态 */}
                  <button
                    onClick={() => handleSetComplete(item)}
                    aria-label={item.completed ? '标记为未完成' : '标记为已完成'}
                    title={item.completed ? '标记为未完成' : '标记为已完成'}
                    className={`mt-1 transition-colors ${
                      item.completed
                        ? 'text-[#66ccff]'
                        : isDark
                          ? 'text-gray-500 hover:text-[#66ccff]'
                          : 'text-gray-400 hover:text-[#66ccff]'
                    }`}
                  >
                    {item.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* 内容区域 */}
                  <div className="flex-1 min-w-0">
                    {/* 头部信息 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          #{item.id.substring(0, 8)}
                        </span>
                        {priorityConfig && !item.completed && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                            <Flag className="w-3 h-3 mr-1" />
                            {priorityConfig.label}
                          </span>
                        )}
                        {overdue && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isDark
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            已逾期
                          </span>
                        )}
                        {item.completed && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isDark
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            已完成
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <Clock className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* 内容 */}
                    <p className={`mb-2 whitespace-pre-line break-words ${item.completed ? 'line-through' : ''} ${
                      isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {item.content}
                    </p>

                    {/* 备注详情 */}
                    {item.notes && (
                      <p className={`mb-2 flex items-start gap-1 text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="whitespace-pre-wrap break-words">{item.notes}</span>
                      </p>
                    )}

                    {/* 截止日期 */}
                    {item.dueDate && !item.completed && (
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={overdue
                          ? 'text-red-500 font-medium'
                          : isDark ? 'text-gray-400' : 'text-gray-500'
                        }>
                          截止: {formatTodoDueDate(item.dueDate)}
                        </span>
                      </div>
                    )}

                    {/* 提醒时间 */}
                    {typeof item.remindAt === 'number' && !item.completed && (
                      <div className="flex items-center space-x-1 text-sm">
                        <Bell className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                          提醒: {formatTodoRemindAt(item.remindAt)}
                        </span>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex items-center justify-end pt-2 mt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal(item)}
                          aria-label="编辑待办"
                          title="编辑"
                          className={`p-2 rounded-lg transition-colors ${
                            isDark
                              ? 'text-gray-400 hover:text-[#66ccff] hover:bg-gray-700'
                              : 'text-gray-500 hover:text-[#66ccff] hover:bg-gray-100'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm([item.id])}
                          aria-label="删除待办"
                          title="删除"
                          className={`p-2 rounded-lg transition-colors ${
                            isDark
                              ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                              : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 设置弹窗 */}
      <AdminModal
        open={settingsModal.open}
        onClose={() => setSettingsModal(prev => ({ ...prev, open: false }))}
        title="待办设置"
        width="max-w-md"
      >
        <div className="p-4 space-y-4">
          {/* 侧栏标题 */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              侧栏标题
            </label>
            <input
              type="text"
              value={settingsModal.title}
              onChange={(e) => setSettingsModal(prev => ({ ...prev, title: e.target.value }))}
              placeholder="待办事项"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              显示在动态页右侧待办卡片顶部
            </p>
          </div>

          {/* 统计开关 */}
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
            isDark ? 'border-gray-700/60 bg-gray-800/40' : 'border-gray-200 bg-gray-50/60'
          }`}>
            <input
              type="checkbox"
              checked={settingsModal.showStats}
              onChange={(e) => setSettingsModal(prev => ({ ...prev, showStats: e.target.checked }))}
              className="mt-1 w-4 h-4 accent-[#66ccff]"
            />
            <span>
              <span className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                显示完成进度
              </span>
              <span className={`block mt-0.5 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                关闭后侧栏只显示待办列表，不显示进度条与完成数
              </span>
            </span>
          </label>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-2 pt-2">
            <AdminButton
              type="ghost"
              onClick={() => setSettingsModal(prev => ({ ...prev, open: false }))}
            >
              取消
            </AdminButton>
            <AdminButton
              type="primary"
              loading={settingsModal.loading}
              onClick={handleSaveSettings}
            >
              保存
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* 编辑/创建弹窗 */}
      <AdminModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, mode: 'create', loading: false })}
        title={editModal.mode === 'create' ? '添加待办' : '编辑待办'}
        width="max-w-lg"
      >
        <div className="p-4 space-y-4">
          {/* 待办内容 */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              待办内容 *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="输入待办内容..."
              rows={3}
              maxLength={5000}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
          </div>

          {/* 备注详情 */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="补充说明（可选）"
              rows={2}
              maxLength={20000}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
          </div>

          {/* 优先级 */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              优先级
            </label>
            <select
              value={formData.priority ?? ''}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  priority: e.target.value ? (e.target.value as TodoPriority) : null,
                }))
              }
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            >
              <option value="">无优先级</option>
              {PRIORITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* 截止日期 */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              截止日期
            </label>
            <input
              type="date"
              value={formData.dueDate || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
          </div>

          {/* 提醒时间 */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              提醒时间
            </label>
            <input
              type="datetime-local"
              value={msToDatetimeLocal(formData.remindAt)}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, remindAt: datetimeLocalToMs(e.target.value) }))
              }
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              提醒通知由手机端 App 推送，博客仅展示时间
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-2 pt-4">
            <AdminButton
              type="ghost"
              onClick={() => setEditModal({ open: false, mode: 'create', loading: false })}
            >
              取消
            </AdminButton>
            <AdminButton
              type="primary"
              loading={editModal.loading}
              onClick={handleSubmit}
            >
              {editModal.mode === 'create' ? '添加' : '保存'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* 删除确认弹窗 */}
      <AdminConfirm
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, ids: [], loading: false })}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除选中的 ${deleteConfirm.ids.length} 条待办吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}
