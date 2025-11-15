import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { GithubIcon, MailIcon, GlobeIcon } from "lucide-react"
import Image from 'next/image'
import Link from 'next/link'
import { friendsLinks } from '@/setting/AboutSetting'
import { getAssetPath } from '@/utils/assetUtils'

/**
 * 处理友链头像路径，处理basePath
 */
function getFriendAvatarPath(avatar: string): string {
  // 使用项目的asset工具函数处理路径
  return getAssetPath(avatar);
}

/**
 * 友情链接组件
 * 展示友情链接，带有毛玻璃效果
 */
export default function FriendsLink() {
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
      transition={{ duration: 0.6, delay: 0.5 }}
      className="relative z-10 mt-8 p-8 rounded-2xl transition-all duration-500 backdrop-blur-md bg-card/90 border shadow-lg supports-[backdrop-filter]:bg-card/75"
    >
      {/* 标题和描述 */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
            backgroundSize: '200% 200%',
            color: 'white'
          }}
        >
          <GlobeIcon className="w-8 h-8" />
        </motion.div>
        <h3 
          className="text-2xl font-bold bg-clip-text text-transparent mb-3 transition-all duration-500"
          style={{
            backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 40%, #ec4899 70%, #3b82f6 100%)',
            backgroundSize: '200% 200%',
          }}
        >
          友情链接
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
          
        </p>
      </div>

      {/* 友情链接网格 */}
      {friendsLinks && friendsLinks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friendsLinks.map((link, index) => (
            <motion.a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
              className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center mb-4">
                  {link.avatar ? (
                    <Image
                      src={getFriendAvatarPath(link.avatar)}
                      alt={link.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full mr-3 object-cover flex-shrink-0"
                      onError={(e) => {
                        // 图片加载失败时显示默认图标
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          // 创建默认头像容器
                          const fallback = document.createElement('div');
                          fallback.className = 'w-12 h-12 rounded-full mr-3 flex items-center justify-center flex-shrink-0';
                          fallback.style.background = 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)';
                          fallback.style.backgroundSize = '200% 200%';
                          fallback.style.color = 'white';
                          fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                          
                          // 隐藏原图片，显示备用头像
                          target.style.display = 'none';
                          parent.insertBefore(fallback, target);
                        }
                      }}
                      onLoad={(e) => {
                        // 图片加载成功时确保图片可见
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'block';
                        // 移除可能存在的备用头像
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('div[style*="background: linear-gradient"]');
                          if (fallback && fallback !== target) {
                            fallback.remove();
                          }
                        }
                      }}
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-full mr-3 flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
                        backgroundSize: '200% 200%',
                        color: 'white'
                      }}
                    >
                      <GlobeIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {link.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {link.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  {link.url.includes('github') ? (
                    <GithubIcon className="w-4 h-4 mr-1" />
                  ) : link.url.includes('mail') ? (
                    <MailIcon className="w-4 h-4 mr-1" />
                  ) : (
                    <GlobeIcon className="w-4 h-4 mr-1" />
                  )}
                  <span className="truncate">{link.url}</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gray-100 dark:bg-gray-800">
            <GlobeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            暂无友情链接
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            友情链接正在收集中，敬请期待
          </p>
        </div>
      )}

      {/* 底部装饰性文字 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
        className="text-center mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50"
      >
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          🌟 友情链接 · 让我们一起在互联网的世界中相遇
        </p>
      </motion.div>
    </motion.div>
  );
}