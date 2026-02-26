'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../admin/components/AdminLayout';
import { Plus, Edit, Trash2, Pin, Search } from 'lucide-react';
import Link from 'next/link';
import type { BlogPostForAdmin } from '../../../admin/types';

/**
 * 博文管理列表页面
 * 支持查看、搜索、编辑和删除博文
 */
export default function AdminBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<BlogPostForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 加载博文列表
  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      const res = await fetch('/api/admin/blogs');
      if (res.ok) {
        const data = await res.json();
        setBlogs(data);
      }
    } catch (error) {
      console.error('加载博文失败:', error);
      setMessage({ text: '加载博文失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 删除博文
  const deleteBlog = async (slug: string, title: string) => {
    if (!confirm(`确定要删除博文《${title}》吗？此操作不可恢复！`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        // 重新加载列表
        loadBlogs();
        // 3秒后清除消息
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || '删除失败', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: '删除失败', type: 'error' });
    }
  };

  // 过滤搜索结果
  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (blog.tags && blog.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-xl text-gray-600 dark:text-gray-400">加载中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">博文管理</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">管理和编辑所有博客文章</p>
          </div>
          <Link 
            href="/admin/blogs/new"
            className="flex items-center space-x-2 bg-[#66ccff] text-[#1e40af] px-4 py-2 rounded-lg hover:bg-[#66ccff]/80 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg font-medium"
          >
            <Plus size={20} />
            <span>写新博文</span>
          </Link>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            } animate-fade-in`}
          >
            {message.text}
          </div>
        )}

        {/* 搜索框 */}
        <div className="relative animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input
            type="text"
            placeholder="搜索博文标题、分类或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          />
        </div>

        {/* 博文列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {filteredBlogs.length === 0 ? (
            <div className="p-12 text-center">
              {searchTerm ? (
                <div className="text-gray-500 dark:text-gray-400">
                  没有找到匹配的博文
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400">
                  还没有博文，点击上方按钮开始写第一篇！
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBlogs.map((blog, index) => (
                <div 
                  key={blog.slug} 
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 transform hover:translate-x-1"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {blog.pinned && <Pin size={18} className="text-orange-500" />}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {blog.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {blog.date} · {blog.category}
                      </p>
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {blog.tags.map((tag: string) => (
                            <span 
                              key={tag} 
                              className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {/* 编辑按钮 */}
                      <Link
                        href={`/admin/blogs/${blog.slug}`}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors transform hover:scale-110"
                        title="编辑"
                      >
                        <Edit size={20} />
                      </Link>
                      {/* 删除按钮 */}
                      <button
                        onClick={() => deleteBlog(blog.slug, blog.title)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors transform hover:scale-110"
                        title="删除"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
