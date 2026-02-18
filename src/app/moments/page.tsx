/**
 * 说说（动态）列表页面
 * 展示所有用户发布的动态，支持分页和懒加载
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  HeartIcon as HeartOutline,
  ChatBubbleLeftIcon,
  ShareIcon 
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

import { Moment, MomentsResponse, CreateMomentRequest } from '@/types/moments';
import { momentsService } from '@/services/momentsService';
import { 
  MOMENTS_PAGINATION, 
  MOMENTS_DEFAULTS,
  MOOD_CONFIGS 
} from '@/setting/momentsSetting';
import { getMoodConfig } from '@/setting/momentsSetting';
import OptimizedImage from '@/components/core/OptimizedImage';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import CreateMomentModal from '@/components/moments/CreateMomentModal';
import CommentList from '@/components/moments/CommentList';
import ImageViewer from '@/components/moments/ImageViewer';

// 说说卡片组件
function MomentCard({ 
  moment, 
  onLike, 
  onComment,
  onDelete,
  onImageClick,
  showComments
}: { 
  moment: Moment;
  onLike: (momentId: string) => void;
  onComment: (momentId: string) => void;
  onDelete: (momentId: string) => void;
  onImageClick: (momentId: string, imageIndex: number) => void;
  showComments: boolean;
}) {
  const moodConfig = moment.mood ? getMoodConfig(moment.mood) : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4"
    >
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-xs sm:text-sm">
              {moment.author.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                {moment.author}
              </span>
              {moodConfig && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${moodConfig.color}`}>
                  <span className="mr-1">{moodConfig.emoji}</span>
                  {moodConfig.label}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
            className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
            title="删除说说"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      
      {/* 内容 */}
      <div className="mb-4">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
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
                <OptimizedImage
                  src={image}
                  alt={`图片 ${index + 1}`}
                  fill
                  className="object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                  onClick={() => onImageClick(moment.id, index)}
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
          
          <button
            onClick={() => onComment(moment.id)}
            className="flex items-center space-x-1 sm:space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
          >
            <ChatBubbleLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">{moment.comments.length}</span>
          </button>
          
          <button className="flex items-center space-x-1 sm:space-x-2 text-gray-500 hover:text-green-500 transition-colors">
            <ShareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">分享</span>
          </button>
        </div>
      </div>
      
      {/* 评论区域 */}
      {showComments && (
        <div className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <CommentList
            comments={moment.comments}
            momentId={moment.id}
            onAddComment={(content) => handleAddComment(moment.id, content)}
            onLikeComment={(commentId) => handleLikeComment(moment.id, commentId)}
            onDeleteComment={(commentId) => handleDeleteComment(moment.id, commentId)}
          />
        </div>
      )}
    </motion.div>
  );
}

