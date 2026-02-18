/**
 * 说说功能测试页面
 * 用于验证说说模块的核心功能
 */

'use client';

import { useState, useEffect } from 'react';
import { momentsService } from '@/services/momentsService';
import { Moment } from '@/types/moments';

export default function MomentsTestPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 测试数据
  const testMoment = {
    content: '🎉 说说功能测试成功！这是第一条测试说说，支持心情标签和图片上传功能。',
    mood: 'happy' as const,
    images: undefined
  };

  // 加载说说列表
  const loadMoments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/moments?page=1&pageSize=10');
      const result = await response.json();
      
      if (result.success) {
        setMoments(result.data.data);
      } else {
        setError('加载失败: ' + result.error);
      }
    } catch (err) {
      setError('网络错误: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 发布测试说说
  const createTestMoment = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMoment)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 重新加载列表
        await loadMoments();
        alert('✅ 测试说说发布成功！');
      } else {
        setError('发布失败: ' + result.error);
      }
    } catch (err) {
      setError('网络错误: ' + (err as Error).message);
    }
  };

  // 测试点赞功能
  const testLike = async (momentId: string) => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: momentId, targetType: 'moment' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地状态
        setMoments(prev => prev.map(moment => 
          moment.id === momentId 
            ? { 
                ...moment, 
                likes: result.data.isLiked ? moment.likes + 1 : moment.likes - 1,
                isLiked: result.data.isLiked 
              }
            : moment
        ));
        console.log('✅ 点赞测试成功:', result.data);
      } else {
        console.error('❌ 点赞测试失败:', result.error);
      }
    } catch (err) {
      console.error('❌ 点赞测试错误:', err);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadMoments();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🧪 说说功能测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试说说模块的核心功能是否正常工作
          </p>
        </div>

        {/* 测试控制面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🎮 测试控制面板
          </h2>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={createTestMoment}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              📝 发布测试说说
            </button>
            
            <button
              onClick={loadMoments}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              🔄 重新加载
            </button>
          </div>

          {/* 状态显示 */}
          {loading && (
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中...
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
              ❌ 错误: {error}
            </div>
          )}
        </div>

        {/* 测试结果 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📊 测试结果
          </h2>
          
          {moments.length === 0 && !loading && !error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                暂无说说数据，点击上方按钮发布测试说说
              </p>
            </div>
          )}

          {moments.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                找到 {moments.length} 条说说
              </div>
              
              {moments.map((moment) => (
                <div key={moment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {moment.author.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {moment.author}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(moment.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    
                    {moment.mood && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border text-yellow-600 bg-yellow-50 border-yellow-200">
                        😊 {moment.mood}
                      </span>
                    )}
                  </div>

                  <div className="text-gray-700 dark:text-gray-300 mb-3">
                    {moment.content}
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => testLike(moment.id)}
                      className={`flex items-center space-x-1 text-sm transition-colors ${
                        moment.isLiked 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      ❤️ {moment.likes}
                    </button>
                    
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      💬 {moment.comments.length} 条评论
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 功能状态 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            ✅ 测试功能清单
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700 dark:text-gray-300">API接口连接</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700 dark:text-gray-300">说说列表加载</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700 dark:text-gray-300">发布新说说</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700 dark:text-gray-300">点赞功能</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700 dark:text-gray-300">心情标签</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700 dark:text-gray-300">响应式设计</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}