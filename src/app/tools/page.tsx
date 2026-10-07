/**
 * 小工具页面
 * 提供多种实用小工具
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  getActiveTools,
  getFeaturedTools,
  ToolItem
} from '@/setting/toolsSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import { trackToolView, trackPageView } from '@/components/Analytics';



// 工具卡片组件
// 文字颜色改用语义令牌（text-foreground/text-muted-foreground），
// 不再需要 isDark 手动切换硬编码的灰色系
interface ToolCardProps {
  tool: ToolItem;
  index: number;
}

// GitHub 仓库图标（内联 SVG，避免引入图标库）
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function ToolCard({ tool, index }: ToolCardProps) {
  /* 工具卡迁入全站玻璃令牌：强档 glass-card-strong（近实底 + 细微通透），
     与文章正文面板同档；卡量少（<10），backdrop-blur 合成开销可忽略 */
  const getGlassStyle = (baseStyle: string) => {
    return `${baseStyle} glass-card-strong`;
  };

  /* 右上角仓库图标入口：
     - 站内工具取 repoUrl（源码仓库地址）
     - 外部工具的主按钮本身就是仓库链接，复用 path 即可
     未配置仓库地址的工具（如阵容搭配模拟器）不显示图标 */

  // 仓库地址：站内工具用 repoUrl，外部工具用 path
  const repoHref = tool.repoUrl ?? (tool.external ? tool.path : undefined);

  /* 底部按钮行按工具类型分流：
     - 站内工具 + repoUrl：左侧「立即使用」主按钮 + 右侧「前往仓库」次按钮并排
     - 站内工具无 repoUrl：仅「立即使用」
     - 外部工具（external: true）：仅「前往仓库」（新标签页打开 GitHub 仓库）
     外链统一加 rel="noopener noreferrer" 防止标签页劫持；
     外部链接不加 data-skip-external-guard，保持全站外链守卫统一拦截提醒 */
  const renderActionButtons = () => {
    // 所有按钮统一使用同一套天依蓝样式，视觉保持一致
    const primaryClass = "flex-1 px-4 py-2 rounded-md border border-primary/40 bg-primary/10 text-primary"
      + " hover:bg-primary/20 hover:border-primary/70 transition-colors duration-200"
      + " flex items-center justify-center gap-2";

    // 外部工具：主按钮即仓库链接，无需第二个按钮
    if (tool.external) {
      return (
        <a
          href={tool.path}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryClass}
        >
          <span>前往仓库</span>
          <span>↗</span>
        </a>
      );
    }

    return (
      <>
        {/* 主按钮：站内路由跳转 */}
        <Link href={tool.path!} className={primaryClass}>
          <span>立即使用</span>
          <span>→</span>
        </Link>
        {/* 次按钮：配置了源码仓库地址才显示「前往仓库」，样式与主按钮一致 */}
        {tool.repoUrl && (
          <a
            href={tool.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="查看源码仓库"
            aria-label={`查看 ${tool.name} 的源码仓库`}
            className={primaryClass}
          >
            <span>前往仓库</span>
            <span>↗</span>
          </a>
        )}
      </>
    );
  };

  return (
    /* 圆角统一标准卡片档 rounded-xl；CSS 过渡只管阴影/边框色，
       位移由 Framer Motion 驱动（-3 与全站卡片一致），避免双重过渡 */
    <motion.div
      key={tool.id}
      className={getGlassStyle("rounded-xl p-6 border hover:shadow-card-hover hover:border-primary/30 transition-[box-shadow,border-color] duration-300")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -3 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{tool.icon}</span>
        <h3 className="text-lg font-semibold text-foreground">
          {tool.name}
        </h3>
        {/* 右上角源码仓库图标：配置了仓库地址才显示，灰色低调、悬停变天依蓝 */}
        {repoHref && (
          <a
            href={repoHref}
            target="_blank"
            rel="noopener noreferrer"
            title="查看源码仓库"
            aria-label={`查看 ${tool.name} 的源码仓库`}
            className="ml-auto p-2 rounded-md text-muted-foreground
                       hover:text-primary hover:bg-primary/10
                       transition-colors duration-200"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {tool.description}
      </p>
      {/* 按钮行：flex 容器让按钮并排且等宽（无次按钮时主按钮占满整行） */}
      <div className="flex gap-2">
        {renderActionButtons()}
      </div>
    </motion.div>
  );
}

export default function ToolsPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('tools');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 小工具页面浏览统计 - 在组件挂载时上报
  useEffect(() => {
    if (mounted) {
      // 延迟上报，确保 SDK 已加载
      const timer = setTimeout(() => {
        trackPageView('小工具首页', {
          toolCount: getActiveTools().length
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // 如果组件未挂载，显示占位符
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  // 页面数据：特色工具与普通工具分开渲染，避免重复展示
  const featuredTools = getFeaturedTools();
  // 普通工具 = 全部激活工具排除已在特色区展示的
  const normalTools = getActiveTools().filter(tool => !tool.featured);

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''} ${containerStyle.className}`}
      style={containerStyle.style}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* 页面标题 */}
        <PageHeader
          title="小工具"
          description="超绝小工具"
          size="lg"
          className="mb-12"
        />

        {/* 主内容区（移除分类侧边栏后改为全宽单列布局） */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* 工具统计信息 */}
          <div className="mb-8">
            <p className="text-sm text-muted-foreground">
              共收录 {getActiveTools().length} 个实用工具，更多工具持续开发中
            </p>
          </div>

          {/* 特色工具展示 */}
          {featuredTools.length > 0 && (
            <div className="mb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredTools.map((tool, index) => (
                  <ToolCard key={tool.id} tool={tool} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* 普通工具展示区域（排除特色工具后的剩余激活工具） */}
          {normalTools.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {normalTools.map((tool, index) => (
                <ToolCard key={tool.id} tool={tool} index={index} />
              ))}
            </div>
          )}
        </motion.main>
      </div>


    </main>
  );
}