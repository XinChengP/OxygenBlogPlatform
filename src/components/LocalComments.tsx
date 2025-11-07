'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  replies: Comment[];
}

interface LocalCommentsProps {
  id: string; // 文章的唯一标识符，通常使用文章的 slug
}

/**
 * 本地评论组件
 * 
 * 使用 localStorage 存储评论数据
 * - 自动适配深色/浅色主题
 * - 根据文章 ID 区分不同文章的评论
 * - 响应式布局
 * 
 * @param id - 文章的唯一标识符
 * @returns JSX 元素
 */
export default function LocalComments({ id }: LocalCommentsProps) {
  const { theme, systemTheme } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 加载评论
  useEffect(() => {
    const savedComments = localStorage.getItem(`comments-${id}`);
    if (savedComments) {
      try {
        const parsedComments = JSON.parse(savedComments);
        // 转换时间戳字符串回 Date 对象
        const commentsWithDates = parsedComments.map((comment: any) => ({
          ...comment,
          timestamp: new Date(comment.timestamp),
          replies: comment.replies.map((reply: any) => ({
            ...reply,
            timestamp: new Date(reply.timestamp)
          }))
        }));
        setComments(commentsWithDates);
      } catch (error) {
        console.error('加载评论失败:', error);
      }
    }

    // 加载用户名
    const savedName = localStorage.getItem('comment-author-name');
    if (savedName) {
      setAuthorName(savedName);
    }
  }, [id]);

  // 保存评论
  const saveComments = (updatedComments: Comment[]) => {
    localStorage.setItem(`comments-${id}`, JSON.stringify(updatedComments));
  };

  // 保存用户名
  const saveAuthorName = (name: string) => {
    localStorage.setItem('comment-author-name', name);
  };

  // 提交评论
  const handleSubmitComment = () => {
    if (!newComment.trim() || !authorName.trim()) {
      alert('请填写评论内容和昵称');
      return;
    }

    setIsSubmitting(true);

    const comment: Comment = {
      id: Date.now().toString(),
      author: authorName,
      content: newComment,
      timestamp: new Date(),
      replies: []
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    saveComments(updatedComments);
    setNewComment('');
    saveAuthorName(authorName);
    setIsSubmitting(false);
  };

  // 提交回复
  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim() || !authorName.trim()) {
      alert('请填写回复内容和昵称');
      return;
    }

    setIsSubmitting(true);

    const reply: Comment = {
      id: Date.now().toString(),
      author: authorName,
      content: replyContent,
      timestamp: new Date(),
      replies: []
    };

    const updatedComments = comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...comment.replies, reply]
        };
      }
      return comment;
    });

    setComments(updatedComments);
    saveComments(updatedComments);
    setReplyContent('');
    setReplyingTo(null);
    saveAuthorName(authorName);
    setIsSubmitting(false);
  };

  // 格式化时间
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? '刚刚' : `${minutes} 分钟前`;
      }
      return `${hours} 小时前`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  return (
    <div className="space-y-6">
      {/* 评论输入框 */}
      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="您的昵称"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <textarea
            placeholder="写下您的评论..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSubmitComment}
            disabled={isSubmitting || !newComment.trim() || !authorName.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '提交中...' : '发表评论'}
          </button>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无评论，快来发表第一条评论吧！
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-border pb-6 last:border-b-0">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-foreground">{comment.author}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(comment.timestamp)}</span>
                  </div>
                  <div className="text-foreground mb-3 whitespace-pre-wrap">{comment.content}</div>
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    {replyingTo === comment.id ? '取消回复' : '回复'}
                  </button>

                  {/* 回复输入框 */}
                  {replyingTo === comment.id && (
                    <div className="mt-4 space-y-3">
                      <textarea
                        placeholder={`回复 ${comment.author}...`}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={isSubmitting || !replyContent.trim() || !authorName.trim()}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmitting ? '提交中...' : '回复'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 回复列表 */}
                  {comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-6 border-l-2 border-border">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-foreground">{reply.author}</span>
                            <span className="text-sm text-muted-foreground">{formatDate(reply.timestamp)}</span>
                          </div>
                          <div className="text-foreground whitespace-pre-wrap">{reply.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}