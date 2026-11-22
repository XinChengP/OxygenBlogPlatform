'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Tag,
  Clock,
  Image as ImageIcon,
  MoreVertical,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  EyeOff,
  Eye,
  Upload,
} from 'lucide-react';
import {
  AdminButton,
  AdminConfirm,
  AdminModal,
  AdminEmptyState,
  toast,
} from '@/components/admin';
import { 
  Moment, 
  deleteMoment, 
  batchDeleteMoments, 
  batchToggleMomentPinned,
  toggleMomentPinned,
  toggleMomentHidden,
  batchToggleMomentHidden,
} from '@/actions/momentActions';
import { formatDateTime, copyToClipboard } from '@/utils/adminUtils';
import { useGitHubPush } from '@/hooks/useGitHubPush';
import { GitPushResult } from '@/actions/githubActions';

/**
 * 客户端组件 Props
 */
interface MomentsManageClientProps {
  initialMoments: Moment[];
  initialTags: string[];
}

/**
 * 动态管理页面客户端组件
 */
export default function MomentsManageClient({
  initialMoments,
  initialTags
}: MomentsManageClientProps) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // GitHub 推送 Hook - 管理 GitHub 推送功能的状态和操作
  const { pushing, building, lastResult, refreshStatus, push, buildPush } = useGitHubPush();

  // 是否显示构建选项 - 推送前是否需要构建
  const [showBuildOption, setShowBuildOption] = useState(false);

  // 动态列表状态
  const [moments, setMoments] = useState<Moment[]>(initialMoments);
  
  // 筛选条件
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [pinnedFilter, setPinnedFilter] = useState<'all' | 'pinned' | 'unpinned'>('all');
  // 隐藏状态筛选：all-全部、hidden-已隐藏、visible-可见
  const [hiddenFilter, setHiddenFilter] = useState<'all' | 'hidden' | 'visible'>('all');

  // 选中的动态 ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /**
   * 筛选条件变化后清空选择
   *
   * 否则先勾选若干条再切换筛选，批量删除/隐藏会作用到当前不可见的条目，
   * 用户无法确认自己到底操作了哪些数据。
   */
  useEffect(() => {
    setSelectedIds([]);
  }, [searchQuery, selectedTag, pinnedFilter, hiddenFilter]);

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

  // 图片预览弹窗
  const [imagePreview, setImagePreview] = useState<{
    open: boolean;
    images: string[];
    currentIndex: number;
  }>({
    open: false,
    images: [],
    currentIndex: 0,
  });

  /**
   * 筛选后的动态列表
   */
  const filteredMoments = useMemo(() => {
    let result = [...moments];

    // 按关键词搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(moment => 
        moment.content.toLowerCase().includes(query) ||
        moment.id.toLowerCase().includes(query) ||
        moment.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 按标签筛选
    if (selectedTag) {
      result = result.filter(moment => moment.tags.includes(selectedTag));
    }

    // 按置顶状态筛选
    if (pinnedFilter === 'pinned') {
      result = result.filter(moment => moment.pinned);
    } else if (pinnedFilter === 'unpinned') {
      result = result.filter(moment => !moment.pinned);
    }

    // 按隐藏状态筛选
    if (hiddenFilter === 'hidden') {
      result = result.filter(moment => moment.hidden);
    } else if (hiddenFilter === 'visible') {
      result = result.filter(moment => !moment.hidden);
    }

    return result;
  }, [moments, searchQuery, selectedTag, pinnedFilter, hiddenFilter]);

  /**
   * 组件挂载后设置状态
   */
  React.useEffect(() => {
    setMounted(true);
    // 刷新 Git 状态 - 用于显示 GitHub 推送的当前状态
    refreshStatus();
  }, [refreshStatus]);

  // 避免水合错误
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  /**
   * 刷新数据
   */
  const refreshData = () => {
    router.refresh();
  };

  /**
   * 处理删除动态
   */
  const handleDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));

    try {
      let result;
      if (deleteConfirm.ids.length === 1) {
        result = await deleteMoment(deleteConfirm.ids[0]);
      } else {
        result = await batchDeleteMoments(deleteConfirm.ids);
      }

      if (result.success) {
        toast.success(result.message);
        setMoments(prev => prev.filter(m => !deleteConfirm.ids.includes(m.id)));
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
   * 处理切换置顶状态
   */
  const handleTogglePinned = async (id: string) => {
    try {
      const result = await toggleMomentPinned(id);
      if (result.success && result.data && !Array.isArray(result.data)) {
        const updatedMoment = result.data;
        setMoments(prev => prev.map(m => 
          m.id === id ? updatedMoment : m
        ));
        toast.success(updatedMoment.pinned ? '已置顶' : '已取消置顶');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('操作失败，请稍后重试');
    }
  };

  /**
   * 处理批量置顶
   */
  const handleBatchPinned = async (pinned: boolean) => {
    try {
      const result = await batchToggleMomentPinned(selectedIds, pinned);
      if (result.success) {
        toast.success(result.message);
        setMoments(prev => prev.map(m => 
          selectedIds.includes(m.id) ? { ...m, pinned } : m
        ));
        setSelectedIds([]);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('操作失败，请稍后重试');
    }
  };

  /**
   * 处理切换隐藏状态
   * 切换单条动态的隐藏状态，隐藏的动态在前台不显示
   */
  const handleToggleHidden = async (id: string) => {
    try {
      const result = await toggleMomentHidden(id);
      if (result.success && result.data && !Array.isArray(result.data)) {
        const updatedMoment = result.data;
        // 更新本地状态
        setMoments(prev => prev.map(m => 
          m.id === id ? updatedMoment : m
        ));
        toast.success(updatedMoment.hidden ? '已隐藏' : '已取消隐藏');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('操作失败，请稍后重试');
    }
  };

  /**
   * 处理批量隐藏/显示
   * 批量设置多条动态的隐藏状态
   */
  const handleBatchHidden = async (hidden: boolean) => {
    try {
      const result = await batchToggleMomentHidden(selectedIds, hidden);
      if (result.success) {
        toast.success(result.message);
        // 更新本地状态
        setMoments(prev => prev.map(m =>
          selectedIds.includes(m.id) ? { ...m, hidden } : m
        ));
        setSelectedIds([]);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('操作失败，请稍后重试');
    }
  };

  /**
   * 处理推送动态到 GitHub
   * 根据 showBuildOption 状态决定是直接推送还是构建后推送
   */
  const handlePush = async (id: string) => {
    // 查找对应的动态
    const moment = moments.find(m => m.id === id);
    if (!moment) return;

    // 根据构建选项决定推送方式
    if (showBuildOption) {
      // 构建并推送 - 用于需要重新构建静态页面后部署的场景
      await buildPush(`构建并推送动态: #${moment.id}`, `更新动态: #${moment.id}`);
    } else {
      // 直接推送 - 仅推送源代码，不触发构建
      await push(`更新动态: #${moment.id}`);
    }
  };

  /**
   * 处理批量推送
   * 批量推送多条动态到 GitHub 仓库
   */
  const handleBatchPush = async () => {
    // 根据构建选项决定推送方式
    if (showBuildOption) {
      // 构建并推送
      await buildPush(`构建并批量推送 ${selectedIds.length} 条动态`);
    } else {
      // 直接推送
      await push(`批量推送 ${selectedIds.length} 条动态`);
    }
  };

  /**
   * 处理复制图片链接
   */
  const handleCopyImageUrl = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('链接已复制');
    } else {
      toast.error('复制失败');
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
    if (selectedIds.length === filteredMoments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMoments.map(m => m.id));
    }
  };

  // 未挂载时显示加载状态
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            动态管理
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            管理你的个人动态，记录生活点滴
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/moments/edit"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            发布动态
          </Link>
        </div>
      </div>

      {/* GitHub 推送状态显示区域 - 显示当前推送状态和结果 */}
      {(pushing || lastResult) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 backdrop-blur-md ${
            isDark
              ? 'bg-blue-900/20 border border-blue-700/30'
              : 'bg-blue-50 border border-blue-200/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 推送中显示加载动画 */}
              {pushing && (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {building ? '正在构建并推送...' : '正在推送...'}
                  </span>
                </>
              )}
              {/* 推送完成显示结果 */}
              {!pushing && lastResult && (
                <>
                  {lastResult.success ? (
                    <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                  ) : (
                    <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                  )}
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    {lastResult.message}
                  </span>
                </>
              )}
            </div>
            {/* 显示构建进度信息 */}
            {building && lastResult && (
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {lastResult.message}
              </span>
            )}
          </div>
        </motion.div>
      )}

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
              placeholder="搜索动态内容、ID 或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
          </div>

          {/* 标签筛选 */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
            } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
          >
            <option value="">全部标签</option>
            {initialTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {/* 置顶状态筛选 */}
          <select
            value={pinnedFilter}
            onChange={(e) => setPinnedFilter(e.target.value as 'all' | 'pinned' | 'unpinned')}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
            } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
          >
            <option value="all">全部状态</option>
            <option value="pinned">已置顶</option>
            <option value="unpinned">未置顶</option>
          </select>

          {/* 隐藏状态筛选 */}
          <select
            value={hiddenFilter}
            onChange={(e) => setHiddenFilter(e.target.value as 'all' | 'hidden' | 'visible')}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
            } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
          >
            <option value="all">全部可见性</option>
            <option value="hidden">已隐藏</option>
            <option value="visible">可见</option>
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
              已选择 {selectedIds.length} 条动态
            </span>
            {/* 推送前构建选项 - 勾选后批量推送时会先构建再推送 */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showBuildOption}
                onChange={(e) => setShowBuildOption(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                推送前构建
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => handleBatchPinned(true)}
            >
              批量置顶
            </AdminButton>
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => handleBatchPinned(false)}
            >
              取消置顶
            </AdminButton>
            {/* 批量隐藏按钮 */}
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => handleBatchHidden(true)}
            >
              批量隐藏
            </AdminButton>
            {/* 批量显示按钮 */}
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => handleBatchHidden(false)}
            >
              批量显示
            </AdminButton>
            {/* 批量推送按钮 - 将选中的动态推送到 GitHub 仓库 */}
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => handleBatchPush()}
              disabled={pushing}
            >
              <Upload className="w-4 h-4 mr-1" />
              {building ? '构建中...' : '批量推送'}
            </AdminButton>
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

      {/* 动态列表 */}
      {filteredMoments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl backdrop-blur-md bg-card/85 border border-border shadow-sm"
        >
          <AdminEmptyState
            icon={<FileText className="w-12 h-12" />}
            title="暂无动态"
            description={
              searchQuery || selectedTag || pinnedFilter !== 'all' || hiddenFilter !== 'all'
                ? '没有找到符合条件的动态'
                : '开始发布你的第一条动态吧'
            }
            action={
              !searchQuery && !selectedTag && pinnedFilter === 'all' && hiddenFilter === 'all' ? (
                <Link
                  href="/admin/moments/edit"
                  className="inline-flex items-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  发布动态
                </Link>
              ) : undefined
            }
          />
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredMoments.map((moment, index) => (
            <motion.div
              key={moment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.05 }}
              className={`rounded-xl p-4 backdrop-blur-md ${
                isDark
                  ? 'bg-gray-800/50 border border-gray-700/50'
                  : 'bg-white/70 border border-gray-200/50'
              } shadow-lg ${
                selectedIds.includes(moment.id) 
                  ? 'ring-2 ring-[#66ccff]' 
                  : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* 选择框 */}
                <button
                  onClick={() => toggleSelection(moment.id)}
                  className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    selectedIds.includes(moment.id)
                      ? 'bg-[#66ccff] border-[#66ccff] text-white'
                      : isDark
                        ? 'border-gray-600 hover:border-[#66ccff]'
                        : 'border-gray-300 hover:border-[#66ccff]'
                  }`}
                >
                  {selectedIds.includes(moment.id) && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0">
                  {/* 头部信息 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        #{moment.id}
                      </span>
                      {/* 置顶标识 */}
                      {moment.pinned && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isDark 
                            ? 'bg-yellow-900/30 text-yellow-400' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <Pin className="w-3 h-3 mr-1" />
                          置顶
                        </span>
                      )}
                      {/* 隐藏状态标识：使用 EyeOff 图标表示已隐藏 */}
                      {moment.hidden && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isDark 
                            ? 'bg-gray-700/50 text-gray-400' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          <EyeOff className="w-3 h-3 mr-1" />
                          已隐藏
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-sm">
                      <Clock className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        {formatDateTime(moment.time)}
                      </span>
                    </div>
                  </div>

                  {/* 内容预览 */}
                  <p className={`mb-3 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {moment.content.substring(0, 150)}
                    {moment.content.length > 150 && '...'}
                  </p>

                  {/* 标签 */}
                  {moment.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {moment.tags.map(tag => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                            isDark
                              ? 'bg-[#66ccff]/20 text-[#66ccff]'
                              : 'bg-[#66ccff]/10 text-[#66ccff]'
                          }`}
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 图片预览 */}
                  {moment.images && moment.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 mb-3">
                      {moment.images.map((img, imgIndex) => (
                        <button
                          key={imgIndex}
                          onClick={() => setImagePreview({
                            open: true,
                            images: moment.images || [],
                            currentIndex: imgIndex,
                          })}
                          className="relative aspect-square rounded-lg overflow-hidden group"
                        >
                          <img
                            src={img}
                            alt={`图片 ${imgIndex + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      {/* 置顶/取消置顶按钮 */}
                      <button
                        onClick={() => handleTogglePinned(moment.id)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                          moment.pinned
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : isDark
                              ? 'text-gray-400 hover:text-yellow-400'
                              : 'text-gray-500 hover:text-yellow-500'
                        }`}
                      >
                        {moment.pinned ? (
                          <>
                            <PinOff className="w-4 h-4" />
                            <span>取消置顶</span>
                          </>
                        ) : (
                          <>
                            <Pin className="w-4 h-4" />
                            <span>置顶</span>
                          </>
                        )}
                      </button>
                      {/* 隐藏/显示按钮：切换动态的可见性 */}
                      <button
                        onClick={() => handleToggleHidden(moment.id)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                          moment.hidden
                            ? 'text-gray-500 hover:text-[#66ccff]'
                            : isDark
                              ? 'text-gray-400 hover:text-gray-500'
                              : 'text-gray-500 hover:text-gray-600'
                        }`}
                      >
                        {moment.hidden ? (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>显示</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4" />
                            <span>隐藏</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Link
                        href={`/admin/moments/edit?id=${moment.id}`}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark
                            ? 'text-gray-400 hover:text-[#66ccff] hover:bg-gray-700'
                            : 'text-gray-500 hover:text-[#66ccff] hover:bg-gray-100'
                        }`}
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {/* 推送按钮：将动态内容推送到 GitHub 仓库 */}
                      <button
                        onClick={() => handlePush(moment.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark
                            ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-blue-500 hover:bg-gray-100'
                        }`}
                        title="推送到 GitHub"
                        disabled={pushing}
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm([moment.id])}
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
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <AdminConfirm
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, ids: [], loading: false })}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除选中的 ${deleteConfirm.ids.length} 条动态吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={deleteConfirm.loading}
      />

      {/* 图片预览弹窗 */}
      <AdminModal
        open={imagePreview.open}
        onClose={() => setImagePreview({ open: false, images: [], currentIndex: 0 })}
        title="图片预览"
        width="max-w-4xl"
      >
        <div className="p-4">
          <img
            src={imagePreview.images[imagePreview.currentIndex]}
            alt="预览图片"
            className="w-full max-h-[70vh] object-contain rounded-lg"
          />
          <div className="flex items-center justify-between mt-4">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {imagePreview.currentIndex + 1} / {imagePreview.images.length}
            </span>
            <div className="flex items-center space-x-2">
              <AdminButton
                type="secondary"
                size="sm"
                onClick={() => handleCopyImageUrl(imagePreview.images[imagePreview.currentIndex])}
              >
                复制链接
              </AdminButton>
              {imagePreview.currentIndex > 0 && (
                <AdminButton
                  type="secondary"
                  size="sm"
                  onClick={() => setImagePreview(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }))}
                >
                  上一张
                </AdminButton>
              )}
              {imagePreview.currentIndex < imagePreview.images.length - 1 && (
                <AdminButton
                  type="secondary"
                  size="sm"
                  onClick={() => setImagePreview(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }))}
                >
                  下一张
                </AdminButton>
              )}
            </div>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
