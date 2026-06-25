/**
 * 关于页面
 * 展示个人信息和博客介绍
 * 使用与其他页面统一的布局风格：PageHeader + 左右布局
 * 页面内容通过 AboutSetting.ts 配置驱动，便于后续维护
 */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Watch,
  Keyboard,
  Mouse,
  Headphones,
  Tv,
} from 'lucide-react';
import { Cover } from '@/components/ui/cover';
import { EvervaultCard, Icon } from '@/components/ui/evervault-card';
import OptimizedIcon from '@/components/core/OptimizedIcon';
import OptimizedImage from '@/components/core/OptimizedImage';
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
  mbti,
  musicPlaylist,
  frequentGames,
  occasionalGames,
  devices,
  animeList,
  type AboutSectionConfig,
  type HobbyConfig,
  type MBTIConfig,
  type MusicPlaylistConfig,
  type GameConfig,
  type DeviceConfig,
  type AnimeConfig,
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
  Laptop,
  Keyboard,
  Mouse,
  Headphones,
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
 * MBTI 人格类型卡片组件（简约版）
 * 仅展示类型大字母、中文名与一句简短描述
 */
function MBTICard({ config }: { config: MBTIConfig }) {
  return (
    // 窄卡片内垂直居中，让类型字母和说明在视觉上居中
    <div className="flex flex-col items-center text-center justify-start gap-6 h-full">
      {/* 卡片小标题 - 参考手风琴展开标题风格 */}
      <div className="flex items-center gap-2 mb-1">
        <User className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-semibold text-foreground">我的 MBTI</h3>
      </div>

      {/* 大字母类型 - 略微放大，居中显示，蓝色系渐变流动效果 */}
      <span
        className="text-6xl font-bold tracking-tight leading-none bg-gradient-to-r from-blue-500 via-sky-400 via-cyan-400 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg bg-[length:300%_300%] animate-[gradientShift_2s_ease-in-out_infinite] text-gradient-animate"
      >
        {config.type.toUpperCase()}
      </span>

      {/* 简要中文说明 - 置于类型下方 */}
      <span className="text-base text-muted-foreground font-medium">
        逻辑宅、脑洞专家、行动废
      </span>
    </div>
  );
}

/**
 * 设备卡片组件
 * 展示个人使用的设备列表，正面显示设备图标，鼠标悬停后原地翻转到背面显示设备名称
 * 参考标准 CSS 翻牌实现：外层设置 perspective，内层设置 transform-style: preserve-3d，
 * 正面背面都设置 backface-visibility: hidden，背面默认旋转 180 度
 */
