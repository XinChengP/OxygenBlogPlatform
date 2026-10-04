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
  /** 标题渐变样式：全站锁定天依蓝，仅保留默认（前景色）与天依蓝两档；
   *  原 rainbow/sunset/ocean/purple 预设全站零引用且与主题策略冲突，已移除 */
  gradientStyle?: 'default' | 'primary';
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

  // 渐变色配置 - 仅保留两档：默认前景色与天依蓝主题渐变
  // 页头直接压在全站天空插画上，渐变下限不能太透，否则亮色下标题融进蓝天
  const gradientConfig = {
    default: 'bg-gradient-to-r from-foreground via-foreground to-foreground/80',
    primary: 'bg-gradient-to-r from-primary via-primary to-primary/85',
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
            /* bg-clip-text 文字透明，textShadow 几乎不可见；
               drop-shadow 作用于合成后的字形像素，是渐变字在插画背景上的有效分离手段 */
            drop-shadow-[0_2px_5px_rgba(12,40,85,0.45)]
            dark:drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]
            ${titleClassName}
          `}
          variants={itemVariants}
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
            /* 灰字压在云/夜空上对比弱：亮色加白色光晕托底，暗色加深色投影 */
            drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]
            dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]
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
