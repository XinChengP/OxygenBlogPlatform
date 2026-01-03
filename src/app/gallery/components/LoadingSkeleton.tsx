'use client';

// LoadingSkeleton组件属性
interface LoadingSkeletonProps {
  count?: number; // 骨架屏数量
}

// LoadingSkeleton组件
const LoadingSkeleton = ({ count = 12 }: LoadingSkeletonProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="group relative overflow-hidden rounded-lg shadow-md"
        >
          {/* 骨架屏容器 */}
          <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
            {/* 骨架屏动画 */}
            <div className="absolute inset-0 animate-pulse">
              <div className="h-full w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;