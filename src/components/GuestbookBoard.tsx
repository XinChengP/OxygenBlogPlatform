'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface Message {
  id: string;
  name: string;
  email: string;
  content: string;
  timestamp: Date;
  replies: Reply[];
}

interface Reply {
  id: string;
  messageId: string;
  name: string;
  email: string;
  content: string;
  timestamp: Date;
}

/**
 * 留言板组件
 * 
 * 使用 localStorage 存储留言数据
 * - 自动适配深色/浅色主题
 * - 支持留言和回复功能
 * - 响应式布局
 * - 表单验证
 */
export default function GuestbookBoard() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState({
    name: '',
    email: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载留言
  useEffect(() => {
    const savedMessages = localStorage.getItem('guestbook-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // 转换时间戳字符串回 Date 对象
        const messagesWithDates = parsedMessages.map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp),
          replies: message.replies.map((reply: any) => ({
            ...reply,
            timestamp: new Date(reply.timestamp)
          }))
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('加载留言失败:', error);
      }
    }

    // 加载用户信息
    const savedName = localStorage.getItem('guestbook-name');
    const savedEmail = localStorage.getItem('guestbook-email');
    if (savedName && savedEmail) {
      setNewMessage(prev => ({
        ...prev,
        name: savedName,
        email: savedEmail
      }));
    }
  }, []);

  // 保存留言
  const saveMessages = (updatedMessages: Message[]) => {
    localStorage.setItem('guestbook-messages', JSON.stringify(updatedMessages));
  };

  // 保存用户信息
  const saveUserInfo = (name: string, email: string) => {
    localStorage.setItem('guestbook-name', name);
    localStorage.setItem('guestbook-email', email);
  };

  // 验证邮箱格式
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // 验证表单
  const validateForm = (data: { name: string; email: string; content: string }) => {
    const newErrors: Record<string, string> = {};
    
    if (!data.name.trim()) {
      newErrors.name = '请输入昵称';
    }
    
    if (!data.email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!validateEmail(data.email)) {
      newErrors.email = '邮箱格式不正确';
    }
    
    if (!data.content.trim()) {
      newErrors.content = '请输入留言内容';
    }
    
    return newErrors;
  };

  // 提交留言
  const handleSubmitMessage = () => {
    const validationErrors = validateForm(newMessage);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const message: Message = {
      id: Date.now().toString(),
      name: newMessage.name,
      email: newMessage.email,
      content: newMessage.content,
      timestamp: new Date(),
      replies: []
    };

    const updatedMessages = [message, ...messages];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    
    // 重置表单
    setNewMessage(prev => ({
      ...prev,
      content: ''
    }));
    
    // 保存用户信息
    saveUserInfo(newMessage.name, newMessage.email);
    
    setIsSubmitting(false);
  };

  // 提交回复
  const handleSubmitReply = (messageId: string) => {
    if (!replyContent.trim()) {
      setErrors({ reply: '请输入回复内容' });
      return;
    }

    const replyValidationErrors = validateForm({
      name: newMessage.name,
      email: newMessage.email,
      content: replyContent
    });
    
    if (Object.keys(replyValidationErrors).length > 0 && replyValidationErrors.name && replyValidationErrors.email) {
      setErrors(replyValidationErrors);
      return;
    }

    setIsSubmitting(true);

    const reply: Reply = {
      id: Date.now().toString(),
      messageId,
      name: newMessage.name,
      email: newMessage.email,
      content: replyContent,
      timestamp: new Date()
    };

    const updatedMessages = messages.map(message => {
      if (message.id === messageId) {
        return {
          ...message,
          replies: [...message.replies, reply]
        };
      }
      return message;
    });

    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setReplyContent('');
    setReplyingTo(null);
    saveUserInfo(newMessage.name, newMessage.email);
    setIsSubmitting(false);
    setErrors({});
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">发表留言</h2>
        
        {/* 留言输入表单 */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                昵称 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="请输入您的昵称"
                value={newMessage.name}
                onChange={(e) => setNewMessage(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="请输入您的邮箱"
                value={newMessage.email}
                onChange={(e) => setNewMessage(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              留言内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              placeholder="请输入您的留言内容..."
              value={newMessage.content}
              onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSubmitMessage}
              disabled={isSubmitting || !newMessage.name.trim() || !newMessage.email.trim() || !newMessage.content.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '提交中...' : '发表留言'}
            </button>
          </div>
        </div>
      </div>

      {/* 留言列表 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">留言列表</h2>
        
        {messages.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
            暂无留言，快来发表第一条留言吧！
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{message.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(message.timestamp)}</span>
                  </div>
                  <div className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">{message.content}</div>
                  
                  <button
                    onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    {replyingTo === message.id ? '取消回复' : '回复'}
                  </button>

                  {/* 回复输入框 */}
                  {replyingTo === message.id && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="space-y-3">
                        <textarea
                          placeholder={`回复 ${message.name}...`}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={3}
                          className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                            errors.reply ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'
                          }`}
                        />
                        {errors.reply && <p className="mt-1 text-sm text-red-500">{errors.reply}</p>}
                        
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                              setErrors({});
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleSubmitReply(message.id)}
                            disabled={isSubmitting || !replyContent.trim() || !newMessage.name.trim() || !newMessage.email.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting ? '提交中...' : '回复'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 回复列表 */}
                  {message.replies.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">全部回复 ({message.replies.length})</h3>
                      <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                        {message.replies.map((reply) => (
                          <div key={reply.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-gray-900 dark:text-white">{reply.name}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(reply.timestamp)}</span>
                            </div>
                            <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{reply.content}</div>
                          </div>
                        ))}
                      </div>
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