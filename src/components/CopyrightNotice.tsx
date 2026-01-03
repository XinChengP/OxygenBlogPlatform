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
  const articleUrl = `${copyrightConfig.siteUrl}/blogs/${slug}`;
  const publishYear = new Date(publishDate).getFullYear();
  
  // 判断是否需要折叠（超过3个引用）
  const shouldCollapse = reference && reference.length > 3;
  const displayReferences = shouldCollapse && !isExpanded 
    ? reference.slice(0, 3) 
    : reference;
  
  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      {/* Reference 引用信息 */}
      {reference && reference.length > 0 && (
        <div className="mb-4 p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
          <h4 className="text-sm font-medium text-primary mb-2 flex items-center">
            📖 Reference
          </h4>
          
          <div className="space-y-2">
            {displayReferences?.map((ref, index) => (
              <div key={index} className="text-sm">
                <span className="text-primary font-medium mr-2">
                  {ref.description}:
                </span>
                <a 
                  href={ref.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline break-all transition-colors"
                >
                  {ref.link}
                </a>
              </div>
            ))}
          </div>
          
          {/* 折叠/展开按钮 */}
          {shouldCollapse && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 rounded px-1 py-0.5"
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
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span>© {publishYear} {copyrightConfig.author}</span>
              <span className="hidden sm:inline">•</span>
              <Link 
                href={licenseInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                {licenseInfo.name}
              </Link>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 sm:text-right">
              {licenseInfo.description}
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 text-left">
            <span>本文链接：</span>
            <Link 
              href={articleUrl}
              className="text-primary hover:text-primary/80 hover:underline ml-1 break-all transition-colors"
            >
              {articleUrl}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}