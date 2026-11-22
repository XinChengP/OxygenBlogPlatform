'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Save,
  ArrowLeft,
  Image as ImageIcon,
  Tag,
  FolderOpen,
  Calendar,
  Settings,
  Upload,
  X,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  AdminButton,
  AdminModal,
  AdminConfirm,
  toast,
} from '@/components/admin';
import { getBlogDetail, createBlog, updateBlog, BlogPostData } from '@/actions/blogActions';
import { getDraft, saveDraft, clearDraft } from '@/utils/adminUtils';
import { categories as blogCategories } from '@/setting/blogSetting';

// 动态导入 Markdown 编辑器组件
const MarkdownEditor = dynamic(() => import('@/components/tools/MarkdownEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
    </div>
  ),
});

/**
 * 文章表单数据接口
 */
interface BlogFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverImage: string;
  date: string;
  updatedAt: string;
}

/**
 * 表单验证错误接口
 */
interface FormErrors {
  title?: string;
  category?: string;
  content?: string;
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD 格式）
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 文章编辑页面内容组件
 */
function BlogEditContent() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // 获取文章 ID（如果有）
  const blogId = searchParams.get('id');
  const isEditMode = !!blogId;

  // 表单数据状态
  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: '',
    tags: [],
    coverImage: '',
    date: getTodayDate(),
    updatedAt: '',
  });

  // 表单验证错误
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  // 标签输入状态
  const [tagInput, setTagInput] = useState('');
  // 保存状态
  const [isSaving, setIsSaving] = useState(false);
  // 发布状态
  const [isPublishing, setIsPublishing] = useState(false);
  // 设置面板显示状态
  const [showSettings, setShowSettings] = useState(true);
  // 自动保存定时器引用
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 是否有未保存的更改
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // 图片选择弹窗状态
  const [showImagePicker, setShowImagePicker] = useState(false);
  // 离开确认弹窗状态
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 离开确认回调
  const leaveConfirmCallback = useRef<(() => void) | null>(null);
  // 加载状态
  const [loading, setLoading] = useState(isEditMode);
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  // 是否有可用的草稿（用于新建模式提示用户）
  const [hasDraft, setHasDraft] = useState(false);

  /**
   * 处理表单字段变化
   */
  const handleFieldChange = useCallback((field: keyof BlogFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setFormErrors(prev => {
      if (prev[field as keyof FormErrors]) {
        return { ...prev, [field]: undefined };
      }
      return prev;
    });
  }, []);

  /**
   * 处理内容变化
   */
  const handleContentChange = useCallback((content: string) => {
    handleFieldChange('content', content);
  }, [handleFieldChange]);

  /**
   * 添加标签
   */
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      handleFieldChange('tags', [...formData.tags, tag]);
    }
    setTagInput('');
  }, [tagInput, formData.tags, handleFieldChange]);

  /**
   * 移除标签
   */
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    handleFieldChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  }, [formData.tags, handleFieldChange]);

  /**
   * 处理标签输入键盘事件
   */
  const handleTagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  /**
   * 验证表单
   */
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!formData.title.trim()) {
      errors.title = '请输入文章标题';
    }

    if (!formData.category) {
      errors.category = '请选择文章分类';
    }

    if (!formData.content.trim()) {
      errors.content = '请输入文章内容';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  /**
   * 保存草稿
   */
  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);

    try {
      saveDraft('blog', JSON.stringify(formData));
      setHasUnsavedChanges(false);
      toast.success('草稿保存成功');
    } catch (err) {
      console.error('保存草稿失败:', err);
      toast.error('保存草稿失败');
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  /**
   * 发布文章（保存到本地）
   */
  const handlePublish = useCallback(async () => {
    if (!validateForm()) {
      toast.warning('请完善文章信息');
      return;
    }

    setIsPublishing(true);

    try {
      const blogData: BlogPostData = {
        title: formData.title,
        content: formData.content,
        date: formData.date || getTodayDate(),
        category: formData.category,
        tags: formData.tags,
        excerpt: formData.excerpt || formData.content.substring(0, 150),
        coverImage: formData.coverImage,
        slug: formData.slug,
      };

      let result;
      if (isEditMode && blogId) {
        result = await updateBlog(blogId, blogData);
      } else {
        result = await createBlog(blogData);
      }

      if (result.success) {
        toast.success(result.message);
        clearDraft('blog');
        setHasUnsavedChanges(false);
        router.push('/admin/blogs');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('发布失败:', err);
      toast.error('发布失败，请稍后重试');
    } finally {
      setIsPublishing(false);
    }
  }, [formData, isEditMode, blogId, router, validateForm]);

  /**
   * 处理返回操作
   */
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      leaveConfirmCallback.current = () => router.push('/admin/blogs');
      setShowLeaveConfirm(true);
    } else {
      router.push('/admin/blogs');
    }
  }, [hasUnsavedChanges, router]);

  /**
   * 确认离开
   */
  const confirmLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    leaveConfirmCallback.current?.();
  }, []);

  /**
   * 取消离开
   */
  const cancelLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    leaveConfirmCallback.current = null;
  }, []);

  /**
   * 组件挂载后设置状态
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 加载博客详情（编辑模式）
   */
  useEffect(() => {
    async function loadBlog() {
      if (isEditMode && blogId) {
        setLoading(true);
        const result = await getBlogDetail(blogId);
        if (result.success && result.data && !Array.isArray(result.data)) {
          const blog = result.data;
          setFormData({
            title: blog.title || '',
            slug: blog.id || '',
            content: blog.content || '',
            excerpt: blog.excerpt || '',
            category: blog.category || '',
            tags: blog.tags || [],
            coverImage: blog.coverImage || '',
            date: blog.date || getTodayDate(),
            updatedAt: blog.updatedAt || '',
          });
        } else {
          setError(result.message);
        }
        setLoading(false);
      } else {
        // 新建模式：清除之前的表单状态，显示空白编辑器
        // 注意：不再自动恢复草稿，用户需要手动选择是否恢复
        setFormData({
          title: '',
          slug: '',
          content: '',
          excerpt: '',
          category: '',
          tags: [],
          coverImage: '',
          date: getTodayDate(),
          updatedAt: '',
        });

        // 检查是否有可用的草稿（仅用于提示用户）
        const savedDraft = getDraft('blog');
        setHasDraft(!!savedDraft);

        setLoading(false);
      }
    }

    loadBlog();
  }, [isEditMode, blogId]);

  /**
   * 恢复草稿的函数
   * 用户点击恢复草稿按钮时调用
   */
  const handleRestoreDraft = useCallback(() => {
    const savedDraft = getDraft('blog');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setFormData(prev => ({
          ...prev,
          ...draftData,
        }));
        toast.info('已恢复未保存的草稿');
        setHasDraft(false); // 草稿已恢复，不再显示提示
      } catch {
        toast.error('草稿解析失败');
      }
    }
  }, []);

  /**
   * 自动保存草稿
   */
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (hasUnsavedChanges && formData.title) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft('blog', JSON.stringify(formData));
        toast.success('草稿已自动保存');
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, hasUnsavedChanges]);

  /**
   * 页面离开提示
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const isDark = resolvedTheme === 'dark';

  // 未挂载时显示加载状态
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
      </div>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          加载失败
        </h2>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {error}
        </p>
        <AdminButton type="primary" onClick={() => router.push('/admin/blogs')}>
          返回列表
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className={`p-2 rounded-lg ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            } transition-colors`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEditMode ? '编辑文章' : '撰写文章'}
            </h1>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isEditMode ? '修改已发布的文章内容' : '创建一篇新的博客文章'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 仅在新建模式且有草稿时显示恢复草稿按钮 */}
          {!isEditMode && hasDraft && (
            <AdminButton
              type="secondary"
              onClick={handleRestoreDraft}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              恢复草稿
            </AdminButton>
          )}

          {hasUnsavedChanges && (
            <span className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
              有未保存的更改
            </span>
          )}
          
          <AdminButton
            type="secondary"
            onClick={handleSaveDraft}
            loading={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            保存草稿
          </AdminButton>
          
          <AdminButton
            type="primary"
            onClick={handlePublish}
            loading={isPublishing}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isEditMode ? '更新文章' : '发布文章'}
          </AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 编辑器主区域 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 标题输入 */}
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
            <input
              type="text"
              placeholder="输入文章标题..."
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className={`w-full text-2xl font-bold bg-transparent border-none focus:outline-none ${
                isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
            />
            {formErrors.title && (
              <p className="mt-2 text-sm text-red-500">{formErrors.title}</p>
            )}
          </motion.div>

          {/* Markdown 编辑器 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`rounded-xl overflow-hidden backdrop-blur-md ${
              isDark
                ? 'bg-gray-800/50 border border-gray-700/50'
                : 'bg-white/70 border border-gray-200/50'
            } shadow-lg`}
          >
            <MarkdownEditor
              initialContent={formData.content}
              onContentChange={handleContentChange}
              height="500px"
              blogMode={true}
            />
            {formErrors.content && (
              <p className="px-4 pb-4 text-sm text-red-500">{formErrors.content}</p>
            )}
          </motion.div>
        </div>

        {/* 右侧设置面板 */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className={`rounded-xl backdrop-blur-md sticky top-24 ${
              isDark
                ? 'bg-gray-800/50 border border-gray-700/50'
                : 'bg-white/70 border border-gray-200/50'
            } shadow-lg`}
          >
            {/* 面板标题 */}
            <div
              className={`flex items-center justify-between px-4 py-3 border-b cursor-pointer ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}
              onClick={() => setShowSettings(!showSettings)}
            >
              <div className="flex items-center space-x-2">
                <Settings className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  文章设置
                </span>
              </div>
              {showSettings ? (
                <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              )}
            </div>

            {/* 设置内容 */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-6">
                    {/* 文章别名 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        文章别名
                      </label>
                      <input
                        type="text"
                        placeholder="url-slug"
                        value={formData.slug}
                        onChange={(e) => handleFieldChange('slug', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark
                            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
                        } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                      />
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        用于 URL 显示，留空将自动生成
                      </p>
                    </div>

                    {/* 发布日期 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        发布日期
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleFieldChange('date', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark
                            ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                            : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
                        } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                      />
                    </div>

                    {/* 文章分类 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <FolderOpen className="w-4 h-4 inline mr-1" />
                        文章分类 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleFieldChange('category', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark
                            ? 'bg-gray-700/50 border-gray-600 text-white focus:border-[#66ccff]'
                            : 'bg-white border-gray-200 text-gray-900 focus:border-[#66ccff]'
                        } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all ${
                          formErrors.category ? 'border-red-500' : ''
                        }`}
                      >
                        <option value="">选择分类</option>
                        {blogCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {formErrors.category && (
                        <p className="mt-1 text-xs text-red-500">{formErrors.category}</p>
                      )}
                    </div>

                    {/* 文章标签 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <Tag className="w-4 h-4 inline mr-1" />
                        文章标签
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map(tag => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              isDark
                                ? 'bg-[#66ccff]/20 text-[#66ccff]'
                                : 'bg-[#66ccff]/10 text-[#66ccff]'
                            }`}
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="输入标签"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                            isDark
                              ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
                          } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                        />
                        <button
                          onClick={handleAddTag}
                          className="px-3 py-2 bg-[#66ccff] text-white rounded-lg text-sm hover:bg-[#66ccff]/90 transition-colors"
                        >
                          添加
                        </button>
                      </div>
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        按 Enter 键快速添加标签
                      </p>
                    </div>

                    {/* 封面图片 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <ImageIcon className="w-4 h-4 inline mr-1" />
                        封面图片
                      </label>
                      {formData.coverImage ? (
                        <div className="relative">
                          <img
                            src={formData.coverImage}
                            alt="封面预览"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleFieldChange('coverImage', '')}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowImagePicker(true)}
                          className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                            isDark
                              ? 'border-gray-600 hover:border-[#66ccff] text-gray-500'
                              : 'border-gray-200 hover:border-[#66ccff] text-gray-400'
                          }`}
                        >
                          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">点击选择封面图片</p>
                        </button>
                      )}
                    </div>

                    {/* 文章摘要 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        文章摘要
                      </label>
                      <textarea
                        placeholder="输入文章摘要..."
                        value={formData.excerpt}
                        onChange={(e) => handleFieldChange('excerpt', e.target.value)}
                        rows={3}
                        className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                          isDark
                            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
                        } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
                      />
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        留空将自动从内容中提取
                      </p>
                    </div>

                    {/* 更新时间（仅编辑模式显示） */}
                    {isEditMode && formData.updatedAt && (
                      <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                            上次更新: {new Date(formData.updatedAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* 图片选择弹窗 */}
      <AdminModal
        open={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        title="选择封面图片"
        width="max-w-3xl"
      >
        <div className="p-4">
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            请输入图片 URL 或从图床选择
          </p>
          
          {/* URL 输入 */}
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              placeholder="输入图片 URL..."
              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const url = (e.target as HTMLInputElement).value;
                  if (url) {
                    handleFieldChange('coverImage', url);
                    setShowImagePicker(false);
                  }
                }
              }}
            />
            <AdminButton
              type="primary"
              onClick={() => {
                const input = document.querySelector('input[placeholder="输入图片 URL..."]') as HTMLInputElement;
                if (input && input.value) {
                  handleFieldChange('coverImage', input.value);
                  setShowImagePicker(false);
                }
              }}
            >
              确认
            </AdminButton>
          </div>

          {/* 图床链接 */}
          <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Link
              href="/admin/gallery/local"
              target="_blank"
              className={`inline-flex items-center text-sm text-[#66ccff] hover:underline`}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              前往图床管理上传图片
            </Link>
          </div>
        </div>
      </AdminModal>

      {/* 离开确认弹窗 */}
      <AdminConfirm
        open={showLeaveConfirm}
        onClose={cancelLeave}
        onConfirm={confirmLeave}
        title="确认离开"
        message="您有未保存的更改，确定要离开吗？"
        confirmText="离开"
        cancelText="取消"
        type="warning"
      />
    </div>
  );
}

/**
 * 文章编辑页面
 * 包装 Suspense 以支持 useSearchParams
 */
export default function BlogEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
        </div>
      }
    >
      <BlogEditContent />
    </Suspense>
  );
}
