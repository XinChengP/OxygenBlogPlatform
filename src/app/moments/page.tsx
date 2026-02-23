import React from 'react';
import { getServerMoments, getBlogCount, getServerBlogs } from '@/utils/momentsUtils';
import ClientMomentsPage from '@/components/moments/ClientMomentsPage';

// 服务器端组件读取动态数据
const moments = getServerMoments();
const blogCount = getBlogCount();
const blogs = getServerBlogs();

// 服务器端组件导出
export default function MomentsPage() {
  return <ClientMomentsPage moments={moments} blogCount={blogCount} blogs={blogs} />;
}