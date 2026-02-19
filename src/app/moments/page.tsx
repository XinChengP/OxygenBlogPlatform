/**
 * 说说（动态）列表页面 - 极简重构版本
 * 仅保留内容展示功能，移除所有互动和管理功能
 * 优化性能和代码结构，确保兼容性
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Moment, MomentsResponse } from '@/types/moments';
import { momentsService } from '@/services/momentsService';
import { MOMENTS_PAGINATION } from '@/setting/momentsSetting';
import { getMoodConfig } from '@/setting/momentsSetting';
import { MoodType } from '@/types/moments';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // 加载说说数据 - 仅保留基础数据获取功能
  const loadMoments = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response: MomentsResponse = await momentsService.getMoments(pageNum, MOMENTS_PAGINATION.pageSize);
      
      if (isLoadMore) {
        setMoments(prev => [...prev, ...response.data]);
      } else {
        setMoments(response.data);
      }
      
      setHasMore(response.hasNext);
      setPage(pageNum);
    } catch (error) {
      console.error('加载说说失败:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // 初始加载
  useEffect(() => {
    loadMoments(1);
  }, [loadMoments]);

  // 设置无限滚动
  useEffect(() => {
    if (!loadingRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoments(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadingRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, page, loadMoments]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-900/50 dark:via-blue-900/30 dark:to-purple-900/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-4">
            我的动态
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            记录生活中的点点滴滴
          </p>
        </div>

        {/* 说说列表 */}
        <div className="space-y-6">
          <AnimatePresence>
            {moments.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* 加载更多 */}
        {hasMore && (
          <div ref={loadingRef} className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && moments.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              暂无动态
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              这里还没有发布任何内容
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 单个说说卡片组件 - 仅保留内容展示
function MomentCard({ moment }: { moment: Moment }) {
  // 安全获取心情配置，提供默认值
  const moodType = (moment.mood || MoodType.HAPPY) as MoodType;
  const moodConfig = getMoodConfig(moodType);
  const timeAgo = formatDistanceToNow(new Date(moment.createdAt), {
    addSuffix: true,
    locale: zhCN
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300"
    >
      {/* 头部信息 - 简化版本 */}
      <div className="flex items-center mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${moodConfig.bgColor} mr-3`}>
          <span className="text-lg">{moodConfig.emoji}</span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900 dark:text-white">歆橙</span>
            <span className={`text-xs px-2 py-1 rounded-full ${moodConfig.color}`}>
              {moodConfig.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{timeAgo}</p>
        </div>
      </div>

      {/* 内容 */}
      <div className="mb-4">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
          {moment.content}
        </p>
      </div>

      {/* 图片网格 - 仅展示，无交互 */}
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
                  className="object-cover w-full h-full"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}