'use client';

import BackgroundLayer from '@/components/BackgroundLayer';
import Navigation from '@/components/Navigation';
import { ThemeProvider } from '@/components/ThemeProvider';

function GuestbookContent() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundLayer />
      <Navigation />
        
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            留言板
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            欢迎访问留言板！目前留言功能正在维护中，敬请期待。
          </p>
        </div>
      </main>
    </div>
  );
}

export default function Guestbook() {
  return (
    <ThemeProvider>
      <GuestbookContent />
    </ThemeProvider>
  );
}