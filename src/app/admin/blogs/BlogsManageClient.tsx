'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Tag,
  FolderOpen,
  CheckCircle,
  Clock,
  MoreVertical,
  Filter,
  X,
  ChevronDown,
  FileText,
  AlertCircle,
  ExternalLink,
  Upload,
  Pin,
} from 'lucide-react';
import {
  AdminTable,
  AdminSearchBar,
  AdminButton,
  AdminConfirm,
  AdminModal,
  AdminCard,
  AdminEmptyState,
  toast,
} from '@/components/admin';
import useAdminBlogs, { UseAdminBlogsOptions, FilterOptions, BlogPost } from '@/hooks/useAdminBlogs';
import { deleteBlog, batchDeleteBlogs, updateBlog, batchUpdateBlogCategory, toggleBlogHidden, batchToggleBlogHidden } from '@/actions/blogActions';
import { useGitHubPush } from '@/hooks/useGitHubPush';
import { GitPushResult } from '@/actions/githubActions';

/**
 * 文章状态类型
 */
type BlogStatus = 'published' | 'draft';

/**
 * 获取文章状态
 */
function getBlogStatus(blog: BlogPost): BlogStatus {
  return 'published';
}

/**
 * 获取状态样式配置
 */
function getStatusConfig(status: BlogStatus) {
  const configs = {
    published: {
      label: '已发布',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-700 dark:text-green-400',
      icon: CheckCircle,
    },
    draft: {
      label: '草稿',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
      textClass: 'text-yellow-700 dark:text-yellow-400',
      icon: Clock,
    },
  };
  return configs[status];
}

/**
 * 客户端组件 Props
 */
interface BlogsManageClientProps {
  initialBlogs: BlogPost[];
  initialFilterOptions: FilterOptions;
}

/**
 * 文章管理页面客户端组件
 */
