'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../../admin/components/AdminLayout';
import { FileText, MessageSquare, Image, Calendar } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    blogCount: 0,
    momentCount: 0,
    imageCount: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const blogsRes = await fetch('/api/admin/blogs');
        const momentsRes = await fetch('/api/admin/moments');
        
        if (blogsRes.ok) {
          const blogsData = await blogsRes.json();
          setStats(prev => ({ ...prev, blogCount: blogsData.length || 0 }));
        }
        
        if (momentsRes.ok) {
          const momentsData = await momentsRes.json();
          setStats(prev => ({ ...prev, momentCount: momentsData.length || 0 }));
        }
      } catch (error) {
        console.error('加载统计数据失败:', error);
      }
    }
    
    loadStats();
  }, []);

  const statCards = [
    { 
      title: '博文数量', 
      value: stats.blogCount, 
      icon: FileText, 
      color: 'bg-[#66ccff]',
      description: '已发布的博客文章'
    },
    { 
      title: '动态数量', 
      value: stats.momentCount, 
      icon: MessageSquare, 
      color: 'bg-[#06b6d4]',
      description: '发布的生活动态'
    },
    { 
      title: '图片数量', 
      value: stats.imageCount, 
      icon: Image, 
      color: 'bg-[#1e40af]',
      description: '图床中的图片'
    },
    { 
      title: '今日', 
      value: new Date().toLocaleDateString('zh-CN'), 
      icon: Calendar, 
      color: 'bg-[#66ccff]',
      description: '系统运行正常'
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 页面标题 */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">仪表板</h1>
          <p className="text-gray-600 dark:text-gray-400">欢迎回来！查看系统概览和快速操作</p>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:translate-y-[-8px] border border-gray-200 dark:border-gray-700 backdrop-blur-sm"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1 font-medium">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{card.value}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">{card.description}</p>
                  </div>
                  <div className={`${card.color} p-4 rounded-xl shadow-lg transform hover:scale-110 transition-transform duration-300`}>
                    <Icon className="text-white" size={32} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 快捷操作 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#66ccff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            快捷操作
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a 
              href="/admin/blogs/new" 
              className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center hover:border-[#66ccff] hover:text-[#66ccff] transition-all duration-300 transform hover:scale-105 bg-gray-50 dark:bg-gray-900 hover:shadow-md"
            >
              <FileText className="mx-auto mb-3 text-[#66ccff]" size={40} />
              <span className="font-medium text-gray-800 dark:text-white">写新博文</span>
            </a>
            <a 
              href="/admin/moments/new" 
              className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center hover:border-[#06b6d4] hover:text-[#06b6d4] transition-all duration-300 transform hover:scale-105 bg-gray-50 dark:bg-gray-900 hover:shadow-md"
            >
              <MessageSquare className="mx-auto mb-3 text-[#06b6d4]" size={40} />
              <span className="font-medium text-gray-800 dark:text-white">发新动态</span>
            </a>
            <a 
              href="/admin/gallery" 
              className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center hover:border-[#1e40af] hover:text-[#1e40af] transition-all duration-300 transform hover:scale-105 bg-gray-50 dark:bg-gray-900 hover:shadow-md"
            >
              <Image className="mx-auto mb-3 text-[#1e40af]" size={40} />
              <span className="font-medium text-gray-800 dark:text-white">管理图片</span>
            </a>
          </div>
        </div>

        {/* 系统状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {/* 安全提示 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.333-1.667-.333-2.43 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">安全提示</h3>
                <p className="text-blue-700 dark:text-blue-300">
                  后台管理系统仅在本地运行，所有敏感信息不会提交到 GitHub。请确保在可信的环境中使用。
                </p>
              </div>
            </div>
          </div>
          
          {/* 系统信息 */}
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 rounded-r-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">系统状态</h3>
                <p className="text-green-700 dark:text-green-300">
                  系统运行正常，所有服务已启动。当前日期：{new Date().toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
