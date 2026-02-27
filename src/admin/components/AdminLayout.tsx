'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  FileText,
  MessageSquare,
  Image,
  Settings,
  Menu,
  X
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: '仪表板', href: '/admin/dashboard', icon: Home },
  { name: '博文管理', href: '/admin/blogs', icon: FileText },
  { name: '动态管理', href: '/admin/moments', icon: MessageSquare },
  { name: '图床管理', href: '/admin/gallery', icon: Image },
  { name: '系统设置', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // 从localStorage中获取后台主题设置，默认为浅色模式
    const adminTheme = localStorage.getItem('adminTheme');
    if (adminTheme === 'dark') {
      setIsDarkMode(true);
    } else if (adminTheme === 'light') {
      setIsDarkMode(false);
    } else {
      // 默认使用浅色模式
      setIsDarkMode(false);
    }
  }, []);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* 移动端菜单按钮 */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
        >
          {sidebarOpen ? <X size={24} className="text-gray-700 dark:text-gray-200" /> : <Menu size={24} className="text-gray-700 dark:text-gray-200" />}
        </button>
      </div>

      {/* 侧边栏 */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-[#66ccff] to-[#1e40af] dark:from-[#1e40af] dark:to-[#0f2452] shadow-2xl z-40 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* 侧边栏头部 */}
        <div className="p-6 border-b border-[#66ccff]/30 dark:border-[#66ccff]/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-lg animate-pulse">
              <img 
                src="/星球卑.jpg" 
                alt="洛天依" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white dark:text-white">后台管理</h1>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="p-4 space-y-2 mt-6">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 transform hover:translate-x-2
                  ${isActive 
                    ? 'bg-white/20 backdrop-blur-sm text-white font-medium shadow-md' 
                    : 'text-white/80 hover:bg-white/10'
                  }
                `}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-white/60'} />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-8 bg-white rounded-full shadow-sm animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 底部返回首页按钮 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#66ccff]/30 dark:border-[#66ccff]/20">
          <Link
            href="/"
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-white/80 hover:bg-white/10 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <Home size={20} />
            <span className="font-medium">返回首页</span>
          </Link>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="lg:ml-64 min-h-screen">
        {/* 顶部导航栏 */}
        <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 animate-fade-in">
                {navItems.find(item => pathname === item.href)?.name || '后台管理'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  const newMode = !isDarkMode;
                  setIsDarkMode(newMode);
                  // 保存后台主题设置到localStorage
                  localStorage.setItem('adminTheme', newMode ? 'dark' : 'light');
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors transform hover:scale-110"
                title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
              >
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="p-6 lg:p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>

      {/* 遮罩层（移动端） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 全局样式 */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
