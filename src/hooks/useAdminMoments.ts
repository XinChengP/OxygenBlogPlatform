'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMoments,
  getMomentDetail,
  createOrUpdateMoment,
  deleteMoment,
  GitHubConfig,
  MomentMetadata,
  handleGitHubError,
} from '@/services/githubApi';
import { getDecryptedToken, getAdminConfig, generateMomentId } from '@/utils/adminUtils';

/**
 * 动态数据接口
 */
export interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images?: string[];
  pinned?: boolean;
  sha?: string;
  name?: string;
  path?: string;
}

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
  generateNewId: () => string;
  /** 获取单个动态详情 */
  getMoment: (id: string) => Promise<Moment | null>;
  /** 保存动态 */
  saveMoment: (id: string, content: string, metadata: MomentMetadata) => Promise<boolean>;
  /** 删除动态 */
  removeMoment: (id: string, sha: string) => Promise<boolean>;
  /** 所有标签列表 */
  allTags: string[];
}

/**
 * 管理后台动态管理 Hook
 * 提供动态数据的获取、筛选、创建、更新、删除等功能
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
   * 获取 GitHub 配置
   * 从本地存储获取 Token 和仓库配置
   */
  const getGitHubConfig = useCallback((): GitHubConfig | null => {
    const token = getDecryptedToken();
    const config = getAdminConfig();

    if (!token || !config) {
      return null;
    }

    return {
      owner: config.githubOwner,
      repo: config.githubRepo,
      branch: config.githubBranch,
      token,
    };
  }, []);

  /**
   * 从 GitHub 获取动态列表
   */
  const fetchMoments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const config = getGitHubConfig();
      if (!config) {
        setError('请先配置 GitHub Token 和仓库信息');
        setLoading(false);
        return;
      }

      // 获取动态文件列表
      const momentFiles = await getMoments(config);
      
      // 解析每个动态文件的内容
      const parsedMoments: Moment[] = [];
      const tagsSet = new Set<string>();

      for (const file of momentFiles) {
        try {
          // 获取动态详情
          const detail = await getMomentDetail(config, file.name.replace('.md', ''));
          if (detail) {
            parsedMoments.push({
              id: detail.id,
              time: detail.metadata.time,
              content: detail.content,
              tags: detail.metadata.tags || [],
              images: detail.metadata.images || [],
              pinned: detail.metadata.pinned || false,
              sha: detail.sha,
              name: file.name,
              path: file.path,
            });

            // 收集所有标签
            detail.metadata.tags?.forEach(tag => tagsSet.add(tag));
          }
        } catch (err) {
          console.error(`解析动态文件 ${file.name} 失败:`, err);
        }
      }

      // 按置顶状态和时间倒序排序
      parsedMoments.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      setMoments(parsedMoments);
      setAllTags(Array.from(tagsSet));
    } catch (err) {
      const errorMessage = handleGitHubError(err);
      setError(errorMessage);
      console.error('获取动态列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [getGitHubConfig]);

  /**
   * 筛选后的动态列表
   */
  const filteredMoments = useMemo(() => {
    let result = [...moments];

    // 按标签筛选
    if (options.tag) {
      result = result.filter(moment => moment.tags.includes(options.tag!));
    }

    // 按置顶状态筛选
    if (options.pinned !== undefined) {
      result = result.filter(moment => moment.pinned === options.pinned);
    }

    // 按关键词搜索
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(moment =>
        moment.content.toLowerCase().includes(searchLower) ||
        moment.id.toLowerCase().includes(searchLower) ||
        moment.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [moments, options.tag, options.pinned, options.search]);

  /**
   * 生成新的动态 ID
   */
  const generateNewId = useCallback((): string => {
    const existingIds = moments.map(m => m.id);
    return generateMomentId(existingIds);
  }, [moments]);

  /**
   * 获取单个动态详情
   */
  const getMoment = useCallback(async (id: string): Promise<Moment | null> => {
    const config = getGitHubConfig();
    if (!config) {
      setError('请先配置 GitHub Token 和仓库信息');
      return null;
    }

    try {
      const detail = await getMomentDetail(config, id);
      if (detail) {
        return {
          id: detail.id,
          time: detail.metadata.time,
          content: detail.content,
          tags: detail.metadata.tags || [],
          images: detail.metadata.images || [],
          pinned: detail.metadata.pinned || false,
          sha: detail.sha,
        };
      }
      return null;
    } catch (err) {
      const errorMessage = handleGitHubError(err);
      setError(errorMessage);
      console.error('获取动态详情失败:', err);
      return null;
    }
  }, [getGitHubConfig]);

  /**
   * 保存动态（创建或更新）
   */
  const saveMoment = useCallback(async (
    id: string,
    content: string,
    metadata: MomentMetadata
  ): Promise<boolean> => {
    const config = getGitHubConfig();
    if (!config) {
      setError('请先配置 GitHub Token 和仓库信息');
      return false;
    }

    try {
      await createOrUpdateMoment(config, id, content, metadata);
      // 刷新列表
      await fetchMoments();
      return true;
    } catch (err) {
      const errorMessage = handleGitHubError(err);
      setError(errorMessage);
      console.error('保存动态失败:', err);
      return false;
    }
  }, [getGitHubConfig, fetchMoments]);

  /**
   * 删除动态
   */
  const removeMoment = useCallback(async (id: string, sha: string): Promise<boolean> => {
    const config = getGitHubConfig();
    if (!config) {
      setError('请先配置 GitHub Token 和仓库信息');
      return false;
    }

    try {
      await deleteMoment(config, id, sha);
      // 刷新列表
      await fetchMoments();
      return true;
    } catch (err) {
      const errorMessage = handleGitHubError(err);
      setError(errorMessage);
      console.error('删除动态失败:', err);
      return false;
    }
  }, [getGitHubConfig, fetchMoments]);

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
