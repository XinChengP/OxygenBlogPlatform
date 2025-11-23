import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { Link2, ExternalLink } from "lucide-react"
import Link from 'next/link'
import { relatedLinks } from '@/setting/AboutSetting'
import { getAssetPath } from '@/utils/assetUtils'

/**
 * 处理相关链接图标路径，处理basePath
 */
function getRelatedLinkIconPath(icon: string): string {
  return getAssetPath(icon);
}

/**
 * 相关链接组件
 * 展示相关链接，带有毛玻璃效果
 */
export default function RelatedLinks() {
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="relative z-10 mt-8 p-8 rounded-2xl transition-all duration-500 backdrop-blur-md bg-blue-50/90 dark:bg-blue-950/90 border border-blue-200 dark:border-blue-800 shadow-lg supports-[backdrop-filter]:bg-blue-50/75 dark:supports-[backdrop-filter]:bg-blue-950/75"
    >
      {/* 标题和描述 - 更紧凑的标题区域 */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 shadow-lg transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%)',
            backgroundSize: '200% 200%',
            color: 'white'
          }}
        >
          <Link2 className="w-6 h-6" />
        </motion.div>
        <h3 
          className="text-xl font-bold bg-clip-text text-transparent mb-2 transition-all duration-500"
          style={{
            backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 40%, #60a5fa 70%, #3b82f6 100%)',
            backgroundSize: '200% 200%',
          }}
        >
          相关链接
        </h3>
        <p className="text-blue-600 dark:text-blue-300 text-sm leading-relaxed max-w-xl mx-auto">
          本站参考的资源
        </p>
      </div>

      {/* 相关链接网格 - 更紧凑的布局 */}
      {relatedLinks && relatedLinks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {relatedLinks.map((link, index) => (
            <motion.a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
              className="group relative bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 shadow-sm hover:shadow-lg border border-blue-200 dark:border-blue-800 transition-all duration-300 cursor-pointer overflow-hidden hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="relative z-10">
                <div className="flex items-center mb-3">
                  {link.icon ? (
                    <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600">
                      <img
                        src={getRelatedLinkIconPath(link.icon)}
                        alt={link.name}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          // 图标加载失败时显示默认图标
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            // 创建默认图标
                            const fallback = document.createElement('div');
                            fallback.className = 'w-6 h-6 flex items-center justify-center';
                            fallback.style.color = 'white';
                            fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
                            
                            // 隐藏原图标，显示备用图标
                            target.style.display = 'none';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full mr-3 flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%)',
                        backgroundSize: '200% 200%',
                        color: 'white'
                      }}
                    >
                      <ExternalLink className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-blue-800 dark:text-blue-100 truncate group-hover:text-blue-900 dark:group-hover:text-blue-50 transition-colors duration-200">
                      {link.name}
                    </h4>
                    <p className="text-xs text-blue-500 dark:text-blue-400 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-200">
                      {link.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs text-blue-600 dark:text-blue-300 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors duration-200">
                  <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{link.url}</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gray-100 dark:bg-gray-800">
            <Link2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            暂无相关链接
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            相关链接正在收集中，敬请期待
          </p>
        </div>
      )}

      {/* 底部装饰性文字 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="text-center mt-8 pt-6 border-t border-blue-200/50 dark:border-blue-700/50"
      >
        <p className="text-blue-500 dark:text-blue-400 text-sm">
          🔗 相关链接 · 探索更多精彩内容和项目
        </p>
      </motion.div>
    </motion.div>
  );
}