'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackgroundLayer from '@/components/BackgroundLayer';
import ConditionalComponents from '@/components/ConditionalComponents';
import SmoothScrollProvider from '@/components/SmoothScrollProvider';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

/**
 * RootLayout 的客户端部分
 * 用于根据路径条件性地渲染导航栏、页脚等组件
 */
export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  const pathname = usePathname();
  
  // 判断是否为后台管理页面
  const isAdminPage = pathname?.startsWith('/admin') ?? false;

  return (
    <SmoothScrollProvider>
      {/* 后台页面不显示背景层 */}
      {!isAdminPage && <BackgroundLayer />}
      
      {/* 后台页面不显示导航栏 */}
      {!isAdminPage && <Navigation />}
      
      <main className={`min-h-screen transition-colors duration-300 relative ${isAdminPage ? '' : ''}`}>
        {children}
      </main>
      
      {/* 后台页面不显示页脚 */}
      {!isAdminPage && <Footer />}
      
      {/* 后台页面不显示条件组件（灯笼、音乐播放器等） */}
      {!isAdminPage && <ConditionalComponents />}
    </SmoothScrollProvider>
  );
}
