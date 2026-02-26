'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // 从localStorage中获取后台主题设置
    const adminTheme = localStorage.getItem('adminTheme');
    if (adminTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSetup) {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致！');
          return;
        }
        if (password.length < 6) {
          setError('密码长度至少6位！');
          return;
        }
        
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'setup', password }),
        });
        
        const data = await res.json();
        if (data.success) {
          setMessage(data.message);
          setTimeout(() => router.push('/admin/login'), 1500);
        } else {
          setError(data.message);
        }
      } else {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', password }),
        });
        
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('adminSession', data.sessionId);
          router.push('/admin/dashboard');
        } else {
          setError(data.message);
        }
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-gradient-to-br from-[#66ccff]/10 to-[#1e40af]/10 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4`}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#66ccff] mb-2">
            🌸 {isSetup ? '初始化后台' : '后台登录'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isSetup ? '设置管理员密码' : '洛天依博客管理系统'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 p-4 rounded-lg mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSetup ? '设置密码' : '密码'}
            </label>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
                required
              />
          </div>
          
          {isSetup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请再次输入密码"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#66ccff] text-[#1e40af] py-3 px-4 rounded-lg font-medium hover:bg-[#66ccff]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '处理中...' : (isSetup ? '确认设置' : '登录')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>⚠️ 注意：后台管理系统仅在本地运行</p>
          <p>敏感信息不会提交到GitHub</p>
        </div>
      </div>
    </div>
  );
}
