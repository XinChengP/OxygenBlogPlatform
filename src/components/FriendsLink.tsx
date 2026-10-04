'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Github,
  Mail,
  Globe,
  ExternalLink,
  Users,
  Sparkles,
  UserPlus,
  ArrowDown
} from "lucide-react";
import { 
  friendsLinks, 
  friendCategoryLabels, 
  friendCategoryColors,
  type FriendLink,
  type FriendLinkCategory
} from '@/setting/AboutSetting';
import { getAssetPath } from '@/utils/assetUtils';

/**
 * 处理友链头像路径，处理basePath
 */
function getFriendAvatarPath(avatar: string): string {
  return getAssetPath(avatar);
}

/**
 * 获取网站图标
 */
function getSiteIcon(url: string) {
  if (url.includes('github')) return <Github className="w-4 h-4" />;
  if (url.includes('mail') || url.includes('@')) return <Mail className="w-4 h-4" />;
  return <Globe className="w-4 h-4" />;
}

/**
 * 获取分类图标颜色
 */
function getCategoryColor(category?: FriendLinkCategory): string {
  if (!category) return '#66ccff';
  return friendCategoryColors[category];
}

/**
 * 获取分类标签
 */
function getCategoryLabel(category?: FriendLinkCategory): string {
  if (!category) return '友链';
  return friendCategoryLabels[category];
}

/**
 * 友链卡片组件
 * 展示单个友链信息，带有精美的视觉效果
 */
