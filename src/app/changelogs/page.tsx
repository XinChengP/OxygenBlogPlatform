import React from 'react';
import { getServerChangelogs } from '@/utils/changelogUtils';
import ClientChangelogsPage from '@/components/changelogs/ClientChangelogsPage';

// 服务器端组件读取开发日志数据
const changelogs = getServerChangelogs();

// 服务器端组件导出
export default function ChangelogsPage() {
  return <ClientChangelogsPage changelogs={changelogs} />;
}
