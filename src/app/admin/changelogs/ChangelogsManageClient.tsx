'use client';

/**
 * 更新日志管理客户端组件
 * 提供日志列表展示、筛选、删除等功能
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { History, Edit2, Trash2, Plus, Filter } from 'lucide-react';
import { Changelog, ChangelogType, ChangelogAchievement, getChangelogTypeColor, getChangelogTypeLabel, getAchievementLabel, getAchievementColor, sortAchievementsByPriority, getAchievementDescriptions } from '@/types/changelogTypes';
import AdminCard from '@/components/admin/AdminCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminTable from '@/components/admin/AdminTable';
import AdminConfirm from '@/components/admin/AdminConfirm';
import AdminToast from '@/components/admin/AdminToast';
import { deleteChangelog } from './changelogActions';

/**
 * 组件属性接口
 */
interface ChangelogsManageClientProps {
  changelogs: Changelog[];
}

/**
 * 类型筛选选项
 */
const TYPE_OPTIONS: { value: ChangelogType | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  { value: 'feature', label: '新功能' },
  { value: 'optimize', label: '优化' },
  { value: 'fix', label: '修复' },
  { value: 'docs', label: '文档' },
  { value: 'style', label: '样式' },
  { value: 'refactor', label: '重构' },
];

/**
 * 动画配置
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

/**
 * 更新日志管理客户端组件
 */
