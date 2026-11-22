import React from 'react';
import { getChangelogs } from './changelogActions';
import ChangelogsManageClient from './ChangelogsManageClient';

/**
 * 更新日志列表页面（服务端组件）
 *
 * 功能特点：
 * - 服务端获取日志数据
 * - 传递给客户端组件渲染
 *
 * @returns 日志列表页面 JSX
 */
export default async function ChangelogsPage() {
  // 服务端获取所有日志数据
  const changelogs = await getChangelogs();

  return (
    <div className="p-6">
      <ChangelogsManageClient changelogs={changelogs} />
    </div>
  );
}

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = false;
