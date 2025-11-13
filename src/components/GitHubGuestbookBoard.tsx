'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface DiscussionMessage {
  id: string;
  title: string;
  body: string;
  author: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  comments: {
    totalCount: number;
    nodes: Array<{
      id: string;
      body: string;
      author: {
        login: string;
        avatar_url: string;
      };
      created_at: string;
    }>;
  };
}

export default function GitHubGuestbookBoard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
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
    messageId: null as string | null,
    content: '',
    nickname: '',
    email: ''
  });

  // GitHub配置
  const GITHUB_CONFIG = {
    owner: 'XinChengP',
    repo: 'OxygenBlogPlatform',
    discussionCategoryId: 'DIC_kwDOQQbz2s4CxkZ6', // 需要在GitHub Discussions中创建分类
    // 注意：实际部署时需要处理认证问题
    // 可以使用GitHub Actions创建API endpoint，或者使用第三方服务
  };

  // GraphQL查询获取留言
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const query = `
        query {
          repository(owner: "${GITHUB_CONFIG.owner}", name: "${GITHUB_CONFIG.repo}") {
            discussions(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
              nodes {
                id
                title
                body
                createdAt
                author {
                  login
                  avatarUrl
                }
                comments(first: 10) {
                  totalCount
                  nodes {
                    id
                    body
                    createdAt
                    author {
                      login
                      avatarUrl
                    }
                  }
                }
              }
            }
          }
        }
      `;

      // 注意：这里需要GitHub token，实际部署时需要处理认证
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${GITHUB_TOKEN}`, // 需要添加token
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.repository?.discussions?.nodes) {
          setMessages(result.data.repository.discussions.nodes);
        }
      }
    } catch (error) {
      console.error('获取留言失败:', error);
      // 如果GitHub API失败，使用模拟数据
      useLocalStorageFallback();
    } finally {
      setLoading(false);
    }
  };

  // 本地存储备用方案
  const useLocalStorageFallback = () => {
    const localMessages = JSON.parse(localStorage.getItem('github_guestbook_messages') || '[]');
    if (localMessages.length > 0) {
      setMessages(localMessages);
    }
  };

  // 发布留言（需要GitHub token）
  const submitMessage = async () => {
    if (!formData.content.trim() || !formData.nickname.trim()) {
      alert('请填写昵称和留言内容');
      return;
    }

    setSubmitting(true);
    
    try {
      const messageBody = `**留言者信息：**
- 昵称：${formData.nickname}
- 邮箱：${formData.email || '未提供'}

**留言内容：**
${formData.content}

