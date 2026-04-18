'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  ExternalLink,
  Github,
  Mail,
  Globe,
  Search,
  Grid3X3,
  List,
  Tag,
  Sparkles,
  Code2,
  Palette,
  Wrench,
  BookOpen,
  FolderGit2,
  X
} from 'lucide-react';
import {
  relatedLinks,
  categoryLabels,
  categoryColors,
  RelatedLinkCategory,
  RelatedLink
} from '@/setting/AboutSetting';

/**
 * 分类图标映射
 */
const categoryIcons: Record<RelatedLinkCategory, React.ReactNode> = {
  framework: <Code2 className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
  ui: <Palette className="w-4 h-4" />,
  tutorial: <BookOpen className="w-4 h-4" />,
  project: <FolderGit2 className="w-4 h-4" />
};

/**
 * 获取链接的域名
 */
function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * 获取链接的图标
 */
function getLinkIcon(url: string): React.ReactNode {
  if (url.includes('github')) {
    return <Github className="w-5 h-5" />;
  }
  if (url.includes('mail') || url.includes('email')) {
    return <Mail className="w-5 h-5" />;
  }
  return <Globe className="w-5 h-5" />;
}

/**
 * 相关链接卡片组件
 */
interface LinkCardProps {
  link: RelatedLink;
  index: number;
  viewMode: 'grid' | 'list';
}

