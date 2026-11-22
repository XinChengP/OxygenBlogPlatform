'use client';

/**
 * 更新日志编辑页面（客户端组件）
 *
 * 功能特点：
 * - 支持通过query参数传入日期进行编辑
 * - 无日期参数时为创建模式
 * - 客户端获取日志数据
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChangelogEditClient from './ChangelogEditClient';
import { Changelog } from '@/types/changelogTypes';
import { getChangelogByDate } from '../changelogActions';
import AdminLoading from '@/components/admin/AdminLoading';

/**
 * 日志编辑页外层
 * useSearchParams 在静态导出时必须位于 Suspense 边界内，否则构建会报错
 */
export default function ChangelogEditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <AdminLoading />
        </div>
      }
    >
      <ChangelogEditContent />
    </Suspense>
  );
}

function ChangelogEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get('date');

  const [changelog, setChangelog] = useState<Changelog | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadChangelog() {
      if (date) {
        const data = await getChangelogByDate(date);
        if (!data) {
          // 如果日志不存在，重定向到列表页
          router.push('/admin/changelogs');
          return;
        }
        setChangelog(data);
      } else {
        setChangelog(null);
      }
      setIsLoading(false);
    }

    loadChangelog();
  }, [date, router]);

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminLoading />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ChangelogEditClient changelog={changelog} />
    </div>
  );
}
