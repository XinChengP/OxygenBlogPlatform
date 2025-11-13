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