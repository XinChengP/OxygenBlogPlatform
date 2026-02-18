/**
 * 评论组件
 * 显示评论列表和添加评论功能
 */

'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleLeftIcon,
  HeartIcon as HeartOutline,
  TrashIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

import { Comment } from '@/types/moments';
import { COMMENT_VALIDATION } from '@/setting/momentsSetting';

interface CommentListProps {
  comments: Comment[];
  momentId: string;
  onAddComment: (content: string) => Promise<void>;
  onLikeComment: (commentId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  loading?: boolean;
}

// 单条评论组件
function CommentItem({ 
  comment, 
  onLike, 
  onDelete 
}: { 
  comment: Comment;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
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
            {new Date(comment.createdAt).toLocaleString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          {comment.content}
        </p>
        
        {/* 互动按钮 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onLike(comment.id)}
            className={`flex items-center space-x-1 text-xs transition-colors ${
              comment.isLiked 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-500 hover:text-red-500'
            }`}
          >
            {comment.isLiked ? (
              <HeartSolid className="w-4 h-4" />
            ) : (
              <HeartOutline className="w-4 h-4" />
            )}
            <span>{comment.likes}</span>
          </button>
          
          {comment.isOwner && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              <span>删除</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// 评论输入组件
function CommentInput({ 
  onSubmit, 
  loading 
}: { 
  onSubmit: (content: string) => void;
  loading: boolean;
}) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;
    
    onSubmit(trimmed);
    setContent('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  return (
    <div className="flex space-x-3">
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="写下你的评论..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          rows={2}
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${
            content.length > COMMENT_VALIDATION.maxContentLength * 0.9 
              ? 'text-red-500' 
              : 'text-gray-500'
          }`}>
            {content.length}/{COMMENT_VALIDATION.maxContentLength}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="inline-flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
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
  );
}

export default function CommentList({ 
  comments, 
  momentId, 
  onAddComment, 
  onLikeComment, 
  onDeleteComment,
  loading = false 
}: CommentListProps) {
  const [submitting, setSubmitting] = useState(false);
  
  const handleAddComment = async (content: string) => {
    setSubmitting(true);
    try {
      await onAddComment(content);
    } catch (error) {
      console.error('添加评论失败:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleLikeComment = async (commentId: string) => {
    try {
      await onLikeComment(commentId);
    } catch (error) {
      console.error('点赞评论失败:', error);
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
      await onDeleteComment(commentId);
    } catch (error) {
      console.error('删除评论失败:', error);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 评论标题 */}
      <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 dark:border-gray-700">
        <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          评论 ({comments.length})
        </h3>
      </div>
      
      {/* 评论输入 */}
      <CommentInput onSubmit={handleAddComment} loading={submitting} />
      
      {/* 评论列表 */}
      <AnimatePresence>
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <ChatBubbleLeftIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              还没有评论，快来发表第一条评论吧！
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onLike={handleLikeComment}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}