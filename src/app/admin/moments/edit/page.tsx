'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  ArrowLeft,
  Image as ImageIcon,
  Tag,
  Pin,
  PinOff,
  Clock,
  X,
  AlertCircle,
  Upload,
  GripVertical,
  ExternalLink,
  Type,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  AdminButton,
  AdminConfirm,
  toast,
} from '@/components/admin';
import { 
  getMomentDetail, 
  createMoment, 
  updateMoment, 
  generateNewMomentId,
  MomentData,
} from '@/actions/momentActions';
import { getDraft, saveDraft, clearDraft } from '@/utils/adminUtils';
import { getAvatarPath, name as siteAuthorName } from '@/setting/AboutSetting';
import { uploadEditorImage } from '@/utils/editorImageUpload';

/**
 * 动态表单数据接口
 */
interface MomentFormData {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images: string[];
  pinned: boolean;
}

/**
 * 获取当前时间字符串（YYYY-MM-DD HH:MM:SS 格式）
 * 项目规范要求动态时间精确到秒
 */
function getCurrentTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 动态编辑页面内容组件
 */
function MomentEditContent() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // 获取动态 ID（如果有）
  const momentId = searchParams.get('id');
  const isEditMode = !!momentId;

  // 表单数据状态
  const [formData, setFormData] = useState<MomentFormData>({
    id: '',
    time: getCurrentTime(),
    content: '',
    tags: [],
    images: [],
    pinned: false,
  });

  // 标签输入状态
  const [tagInput, setTagInput] = useState('');
  // 图片 URL 输入状态
  const [imageUrlInput, setImageUrlInput] = useState('');
  // 保存状态
  const [isSaving, setIsSaving] = useState(false);
  // 是否有未保存的更改
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // 离开确认弹窗状态
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 离开确认回调
  const leaveConfirmCallback = useRef<(() => void) | null>(null);
  // 加载状态
  const [loading, setLoading] = useState(isEditMode);
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  // 图片上传状态
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Markdown 预览状态
  const [showPreview, setShowPreview] = useState(false);
  // 内容编辑器引用
  const contentRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 处理表单字段变化
   */
  const handleFieldChange = useCallback((field: keyof MomentFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

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
   * 添加图片
   */
  const handleAddImage = useCallback(() => {
    const url = imageUrlInput.trim();
    if (url && !formData.images.includes(url)) {
      handleFieldChange('images', [...formData.images, url]);
    }
    setImageUrlInput('');
  }, [imageUrlInput, formData.images, handleFieldChange]);

  /**
   * 移除图片
   */
  const handleRemoveImage = useCallback((index: number) => {
    handleFieldChange('images', formData.images.filter((_, i) => i !== index));
  }, [formData.images, handleFieldChange]);

  /**
   * 处理本地图片上传
   */
  const handleLocalImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是有效的图片文件`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过 10MB 大小限制`);
        continue;
      }

      try {
        const uploadFormData = new FormData();
        // 修复：字段名必须与服务端 galleryActions.ts 中 formData.get('file') 保持一致
        uploadFormData.append('file', file);
        const result = await uploadEditorImage(uploadFormData, 'Momentsabout');

        if (result.success) {
          uploadedUrls.push(result.url);
          toast.success(`${file.name} 上传成功`);
        } else {
          toast.error(`${file.name} 上传失败: ${result.message}`);
        }
      } catch (error) {
        console.error('图片上传失败:', error);
        toast.error(`${file.name} 上传失败`);
      }
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => {
        const newImages = [...prev.images, ...uploadedUrls];
        return { ...prev, images: newImages };
      });
      setHasUnsavedChanges(true);
    }

    setIsUploadingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * 触发文件选择
   */
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 预览图片
   */
  const handlePreviewImage = useCallback((image: string) => {
    setPreviewImage(image);
  }, []);

  /**
   * 关闭预览
   */
  const handleClosePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  /**
   * 插入 Markdown 语法
   */
  const insertMarkdown = useCallback((before: string, after: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    const newContent = 
      formData.content.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      formData.content.substring(end);
    
    handleFieldChange('content', newContent);
    
    // 恢复焦点和选区
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }, [formData.content, handleFieldChange]);

  /**
   * 渲染 Markdown 为 HTML
   */
  const renderMarkdown = useCallback((text: string): string => {
    if (!text) return '<p class="text-gray-400">暂无内容</p>';

    /*
      先转义 HTML 再套 Markdown 规则：
      预览使用 dangerouslySetInnerHTML，不转义会让动态正文中的
      <script>、<img onerror> 等标签直接执行。
    */
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // 简单的 Markdown 渲染
    let html = escaped
      // 代码块
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto"><code>$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm">$1</code>')
      // 粗体
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 删除线
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      // 链接：限制为 http(s) 或站内相对路径
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
        const safeUrl = /^(https?:\/\/|\/)/i.test(url) ? url : '#';
        return `<a href="${safeUrl}" class="text-[#66ccff] hover:underline" target="_blank" rel="noopener">${label}</a>`;
      })
      // 图片：同样限制协议
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => {
        const safeUrl = /^(https?:\/\/|\/)/i.test(url) ? url : '';
        return safeUrl ? `<img src="${safeUrl}" alt="${alt}" class="max-w-full h-auto rounded-lg" />` : '';
      })
      // 引用
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#66ccff] pl-4 my-2 text-gray-600 dark:text-gray-400">$1</blockquote>')
      // 列表
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      // 换行
      .replace(/\n/g, '<br />');
    
    // 包装列表
    html = html.replace(/(<li.*<\/li>)/, '<ul class="list-disc my-2">$1</ul>');
    
    return html;
  }, []);

  /**
   * 验证表单
   */
  const validateForm = useCallback((): boolean => {
    if (!formData.content.trim()) {
      toast.warning('请输入动态内容');
      return false;
    }
    return true;
  }, [formData]);

  /**
   * 保存动态
   */
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const momentData: MomentData = {
        time: formData.time,
        content: formData.content,
        tags: formData.tags,
        images: formData.images,
        pinned: formData.pinned,
      };

      let result;
      if (isEditMode && momentId) {
        result = await updateMoment(momentId, momentData);
      } else {
        result = await createMoment(momentData);
      }

      if (result.success) {
        toast.success(result.message);
        clearDraft('moment');
        setHasUnsavedChanges(false);
        router.push('/admin/moments');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('保存失败:', err);
      toast.error('保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  }, [formData, isEditMode, momentId, router, validateForm]);

  /**
   * 处理返回操作
   */
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      leaveConfirmCallback.current = () => router.push('/admin/moments');
      setShowLeaveConfirm(true);
    } else {
      router.push('/admin/moments');
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
   * 加载动态详情（编辑模式）或生成新 ID（创建模式）
   */
  useEffect(() => {
    async function loadData() {
      if (isEditMode && momentId) {
        setLoading(true);
        const result = await getMomentDetail(momentId);
        if (result.success && result.data && !Array.isArray(result.data)) {
          const moment = result.data;
          setFormData({
            id: moment.id,
            time: moment.time,
            content: moment.content,
            tags: moment.tags,
            images: moment.images || [],
            pinned: moment.pinned || false,
          });
        } else {
          setError(result.message);
        }
        setLoading(false);
      } else {
        const newId = await generateNewMomentId();
        const savedDraft = getDraft('moment');
        if (savedDraft) {
          try {
            const draftData = JSON.parse(savedDraft);
            setFormData(prev => ({
              ...prev,
              ...draftData,
              id: newId, // 强制使用新生成的 ID，不使用草稿中的旧 ID，防止覆盖已有动态
            }));
            toast.info('已恢复未保存的草稿');
          } catch {
            setFormData(prev => ({ ...prev, id: newId }));
          }
        } else {
          setFormData(prev => ({ ...prev, id: newId }));
        }
        setLoading(false);
      }
    }

    loadData();
  }, [isEditMode, momentId]);

  /**
   * 新建动态时自动保存草稿
   *
   * 原实现只读取草稿、从不写入，导致「已恢复草稿」提示永远不可达，
   * 用户误关页面也会丢失内容。这里按 1 秒防抖写入 localStorage。
   */
  useEffect(() => {
    if (!mounted || isEditMode) return;

    // 空表单不写入草稿，避免下次打开时恢复出无意义的空内容
    if (!formData.content.trim() && formData.images.length === 0 && formData.tags.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      saveDraft('moment', JSON.stringify(formData));
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, mounted, isEditMode]);

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

  // 未挂载或加载状态
  if (!mounted || loading) {
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
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{error}</p>
        <AdminButton type="primary" onClick={() => router.push('/admin/moments')}>
          返回列表
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className={`p-2.5 rounded-xl transition-all duration-300 ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEditMode ? '编辑动态' : '发布动态'}
            </h1>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isEditMode ? '修改已发布的动态内容' : '分享你的想法和瞬间'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className={`text-sm flex items-center ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
              未保存
            </span>
          )}
          <AdminButton type="primary" onClick={handleSave} loading={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? '保存修改' : '发布动态'}
          </AdminButton>
        </div>
      </motion.div>

      {/* 主编辑区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：主要内容 */}
        <div className="lg:col-span-8 space-y-6">
          {/* 动态内容编辑 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl p-6 backdrop-blur-md ${
              isDark
                ? 'bg-gray-800/50 border border-gray-700/50'
                : 'bg-white/70 border border-gray-200/50'
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-[#66ccff]/20' : 'bg-[#66ccff]/10'}`}>
                  <Type className="w-5 h-5 text-[#66ccff]" />
                </div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  动态内容
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                  Markdown
                </span>
              </div>
              
              {/* 预览切换 */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showPreview
                    ? 'bg-[#66ccff] text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showPreview ? '编辑' : '预览'}
              </button>
            </div>
            
            {/* Markdown 工具栏 */}
            {!showPreview && (
              <div className={`flex flex-wrap gap-1 mb-3 p-2 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                {[
                  { label: 'B', title: '粗体', action: () => insertMarkdown('**', '**') },
                  { label: 'I', title: '斜体', action: () => insertMarkdown('*', '*') },
                  { label: 'S', title: '删除线', action: () => insertMarkdown('~~', '~~') },
                  { label: '</>', title: '代码', action: () => insertMarkdown('`', '`') },
                  { label: '链接', title: '链接', action: () => insertMarkdown('[', '](url)') },
                  { label: '图片', title: '图片', action: () => insertMarkdown('![alt](', ')') },
                  { label: '引用', title: '引用', action: () => insertMarkdown('\n> ', '') },
                  { label: '列表', title: '列表', action: () => insertMarkdown('\n- ', '') },
                  { label: '代码块', title: '代码块', action: () => insertMarkdown('\n```\n', '\n```\n') },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    title={btn.title}
                    className={`px-2.5 py-1 rounded text-sm font-mono transition-colors ${
                      isDark
                        ? 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* 编辑/预览区域 */}
            {showPreview ? (
              <div
                className={`min-h-[200px] p-4 rounded-xl prose prose-sm max-w-none ${
                  isDark ? 'bg-gray-700/50 prose-invert' : 'bg-white border border-gray-200'
                }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.content) }}
              />
            ) : (
              <textarea
                ref={contentRef}
                placeholder="写下你的想法... 支持 Markdown 格式"
                value={formData.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                rows={8}
                className={`w-full px-4 py-3 rounded-xl border text-base resize-none transition-all duration-300 font-mono ${
                  isDark
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff] focus:bg-gray-700/70'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff] focus:bg-white'
                } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20`}
              />
            )}
            <p className={`mt-2 text-xs text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {formData.content.length} 字符
            </p>
          </motion.div>

          {/* 图片管理 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl p-6 backdrop-blur-md ${
              isDark
                ? 'bg-gray-800/50 border border-gray-700/50'
                : 'bg-white/70 border border-gray-200/50'
            } shadow-lg`}
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-[#66ccff]/20' : 'bg-[#66ccff]/10'}`}>
                <ImageIcon className="w-5 h-5 text-[#66ccff]" />
              </div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                图片
              </h2>
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                ({formData.images.length})
              </span>
            </div>

            {/* 图片列表 */}
            <AnimatePresence>
              {formData.images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Reorder.Group
                    axis="x"
                    values={formData.images}
                    onReorder={(newImages) => handleFieldChange('images', newImages)}
                    className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2"
                  >
                    {formData.images.map((image, index) => (
                      <Reorder.Item
                        key={image}
                        value={image}
                        className="relative group aspect-square"
                      >
                        <div 
                          className="relative overflow-hidden rounded-lg border-2 border-transparent hover:border-[#66ccff] transition-all duration-300 cursor-pointer w-full h-full"
                          onClick={() => handlePreviewImage(image)}
                        >
                          <img
                            src={image}
                            alt={`图片 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                              <span className="text-white text-xs font-medium">{index + 1}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(index);
                                }}
                                className="p-1 bg-red-500/90 hover:bg-red-600 text-white rounded transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3 h-3 text-white/80" />
                          </div>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 添加图片 */}
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="输入图片 URL..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImage();
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm transition-all duration-300 ${
                    isDark
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
                  } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20`}
                />
                <AdminButton type="secondary" onClick={handleAddImage}>
                  添加
                </AdminButton>
              </div>

              {/* 本地上传 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleLocalImageUpload}
                className="hidden"
              />
              <button
                onClick={triggerFileSelect}
                disabled={isUploadingImage}
                className={`w-full py-3 px-4 rounded-xl border-2 border-dashed transition-all duration-300 flex items-center justify-center space-x-2 ${
                  isDark
                    ? 'border-gray-600 hover:border-[#66ccff] text-gray-400 hover:text-[#66ccff]'
                    : 'border-gray-300 hover:border-[#66ccff] text-gray-500 hover:text-[#66ccff]'
                } ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>点击或拖拽上传图片</span>
                  </>
                )}
              </button>
              <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                支持 jpg、png、gif、webp 格式，单张最大 10MB
              </p>
            </div>
          </motion.div>
        </div>

        {/* 右侧：设置面板 */}
        <div className="lg:col-span-4 space-y-6">
          {/* 发布设置 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl p-6 backdrop-blur-md sticky top-24 ${
              isDark
                ? 'bg-gray-800/50 border border-gray-700/50'
                : 'bg-white/70 border border-gray-200/50'
            } shadow-lg`}
          >
            <div className="flex items-center space-x-2 mb-6">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-[#66ccff]/20' : 'bg-[#66ccff]/10'}`}>
                <Sparkles className="w-5 h-5 text-[#66ccff]" />
              </div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                发布设置
              </h2>
            </div>

            {/* 发布时间 */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Calendar className="w-4 h-4 inline mr-1" />
                发布时间
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => handleFieldChange('time', e.target.value)}
                placeholder="YYYY-MM-DD HH:MM"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-300 ${
                  isDark
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
                } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20`}
              />
            </div>

            {/* 置顶设置 */}
            <div className="mb-6">
              <button
                onClick={() => handleFieldChange('pinned', !formData.pinned)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                  formData.pinned
                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
                    : isDark
                      ? 'bg-gray-700/50 text-gray-400 hover:text-yellow-400 border border-gray-600'
                      : 'bg-gray-100 text-gray-500 hover:text-yellow-500 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {formData.pinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5" />}
                  <span className="font-medium">{formData.pinned ? '已置顶' : '未置顶'}</span>
                </div>
                <span className="text-xs opacity-70">点击切换</span>
              </button>
            </div>

            {/* 标签设置 */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Tag className="w-4 h-4 inline mr-1" />
                标签
              </label>
              
              {/* 已添加的标签 */}
              <AnimatePresence>
                {formData.tags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2 mb-3"
                  >
                    {formData.tags.map(tag => (
                      <motion.span
                        key={tag}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${
                          isDark
                            ? 'bg-[#66ccff]/20 text-[#66ccff]'
                            : 'bg-[#66ccff]/10 text-[#66ccff]'
                        }`}
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 添加标签 */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="添加标签"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className={`flex-1 px-4 py-2 rounded-xl border text-sm transition-all duration-300 ${
                    isDark
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
                  } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20`}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-[#66ccff] text-white rounded-xl text-sm font-medium hover:bg-[#66ccff]/90 transition-colors"
                >
                  添加
                </button>
              </div>
              <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                按 Enter 键快速添加
              </p>
            </div>
          </motion.div>

          {/* 动态预览 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className={`rounded-2xl p-6 ${
              isDark
                ? 'bg-gradient-to-br from-[#66ccff]/10 to-transparent border border-[#66ccff]/20'
                : 'bg-gradient-to-br from-[#66ccff]/5 to-transparent border border-[#66ccff]/10'
            }`}
          >
            <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              预览
            </h3>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/50'}`}>
              <div className="flex items-center space-x-3 mb-3">
                <img
                  src={getAvatarPath()}
                  alt={siteAuthorName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {siteAuthorName}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {formData.time}
                  </p>
                </div>
                {formData.pinned && (
                  <Pin className="w-4 h-4 text-yellow-500 ml-auto" />
                )}
              </div>
              <p className={`text-sm mb-3 line-clamp-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {formData.content || '动态内容预览...'}
              </p>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-[#66ccff]/20 text-[#66ccff]' : 'bg-[#66ccff]/10 text-[#66ccff]'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                  {formData.tags.length > 3 && (
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      +{formData.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
              {formData.images.length > 0 && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                  <ImageIcon className="w-4 h-4" />
                  <span>{formData.images.length} 张图片</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* 快速链接 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={`rounded-2xl p-6 ${
              isDark
                ? 'bg-gray-800/30 border border-gray-700/30'
                : 'bg-white/50 border border-gray-200/30'
            }`}
          >
            <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              快速链接
            </h3>
            <Link
              href="/admin/gallery/local"
              target="_blank"
              className="flex items-center text-sm text-[#66ccff] hover:underline mb-2"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              前往图床管理
            </Link>
            <Link
              href="/moments"
              target="_blank"
              className="flex items-center text-sm text-[#66ccff] hover:underline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              查看动态页面
            </Link>
          </motion.div>
        </div>
      </div>

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

      {/* 图片预览弹窗 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={handleClosePreview}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage}
                alt="预览"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <button
                onClick={handleClosePreview}
                className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 动态编辑页面
 * 包装 Suspense 以支持 useSearchParams
 */
export default function MomentEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
        </div>
      }
    >
      <MomentEditContent />
    </Suspense>
  );
}
