'use client';

import { motion } from 'motion/react';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import GiscusGuestbookBoard from '@/components/GiscusGuestbookBoard';

export default function Guestbook() {
  const { containerStyle, sectionStyle } = useBackgroundStyle('guestbook');

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <section className={`${sectionStyle.className} min-h-screen py-20`} style={sectionStyle.style}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GiscusGuestbookBoard />
          </motion.div>
        </div>
      </section>
    </div>
  );
}