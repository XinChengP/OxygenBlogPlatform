'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { name, aWord, year } from '@/setting/FooterSetting';
import { usePathname } from 'next/navigation';
import { getAssetPath } from '@/utils/assetUtils';
import { motion } from 'framer-motion';

/**
 * 动态加载外部脚本工具函数
 * @param src 脚本地址
 * @returns Promise，加载成功 resolve，失败 reject
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查脚本是否已经存在，避免重复加载
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
    document.body.appendChild(script);
  });
}

/**
 * 底部小鱼特效组件
 * 效果来源：是羊驼吖 博客园
 * 参考：https://www.cnblogs.com/elkyo/
 *
 * 实现说明：
 * 1. 将 fish.js 和 jQuery 下载到本地 public/js 目录
 * 2. 通过 getAssetPath 处理 GitHub Pages 的 basePath
 * 3. 先加载 jQuery，再加载 fish.js，确保依赖关系正确
 * 4. 使用 ref 标记加载状态，避免 React Strict Mode 双重挂载导致重复初始化
 * 5. 移动端默认隐藏，避免影响触控操作
 */
function FlyingFish() {
  // 标记是否已经加载过脚本，防止 Strict Mode 下重复加载
  const isLoadedRef = useRef(false);

  // 页面加载完成后按顺序加载 jQuery 和 fish.js
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoadedRef.current) return;

    const container = document.getElementById('jsi-flying-fish-container');
    if (container) {
      container.addEventListener('click', (e) => e.stopPropagation(), true);
    }

    const jqueryPath = getAssetPath('/js/jquery.min.js');
    const fishPath = getAssetPath('/js/fish.js');

    // 先加载 jQuery，再加载 fish.js
    loadScript(jqueryPath)
      .then(() => loadScript(fishPath))
      .then(() => {
        isLoadedRef.current = true;
        console.log('小鱼特效加载成功');
      })
      .catch((error) => {
        console.error('小鱼特效加载失败:', error);
      });

    // 注意：小鱼特效脚本只需要加载一次
    // 清理函数留空，避免 React Strict Mode 双重挂载导致重复加载和初始化
  }, []);

  return (
    <>
      {/* 小鱼特效容器 - 作为页脚内容的一部分，随页面滚动显示 */}
      <div id="jsi-flying-fish-container" className="jsi-flying-fish-container" />
      {/* 小鱼特效样式 - 响应式适配移动端 */}
      <style jsx>{`
        .jsi-flying-fish-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
          /* 使用主题色的低透明度版本作为绘制颜色，更淡雅 */
          color: color-mix(in srgb, var(--primary) 50%, transparent);
        }
        .jsi-flying-fish-container :global(canvas) {
          width: 100% !important;
          height: 100% !important;
        }
        @media only screen and (max-width: 767px) {
          .jsi-flying-fish-container {
            display: none;
          }
        }
      `}</style>
    </>
  );
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
 * 页脚组件 - 性能优化版
 *
 * 优化点：
 * 1. 使用 useMemo 缓存计算结果
 * 2. 优化定时器性能
 * 3. 使用 React.memo 减少不必要的渲染
 *
 * 注意：所有 hooks 必须在条件返回之前调用，遵循 React Hooks 规则
 */
function Footer() {
  const pathname = usePathname();

  // 计算版权年份，格式为 "2025 - 【当前年份】"
  const copyrightYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return currentYear === 2025 ? "2025" : `2025 - ${currentYear}`;
  }, []);

  // 网站上线时间 - 使用 useMemo 缓存
  const launchDate = useMemo(() => new Date('2025-11-06T20:00:00'), []);
  const runTimeRef = useRef<HTMLSpanElement>(null);

  // 实时更新运行时间 - 使用 ref 直接操作 DOM，避免 React re-render
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 1000; // 每秒更新一次

    const updateRunTime = (currentTime: number) => {
      // 控制更新频率，避免过度渲染
      if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        const now = new Date();
        const diff = now.getTime() - launchDate.getTime();
        if (runTimeRef.current) {
          runTimeRef.current.textContent = diff < 0
            ? `距离上线还有 ${formatTime(-diff)}`
            : `已陪你走下去：${formatTime(diff)}`;
        }
        lastUpdateTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(updateRunTime);
    };

    // 立即执行一次
    updateRunTime(performance.now());

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [launchDate]);

  // 后台页面不显示页脚 - 在所有 hooks 调用之后再条件返回
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="relative min-h-[300px] flex flex-col justify-end !border-none overflow-hidden">
      {/* 底部小鱼特效 - 作为页脚背景 */}
      <FlyingFish />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* 两栏布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-108">
          {/* 第一栏：站点信息 */}
          <div className="text-center md:text-left">
            <h3 className="text-lg text-white drop-shadow-sm mb-2">
              &copy; {copyrightYear} {name}
            </h3>
            {aWord && (
              <p className="text-sm text-white/70 italic mb-3">{aWord}</p>
            )}
            <p className="text-xs text-white/60">
              <span ref={runTimeRef} />
            </p>
          </div>

          {/* 第二栏：备案信息 + 链接 */}
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-end gap-3 mb-3">
              <a
                href="/rss.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors duration-200"
                title="RSS 订阅"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
              </a>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors duration-200"
                title="站点地图"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </a>
            </div>
            <div className="flex flex-col gap-1.5">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/70 hover:text-white transition-colors duration-200 underline-offset-4 hover:underline"
              >
                津ICP备2025041817号
              </a>
              <p className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                <a
                  href="https://icp.gov.moe/?keyword=20261099"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/50 hover:text-white transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  萌ICP备20261099号
                </a>
                <span className="text-white/30">·</span>
                <a
                  href="https://www.moicp.cn/keyword.php?type=魔ICP备2026849076号-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/50 hover:text-white transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  魔ICP备2026849076号-1
                </a>
              </p>
              <a
                href="https://icp.250gov.cn/2026/1099"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/50 hover:text-white transition-colors duration-200 underline-offset-4 hover:underline"
              >
                悦ICP备20261099号
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </footer>
  );
}

// 使用 React.memo 减少不必要的渲染
export default React.memo(Footer);