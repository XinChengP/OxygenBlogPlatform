import React from 'react';
import DashboardClient from '../../components/admin/DashboardClient';
import { getDashboardStats } from '../../utils/server/adminStats';

/**
 * 博客管理后台仪表盘页面
 *
 * 功能特点：
 * - 服务端获取统计数据
 * - 显示文章、动态、图片统计
 * - 提供快捷操作入口
 *
 * @returns 仪表盘页面 JSX
 */
export default async function AdminDashboardPage() {
  // 服务端获取统计数据（真实数据）
  // 注意：在静态导出模式下，此数据在构建时获取
  const stats = await getDashboardStats();

  return (
    <DashboardClient
      stats={stats}
    />
  );
}

// 静态导出配置 - 兼容 GitHub Pages 构建
export const dynamic = 'force-static';
export const revalidate = false;
