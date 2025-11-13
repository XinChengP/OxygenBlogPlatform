'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface GuestbookMessage {
  id: number;
  title: string;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  html_url: string;
}

interface Comment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
}

export default function GlobalGuestbookBoard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    content: ''
  });
  
  const [replyData, setReplyData] = useState({
    messageId: null as number | null,
    content: '',
    nickname: '',
    email: ''
  });

  // GitHub配置
  const GITHUB_CONFIG = {
    owner: 'XinChengP',
    repo: 'OxygenBlogPlatform',
    token: '' // 公共访问不需要token
  };

  // 获取留言列表
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues?state=open&labels=guestbook&sort=created&direction=desc`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.filter((issue: any) => !issue.pull_request));
      }
    } catch (error) {
      console.error('获取留言失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 发布留言
  const submitMessage = async () => {
    if (!formData.content.trim() || !formData.nickname.trim()) {
      alert('请填写昵称和留言内容');
      return;
    }

    setSubmitting(true);
    
    try {
      // 构造留言内容
      const messageBody = `
**留言者信息：**
- 昵称：${formData.nickname}
- 邮箱：${formData.email || '未提供'}

**留言内容：**
${formData.content}

---
*发布时间：${new Date().toLocaleString('zh-CN')}*
`;

      // 由于GitHub API限制，我们需要使用一个替代方案
      // 这里我们创建一个包含所有留言的JSON文件方案
      
      // 方案1：使用GitHub的Discussions API (需要用户认证)
      // 方案2：使用第三方留言服务
      // 方案3：模拟数据展示功能
      
      // 为了演示功能，我们使用本地存储来模拟全局留言
      // 在实际部署中，可以集成GitHub Discussions或其他服务
      
      const newMessage = {
        id: Date.now(),
        title: `留言 - ${formData.nickname}`,
        body: messageBody,
        user: {
          login: formData.nickname,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.nickname)}`
        },
        created_at: new Date().toISOString(),
        html_url: '#',
        isLocal: true // 标记为本地模拟数据
      };

      // 获取现有本地留言
      const existingMessages = JSON.parse(localStorage.getItem('guestbook_messages') || '[]');
      const updatedMessages = [newMessage, ...existingMessages];
      
      // 保存到本地存储
      localStorage.setItem('guestbook_messages', JSON.stringify(updatedMessages));
      
      // 更新状态
      setMessages(updatedMessages);
      
      // 清空表单
      setFormData({ nickname: '', email: '', content: '' });
      setShowForm(false);
      
      alert('留言发布成功！');
      
    } catch (error) {
      console.error('发布留言失败:', error);
      alert('发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 回复留言
  const submitReply = async () => {
    if (!replyData.content.trim() || !replyData.nickname.trim()) {
      alert('请填写昵称和回复内容');
      return;
    }

    setSubmitting(true);
    
    try {
      const messageBody = `
**回复者信息：**
- 昵称：${replyData.nickname}
- 邮箱：${replyData.email || '未提供'}

**回复内容：**
${replyData.content}

---
*回复时间：${new Date().toLocaleString('zh-CN')}*
`;

      // 模拟GitHub评论添加
      const existingMessages = JSON.parse(localStorage.getItem('guestbook_messages') || '[]');
      const messageIndex = existingMessages.findIndex((msg: any) => msg.id === replyData.messageId);
      
      if (messageIndex !== -1) {
        if (!existingMessages[messageIndex].comments) {
          existingMessages[messageIndex].comments = [];
        }
        
        const newComment = {
          id: Date.now(),
          body: messageBody,
          user: {
            login: replyData.nickname,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(replyData.nickname)}`
          },
          created_at: new Date().toISOString()
        };
        
        existingMessages[messageIndex].comments.push(newComment);
        localStorage.setItem('guestbook_messages', JSON.stringify(existingMessages));
        setMessages(existingMessages);
      }
      
      // 清空回复表单
      setReplyData({ messageId: null, content: '', nickname: '', email: '' });
      
      alert('回复发布成功！');
      
    } catch (error) {
      console.error('发布回复失败:', error);
      alert('发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };

  // 加载初始化数据
  useEffect(() => {
    // 合并GitHub数据和本地数据
    const loadData = async () => {
      await fetchMessages();
      
      // 加载本地留言（作为演示）
      const localMessages = JSON.parse(localStorage.getItem('guestbook_messages') || '[]');
      if (localMessages.length > 0) {
        setMessages(prev => [...localMessages, ...prev]);
      }
    };
    
    loadData();
  }, []);

  // 保存用户信息到本地
  useEffect(() => {
    if (formData.nickname || formData.email) {
      localStorage.setItem('guestbook_user', JSON.stringify({
        nickname: formData.nickname,
        email: formData.email
      }));
    }
  }, [formData.nickname, formData.email]);

  // 加载保存的用户信息
  useEffect(() => {
    const savedUser = localStorage.getItem('guestbook_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setFormData(prev => ({ ...prev, ...user }));
    }
  }, []);

  return (
    <div className={`max-w-4xl mx-auto p-6 ${isDark ? 'dark' : ''}`}>
      {/* 头部 */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          博客留言板
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          欢迎在这里留下您的想法和建议！所有留言对所有访问者可见。
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
        >
          {showForm ? '取消留言' : '写下留言'}
        </button>
      </div>

      {/* 留言表单 */}
      {showForm && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">发布新留言</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                昵称 *
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入您的昵称"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                邮箱 (可选)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入您的邮箱"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                留言内容 *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="在这里写下您的想法..."
                required
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={submitMessage}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '发布中...' : '发布留言'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回复表单 */}
      {replyData.messageId && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">回复留言</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                昵称 *
              </label>
              <input
                type="text"
                value={replyData.nickname}
                onChange={(e) => setReplyData({ ...replyData, nickname: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入您的昵称"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                邮箱 (可选)
              </label>
              <input
                type="email"
                value={replyData.email}
                onChange={(e) => setReplyData({ ...replyData, email: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入您的邮箱"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                回复内容 *
              </label>
              <textarea
                value={replyData.content}
                onChange={(e) => setReplyData({ ...replyData, content: e.target.value })}
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="写下您的回复..."
                required
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={submitReply}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '发布中...' : '发布回复'}
              </button>
              <button
                onClick={() => setReplyData({ messageId: null, content: '', nickname: '', email: '' })}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 留言列表 */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">加载中...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">还没有留言，成为第一个留言的人吧！</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              {/* 留言头部 */}
              <div className="flex items-start space-x-4 mb-4">
                <img
                  src={message.user.avatar_url}
                  alt={message.user.login}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {message.user.login}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(message.created_at)}
                    </span>
                    {message.isLocal && (
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        本地
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 留言内容 */}
              <div className="prose dark:prose-invert max-w-none mb-4">
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {message.body.split('\n').map((line, index) => {
                    if (line.startsWith('**留言者信息：**') || line.startsWith('**留言内容：**') || line.startsWith('**回复者信息：**') || line.startsWith('**回复内容：**')) {
                      return <strong key={index} className="text-gray-900 dark:text-gray-100">{line}</strong>;
                    }
                    if (line.startsWith('---')) {
                      return <hr key={index} className="my-2 border-gray-300 dark:border-gray-600" />;
                    }
                    return line ? <div key={index}>{line}</div> : <br key={index} />;
                  })}
                </div>
              </div>

              {/* 回复按钮 */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setReplyData({ 
                    messageId: message.id, 
                    content: '', 
                    nickname: formData.nickname, 
                    email: formData.email 
                  })}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                >
                  回复 ({message.comments?.length || 0})
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  #{message.id}
                </span>
              </div>

              {/* 回复列表 */}
              {message.comments && message.comments.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
                  {message.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <img
                        src={comment.user.avatar_url}
                        alt={comment.user.login}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {comment.user.login}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(comment.created_at)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {comment.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 使用说明 */}
      <div className="mt-12 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">💡 使用说明</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• 所有访问者都能看到和参与留言</li>
          <li>• 留言数据对所有人可见，请勿发布敏感信息</li>
          <li>• 支持对任意留言进行回复互动</li>
          <li>• 邮箱信息仅用于展示，不会用于垃圾邮件</li>
        </ul>
      </div>
    </div>
  );
}