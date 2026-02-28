'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/utils/cn';
import AdminInput from './AdminInput';
import AdminButton from './AdminButton';

/**
 * 表单字段类型定义
 */
type FormFieldType = 'text' | 'textarea' | 'select' | 'date' | 'tags' | 'checkbox' | 'image';

/**
 * 表单字段配置接口
 */
interface FormField {
  /** 字段名称 */
  name: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
  type: FormFieldType;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 下拉选项（用于 select 类型） */
  options?: { value: string; label: string }[];
  /** 文本域行数（用于 textarea 类型） */
  rows?: number;
  /** 文件类型（用于 image 类型） */
  accept?: string;
  /** 默认值 */
  defaultValue?: any;
  /** 是否禁用 */
  disabled?: boolean;
  /** 帮助文本 */
  helpText?: string;
}

/**
 * 管理后台表单组件属性接口
 */
interface AdminFormProps {
  /** 表单字段配置 */
  fields: FormField[];
  /** 表单值 */
  values: Record<string, any>;
  /** 值变化回调函数 */
  onChange: (values: Record<string, any>) => void;
  /** 提交回调函数 */
  onSubmit?: () => void;
  /** 表单验证错误信息 */
  errors?: Record<string, string>;
  /** 自定义类名 */
  className?: string;
  /** 提交按钮文本 */
  submitText?: string;
  /** 是否显示提交按钮 */
  showSubmit?: boolean;
  /** 是否正在提交 */
  submitting?: boolean;
}

/**
 * 标签输入组件
 * 用于输入多个标签
 */
const TagsInput: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}> = ({ value = [], onChange, placeholder, disabled, error }) => {
  // 输入框值
  const [inputValue, setInputValue] = useState('');
  // 输入框引用
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 添加标签
   */
  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      setInputValue('');
    }
  };

  /**
   * 移除标签
   */
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="w-full">
      {/* 标签列表 */}
      <div
        className={cn(
          'flex flex-wrap gap-2 p-2 rounded-lg border transition-colors',
          'bg-white dark:bg-gray-800',
          error
            ? 'border-red-500'
            : 'border-gray-200 dark:border-gray-700 focus-within:border-[#66ccff] focus-within:ring-2 focus-within:ring-[#66ccff]/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* 已添加的标签 */}
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 text-sm rounded-md bg-[#66ccff]/10 text-[#66ccff] dark:bg-[#66ccff]/20"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-1 hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {/* 输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] py-1 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
      </div>
      {/* 错误信息 */}
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
};

/**
 * 图片选择器组件
 */
const ImageSelector: React.FC<{
  value?: string;
  onChange: (value: string) => void;
  accept?: string;
  disabled?: boolean;
  error?: string;
}> = ({ value, onChange, accept = 'image/*', disabled, error }) => {
  // 文件输入引用
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件选择
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 创建本地预览 URL
      const url = URL.createObjectURL(file);
      onChange(url);
    }
  };

  /**
   * 清除图片
   */
  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-colors overflow-hidden',
          error
            ? 'border-red-500'
            : 'border-gray-200 dark:border-gray-700 hover:border-[#66ccff]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {value ? (
          // 已选择图片预览
          <div className="relative aspect-video">
            <img
              src={value}
              alt="预览"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  更换
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  删除
                </button>
              </div>
            )}
          </div>
        ) : (
          // 上传区域
          <div
            className="aspect-video flex flex-col items-center justify-center cursor-pointer"
            onClick={() => !disabled && inputRef.current?.click()}
          >
            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">点击上传图片</p>
          </div>
        )}
        {/* 隐藏的文件输入 */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />
      </div>
      {/* 错误信息 */}
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
};

/**
 * AdminForm - 管理后台表单组件
 * 
 * 功能特点：
 * - 动态表单字段渲染
 * - 表单验证和错误提示
 * - 标签输入组件（支持多标签）
 * - 图片选择器
 * - 支持多种字段类型
 * 
 * @param props - 组件属性
 * @returns 表单组件
 */
const AdminForm: React.FC<AdminFormProps> = ({
  fields,
  values,
  onChange,
  onSubmit,
  errors = {},
  className,
  submitText = '提交',
  showSubmit = true,
  submitting = false,
}) => {
  /**
   * 处理字段值变化
   */
  const handleFieldChange = (name: string, value: any) => {
    onChange({
      ...values,
      [name]: value,
    });
  };

  /**
   * 处理表单提交
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  /**
   * 渲染单个字段
   */
  const renderField = (field: FormField) => {
    const fieldValue = values[field.name] ?? field.defaultValue ?? '';
    const fieldError = errors[field.name];

    switch (field.type) {
      case 'text':
        return (
          <AdminInput
            value={fieldValue}
            onChange={(value) => handleFieldChange(field.name, value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            error={fieldError}
            label={field.label}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <div className="w-full">
            {/* 标签 */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {/* 文本域 */}
            <textarea
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows || 4}
              disabled={field.disabled}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 focus:border-[#66ccff]',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                fieldError && 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
              )}
            />
            {/* 帮助文本 */}
            {field.helpText && !fieldError && (
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
            {/* 错误信息 */}
            {fieldError && <p className="mt-1.5 text-sm text-red-500">{fieldError}</p>}
          </div>
        );

      case 'select':
        return (
          <div className="w-full">
            {/* 标签 */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {/* 下拉选择 */}
            <select
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={field.disabled}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 focus:border-[#66ccff]',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                fieldError && 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
              )}
            >
              <option value="">{field.placeholder || '请选择'}</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {/* 错误信息 */}
            {fieldError && <p className="mt-1.5 text-sm text-red-500">{fieldError}</p>}
          </div>
        );

      case 'date':
        return (
          <div className="w-full">
            {/* 标签 */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {/* 日期选择 */}
            <input
              type="date"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={field.disabled}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 focus:border-[#66ccff]',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                fieldError && 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
              )}
            />
            {/* 错误信息 */}
            {fieldError && <p className="mt-1.5 text-sm text-red-500">{fieldError}</p>}
          </div>
        );

      case 'tags':
        return (
          <div className="w-full">
            {/* 标签 */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {/* 标签输入 */}
            <TagsInput
              value={fieldValue || []}
              onChange={(value) => handleFieldChange(field.name, value)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              error={fieldError}
            />
            {/* 帮助文本 */}
            {field.helpText && !fieldError && (
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="w-full">
            {/* 复选框 */}
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={fieldValue || false}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                disabled={field.disabled}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#66ccff] focus:ring-[#66ccff]/50"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {/* 帮助文本 */}
            {field.helpText && (
              <p className="mt-1.5 ml-7 text-sm text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
            {/* 错误信息 */}
            {fieldError && <p className="mt-1.5 ml-7 text-sm text-red-500">{fieldError}</p>}
          </div>
        );

      case 'image':
        return (
          <div className="w-full">
            {/* 标签 */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {/* 图片选择器 */}
            <ImageSelector
              value={fieldValue}
              onChange={(value) => handleFieldChange(field.name, value)}
              accept={field.accept}
              disabled={field.disabled}
              error={fieldError}
            />
            {/* 帮助文本 */}
            {field.helpText && !fieldError && (
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      {/* 表单字段 */}
      {fields.map((field) => (
        <div key={field.name}>
          {renderField(field)}
        </div>
      ))}

      {/* 提交按钮 */}
      {showSubmit && onSubmit && (
        <div className="flex justify-end pt-4">
          <AdminButton
            type="primary"
            loading={submitting}
            htmlType="submit"
          >
            {submitText}
          </AdminButton>
        </div>
      )}
    </form>
  );
};

export default AdminForm;
