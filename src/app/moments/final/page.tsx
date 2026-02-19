/**
 * 说说功能 - GitHub Pages部署就绪版本
 * 完全基于客户端实现，无需API支持
 * 支持说说发布、展示、点赞、评论等核心功能
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  HeartIcon as HeartOutline,
  ChatBubbleLeftIcon,
  PhotoIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

import { Moment, MoodType } from '@/types/moments';
import { MOMENTS_DEFAULTS, MOMENT_VALIDATION } from '@/setting/momentsSetting';
import { getMoodConfig, getAllMoodConfigs } from '@/setting/momentsSetting';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 纯客户端说说服务
class MomentsService {
  private static instance: MomentsService;
  private readonly storageKey = 'moments-data-v2';
  private readonly likedKey = 'moments-liked-v2';
  private readonly userKey = 'moments-user-v2';

  static getInstance(): MomentsService {
    if (!MomentsService.instance) {
      MomentsService.instance = new MomentsService();
    }
    return MomentsService.instance;
  }

  // 生成唯一ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取或创建用户
  getUser(): { id: string; name: string } {
    if (typeof window === 'undefined') return { id: 'default', name: '访客' };
    
    try {
      const stored = localStorage.getItem(this.userKey);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // 创建新用户
      const user = {
        id: this.generateId(),
        name: '洛天依'
      };
      localStorage.setItem(this.userKey, JSON.stringify(user));
      return user;
    } catch {
      return { id: 'default', name: '访客' };
    }
  }

  // 获取说说列表
  getMoments(): Moment[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const moments = JSON.parse(stored) as Moment[];
      const user = this.getUser();
      const liked = this.getLikedMoments();
      
      // 添加用户相关状态
      return moments.map(moment => ({
        ...moment,
        isLiked: liked.includes(moment.id),
        isOwner: moment.author === user.name
      }));
    } catch (error) {
      console.error('获取说说失败:', error);
      return [];
    }
  }

  // 保存说说
  saveMoments(moments: Moment[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(moments));
    } catch (error) {
      console.error('保存说说失败:', error);
    }
  }

  // 创建说说
  createMoment(content: string, mood?: MoodType, images?: string[]): Moment {
    const user = this.getUser();
    const now = new Date().toISOString();
    
    const newMoment: Moment = {
      id: this.generateId(),
      content: content.trim(),
      images,
      mood,
      author: user.name,
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

  // 删除说说
  deleteMoment(momentId: string): boolean {
    const user = this.getUser();
    const moments = this.getMoments();
    const moment = moments.find(m => m.id === momentId);
    
    if (!moment || moment.author !== user.name) return false;
    
    const filtered = moments.filter(m => m.id !== momentId);
    this.saveMoments(filtered);
    
    // 清理相关的点赞状态
    const liked = this.getLikedMoments();
    const updatedLiked = liked.filter(id => id !== momentId);
    this.setLikedMoments(updatedLiked);
    
    return true;
  }

  // 点赞/取消点赞
  toggleLike(momentId: string): boolean {
    const moments = this.getMoments();
    const moment = moments.find(m => m.id === momentId);
    
    if (!moment) return false;
    
    const liked = this.getLikedMoments();
    const isCurrentlyLiked = liked.includes(momentId);
    
    if (isCurrentlyLiked) {
      // 取消点赞
      this.setLikedMoments(liked.filter(id => id !== momentId));
      moment.likes = Math.max(0, moment.likes - 1);
    } else {
      // 点赞
      this.setLikedMoments([...liked, momentId]);
      moment.likes += 1;
    }
    
    // 更新说说数据
    const updatedMoments = moments.map(m => 
      m.id === momentId ? { ...m, likes: moment.likes, isLiked: !isCurrentlyLiked } : m
    );
    
    this.saveMoments(updatedMoments);
    return !isCurrentlyLiked;
  }

  // 获取已点赞的说说
  getLikedMoments(): string[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.likedKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // 设置已点赞的说说
  setLikedMoments(momentIds: string[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.likedKey, JSON.stringify(momentIds));
    } catch (error) {
      console.error('保存点赞状态失败:', error);
    }
  }

  // 添加评论
  addComment(momentId: string, content: string): boolean {
    const moments = this.getMoments();
    const moment = moments.find(m => m.id === momentId);
    
    if (!moment) return false;
    
    const user = this.getUser();
    const newComment = {
      id: this.generateId(),
      momentId,
      content: content.trim(),
      author: user.name,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false
    };
    
    moment.comments.push(newComment);
    
    // 更新说说数据
    const updatedMoments = moments.map(m => 
      m.id === momentId ? { ...m, comments: [...m.comments] } : m
    );
    
    this.saveMoments(updatedMoments);
    return true;
  }

  // 删除评论
  deleteComment(momentId: string, commentId: string): boolean {
    const moments = this.getMoments();
    const moment = moments.find(m => m.id === momentId);
    
    if (!moment) return false;
    
    const user = this.getUser();
    const comment = moment.comments.find(c => c.id === commentId);
    
    if (!comment || comment.author !== user.name) return false;
    
    moment.comments = moment.comments.filter(c => c.id !== commentId);
    
    // 更新说说数据
    const updatedMoments = moments.map(m => 
      m.id === momentId ? { ...m, comments: [...m.comments] } : m
    );
    
    this.saveMoments(updatedMoments);
    return true;
  }
}

// 发布说说弹窗组件
function CreateMomentModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, mood?: MoodType, images?: string[]) => void;
}) {
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | undefined>();
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理文字输入
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MOMENT_VALIDATION.maxContentLength) {
      setContent(value);
    }
  };

  // 处理图片选择
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 验证图片
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB限制
        alert('单张图片大小不能超过5MB');
        continue;
      }

      // 检查总数限制
      if (selectedFiles.length + newFiles.length >= MOMENT_VALIDATION.maxImages) {
        alert(`最多只能上传${MOMENT_VALIDATION.maxImages}张图片`);
        break;
      }

      newFiles.push(file);
      
      // 生成预览
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPreviews.push(event.target.result as string);
          if (newPreviews.length === newFiles.length) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 删除图片
  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 选择心情
  const selectMood = (mood: MoodType) => {
    setSelectedMood(selectedMood === mood ? undefined : mood);
    setShowMoodSelector(false);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('请输入说说内容');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 处理图片上传（转换为base64）
      let imageUrls: string[] | undefined;
      
      if (selectedFiles.length > 0) {
        imageUrls = imagePreviews; // 已经是base64格式
      }
      
      onSubmit(content.trim(), selectedMood, imageUrls);
      
      // 重置表单
      setContent('');
      setSelectedMood(undefined);
      setImagePreviews([]);
      setSelectedFiles([]);
      onClose();
    } catch (error) {
      console.error('发布说说失败:', error);
      alert('发布说说失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 关闭弹窗
  const handleClose = () => {
    if (isSubmitting) return;
    setContent('');
    setSelectedMood(undefined);
    setImagePreviews([]);
    setSelectedFiles([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                发布说说
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                disabled={isSubmitting}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* 心情选择 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    心情状态
                  </span>
                  {selectedMood && (
                    <button
                      onClick={() => setSelectedMood(undefined)}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      清除
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowMoodSelector(!showMoodSelector)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg border transition-all ${
                    selectedMood 
                      ? getMoodConfig(selectedMood).color 
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {selectedMood ? (
                    <>
                      <span className="mr-2">{getMoodConfig(selectedMood).emoji}</span>
                      {getMoodConfig(selectedMood).label}
                    </>
                  ) : (
                    <>
                      <FaceSmileIcon className="w-5 h-5 mr-2" />
                      选择心情
                    </>
                  )}
                </button>
                
                {/* 心情选择器 */}
                <AnimatePresence>
                  {showMoodSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="grid grid-cols-4 gap-3">
                        {getAllMoodConfigs().map((mood) => (
                          <button
                            key={mood.type}
                            onClick={() => selectMood(mood.type)}
                            className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                              selectedMood === mood.type
                                ? `${mood.color} border-opacity-100`
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <span className="text-2xl mb-1">{mood.emoji}</span>
                            <span className="text-xs font-medium">{mood.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* 内容输入 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    说说内容
                  </label>
                  <span className={`text-xs ${
                    content.length > MOMENT_VALIDATION.maxContentLength * 0.9 
                      ? 'text-red-500' 
                      : 'text-gray-500'
                  }`}>
                    {content.length}/{MOMENT_VALIDATION.maxContentLength}
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="分享你的生活点滴..."
                  className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
              
              {/* 图片上传 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    图片 ({imagePreviews.length}/{MOMENT_VALIDATION.maxImages})
                  </span>
                  <label className="text-sm text-blue-500 hover:text-blue-600 cursor-pointer flex items-center">
                    <PhotoIcon className="w-4 h-4 mr-1" />
                    添加图片
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={imagePreviews.length >= MOMENT_VALIDATION.maxImages || isSubmitting}
                    />
                  </label>
                </div>
                
                {/* 图片预览 */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={preview}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                          disabled={isSubmitting}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* 底部按钮 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="inline-flex items-center px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    发布中...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                    发布
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 评论组件
function CommentSection({ 
  moment, 
  onAddComment, 
  onDeleteComment 
}: { 
  moment: Moment;
  onAddComment: (momentId: string, content: string) => boolean;
  onDeleteComment: (momentId: string, commentId: string) => void;
}) {
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = onAddComment(moment.id, commentContent.trim());
      if (success) {
        setCommentContent('');
      }
    } catch (error) {
      console.error('添加评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      {/* 评论输入 */}
      <div className="mb-4">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="写下你的评论..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              rows={2}
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {commentContent.length}/200
              </span>
              <button
                onClick={handleSubmitComment}
                disabled={!commentContent.trim() || isSubmitting}
                className="inline-flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                )}
                发布
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-3">
        {moment.comments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              还没有评论，快来发表第一条评论吧！
            </p>
          </div>
        ) : (
          moment.comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              {/* 头像 */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {comment.author.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* 评论内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.author}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { 
                      addSuffix: true, 
                      locale: zhCN 
                    })}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {comment.content}
                </p>
                
                {/* 评论操作 */}
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ❤️ {comment.likes}
                  </span>
                  
                  {comment.author === moment.author && (
                    <button
                      onClick={() => onDeleteComment(moment.id, comment.id)}
                      className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="w-3 h-3" />
                      <span>删除</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// 说说卡片组件
function MomentCard({ 
  moment, 
  onLike, 
  onDelete, 
  onAddComment, 
  onDeleteComment 
}: { 
  moment: Moment;
  onLike: (momentId: string) => void;
  onDelete: (momentId: string) => void;
  onAddComment: (momentId: string, content: string) => boolean;
  onDeleteComment: (momentId: string, commentId: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
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
            onClick={() => {
              if (confirm('确定要删除这条说说吗？')) {
                onDelete(moment.id);
              }
            }}
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
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1 sm:space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
          >
            <ChatBubbleLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">{moment.comments.length}</span>
          </button>
        </div>
      </div>

      {/* 评论区域 */}
      {showComments && (
        <CommentSection 
          moment={moment}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      )}
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
  
  const momentsService = MomentsService.getInstance();

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
  const handleCreateSubmit = useCallback((content: string, mood?: MoodType, images?: string[]) => {
    try {
      const newMoment = momentsService.createMoment(content, mood, images);
      setMoments(prev => [newMoment, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('发布说说失败:', error);
      alert('发布说说失败，请重试');
    }
  }, [momentsService]);

  // 添加评论
  const handleAddComment = useCallback((momentId: string, content: string) => {
    try {
      const success = momentsService.addComment(momentId, content);
      if (success) {
        // 重新加载数据以更新评论
        const updatedMoments = momentsService.getMoments();
        setMoments(updatedMoments);
      }
      return success;
    } catch (error) {
      console.error('添加评论失败:', error);
      return false;
    }
  }, [momentsService]);

  // 删除评论
  const handleDeleteComment = useCallback((momentId: string, commentId: string) => {
    try {
      const success = momentsService.deleteComment(momentId, commentId);
      if (success) {
        // 重新加载数据以更新评论
        const updatedMoments = momentsService.getMoments();
        setMoments(updatedMoments);
      }
      return success;
    } catch (error) {
      console.error('删除评论失败:', error);
      return false;
    }
  }, [momentsService]);

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
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
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
      />
    </div>
  );
}