function FriendCard({ link, index }: { link: FriendLink; index: number }) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const categoryColor = getCategoryColor(link.category);
  const siteIcon = getSiteIcon(link.url);

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        // 单帧延迟收敛到 0.06s，并设置 0.3s 上限，避免友链数量增多时入场等待过长
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      /* 悬停位移与全站卡片统一为 -3（原 -8 幅度过大）；阴影过渡时长统一 300ms */
      whileHover={{
        y: -3,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      /* 卡片视觉与全站统一：迁入玻璃强档令牌 glass-card-strong（近实底 + 细微通透），
         rounded-xl 标准圆角，阴影/边框由令牌承载，悬停加深并泛天依蓝 */
      className="group relative block rounded-xl overflow-hidden glass-card-strong
                 hover:shadow-card-hover
                 transition-[box-shadow,border-color] duration-300 hover:border-primary/30"
    >
      {/* 顶部渐变装饰条：青→天依蓝→青（2026-10 收敛进蓝色系色板，
          原 blog 分类绿色 #10b981 跑出色板）；友链类型区分由卡片内分类标签承担 */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, #06b6d4 0%, var(--primary) 50%, #06b6d4 100%)',
          backgroundSize: '200% 100%'
        }}
        animate={isHovered ? { backgroundPosition: ['0% 0%', '200% 0%'] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />

      {/* 悬停时的背景光效 */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${categoryColor}15 0%, transparent 70%)`
        }}
      />

      <div className="relative p-6">
        {/* 头部：头像和基本信息 */}
        <div className="flex items-start gap-4 mb-4">
          {/* 头像容器 */}
          <motion.div 
            className="relative flex-shrink-0"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="w-16 h-16 rounded-xl overflow-hidden shadow-lg"
              style={{
                boxShadow: `0 4px 20px ${categoryColor}30`
              }}
            >
              {!imageError && link.avatar ? (
                /*
                  用普通 img 而非 next/image：友链头像域名由友链配置任意指定，
                  next/image 的 remotePatterns 白名单无法穷举；
                  静态导出模式下 next/image 本就 unoptimized（无优化收益），
                  只剩域名校验的负担。
                */
                <img
                  src={getFriendAvatarPath(link.avatar)}
                  alt={link.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${categoryColor} 0%, #66ccff 100%)`
                  }}
                >
                  <Globe className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            
          </motion.div>

          {/* 名称和描述 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-lg font-bold text-gray-800 dark:text-white truncate group-hover:text-primary transition-colors">
                {link.name}
              </h4>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                transition={{ duration: 0.2 }}
              >
                <ExternalLink className="w-4 h-4 text-primary" />
              </motion.div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {link.description}
            </p>
          </div>
        </div>

        {/* 底部：链接信息 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {siteIcon}
            <span className="truncate max-w-[150px]">
              {new URL(link.url).hostname.replace(/^www\./, '') + new URL(link.url).pathname.replace(/\/$/, '')}
            </span>
          </div>
          
          {/* 访问按钮 */}
          <motion.div
            className="flex items-center gap-1 text-sm font-medium text-primary"
            animate={{ x: isHovered ? 5 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              访问
            </span>
            <ExternalLink className="w-4 h-4" />
          </motion.div>
        </div>
      </div>
    </motion.a>
  );
}

/**
 * 空状态组件
 * 当没有友链时显示的占位内容
 */
function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="col-span-full py-16 px-8"
    >
      <div className="max-w-md mx-auto text-center">
        {/* 装饰图标 */}
        <motion.div 
          className="relative inline-flex items-center justify-center mb-6"
          animate={{ 
            y: [0, -10, 0],
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 
                          flex items-center justify-center border border-primary/20">
            <Users className="w-12 h-12 text-primary/60" />
          </div>
        </motion.div>

        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
          暂无友情链接
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          友情链接正在收集中，欢迎申请交换友链，让我们一起在这个广阔的世界中相遇
        </p>
        
        {/* 提示信息 */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
          <Sparkles className="w-4 h-4" />
          <span>期待你的加入</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 统计信息组件
 * 以低调的主题色胶囊展示好友总数，与空状态的胶囊视觉语言保持一致
 */
function StatsInfo({ total }: { total: number }) {
  return (
    <div className="mb-6">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                       bg-primary/10 border border-primary/15
                       text-primary text-xs font-medium">
        <Users className="w-3.5 h-3.5" />
        共 {total} 位好友
      </span>
    </div>
  );
}

/**
 * 「申请友链」占位卡片
 * 固定渲染在友链网格末尾：
 * 1. 友链数量较少时填补网格空位，避免末行大片留白
 * 2. 以虚线边框区分「可申请」与「已存在」的友链卡，点击平滑滚动到交换说明区
 * 3. 悬停位移与友链卡片保持一致（y: -3），维持整套卡片的交互统一感
 */
function ApplyInviteCard({ index }: { index: number }) {
  /**
   * 点击占位卡时平滑滚动到页面下方的交换友链说明区域
   * 尊重系统「减少动态效果」设置：开启时退化为瞬间定位
   */
  const handleScrollToExchange = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // 拦截锚点默认跳转，改用 scrollIntoView 以获得平滑滚动
    event.preventDefault();
    const target = document.getElementById('exchange');
    if (!target) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  };

  return (
    <motion.a
      href="#exchange"
      onClick={handleScrollToExchange}
      aria-label="申请交换友链，查看交换说明"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        y: -3,
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      /* 虚线边框 + 半透明卡片底色：页面衬有全屏背景图，纯透明底会让占位卡失去轮廓，
         因此借用 RelatedLinks 的做法给 card 色底加毛玻璃；
         底色透明度（60~70%）高于实体友链卡（95%），配合虚线，虚实区分明确。
         网格默认 align-items: stretch，本卡会自动与同行友链卡等高，内部用 flex 垂直居中 */
      className="group relative flex flex-col items-center justify-center text-center
                 rounded-xl border border-dashed border-primary/40
                 bg-card/70 backdrop-blur-sm supports-[backdrop-filter]:bg-card/60
                 p-6 min-h-[192px]
                 hover:border-primary/70 hover:bg-card/90
                 transition-[background-color,border-color] duration-300
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      {/* 图标：虚框圆角方块，悬停时轻微放大，呼应友链卡的头像位置 */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4
                      border border-dashed border-primary/40 text-primary
                      transition-transform duration-300 group-hover:scale-110">
        <UserPlus className="w-6 h-6" />
      </div>

      {/* 标题与说明 */}
      <h4 className="text-base font-semibold text-foreground mb-1">
        想在这里安个家qwq？
      </h4>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        欢迎申请交换友链awa！
      </p>

      {/* 行动提示：悬停时箭头轻向下移动，暗示页面会向下滚动 */}
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        点这里查看交换方式owo
        <ArrowDown className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
      </span>
    </motion.a>
  );
}

/**
 * 友情链接组件
 * 展示友情链接列表
 */
export default function FriendsLink() {
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-full mb-6"></div>
        {/* 骨架断点与正式网格保持一致：grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <StatsInfo total={friendsLinks.length} />

      {/* 友链网格：断点与全站卡片网格规范统一 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {friendsLinks.length > 0 ? (
          <>
            {friendsLinks.map((link, index) => (
              <FriendCard key={link.name} link={link} index={index} />
            ))}
            {/* 末尾固定一张「申请友链」占位卡，填补末行空位并引导交换 */}
            <ApplyInviteCard index={friendsLinks.length} />
          </>
        ) : (
          <EmptyState />
        )}
      </motion.div>

    </div>
  );
}
