'use client';

import BackgroundLayer from '@/components/BackgroundLayer';
import Navigation from '@/components/Navigation';
import { ThemeProvider } from '@/components/ThemeProvider';
import ScrollToTop from '@/components/ScrollToTop';
import GiscusGuestbookBoard from '@/components/GiscusGuestbookBoard';

function GuestbookContent() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundLayer />
      <Navigation />
        
      <main className="relative z-10 transition-colors duration-300">
        <div className="text-center mb-8 pt-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            留言板
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            欢迎在这里留下您的想法和建议！
          </p>
        </div>
        
        {/* 留言板功能 */}
        <GiscusGuestbookBoard />
      </main>
      <ScrollToTop />
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