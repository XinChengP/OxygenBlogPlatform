/**
 * 关于页面
 * 展示个人信息和博客介绍
 * 使用与其他页面统一的布局风格：PageHeader + 左右布局
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Cover } from '@/components/ui/cover';
import { EvervaultCard, Icon } from '@/components/ui/evervault-card';
import OptimizedIcon from '@/components/core/OptimizedIcon';
import PageHeader from '@/components/ui/PageHeader';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

// 导入配置
import {
  BeforeAnimationText,
  AnimationText,
  name,
  slogan,
  aboutMeP1,
  aboutMeP2,
  aboutMeP3,
  mail,
  github,
  bilibili,
  isBorder,
} from '@/setting/AboutSetting';

/**
 * 关于页面组件
 * 使用与其他页面统一的布局风格
 */
export default function AboutPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('about');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 毛玻璃样式函数 - 与其他页面保持一致
  const getGlassStyle = (baseStyle: string = '') => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 如果还没有挂载，显示默认样式避免闪烁
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 pt-[65px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          {/* 左侧边栏 - 个人信息卡片 */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* 个人信息卡片 */}
            <div className={getGlassStyle("rounded-2xl shadow-xl border overflow-hidden")}>
              {/* 标语区域 */}
              <div className="p-6 text-center border-b border-border/50">
                <div className="text-xl sm:text-2xl font-semibold relative z-20 py-2">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                    {BeforeAnimationText}
                  </span>
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

                  <h2 className="dark:text-white text-black mt-4 font-medium text-center w-full text-lg title">
                    {name}
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm mt-4 text-center leading-relaxed">
                  {slogan}
                </p>
              </div>
            </div>

            {/* 联系我 - 简化版卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={getGlassStyle("rounded-2xl p-4 border shadow-lg")}
            >
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 text-white text-sm">
                  💬
                </span>
                联系我
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {/* Email */}
                <motion.a
                  href={`mailto:${mail}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                  title="邮箱联系"
                >
                  <OptimizedIcon
                    src="/assets/mail.svg"
                    alt="Mail"
                    className="text-foreground"
                    width={18}
                    height={18}
                  />
                </motion.a>
                {/* GitHub */}
                <motion.a
                  href={github}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                  title="GitHub"
                >
                  <OptimizedIcon
                    src="/assets/github.svg"
                    alt="GitHub"
                    className="text-foreground"
                    width={18}
                    height={18}
                  />
                </motion.a>
                {/* Bilibili */}
                <motion.a
                  href={bilibili}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                  title="哔哩哔哩"
                >
                  <OptimizedIcon
                    src="/assets/bilibili.png"
                    alt="Bilibili"
                    className="text-foreground"
                    width={18}
                    height={18}
                  />
                </motion.a>
                {/* VSQX */}
                <motion.a
                  href="https://www.vsqx.top/space/16984"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                  title="VSQX"
                >
                  <OptimizedIcon
                    src="/assets/vsqx.ico"
                    alt="VSQX"
                    className="text-foreground"
                    width={18}
                    height={18}
                  />
                </motion.a>
              </div>
            </motion.div>

            {/* 兴趣爱好卡片 - 移动到左侧边栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={getGlassStyle("rounded-2xl p-6 border shadow-lg")}
            >
              <div className="flex items-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 bg-gradient-to-br from-primary to-primary/60"
                >
                  <span className="font-bold text-lg">🏷️</span>
                </motion.div>
                <h3 className="text-xl font-semibold text-foreground">兴趣爱好</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['洛天依', '乒乓球', '围棋', 'Video', 'Minecraft', 'Genshin Impact', 'Roco kingdom'].map((tag, index) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                    className="px-3 py-1 text-sm rounded-full border border-primary/20 bg-primary/10 text-primary transition-all duration-300 hover:scale-105 cursor-default"
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.aside>

          {/* 右侧主内容区 */}
          <motion.main
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* 关于我卡片 - 单独展示 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={getGlassStyle("rounded-2xl p-6 border shadow-lg")}
            >
              <div className="flex items-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 bg-gradient-to-br from-primary to-primary/60"
                >
                  <span className="font-bold text-lg">🎯</span>
                </motion.div>
                <h3 className="text-xl font-semibold text-foreground">关于我</h3>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>{aboutMeP1}</p>
                <p>{aboutMeP2}</p>
                <p>{aboutMeP3}</p>
              </div>
            </motion.div>

            {/* 底部装饰 */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                &ldquo;这世界的浪漫有很多，孤独的人永远没有错&rdquo;
              </p>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
