'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { ChevronUpIcon, ChevronDownIcon, SunIcon, MoonIcon, AdjustmentsHorizontalIcon, MusicalNoteIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { getMusicPlayerVisibility, setMusicPlayerVisibility, onMusicPlayerVisibilityChange } from '@/utils/musicPlayerVisibility';
import live2dMessageManager from '@/utils/live2dMessageManager';
import { throttle } from '@/utils/performanceUtils';

/**
 * 页面导航组件 - 性能优化版
 *
 * 优化点：
 * 1. 使用 useCallback 缓存事件处理函数
 * 2. 使用 useMemo 缓存计算结果
 * 3. 使用节流函数优化滚动事件
 * 4. 使用 requestAnimationFrame 优化动画
 *
 * 提供转到页首、页底和主题切换的功能
 * - 支持深色/浅色主题
 * - 平滑滚动效果
 * - 响应式设计
 * - 方形按钮风格
 * - 页面顶端时按钮向右隐藏
 * - 点击设置按钮显示主题切换选项
 */
export default function ScrollToTop() {
  const { theme, setTheme } = useTheme();

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [showThemeButton, setShowThemeButton] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  // 用于标记组件是否已在客户端挂载
  // next-themes 在服务端无法获取用户真实主题，直接读取 theme 会导致服务端与客户端首次渲染结果不一致（水合不匹配）
  // 挂载完成后再根据真实主题更新图标、title 等无法通过 CSS 控制的属性
  const [mounted, setMounted] = useState(false);

  // 初始化音乐播放器可见性状态
  useEffect(() => {
    setMusicPlayerVisible(getMusicPlayerVisibility());
  }, []);

  // 组件挂载完成后再根据真实主题渲染图标和 title
  // 保证服务端输出与客户端首次水合输出一致，避免 React 水合警告
  useEffect(() => {
    setMounted(true);
  }, []);

  // 监听滚动事件 - 使用节流优化
  useEffect(() => {
    const handleScroll = throttle(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // 判断是否在页面顶部
      setIsAtTop(scrollTop < 50);

      // 判断是否显示"回到顶部"按钮 - 现在始终显示
      setShowScrollTop(true);

      // 判断是否在页面底部
      setIsAtBottom(scrollTop + windowHeight >= documentHeight - 50);

      // 如果在页面顶部，自动收起设置（隐藏主题切换按钮）
      if (scrollTop < 50) {
        setShowThemeButton(false);
      }
    }, 100); // 100ms节流，减少事件触发频率

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始检查

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 监听音乐播放器显示状态变化
  useEffect(() => {
    const unsubscribe = onMusicPlayerVisibilityChange((visible) => {
      setMusicPlayerVisible(visible);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // 滚动到顶部 - 使用 useCallback 优化
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // 滚动到底部 - 使用 useCallback 优化
  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  // 切换主题 - 使用 useCallback 优化
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // 切换主题按钮显示 - 使用 useCallback 优化
  const toggleThemeButton = useCallback(() => {
    setShowThemeButton(prev => !prev);
  }, []);

  // 切换音乐播放器显示状态 - 使用 useCallback 优化
  const toggleMusicPlayer = useCallback(() => {
    const newVisibility = !musicPlayerVisible;
    setMusicPlayerVisibility(newVisibility);
    setMusicPlayerVisible(newVisibility);
  }, [musicPlayerVisible]);

  // 烟花效果相关变量
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let fireworks: any[] = [];
  let particles: any[] = [];
  let hue = 120;
  let timerTotal = 40;
  let timerTick = 0;
  let animationId: number | null = null;
  let isFireworksRunning = false;
  let volleyCount = 0;
  let maxVolleys = 5 + Math.floor(Math.random() * 3); // 5~7轮齐射

  // 获取随机数
  const random = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // 计算两点之间的距离
  const calculateDistance = (p1x: number, p1y: number, p2x: number, p2y: number) => {
    const xDistance = p1x - p2x;
    const yDistance = p1y - p2y;
    return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
  };

  // 烟花类
  class Firework {
    x: number;
    y: number;
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    distanceToTarget: number;
    distanceTraveled: number;
    coordinates: number[][];
    coordinateCount: number;
    angle: number;
    speed: number;
    acceleration: number;
    brightness: number;
    targetRadius: number;
    size: number;

    constructor(sx: number, sy: number, tx: number, ty: number) {
      this.x = sx;
      this.y = sy;
      this.sx = sx;
      this.sy = sy;
      this.tx = tx;
      this.ty = ty;
      this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
      this.distanceTraveled = 0;
      this.coordinates = [];
      this.coordinateCount = 3;

      while (this.coordinateCount--) {
        this.coordinates.push([this.x, this.y]);
      }

      this.angle = Math.atan2(ty - sy, tx - sx);
        this.speed = 1;
        this.acceleration = 1.01;
        this.brightness = random(50, 70);
        this.targetRadius = 2;
        this.size = random(0.7, 2); // 大小随机为70%~200%
    }

    update(index: number) {
      this.coordinates.pop();
      this.coordinates.unshift([this.x, this.y]);

      if (this.targetRadius < 8) {
        this.targetRadius += 0.3;
      } else {
        this.targetRadius = 1;
      }

      this.speed *= this.acceleration;

      const vx = Math.cos(this.angle) * this.speed;
      const vy = Math.sin(this.angle) * this.speed;
      this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

      if (this.distanceTraveled >= this.distanceToTarget) {
        createParticles(this.tx, this.ty, this.size);
        fireworks.splice(index, 1);
      } else {
        this.x += vx;
        this.y += vy;
      }
    }

    draw() {
      if (!ctx) return;

      ctx.save();
      ctx.scale(this.size, this.size);
      
      ctx.beginPath();
      ctx.moveTo(this.coordinates[this.coordinates.length - 1][0] / this.size, this.coordinates[this.coordinates.length - 1][1] / this.size);
      ctx.lineTo(this.x / this.size, this.y / this.size);
      ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.tx / this.size, this.ty / this.size, this.targetRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }
  }

  // 粒子类
  class Particle {
    x: number;
    y: number;
    coordinates: number[][];
    coordinateCount: number;
    angle: number;
    speed: number;
    friction: number;
    gravity: number;
    hue: number;
    brightness: number;
    alpha: number;
    decay: number;
    size: number;

    constructor(x: number, y: number, size: number = 1) {
      this.x = x;
      this.y = y;
      this.coordinates = [];
      this.coordinateCount = 5;

      while (this.coordinateCount--) {
        this.coordinates.push([this.x, this.y]);
      }

      this.angle = random(0, Math.PI * 2);
      this.speed = random(1, 7) * size;
      this.friction = 0.95;
      this.gravity = 0.6;
      this.hue = random(hue - 20, hue + 20);
      this.brightness = random(50, 80);
      this.alpha = 1;
      this.decay = random(0.008, 0.015); // 放缓消失速度
      this.size = size;
    }

    update(index: number) {
      this.coordinates.pop();
      this.coordinates.unshift([this.x, this.y]);
      this.speed *= this.friction;
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed + this.gravity;
      this.alpha -= this.decay;

      if (this.alpha <= this.decay) {
        particles.splice(index, 1);
      }
    }

    draw() {
      if (!ctx) return;

      ctx.save();
      ctx.scale(this.size, this.size);
      
      ctx.beginPath();
      ctx.moveTo(this.coordinates[this.coordinates.length - 1][0] / this.size, this.coordinates[this.coordinates.length - 1][1] / this.size);
      ctx.lineTo(this.x / this.size, this.y / this.size);
      ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }
  }

  // 创建粒子
  const createParticles = (x: number, y: number, size: number = 1) => {
    let particleCount = 80;
    while (particleCount--) {
      particles.push(new Particle(x, y, size));
    }
  };

  // 动画循环
  const loop = () => {
    if (!isFireworksRunning) return;

    animationId = requestAnimationFrame(loop);
    hue += 0.5;

    if (!ctx || !canvas) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    let i = fireworks.length;
    while (i--) {
      fireworks[i].draw();
      fireworks[i].update(i);
    }

    i = particles.length;
    while (i--) {
      particles[i].draw();
      particles[i].update(i);
    }

    // 检查是否所有烟花和粒子都已结束
    if (fireworks.length === 0 && particles.length === 0) {
      stopFireworks();
    }
  };

  // 初始化画布
  const initCanvas = () => {
    const oldCanvas = document.getElementById('fireworks-canvas');
    if (oldCanvas) {
      oldCanvas.remove();
    }

    canvas = document.createElement('canvas');
    canvas.id = 'fireworks-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '9999';
    canvas.style.pointerEvents = 'none';

    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // 检查是否为浅色模式
    const isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (isLightMode) {
      const filter = document.createElement('div');
      filter.id = 'fireworks-dark-filter';
      filter.style.position = 'fixed';
      filter.style.top = '0';
      filter.style.left = '0';
      filter.style.width = '100%';
      filter.style.height = '100%';
      filter.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      filter.style.zIndex = '9998';
      filter.style.pointerEvents = 'none';
      filter.style.opacity = '0';
      filter.style.transition = 'opacity 1s ease-in-out';
      document.body.appendChild(filter);

      setTimeout(() => {
        filter.style.opacity = '1';
      }, 100);
    }
  };

  // 启动烟花
  const startFireworks = () => {
    if (isFireworksRunning) return;

    // 进入烟花模式（阻塞所有消息）
    live2dMessageManager.enterFireworksMode();

    initCanvas();
    isFireworksRunning = true;

    // 丰富的烟花消息数组
    const fireworkMessages = [
      '哇，好漂亮的烟花呀！',
      '好美的烟花啊！',
    ];

    // 随机选择一条消息（使用 showFireworksMessage 绕过阻塞）
    const randomMessage = fireworkMessages[Math.floor(Math.random() * fireworkMessages.length)];
    live2dMessageManager.showFireworksMessage(randomMessage, 5000);

    // 重置齐射计数
    volleyCount = 0;
    maxVolleys = 5 + Math.floor(Math.random() * 3); // 5~7轮齐射

    // 开始第一轮齐射
    launchVolley();

    loop();
  };

  // 发射一轮烟花
  const launchVolley = () => {
    if (!isFireworksRunning || volleyCount >= maxVolleys) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;

    // 获取live2d看板娘的位置
    const live2dElement = document.getElementById('landlord');
    let launchX1 = cw / 2;
    let launchY = ch;

    if (live2dElement) {
      const rect = live2dElement.getBoundingClientRect();
      launchX1 = rect.left - 50; // 看板娘左边
      launchY = rect.bottom;
    }

    // 计算对称的发射中心位置（沿中间竖直线对称）
    const centerLine = cw / 2;
    const distanceFromCenter = centerLine - launchX1;
    const launchX2 = centerLine + distanceFromCenter; // 对称位置

    // 根据屏幕大小调整初始速度
    const baseSpeed = Math.min(cw, ch) / 1000;

    // 一次发射7~12个烟花
    const fireworkCount = 7 + Math.floor(Math.random() * 6);

    for (let i = 0; i < fireworkCount; i++) {
      // 为第一个发射中心计算目标位置
      let targetX1;
      let randomValue1 = Math.random();

      if (randomValue1 < 0.5) {
        // 50%的概率在中间30%区域
        const centerStart = cw * 0.35;
        const centerWidth = cw * 0.3;
        targetX1 = random(centerStart, centerStart + centerWidth);
      } else if (randomValue1 < 0.8) {
        // 30%的概率在中间50%区域
        const centerStart = cw * 0.25;
        const centerWidth = cw * 0.5;
        targetX1 = random(centerStart, centerStart + centerWidth);
      } else {
        // 20%的概率在中间70%区域
        const margin = 0.15;
        targetX1 = random(cw * margin, cw * (1 - margin));
      }

      // Y坐标也集中在中间区域
      const margin = 0.15;
      const targetY1 = random(ch * margin, ch * (1 - margin));

      // 为第二个发射中心计算不同的目标位置，确保爆点不在一起
      let targetX2;
      let targetY2;

      // 确保两个发射中心的目标位置有足够的距离
      do {
        let randomValue2 = Math.random();
        if (randomValue2 < 0.5) {
          // 50%的概率在中间30%区域
          const centerStart = cw * 0.35;
          const centerWidth = cw * 0.3;
          targetX2 = random(centerStart, centerStart + centerWidth);
        } else if (randomValue2 < 0.8) {
          // 30%的概率在中间50%区域
          const centerStart = cw * 0.25;
          const centerWidth = cw * 0.5;
          targetX2 = random(centerStart, centerStart + centerWidth);
        } else {
          // 20%的概率在中间70%区域
          const margin = 0.15;
          targetX2 = random(cw * margin, cw * (1 - margin));
        }
        targetY2 = random(ch * margin, ch * (1 - margin));
      } while (Math.sqrt(Math.pow(targetX2 - targetX1, 2) + Math.pow(targetY2 - targetY1, 2)) < cw * 0.1); // 确保距离至少为屏幕宽度的10%

      // 从第一个发射中心发射
      const firework1 = new Firework(launchX1, launchY, targetX1, targetY1);
      firework1.speed = baseSpeed; // 设置基于屏幕大小的速度
      fireworks.push(firework1);

      // 从第二个发射中心（对称位置）发射
      const firework2 = new Firework(launchX2, launchY, targetX2, targetY2);
      firework2.speed = baseSpeed; // 设置基于屏幕大小的速度
      fireworks.push(firework2);
    }

    volleyCount++;

    // 如果还有齐射轮次，延迟1.5秒后发射下一轮
    if (volleyCount < maxVolleys) {
      setTimeout(launchVolley, 1500);
    }
  };

  // 停止烟花
  const stopFireworks = () => {
    isFireworksRunning = false;

    // 退出烟花模式（恢复消息处理）
    live2dMessageManager.exitFireworksMode();

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }

    const filter = document.getElementById('fireworks-dark-filter');
    if (filter) {
      filter.style.opacity = '0';
      setTimeout(() => {
        if (filter.parentNode) {
          filter.parentNode.removeChild(filter);
        }
      }, 1000);
    }

    canvas = null;
    ctx = null;
    fireworks = [];
    particles = [];
  };

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) transform ${isAtTop ? 'translate-x-[150%] opacity-0 scale-90' : 'translate-x-0 opacity-100 scale-100'}`}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity'
      }}
    >
      {/* 主容器 - 优化动画：使用translateX代替right，添加硬件加速提示 */}
      {/* 下一首按钮 - 已完全隐藏 */}
      {/* {showNextButton && (
        <div 
          className={`absolute bottom-0 flex items-center transition-opacity duration-300 ${
            showNextButton ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ right: '56px' }}
          onMouseEnter={() => setIsHoveringNextButton(true)}
          onMouseLeave={() => setIsHoveringNextButton(false)}
        >
          <button
            onClick={playNext}
            className={`p-3 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110`}
            aria-label="下一首歌曲"
            title="下一首歌曲"
          >
            <ForwardIcon className="h-5 w-5" />
          </button>
        </div>
      )} */}
      
      <div className="flex flex-col space-y-2">
        {/* 音乐播放器控制按钮 - 条件显示，在主题切换按钮上方 */}
        <button
          onClick={toggleMusicPlayer}
          // 主题相关样式使用 Tailwind dark: 前缀，避免服务端与客户端 className 不一致
          className={`p-3 ${musicPlayerVisible ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'} rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 ${showThemeButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'}`}
          style={{
            transitionDelay: showThemeButton ? '0.1s' : '0s',
            display: showThemeButton ? 'flex' : 'none'
          }}
          aria-label={musicPlayerVisible ? "隐藏音乐播放器" : "显示音乐播放器"}
          title={musicPlayerVisible ? "隐藏音乐播放器" : "显示音乐播放器"}
        >
          <MusicalNoteIcon className={`h-5 w-5 ${!musicPlayerVisible ? 'opacity-50' : ''}`} />
          {!musicPlayerVisible && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-gray-600 dark:bg-gray-400 transform rotate-45"></div>
            </div>
          )}
        </button>

        {/* 放烟花按钮 - 条件显示，在音乐播放器下面，主题切换上面 */}
        <button
          onClick={startFireworks}
          // 主题相关样式使用 Tailwind dark: 前缀，避免服务端与客户端 className 不一致
          className={`p-3 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 ${showThemeButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'}`}
          style={{
            transitionDelay: showThemeButton ? '0.15s' : '0s',
            display: showThemeButton ? 'flex' : 'none'
          }}
          aria-label="放烟花"
          title="放烟花"
        >
          <SparklesIcon className="h-5 w-5" />
        </button>

        {/* 主题切换按钮 - 条件显示 */}
        <button
          onClick={toggleTheme}
          // 主题相关样式使用 Tailwind dark: 前缀，避免服务端与客户端 className 不一致
          // title 和图标在客户端挂载后再按真实主题渲染，避免水合时文本/图标不一致
          className={`p-3 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 ${showThemeButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'}`}
          style={{
            transitionDelay: showThemeButton ? '0.2s' : '0s',
            display: showThemeButton ? 'flex' : 'none'
          }}
          aria-label="切换主题"
          title={mounted ? (theme === 'dark' ? '切换到浅色模式' : '切换到深色模式') : '切换到深色模式'}
        >
          {mounted ? (theme === 'dark' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />) : <SunIcon className="h-5 w-5" />}
        </button>
        
        {/* 设置按钮 - 方形风格 */}
        <button
          onClick={toggleThemeButton}
          // 主题相关样式使用 Tailwind dark: 前缀，避免服务端与客户端 className 不一致
          className={`p-3 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110`}
          aria-label="设置"
          title="设置"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
        
        {/* 回到顶部按钮 - 方形风格 - 在页面顶部时禁用 */}
        <button
          onClick={scrollToTop}
          className={`p-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-110 ${isAtTop ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="回到顶部"
          title="回到顶部"
          disabled={isAtTop}
        >
          <ChevronUpIcon className="h-5 w-5" />
        </button>
        
        {/* 转到页底按钮 - 方形风格 */}
        <button
          onClick={scrollToBottom}
          // 主题相关样式使用 Tailwind dark: 前缀，避免服务端与客户端 className 不一致
          className={`p-3 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 ${isAtBottom ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="转到页底"
          title="转到页底"
          disabled={isAtBottom}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
        
        {/* 播放/暂停音乐按钮 - 已完全隐藏 */}
        {/* <button
          onClick={togglePlayPause}
          onMouseEnter={() => setIsHoveringPlayButton(true)}
          onMouseLeave={() => setIsHoveringPlayButton(false)}
          className={`relative p-3 ${currentSong ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'} rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 ${!currentSong ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isPlaying ? "暂停音乐" : "播放音乐"}
          title={isPlaying ? "暂停音乐" : "播放音乐"}
          disabled={!currentSong}
        >
          {currentSong && currentSong.cover && (
            <Image 
              src={currentSong.cover} 
              alt={currentSong.title} 
              width={48} 
              height={48} 
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
            />
          )}
          <div className={`relative z-10 ${currentSong && currentSong.cover ? 'bg-black/30 rounded-lg' : ''}`}>
            {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </div>
        </button> */}
      </div>
    </div>
  );
}