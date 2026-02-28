'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BlogPost } from '@/utils/momentsUtils';

/**
 * 筛选选项接口
 */
export interface FilterOptions {
  categories: string[];
  tags: string[];
}

/**
 * Hook 选项接口
 */
export interface UseAdminBlogsOptions {
  /** 当前页码 */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 分类筛选 */
  category?: string;
  /** 标签筛选 */
  tag?: string;
  /** 搜索关键词 */
  search?: string;
  /** 排序字段 */
  sortBy?: 'date' | 'title';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 开始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
  /** 初始数据（从服务端传入） */
  initialBlogs?: BlogPost[];
  /** 初始筛选选项（从服务端传入） */
  initialFilterOptions?: FilterOptions;
}

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Hook 返回值接口
 */
export interface UseAdminBlogsReturn {
  /** 博客列表 */
  blogs: BlogPost[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 分页信息 */
  pagination: PaginationInfo;
  /** 筛选选项 */
  filterOptions: FilterOptions;
  /** 刷新数据（客户端重新筛选） */
  refresh: () => void;
  /** 更新筛选条件 */
  updateFilters: (filters: Partial<UseAdminBlogsOptions>) => void;
  /** 当前筛选条件 */
  currentFilters: UseAdminBlogsOptions;
}

/**
 * useAdminBlogs Hook
 * 
 * 用于管理后台博客列表数据筛选和分页
 * 
 * 功能特点：
 * - 支持分页
 * - 支持按分类、标签、日期范围筛选
 * - 支持关键词搜索
 * - 支持排序
 * - 接收服务端传入的初始数据
 * 
 * @param options - Hook 选项
 * @returns 博客数据和操作方法
 */
export function useAdminBlogs(options: UseAdminBlogsOptions = {}): UseAdminBlogsReturn {
  // 默认选项
  const defaultOptions: UseAdminBlogsOptions = {
    page: 1,
    pageSize: 10,
    category: '',
    tag: '',
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    startDate: '',
    endDate: '',
  };

  // 当前筛选条件状态
  const [currentFilters, setCurrentFilters] = useState<UseAdminBlogsOptions>({
    ...defaultOptions,
    ...options,
  });

  // 所有博客数据（从服务端传入）
  const [allBlogs, setAllBlogs] = useState<BlogPost[]>(options.initialBlogs || []);
  
  // 加载状态（如果没有初始数据则为加载中）
  const [loading, setLoading] = useState(!options.initialBlogs?.length);
  
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  
  // 筛选选项
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(
    options.initialFilterOptions || { categories: [], tags: [] }
  );

  // 当初始数据变化时更新
  useEffect(() => {
    if (options.initialBlogs) {
      setAllBlogs(options.initialBlogs);
      setLoading(false);
    }
    if (options.initialFilterOptions) {
      setFilterOptions(options.initialFilterOptions);
    }
  }, [options.initialBlogs, options.initialFilterOptions]);

  /**
   * 筛选和分页后的博客数据
   */
  const { filteredBlogs, pagination } = useMemo(() => {
    let result = [...allBlogs];

    // 按分类筛选
    if (currentFilters.category) {
      result = result.filter(blog => blog.category === currentFilters.category);
    }

    // 按标签筛选
    if (currentFilters.tag) {
      result = result.filter(blog => blog.tags.includes(currentFilters.tag!));
    }

    // 按日期范围筛选
    if (currentFilters.startDate) {
      const start = new Date(currentFilters.startDate);
      result = result.filter(blog => new Date(blog.date) >= start);
    }
    if (currentFilters.endDate) {
      const end = new Date(currentFilters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(blog => new Date(blog.date) <= end);
    }

    // 关键词搜索
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      result = result.filter(blog =>
        blog.title.toLowerCase().includes(searchLower) ||
        blog.excerpt.toLowerCase().includes(searchLower) ||
        blog.tags.some(t => t.toLowerCase().includes(searchLower)) ||
        blog.category.toLowerCase().includes(searchLower)
      );
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (currentFilters.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'zh-CN');
          break;
        case 'date':
        default:
          comparison = new Date(a.updatedAt || a.date).getTime() - new Date(b.updatedAt || b.date).getTime();
          break;
      }
      
      return currentFilters.sortOrder === 'desc' ? -comparison : comparison;
    });

    // 计算分页
    const total = result.length;
    const pageSize = currentFilters.pageSize || 10;
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = currentFilters.page || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResult = result.slice(startIndex, endIndex);

    return {
      filteredBlogs: paginatedResult,
      pagination: {
        current: currentPage,
        pageSize,
        total,
        totalPages,
      },
    };
  }, [allBlogs, currentFilters]);

  /**
   * 刷新数据（重置筛选条件）
   */
  const refresh = useCallback(() => {
    setCurrentFilters({
      ...defaultOptions,
      ...options,
    });
  }, [options]);

  /**
   * 更新筛选条件
   */
  const updateFilters = useCallback((filters: Partial<UseAdminBlogsOptions>) => {
    setCurrentFilters(prev => ({
      ...prev,
      ...filters,
      // 如果更改了筛选条件（非页码），重置页码
      page: filters.page !== undefined ? filters.page : 1,
    }));
  }, []);

  /**
   * 当选项变化时更新筛选条件
   */
  useEffect(() => {
    setCurrentFilters(prev => ({
      ...prev,
      ...options,
    }));
  }, [
    options.page,
    options.pageSize,
    options.category,
    options.tag,
    options.search,
    options.sortBy,
    options.sortOrder,
    options.startDate,
    options.endDate,
  ]);

  return {
    blogs: filteredBlogs,
    loading,
    error,
    pagination,
    filterOptions,
    refresh,
    updateFilters,
    currentFilters,
  };
}

/**
 * 获取单篇博客详情的 Hook
 * 
 * @param id - 博客 ID
 * @param blogs - 所有博客数据
 * @returns 博客详情和操作方法
 */
export function useAdminBlogDetail(id: string | null, blogs: BlogPost[] = []) {
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 查找博客详情
   */
  useEffect(() => {
    if (!id) {
      setBlog(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 从传入的博客列表中查找
    const targetBlog = blogs.find(b => b.id === id);
    
    if (targetBlog) {
      setBlog(targetBlog);
    } else {
      setError('博客不存在');
      setBlog(null);
    }
    
    setLoading(false);
  }, [id, blogs]);

  return {
    blog,
    loading,
    error,
    refresh: () => {}, // 客户端模式下无需刷新
  };
}

export default useAdminBlogs;
