'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../../admin/components/AdminLayout';
import { Plus, Edit, Trash2, Pin, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { MomentForAdmin } from '../../../admin/types';

export default function AdminMomentsPage() {
  const [moments, setMoments] = useState<MomentForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    try {
      const res = await fetch('/api/admin/moments');
      if (res.ok) {
        const data = await res.json();
        setMoments(data);
      }
    } catch (error) {
      console.error('加载动态失败:', error);
      setMessage({ text: '加载动态失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteMoment = async (id: string) => {
    if (!confirm('确定要删除这条动态吗？此操作不可恢复！')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/moments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        loadMoments();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || '删除失败', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: '删除失败', type: 'error' });
    }
  };

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">动态管理</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">管理和编辑所有个人动态</p>
          </div>
          <Link 
            href="/admin/moments/new"
            className="flex items-center space-x-2 bg-[#06b6d4] text-white px-4 py-2 rounded-lg hover:bg-[#06b6d4]/80 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            <span>发新动态</span>
          </Link>
        </div>

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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
          {moments.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="mx-auto mb-4 text-gray-300 dark:text-gray-600 animate-pulse" size={48} />
              <p className="text-gray-500 dark:text-gray-400">
                还没有动态，点击上方按钮发布第一条！
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {moments.map((moment, index) => (
                <div 
                  key={moment.id} 
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 transform hover:translate-x-1"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-3">
                        {moment.pinned && <Pin size={18} className="text-orange-500" />}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {(() => {
                            try {
                              const date = new Date(moment.time);
                              if (!isNaN(date.getTime())) {
                                return date.toLocaleDateString('zh-CN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                              }
                            } catch (e) {
                              console.error('时间格式错误:', e);
                            }
                            return moment.time;
                          })()}
                        </span>
                      </div>
                      {moment.tags && moment.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {moment.tags.map((tag: string) => (
                            <span 
                              key={tag} 
                              className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {moment.images && moment.images.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            📷 {moment.images.length} 张图片
                          </span>
                        </div>
                      )}
                      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                        {moment.content}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        href={`/admin/moments/${moment.id}`}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors transform hover:scale-110"
                        title="编辑"
                      >
                        <Edit size={20} />
                      </Link>
                      <button
                        onClick={() => deleteMoment(moment.id)}
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
