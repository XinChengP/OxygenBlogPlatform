'use client';

/**
 * 管理后台动态管理 Hook
 * 提供动态数据的获取、筛选、创建、更新、删除等功能
 * 使用 Server Actions 进行本地文件操作
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMomentList,
  getMomentDetail,
  createMoment,
  updateMoment,
  deleteMoment,
  generateNewMomentId,
  Moment,
  MomentData,
} from '@/actions/momentActions';

/**
 * Hook 选项接口
 */
export interface UseAdminMomentsOptions {
  /** 按标签筛选 */
  tag?: string;
  /** 按置顶状态筛选 */
  pinned?: boolean;
  /** 关键词搜索 */
  search?: string;
}

/**
 * Hook 返回值接口
 */
export interface UseAdminMomentsReturn {
  /** 动态列表 */
  moments: Moment[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 生成新的动态 ID */
  generateNewId: () => Promise<string>;
  /** 获取单个动态详情 */
  getMoment: (id: string) => Promise<Moment | null>;
  /** 保存动态（创建或更新） */
  saveMoment: (id: string, data: MomentData) => Promise<boolean>;
  /** 删除动态 */
  removeMoment: (id: string) => Promise<boolean>;
  /** 所有标签列表 */
  allTags: string[];
}

/**
 * 管理后台动态管理 Hook
 * 
 * @param options - 筛选选项
 * @returns 动态数据和操作方法
 */
export function useAdminMoments(options: UseAdminMomentsOptions = {}): UseAdminMomentsReturn {
  // 动态列表状态
  const [moments, setMoments] = useState<Moment[]>([]);
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  // 所有标签列表
  const [allTags, setAllTags] = useState<string[]>([]);

  /**
   * 从本地获取动态列表
   */
  const fetchMoments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取动态列表
      const result = await getMomentList();
      
      if (result.success && result.data) {
        const momentList = Array.isArray(result.data) ? result.data : [result.data];
        setMoments(momentList);
        
        // 收集所有标签
        const tagsSet = new Set<string>();
        momentList.forEach(moment => {
          moment.tags?.forEach(tag => tagsSet.add(tag));
        });
        setAllTags(Array.from(tagsSet));
      } else {
        setError(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取动态列表失败';
      setError(errorMessage);
      console.error('获取动态列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 筛选后的动态列表
   */
  const filteredMoments = useMemo(() => {
    let result = [...moments];

    // 按标签筛选
    if (options.tag) {
      result = result.filter(moment => moment.tags?.includes(options.tag!));
    }

    // 按置顶状态筛选
    if (options.pinned !== undefined) {
      result = result.filter(moment => moment.pinned === options.pinned);
    }

    // 按关键词搜索
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(moment =>
        moment.content?.toLowerCase().includes(searchLower) ||
        moment.id?.toLowerCase().includes(searchLower) ||
        moment.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [moments, options.tag, options.pinned, options.search]);

  /**
   * 生成新的动态 ID
   */
  const generateNewId = useCallback(async (): Promise<string> => {
    return await generateNewMomentId();
  }, []);

  /**
   * 获取单个动态详情
   */
  const getMoment = useCallback(async (id: string): Promise<Moment | null> => {
    try {
      const result = await getMomentDetail(id);
      if (result.success && result.data && !Array.isArray(result.data)) {
        return result.data;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取动态详情失败';
      setError(errorMessage);
      console.error('获取动态详情失败:', err);
      return null;
    }
  }, []);

  /**
   * 保存动态（创建或更新）
   */
  const saveMoment = useCallback(async (
    id: string,
    data: MomentData
  ): Promise<boolean> => {
    try {
      // 检查动态是否存在
      const existingResult = await getMomentDetail(id);
      let result;
      
      if (existingResult.success) {
        // 更新现有动态
        result = await updateMoment(id, data);
      } else {
        // 创建新动态
        result = await createMoment(data);
      }
      
      // 刷新列表
      if (result.success) {
        await fetchMoments();
        return true;
      } else {
        setError(result.message);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存动态失败';
      setError(errorMessage);
      console.error('保存动态失败:', err);
      return false;
    }
  }, [fetchMoments]);

  /**
   * 删除动态
   */
  const removeMoment = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await deleteMoment(id);
      
      if (result.success) {
        // 刷新列表
        await fetchMoments();
        return true;
      } else {
        setError(result.message);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除动态失败';
      setError(errorMessage);
      console.error('删除动态失败:', err);
      return false;
    }
  }, [fetchMoments]);

  /**
   * 刷新数据
   */
  const refresh = useCallback(async () => {
    await fetchMoments();
  }, [fetchMoments]);

  /**
   * 初始化时加载数据
   */
  useEffect(() => {
    fetchMoments();
  }, [fetchMoments]);

  return {
    moments: filteredMoments,
    loading,
    error,
    refresh,
    generateNewId,
    getMoment,
    saveMoment,
    removeMoment,
    allTags,
  };
}

export default useAdminMoments;
