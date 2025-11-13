'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import GiscusGuestbookBoard from '@/components/GiscusGuestbookBoard';

export default function Guestbook() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { containerStyle } = useBackgroundStyle('guestbook');

  // 主题颜色
  const [primaryColor] = useState('#66ccff');
  const [secondaryColor] = useState('#1e40af');
  const [accentColor] = useState('#06b6d4');

  useEffect(() => {
    setMounted(true);
    setIsDark(theme === 'dark');
  }, [theme]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 移除所有背景装饰元素 */}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        {/* 主要内容卡片 - 使用更简洁的样式 */}
        <div className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* 头部区域 - 使用半透明主题色背景 */}
          <div 
            className="relative p-8 text-white transition-all duration-500 overflow-hidden"
            style={{
              background: `
                linear-gradient(135deg, ${primaryColor}dd 0%, ${accentColor}dd 50%, ${secondaryColor}dd 100%),
                radial-gradient(circle at top left, ${primaryColor}aa 0%, transparent 50%),
                radial-gradient(circle at bottom right, ${secondaryColor}aa 0%, transparent 50%)
              `,
            }}
          >
            {/* 动态光效背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10"></div>
            
            {/* 装饰性几何图形 */}
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full opacity-20" 
                 style={{ background: `radial-gradient(circle, ${accentColor}aa, transparent)` }}></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full opacity-15" 
                 style={{ background: `radial-gradient(circle, ${primaryColor}aa, transparent)` }}></div>
            
            <div className="relative z-10">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-2xl tracking-wide">博客留言板</h1>
              <p className="text-lg opacity-90 drop-shadow-lg">欢迎留下您的想法、建议或任何想要分享的内容。每一句话都是对我们最大的鼓励！</p>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="p-8 md:p-10 md:pt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GiscusGuestbookBoard />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}