'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Github,
  Mail,
  Globe,
  Code2,
  Palette,
  Wrench,
  BookOpen,
  FolderGit2,
  Fish
} from 'lucide-react';
import {
  relatedLinks,
  categoryLabels,
  categoryColors,
  RelatedLinkCategory,
  RelatedLink
} from '@/setting/AboutSetting';

const categoryIcons: Record<RelatedLinkCategory, React.ReactNode> = {
  framework: <Code2 className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
  ui: <Palette className="w-4 h-4" />,
  tutorial: <BookOpen className="w-4 h-4" />,
  project: <FolderGit2 className="w-4 h-4" />,
  fish: <Fish className="w-4 h-4" />
};

function getLinkIcon(url: string): React.ReactNode {
  if (url.includes('github')) return <Github className="w-5 h-5" />;
  if (url.includes('mail') || url.includes('email')) return <Mail className="w-5 h-5" />;
  return <Globe className="w-5 h-5" />;
}

function LinkCard({ link, index }: { link: RelatedLink; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryColor = categoryColors[link.category];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
      className="group relative p-5 rounded-2xl backdrop-blur-md bg-card/90
                 border border-border shadow-md supports-[backdrop-filter]:bg-card/75
                 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at top right, ${categoryColor}10 0%, transparent 70%)`
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center
                       transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}40 100%)`,
              color: categoryColor
            }}
          >
            {getLinkIcon(link.url)}
          </div>
          <ExternalLink
            className={`w-4 h-4 text-gray-400 transition-all duration-300
                       ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 text-sm">
          {link.name}
        </h3>
        <span
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full mb-2"
          style={{
            backgroundColor: `${categoryColor}20`,
            color: categoryColor
          }}
        >
          {categoryIcons[link.category]}
          {categoryLabels[link.category]}
        </span>

        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {link.description}
        </p>

        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {link.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800
                           text-gray-500 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function RelatedLinks() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const groupedLinks = useMemo(() => {
    const groups: Record<string, RelatedLink[]> = {};
    relatedLinks.forEach((link) => {
      if (!groups[link.category]) groups[link.category] = [];
      groups[link.category].push(link);
    });
    return groups;
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {Object.entries(groupedLinks).map(([category, links], groupIndex) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.08 }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${categoryColors[category as RelatedLinkCategory]}20`,
                color: categoryColors[category as RelatedLinkCategory]
              }}
            >
              {categoryIcons[category as RelatedLinkCategory]}
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {categoryLabels[category as RelatedLinkCategory]}
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {links.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {links.map((link, index) => (
              <LinkCard key={link.name} link={link} index={index} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
