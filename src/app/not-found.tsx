'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAssetPath } from '@/utils/assetUtils';

// 全局Live2D隐藏功能
declare global {
  interface Window {
    hideLive2D?: () => void;
  }
}

/**
 * 404 页面组件
 * 当用户访问不存在的页面时显示
 * 支持主题色管理和响应式设计
 * 
 * @returns 404 错误页面
 */
export default function NotFound() {
  const [cardVisible, setCardVisible] = useState(true);

  // 确保组件已挂载
  useEffect(() => {
    // 确保视频自动播放
    const ensureVideoAutoplay = () => {
      const video = document.querySelector('video');
      if (video) {
        // 尝试多种方式确保视频播放
        const playVideo = async () => {
          try {
            // 方法1: 直接播放
            await video.play();
            console.log('✅ 视频自动播放成功');
          } catch (error) {
            console.log('🔄 尝试备用播放方法:', error);
            try {
              // 方法2: 静音后播放
              video.muted = true;
              await video.play();
              console.log('✅ 静音播放成功');
            } catch (error2) {
              console.log('🔄 尝试最终播放方法:', error2);
              // 方法3: 用户交互后播放
              const playOnInteraction = () => {
                video.play().catch(() => {});
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
              };
              document.addEventListener('click', playOnInteraction);
              document.addEventListener('touchstart', playOnInteraction);
            }
          }
        };
        
        // 等待视频可以播放时尝试播放
        video.addEventListener('canplay', playVideo, { once: true });
        
        // 如果视频已经准备好，立即播放
        if (video.readyState >= 3) {
          playVideo();
        }
      }
    };
    
    // 延迟执行以确保DOM完全加载
    setTimeout(ensureVideoAutoplay, 100);
    
    // 在404页面隐藏Live2D
    console.log('🚫 NotFound页面: 隐藏Live2D');
    
    // 方法1: 隐藏Live2D容器
    const hideLive2DContainer = () => {
      const live2dContainer = document.getElementById('landlord') as HTMLElement;
      if (live2dContainer) {
        live2dContainer.style.display = 'none';
        console.log('🫥 已隐藏Live2D容器');
      } else {
        // 备用选择器
        const altContainer = document.querySelector('.landlord') as HTMLElement;
        if (altContainer) {
          altContainer.style.display = 'none';
          console.log('🫥 已隐藏Live2D容器(备用选择器)');
        }
      }
    };
    
    // 方法2: 设置全局隐藏标记
    window.hideLive2D = () => {
      hideLive2DContainer();
      // 移除Live2D相关类名
      const body = document.body;
      body.classList.add('live2d-hidden');
      console.log('🔇 全局隐藏Live2D');
    };
    
    // 方法3: 立即隐藏
    hideLive2DContainer();
    
    // 设置body类
    document.body.classList.add('not-found', 'live2d-hidden');
    
    // 监听Live2D组件挂载并隐藏
    const observer = new MutationObserver(() => {
      hideLive2DContainer();
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    // 清理函数
    return () => {
      observer.disconnect();
      delete window.hideLive2D;
    };
  }, []);

  // 获取 CSS 变量中的主题色并确保格式一致
  const getThemeColor = (colorName: string): string => {
    if (typeof window === 'undefined') return '#3b82f6'; // 默认蓝色
    const hex = getComputedStyle(document.documentElement).getPropertyValue(`--theme-${colorName}`).trim() || '#3b82f6';
    
    // 如果已经是十六进制格式，直接返回
    if (hex.startsWith('#')) {
      return hex;
    }
    
    // 如果是rgb格式，转换为十六进制
    const rgbMatch = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      let r = parseInt(rgbMatch[1]).toString(16);
      let g = parseInt(rgbMatch[2]).toString(16);
      let b = parseInt(rgbMatch[3]).toString(16);
      
      // 确保十六进制字符串长度为2
      r = r.length === 1 ? '0' + r : r;
      g = g.length === 1 ? '0' + g : g;
      b = b.length === 1 ? '0' + b : b;
      return `#${r}${g}${b}`;
    }
    
    // 默认返回十六进制格式
    return hex.startsWith('#') ? hex : `#${hex}`;
  };

  // 获取当前主题色（始终使用十六进制格式）
  const primaryColor = getThemeColor('primary');
  const accentColor = getThemeColor('accent');



  // 使用工具函数处理视频路径，确保GitHub Pages兼容性
  const getVideoPath = () => {
    return getAssetPath('/LTY_Picture/Autumn.mp4');
  };



  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 视频背景 - 确保在静态构建中包含 */}
      <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="auto"
          onLoadStart={() => console.log('Video: onLoadStart')}
          onCanPlay={() => console.log('Video: onCanPlay')}
          onError={(e) => console.log('Video: onError', e)}
          onLoadedData={() => console.log('Video: onLoadedData')}
        >
          <source src={getVideoPath()} type="video/mp4" />
        </video>
      
      {/* 优雅的渐变遮罩层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/20 dark:from-black/50 dark:via-black/30 dark:to-black/60 z-10"></div>


      
      {/* 飘落的枫叶动画 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {Array.from({ length: 12 }, (_, i) => {
          // 使用固定的随机种子确保服务器端和客户端一致
          const seed = i * 16807 % 2147483647; // 简单的伪随机生成
          const left = (seed % 100);
          const top = (seed % 20);
          const delay = (seed % 8);
          const duration = 8 + (seed % 6);
          const rotation = (seed % 360);
          const hueRotate = (seed % 60) - 30; // 使用确定性随机值
          const colorIndex = seed % 5;
          const leafColors = ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#eab308'];
          
          // 使用四舍五入确保动画数值精度一致
          const roundedDelay = Math.round(delay * 100) / 100;
          const roundedDuration = Math.round(duration * 100) / 100;
          
          return (
          <div
            key={`leaf-${i}`}
            className="absolute animate-float"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${roundedDelay}s`,
              animationDuration: `${roundedDuration}s`,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {/* 枫叶SVG */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="opacity-60"
              style={{
                filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.1)) hue-rotate(${hueRotate}deg)`,
                color: leafColors[colorIndex]
              }}
            >
              <defs>
                <linearGradient id={`leafGradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={leafColors[colorIndex]} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                  d="M12 2C12 2 13.5 4.5 16 7C18.5 9.5 20 12 20 12C20 12 18.5 14.5 16 17C13.5 19.5 12 22 12 22C12 22 10.5 19.5 8 17C5.5 14.5 4 12 4 12C4 12 5.5 9.5 8 7C10.5 4.5 12 2 12 2Z"
                  fill={`url(#leafGradient-${i})`}
                  opacity="0.8"
                />
                <path
                  d="M12 2C12 2 13 4 14.5 6C16 8 17 10 17 10C17 10 16 12 14.5 14C13 16 12 18 12 18C12 18 11 16 9.5 14C8 12 7 10 7 10C7 10 8 8 9.5 6C11 4 12 2 12 2Z"
                  fill={`url(#leafGradient-${i})`}
                  opacity="0.6"
                />
            </svg>
          </div>
          );
        })}
      </div>

      {/* 精细的粒子背景系统 */}
      <div className="absolute inset-0 z-10">
        {/* 小型光点 */}
        {Array.from({ length: 15 }, (_, i) => {
          // 使用确定的随机种子
          const seed = (i + 100) * 1103515245 % 2147483647;
          const left = 5 + (seed % 90);
          const top = 5 + (seed % 90);
          const width = 1 + (seed % 3);
          const height = 1 + (seed % 3);
          const opacity = 0.6 + ((seed % 40) / 100);
          const delay = (seed % 200) / 100;
          const duration = 2 + ((seed % 200) / 100);
          
          // 使用四舍五入确保动画数值精度一致
          const roundedDelay = Math.round(delay * 100) / 100;
          const roundedDuration = Math.round(duration * 100) / 100;
          const roundedOpacity = Math.round(opacity * 100) / 100;
          
          return (
          <div
            key={`small-${i}`}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: (i % 3 === 0 ? primaryColor : i % 3 === 1 ? accentColor : '#ffffff'),
              opacity: roundedOpacity,
              animationDelay: `${roundedDelay}s`,
              animationDuration: `${roundedDuration}s`
            }}
          />
          );
        })}
        {/* 超小型星光 */}
        {Array.from({ length: 25 }, (_, i) => {
          const seed = (i + 200) * 123456789 % 2147483647;
          const left = 2.5 + (seed % 95);
          const top = 2.5 + (seed % 95);
          const delay = (seed % 300) / 100;
          const duration = 1 + ((seed % 200) / 100);
          
          // 使用四舍五入确保动画数值精度一致
          const roundedDelay = Math.round(delay * 100) / 100;
          const roundedDuration = Math.round(duration * 100) / 100;
          
          return (
          <div
            key={`tiny-${i}`}
            className="absolute w-0.5 h-0.5 rounded-full animate-ping"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              backgroundColor: 'rgba(255,255,255,0.9)',
              animationDelay: `${roundedDelay}s`,
              animationDuration: `${roundedDuration}s`
            }}
          />
          );
        })}
      </div>

      {/* 主内容区域 - 更优雅的布局 */}
      <div className="relative z-20 min-h-screen flex items-end justify-start px-8 py-8">
        {cardVisible && (
          <div className="max-w-lg relative">
            {/* 多层渐变光晕效果 */}
            <div 
              className="absolute -inset-6 rounded-3xl opacity-15 blur-2xl"
              style={{
                background: `conic-gradient(from 180deg at 50% 50%, ${primaryColor}, ${accentColor}, ${primaryColor}, ${accentColor}, ${primaryColor})`
              }}
            />
            <div 
              className="absolute -inset-3 rounded-3xl opacity-25 blur-xl"
              style={{
                background: `linear-gradient(45deg, ${accentColor}60, ${primaryColor}60, ${accentColor}60)`
              }}
            />
            
            {/* 精美的内容卡片 */}
            <div className="relative bg-gradient-to-br from-white/20 to-white/10 border border-white/40 dark:from-gray-900/40 dark:to-gray-900/20 dark:border-gray-600/40 rounded-3xl p-8 shadow-2xl overflow-hidden">
            {/* 卡片内部光效 */}
            <div 
              className="absolute top-0 left-0 w-full h-full opacity-30"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}40, transparent 40%, ${accentColor}30, transparent 80%, ${primaryColor}20)`
              }}
            />
            
            {/* 卡片右上角隐藏UI功能 */}
            <div 
              className="absolute top-2 right-1 flex items-center gap-2 z-20"
            >
              {/* 深色/浅色模式切换按钮 */}
              <button
                onClick={() => {
                  const isDark = document.documentElement.classList.toggle('dark')
                  localStorage.setItem('theme', isDark ? 'dark' : 'light')
                }}
                className="group relative w-7 h-7 rounded-full transition-all duration-300 hover:scale-110 border border-white/30 dark:border-gray-600/30"
                style={{
                background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.3))`,
                boxShadow: [
                  '0 0 6px rgba(255, 255, 255, 0.35)',
                  '0 0 12px rgba(255, 255, 255, 0.2)',
                  'inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
                  'inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                ].join(', ')
              }}
              >
                {/* 月亮图标 */}
                <div className="absolute inset-0 flex items-center justify-center text-blue-200 transition-all duration-300 opacity-0 scale-75 dark:opacity-100 dark:scale-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-lg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </div>
                
                {/* 太阳图标 */}
                <div className="absolute inset-0 flex items-center justify-center text-yellow-400 transition-all duration-300 dark:opacity-0 dark:scale-75">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-lg">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                </div>
                
                {/* 悬停时的微弱光效 */}
                <div 
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300"
                  style={{ 
                      backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.2), transparent 70%)` 
                    }}
                />
              </button>
              
              {/* 触发按钮 - 隐蔽的圆点 */}
              <button
                onClick={() => setCardVisible(!cardVisible)}
                className="group relative w-7 h-7 rounded-full transition-all duration-300 hover:scale-110 dark:bg-gray-800/60"
                style={{
                  background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.3))`,
                  boxShadow: [
                    '0 0 6px rgba(255, 255, 255, 0.35)',
                    '0 0 12px rgba(255, 255, 255, 0.2)',
                    'inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
                    'inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                  ].join(', '),
                  opacity: 0.6
                }}
              >
                
                {/* 悬停时显示的提示 */}
                <div className="absolute left-8 top-1/2 transform -translate-y-1/2 px-3 py-2 bg-black/90 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-lg">
                  {cardVisible ? '隐藏卡片' : '显示卡片'}
                </div>
                
                {/* 隐蔽的脉冲效果 - 去除了彩色 */}
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ 
                    background: `radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent)`,
                    animationDuration: '3s'
                  }}
                />
                
                {/* 悬停时的微弱光效 */}
                <div 
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300"
                  style={{ 
                    background: `radial-gradient(circle, rgba(255, 255, 255, 0.2), transparent 70%)` 
                  }}
                />
              </button>
            </div>
            
            {/* 404 标题区域 - 更突出的设计 */}
            <div className="mb-8 relative">
              {/* 背景装饰圆环 */}
              <div 
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20 blur-sm"
                style={{
                  background: `radial-gradient(circle, ${accentColor}40, transparent)`
                }}
              />
              <div 
                className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full opacity-15 blur-md"
                style={{
                  background: `radial-gradient(circle, ${primaryColor}50, transparent)`
                }}
              />
              
              <h1 
                className="text-7xl md:text-8xl font-black relative z-10 tracking-wider"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor}, ${primaryColor})`,
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.4))',
                  animation: 'gradientShift 3s ease-in-out infinite'
                }}
              >
                404
              </h1>
              {/* 多层发光效果 */}
              <div 
                className="absolute inset-0 text-7xl md:text-8xl font-black text-transparent bg-clip-text opacity-40 blur-lg"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                404
              </div>
              <div 
                className="absolute inset-0 text-7xl md:text-8xl font-black text-transparent bg-clip-text opacity-20 blur-xl"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${accentColor}, ${primaryColor})`,
                  transform: 'scale(1.05)'
                }}
              >
                404
              </div>
            </div>

            {/* 精致的错误信息区域 */}
            <div className="mb-8">
              {/* 动态装饰线 */}
              <div className="relative flex items-center mb-4">
                <div 
                  className="h-px flex-1 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(to right, transparent, ${primaryColor}, ${accentColor}, ${primaryColor}, transparent)`
                  }}
                >
                  <div 
                    className="absolute inset-0 h-full"
                    style={{
                      background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)`,
                      animation: 'shimmer 2s ease-in-out infinite'
                    }}
                  />
                </div>
                <div className="mx-4 relative">
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div 
                    className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: accentColor }}
                  />
                </div>
                <div 
                  className="h-px flex-1 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(to left, transparent, ${primaryColor}, ${accentColor}, ${primaryColor}, transparent)`
                  }}
                >
                  <div 
                    className="absolute inset-0 h-full"
                    style={{
                      background: `linear-gradient(to left, transparent, ${accentColor}60, transparent)`,
                      animation: 'shimmer 2s ease-in-out infinite 1s'
                    }}
                  />
                </div>
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3 drop-shadow-xl">
                <span 
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  页面未找到
                </span>
              </h2>
              <p className="text-white/85 text-base leading-relaxed drop-shadow-lg">
                抱歉，您访问的页面不存在或已被移动
              </p>
            </div>

            {/* 精美的操作按钮组 */}
            <div className="flex gap-4 mb-8">
              <Link
                href="/"
                className="group relative flex-1 max-w-[140px] px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 hover:scale-105 hover:-translate-y-1 border border-white/50 dark:border-gray-600/50 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}20, ${primaryColor}30)`,
                  boxShadow: `0 8px 32px ${primaryColor}20`
                }}
              >
                {/* 动态光效扫过 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {/* 边框光效 */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-300"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${accentColor}50, 0 0 20px ${primaryColor}30`
                  }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  <span className="text-lg">🏠</span>
                  <span>返回首页</span>
                </span>
              </Link>
              <Link
                href="/blogs"
                className="group relative flex-1 max-w-[140px] px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 hover:scale-105 hover:-translate-y-1 border border-white/50 dark:border-gray-600/50 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}30, ${primaryColor}20, ${accentColor}30)`,
                  boxShadow: `0 8px 32px ${accentColor}20`
                }}
              >
                {/* 动态光效扫过 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {/* 边框光效 */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-300"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${primaryColor}50, 0 0 20px ${accentColor}30`
                  }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  <span className="text-lg">📚</span>
                  <span>浏览博客</span>
                </span>
              </Link>
            </div>



            {/* 精致的装饰性底部区域 */}
            <div className="flex items-center justify-between">
              {/* 左侧装饰序列 */}
              <div className="flex space-x-2">
                {Array.from({ length: 6 }, (_, i) => {
                  const opacity = Math.round((0.7 - i * 0.1) * 100) / 100;
                  const delay = Math.round((i * 0.1) * 100) / 100;
                  const scale = Math.round((1 - i * 0.1) * 100) / 100;
                  
                  return (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: i % 3 === 0 ? primaryColor : i % 3 === 1 ? accentColor : '#ffffff',
                      opacity: opacity,
                      animationDelay: `${delay}s`,
                      transform: `scale(${scale})`
                    }}
                  />
                  );
                })}
        </div>
              
        {/* 中央动态核心装饰 */}
        <div className="flex items-center space-x-2">
                <div 
                  className="h-px w-4"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="relative">
                  <div 
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ 
                    background: `conic-gradient(from 0deg, ${primaryColor}, ${accentColor}, ${primaryColor})`,
                    animationDuration: '2s'
                  }}
                />
                <div 
                  className="absolute inset-0.5 w-3 h-3 rounded-full bg-black/50 dark:bg-black/80"
                />
                </div>
                <div 
                  className="h-px w-4"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
              
              {/* 右侧装饰点群 */}
              <div className="flex space-x-2">
                {Array.from({ length: 4 }, (_, i) => {
                  const opacity = Math.round((0.8 - i * 0.2) * 100) / 100;
                  const delay = Math.round((i * 0.15) * 100) / 100;
                  
                  return (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: accentColor,
                      opacity: opacity,
                      animationDelay: `${delay}s`,
                      animation: 'bounce 1.5s ease-in-out infinite'
                    }}
                  />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* 动画样式已移至globals.css */}
    </div>
  );
}