'use client';

import { useState } from 'react';
import Link from 'next/link';
import { copyrightConfig, getCCLicenseInfo, type CCLicenseType } from '../setting/blogSetting';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

/**
 * 版权声明组件属性接口
 */
interface CopyrightNoticeProps {
  /** 文章标题 */
  title: string;
  /** 发布日期 */
  publishDate: string;
  /** 文章 slug */
  slug: string;
  /** 引用信息（从 md 元数据获取，可选） */
  reference?: Array<{description: string; link: string}>;
  /** CC 协议类型（可选，默认使用配置中的） */
  licenseType?: CCLicenseType;
}

/**
 * 简洁的版权声明组件
 * 包含 reference 和 CC 转载声明，支持折叠和暗黑模式
 */
export default function CopyrightNotice({
  title,
  publishDate,
  slug,
  reference,
  licenseType = copyrightConfig.defaultLicense
}: CopyrightNoticeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 如果配置中关闭了版权声明且没有引用信息，则不显示
  if (!copyrightConfig.showCopyright && !reference?.length) {
    return null;
  }
  
  const licenseInfo = getCCLicenseInfo(licenseType);
  const articleUrl = `${copyrightConfig.siteUrl}/blogs/${encodeURIComponent(slug)}`;
  // 获取当前年份，显示格式为 "2025 - 【当前年份】"
  const currentYear = new Date().getFullYear();
  const copyrightYear = currentYear === 2025 ? "2025" : `2025 - ${currentYear}`;
  
  // 判断是否需要折叠（超过3个引用）
  const shouldCollapse = reference && reference.length > 3;
  const displayReferences = shouldCollapse && !isExpanded 
    ? reference.slice(0, 3) 
    : reference;
  
  return (
    <div className="mt-8 pt-6 border-t border-border/30">
      {/* Reference 引用信息 */}
      {reference && reference.length > 0 && (
        <div className="mb-5 p-4 bg-primary/5 rounded-2xl border border-primary/15">
          <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
            <span className="text-base">📖</span>
            <span>Reference</span>
          </h4>
          
          <div className="space-y-2.5">
            {displayReferences?.map((ref, index) => (
              <div key={index} className="text-sm flex items-start gap-2">
                <span className="text-primary/60 mt-0.5">•</span>
                <div>
                  <span className="text-foreground/80 font-medium mr-2">
                    {ref.description}
                  </span>
                  <a 
                    href={ref.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 break-all transition-colors"
                  >
                    {ref.link}
                  </a>
                </div>
              </div>
            ))}
          </div>
          
          {/* 折叠/展开按钮 */}
          {shouldCollapse && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg px-2 py-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUpIcon className="w-3 h-3" />
                  <span>收起</span>
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-3 h-3" />
                  <span>显示更多 ({reference.length - 3} 个)</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
      
      {/* CC 转载声明 */}
      {copyrightConfig.showCopyright && (
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>© {copyrightYear} {copyrightConfig.author}</span>
              <span className="text-border">•</span>
              <Link 
                href={licenseInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-colors"
              >
                {licenseInfo.name}
              </Link>
            </div>
            <div className="text-xs text-muted-foreground/70 sm:text-right">
              {licenseInfo.description}
            </div>
          </div>
          
          <div className="mt-2.5 pt-2.5 border-t border-border/20 text-xs text-muted-foreground/70 text-left">
            <span>本文链接：</span>
            <Link 
              href={articleUrl}
              className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 ml-1 break-all transition-colors"
            >
              {articleUrl}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}