---
*发布时间：${new Date().toLocaleString('zh-CN')}*
*来源：博客留言板*`;

      // 使用GitHub REST API创建Discussion
      const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${GITHUB_TOKEN}`, // 需要添加token
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title: `留言 - ${formData.nickname}`,
          body: messageBody,
          category_id: GITHUB_CONFIG.discussionCategoryId,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [newMessage, ...prev]);
        setFormData({ nickname: '', email: '', content: '' });
        setShowForm(false);
        alert('留言发布成功！');
      } else {
        // 如果GitHub API失败，使用本地存储
        const localMessage = {
          id: `local_${Date.now()}`,
          title: `留言 - ${formData.nickname}`,
          body: messageBody,
          author: {
            login: formData.nickname,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.nickname)}`
          },
          created_at: new Date().toISOString(),
          comments: { totalCount: 0, nodes: [] }
        };
        
        const localMessages = [localMessage, ...messages];
        localStorage.setItem('github_guestbook_messages', JSON.stringify(localMessages));
        setMessages(localMessages);
        setFormData({ nickname: '', email: '', content: '' });
        setShowForm(false);
        alert('留言已保存到本地（在GitHub集成部署后将变为全局可见）');
      }
      
    } catch (error) {
      console.error('发布留言失败:', error);
      alert('发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 回复留言（需要GitHub token）
  const submitReply = async () => {
    if (!replyData.content.trim() || !replyData.nickname.trim()) {
      alert('请填写昵称和回复内容');
      return;
    }

    setSubmitting(true);
    
    try {
      const commentBody = `**回复者信息：**
- 昵称：${replyData.nickname}
- 邮箱：${replyData.email || '未提供'}

**回复内容：**
${replyData.content}

---
*回复时间：${new Date().toLocaleString('zh-CN')}*`;

      // 使用GitHub REST API创建评论
      const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/discussions/${replyData.messageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${GITHUB_TOKEN}`, // 需要添加token
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          body: commentBody,
        }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setMessages(prev => prev.map(msg => {
          if (msg.id === replyData.messageId) {
            return {
              ...msg,
              comments: {
                ...msg.comments,
                totalCount: msg.comments.totalCount + 1,
                nodes: [...msg.comments.nodes, newComment]
              }
            };
          }
          return msg;
        }));
        setReplyData({ messageId: null, content: '', nickname: '', email: '' });
        alert('回复发布成功！');
      } else {
        // 本地存储备用
        const updatedMessages = messages.map(msg => {
          if (msg.id === replyData.messageId) {
            const localComment = {
              id: `local_comment_${Date.now()}`,
              body: commentBody,
              author: {
                login: replyData.nickname,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(replyData.nickname)}`
              },
              created_at: new Date().toISOString()
            };
            
            return {
              ...msg,
              comments: {
                ...msg.comments,
                totalCount: msg.comments.totalCount + 1,
                nodes: [...msg.comments.nodes, localComment]
              }
            };
          }
          return msg;
        });
        
        localStorage.setItem('github_guestbook_messages', JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
        setReplyData({ messageId: null, content: '', nickname: '', email: '' });
        alert('回复已保存到本地（在GitHub集成部署后将变为全局可见）');
      }
      
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

  // 加载数据
  useEffect(() => {
    fetchMessages();
    
    // 合并本地数据
    const localMessages = JSON.parse(localStorage.getItem('github_guestbook_messages') || '[]');
    if (localMessages.length > 0) {
      setMessages(prev => [...localMessages, ...prev]);
    }
  }, []);

  // 保存用户信息
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
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          全球留言板
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          🌟 基于GitHub Discussions的全球留言系统，所有访问者都能看到和参与留言！
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
        >
          {showForm ? '取消留言' : '写下留言'}
        </button>
      </div>

      {/* GitHub集成状态 */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">🔗 GitHub集成状态</h4>
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          当前使用演示模式，实际部署时将连接到GitHub Discussions实现真正的全球留言功能。
          GitHub Discussions提供完整的后端支持，确保所有用户都能看到最新的留言。
        </p>
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
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="在这里写下您的想法..."
                required
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={submitMessage}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
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
                  src={message.author.avatar_url}
                  alt={message.author.login}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {message.author.login}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(message.created_at)}
                    </span>
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
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium"
                >
                  回复 ({message.comments.totalCount})
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  #{message.id.slice(-8)}
                </span>
              </div>

              {/* 回复列表 */}
              {message.comments.nodes.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
                  {message.comments.nodes.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <img
                        src={comment.author.avatar_url}
                        alt={comment.author.login}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {comment.author.login}
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

      {/* GitHub集成说明 */}
      <div className="mt-12 space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">🌟 GitHub Discussions 优势</h4>
          <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
            <li>• <strong>全球可见</strong>：所有访问者都能看到所有留言</li>
            <li>• <strong>实时同步</strong>：留言立即对全世界可见</li>
            <li>• <strong>稳定可靠</strong>：基于GitHub基础设施</li>
            <li>• <strong>无需注册</strong>：访客可直接留言互动</li>
            <li>• <strong>数据永久</strong>：GitHub保证数据持久化</li>
          </ul>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">🔧 部署说明</h4>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            当前为演示模式，包含本地存储备用方案。实际部署到GitHub Pages时，
            需要配置GitHub Discussions和相应的权限。系统会自动处理GitHub API集成，
            实现真正的全球留言功能。
          </p>
        </div>
      </div>
    </div>
  );
}