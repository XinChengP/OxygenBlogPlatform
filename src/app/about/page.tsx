/**
 * 关于页面
 * 展示个人信息和博客介绍
 * 使用与其他页面统一的布局风格：PageHeader + 左右布局
 * 页面内容通过 AboutSetting.ts 配置驱动，便于后续维护
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Globe,
  Link2,
  Music,
  Dribbble,
  CircleDot,
  Video,
  Box,
  Gamepad2,
  Crown,
  Check,
  Mail,
} from 'lucide-react';
import { Cover } from '@/components/ui/cover';
import { EvervaultCard, Icon } from '@/components/ui/evervault-card';
import OptimizedIcon from '@/components/core/OptimizedIcon';
import PageHeader from '@/components/ui/PageHeader';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { getAssetPath } from '@/utils/assetUtils';

// 导入配置
import {
  BeforeAnimationText,
  AnimationText,
  name,
  slogan,
  slogans,
  mail,
  github,
  bilibili,
  isBorder,
  aboutSections,
  hobbies,
  type AboutSectionConfig,
  type HobbyConfig,
} from '@/setting/AboutSetting';

/**
 * Lucide 图标映射表
 * 将配置中的字符串标识映射为实际图标组件，避免在配置文件中引入 React 组件
 */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Globe,
  Link: Link2,
  Music,
  Dribbble,
  CircleDot,
  Video,
  Box,
  Gamepad2,
  Crown,
};

/**
 * 兴趣爱好标签组件
 * 显示带图标的兴趣标签，悬停时有轻微放大和摆动效果
 */