function DeviceCard({ devices }: { devices: DeviceConfig[] }) {
  // 设备图标映射表
  const deviceIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    laptop: Laptop,
    desktop: Monitor,
    phone: Smartphone,
    tablet: Tablet,
    keyboard: Keyboard,
    mouse: Mouse,
    watch: Watch,
    headphones: Headphones,
  };

  return (
    <div className="flex flex-col h-full">
      {/* 卡片小标题 */}
      <div className="flex items-center gap-2 mb-4">
        <Laptop className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-semibold text-foreground">我的设备</h3>
      </div>

      {/* 设备列表 - 每个设备都是一张翻牌卡片 */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {devices.map((device, index) => {
          const IconComponent = deviceIconMap[device.id];
          // 每张卡片独立记录悬停状态，让外层容器作为稳定的鼠标判定区域
          const [isHovered, setIsHovered] = useState(false);

          return (
            // 外层容器：负责入场动画、鼠标事件检测和 3D 透视效果
            // 只有鼠标离开整个卡片区域时才会触发翻转回去，避免内部绝对定位面影响判定
            <motion.div
              key={device.id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.08, type: 'spring', stiffness: 200 }}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              className="cursor-pointer"
              style={{ perspective: '1000px' }}
            >
              {/* 翻转容器：根据外层悬停状态旋转 180 度 */}
              <motion.div
                className="relative w-full h-full min-h-[100px]"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isHovered ? 180 : 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* 正面 - 显示设备图标和设备名称 */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition-colors duration-300"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {IconComponent && <IconComponent className="w-8 h-8" />}
                  <span className="text-sm font-medium text-center">{device.name}</span>
                </div>

                {/* 背面 - 翻转后显示设备配置信息，没有配置时保持空白 */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 rounded-xl border border-primary/20 bg-primary text-primary-foreground shadow-sm"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {device.backContent ? (
                    device.backContent.map((line, lineIndex) => (
                      <span key={lineIndex} className="text-xs font-medium text-center">
                        {line}
                      </span>
                    ))
                  ) : null}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 个人歌单卡片组件
 * 左侧展示歌单名称、简介和跳转按钮，右侧展示正方形封面图
 */
function MusicPlaylistCard({ config }: { config: MusicPlaylistConfig }) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-5 h-full">
      {/* 左侧：歌单信息 */}
      <div className="flex-1 flex flex-col justify-start gap-3 order-2 sm:order-1">
        {/* 卡片小标题 - 参考手风琴展开标题风格 */}
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">我的歌单</h3>
        </div>

        <h3 className="text-xl font-semibold text-foreground">{config.name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {config.description}
        </p>
        <a
          href={config.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center sm:justify-start gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200"
        >
          <span className="px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-200">
            {config.buttonText}
          </span>
        </a>
      </div>

      {/* 右侧：正方形封面，固定尺寸控制整体卡片高度 */}
      <div className="h-49 w-49 shrink-0 rounded-xl shadow-md order-1 sm:order-2 relative">
        <OptimizedImage
          src={config.coverImage}
          alt={config.name}
          width={196}
          height={196}
          className="w-full h-full"
          objectFit="cover"
          borderRadius="0.75rem"
          loading="lazy"
        />
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 12px 8px rgba(0,0,0,0.25)' }} />
      </div>
    </div>
  );
}

/**
 * 我追的番卡片组件
 * 使用 CSS Scroll Snap 实现竖直滚动分页效果，图片铺满整个容器
 */
function AnimeCard({ animeList }: { animeList: AnimeConfig[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const target = scrollRef.current;
    if (!target) return;
    const scrollTop = target.scrollTop;
    const height = target.clientHeight;
    const index = Math.round(scrollTop / height);
    setActiveIndex(index);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 竖直滚动容器 - 铺满整个父容器 */}
      <div
        ref={scrollRef}
        className="overflow-y-auto snap-y snap-mandatory h-full w-full"
        style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none' }}
        onScroll={handleScroll}
      >
        {animeList.map((anime) => (
          <div
            key={anime.id}
            className="snap-start w-full h-full relative"
          >
            {/* 封面铺满 */}
            <img
              src={anime.coverImage}
              alt={anime.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            {/* 遮罩层 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* 信息叠加在底部 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-white drop-shadow-lg">{anime.name}</h4>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/80 text-primary-foreground">
                  {anime.status}
                </span>
              </div>
              <p className="text-sm text-white/80 line-clamp-2">{anime.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 标题 - 左上角叠加 */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <Tv className="w-5 h-5 text-white drop-shadow-lg" />
        <h3 className="text-xl font-semibold text-white drop-shadow-lg">我追的番</h3>
      </div>

      {/* 滚动指示器 - 右下角叠加 */}
      <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
        {animeList.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              activeIndex === index ? 'bg-white w-4' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 游戏库横向手风琴面板组件
 * 桌面端多个面板水平排列，点击后展开显示游戏详情，其他面板收缩只显示封面和名称
 * 使用 Framer Motion layout 动画实现平滑的宽度过渡
 */
function GameLibraryAccordionPanel({
  game,
  isActive,
  onClick,
  isBackgroundEnabled,
  collapsedFlex = 1,
}: {
  game: GameConfig;
  isActive: boolean;
  onClick: () => void;
  isBackgroundEnabled: boolean;
  collapsedFlex?: number;
}) {
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
        flex: isActive ? 3 : collapsedFlex,
      }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative overflow-hidden rounded-2xl border cursor-pointer ${glassClass} transition-all duration-300 ${isActive ? 'shadow-2xl shadow-primary/20' : 'shadow-lg'}`}
    >
      {/* 共享的封面背景层 - 始终存在于 DOM 中，避免 AnimatePresence 卸载挂载导致闪烁 */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={getAssetPath(game.coverImage)}
          alt={game.name}
          className="absolute left-0 w-full object-cover transition-all duration-500 ease-out"
          style={{
            height: game.coverSize || '120%',
            top: `${-(parseVerticalPosition(game.coverVerticalPosition) / 100) * (parseInt(game.coverSize || '120', 10) - 100)}%`,
            objectPosition: `${game.coverHorizontalPosition || 'center'} center`
          }}
          loading="lazy"
        />
      </div>

      {/* 收缩状态遮罩与标题 - 通过 opacity 过渡，避免卸载 */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-300"
        style={{ opacity: isActive ? 0 : 1, pointerEvents: isActive ? 'none' : 'auto' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="relative z-10 text-center">
          <h3 className="text-sm font-semibold text-white drop-shadow-lg whitespace-nowrap">
            {game.name}
          </h3>
        </div>
      </div>

      {/* 展开状态遮罩与描述 - 通过 opacity 过渡，避免卸载 */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-3 transition-opacity duration-300"
        style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/5" />
        <p className="relative z-10 text-sm text-white/90 leading-relaxed drop-shadow-md">
          {game.description}
        </p>
      </div>
    </motion.div>
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
      <div className="text-muted-foreground leading-relaxed space-y-3 text-base">
        {section.paragraphs.map((paragraph, index) => (
          <p key={index} className="indent-8">
            {paragraph}
          </p>
        ))}
      </div>

      {/* 引用/比喻区块 */}
      {section.quote && (
        <div className="my-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-base text-muted-foreground/80 mb-2">{section.quote.intro}</p>
          <p className="italic whitespace-pre-line text-base">{section.quote.text}</p>
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
 * 解析垂直位置配置
 * 支持百分比字符串和关键字（top/center/bottom），返回 0-100 的数字
 * 0 表示最上方，100 表示最下方
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
 * 桌面端三个面板水平排列，鼠标悬停后展开显示内容，其他面板收缩只显示标题
 * 参考颜色调色板悬停动画：默认均分，悬停项展开，过渡 0.3s ease-out
 */
function HorizontalAccordionPanel({
  section,
  isActive,
  onHoverStart,
  isBackgroundEnabled,
}: {
  section: AboutSectionConfig;
  isActive: boolean;
  onHoverStart: () => void;
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
      onHoverStart={onHoverStart}
      initial={false}
      animate={{
        flex: isActive ? 3 : 1,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
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
            {/* 横向标题 - 放置在面板底部 */}
            <div className="absolute inset-0 flex items-end justify-center p-4">
              <div className="flex items-center gap-2 text-white drop-shadow-lg whitespace-nowrap">
                {IconComponent && <IconComponent className="w-5 h-5" />}
                <h3 className="text-lg font-semibold">{section.title}</h3>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative h-full flex flex-col p-6 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            {/* 星空粒子背景 */}
            <StarField count={12} className="z-0" />

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
  // 横向手风琴当前展开的区块索引，默认全部收起（-1 表示无展开项）
  const [activeSection, setActiveSection] = useState(-1);
  // 常玩游戏手风琴当前展开的游戏索引，默认展开第一个
  const [activeFrequentGame, setActiveFrequentGame] = useState(0);
  // 偶尔玩/通关游戏手风琴当前展开的游戏索引，默认妄想症（索引5）
  const [activeOccasionalGame, setActiveOccasionalGame] = useState(5);

  // 确保组件已挂载，避免主题/动画相关的水合不匹配
  useEffect(() => {
    setMounted(true);
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

              {/* 社交链接 - 分两行显示，每行四个 */}
              <div className="px-6 pb-6">
                <div className="flex flex-col items-center gap-3">
                  {/* 第一行 */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 w-full justify-items-center gap-2">
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
                  </div>
                  {/* 第二行 */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 w-full justify-items-center gap-2">
                    {/* 抖音 */}
                    <SocialLink
                      href="https://v.douyin.com/j0e2ZbjV_bM/"
                      title="抖音"
                      src="/LogosTiktokIcon.svg"
                      alt="抖音"
                    />
                    {/* 微博 */}
                    <SocialLink
                      href="https://weibo.com/7415729999"
                      title="微博"
                      src="/assets/weibo.svg"
                      alt="微博"
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
            {/* 桌面端横向手风琴 - 三个面板水平排列，鼠标悬停展开 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden md:flex h-[580px] gap-4 mb-6"
              onMouseLeave={() => setActiveSection(-1)}
            >
              {aboutSections.map((section, index) => (
                <HorizontalAccordionPanel
                  key={section.id}
                  section={section}
                  isActive={activeSection === index}
                  onHoverStart={() => setActiveSection(index)}
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

            {/* MBTI 与歌单卡片并排区域 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6"
            >
              {/* MBTI 卡片 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={getGlassStyle("rounded-2xl p-6 border md:col-span-2")}
              >
                <MBTICard config={mbti} />
              </motion.div>

              {/* 个人歌单卡片 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className={getGlassStyle("rounded-2xl p-6 border md:col-span-3")}
              >
                <MusicPlaylistCard config={musicPlaylist} />
              </motion.div>
            </motion.div>

          </main>

          {/* 我的游戏库 - 横跨整个页面宽度 */}
          <div className="col-span-full lg:col-span-4 mt-0">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={`${getGlassStyle("rounded-2xl p-6 border")} mb-6`}
            >
              {/* 区块标题 */}
              <div className="flex items-center gap-2 mb-5">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">我的游戏库</h3>
              </div>

              {/* 常玩游戏 - 桌面端横向手风琴 */}
              <div className="hidden md:flex h-[400px] gap-4 mb-4">
                {frequentGames.map((game, index) => (
                  <GameLibraryAccordionPanel
                    key={game.id}
                    game={game}
                    isActive={activeFrequentGame === index}
                    onClick={() => setActiveFrequentGame(index)}
                    isBackgroundEnabled={isBackgroundEnabled}
                  />
                ))}
              </div>

              {/* 偶尔玩/通关 - 桌面端横向手风琴 */}
              <div className="hidden md:flex h-[400px] gap-4">
                {occasionalGames.map((game, index) => (
                  <GameLibraryAccordionPanel
                    key={game.id}
                    game={game}
                    isActive={activeOccasionalGame === index}
                    onClick={() => setActiveOccasionalGame(index)}
                    isBackgroundEnabled={isBackgroundEnabled}
                    collapsedFlex={0.5}
                  />
                ))}
              </div>

              {/* 移动端纵向折叠面板 - 常玩 */}
              <div className="md:hidden space-y-4 mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">常玩</h4>
                {frequentGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                    className={`${getGlassStyle("rounded-2xl border shadow-lg overflow-hidden")} transition-all duration-300`}
                  >
                    <button
                      onClick={() => setActiveFrequentGame(index)}
                      className="w-full flex items-center justify-between p-4 text-left"
                      aria-expanded={activeFrequentGame === index}
                    >
                      <h3 className="text-lg font-semibold text-foreground">{game.name}</h3>
                      <motion.div
                        animate={{ rotate: activeFrequentGame === index ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <span className="text-primary text-lg">▼</span>
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {activeFrequentGame === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              <div className="flex-1 flex flex-col gap-2 order-2 sm:order-1">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {game.description}
                                </p>
                              </div>
                              <div className="h-28 w-28 shrink-0 rounded-xl overflow-hidden shadow-md order-1 sm:order-2">
                                <OptimizedImage
                                  src={game.coverImage}
                                  alt={game.name}
                                  width={112}
                                  height={112}
                                  className="w-full h-full"
                                  objectFit="cover"
                                  borderRadius="0.75rem"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* 移动端纵向折叠面板 - 偶尔玩/通关 */}
              <div className="md:hidden space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">偶尔玩/通关</h4>
                {occasionalGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                    className={`${getGlassStyle("rounded-2xl border shadow-lg overflow-hidden")} transition-all duration-300`}
                  >
                    <button
                      onClick={() => setActiveOccasionalGame(index)}
                      className="w-full flex items-center justify-between p-4 text-left"
                      aria-expanded={activeOccasionalGame === index}
                    >
                      <h3 className="text-lg font-semibold text-foreground">{game.name}</h3>
                      <motion.div
                        animate={{ rotate: activeOccasionalGame === index ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <span className="text-primary text-lg">▼</span>
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {activeOccasionalGame === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              <div className="flex-1 flex flex-col gap-2 order-2 sm:order-1">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {game.description}
                                </p>
                              </div>
                              <div className="h-28 w-28 shrink-0 rounded-xl overflow-hidden shadow-md order-1 sm:order-2">
                                <OptimizedImage
                                  src={game.coverImage}
                                  alt={game.name}
                                  width={112}
                                  height={112}
                                  className="w-full h-full"
                                  objectFit="cover"
                                  borderRadius="0.75rem"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* 页底区域 */}
          <div className="col-span-full lg:col-span-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-6">
              {/* 左侧 - 我的设备卡片 30% */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className={`${getGlassStyle("rounded-2xl p-6 border")}`}
              >
                <DeviceCard devices={devices} />
              </motion.div>

              {/* 右列 - 我追的番 70%，锁定4:3 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: 0.65 }}
                className="relative rounded-2xl border overflow-hidden"
                style={{ aspectRatio: '4/3' }}
              >
                <AnimeCard animeList={animeList} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast 提示 - 复制成功等反馈 */}
      <Toast message="邮箱已复制到剪贴板" visible={toastVisible} />
    </div>
  );
}
