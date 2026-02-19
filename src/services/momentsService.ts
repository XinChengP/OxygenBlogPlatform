/**
 * 说说（动态）数据管理服务 - 极简重构版本
 * 仅保留内容展示功能，移除所有互动和管理功能
 * 基于本地存储的静态解决方案，适用于GitHub Pages部署
 */

import { 
  Moment, 
  MomentsResponse,
  CachedMoment
} from '@/types/moments';
import { 
  STORAGE_KEYS, 
  MOMENTS_PAGINATION
} from '@/setting/momentsSetting';

// 本地存储管理器 - 简化版本
class MomentsStorageManager {
  private static instance: MomentsStorageManager;
  
  private constructor() {}
  
  static getInstance(): MomentsStorageManager {
    if (!MomentsStorageManager.instance) {
      MomentsStorageManager.instance = new MomentsStorageManager();
    }
    return MomentsStorageManager.instance;
  }
  
  // 获取说说数据 - 仅保留基础数据获取
  getMoments(): Moment[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.MOMENTS_CACHE);
      if (!cached) return [];
      
      const data = JSON.parse(cached) as CachedMoment[];
      const now = Date.now();
      
      // 返回未过期的说说数据
      return data
        .filter(item => item.expiresAt > now)
        .map(item => item.data)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('获取说说数据失败:', error);
      return [];
    }
  }
  
  // 获取说说统计 - 简化版本
  getStats(): { total: number; today: number } {
    const moments = this.getMoments();
    const today = new Date().toDateString();
    
    const todayCount = moments.filter(m => 
      new Date(m.createdAt).toDateString() === today
    ).length;
    
    return {
      total: moments.length,
      today: todayCount
    };
  }
}

// 单例存储管理器
const storage = MomentsStorageManager.getInstance();

/**
 * 说说服务 - 极简重构版本
 * 仅提供内容展示功能
 */
export const momentsService = {
  // 获取说说列表 - 仅保留分页功能
  async getMoments(page: number = 1, pageSize: number = MOMENTS_PAGINATION.pageSize): Promise<MomentsResponse> {
    try {
      const allMoments = storage.getMoments();
      const total = allMoments.length;
      const totalPages = Math.ceil(total / pageSize);
      
      // 分页处理
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const data = allMoments.slice(startIndex, endIndex);
      
      return {
        data,
        total,
        page,
        pageSize,
        hasNext: page < totalPages
      };
    } catch (error) {
      console.error('获取说说列表失败:', error);
      throw new Error('获取说说列表失败');
    }
  },
  
  // 获取单条说说 - 简化版本
  async getMoment(id: string): Promise<Moment | null> {
    try {
      const moments = storage.getMoments();
      return moments.find(m => m.id === id) || null;
    } catch (error) {
      console.error('获取说说失败:', error);
      throw new Error('获取说说失败');
    }
  },
  
  // 获取说说统计 - 简化版本
  async getStats(): Promise<{ total: number; today: number }> {
    return storage.getStats();
  }
};