'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { categories } from '@/setting/blogSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import Pagination from '@/components/Pagination';
import { getAssetPath } from '@/utils/assetUtils';


/**
 * 博客文章接口
 */
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
  slug: string;
  readTime: number;
  coverImage?: string;
}

interface ClientBlogsPageProps {
  initialPosts: BlogPost[];
}

/**
 * 客户端博客列表页面
 * 处理交互和动画效果
 */
export default function ClientBlogsPage({ initialPosts }: ClientBlogsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('blogs');
  
  // 分页配置
  const POSTS_PER_PAGE = 6; // 每页显示的文章数量
  
  /**
   * 获取毛玻璃样式类名
   */
  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };
  
  /**
   * 过滤博客文章
   */
  const filteredPosts = selectedCategory === 'all' 
    ? initialPosts 
    : initialPosts.filter(post => post.category === selectedCategory);

  /**
   * 分页计算
   */
  const paginationData = useMemo(() => {
    const totalPosts = filteredPosts.length;
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const currentPosts = filteredPosts.slice(startIndex, endIndex);
    
    return {
      currentPosts,
      totalPages,
      totalPosts
    };
  }, [filteredPosts, currentPage, POSTS_PER_PAGE]);

  /**
   * 处理分类变化
   */
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // 切换分类时重置到第一页
  };

  /**
   * 处理页码变化
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  /**
   * 容器动画配置
   */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // 如果没有任何博客数据，显示空页面提示
  if (initialPosts.length === 0) {
    return (
      <div className={containerStyle.className} style={containerStyle.style}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-4">
              📝 博客文章
            </h1>
          </motion.div>
          
          {/* 空页面提示 */}
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-6">📄</div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                暂无博客文章
              </h2>
              <p className="text-muted-foreground mb-8">
                还没有发布任何博客文章，请稍后再来查看。
              </p>
              <Link 
                href="/"
                className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors nav-link"
              >
                返回首页
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-foreground mb-4 title">
            📝 博客文章
          </h1>
        </motion.div>
        
        {/* 移动端分类筛选折叠按钮 */}
        <motion.div 
          className="lg:hidden mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            onClick={() => setIsCategoryCollapsed(!isCategoryCollapsed)}
            className={getGlassStyle("w-full rounded-lg shadow-md p-4 flex items-center justify-between text-foreground hover:bg-card/90 transition-colors border")}
          >
            <span className="flex items-center gap-2">
              <span>📂</span>
              <span className="font-medium">分类筛选</span>
              <span className="text-sm text-muted-foreground">
                ({selectedCategory === 'all' ? '全部' : selectedCategory})
              </span>
            </span>
            <motion.span
              animate={{ rotate: isCategoryCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground"
            >
              ▼
            </motion.span>
          </button>
          
          {/* 移动端分类选项 */}
          <motion.div
            initial={false}
            animate={{ 
              height: isCategoryCollapsed ? 0 : 'auto',
              opacity: isCategoryCollapsed ? 0 : 1
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={getGlassStyle("rounded-lg shadow-md mt-2 p-4 border")}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((category) => (
                   <button
                     key={category}
                     onClick={() => handleCategoryChange(category)}
                     className={`px-3 py-2 rounded-md text-sm transition-colors ${
                       selectedCategory === category
                         ? 'bg-primary/10 text-primary border border-primary/20'
                         : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                     }`}
                   >
                     {category === 'all' ? '全部' : category}
                   </button>
                 ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 桌面端左侧边栏 */}
          <motion.aside 
            className="hidden lg:block lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className={getGlassStyle("rounded-lg shadow-md p-6 sticky top-24 border")}>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                📂 分类筛选
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    {category === 'all' ? '全部' : category}
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>
          
          {/* 主内容区 */}
          <motion.main 
            className="col-span-1 lg:col-span-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 文章统计信息 */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                {selectedCategory === 'all' ? '全部' : selectedCategory} 分类下共有 {paginationData.totalPosts} 篇文章
                {paginationData.totalPages > 1 && (
                  <span className="ml-2">
                    (第 {currentPage} 页，共 {paginationData.totalPages} 页)
                  </span>
                )}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {paginationData.currentPosts.map((post) => (
                <motion.article
                  key={post.id}
                  variants={{
                    hidden: { 
                      opacity: 0, 
                      y: 20,
                      scale: 0.95
                    },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      scale: 1,
                      transition: {
                        duration: 0.3,
                        ease: "easeOut"
                      }
                    }
                  }}
                  whileHover={{ 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  className={getGlassStyle("rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border")}
                >
                  <Link href={`/blogs/${encodeURIComponent(post.slug)}`} className="nav-link">
                    {/* 封面图片 */}
                    {post.coverImage && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={getAssetPath(post.coverImage)}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium border border-primary/20">
                          {post.category}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          预计阅读时间 {post.readTime} 分钟
                        </span>
                      </div>
                      
                      <h2 className="text-xl font-semibold text-foreground mb-3 hover:text-primary transition-colors title">
                        {post.title}
                      </h2>
                      
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {post.date}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {post.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded border border-border"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
            
            {paginationData.currentPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  暂无该分类下的文章
                </p>
              </div>
            )}

            {/* 翻页器 */}
            {paginationData.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={paginationData.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </motion.main>
        </div>
      </div>
    </div>
  );
}