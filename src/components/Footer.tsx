'use client'; // 客户端组件标记

/**
 * 页脚组件
 * 显示版权信息、相关链接和实时网站运行时间
 */

import { useState, useEffect } from 'react';
import { year, name, aWord, ICPLink, policeBeianLink } from '@/setting/FooterSetting';
import Link from 'next/link';
import Image from 'next/image';

/**
 * 获取公安备案图片路径，处理 basePath
 */
function getGonganImagePath(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return basePath ? `${basePath}/gongan.png` : '/gongan.png';
}

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
 * 页脚组件 - 毛玻璃透明效果，包含实时运行时间
 */
export default function Footer() {
  // 网站上线时间（已设置为 2025.11.06 20:00）
  const launchDate = new Date('2025-11-06T20:00:00');
  const [runTime, setRunTime] = useState('');

  // 实时更新运行时间
  useEffect(() => {
    // 初始化计算
    const updateRunTime = () => {
      const now = new Date();
      const diff = now.getTime() - launchDate.getTime();
      // 处理未到上线时间的情况（显示倒计时）
      if (diff < 0) {
        setRunTime(`距离上线还有 ${formatTime(-diff)}`);
      } else {
        setRunTime(`已稳定运行: ${formatTime(diff)}`);
      }
    };

    // 立即执行一次
    updateRunTime();
    
    // 每秒更新一次
    const timer = setInterval(updateRunTime, 1000);
    
    // 组件卸载时清除定时器
    return () => clearInterval(timer);
  }, [launchDate]);

  return (
    <footer className="backdrop-blur-md bg-background/60 border-t border-border/30 py-3 supports-[backdrop-filter]:bg-background/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground/70">
          
          {/* 版权信息 */}
          <span className="flex items-center gap-1">
            {<span className="mx-1"></span>}
            <span>&copy; {year} {name}</span>
          </span>
          
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
          
          {/* 网站运行时间/倒计时 - 放在最后 */}
          <span className="mx-1">·</span>
          <span>{runTime}</span>
        </p>
      </div>
    </footer>
  );
}
