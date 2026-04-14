'use client';

import { Suspense, lazy, useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';

// 懒加载ReactMarkdown组件
const ReactMarkdown = lazy(() => import('react-markdown'));

// 动态导入插件
const loadPlugins = async () => {
  const [remarkGfm, remarkMath, remarkBreaks, remarkEmoji, rehypeKatex, rehypeRaw, rehypeSlug] = await Promise.all([
    import('remark-gfm'),
    import('remark-math'),
    import('remark-breaks'),
    import('remark-emoji'),
    import('rehype-katex'),
    import('rehype-raw'),
    import('rehype-slug')
  ]);
  
  // 配置 rehype-raw 允许特定的 HTML 标签通过
  const rehypeRawWithConfig = [rehypeRaw.default, { 
    passThrough: ['div', 'span', 'img', 'p', 'br', 'hr', 'a', 'strong', 'em', 'code', 'pre'] 
  }];
  
  return {
    remarkPlugins: [remarkGfm.default, remarkMath.default, remarkBreaks.default, remarkEmoji.default],
    rehypePlugins: [rehypeKatex.default, rehypeRawWithConfig, rehypeSlug.default]
  };
};

interface LazyMarkdownProps {
  content: string;
  components?: any;
}

// 加载骨架屏组件
function MarkdownSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* 标题骨架 */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      
      {/* 段落骨架 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
      </div>
      
      {/* 代码块骨架 */}
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      
      {/* 更多段落骨架 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
      
      {/* 图片骨架 */}
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      
      {/* 列表骨架 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

// 优化后的ReactMarkdown渲染组件
const MarkdownRenderer = memo(({ content, components, plugins }: { content: string; components?: any; plugins: any }) => {
  return (
    <ReactMarkdown
      remarkPlugins={plugins.remarkPlugins}
      rehypePlugins={plugins.rehypePlugins}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
});

export default memo(function LazyMarkdown({ content, components }: LazyMarkdownProps) {
  const [plugins, setPlugins] = useState<{
    remarkPlugins: any[];
    rehypePlugins: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlugins().then((loadedPlugins) => {
      setPlugins(loadedPlugins);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Failed to load markdown plugins:', error);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !plugins) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <MarkdownSkeleton />
      </motion.div>
    );
  }

  return (
    <Suspense fallback={
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <MarkdownSkeleton />
      </motion.div>
    }>
      <MarkdownRenderer
        content={content}
        components={components}
        plugins={plugins}
      />
    </Suspense>
  );
});