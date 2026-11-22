'use client';

/**
 * 更新日志编辑客户端组件 - 优化版
 * 提供日志创建和编辑功能，采用更友好的编辑界面
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  ArrowLeft,
  Calendar,
  FileText,
  Tag,
  Eye,
  Edit3,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Link,
  Check,
  Type,
  Info,
  Sparkles,
  FileCode,
  Minimize2,
  Maximize2,
  History,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Changelog, ChangelogType, CustomHonor } from '@/types/changelogTypes';
import AdminCard from '@/components/admin/AdminCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminToast from '@/components/admin/AdminToast';
import { createChangelog, updateChangelog, checkChangelogExists } from '../changelogActions';

/**
 * 组件属性接口
 */
interface ChangelogEditClientProps {
  changelog?: Changelog | null;
}

/**
 * 日志类型选项
 * 配色方案：天依蓝、紫色、粉色、橙色、黄绿色、绿色
 */
const TYPE_OPTIONS: { value: ChangelogType; label: string; color: string; icon: React.ReactNode; description: string }[] = [
  { value: 'feature', label: '新功能', color: '#66ccff', icon: <Sparkles className="w-4 h-4" />, description: '新增功能模块' },
  { value: 'optimize', label: '优化', color: '#9966ff', icon: <Minimize2 className="w-4 h-4" />, description: '性能或体验优化' },
  { value: 'fix', label: '修复', color: '#ff66cc', icon: <Check className="w-4 h-4" />, description: 'Bug修复' },
  { value: 'docs', label: '文档', color: '#ff9966', icon: <FileText className="w-4 h-4" />, description: '文档更新' },
  { value: 'style', label: '样式', color: '#ccff66', icon: <Type className="w-4 h-4" />, description: '样式调整' },
  { value: 'refactor', label: '重构', color: '#66ff99', icon: <FileCode className="w-4 h-4" />, description: '代码重构' },
];

/**
 * Markdown工具栏按钮配置
 */
