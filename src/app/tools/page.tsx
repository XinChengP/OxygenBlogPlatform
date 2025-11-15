/**
 * 小工具页面
 * 提供多种实用小工具
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { 
  toolCategories, 
  getToolsByCategory, 
  getFeaturedTools,
  ToolItem 
} from '@/setting/toolsSetting';
import ScrollToTop from '@/components/ScrollToTop';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import Link from 'next/link';

// 工具卡片组件
interface ToolCardProps {
  tool: ToolItem;
  index: number;
  isDark: boolean;
}

function ToolCard({ tool, index, isDark }: ToolCardProps) {
  const getGlassStyle = (baseStyle: string) => {
    return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
  };

  if (!tool.isActive) {
    return (
      <motion.div
        key={tool.id}
        className={getGlassStyle("rounded-lg shadow-md p-6 border opacity-60")}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tool.icon}</span>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {tool.name}
            </h3>
          </div>
          <span className="px-2 py-1 text-xs bg-gray-500 text-white rounded-full">
            开发中
          </span>
        </div>
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
          {tool.description}
        </p>
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed opacity-50"
        >
          即将上线
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={tool.id}
      className={getGlassStyle("rounded-lg shadow-md p-6 border hover:shadow-xl transition-all duration-300")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tool.icon}</span>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {tool.name}
          </h3>
        </div>
        {tool.featured && (
          <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
            特色
          </span>
        )}
      </div>
      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
        {tool.description}
      </p>
      <Link
        href={tool.path!}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <span>立即使用</span>
        <span>→</span>
      </Link>
    </motion.div>
  );
}

export default function ToolsPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('tools');
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState<boolean>(true);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 如果组件未挂载，显示占位符
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';
  
  // 获取毛玻璃样式类名
  const getGlassStyle = (baseStyle: string) => {
    if (containerStyle && containerStyle.className) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };
  
  // 处理分类变化
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <main 
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''} ${containerStyle.className}`}
      style={containerStyle.style}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 页面标题 */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🧩 小工具
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            提供各种实用的小工具，提高您的工作效率
          </p>
        </motion.div>
        
        {/* 移动端分类筛选折叠按钮 */}
        <motion.div 
          className="lg:hidden mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            onClick={() => setIsCategoryCollapsed(!isCategoryCollapsed)}
            className={getGlassStyle("w-full rounded-lg shadow-md p-4 flex items-center justify-between text-foreground hover:bg-card/90 transition-colors border")}
          >
            <span className="flex items-center gap-2">
              <span>🗂️</span>
              <span className="font-medium">工具分类</span>
              <span className="text-sm text-muted-foreground">
                ({selectedCategory === 'all' ? '全部' : selectedCategory})
              </span>
            </span>
            <motion.span
              animate={{ rotate: isCategoryCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground"
            >
              ▼
            </motion.span>
          </button>
          
          {/* 移动端分类选项 */}
          <motion.div
            initial={false}
            animate={{ 
              height: isCategoryCollapsed ? 0 : 'auto',
              opacity: isCategoryCollapsed ? 0 : 1
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={getGlassStyle("rounded-lg shadow-md mt-2 p-4 border")}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {toolCategories.map((category) => (
                   <button
                     key={category}
                     onClick={() => handleCategoryChange(category)}
                     className={`px-3 py-2 rounded-md text-sm transition-colors ${
                       selectedCategory === category
                         ? 'bg-primary/10 text-primary border border-primary/20'
                         : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                     }`}
                   >
                     {category === 'all' ? '全部' : category}
                   </button>
                 ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 桌面端左侧边栏 */}
          <motion.aside 
            className="hidden lg:block lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className={getGlassStyle("rounded-lg shadow-md p-6 sticky top-24 border")}>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                🗂️ 工具分类
              </h3>
              <div className="space-y-2">
                {toolCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    {category === 'all' ? '全部' : category}
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>
          
          {/* 主内容区 */}
          <motion.main 
            className="col-span-1 lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* 工具统计信息 */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                {selectedCategory === 'all' ? '全部' : selectedCategory} 分类下共有 {getToolsByCategory(selectedCategory).length} 个工具
              </p>
            </div>

            {/* 特色工具展示（当选择全部分类时显示） */}
            {selectedCategory === 'all' && (
              <div className="mb-8">
                <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ⭐ 特色工具
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getFeaturedTools().map((tool, index) => (
                    <ToolCard key={tool.id} tool={tool} index={index} isDark={isDark} />
                  ))}
                </div>
              </div>
            )}

            {/* 工具展示区域 */}
            <div className="space-y-6">
              {getToolsByCategory(selectedCategory).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getToolsByCategory(selectedCategory).map((tool, index) => (
                    <ToolCard key={tool.id} tool={tool} index={index} isDark={isDark} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    该分类下暂无可用工具...
                  </p>
                </div>
              )}
            </div>
          </motion.main>
        </div>
      </div>
      
      <ScrollToTop />
    </main>
  );
}