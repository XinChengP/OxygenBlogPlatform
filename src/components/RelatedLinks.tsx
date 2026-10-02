'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Github,
  Mail,
  Globe,
  Code2,
  Palette,
  Wrench,
  BookOpen,
  FolderGit2,
  Fish,
  Library
} from 'lucide-react';
import {
  relatedLinks,
  categoryLabels,
  categoryColors,
  RelatedLinkCategory,
  RelatedLink
} from '@/setting/AboutSetting';

/**
 * 分类图标映射：每个分类使用专属的 Lucide 图标
 */
const categoryIcons: Record<RelatedLinkCategory, React.ReactNode> = {
  framework: <Code2 className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
  ui: <Palette className="w-4 h-4" />,
  tutorial: <BookOpen className="w-4 h-4" />,
  project: <FolderGit2 className="w-4 h-4" />,
  fish: <Fish className="w-4 h-4" />
};

/**
 * 根据链接地址推断站点图标（GitHub/邮箱/通用网站）
 */
function getLinkIcon(url: string): React.ReactNode {
  if (url.includes('github')) return <Github className="w-5 h-5" />;
  if (url.includes('mail') || url.includes('email')) return <Mail className="w-5 h-5" />;
  return <Globe className="w-5 h-5" />;
}

/**
 * 链接卡片组件
 * 视觉规范与全站卡片统一：rounded-xl、bg-card/95、border-border、shadow-card 令牌
 * 交互规范：原生 <a> 标签（支持键盘 Tab 聚焦、回车打开、中键新开标签），
 *          悬停位移 -3 与友链卡片一致；CSS 过渡只管阴影边框，位移由 Framer Motion 驱动
 */
function LinkCard({ link, index }: { link: RelatedLink; index: number }) {
  const categoryColor = categoryColors[link.category];

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        // 延迟收敛到 0.04s/项并设置 0.3s 上限，避免同组条目多时入场等待过长
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        y: -3,
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      /* 卡片容器使用全站统一视觉令牌；补全键盘聚焦光环（焦点环跟随主题色） */
      className="group relative block p-5 rounded-xl overflow-hidden
                 bg-card/95 border border-border
                 shadow-card hover:shadow-card-hover
                 transition-[box-shadow,border-color] duration-300 hover:border-primary/30
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      {/* 悬停时的分类色光效：极低透明度径向渐变，仅增加层次不喧宾夺主 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${categoryColor}10 0%, transparent 70%)`
        }}
      />

      <div className="relative">
        {/* 头部：站点图标 + 悬停显示的外链角标（纯 CSS group-hover 控制，无需状态重渲染） */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center
                       transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}40 100%)`,
              color: categoryColor
            }}
          >
            {getLinkIcon(link.url)}
          </div>
          <ExternalLink
            className="w-4 h-4 text-muted-foreground/60
                       opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        </div>

        {/* 名称与分类胶囊 */}
        <h3 className="font-semibold text-foreground mb-1 line-clamp-1 text-sm">
          {link.name}
        </h3>
        <span
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full mb-2"
          style={{
            backgroundColor: `${categoryColor}20`,
            color: categoryColor
          }}
        >
          {categoryIcons[link.category]}
          {categoryLabels[link.category]}
        </span>

        {/* 描述：最多两行截断 */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {link.description}
        </p>

        {/* 标签：最多展示 3 个 */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {link.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted
                           text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.a>
  );
}

/**
 * 统计信息组件
 * 与友链页的统计胶囊同款样式，形成跨页面的统一视觉语言
 */
function StatsInfo({ total, categories }: { total: number; categories: number }) {
  return (
    <div className="mb-6">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                       bg-primary/10 border border-primary/15
                       text-primary text-xs font-medium">
        <Library className="w-3.5 h-3.5" />
        共 {total} 个资源 · {categories} 个分类
      </span>
    </div>
  );
}

/**
 * 相关链接组件
 * 按分类分组展示，每组标题带分类图标与数量，组内卡片三列网格
 */
export default function RelatedLinks() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 按分类归组（保持数据中的出现顺序）
  const groupedLinks = useMemo(() => {
    const groups: Record<string, RelatedLink[]> = {};
    relatedLinks.forEach((link) => {
      if (!groups[link.category]) groups[link.category] = [];
      groups[link.category].push(link);
    });
    return groups;
  }, []);

  // 未挂载时展示与正式结构一致的骨架，避免加载闪空
  if (!mounted) {
    return (
      <div>
        <div className="h-7 w-44 bg-gray-200 dark:bg-gray-700 rounded-full mb-6"></div>
        <div className="space-y-8">
          {[1, 2].map((group) => (
            <div key={group}>
              <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 统计信息 */}
      <StatsInfo total={relatedLinks.length} categories={Object.keys(groupedLinks).length} />

      <div className="space-y-8 mt-6">
        {Object.entries(groupedLinks).map(([category, links], groupIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.08 }}
          >
            {/* 分组标题：分类色图标块 + 标题 + 数量 */}
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${categoryColors[category as RelatedLinkCategory]}20`,
                  color: categoryColors[category as RelatedLinkCategory]
                }}
              >
                {categoryIcons[category as RelatedLinkCategory]}
              </div>
              <h3 className="text-base font-bold text-foreground">
                {categoryLabels[category as RelatedLinkCategory]}
              </h3>
              <span className="text-xs text-muted-foreground/70">
                {links.length}
              </span>
            </div>

            {/* 组内卡片网格：断点与全站规范统一，间距放宽到 gap-4 更透气 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {links.map((link, index) => (
                <LinkCard key={link.name} link={link} index={index} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
