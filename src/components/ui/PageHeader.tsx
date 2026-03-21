'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

/**
 * 页面标题组件的属性接口
 */
interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面描述文字 */
  description?: string;
  /** 标题前的图标（emoji字符串或Lucide图标组件） */
  icon?: React.ReactNode | string;
  /** 是否显示装饰性背景 */
  showBackground?: boolean;
  /** 是否显示动画效果 */
  animate?: boolean;
  /** 标题尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
  /** 标题自定义类名 */
  titleClassName?: string;
  /** 描述自定义类名 */
  descriptionClassName?: string;
  /** 居中对齐 */
  centered?: boolean;
  /** 显示分隔线 */
  showDivider?: boolean;
  /** 标题渐变样式 */
  gradientStyle?: 'default' | 'primary' | 'rainbow' | 'sunset' | 'ocean' | 'purple';
}

/**
 * 统一的页面标题组件
 * 提供美观的标题和描述展示，支持动画效果和多种样式配置
 * 
 * @example
 * // 基础用法
 * <PageHeader title="博客文章" description="分享技术心得" />
 * 
 * @example
 * // 大尺寸标题
 * <PageHeader title="博客文章" description="分享技术心得" size="lg" />
 * 
 * @example
 * // 带分隔线
 * <PageHeader title="画廊" description="精选图片集" showDivider />
 */
export default function PageHeader({
  title,
  description,
  icon,
  showBackground = true,
  animate = true,
  size = 'md',
  className = '',
  titleClassName = '',
  descriptionClassName = '',
  centered = true,
  showDivider = false,
  gradientStyle = 'primary',
}: PageHeaderProps) {
  // 根据尺寸配置样式
  const sizeConfig = {
    sm: {
      title: 'text-2xl md:text-3xl font-bold',
      description: 'text-sm md:text-base',
      icon: 'w-6 h-6 md:w-8 md:h-8',
      gap: 'gap-2',
      marginBottom: 'mb-2',
    },
    md: {
      title: 'text-3xl md:text-4xl font-bold',
      description: 'text-base md:text-lg',
      icon: 'w-8 h-8 md:w-10 md:h-10',
      gap: 'gap-3',
      marginBottom: 'mb-3',
    },
    lg: {
      title: 'text-4xl md:text-5xl font-bold',
      description: 'text-lg md:text-xl',
      icon: 'w-10 h-10 md:w-12 md:h-12',
      gap: 'gap-4',
      marginBottom: 'mb-4',
    },
  };

  // 渐变色配置 - 多种预设渐变效果
  const gradientConfig = {
    default: 'bg-gradient-to-r from-foreground via-foreground to-foreground/80',
    primary: 'bg-gradient-to-r from-primary via-primary/80 to-primary/60',
    rainbow: 'bg-gradient-to-r from-pink-500 via-purple-500 to-primary',
    sunset: 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500',
    ocean: 'bg-gradient-to-r from-cyan-400 via-primary to-blue-500',
    purple: 'bg-gradient-to-r from-purple-400 via-pink-400 to-primary',
  };

  const config = sizeConfig[size];
  const gradientClass = gradientConfig[gradientStyle];

  // 动画配置 - 使用正确的 Variants 类型
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: animate ? -20 : 0 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94], // easeOut 曲线
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: animate ? 10 : 0 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  // 渲染图标
  const renderIcon = () => {
    if (!icon) return null;

    // 如果是字符串（emoji）
    if (typeof icon === 'string') {
      return (
        <motion.span 
          className="text-3xl md:text-4xl drop-shadow-lg"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          {icon}
        </motion.span>
      );
    }

    // 如果是React节点（Lucide图标等）
    return (
      <motion.div 
        className={`${config.icon} text-primary drop-shadow-lg`}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        {icon}
      </motion.div>
    );
  };

  return (
    <motion.div
      className={`
        ${centered ? 'text-center' : 'text-left'}
        ${showBackground ? 'relative' : ''}
        dark:bg-transparent
        ${className}
      `}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 装饰性背景 */}
      {showBackground && (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none dark:bg-transparent">
          {/* 渐变光晕效果 - 深色模式下降低透明度 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[200%]">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-transparent dark:to-transparent rounded-full blur-3xl" />
          </div>
          {/* 装饰性圆点 - 深色模式下降低透明度 */}
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-primary/20 dark:bg-primary/10 rounded-full animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-3 h-3 bg-primary/10 dark:bg-primary/5 rounded-full animate-pulse" />
          {/* 额外的装饰光点 - 深色模式下降低透明度 */}
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-primary/30 dark:bg-primary/15 rounded-full" />
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/20 dark:bg-primary/10 rounded-full" />
        </div>
      )}

      {/* 标题区域 */}
      <div className={`flex items-center justify-center ${config.gap} ${config.marginBottom}`}>
        {renderIcon()}
        <motion.h1
          className={`
            ${config.title}
            tracking-tight
            ${gradientClass}
            bg-clip-text
            text-transparent
            drop-shadow-sm
            ${titleClassName}
          `}
          variants={itemVariants}
          style={{
            textShadow: gradientStyle !== 'default' ? '0 2px 10px rgba(var(--primary), 0.1)' : undefined,
          }}
        >
          {title}
        </motion.h1>
      </div>

      {/* 描述文字 */}
      {description && (
        <motion.p
          className={`
            ${config.description}
            text-muted-foreground
            max-w-2xl
            ${centered ? 'mx-auto' : ''}
            leading-relaxed
            opacity-90
            ${descriptionClassName}
          `}
          variants={itemVariants}
        >
          {description}
        </motion.p>
      )}

      {/* 分隔线 */}
      {showDivider && (
        <motion.div
          className="mt-6 flex justify-center"
          variants={itemVariants}
        >
          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full opacity-60" />
        </motion.div>
      )}
    </motion.div>
  );
}
