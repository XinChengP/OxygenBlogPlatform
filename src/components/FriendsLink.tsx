'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { 
  Github, 
  Mail, 
  Globe, 
  ExternalLink, 
  Users,
  Tag,
  Sparkles
} from "lucide-react";
import Image from 'next/image';
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
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative block rounded-2xl overflow-hidden bg-white dark:bg-gray-800/80 
                 border border-gray-200/50 dark:border-gray-700/50
                 shadow-md hover:shadow-2xl
                 transition-shadow duration-500"
    >
      {/* 顶部渐变装饰条 */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ 
          background: `linear-gradient(90deg, ${categoryColor} 0%, #66ccff 50%, ${categoryColor} 100%)`,
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
              className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg"
              style={{
                boxShadow: `0 4px 20px ${categoryColor}30`
              }}
            >
              {!imageError && link.avatar ? (
                <Image
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
            
            {/* 在线状态指示器 */}
            <motion.div 
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
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
 */
function StatsInfo({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        <span>共 {total} 位好友</span>
      </div>
    </div>
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
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <StatsInfo total={friendsLinks.length} />

      {/* 友链网格 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {friendsLinks.length > 0 ? (
          friendsLinks.map((link, index) => (
            <FriendCard key={link.name} link={link} index={index} />
          ))
        ) : (
          <EmptyState />
        )}
      </motion.div>

    </div>
  );
}