function LinkCard({ link, index, viewMode }: LinkCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryColor = categoryColors[link.category];

  const handleClick = () => {
    // 记录点击次数到本地存储
    const clickKey = `link_clicks_${link.name}`;
    const currentClicks = parseInt(localStorage.getItem(clickKey) || '0');
    localStorage.setItem(clickKey, (currentClicks + 1).toString());
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className="group relative flex items-center gap-4 p-4 rounded-xl backdrop-blur-md bg-card/90 
                   border border-border shadow-lg supports-[backdrop-filter]:bg-card/75
                   hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
      >
        {/* 图标 */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                     transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}40 100%)`,
            color: categoryColor
          }}
        >
          {getLinkIcon(link.url)}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {link.name}
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${categoryColor}20`,
                color: categoryColor
              }}
            >
              {categoryLabels[link.category]}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {link.description}
          </p>
        </div>

        {/* 域名 */}
        <div className="hidden sm:block text-xs text-gray-400 dark:text-gray-500">
          {getDomain(link.url)}
        </div>

        {/* 箭头 */}
        <ExternalLink
          className={`w-4 h-4 text-gray-400 transition-all duration-300
                     ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
        />
      </motion.div>
    );
  }

  // 网格模式
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className="group relative p-5 rounded-2xl backdrop-blur-md bg-card/90 
                 border border-border shadow-lg supports-[backdrop-filter]:bg-card/75
                 hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* 背景渐变 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at top right, ${categoryColor}10 0%, transparent 70%)`
        }}
      />

      {/* 内容 */}
      <div className="relative">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center
                       transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}40 100%)`,
              color: categoryColor
            }}
          >
            {getLinkIcon(link.url)}
          </div>
          <ExternalLink
            className={`w-4 h-4 text-gray-400 transition-all duration-300
                       ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>

        {/* 标题和分类 */}
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
            {link.name}
          </h3>
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${categoryColor}20`,
              color: categoryColor
            }}
          >
            {categoryIcons[link.category]}
            {categoryLabels[link.category]}
          </span>
        </div>

        {/* 描述 */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {link.description}
        </p>

        {/* 标签 */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {link.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800
                           text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * 统计卡片组件
 */
function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-md bg-card/90 
                 border border-border shadow-lg supports-[backdrop-filter]:bg-card/75"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </motion.div>
  );
}

/**
 * 相关链接组件 - 优化版本
 * 支持分类筛选、搜索、网格/列表视图切换
 */
export default function RelatedLinks() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RelatedLinkCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 筛选链接
  const filteredLinks = useMemo(() => {
    return relatedLinks.filter((link) => {
      const matchesSearch =
        searchQuery === '' ||
        link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || link.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // 按分类分组
  const groupedLinks = useMemo(() => {
    const groups: Record<string, RelatedLink[]> = {};
    filteredLinks.forEach((link) => {
      if (!groups[link.category]) {
        groups[link.category] = [];
      }
      groups[link.category].push(link);
    });
    return groups;
  }, [filteredLinks]);

  // 统计信息
  const stats = useMemo(() => {
    const total = relatedLinks.length;
    const categories = Object.keys(
      relatedLinks.reduce((acc, link) => {
        acc[link.category] = true;
        return acc;
      }, {} as Record<string, boolean>)
    ).length;
    return { total, categories };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Link2 className="w-5 h-5" />}
          label="总链接数"
          value={stats.total}
          color="#66ccff"
        />
        <StatCard
          icon={<Tag className="w-5 h-5" />}
          label="分类数"
          value={stats.categories}
          color="#8b5cf6"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="筛选结果"
          value={filteredLinks.length}
          color="#10b981"
        />
        <StatCard
          icon={<Globe className="w-5 h-5" />}
          label="项目源码"
          value={relatedLinks.filter((l) => l.category === 'project').length}
          color="#ec4899"
        />
      </div>

      {/* 搜索和筛选栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl backdrop-blur-md bg-card/90 border border-border shadow-lg supports-[backdrop-filter]:bg-card/75 space-y-4"
      >
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索链接名称、描述或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-background border border-border
                       focus:border-primary/50 focus:ring-2 focus:ring-primary/20
                       transition-all duration-300 outline-none
                       text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* 分类筛选和视图切换 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                         ${
                           selectedCategory === 'all'
                             ? 'bg-primary text-white shadow-lg shadow-primary/25'
                             : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                         }`}
            >
              全部
            </button>
            {(Object.keys(categoryLabels) as RelatedLinkCategory[]).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                           flex items-center gap-1.5
                           ${
                             selectedCategory === category
                               ? 'text-white shadow-lg'
                               : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                           }`}
                style={{
                  backgroundColor:
                    selectedCategory === category ? categoryColors[category] : undefined
                }}
              >
                {categoryIcons[category]}
                {categoryLabels[category]}
              </button>
            ))}
          </div>

          {/* 视图切换 */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-300
                         ${
                           viewMode === 'grid'
                             ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                             : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                         }`}
              title="网格视图"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-300
                         ${
                           viewMode === 'list'
                             ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                             : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                         }`}
              title="列表视图"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 链接列表 */}
      <AnimatePresence mode="wait">
        {filteredLinks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-gray-100 dark:bg-gray-800">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              未找到相关链接
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              尝试使用其他关键词搜索
            </p>
          </motion.div>
        ) : selectedCategory === 'all' && viewMode === 'grid' ? (
          // 按分类分组的网格视图
          <div className="space-y-8">
            {Object.entries(groupedLinks).map(([category, links], groupIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
              >
                {/* 分类标题 */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${categoryColors[category as RelatedLinkCategory]}20`,
                      color: categoryColors[category as RelatedLinkCategory]
                    }}
                  >
                    {categoryIcons[category as RelatedLinkCategory]}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {categoryLabels[category as RelatedLinkCategory]}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({links.length})
                  </span>
                </div>

                {/* 链接网格 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {links.map((link, index) => (
                    <LinkCard
                      key={link.name}
                      link={link}
                      index={index}
                      viewMode="grid"
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          // 普通网格或列表视图
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }
          >
            {filteredLinks.map((link, index) => (
              <LinkCard
                key={link.name}
                link={link}
                index={index}
                viewMode={viewMode}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-6 border-t border-border/50"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          发现更多优质资源，持续更新中...
        </p>
      </motion.div>
    </div>
  );
}