function HobbyTag({ hobby, index }: { hobby: HobbyConfig; index: number }) {
  const IconComponent = iconMap[hobby.icon];

  return (
    <motion.span
      key={hobby.name}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 + index * 0.08, type: 'spring', stiffness: 200 }}
      whileHover={{
        scale: 1.08,
        rotate: [0, -3, 3, 0],
        transition: { duration: 0.4 }
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-primary/20 bg-primary/10 text-primary cursor-default shadow-sm transition-colors duration-300"
    >
      {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
      {hobby.name}
    </motion.span>
  );
}

/**
 * 关于页面右侧区块组件
 * 统一渲染标题、图标、段落、引用和底部强调文字
 * 不依赖外部容器，可自由组合到卡片网格中
 */
function AboutSection({
  section,
  className = '',
  hideTitle = false,
}: {
  section: AboutSectionConfig;
  className?: string;
  hideTitle?: boolean;
}) {
  // 根据区块 id 选择对应图标，标题更直观
  const iconMapForSection: Record<string, React.ComponentType<{ className?: string }>> = {
    'about-me': User,
    'about-site': Globe,
    'about-domain': Link2,
  };
  const IconComponent = iconMapForSection[section.id];

  return (
    <div className={className}>
      {/* 区块标题 - 手风琴模式下由面板头部统一展示，避免重复 */}
      {!hideTitle && (
        <div className="flex items-center gap-2 mb-4">
          {IconComponent && <IconComponent className="w-5 h-5 text-primary" />}
          <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
        </div>
      )}

      {/* 段落内容 */}
      <div className="text-muted-foreground leading-relaxed space-y-3 text-sm">
        {section.paragraphs.map((paragraph, index) => (
          <p key={index} className="indent-8">
            {paragraph}
          </p>
        ))}
      </div>

      {/* 引用/比喻区块 */}
      {section.quote && (
        <div className="my-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm text-muted-foreground/80 mb-2">{section.quote.intro}</p>
          <p className="italic whitespace-pre-line">{section.quote.text}</p>
        </div>
      )}

      {/* 区块底部强调文字 */}
      {section.footer && (
        <p className="text-primary font-medium text-center mt-4">{section.footer}</p>
      )}
    </div>
  );
}

/**
 * 星空粒子背景组件
 * 生成稀疏的随机小点，缓慢向上飘动，营造星空氛围
 */
function StarField({ count = 12, className = '' }: { count?: number; className?: string }) {
  const stars = React.useMemo(() => {
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10,
      opacity: Math.random() * 0.4 + 0.2,
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [star.opacity, star.opacity * 0.3, star.opacity],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

/**
 * 鼠标跟随光晕组件
 * 在容器内跟随鼠标移动显示柔和光晕，增强手风琴区域的视觉层次
 */
function MouseGlow({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <div
        className="absolute w-80 h-80 rounded-full bg-primary/15 blur-3xl transition-all duration-100 ease-out"
        style={{ left: x - 160, top: y - 160 }}
      />
    </div>
  );
}

/**
 * 扫描线组件
 * 在面板内创建一条缓慢上下移动的细线，营造科技感
 */
function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        initial={{ top: '0%' }}
        animate={{ top: '100%' }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

/**
 * 解析垂直位置配置
 * 支持百分比字符串和关键字（top/center/bottom），返回 0-100 的数字
 * 0 表示最上方，100% 表示最下方
 */
function parseVerticalPosition(position?: string): number {
  if (!position) return 50;
  if (position === 'top') return 0;
  if (position === 'center') return 50;
  if (position === 'bottom') return 100;
  const parsed = parseInt(position, 10);
  return Number.isNaN(parsed) ? 50 : Math.max(0, Math.min(100, parsed));
}

/**
 * 横向手风琴面板组件
 * 桌面端三个面板水平排列，点击后展开显示内容，其他面板收缩只显示标题
 * 使用 Framer Motion layout 动画实现平滑的宽度过渡
 */
function HorizontalAccordionPanel({
  section,
  isActive,
  onClick,
  isBackgroundEnabled,
}: {
  section: AboutSectionConfig;
  isActive: boolean;
  onClick: () => void;
  isBackgroundEnabled: boolean;
}) {
  // 根据区块 id 选择对应图标
  const iconMapForPanel: Record<string, React.ComponentType<{ className?: string }>> = {
    'about-me': User,
    'about-site': Globe,
    'about-domain': Link2,
  };
  const IconComponent = iconMapForPanel[section.id];

  // 根据背景模式返回基础样式
  const glassClass = isBackgroundEnabled
    ? 'backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75'
    : 'bg-card border-border';

  return (
    <motion.div
      layout
      onClick={onClick}
      initial={false}
      animate={{
        flex: isActive ? 3 : 1,
      }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative overflow-hidden rounded-2xl border cursor-pointer ${glassClass} transition-all duration-300 ${isActive ? 'shadow-2xl shadow-primary/20' : 'shadow-lg'}`}
    >
      {/* 收缩状态下的封面背景 + 垂直标题 */}
      <AnimatePresence mode="wait">
        {!isActive && (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {/* 封面图片容器 - 根据 coverSize 缩放以留出移动空间 */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={getAssetPath(section.coverImage)}
                alt={section.title}
                className="absolute left-0 w-full object-cover"
                style={{
                  height: section.coverSize || '120%',
                  top: `${-(parseVerticalPosition(section.coverVerticalPosition) / 100) * (parseInt(section.coverSize || '120', 10) - 100)}%`,
                  objectPosition: `${section.coverHorizontalPosition || 'center'} center`
                }}
                loading="lazy"
              />
            </div>
            {/* 渐变遮罩 - 确保标题可读 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
            {/* 扫描线效果 */}
            <ScanLine />
            {/* 横向标题 - 放置在面板底部 */}
            <div className="absolute inset-0 flex items-end justify-center p-4 z-20">
              <div className="flex items-center gap-2 text-white drop-shadow-lg whitespace-nowrap">
                {IconComponent && <IconComponent className="w-5 h-5" />}
                <h3 className="text-base font-semibold">{section.title}</h3>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 展开状态下的内容区域 */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="relative h-full flex flex-col p-6 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            {/* 星空粒子背景 */}
            <StarField count={12} className="z-0" />
            {/* 扫描线效果 */}
            <ScanLine />

            {/* 面板头部标题 */}
            <div className="relative z-10 flex items-center gap-2 mb-4 shrink-0">
              {IconComponent && <IconComponent className="w-5 h-5 text-primary" />}
              <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
            </div>

            {/* 面板内容 */}
            <div className="relative z-10 flex-1 min-h-0">
              <AboutSection section={section} hideTitle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * 社交链接项组件
 * 统一封装社交图标的链接样式和动画效果
 */
function SocialLink({
  href,
  title,
  src,
  alt,
  onClick,
}: {
  href?: string;
  title: string;
  src: string;
  alt: string;
  onClick?: () => void;
}) {
  return (
    <motion.a
      href={href}
      onClick={onClick}
      target={href && href.startsWith('http') ? '_blank' : undefined}
      rel={href && href.startsWith('http') ? 'noopener noreferrer' : undefined}
      whileHover={{ scale: 1.12, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border transition-all duration-300 cursor-pointer"
      title={title}
    >
      <OptimizedIcon
        src={src}
        alt={alt}
        className="text-foreground group-hover:text-primary transition-colors duration-300"
        width={18}
        height={18}
      />
    </motion.a>
  );
}

/**
 * 轻量 Toast 提示组件
 * 用于显示复制成功等临时反馈信息
 */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm shadow-lg pointer-events-none"
    >
      {message}
    </motion.div>
  );
}

/**
 * 关于页面组件
 * 左侧边栏展示个人信息、兴趣爱好
 * 右侧主内容使用横向手风琴展示关于我、关于本站、关于域名
 */
export default function AboutPage() {
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('about');
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [currentSlogan, setCurrentSlogan] = useState(slogan);
  // 横向手风琴当前展开的区块索引，默认展开第一个（关于我）
  const [activeSection, setActiveSection] = useState(0);
  // 鼠标跟随光晕的位置
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });

  // 确保组件已挂载，避免主题/动画相关的水合不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 更新鼠标跟随光晕位置
   * 基于手风琴容器内的鼠标坐标计算
   */
  const handleGlowMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setGlowPos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  /**
   * 显示 Toast 提示
   * 2秒后自动隐藏
   */
  const showToast = useCallback((message: string) => {
    setToastVisible(true);
    // 先显示新提示，避免连续点击时闪烁
    const hideTimer = setTimeout(() => setToastVisible(false), 2000);
    return () => clearTimeout(hideTimer);
  }, []);

  /**
   * 复制邮箱到剪贴板
   * 复制成功后显示勾选图标和 Toast 提示，2秒后恢复
   */
  const handleCopyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mail);
      setCopied(true);
      showToast('邮箱已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // 复制失败时降级使用 mailto 跳转
      window.location.href = `mailto:${mail}`;
    }
  }, [showToast]);

  /**
   * 随机切换个人宣言
   * 从 slogans 配置中随机选择一个，避免与当前重复
   */
  const handleShuffleSlogan = useCallback(() => {
    if (slogans.length <= 1) return;
    let nextIndex = Math.floor(Math.random() * slogans.length);
    // 尽量保证切换后与当前不同
    while (slogans[nextIndex] === currentSlogan && slogans.length > 1) {
      nextIndex = Math.floor(Math.random() * slogans.length);
    }
    setCurrentSlogan(slogans[nextIndex]);
  }, [currentSlogan]);

  // 毛玻璃样式函数 - 与其他页面保持一致
  const getGlassStyle = useCallback(
    (baseStyle: string = '') => {
      if (isBackgroundEnabled) {
        return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
      }
      return `bg-card ${baseStyle} border-border`;
    },
    [isBackgroundEnabled]
  );

  // 如果还没有挂载，显示骨架屏避免闪烁
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 pt-[80px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* 页面标题 - 使用统一的 PageHeader 组件 */}
        <PageHeader
          title="关于我"
          description="了解我的博客、技术栈和联系方式"
          size="lg"
          className="mb-8"
          gradientStyle="primary"
        />

        {/* 左右布局：左侧边栏 + 右侧主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧边栏 */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* 个人信息卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`${getGlassStyle("rounded-2xl shadow-xl border overflow-hidden")} transition-all duration-300`}
            >
              {/* 标语区域 */}
              <div className="p-6 text-center border-b border-border/50">
                <div className="text-xl sm:text-2xl font-semibold relative z-20 py-2 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                  {BeforeAnimationText}
                  <Cover>{AnimationText}</Cover>
                </div>
              </div>

              {/* EvervaultCard 区域 */}
              <div className="p-6">
                <div className={`${isBorder ? 'border border-black/[0.2] dark:border-white/[0.2]' : ''} flex flex-col items-center relative`}>
                  {isBorder && <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />}
                  {isBorder && <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />}
                  {isBorder && <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />}
                  {isBorder && <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />}

                  <div className="w-full h-64">
                    <EvervaultCard />
                  </div>

                  <motion.div
                    onClick={handleShuffleSlogan}
                    className="group mt-4 text-center w-full cursor-pointer"
                    title="点击随机切换宣言"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleShuffleSlogan();
                      }
                    }}
                  >
                    <h2 className="dark:text-white text-black font-medium text-lg title group-hover:text-primary/80 transition-colors duration-300">
                      {name}
                    </h2>
                    <div className="h-6 overflow-hidden mt-1">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={currentSlogan}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="text-muted-foreground text-sm leading-relaxed group-hover:text-primary/60 transition-colors duration-300"
                        >
                          {currentSlogan}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* 社交链接 */}
              <div className="px-6 pb-6">
                <div className="flex justify-center">
                  <div className="grid grid-cols-5 gap-2">
                    {/* 邮箱：点击复制，复制成功显示勾选图标 */}
                    <motion.button
                      onClick={handleCopyEmail}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                      title={copied ? '已复制' : '复制邮箱'}
                    >
                      {copied ? (
                        <Check className="w-[18px] h-[18px] text-green-500" />
                      ) : (
                        <Mail className="w-[18px] h-[18px] text-foreground" />
                      )}
                    </motion.button>
                    {/* GitHub */}
                    <SocialLink
                      href={github}
                      title="GitHub"
                      src="/assets/github.svg"
                      alt="GitHub"
                    />
                    {/* Bilibili */}
                    <SocialLink
                      href={bilibili}
                      title="哔哩哔哩"
                      src="/assets/bilibili.svg?v=2"
                      alt="Bilibili"
                    />
                    {/* VSQX */}
                    <SocialLink
                      href="https://www.vsqx.top/space/16984"
                      title="VSQX"
                      src="/assets/vsqx.svg?v=2"
                      alt="VSQX"
                    />
                    {/* 抖音 */}
                    <SocialLink
                      href="https://v.douyin.com/j0e2ZbjV_bM/"
                      title="抖音"
                      src="/LogosTiktokIcon.svg"
                      alt="抖音"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 兴趣爱好卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={`${getGlassStyle("rounded-2xl p-6 border shadow-lg")} transition-colors duration-300`}
            >
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Music className="w-5 h-5 text-primary" />
                </motion.div>
                <h3 className="text-xl font-semibold text-foreground">兴趣爱好</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {hobbies.map((hobby, index) => (
                  <HobbyTag key={hobby.name} hobby={hobby} index={index} />
                ))}
              </div>
            </motion.div>
          </motion.aside>

          {/* 右侧主内容区 - 横向手风琴展示三个区块 */}
          <main className="lg:col-span-3">
            {/* 桌面端横向手风琴 - 三个面板水平排列 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              onMouseMove={handleGlowMove}
              className="relative hidden md:flex h-[520px] gap-4 mb-6"
            >
              {/* 鼠标跟随光晕 */}
              <MouseGlow x={glowPos.x} y={glowPos.y} />
              {aboutSections.map((section, index) => (
                <HorizontalAccordionPanel
                  key={section.id}
                  section={section}
                  isActive={activeSection === index}
                  onClick={() => setActiveSection(activeSection === index ? 0 : index)}
                  isBackgroundEnabled={isBackgroundEnabled}
                />
              ))}
            </motion.div>

            {/* 移动端垂直折叠面板 - 保持可访问性 */}
            <div className="md:hidden space-y-4 mb-6">
              {aboutSections.map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                  className={`${getGlassStyle("rounded-2xl border shadow-lg overflow-hidden")} transition-all duration-300`}
                >
                  <button
                    onClick={() => setActiveSection(activeSection === index ? 0 : index)}
                    className="w-full flex items-center justify-between p-4 text-left"
                    aria-expanded={activeSection === index}
                  >
                    <div className="flex items-center gap-2">
                      {section.id === 'about-me' && <User className="w-5 h-5 text-primary" />}
                      {section.id === 'about-site' && <Globe className="w-5 h-5 text-primary" />}
                      {section.id === 'about-domain' && <Link2 className="w-5 h-5 text-primary" />}
                      <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                    </div>
                    <motion.div
                      animate={{ rotate: activeSection === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-primary text-lg">▼</span>
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {activeSection === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0">
                          <AboutSection section={section} hideTitle />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* 最后的最后 - 简洁的结尾卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={getGlassStyle("rounded-2xl p-6 border text-center")}
            >
              <p className="text-muted-foreground leading-relaxed">
                ·最后的最后，感谢你看到这里，听一个自我内耗大学生的碎碎念awa
              </p>
            </motion.div>
          </main>
        </div>
      </div>

      {/* Toast 提示 - 复制成功等反馈 */}
      <Toast message="邮箱已复制到剪贴板" visible={toastVisible} />
    </div>
  );
}
