'use client';

import dynamic from 'next/dynamic';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import BackgroundLayer from '@/components/BackgroundLayer';
import PageHeader from '@/components/ui/PageHeader';



const MarkdownEditor = dynamic(() => import('@/components/tools/MarkdownEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  )
});

const testContent = ``;

export default function MarkdownEditorPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('tools');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 如果组件未挂载，显示占位符
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <main 
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''} ${containerStyle.className}`}
      style={containerStyle.style}
    >
      {/* 背景层 */}
      <BackgroundLayer />
      
      {/* 主要内容 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 页面标题 */}
        <PageHeader
          title="Markdown 编辑器"
          description="功能强大的 Markdown 编辑器，支持实时预览和代码高亮"
          icon="📝"
          size="lg"
          className="mb-12"
        />
        
        {/* 编辑器主体 - 毛玻璃效果 */}
        <motion.div 
          className="backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 rounded-lg border mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <MarkdownEditor 
            initialContent={testContent}
            height="600px"
            blogMode={true}
          />
        </motion.div>
        
        {/* 功能说明 - 毛玻璃卡片 */}
        <motion.div 
          className="backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 rounded-lg border p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className={`text-2xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ✨ 功能特性
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                支持的编程语言
              </h3>
              <ul className={`space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• JavaScript / TypeScript</li>
                <li>• Python</li>
                <li>• CSS / HTML</li>
                <li>• Java / C++</li>
              </ul>
            </div>
            <div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                核心功能
              </h3>
              <ul className={`space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• 语法高亮显示</li>
                <li>• 语言标签显示</li>
                <li>• 一键复制代码</li>
                <li>• 深色/浅色主题适配</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
      
      
    </main>
  );
}