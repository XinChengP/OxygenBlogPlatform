import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Link2, ExternalLink, Github, Mail, Globe, ChevronRight } from "lucide-react"
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
  const [isExpanded, setIsExpanded] = useState(false); // 控制展开/收起状态

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
      className="relative z-10 mt-8 rounded-2xl p-8 border transition-all duration-500 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75"
    >
      {/* 标题区域 - 改为可点击，控制展开/收起 */}
      <div 
        className="text-center mb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(102, 204, 255) 50%, rgb(6, 182, 212) 100%) 0% 0% / 200% 200%',
            animation: '6s ease-in-out 0s infinite normal none running gradientShift',
            color: 'white',
            transform: 'none'
          }}
        >
          <Link2 className="w-8 h-8" />
        </motion.div>
        <h3 
          className="text-2xl font-bold bg-clip-text text-transparent mb-2 transition-all duration-500"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgb(102, 204, 255) 0%, rgb(6, 182, 212) 40%, rgb(30, 64, 175) 70%, rgb(102, 204, 255) 100%)',
            backgroundSize: '200% 200%',
            animation: '8s ease-in-out 0s infinite normal none running gradientShift'
          }}
        >
          相关链接
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
          本站参考的资源
        </p>
      </div>

      {/* 相关链接列表 - 默认收起，点击标题展开 */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: isExpanded ? 1 : 0,
          height: isExpanded ? 'auto' : 0,
          overflow: isExpanded ? 'visible' : 'hidden'
        }}
        transition={{ duration: 0.3 }}
      >
        {relatedLinks && relatedLinks.length > 0 ? (
          <div className="space-y-3 mt-4">
            {relatedLinks.map((link, index) => (
              <motion.a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isExpanded ? 1 : 0, x: isExpanded ? 0 : -20 }}
                transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                className="group relative flex items-center justify-between bg-card/80 dark:bg-card/80 rounded-lg p-4 hover:bg-card/90 dark:hover:bg-card/90 border border-border transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  {/* 图标区域 - 整合SVG图标到最左边 */}
                  <div className="flex-shrink-0">
                    {link.icon ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                        <img
                          src={getRelatedLinkIconPath(link.icon)}
                          alt={link.name}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            // 图标加载失败时显示默认图标
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent) {
                              // 创建默认图标
                              const fallback = document.createElement('div');
                              fallback.className = 'w-5 h-5 flex items-center justify-center';
                              fallback.style.color = 'white';
                              
                              // 根据URL类型显示不同的SVG图标
                              if (link.url.includes('github')) {
                                fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>';
                              } else if (link.url.includes('mail')) {
                                fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>';
                              } else {
                                fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>';
                              }
                              
                              // 隐藏原图标，显示备用图标
                              target.style.display = 'none';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%)',
                          backgroundSize: '200% 200%',
                          color: 'white'
                        }}
                      >
                        {/* 根据URL类型显示不同的SVG图标 */}
                        {link.url.includes('github') ? (
                          <Github className="w-5 h-5" />
                        ) : link.url.includes('mail') ? (
                          <Mail className="w-5 h-5" />
                        ) : (
                          <Globe className="w-5 h-5" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 内容区域 - 移除右侧的小图标 */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <h4 className="text-base font-semibold text-gray-800 dark:text-white truncate">
                        {link.name}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {link.description}
                    </p>
                  </div>
                </div>
                
                {/* 右侧箭头 */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              </motion.a>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mt-4">
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
          animate={{ opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="text-center mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50"
        >
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            🔗 相关链接 · 探索更多精彩内容和项目
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}