export default function ChangelogsManageClient({ changelogs }: ChangelogsManageClientProps) {
  const router = useRouter();

  // 状态管理
  const [filterType, setFilterType] = useState<ChangelogType | 'all'>('all');
  const [filterAchievement, setFilterAchievement] = useState<ChangelogAchievement | 'all'>('all');
  const [filterHasHonor, setFilterHasHonor] = useState<boolean | 'all'>('all');
  /*
    保留一份本地列表：本页是 force-static 渲染，删除后仅 router.refresh()
    不会重新执行服务端数据获取，界面仍会显示已删除的行。
  */
  const [localChangelogs, setLocalChangelogs] = useState<Changelog[]>(changelogs);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [changelogToDelete, setChangelogToDelete] = useState<Changelog | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * 筛选后的日志列表
   */
  const filteredChangelogs = useMemo(() => {
    return localChangelogs.filter(log => {
      // 类型筛选
      if (filterType !== 'all' && log.type !== filterType) return false;

      // 成就筛选
      if (filterAchievement !== 'all') {
        if (!log.achievements || !log.achievements.includes(filterAchievement)) return false;
      }

      // 荣誉筛选
      if (filterHasHonor !== 'all') {
        const hasHonor = log.honors && log.honors.length > 0;
        if (filterHasHonor === true && !hasHonor) return false;
        if (filterHasHonor === false && hasHonor) return false;
      }

      return true;
    });
  }, [localChangelogs, filterType, filterAchievement, filterHasHonor]);

  /**
   * 处理编辑按钮点击
   */
  const handleEdit = useCallback((changelog: Changelog) => {
    router.push(`/admin/changelogs/edit?date=${changelog.date}`);
  }, [router]);

  /**
   * 处理删除按钮点击
   */
  const handleDeleteClick = useCallback((changelog: Changelog) => {
    setChangelogToDelete(changelog);
    setDeleteModalOpen(true);
  }, []);

  /**
   * 确认删除
   */
  const confirmDelete = useCallback(async () => {
    if (!changelogToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteChangelog(changelogToDelete.date);
      if (result.success) {
        setToast({ message: result.message, type: 'success' });
        // 先同步移除本地行，再刷新服务端缓存，保证界面立即一致
        const deletedDate = changelogToDelete.date;
        setLocalChangelogs(prev => prev.filter(log => log.date !== deletedDate));
        router.refresh();
      } else {
        setToast({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setToast({ message: '删除失败', type: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setChangelogToDelete(null);
    }
  }, [changelogToDelete, router]);

  /**
   * 取消删除
   */
  const cancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setChangelogToDelete(null);
  }, []);

  /**
   * 表格列配置
   */
  const columns = useMemo(() => [
    {
      key: 'date',
      title: '日期',
      sortable: true,
      width: '90px',
      render: (value: string) => (
        <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">{value}</span>
      ),
    },
    {
      key: 'type',
      title: '类型',
      width: '60px',
      align: 'center' as const,
      render: (value: ChangelogType) => (
        <span
          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-medium text-white shadow-sm"
          style={{ backgroundColor: getChangelogTypeColor(value) }}
        >
          {getChangelogTypeLabel(value)}
        </span>
      ),
    },
    {
      key: 'content',
      title: '摘要',
      width: '200px',
      render: (value: string) => {
        // 提取纯文本并截断
        const plainText = value
          .replace(/#{1,6}\s/g, '') // 移除Markdown标题
          .replace(/\*\*|\*|__|_/g, '') // 移除粗体斜体
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 转换链接为文本
          .replace(/`{3}[\s\S]*?`{3}/g, '[代码]') // 替换代码块
          .replace(/`([^`]+)`/g, '$1') // 移除行内代码
          .replace(/\n+/g, ' ') // 换行转空格
          .trim();

        const summary = plainText.length > 35 ? plainText.slice(0, 35) + '...' : plainText;
        return <span className="text-gray-600 dark:text-gray-400 truncate block max-w-[200px] text-xs" title={plainText}>{summary || '-'}</span>;
      },
    },
    {
      key: 'honors',
      title: '荣誉',
      width: '80px',
      render: (_: unknown, record: Changelog) => (
        <div className="flex items-center gap-1 flex-wrap">
          {record.honors && record.honors.length > 0 ? (
            record.honors.slice(0, 1).map((honor, index) => {
              // honor.color 兼容两种写法：Tailwind 渐变类，或 #hex/rgb/hsl 颜色值
              const isCssColor = /^(#|rgb|hsl)/.test(honor.color || '');
              return (
                <span
                  key={`honor-${index}`}
                  className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm truncate max-w-[70px] ${
                    isCssColor || !honor.color ? 'bg-[#66ccff]' : honor.color
                  }`}
                  style={isCssColor ? { backgroundColor: honor.color } : undefined}
                  title={honor.name}
                >
                  {honor.name}
                </span>
              );
            })
          ) : (
            <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
          )}
          {record.honors && record.honors.length > 1 && (
            <span className="text-gray-400 text-[10px]">+{record.honors.length - 1}</span>
          )}
        </div>
      ),
    },
    {
      key: 'achievements',
      title: '成就',
      width: '120px',
      render: (_: unknown, record: Changelog) => (
        <div className="flex items-center gap-1 flex-wrap">
          {record.achievements && record.achievements.length > 0 ? (
            sortAchievementsByPriority(record.achievements).slice(0, 2).map((achievement) => (
              <span
                key={achievement}
                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm"
                style={{ backgroundColor: getAchievementColor(achievement) }}
                title={getAchievementLabel(achievement)}
              >
                {getAchievementLabel(achievement)}
              </span>
            ))
          ) : (
            <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
          )}
          {record.achievements && record.achievements.length > 2 && (
            <span className="text-gray-400 text-[10px]">+{record.achievements.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '80px',
      render: (_: unknown, record: Changelog) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(record);
            }}
            className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], [handleEdit, handleDeleteClick]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 页面标题和操作栏 */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-[#66ccff] to-[#4aa8e8] rounded-xl shadow-lg shadow-[#66ccff]/20">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">日志管理</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {changelogs.length} 条更新日志
            </p>
          </div>
        </div>

        <AdminButton
          type="primary"
          onClick={() => router.push('/admin/changelogs/edit')}
          icon={<Plus className="w-4 h-4" />}
        >
          撰写日志
        </AdminButton>
      </motion.div>

      {/* 筛选栏 */}
      <motion.div variants={itemVariants}>
        <AdminCard>
          <div className="space-y-4">
            {/* 类型筛选 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 min-w-[80px]">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">类型：</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      filterType === option.value
                        ? 'bg-[#66ccff] text-white shadow-md shadow-[#66ccff]/30'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 成就筛选 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 min-w-[80px]">
                <span className="text-sm font-medium">成就：</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterAchievement('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    filterAchievement === 'all'
                      ? 'bg-[#66ccff] text-white shadow-md shadow-[#66ccff]/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  全部
                </button>
                {getAchievementDescriptions().map((achievement) => (
                  <button
                    key={achievement.key}
                    onClick={() => setFilterAchievement(achievement.key)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      filterAchievement === achievement.key
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    style={filterAchievement === achievement.key ? { backgroundColor: achievement.color } : {}}
                    title={achievement.condition}
                  >
                    {achievement.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 荣誉筛选 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 min-w-[80px]">
                <span className="text-sm font-medium">荣誉：</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterHasHonor('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    filterHasHonor === 'all'
                      ? 'bg-[#66ccff] text-white shadow-md shadow-[#66ccff]/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFilterHasHonor(true)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    filterHasHonor === true
                      ? 'text-white shadow-md bg-gradient-to-r from-blue-500 via-sky-400 via-cyan-400 via-blue-400 to-blue-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  有荣誉
                </button>
                <button
                  onClick={() => setFilterHasHonor(false)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    filterHasHonor === false
                      ? 'bg-gray-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  无荣誉
                </button>
              </div>
            </div>
          </div>
        </AdminCard>
      </motion.div>

      {/* 日志列表表格 */}
      <motion.div variants={itemVariants}>
        <AdminCard>
          <AdminTable
            columns={columns}
            data={filteredChangelogs}
            rowKey="date"
            emptyText={
              <div className="flex flex-col items-center py-8">
                <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {filterType === 'all' ? '暂无更新日志' : '该类型下暂无日志'}
                </p>
                <AdminButton
                  type="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.push('/admin/changelogs/edit')}
                >
                  创建第一条日志
                </AdminButton>
              </div>
            }
          />
        </AdminCard>
      </motion.div>

      {/* 删除确认对话框 */}
      <AdminConfirm
        open={deleteModalOpen}
        title="确认删除"
        message={
          changelogToDelete
            ? `确定要删除 ${changelogToDelete.date} 的更新日志吗？此操作不可恢复。`
            : ''
        }
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={confirmDelete}
        onClose={cancelDelete}
        loading={isDeleting}
      />

      {/* Toast 提示 */}
      <AdminToast
        message={toast?.message || ''}
        type={toast?.type || 'success'}
        isVisible={!!toast}
        onClose={() => setToast(null)}
        duration={3000}
      />
    </motion.div>
  );
}
