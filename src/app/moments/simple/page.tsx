/**
 * 说说功能 - 纯客户端实现
 * 适用于GitHub Pages静态部署
 * 完全基于localStorage，无需API支持
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, HeartIcon as HeartOutline, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

import { Moment } from '@/types/moments';
import { MOMENTS_DEFAULTS, MOMENT_VALIDATION } from '@/setting/momentsSetting';
import { getMoodConfig, MOOD_CONFIGS } from '@/setting/momentsSetting';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import CreateMomentModal from '@/components/moments/CreateMomentModal';

// 纯客户端说说服务
class ClientSideMomentsService {
  private static instance: ClientSideMomentsService;
  private userId = 'default-user';
  private username = '洛天依';

  static getInstance(): ClientSideMomentsService {
    if (!ClientSideMomentsService.instance) {
      ClientSideMomentsService.instance = new ClientSideMomentsService();
    }
    return ClientSideMomentsService.instance;
  }

  // 生成唯一ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取说说列表
  getMoments(): Moment[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('moments-data');
      if (!stored) return [];
      
      const moments = JSON.parse(stored) as Moment[];
      return moments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('获取说说失败:', error);
      return [];
    }
  }

  // 保存说说
  saveMoments(moments: Moment[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('moments-data', JSON.stringify(moments));
    } catch (error) {
      console.error('保存说说失败:', error);
    }
  }

  // 创建说说
  createMoment(content: string, mood?: string, images?: string[]): Moment {
    const now = new Date().toISOString();
    
    const newMoment: Moment = {
      id: this.generateId(),
      content: content.trim(),
      images: images || [],
      mood: mood as any,
      author: this.username,
      createdAt: now,
      updatedAt: now,
      likes: 0,
      comments: [],
      isOwner: true,
      isLiked: false
    };

    const moments = this.getMoments();
    moments.unshift(newMoment);
    this.saveMoments(moments);

    return newMoment;
  }

  // 点赞/取消点赞
  toggleLike(momentId: string): boolean {
    const moments = this.getMoments();
    const moment = moments.find(m => m.id === momentId);
    
    if (!moment) return false;

    const likedMoments = this.getLikedMoments();
    const isCurrentlyLiked = likedMoments.includes(momentId);
    
    if (isCurrentlyLiked) {
      // 取消点赞
      this.setLikedMoments(likedMoments.filter(id => id !== momentId));
      moment.likes = Math.max(0, moment.likes - 1);
    } else {
      // 点赞
      this.setLikedMoments([...likedMoments, momentId]);
      moment.likes += 1;
    }

    this.saveMoments(moments);
    return !isCurrentlyLiked;
  }

  // 获取已点赞的说说
  getLikedMoments(): string[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('liked-moments');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // 设置已点赞的说说
  setLikedMoments(momentIds: string[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('liked-moments', JSON.stringify(momentIds));
    } catch (error) {
      console.error('保存点赞状态失败:', error);
    }
  }

  // 删除说说
  deleteMoment(momentId: string): boolean {
    const moments = this.getMoments();
    const filtered = moments.filter(m => m.id !== momentId);
    
    if (filtered.length === moments.length) return false;
    
    this.saveMoments(filtered);
    return true;
  }

  // 添加评论
  addComment(momentId: string, content: string): boolean {
    const moments = this.getMoments();
    const moment = moments.find(m => m.id === momentId);
    
    if (!moment) return false;

    const newComment = {
      id: this.generateId(),
      momentId,
      content: content.trim(),
      author: this.username,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false
    };

    moment.comments.push(newComment);
    this.saveMoments(moments);
    return true;
  }
}

// 说说卡片组件
function MomentCard({ 
  moment, 
  onLike, 
  onDelete 
}: { 
  moment: Moment;
  onLike: (momentId: string) => void;
  onDelete: (momentId: string) => void;
}) {
  const moodConfig = moment.mood ? getMoodConfig(moment.mood) : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4"
    >
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {moment.author.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {moment.author}
              </span>
              {moodConfig && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${moodConfig.color}`}>
                  <span className="mr-1">{moodConfig.emoji}</span>
                  {moodConfig.label}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(moment.createdAt), { 
                addSuffix: true, 
                locale: zhCN 
              })}
              {moment.updatedAt && moment.updatedAt !== moment.createdAt && (
                <span className="ml-1">(已编辑)</span>
              )}
            </div>
          </div>
        </div>
        
        {moment.isOwner && (
          <button
            onClick={() => onDelete(moment.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="删除说说"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      
      {/* 内容 */}
      <div className="mb-4">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
          {moment.content}
        </p>
      </div>
      
      {/* 图片 */}
      {moment.images && moment.images.length > 0 && (
        <div className="mb-4">
          <div className={`grid gap-2 ${
            moment.images.length === 1 ? 'grid-cols-1' : 
            moment.images.length === 2 ? 'grid-cols-2' : 
            'grid-cols-2 sm:grid-cols-3'
          }`}>
            {moment.images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={image}
                  alt={`图片 ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                  onClick={() => window.open(image, '_blank')}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 互动按钮 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <button
            onClick={() => onLike(moment.id)}
            className={`flex items-center space-x-1 sm:space-x-2 transition-colors ${
              moment.isLiked 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-500 hover:text-red-500'
            }`}
          >
            {moment.isLiked ? (
              <HeartSolid className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <HeartOutline className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="text-xs sm:text-sm font-medium">{moment.likes}</span>
          </button>
          
          <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500">
            <ChatBubbleLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">{moment.comments.length}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 空状态组件
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        还没有说说
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        分享你的生活点滴，记录每一份心情
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        发布第一条说说
      </button>
    </div>
  );
}

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const momentsService = ClientSideMomentsService.getInstance();

  // 加载说说数据
  const loadMoments = useCallback(() => {
    setLoading(true);
    try {
      const data = momentsService.getMoments();
      setMoments(data);
    } catch (error) {
      console.error('加载说说失败:', error);
    } finally {
      setLoading(false);
    }
  }, [momentsService]);

  // 处理点赞
  const handleLike = useCallback((momentId: string) => {
    try {
      const isLiked = momentsService.toggleLike(momentId);
      
      // 更新本地状态
      setMoments(prev => prev.map(moment => 
        moment.id === momentId 
          ? { 
              ...moment, 
              likes: isLiked ? moment.likes + 1 : moment.likes - 1,
              isLiked: isLiked 
            }
          : moment
      ));
    } catch (error) {
      console.error('点赞失败:', error);
    }
  }, [momentsService]);

  // 处理删除
  const handleDelete = useCallback((momentId: string) => {
    if (!confirm('确定要删除这条说说吗？')) return;
    
    try {
      const success = momentsService.deleteMoment(momentId);
      if (success) {
        setMoments(prev => prev.filter(moment => moment.id !== momentId));
      }
    } catch (error) {
      console.error('删除说说失败:', error);
    }
  }, [momentsService]);

  // 处理创建提交
  const handleCreateSubmit = useCallback((data: { content: string; images?: File[]; mood?: string }) => {
    try {
      // 处理图片上传（转换为base64）
      if (data.images && data.images.length > 0) {
        const processImages = async () => {
          const imageUrls: string[] = [];
          
          for (const file of data.images!) {
            const base64 = await fileToBase64(file);
            imageUrls.push(base64);
          }
          
          const newMoment = momentsService.createMoment(data.content, data.mood, imageUrls);
          setMoments(prev => [newMoment, ...prev]);
          setShowCreateModal(false);
        };
        
        processImages();
      } else {
        const newMoment = momentsService.createMoment(data.content, data.mood);
        setMoments(prev => [newMoment, ...prev]);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('发布说说失败:', error);
      alert('发布说说失败，请重试');
    }
  }, [momentsService]);

  // 文件转base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 初始化加载
  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                {MOMENTS_DEFAULTS.pageTitle}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {MOMENTS_DEFAULTS.pageDescription}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              发布说说
            </button>
          </div>
        </div>
      </div>
      
      {/* 主要内容 */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {moments.length === 0 && !loading ? (
          <EmptyState onCreate={() => setShowCreateModal(true)} />
        ) : (
          <>
            {/* 统计信息 */}
            {moments.length > 0 && (
              <div className="mb-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  共 {moments.length} 条说说
                </p>
              </div>
            )}
            
            {/* 说说列表 */}
            <AnimatePresence>
              {moments.map((moment) => (
                <MomentCard
                  key={moment.id}
                  moment={moment}
                  onLike={handleLike}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
            
            {/* 加载状态 */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-flex items-center px-4 py-2">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  加载中...
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* 发布弹窗 */}
      <CreateMomentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        loading={false}
      />
    </div>
  );
}