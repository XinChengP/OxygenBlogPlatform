/**
 * 页脚组件
 * 显示版权信息和相关链接
 */

import { year, name, aWord, ICPLink, policeBeianLink } from '@/setting/FooterSetting';
import Link from 'next/link';
import Image from 'next/image';

/**
 * 获取公安备案图片路径，处理 basePath
 */
function getGonganImagePath(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return basePath ? `${basePath}/gongan.png` : '/gongan.png';
}

/**
 * 页脚组件 - 毛玻璃透明效果
 */
export default function Footer() {
  return (
    <footer className="backdrop-blur-md bg-background/80 border-t border-border/30 py-3 supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground/70">
          
          {/* 版权信息 */}
          <span className="flex items-center gap-1">
            {<span className="mx-1"></span>}
            <span>&copy; {year} {name}</span>
          </span>
          
          {/* 自定义文案 */}
          {aWord && (
            <>
              <span className="mx-1">·</span>
              <span>{aWord}</span>
            </>
          )}
          
          {/* 洛天依B站主页链接 */}
          <span className="mx-1">·</span>
          <span>由</span>
          <Link
            href="https://space.bilibili.com/36081646"  // 已更新为正确的洛天依主页地址
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-primary transition-colors duration-200 underline-offset-4 hover:underline"
          >
            洛天依
          </Link>
          <span>驱动</span>
        </p>
      </div>
    </footer>
  );
}
