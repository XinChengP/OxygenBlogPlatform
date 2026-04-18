/**
 * 友情链接独立页面
 * 展示所有友情链接，使用现代化的页面布局风格
 * 包含毛玻璃效果、主题色（天依蓝 #66ccff）和丰富的动画效果
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { 
  Globe, 
  Link2, 
  Heart, 
  Mail, 
  MessageCircle,
  MessageSquare,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import FriendsLink from '@/components/FriendsLink';

/**
 * 交换友链说明卡片组件
 */
function ExchangeCard({ isDark }: { isDark: boolean }) {
  const primaryColor = '#66ccff';
  
  const requirements = [
    { icon: <Globe className="w-4 h-4" />, text: '网站名称和描述' },
    { icon: <Link2 className="w-4 h-4" />, text: '网站链接' },
    { icon: <Heart className="w-4 h-4" />, text: '头像链接（可选）' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50
                 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg"
    >
      {/* 顶部装饰条 */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${primaryColor} 0%, #06b6d4 50%, ${primaryColor} 100%)`,
          backgroundSize: '200% 100%'
        }}
      />

      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
        <div 
          className="w-full h-full rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
        />
      </div>

      <div className="relative p-8">
        {/* 标题区域 */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, #06b6d4 100%)`,
              boxShadow: `0 8px 30px ${primaryColor}40`
            }}
          >
            <Heart className="w-7 h-7 text-white" />
          </motion.div>
          
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
              交换友链
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              欢迎与我建立友情链接
            </p>
          </div>
        </div>

        {/* 说明内容 */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* 左侧：申请要求 - 使用列表风格 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              申请信息
            </h4>
            <ul className="space-y-3">
              {requirements.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-300"
                >
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.text}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* 右侧：联系方式 - 使用卡片风格 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              联系方式
            </h4>
            <div className="space-y-3">
              <motion.a
                href="mailto:2574386537@qq.com"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                whileHover={{ scale: 1.02, x: 5 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-700/50 
                           border border-gray-200 dark:border-gray-600 shadow-sm
                           hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <span 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}40 100%)`, color: primaryColor }}
                >
                  <Mail className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">发送邮件</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">2574386537@qq.com</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
              </motion.a>

              <motion.a
                href="https://blog.xinchengp.cn/guestbook"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                whileHover={{ scale: 1.02, x: 5 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-700/50 
                           border border-gray-200 dark:border-gray-600 shadow-sm
                           hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <span 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}40 100%)`, color: primaryColor }}
                >
                  <MessageSquare className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">留言板</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">点击前往留言</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
              </motion.a>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

/**
 * 友链页面组件
 * 使用现代化的布局风格，包含精美的视觉效果
 */
export default function FriendsPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('friends');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载，避免服务端渲染与客户端渲染不一致
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  // 如果还没有挂载，显示加载占位避免闪烁
  // 使用与主渲染相同的容器样式，避免 hydration mismatch
  if (!mounted) {
    return (
      <div className={containerStyle.className} style={containerStyle.style}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
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
          title="友情链接"
          description="互联网上的朋友们，让我们一起在这个广阔的世界中相遇、成长"
          size="lg"
          className="mb-12"
          gradientStyle="primary"
          icon={<Globe className="w-full h-full" />}
          showDivider
        />

        {/* 主内容区 */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-12"
        >
          {/* 友链列表 - 复用 FriendsLink 组件 */}
          <section>
            <FriendsLink />
          </section>

          {/* 交换友链说明 */}
          <section>
            <ExchangeCard isDark={isDark} />
          </section>

          {/* 底部装饰引用 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center py-12"
          >
            <div className="relative inline-block">
              {/* 引号装饰 */}
              <div className="absolute -top-4 -left-8 text-6xl text-primary/10 font-serif">"</div>
              <div className="absolute -bottom-8 -right-8 text-6xl text-primary/10 font-serif">"</div>
              
              <blockquote className="relative">
                <p className="text-xl md:text-2xl font-medium text-gray-700 dark:text-gray-200 italic mb-4">
                  海内存知己，天涯若比邻
                </p>
                <footer className="text-sm text-gray-500 dark:text-gray-400">
                  —— 王勃《送杜少府之任蜀州》
                </footer>
              </blockquote>
            </div>

            {/* 装饰性分隔线 */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-primary/30"></div>
              <Sparkles className="w-4 h-4 text-primary/50" />
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-primary/30"></div>
            </div>
          </motion.section>
        </motion.main>
      </div>
    </div>
  );
}
