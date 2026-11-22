import { getMomentList, getMomentTags, Moment } from '@/actions/momentActions';
import MomentsManageClient from './MomentsManageClient';

/**
 * 动态管理页面（服务端组件）
 * 
 * 负责获取初始数据并传递给客户端组件
 * 注意：在静态导出模式下，此页面在构建时预渲染
 */
export default async function MomentsManagePage() {
  let moments: Moment[] = [];
  let tags: string[] = [];
  
  try {
    // 获取动态列表
    const result = await getMomentList();
    moments = result.success && result.data 
      ? (Array.isArray(result.data) ? result.data : [result.data]) 
      : [];
    
    // 获取所有标签（用于筛选器）
    tags = await getMomentTags();
  } catch (error) {
    // 在静态导出模式下，如果 actions 不可用，使用空数组
    console.warn('获取动态数据失败，使用空数据:', error);
    moments = [];
    tags = [];
  }
  
  return (
    <MomentsManageClient 
      initialMoments={moments}
      initialTags={tags}
    />
  );
}

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = false;
