'use client';

import React from 'react';

/**
 * 歌手名称高亮规则
 *
 * 按名称长度降序匹配，避免短名称先命中导致长名称无法完整匹配。
 */
const ARTIST_PATTERNS: { name: string; color: string; whole?: boolean }[] = [
  { name: '洛天依Official', color: '#66ccff', whole: true },
  { name: '洛天依', color: '#66ccff' },
  { name: '乐正绫', color: '#ee0000' },
  { name: '言和', color: '#00ffcc' },
  { name: '星尘', color: '#9999ff', whole: true },
].sort((a, b) => b.name.length - a.name.length);

/**
 * 将歌手字符串转换为带颜色的 React 节点数组
 */
function buildArtistNodes(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    let matched = false;
    for (const pattern of ARTIST_PATTERNS) {
      const index = remaining.indexOf(pattern.name);
      if (index !== -1) {
        if (index > 0) {
          result.push(<span key={keyIndex++}>{remaining.slice(0, index)}</span>);
        }
        const matchedText = remaining.slice(index, index + pattern.name.length);
        if (pattern.name === '星尘' && !pattern.whole) {
          // 星尘特殊处理：星字 #9999ff，尘字 #ffff00
          result.push(
            <span key={keyIndex++} style={{ color: '#9999ff' }}>星</span>,
            <span key={keyIndex++} style={{ color: '#ffff00' }}>尘</span>
          );
        } else {
          result.push(
            <span key={keyIndex++} style={{ color: pattern.color }}>{matchedText}</span>
          );
        }
        remaining = remaining.slice(index + pattern.name.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(<span key={keyIndex++}>{remaining}</span>);
      break;
    }
  }

  return result;
}

/**
 * 歌手名称组件
 *
 * 抽成独立 memo 组件后，播放进度每 250ms 更新时不会重复做歌手名匹配。
 */
const ArtistName = React.memo(function ArtistName({ text }: { text: string }) {
  return <>{buildArtistNodes(text)}</>;
});

ArtistName.displayName = 'ArtistName';

export default ArtistName;