const TOOLBAR_BUTTONS = [
  { icon: <Heading1 className="w-4 h-4" />, label: '一级标题', prefix: '# ', suffix: '', placeholder: '标题' },
  { icon: <Heading2 className="w-4 h-4" />, label: '二级标题', prefix: '## ', suffix: '', placeholder: '标题' },
  { icon: <Heading3 className="w-4 h-4" />, label: '三级标题', prefix: '### ', suffix: '', placeholder: '标题' },
  { type: 'separator' as const },
  { icon: <Bold className="w-4 h-4" />, label: '粗体', prefix: '**', suffix: '**', placeholder: '粗体文本' },
  { icon: <Italic className="w-4 h-4" />, label: '斜体', prefix: '*', suffix: '*', placeholder: '斜体文本' },
  { icon: <Code className="w-4 h-4" />, label: '行内代码', prefix: '`', suffix: '`', placeholder: '代码' },
  { type: 'separator' as const },
  { icon: <List className="w-4 h-4" />, label: '列表', prefix: '- ', suffix: '', placeholder: '列表项' },
  { icon: <Quote className="w-4 h-4" />, label: '引用', prefix: '> ', suffix: '', placeholder: '引用内容' },
  { icon: <Link className="w-4 h-4" />, label: '链接', prefix: '[', suffix: '](url)', placeholder: '链接文本' },
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
 * 表单验证错误类型
 */
interface FormErrors {
  date?: string;
  type?: string;
  content?: string;
}

/**
 * 更新日志编辑客户端组件
 */
export default function ChangelogEditClient({ changelog }: ChangelogEditClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // 判断是否为编辑模式
  const isEditMode = !!changelog;

  // 表单状态
  const [date, setDate] = useState('');
  const [type, setType] = useState<ChangelogType>('feature');
  const [content, setContent] = useState('');
  const [honors, setHonors] = useState<CustomHonor[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 预览模式 - 默认并排显示
  const [showPreview, setShowPreview] = useState(true);
  // 全屏模式
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 当 changelog 变化时，更新表单状态
  useEffect(() => {
    if (changelog) {
      setDate(changelog.date);
      setType(changelog.type);
      setContent(changelog.content);
      setHonors(changelog.honors || []);
    } else if (changelog === null) {
      // 新建模式，重置表单
      setDate('');
      setType('feature');
      setContent('');
      setHonors([]);
    }
  }, [changelog]);

  /**
   * 计算字数统计
   */
  const wordCount = useMemo(() => {
    if (!content) return { chars: 0, words: 0, lines: 0 };
    const chars = content.length;
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const lines = content.split('\n').length;
    return { chars, words, lines };
  }, [content]);

  /**
   * 插入Markdown格式
   */
  const insertMarkdown = useCallback((prefix: string, suffix: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newContent =
      content.substring(0, start) +
      prefix +
      textToInsert +
      suffix +
      content.substring(end);

    setContent(newContent);

    // 恢复焦点并设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  /**
   * 验证表单
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // 验证日期
    if (!date) {
      newErrors.date = '请选择日期';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      newErrors.date = '日期格式无效';
    } else {
      /*
        new Date('2026-02-31') 会自动滚到 3 月 3 日，不能只判断 isNaN。
        这里把解析结果回写年月日，与输入值逐项比较，拦截不存在的日期。
      */
      const [year, month, day] = date.split('-').map(Number);
      const parsed = new Date(`${date}T00:00:00`);
      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getFullYear() !== year ||
        parsed.getMonth() + 1 !== month ||
        parsed.getDate() !== day
      ) {
        newErrors.date = '日期无效';
      }
    }

    // 验证类型
    if (!type) {
      newErrors.type = '请选择类型';
    }

    // 验证内容
    if (!content.trim()) {
      newErrors.content = '请输入日志内容';
    }

    // 新建时检查日期是否已存在
    if (!isEditMode && date && !newErrors.date) {
      const exists = await checkChangelogExists(date);
      if (exists) {
        newErrors.date = '该日期的日志已存在';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [date, type, content, isEditMode]);

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        // 更新现有日志
        const result = await updateChangelog(date, {
          type,
          content,
          honors,
        });
        if (result.success) {
          setToast({ message: result.message, type: 'success' });
          setTimeout(() => {
            router.push('/admin/changelogs');
          }, 1500);
        } else {
          setToast({ message: result.message, type: 'error' });
        }
      } else {
        // 创建新日志
        const result = await createChangelog({
          date,
          type,
          content,
          honors,
        });
        if (result.success) {
          setToast({ message: result.message, type: 'success' });
          setTimeout(() => {
            router.push('/admin/changelogs');
          }, 1500);
        } else {
          setToast({ message: result.message, type: 'error' });
        }
      }
    } catch (error) {
      setToast({ message: '保存失败', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [date, type, content, honors, isEditMode, router, validateForm]);

  /**
   * 渲染Markdown预览 - 改进版
   */
  const renderPreview = useMemo(() => {
    if (!content) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 min-h-[300px]">
          <FileText className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">开始输入内容，预览将在此处显示</p>
        </div>
      );
    }

    // 改进的Markdown渲染 - 使用更完善的解析
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let inList = false;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc ml-6 mb-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-gray-700 dark:text-gray-300">
                <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item) }} />
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 标题
      if (line.startsWith('# ')) {
        flushList();
        elements.push(<h1 key={index} className="text-2xl font-bold mb-4 mt-6 text-gray-900 dark:text-white">{line.slice(2)}</h1>);
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(<h2 key={index} className="text-xl font-bold mb-3 mt-5 text-gray-900 dark:text-white">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={index} className="text-lg font-bold mb-2 mt-4 text-gray-900 dark:text-white">{line.slice(4)}</h3>);
      } else if (line.startsWith('#### ')) {
        flushList();
        elements.push(<h4 key={index} className="text-base font-bold mb-2 mt-3 text-gray-800 dark:text-gray-200">{line.slice(5)}</h4>);
      }
      // 引用
      else if (line.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote key={index} className="border-l-4 border-[#66ccff] pl-4 py-2 my-3 bg-gray-50 dark:bg-gray-800/50 rounded-r">
            <p className="m-0 text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line.slice(2)) }} />
          </blockquote>
        );
      }
      // 列表项
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        inList = true;
        listItems.push(line.slice(2));
      }
      // 空行
      else if (!trimmedLine) {
        flushList();
        elements.push(<div key={index} className="h-3" />);
      }
      // 普通段落
      else {
        flushList();
        elements.push(
          <p key={index} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }} />
          </p>
        );
      }
    });

    // 处理末尾未闭合的列表
    flushList();

    return <div className="prose dark:prose-invert max-w-none">{elements}</div>;
  }, [content]);

  // 获取当前选中的类型信息
  const selectedType = TYPE_OPTIONS.find(t => t.value === type);

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* 页面标题和操作栏 */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/admin/changelogs')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="返回列表"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? '编辑日志' : '撰写日志'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEditMode ? `编辑 ${date} 的更新日志` : '创建新的更新日志'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 预览切换 */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setShowPreview(false)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !showPreview
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>编辑</span>
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  showPreview
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>分栏</span>
              </button>
            </div>

            <AdminButton
              type="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              icon={<Save className="w-4 h-4" />}
            >
              {isSubmitting ? '保存中...' : '保存'}
            </AdminButton>
          </div>
        </motion.div>

        {/* 表单区域 */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* 顶部信息栏 */}
          <AdminCard className="!p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 日期字段 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline-block mr-1" />
                  日期
                  {!isEditMode && <span className="text-red-500 ml-1">*</span>}
                </label>
                {isEditMode ? (
                  <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 flex items-center">
                    <History className="w-4 h-4 mr-2 text-gray-400" />
                    {date}
                  </div>
                ) : (
                  <>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                      }}
                      className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 transition-all duration-200 ${
                        errors.date
                          ? 'border-red-500 focus:ring-red-500/50'
                          : 'border-gray-200 dark:border-gray-700 focus:border-[#66ccff]'
                      }`}
                    />
                    {errors.date && (
                      <p className="mt-1.5 text-sm text-red-500">{errors.date}</p>
                    )}
                  </>
                )}
              </div>

              {/* 类型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="w-4 h-4 inline-block mr-1" />
                  类型
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as ChangelogType);
                      if (errors.type) setErrors(prev => ({ ...prev, type: undefined }));
                    }}
                    className={`w-full px-4 pr-10 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 transition-all duration-200 cursor-pointer ${
                      errors.type
                        ? 'border-red-500 focus:ring-red-500/50'
                        : 'border-gray-200 dark:border-gray-700 focus:border-[#66ccff]'
                    }`}
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: selectedType?.color || '#66ccff',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      backgroundImage: 'none'
                    }}
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                  {/* 只保留一个下拉箭头 */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.type && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.type}</p>
                )}
              </div>
            </div>
          </AdminCard>

          {/* 自定义荣誉管理 */}
          <AdminCard className="!p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 inline-block mr-1" />
                  自定义荣誉
                </label>
                <AdminButton
                  type="secondary"
                  size="sm"
                  onClick={() => {
                    setHonors([...honors, { name: '', color: 'bg-gradient-to-r from-blue-500 via-sky-400 via-cyan-400 via-blue-400 to-blue-600' }]);
                  }}
                  icon={<Plus className="w-3 h-3" />}
                >
                  添加荣誉
                </AdminButton>
              </div>

              {honors.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  暂无自定义荣誉，点击上方按钮添加
                </p>
              ) : (
                <div className="space-y-3">
                  {honors.map((honor, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <input
                        type="text"
                        value={honor.name}
                        onChange={(e) => {
                          // 不能直接改数组内对象的属性，必须生成新对象，避免状态被原地修改
                          setHonors(honors.map((item, i) =>
                            i === index ? { ...item, name: e.target.value } : item
                          ));
                        }}
                        placeholder="荣誉名称"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50"
                      />
                      {/* 颜色配置：支持 Tailwind 类名或 #hex/rgb 颜色值 */}
                      <input
                        type="text"
                        value={honor.color}
                        onChange={(e) => {
                          setHonors(honors.map((item, i) =>
                            i === index ? { ...item, color: e.target.value } : item
                          ));
                        }}
                        placeholder="颜色类名或 #hex"
                        className="w-40 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50"
                      />
                      {/* 颜色预览：按实际配置渲染，不再固定为天依蓝 */}
                      <span
                        className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-white shadow-sm ${
                          /^(#|rgb|hsl)/.test(honor.color || '') || !honor.color
                            ? 'bg-[#66ccff]'
                            : honor.color
                        }`}
                        style={
                          /^(#|rgb|hsl)/.test(honor.color || '')
                            ? { backgroundColor: honor.color }
                            : undefined
                        }
                      >
                        预览
                      </span>
                      <button
                        onClick={() => {
                          const newHonors = honors.filter((_, i) => i !== index);
                          setHonors(newHonors);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                自定义荣誉仅用于展示，不参与任何统计计算
              </p>
            </div>
          </AdminCard>

          {/* 编辑区域 - 使用固定高度确保足够空间 */}
          <div
            ref={editorContainerRef}
            className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
          >
            {/* 编辑器 */}
            <AdminCard className="flex flex-col" style={{ height: '600px' }}>
              {/* 工具栏 */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                    <FileText className="w-4 h-4 inline-block mr-1" />
                    内容
                    <span className="text-red-500 ml-1">*</span>
                  </span>
                  <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2" />
                  {TOOLBAR_BUTTONS.map((btn, index) => (
                    btn.type === 'separator' ? (
                      <div key={index} className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                    ) : (
                      <button
                        key={index}
                        onClick={() => insertMarkdown(btn.prefix, btn.suffix, btn.placeholder)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title={btn.label}
                      >
                        {btn.icon}
                      </button>
                    )
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="全屏编辑"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 文本域 - 直接设置高度而不是使用flex-1 */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errors.content) setErrors(prev => ({ ...prev, content: undefined }));
                }}
                placeholder="请输入日志内容，支持Markdown格式...&#10;&#10;## 功能概述&#10;&#10;简要描述本次更新的功能和目的。&#10;&#10;### 主要变更&#10;- 变更点1&#10;- 变更点2"
                style={{ height: '480px' }}
                className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 transition-all duration-200 resize-none font-mono text-sm leading-relaxed ${
                  errors.content
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-gray-200 dark:border-gray-700 focus:border-[#66ccff]'
                }`}
              />

              {errors.content && (
                <p className="mt-2 text-sm text-red-500 flex-shrink-0">{errors.content}</p>
              )}

              {/* 底部状态栏 */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <span>{wordCount.chars} 字符</span>
                  <span>{wordCount.words} 词</span>
                  <span>{wordCount.lines} 行</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">支持 Markdown</span>
                </div>
              </div>
            </AdminCard>

            {/* 预览区域 */}
            {showPreview && (
              <AdminCard className="flex flex-col" style={{ height: '600px' }}>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Eye className="w-4 h-4 inline-block mr-1" />
                    实时预览
                  </span>
                  <span className="text-xs text-gray-400">实时渲染</span>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ height: '480px' }}>
                  {renderPreview}
                </div>
              </AdminCard>
            )}
          </div>

          {/* 帮助信息 */}
          <motion.div variants={itemVariants}>
            <AdminCard className="!bg-gray-50/50 dark:!bg-gray-800/30 !border-gray-200 dark:!border-gray-700">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-[#66ccff] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">撰写提示</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>使用 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">##</code> 开始写二级标题，用于功能概述、主要变更等章节</li>
                    <li>使用 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">-</code> 创建列表项，清晰展示变更点</li>
                    <li>使用 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">**粗体**</code> 强调重要内容</li>
                    <li>建议包含：功能概述、主要变更、技术实现、使用方式、注意事项等章节</li>
                  </ul>
                </div>
              </div>
            </AdminCard>
          </motion.div>
        </motion.div>

        {/* Toast 提示 */}
        <AdminToast
          message={toast?.message || ''}
          type={toast?.type || 'success'}
          isVisible={!!toast}
          onClose={() => setToast(null)}
          duration={3000}
        />
      </motion.div>

      {/* 全屏编辑模态框 */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col"
          >
            {/* 全屏头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditMode ? '编辑日志' : '撰写日志'} - 全屏模式
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {date || '未选择日期'}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <AdminButton
                  type="secondary"
                  onClick={() => setIsFullscreen(false)}
                  icon={<Minimize2 className="w-4 h-4" />}
                >
                  退出全屏
                </AdminButton>
                <AdminButton
                  type="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  icon={<Save className="w-4 h-4" />}
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </AdminButton>
              </div>
            </div>

            {/* 全屏编辑区域 */}
            <div className="flex-1 flex overflow-hidden">
              {/* 编辑器 */}
              <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800">
                {/* 工具栏 */}
                <div className="flex items-center px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center space-x-1">
                    {TOOLBAR_BUTTONS.map((btn, index) => (
                      btn.type === 'separator' ? (
                        <div key={index} className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                      ) : (
                        <button
                          key={index}
                          onClick={() => insertMarkdown(btn.prefix, btn.suffix, btn.placeholder)}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                          title={btn.label}
                        >
                          {btn.icon}
                        </button>
                      )
                    ))}
                  </div>
                </div>
                {/* 文本域 */}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (errors.content) setErrors(prev => ({ ...prev, content: undefined }));
                  }}
                  placeholder="请输入日志内容，支持Markdown格式..."
                  className="flex-1 w-full px-6 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                />
                {/* 底部状态栏 */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center space-x-4">
                    <span>{wordCount.chars} 字符</span>
                    <span>{wordCount.words} 词</span>
                    <span>{wordCount.lines} 行</span>
                  </div>
                  <span className="text-gray-400">支持 Markdown</span>
                </div>
              </div>

              {/* 预览区域 */}
              <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800/30">
                <div className="flex items-center px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Eye className="w-4 h-4 inline-block mr-1" />
                    实时预览
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {renderPreview}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * 渲染行内Markdown（粗体、斜体、代码、链接）
 */
function renderInlineMarkdown(text: string): string {
  /*
    必须先转义原文再生成 HTML：
    预览使用 dangerouslySetInnerHTML，若不转义，日志正文里的
    <script>、onerror 等标签会被浏览器直接执行。
  */
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
      // 只允许 http(s) 与站内相对路径，阻止 javascript: 等危险协议
      const safeUrl = /^(https?:\/\/|\/)/i.test(url) ? url : '#';
      return `<a href="${safeUrl}" class="text-[#66ccff] hover:underline" target="_blank" rel="noopener">${label}</a>`;
    });
}
