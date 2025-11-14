/**
 * 小工具页面
 * 提供多种实用小工具
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toolCategories, ToolItem } from '@/setting/toolsSetting';
import ScrollToTop from '@/components/ScrollToTop';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

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
  
  // 模拟工具数据
  const tools: ToolItem[] = [
    { id: '1', name: 'Markdown编辑器', description: '实时预览的Markdown编辑器', category: '文本工具', icon: '📝', isActive: true, path: '/tools/markdown-editor' },
    { id: '2', name: '文本格式转换', description: '支持多种文本格式之间的转换', category: '文本工具', icon: '🔄', isActive: true, path: '/tools/text-converter' },
    { id: '3', name: '图片压缩', description: '在线压缩图片并调整尺寸', category: '图像工具', icon: '🖼️', isActive: false },
    { id: '4', name: '图片格式转换', description: '支持多种图片格式转换', category: '图像工具', icon: '🎨', isActive: false },
    { id: '5', name: '颜色选择器', description: '选择和转换颜色代码', category: '颜色工具', icon: '🎨', isActive: true, path: '/tools/color-picker' },
    { id: '6', name: '调色板生成器', description: '生成各种配色方案', category: '颜色工具', icon: '🖌️', isActive: false },
    { id: '7', name: 'Base64编码', description: '文本和文件的Base64编码/解码', category: '编码工具', icon: '🔐', isActive: false },
    { id: '8', name: 'URL编码', description: 'URL参数编码和解码工具', category: '编码工具', icon: '🔗', isActive: false },
    { id: '9', name: '二维码生成器', description: '生成各种类型的二维码', category: '其他', icon: '📱', isActive: false },
    { id: '10', name: '二维码解码', description: '从图片中识别二维码内容', category: '其他', icon: '📷', isActive: false }
  ];

  // 处理分类变化
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };
  
  // 过滤工具
  const filteredTools = selectedCategory === 'all' 
    ? tools 
    : tools.filter(tool => tool.category === selectedCategory);

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
                {selectedCategory === 'all' ? '全部' : selectedCategory} 分类下共有 {filteredTools.length} 个工具
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {filteredTools.map((tool) => (
                <motion.div
                  key={tool.id}
                  whileHover={{ 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  className={getGlassStyle("rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow border")}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium border border-primary/20">
                        {tool.category}
                      </span>
                      {tool.isActive ? (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100">
                          可用
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          开发中
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                      <span className="mr-2 text-2xl">{tool.icon}</span>
                      <span>{tool.name}</span>
                    </h2>
                    
                    <p className="text-muted-foreground mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex justify-end">
                      {tool.isActive && tool.path ? (
                        <a 
                          href={tool.path}
                          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
                        >
                          使用工具
                        </a>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center px-4 py-2 bg-gray-400 text-white font-medium rounded-md cursor-not-allowed opacity-70"
                        >
                          敬请期待
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {filteredTools.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  该分类下暂无工具
                </p>
              </div>
            )}
          </motion.main>
        </div>
      </div>
      
      <ScrollToTop />
    </main>
  );
}