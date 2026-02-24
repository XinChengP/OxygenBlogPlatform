/**
 * 博客统计工具函数
 * 用于获取博客分类和标签的统计信息
 */

import { getServerBlogs } from './momentsUtils';

export interface BlogStats {
  totalPosts: number;
  totalCategories: number;
  totalTags: number;
  categoryCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  categories: string[];
  tags: string[];
}

/**
 * 获取博客统计信息
 * @returns 博客统计信息
 */
export function getBlogStats(): BlogStats {
  try {
    const blogs = getServerBlogs();
    
    // 统计分类数量
    const categoryCounts: Record<string, number> = {};
    // 统计标签数量
    const tagCounts: Record<string, number> = {};
    
    blogs.forEach(blog => {
      // 统计分类
      const category = blog.category || '其他';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      // 统计标签
      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    // 获取所有分类（按数量排序）
    const categories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category]) => category);
    
    // 获取所有标签（按数量排序）
    const tags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([tag]) => tag);
    
    return {
      totalPosts: blogs.length,
      totalCategories: categories.length,
      totalTags: tags.length,
      categoryCounts,
      tagCounts,
      categories,
      tags
    };
  } catch (error) {
    console.error('获取博客统计信息失败:', error);
    return {
      totalPosts: 0,
      totalCategories: 0,
      totalTags: 0,
      categoryCounts: {},
      tagCounts: {},
      categories: [],
      tags: []
    };
  }
}

/**
 * 获取分类数量
 * @returns 分类数量
 */
export function getCategoryCount(): number {
  try {
    const blogs = getServerBlogs();
    const categories = new Set<string>();
    
    blogs.forEach(blog => {
      const category = blog.category || '其他';
      categories.add(category);
    });
    
    return categories.size;
  } catch (error) {
    console.error('获取分类数量失败:', error);
    return 0;
  }
}

/**
 * 获取标签数量
 * @returns 标签数量
 */
export function getTagCount(): number {
  try {
    const blogs = getServerBlogs();
    const tags = new Set<string>();
    
    blogs.forEach(blog => {
      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          tags.add(tag);
        });
      }
    });
    
    return tags.size;
  } catch (error) {
    console.error('获取标签数量失败:', error);
    return 0;
  }
}

const blogStatsUtils = {
  getBlogStats,
  getCategoryCount,
  getTagCount
};

export default blogStatsUtils;