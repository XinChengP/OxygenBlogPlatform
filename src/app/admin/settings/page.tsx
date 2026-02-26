'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../../../admin/components/AdminLayout';
import { Lock, Key, Github, Save, Eye, EyeOff } from 'lucide-react';

export default function AdminSettingsPage() {
  const [showToken, setShowToken] = useState({ blog: false, image: false });
  const [blogConfig, setBlogConfig] = useState({ owner: '', repo: '', branch: 'main', token: '' });
  const [imageConfig, setImageConfig] = useState({ owner: 'Eiheir', repo: 'Luo_Tianyi_Image', branch: 'main', token: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 加载配置
  useEffect(() => {
    loadGithubConfigs();
  }, []);

  const loadGithubConfigs = async () => {
    try {
      // 获取博客仓库配置
      const blogRes = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGithub', type: 'blog' }),
      });
      if (blogRes.ok) {
        const data = await blogRes.json();
        if (data.config) setBlogConfig(data.config);
      }

      // 获取图床仓库配置
      const imageRes = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGithub', type: 'image' }),
      });
      if (imageRes.ok) {
        const data = await imageRes.json();
        if (data.config) setImageConfig(data.config);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const handleSaveGithubConfig = async (type: 'blog' | 'image') => {
    try {
      const config = type === 'blog' ? blogConfig : imageConfig;
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateGithub', type, config }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || '保存失败，请重试', type: 'error' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ text: '保存失败，请重试', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ text: '两次输入的密码不一致！', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: '密码长度至少6位！', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPassword', password: newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ text: data.message, type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || '密码修改失败，请重试', type: 'error' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ text: '密码修改失败，请重试', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white animate-fade-in">系统设置</h1>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            } animate-fade-in`}
          >
            {message.text}
          </div>
        )}

        {/* 修改密码 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg transform hover:scale-110 transition-transform">
              <Lock className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">修改密码</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="至少6位"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="再次输入新密码"
              />
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            className="flex items-center space-x-2 bg-[#66ccff] text-[#1e40af] px-4 py-2 rounded-lg hover:bg-[#66ccff]/80 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg font-medium"
          >
            <Save size={20} />
            <span>修改密码</span>
          </button>
        </div>

        {/* GitHub 博客仓库配置 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg transform hover:scale-110 transition-transform">
              <Github className="text-gray-600 dark:text-gray-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">博客仓库配置</h2>
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">仓库所有者</label>
              <input
                type="text"
                value={blogConfig.owner}
                onChange={(e) => setBlogConfig({ ...blogConfig, owner: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="例如：XinChengP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">仓库名称</label>
              <input
                type="text"
                value={blogConfig.repo}
                onChange={(e) => setBlogConfig({ ...blogConfig, repo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="例如：OxygenBlogPlatform"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分支</label>
              <input
                type="text"
                value={blogConfig.branch}
                onChange={(e) => setBlogConfig({ ...blogConfig, branch: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="main"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GitHub Token</label>
              <div className="relative">
                <input
                  type={showToken.blog ? 'text' : 'password'}
                  value={blogConfig.token}
                  onChange={(e) => setBlogConfig({ ...blogConfig, token: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowToken({ ...showToken, blog: !showToken.blog })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors transform hover:scale-110"
                >
                  {showToken.blog ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleSaveGithubConfig('blog')}
            className="flex items-center space-x-2 bg-[#1e40af] text-white px-4 py-2 rounded-lg hover:bg-[#1e40af]/80 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Save size={20} />
            <span>保存博客仓库配置</span>
          </button>
        </div>

        {/* GitHub 图床仓库配置 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg transform hover:scale-110 transition-transform">
              <Key className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">图床仓库配置</h2>
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">仓库所有者</label>
              <input
                type="text"
                value={imageConfig.owner}
                onChange={(e) => setImageConfig({ ...imageConfig, owner: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">仓库名称</label>
              <input
                type="text"
                value={imageConfig.repo}
                onChange={(e) => setImageConfig({ ...imageConfig, repo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分支</label>
              <input
                type="text"
                value={imageConfig.branch}
                onChange={(e) => setImageConfig({ ...imageConfig, branch: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GitHub Token</label>
              <div className="relative">
                <input
                  type={showToken.image ? 'text' : 'password'}
                  value={imageConfig.token}
                  onChange={(e) => setImageConfig({ ...imageConfig, token: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowToken({ ...showToken, image: !showToken.image })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors transform hover:scale-110"
                >
                  {showToken.image ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleSaveGithubConfig('image')}
            className="flex items-center space-x-2 bg-[#06b6d4] text-white px-4 py-2 rounded-lg hover:bg-[#06b6d4]/80 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Save size={20} />
            <span>保存图床仓库配置</span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