export default function BlogsManageClient({ 
  initialBlogs, 
  initialFilterOptions 
}: BlogsManageClientProps) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 筛选条件状态
  const [filters, setFilters] = useState<UseAdminBlogsOptions>({
    category: '',
    tag: '',
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    startDate: '',
    endDate: '',
    initialBlogs,
    initialFilterOptions,
  });

  // 使用 Hook 获取博客数据
  const {
    blogs,
    loading,
    error,
    filterOptions,
    refresh,
    updateFilters,
  } = useAdminBlogs(filters);

  // GitHub 推送 Hook，用于将博客内容推送到 GitHub 仓库
  const { pushing, building, lastResult, refreshStatus, push, buildPush } = useGitHubPush();

  // 是否显示构建选项复选框的状态，控制推送时是否先进行构建
  const [showBuildOption, setShowBuildOption] = useState(false);

  // 选中的文章 ID 集合
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // 删除确认弹窗状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    ids: string[];
    loading: boolean;
  }>({
    open: false,
    ids: [],
    loading: false,
  });
  // 批量修改分类弹窗状态
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    ids: string[];
    newCategory: string;
    loading: boolean;
  }>({
    open: false,
    ids: [],
    newCategory: '',
    loading: false,
  });
  // 高级筛选面板显示状态
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  // 隐藏状态筛选：'all' 显示全部，'hidden' 只显示已隐藏，'visible' 只显示可见
  const [hiddenFilter, setHiddenFilter] = useState<'all' | 'hidden' | 'visible'>('all');

  const isDark = resolvedTheme === 'dark';

  /**
   * 根据隐藏状态筛选后的博客列表
   * 在 useAdminBlogs 返回的 blogs 基础上进行二次筛选
   */
  const displayBlogs = useMemo(() => {
    if (hiddenFilter === 'all') {
      return blogs;
    }
    if (hiddenFilter === 'hidden') {
      return blogs.filter(blog => blog.hidden === true);
    }
    // hiddenFilter === 'visible'
    return blogs.filter(blog => blog.hidden !== true);
  }, [blogs, hiddenFilter]);

  /**
   * 组件挂载后设置状态并刷新 Git 状态
   * refreshStatus 用于获取当前的 Git 提交状态信息
   */
  useEffect(() => {
    setMounted(true);
    // 刷新 Git 状态，获取最新的提交信息
    refreshStatus();
  }, [refreshStatus]);

  /**
   * 处理搜索变化
   */
  const handleSearchChange = (value: string) => {
    updateFilters({ search: value });
  };

  /**
   * 处理筛选器变化
   */
  const handleFilterChange = (newFilters: Record<string, string>) => {
    const updates: Partial<UseAdminBlogsOptions> = {};

    if (newFilters.category !== undefined) {
      updates.category = newFilters.category;
    }
    if (newFilters.tag !== undefined) {
      updates.tag = newFilters.tag;
    }

    updateFilters(updates);
  };

  /**
   * 处理日期范围变化
   */
  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    updateFilters({ [field]: value });
  };

  /**
   * 处理排序变化
   */
  const handleSortChange = (sortBy: 'date' | 'title', sortOrder: 'asc' | 'desc') => {
    updateFilters({ sortBy, sortOrder });
  };

  /**
   * 处理选择变化
   */
  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
  };

  /**
   * 清除所有筛选条件
   */
  const handleClearFilters = () => {
    setFilters({
      category: '',
      tag: '',
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
      startDate: '',
      endDate: '',
      initialBlogs,
      initialFilterOptions,
    });
    setHiddenFilter('all'); // 重置隐藏状态筛选
    setSelectedIds([]);
  };

  /**
   * 处理删除文章
   */
  const handleDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));

    try {
      const result = await batchDeleteBlogs(deleteConfirm.ids);
      
      if (result.success) {
        toast.success(result.message);
        setDeleteConfirm({ open: false, ids: [], loading: false });
        setSelectedIds([]);
        refresh();
      } else {
        toast.error(result.message);
        setDeleteConfirm(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      toast.error('删除失败，请稍后重试');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  /**
   * 处理批量修改分类
   */
  const handleBatchCategoryChange = async () => {
    if (!categoryModal.newCategory) {
      toast.warning('请选择新分类');
      return;
    }

    setCategoryModal(prev => ({ ...prev, loading: true }));

    try {
      const result = await batchUpdateBlogCategory(categoryModal.ids, categoryModal.newCategory);
      
      if (result.success) {
        toast.success(result.message);
        setCategoryModal({ open: false, ids: [], newCategory: '', loading: false });
        setSelectedIds([]);
        refresh();
      } else {
        toast.error(result.message);
        setCategoryModal(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      toast.error('修改分类失败，请稍后重试');
      setCategoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  /**
   * 跳转到文章编辑页面
   */
  const handleEdit = (id: string) => {
    router.push(`/admin/blogs/edit?id=${id}`);
  };

  /**
   * 跳转到文章详情页面（前台）
   */
  const handleView = (id: string) => {
    window.open(`/blogs/${id}`, '_blank');
  };

  /**
   * 打开删除确认弹窗
   */
  const openDeleteConfirm = (ids: string[]) => {
    setDeleteConfirm({ open: true, ids, loading: false });
  };

  /**
   * 打开批量修改分类弹窗
   */
  const openCategoryModal = (ids: string[]) => {
    setCategoryModal({ open: true, ids, newCategory: '', loading: false });
  };

  /**
   * 切换单篇文章的隐藏状态
   * 调用 toggleBlogHidden 函数，成功后刷新列表
   * @param id 文章 ID
   */
  const handleToggleHidden = async (id: string) => {
    try {
      const result = await toggleBlogHidden(id);
      if (result.success) {
        toast.success(result.message);
        refresh(); // 刷新列表以显示最新状态
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('切换隐藏状态失败，请稍后重试');
    }
  };

  /**
   * 批量切换文章隐藏状态
   * 调用 batchToggleBlogHidden 函数，成功后刷新列表
   * @param ids 文章 ID 数组
   * @param hidden 目标隐藏状态，true 为隐藏，false 为显示
   */
  const handleBatchToggleHidden = async (ids: string[], hidden: boolean) => {
    try {
      const result = await batchToggleBlogHidden(ids, hidden);
      if (result.success) {
        toast.success(result.message);
        setSelectedIds([]); // 清空选择
        refresh(); // 刷新列表以显示最新状态
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('批量操作失败，请稍后重试');
    }
  };

  /**
   * 处理推送单篇博客到 GitHub
   * 根据 showBuildOption 状态决定是直接推送还是构建后推送
   * @param id 博客 ID
   */
  const handlePush = async (id: string) => {
    // 从博客列表中查找对应的博客文章
    const blog = blogs.find(b => b.id === id);
    if (!blog) return;

    // 根据用户选择的构建选项，决定是直接推送还是构建后推送
    if (showBuildOption) {
      // 构建并推送模式：先执行构建操作，然后推送到 GitHub
      await buildPush(`构建并推送博客: ${blog.title}`, `更新博客: ${blog.title}`);
    } else {
      // 直接推送模式：仅将更改推送到 GitHub 仓库
      await push(`更新博客: ${blog.title}`);
    }
  };

  /**
   * 处理批量推送博客到 GitHub
   * 根据 showBuildOption 状态决定是直接推送还是构建后推送
   */
  const handleBatchPush = async () => {
    // 根据用户选择的构建选项，决定是直接推送还是构建后推送
    if (showBuildOption) {
      // 构建并推送模式：先执行构建操作，然后批量推送到 GitHub
      await buildPush(`构建并批量推送 ${selectedIds.length} 篇博客`);
    } else {
      // 直接推送模式：批量将更改推送到 GitHub 仓库
      await push(`批量推送 ${selectedIds.length} 篇博客`);
    }
  };

  // 表格列配置
  const columns = [
    {
      key: 'title',
      title: '标题',
      sortable: true,
      width: '200px',
      render: (value: string, record: BlogPost) => (
        <div className="max-w-[180px]">
          <div className="flex items-center gap-1.5">
            {Boolean(record.pinned) && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500 text-white shadow-sm shrink-0"
                title="置顶文章"
              >
                <Pin className="w-3 h-3 mr-0.5" />
                置顶
              </span>
            )}
            <h3 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {value.length > 18 ? value.slice(0, 18) + '...' : value}
            </h3>
          </div>
          <p className={`text-sm truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {record.excerpt && record.excerpt.length > 25 ? record.excerpt.slice(0, 25) + '...' : record.excerpt}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      title: '分类',
      width: '100px',
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
        }`}>
          <FolderOpen className="w-3 h-3 mr-1" />
          <span className="truncate">{value}</span>
        </span>
      ),
    },
    {
      key: 'tags',
      title: '标签',
      width: '120px',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1 max-w-[110px]">
          {value.slice(0, 2).map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${
                isDark ? 'bg-[#66ccff]/20 text-[#66ccff]' : 'bg-[#66ccff]/10 text-[#66ccff]'
              }`}
            >
              <Tag className="w-2.5 h-2.5 mr-0.5" />
              <span className="truncate max-w-[60px]">{tag}</span>
            </span>
          ))}
          {value.length > 2 && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              +{value.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      title: '发布日期',
      sortable: true,
      width: '100px',
      render: (value: string) => (
        <div className="flex items-center space-x-1 text-sm">
          <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
            {value ? new Date(value).toLocaleDateString('zh-CN') : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      title: '更新日期',
      width: '100px',
      render: (value: string, record: BlogPost) => {
        const date = value || record.date;
        return (
          <div className="flex items-center space-x-1 text-sm">
            <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
              {date ? new Date(date).toLocaleDateString('zh-CN') : '-'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: '状态',
      width: '80px',
      render: (_: unknown, record: BlogPost) => {
        const status = getBlogStatus(record);
        const config = getStatusConfig(status);
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}>
            <Icon className="w-3 h-3 mr-0.5" />
            <span className="truncate">{config.label}</span>
          </span>
        );
      },
    },
    {
      key: 'hidden',
      title: '可见性',
      width: '70px',
      render: (_: unknown, record: BlogPost) => {
        // 根据文章的 hidden 属性显示不同的图标和样式
        if (record.hidden === true) {
          // 已隐藏状态：使用 EyeOff 图标，灰色背景
          return (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
              isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>
              <EyeOff className="w-3 h-3 mr-0.5" />
              <span className="truncate">隐藏</span>
            </span>
          );
        }
        // 可见状态：使用 Eye 图标，绿色背景
        return (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
            isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
          }`}>
            <Eye className="w-3 h-3 mr-0.5" />
            <span className="truncate">可见</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      render: (_: unknown, record: BlogPost) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record.id);
            }}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-[#66ccff] hover:bg-gray-700'
                : 'text-gray-500 hover:text-[#66ccff] hover:bg-gray-100'
            }`}
            title="编辑"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleView(record.id);
            }}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                : 'text-gray-500 hover:text-green-500 hover:bg-gray-100'
            }`}
            title="查看"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          {/* 隐藏/显示按钮：根据当前状态显示不同的图标和提示 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleHidden(record.id);
            }}
            className={`p-1 rounded-lg transition-colors ${
              record.hidden === true
                ? (isDark
                    ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                    : 'text-gray-500 hover:text-green-500 hover:bg-gray-100')
                : (isDark
                    ? 'text-gray-400 hover:text-orange-400 hover:bg-gray-700'
                    : 'text-gray-500 hover:text-orange-500 hover:bg-gray-100')
            }`}
            title={record.hidden === true ? '设为可见' : '设为隐藏'}
          >
            {record.hidden === true ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>
          {/* 推送按钮：将博客文章推送到 GitHub 仓库 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePush(record.id);
            }}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                : 'text-gray-500 hover:text-blue-500 hover:bg-gray-100'
            }`}
            title="推送到 GitHub"
            disabled={pushing}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteConfirm([record.id]);
            }}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
            }`}
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // 筛选器配置
  const filterConfigs = [
    {
      key: 'category',
      label: '分类',
      options: filterOptions.categories.map(cat => ({ value: cat, label: cat })),
    },
    {
      key: 'tag',
      label: '标签',
      options: filterOptions.tags.map(tag => ({ value: tag, label: tag })),
    },
  ];

  // 是否有激活的筛选条件（包含隐藏状态筛选）
  const hasActiveFilters = filters.category || filters.tag || filters.search || filters.startDate || filters.endDate || hiddenFilter !== 'all';

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
            文章管理
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            管理你的博客文章，创建、编辑或删除内容
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/blogs/edit"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            撰写文章
          </Link>
        </div>
      </div>

      {/* GitHub 推送状态显示区域 */}
      {/* 当正在推送或构建时，显示加载状态提示用户操作正在进行中 */}
      {(pushing || building) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-center space-x-3 px-4 py-3 rounded-xl ${
            isDark
              ? 'bg-blue-900/20 border border-blue-800/50'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {building ? '正在构建...' : '正在推送到 GitHub...'}
          </span>
        </motion.div>
      )}

      {/* GitHub 推送结果提示区域 */}
      {/* 当存在推送结果时，显示成功或失败的消息提示 */}
      {lastResult && !pushing && !building && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-center space-x-3 px-4 py-3 rounded-xl ${
            lastResult.success
              ? (isDark
                  ? 'bg-green-900/20 border border-green-800/50'
                  : 'bg-green-50 border border-green-200')
              : (isDark
                  ? 'bg-red-900/20 border border-red-800/50'
                  : 'bg-red-50 border border-red-200')
          }`}
        >
          {lastResult.success ? (
            <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
          ) : (
            <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          )}
          <span className={`text-sm ${lastResult.success ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
            {lastResult.message}
          </span>
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
        {/* 搜索栏 */}
        <AdminSearchBar
          value={filters.search || ''}
          onChange={handleSearchChange}
          placeholder="搜索文章标题、内容或标签..."
          filters={filterConfigs}
          onFilterChange={handleFilterChange}
        />

        {/* 高级筛选按钮 */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center space-x-2 text-sm ${
              isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
            } transition-colors`}
          >
            <Filter className="w-4 h-4" />
            <span>高级筛选</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className={`flex items-center space-x-1 text-sm ${
                isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'
              } transition-colors`}
            >
              <X className="w-4 h-4" />
              <span>清除筛选</span>
            </button>
          )}
        </div>

        {/* 高级筛选面板 */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
                {/* 开始日期 */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
                    } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                  />
                </div>

                {/* 结束日期 */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
                    } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                  />
                </div>

                {/* 排序字段 */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    排序字段
                  </label>
                  <select
                    value={filters.sortBy || 'date'}
                    onChange={(e) => handleSortChange(e.target.value as 'date' | 'title', filters.sortOrder || 'desc')}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
                    } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                  >
                    <option value="date">发布日期</option>
                    <option value="title">标题</option>
                  </select>
                </div>

                {/* 排序方向 */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    排序方向
                  </label>
                  <select
                    value={filters.sortOrder || 'desc'}
                    onChange={(e) => handleSortChange(filters.sortBy || 'date', e.target.value as 'asc' | 'desc')}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
                    } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                  >
                    <option value="desc">降序</option>
                    <option value="asc">升序</option>
                  </select>
                </div>

                {/* 隐藏状态筛选 */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    可见性
                  </label>
                  <select
                    value={hiddenFilter}
                    onChange={(e) => setHiddenFilter(e.target.value as 'all' | 'hidden' | 'visible')}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
                    } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                  >
                    <option value="all">全部</option>
                    <option value="visible">可见</option>
                    <option value="hidden">已隐藏</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              已选择 {selectedIds.length} 篇文章
            </span>
            {/* 推送前构建选项：勾选后将在推送前先执行构建操作 */}
            <label className="flex items-center space-x-2 ml-2">
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
            {/* 批量显示按钮：将选中的文章设为可见 */}
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => handleBatchToggleHidden(selectedIds, false)}
            >
              <Eye className="w-4 h-4 mr-1" />
              批量显示
            </AdminButton>
            {/* 批量隐藏按钮：将选中的文章设为隐藏 */}
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => handleBatchToggleHidden(selectedIds, true)}
            >
              <EyeOff className="w-4 h-4 mr-1" />
              批量隐藏
            </AdminButton>
            <AdminButton
              type="secondary"
              size="sm"
              onClick={() => openCategoryModal(selectedIds)}
            >
              修改分类
            </AdminButton>
            <AdminButton
              type="danger"
              size="sm"
              onClick={() => openDeleteConfirm(selectedIds)}
            >
              批量删除
            </AdminButton>
            {/* 批量推送按钮：将选中的博客文章批量推送到 GitHub 仓库 */}
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
              type="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              取消选择
            </AdminButton>
          </div>
        </motion.div>
      )}

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl ${
            isDark
              ? 'bg-red-900/20 border border-red-800/50'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          <span className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {error}
          </span>
          <button
            onClick={refresh}
            className={`ml-auto text-sm underline ${
              isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'
            }`}
          >
            重试
          </button>
        </motion.div>
      )}

      {/* 文章列表表格 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <AdminTable
          columns={columns}
          data={displayBlogs}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedKeys: selectedIds,
            onChange: handleSelectionChange,
          }}
          onRowClick={(record) => handleEdit(record.id)}
          emptyText={
            <AdminEmptyState
              icon={<FileText className="w-12 h-12" />}
              title="暂无文章"
              description={
                hasActiveFilters ? '没有找到符合条件的文章' : '开始撰写你的第一篇文章吧'
              }
              action={
                !hasActiveFilters ? (
                  <Link
                    href="/admin/blogs/edit"
                    className="inline-flex items-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    撰写文章
                  </Link>
                ) : undefined
              }
            />
          }
        />
      </motion.div>

      {/* 删除确认弹窗 */}
      <AdminConfirm
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, ids: [], loading: false })}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除选中的 ${deleteConfirm.ids.length} 篇文章吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={deleteConfirm.loading}
      />

      {/* 批量修改分类弹窗 */}
      <AdminModal
        open={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, ids: [], newCategory: '', loading: false })}
        title="批量修改分类"
        width="max-w-md"
        footer={
          <>
            <AdminButton
              type="secondary"
              onClick={() => setCategoryModal({ open: false, ids: [], newCategory: '', loading: false })}
            >
              取消
            </AdminButton>
            <AdminButton
              type="primary"
              onClick={handleBatchCategoryChange}
              loading={categoryModal.loading}
            >
              确认修改
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            将为选中的 {categoryModal.ids.length} 篇文章修改分类
          </p>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              选择新分类
            </label>
            <select
              value={categoryModal.newCategory}
              onChange={(e) => setCategoryModal(prev => ({ ...prev, newCategory: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            >
              <option value="">请选择分类</option>
              {filterOptions.categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
