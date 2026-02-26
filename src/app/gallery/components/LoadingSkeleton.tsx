'use client';

import { motion } from 'framer-motion';

// LoadingSkeleton组件属性
interface LoadingSkeletonProps {
  count?: number;
}

// LoadingSkeleton组件
const LoadingSkeleton = ({ count = 12 }: LoadingSkeletonProps) => {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4 space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div 
          key={index} 
          className="mb-4 break-inside-avoid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          <div className="group relative overflow-hidden rounded-lg shadow-md border border-border/50">
            {/* 骨架屏容器 */}
            <div className="aspect-square relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {/* 骨架屏动画 - 波浪效果 */}
              <div className="absolute inset-0">
                <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"></div>
                {/* 波浪动画叠加层 */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: index * 0.1
                  }}
                />
              </div>
              
              {/* 加载指示器 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600"></div>
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary absolute top-0 left-0"></div>
                </div>
              </div>
            </div>
            
            {/* 底部信息骨架 */}
            <div className="p-3 bg-card">
              <div className="h-3 bg-muted rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-2 bg-muted rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
