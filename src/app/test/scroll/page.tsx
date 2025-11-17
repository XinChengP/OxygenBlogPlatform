/**
 * 滚动测试页面
 * 用于测试页面切换时的滚动位置保持功能
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ScrollTestPage() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [savedPositions, setSavedPositions] = useState<Record<string, number>>({});

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const clearSavedPositions = () => {
    sessionStorage.removeItem('pageScrollPositions');
    setSavedPositions({});
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // 从 sessionStorage 读取保存的滚动位置
    const saved = sessionStorage.getItem('pageScrollPositions');
    if (saved) {
      setSavedPositions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // 监听 sessionStorage 变化，实时更新保存位置显示
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pageScrollPositions' && e.newValue) {
        setSavedPositions(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            滚动位置测试页面
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                当前滚动位置
              </h2>
              <p className="text-2xl font-mono text-blue-600 dark:text-blue-400">
                {scrollPosition}px
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
                保存的滚动位置
              </h2>
              <pre className="text-sm text-green-600 dark:text-green-400 overflow-auto max-h-32">
                {JSON.stringify(savedPositions, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* 长内容区域用于测试滚动 */}
        <div className="space-y-6">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                测试内容区块 {i + 1}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                这是一个用于测试滚动位置保持的内容区块。当您滚动到这个位置并切换到其他页面，
                然后再返回时，页面应该保持在这个滚动位置。
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  区块编号: {i + 1} | 滚动位置: {i * 200 + 600}px (大约)
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 快速跳转与测试控制 */}
        <div className="fixed bottom-6 right-6 space-y-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              快速跳转
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => scrollToSection('section1')}
                className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                第1段
              </button>
              <button
                onClick={() => scrollToSection('section10')}
                className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                第10段
              </button>
              <button
                onClick={() => scrollToSection('section20')}
                className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                第20段
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                返回顶部
              </button>
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              导航测试
            </h4>
            <div className="space-y-2">
              <Link
                href="/blogs"
                className="block px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                博客列表
              </Link>
              <Link
                href="/archive"
                className="block px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                归档页面
              </Link>
            </div>
            <button
              onClick={clearSavedPositions}
              className="w-full px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              清除保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}