// 加载更多组件
function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="text-center py-8">
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </>
        ) : (
          '加载更多'
        )}
      </button>
    </div>
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
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [total, setTotal] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // 加载说说数据
  const loadMoments = useCallback(async (pageNum: number, append: boolean = false) => {
    if (loading || (!append && !hasNext)) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/moments?page=${pageNum}&pageSize=${MOMENTS_PAGINATION.pageSize}`);
      const result = await response.json();
      
      if (result.success) {
        const { data, total: totalCount, hasNext: next } = result.data;
        
        if (append) {
          setMoments(prev => [...prev, ...data]);
        } else {
          setMoments(data);
        }
        
        setTotal(totalCount);
        setHasNext(next);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('加载说说失败:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasNext]);
  
  // 点赞处理
  const handleLike = useCallback(async (momentId: string) => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: momentId, targetType: 'moment' })
      });
      
      const result = await response.json();
      if (result.success) {
        setMoments(prev => prev.map(moment => 
          moment.id === momentId 
            ? { 
                ...moment, 
                likes: moment.isLiked ? moment.likes - 1 : moment.likes + 1,
                isLiked: !moment.isLiked 
              }
            : moment
        ));
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  }, []);
  
  // 评论处理
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  
  const handleComment = useCallback((momentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(momentId)) {
        newSet.delete(momentId);
      } else {
        newSet.add(momentId);
      }
      return newSet;
    });
  }, []);
  
  // 添加评论
  const handleAddComment = useCallback(async (momentId: string, content: string) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ momentId, content })
      });
      
      const result = await response.json();
      if (result.success) {
        setMoments(prev => prev.map(moment => 
          moment.id === momentId 
            ? { ...moment, comments: [...moment.comments, result.data] }
            : moment
        ));
      }
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  }, []);
  
  // 点赞评论
  const handleLikeComment = useCallback(async (momentId: string, commentId: string) => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: commentId, targetType: 'comment' })
      });
      
      const result = await response.json();
      if (result.success) {
        setMoments(prev => prev.map(moment => 
          moment.id === momentId 
            ? {
                ...moment,
                comments: moment.comments.map(comment =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        likes: result.data.isLiked ? comment.likes + 1 : comment.likes - 1,
                        isLiked: result.data.isLiked
                      }
                    : comment
                )
              }
            : moment
        ));
      }
    } catch (error) {
      console.error('点赞评论失败:', error);
      throw error;
    }
  }, []);
  
  // 删除评论
  const handleDeleteComment = useCallback(async (momentId: string, commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        setMoments(prev => prev.map(moment => 
          moment.id === momentId 
            ? { ...moment, comments: moment.comments.filter(c => c.id !== commentId) }
            : moment
        ));
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      throw error;
    }
  }, []);
  
  // 删除处理
  const handleDelete = useCallback(async (momentId: string) => {
    if (!confirm('确定要删除这条说说吗？')) return;
    
    try {
      const response = await fetch(`/api/moments/${momentId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        setMoments(prev => prev.filter(moment => moment.id !== momentId));
        setTotal(prev => prev - 1);
      }
    } catch (error) {
      console.error('删除说说失败:', error);
    }
  }, []);
  
  // 发布新说说
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // 图片查看器状态
  const [imageViewer, setImageViewer] = useState<{
    isOpen: boolean;
    images: string[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0
  });
  
  const handleCreateMoment = useCallback(() => {
    setShowCreateModal(true);
  }, []);
  
  const handleCreateSubmit = useCallback(async (data: CreateMomentRequest) => {
    try {
      const response = await fetch('/api/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.success) {
        // 刷新列表
        setMoments(prev => [result.data, ...prev]);
        setTotal(prev => prev + 1);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('发布说说失败:', error);
      alert('发布说说失败，请重试');
    }
  }, []);
  
  // 图片查看器处理
  const handleImageClick = useCallback((momentId: string, imageIndex: number) => {
    const moment = moments.find(m => m.id === momentId);
    if (moment && moment.images) {
      setImageViewer({
        isOpen: true,
        images: moment.images,
        currentIndex: imageIndex
      });
    }
  }, [moments]);
  
  const handleCloseImageViewer = useCallback(() => {
    setImageViewer(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  // 初始化加载
  useEffect(() => {
    loadMoments(1);
  }, [loadMoments]);
  
  // 设置无限滚动
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loading) {
          loadMoments(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current.observe(loadMoreRef.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoments, page, hasNext, loading]);
  
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
              onClick={handleCreateMoment}
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
          <EmptyState onCreate={handleCreateMoment} />
        ) : (
          <>
            {/* 统计信息 */}
            {total > 0 && (
              <div className="mb-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  共 {total} 条说说
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
                  onComment={handleComment}
                  onDelete={handleDelete}
                  onImageClick={handleImageClick}
                  showComments={expandedComments.has(moment.id)}
                />
              ))}
            </AnimatePresence>
            
            {/* 加载更多 */}
            {hasNext && (
              <div ref={loadMoreRef}>
                <LoadMoreButton onClick={() => loadMoments(page + 1, true)} loading={loading} />
              </div>
            )}
            
            {/* 加载状态 */}
            {loading && moments.length === 0 && (
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
        loading={loading}
      />
      
      {/* 图片查看器 */}
      <ImageViewer
        images={imageViewer.images}
        currentIndex={imageViewer.currentIndex}
        isOpen={imageViewer.isOpen}
        onClose={handleCloseImageViewer}
      />
    </div>
  );
}