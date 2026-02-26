'use client';

import React, { useState, useEffect } from 'react';
import { year, name, aWord } from '@/setting/FooterSetting';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 格式化时间差为天时分秒
 * @param milliseconds 毫秒数
 * @returns 格式化后的时间字符串
 */
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  
  return `${days}天${hours}时${minutes}分${seconds}秒`;
}

/**
 * 页脚组件 - 简化版
 */
function Footer() {
  const pathname = usePathname();
  
  // 后台页面不显示页脚
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  // 网站上线时间
  const launchDate = new Date('2025-11-06T20:00:00');
  const [runTime, setRunTime] = useState('');

  // 实时更新运行时间
  useEffect(() => {
    const updateRunTime = () => {
      const now = new Date();
      const diff = now.getTime() - launchDate.getTime();
      if (diff < 0) {
        setRunTime(`距离上线还有 ${formatTime(-diff)}`);
      } else {
        setRunTime(`已稳定运行: ${formatTime(diff)}`);
      }
    };

    updateRunTime();
    const timer = setInterval(updateRunTime, 1000);
    return () => clearInterval(timer);
  }, [launchDate]);

  return (
    <footer className="backdrop-blur-md bg-background/60 border-t border-border/30 py-3 supports-[backdrop-filter]:bg-background/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground/70">
          {/* 版权信息 */}
          <span>&copy; {year} {name}</span>
          
          {/* 自定义文案 */}
          {aWord && (
            <>
              <span className="mx-1">·</span>
              <span>{aWord}</span>
            </>
          )}
          
          {/* 洛天依B站主页链接 */}
          <span className="mx-1">·</span>
          <span>由</span>
          <Link
            href="https://space.bilibili.com/36081646"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-primary transition-colors duration-200 underline-offset-4 hover:underline nav-link"
          >
            世界第一吃货殿下
          </Link>
          <span>提供动力（确信）</span>
          
          {/* 网站运行时间 */}
          <span className="mx-1">·</span>
          <span>{runTime}</span>
        </p>
      </div>
    </footer>
  );
}

export default Footer;