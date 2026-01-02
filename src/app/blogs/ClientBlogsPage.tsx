'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { categories } from '@/setting/blogSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import Pagination from '@/components/Pagination';
import { getAssetPath } from '@/utils/assetUtils';
import { Search, Calendar, Clock, Tag, ArrowRight, LayoutGrid, LayoutList, X, Filter, BookOpen } from 'lucide-react';
import live2dMessageManager from '@/utils/live2dMessageManager';

// 动态导入滚动控制组件
const LazyScrollToTop = lazy(() => import('@/components/ScrollToTop'));

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
  author?: {
    name: string;
    avatar?: string;
  };
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [minReadTime, setMinReadTime] = useState<number>(0);
  const [maxReadTime, setMaxReadTime] = useState<number>(60);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState<boolean>(true);

  // 获取所有可用的标签
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    initialPosts.forEach(post => {
      post.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [initialPosts]);

  // 生成搜索建议
  useEffect(() => {
    if (searchTerm.length > 0) {
      const suggestions = [
        ...initialPosts.map(post => post.title),
        ...allTags,
        ...initialPosts.map(post => post.category)
      ]
        .filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 5);
      
      setSearchSuggestions([...new Set(suggestions)]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm, initialPosts, allTags]);

  // 处理搜索建议选择
  const handleSuggestionSelect = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  // 处理标签选择
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1);
  };

  // 处理日期范围变化
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({...prev, [type]: value}));
    setCurrentPage(1);
  };

  // 处理阅读时间变化
  const handleReadTimeChange = (type: 'min' | 'max', value: number) => {
    if (type === 'min') {
      setMinReadTime(value);
    } else {
      setMaxReadTime(value);
    }
    setCurrentPage(1);
  };

  // 重置所有筛选条件
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setDateRange({start: '', end: ''});
    setMinReadTime(0);
    setMaxReadTime(60);
    setSelectedCategory('all');
    setSortBy('date');
    setCurrentPage(1);
  };

  // 获取活跃筛选条件数量
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedTags.length > 0) count++;
    if (dateRange.start || dateRange.end) count++;
    if (minReadTime > 0 || maxReadTime < 60) count++;
    if (selectedCategory !== 'all') count++;
    return count;
  };
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'readingTime'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
   * 处理文章卡片鼠标悬停事件
   */
  const handlePostHover = (post: BlogPost) => {
    // 笨鸥文章特殊彩蛋 - 只显示彩蛋消息，不显示其他内容
    if (post.slug === 'benou-score') {
      // 清除其他消息，确保只显示彩蛋，使用最高优先级(10)
      live2dMessageManager.clearMessageQueue();
      // 增加延迟，确保动画完成后再显示消息，避免被动画打断
      setTimeout(() => {
        live2dMessageManager.showMessage('如果双腿跑不动，那就试着抓住风～天依相信每一只笨鸥都能飞到自己的天空！', 4000, 10);
      }, 200);
      return;
    }
    
    // 其他彩蛋文章 - 同样使用最高优先级
    if (post.slug === 'markdown-editor' || post.slug === 'color-egg') {
      // 清除其他消息，确保彩蛋优先显示
      live2dMessageManager.clearMessageQueue();
      setTimeout(() => {
        live2dMessageManager.showMessage('发现了彩蛋文章！天依为你准备了特别的惊喜～', 4000, 10);
      }, 200);
      return;
    }
    
    // 其他文章显示随机消息，使用低优先级(1)
    const hoverMessages = [
      `对《${post.title}》感兴趣吗？点击查看详情～`,
      `这是一篇关于${post.category}的文章，阅读时间大约${post.readTime}分钟`,
      `发布于${formatDate(post.date)}，${post.excerpt?.substring(0, 30)}...`,
      `天依觉得这篇文章看起来很有趣呢～`,
      `这篇${post.category}文章有${post.readTime}分钟的阅读时间`,
      `想看看「${post.title}」吗？天依推荐你阅读一下～`
    ];
    
    const randomMessage = hoverMessages[Math.floor(Math.random() * hoverMessages.length)];
    live2dMessageManager.showMessage(randomMessage, 3000, 1);
  };

  /**
   * 处理文章卡片鼠标离开事件
   */
  const handlePostLeave = () => {
    // 延迟1秒隐藏消息，让用户有时间阅读
    // 只隐藏优先级 <= 10 的消息，彩蛋消息现在都是最高优先级
    live2dMessageManager.hideMessage(1000, 10);
  };
  
  /**
   * 过滤和搜索博客文章
   */
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = selectedCategory === 'all' 
      ? initialPosts 
      : initialPosts.filter(post => post.category === selectedCategory);
    
    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // 标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter(post =>
        selectedTags.some(tag => post.tags.includes(tag))
      );
    }
    
    // 日期范围过滤
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(post => {
        const postDate = new Date(post.date);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;
        
        if (startDate && postDate < startDate) return false;
        if (endDate && postDate > endDate) return false;
        return true;
      });
    }
    
    // 阅读时间过滤
    filtered = filtered.filter(post => 
      post.readTime >= minReadTime && post.readTime <= maxReadTime
    );
    
    // 排序
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'readingTime':
          return a.readTime - b.readTime;
        default:
          return 0;
      }
    });
  }, [initialPosts, selectedCategory, searchTerm, selectedTags, dateRange, minReadTime, maxReadTime, sortBy]);

  /**
   * 分页计算
   */
  const paginationData = useMemo(() => {
    const totalPosts = filteredAndSortedPosts.length;
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const currentPosts = filteredAndSortedPosts.slice(startIndex, endIndex);
    
    return {
      currentPosts,
      totalPages,
      totalPosts
    };
  }, [filteredAndSortedPosts, currentPage, POSTS_PER_PAGE]);

  /**
   * 处理分类变化
   */
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // 切换分类时重置到第一页
    // 移动端自动收起分类筛选面板
    if (window.innerWidth < 1024) {
      setIsCategoryCollapsed(true);
    }
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
   * 格式化日期
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Live2D消息管理器状态调试 - 仅在开发环境下启用
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const debugInterval = setInterval(() => {
        const status = live2dMessageManager.getStatus();
        console.log('Live2D消息管理器状态:', status);
      }, 5000);

      return () => clearInterval(debugInterval);
    }
  }, []);

  // 如果没有任何博客数据，显示空页面提示
  if (initialPosts.length === 0) {
    return (
      <div className={containerStyle.className} style={containerStyle.style}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <div 
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-foreground mb-4">
              📝 博客文章
            </h1>
          </div>
          
          {/* 空页面提示 */}
          <div 
            className="text-center py-20"
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4 title">
            📝 博客文章
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            分享技术心得、生活感悟与创作灵感
          </p>
        </div>
        
        {/* 搜索和控制栏 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <input
              type="text"
              placeholder="搜索文章标题、内容或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50 group-hover:shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                title="清除搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* 搜索建议下拉列表 */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
              >
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* 控制按钮组 */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* 高级搜索按钮 */}
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={getGlassStyle("px-4 py-2 rounded-lg border flex items-center gap-2 hover:bg-primary/5 transition-colors relative")}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">高级搜索</span>
              <span className="sm:hidden">筛选</span>
              {getActiveFiltersCount() > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            
            {/* 排序 */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* 排序方式 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  排序：
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'readingTime')}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50"
                >
                  <option value="date">发布时间</option>
                  <option value="title">标题排序</option>
                  <option value="readingTime">阅读时长</option>
                </select>
              </div>
              
              {/* 视图切换 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  视图：
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 text-sm transition-all duration-200 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm transition-all duration-200 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 移动端分类筛选面板 */}
        {!isCategoryCollapsed && (
          <div className="lg:hidden mb-6 overflow-hidden">
            <div className={getGlassStyle("rounded-lg border p-4")}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  分类筛选
                </h3>
                <button
                  onClick={() => setIsCategoryCollapsed(true)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((category) => {
                  const count = initialPosts.filter(post => category === 'all' ? true : post.category === category).length;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between ${selectedCategory === category ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
                    >
                      <span>{category === 'all' ? '全部' : category}</span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {isCategoryCollapsed && (
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setIsCategoryCollapsed(false)}
              className={getGlassStyle("w-full px-4 py-2 rounded-lg border flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors")}
            >
              <Filter className="w-4 h-4" />
              显示分类筛选
            </button>
          </div>
        )}

        {/* 高级搜索面板 */}
        <AnimatePresence>
          {showAdvancedSearch && (
            <div className="mb-8 overflow-hidden">
              <div className={getGlassStyle("rounded-lg border p-6")}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* 标签筛选 */}
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      标签筛选
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1 rounded-full text-xs transition-colors ${selectedTags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 日期范围 */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      发布日期
                    </h4>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => handleDateRangeChange('start', e.target.value)}
                        className={getGlassStyle("w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50")}
                        placeholder="开始日期"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => handleDateRangeChange('end', e.target.value)}
                        className={getGlassStyle("w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50")}
                        placeholder="结束日期"
                      />
                    </div>
                  </div>
                  
                  {/* 阅读时间 */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      阅读时间
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground">最少: {minReadTime}分钟</label>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={minReadTime}
                          onChange={(e) => handleReadTimeChange('min', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">最多: {maxReadTime}分钟</label>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          value={maxReadTime}
                          onChange={(e) => handleReadTimeChange('max', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    找到 {filteredAndSortedPosts.length} 篇文章
                  </div>
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    重置筛选
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 桌面端左侧边栏 */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className={getGlassStyle("rounded-lg shadow-md p-6 sticky top-24 border")}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                分类筛选
              </h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const count = initialPosts.filter(post => category === 'all' ? true : post.category === category).length;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between ${selectedCategory === category ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
                    >
                      <span>{category === 'all' ? '全部' : category}</span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* 统计信息 */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      总文章数
                    </span>
                    <span className="font-medium">{initialPosts.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          
          {/* 主内容区 */}
          <main className="col-span-1 lg:col-span-3">
            {/* 搜索结果统计 */}
            {searchTerm && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-primary">
                  <Search className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    找到 {filteredAndSortedPosts.length} 篇关于 &ldquo;{searchTerm}&rdquo; 的文章
                  </span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-auto px-3 py-1 text-xs bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                  >
                    清除搜索
                  </button>
                </div>
              </div>
            )}

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

            {/* 网格视图 */}
            {viewMode === 'grid' && (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                {paginationData.currentPosts.map((post, index) => (
                  <motion.article
                    key={post.slug}
                    className={`${getGlassStyle("rounded-xl shadow-lg overflow-hidden cursor-pointer group relative")} border border-transparent`}
                    initial={{ opacity: 1, y: 0 }}
                    whileHover={{ 
                      y: -5, 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                      borderColor: "rgba(59, 130, 246, 0.3)"
                    }}
                    transition={{ duration: 0.4 }}
                    onMouseEnter={() => handlePostHover(post)}
                    onMouseLeave={handlePostLeave}
                  >
                      <Link href={`/blogs/${encodeURIComponent(post.slug)}`} className="nav-link">
                        {/* 封面图片 */}
                        {post.coverImage ? (
                          <div className="relative h-48 sm:h-56 overflow-hidden">
                            <motion.div
                              className="absolute inset-0"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.4 }}
                            >
                              <Image
                                src={getAssetPath(post.coverImage)}
                                alt={post.title}
                                className="w-full h-full object-cover"
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                priority={index < 3}
                              />
                            </motion.div>
                            <motion.div 
                              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0"
                              whileHover={{ opacity: 1 }}
                              transition={{ duration: 0.4 }}
                            ></motion.div>
                            <div className="absolute top-3 left-3">
                              <span className="bg-primary/95 text-primary-foreground px-2 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm shadow-lg">
                                {post.category}
                              </span>
                            </div>
                            {/* 阅读时间标签 */}
                            <div className="absolute top-3 right-3">
                              <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                                {post.readTime}分钟
                              </span>
                            </div>
                            
                            {/* 悬停时的阅读按钮 */}
                            <motion.div 
                              className="absolute inset-0 flex items-center justify-center opacity-0"
                              whileHover={{ opacity: 1 }}
                              transition={{ duration: 0.4 }}
                            >
                              <motion.div 
                                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-gray-800 dark:text-gray-200 shadow-lg"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                              >
                                阅读文章
                              </motion.div>
                            </motion.div>
                          </div>
                        ) : (
                          /* 无封面图片时的占位图 */
                          <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center space-y-3">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary/60 dark:text-primary/80" />
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                                  {post.category}
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                                {post.readTime}分钟
                              </span>
                            </div>
                            
                            {/* 悬停时的阅读按钮 */}
                            <motion.div 
                              className="absolute inset-0 flex items-center justify-center opacity-0 bg-black/10 backdrop-blur-sm"
                              whileHover={{ opacity: 1 }}
                              transition={{ duration: 0.4 }}
                            >
                              <motion.div 
                                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-gray-800 dark:text-gray-200 shadow-lg"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                              >
                                阅读文章
                              </motion.div>
                            </motion.div>
                          </div>
                        )}
                        <div className="p-4 sm:p-6">
                          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                            <span className="flex items-center gap-1 group/date">
                              <Calendar className="w-3 h-3 group-hover/date:text-primary transition-colors" />
                              {formatDate(post.date)}
                            </span>
                          </div>
                          
                          <motion.h2 
                            className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 line-clamp-2"
                            whileHover={{ color: "var(--primary)" }}
                            transition={{ duration: 0.4 }}
                          >
                            {post.title}
                          </motion.h2>
                          
                          {post.excerpt && (
                            <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base line-clamp-3 leading-relaxed">
                              {post.excerpt}
                            </p>
                          )}
                          
                          {/* 标签 */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {post.author && (
                                  <div className="flex items-center gap-2 group/author">
                                    {post.author.avatar && (
                                      <Image
                                        src={getAssetPath(post.author.avatar)}
                                        alt={post.author.name}
                                        className="rounded-full object-cover ring-2 ring-background group-hover/author:ring-primary transition-all duration-300"
                                        width={28}
                                        height={28}
                                        sizes="28px"
                                      />
                                    )}
                                    <span className="text-xs sm:text-sm text-muted-foreground group-hover/author:text-foreground transition-colors truncate font-medium">
                                      {post.author.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <motion.div 
                                  className="flex items-center gap-2 text-primary text-sm font-medium"
                                  whileHover={{ gap: "0.75rem" }}
                                  transition={{ duration: 0.4 }}
                                >
                                  <span>阅读文章</span>
                                  <motion.span
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.4 }}
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </motion.span>
                                </motion.div>
                              </div>
                            </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
              </div>
            )}
            
            {/* 列表视图 */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {paginationData.currentPosts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    className={`${getGlassStyle("rounded-md shadow-sm p-2.5 cursor-pointer group relative")} border border-transparent`}
                    initial={{ opacity: 1, y: 0 }}
                    whileHover={{ 
                      y: -2, 
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      borderColor: "rgba(59, 130, 246, 0.3)"
                    }}
                    transition={{ duration: 0.4 }}
                    onMouseEnter={() => handlePostHover(post)}
                    onMouseLeave={handlePostLeave}
                  >
                      <Link href={`/blogs/${encodeURIComponent(post.slug)}`} className="nav-link">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          {/* 封面图片 */}
                          {post.coverImage && (
                            <div className="relative w-full sm:w-32 h-20 sm:h-24 flex-shrink-0 rounded-md overflow-hidden">
                              <motion.div
                                className="absolute inset-0"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                              >
                                <Image
                                  src={getAssetPath(post.coverImage)}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                  fill
                                  sizes="(max-width: 640px) 100vw, 128px"
                                  priority={index < 3}
                                />
                              </motion.div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                              <div className="absolute top-1 left-1">
                                <span className="bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded text-xs font-medium backdrop-blur-sm leading-none">
                                  {post.category}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <motion.h2 
                              className="text-sm font-semibold text-foreground mb-1 line-clamp-2"
                              whileHover={{ color: "var(--primary)" }}
                              transition={{ duration: 0.4 }}
                            >
                              {post.title}
                            </motion.h2>
                            
                            {post.excerpt && (
                              <p className="text-muted-foreground mb-1.5 text-sm line-clamp-2 leading-tight">
                                {post.excerpt}
                              </p>
                            )}
                            
                            {/* 标签 */}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mb-1.5">
                                {post.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1 py-0.5 bg-primary/10 text-primary text-xs rounded-sm border border-primary/15 leading-none"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {post.tags.length > 2 && (
                                  <span className="px-1 py-0.5 bg-primary/10 text-primary text-xs rounded-sm border border-primary/15 leading-none">
                                    +{post.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {post.author && (
                                    <div className="flex items-center gap-1 group/author">
                                      {post.author.avatar && (
                                        <div className="w-4 h-4 rounded-full overflow-hidden ring-1 ring-background group-hover/author:ring-primary transition-all duration-150">
                                          <Image
                                            src={getAssetPath(post.author.avatar)}
                                            alt={post.author.name}
                                            className="w-full h-full object-cover"
                                            width={16}
                                            height={16}
                                            sizes="16px"
                                          />
                                        </div>
                                      )}
                                      <span className="text-xs text-muted-foreground group-hover/author:text-foreground transition-colors font-medium">
                                        {post.author.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground group/date">
                                  <Calendar className="w-3 h-3 group-hover/date:text-primary transition-colors" />
                                  {formatDate(post.date)}
                                </span>
                              </div>
                              
                              <motion.div 
                                className="flex items-center gap-0.5 text-primary text-xs font-medium"
                                whileHover={{ gap: "0.25rem" }}
                                transition={{ duration: 0.4 }}
                              >
                                <span className="hidden sm:inline">阅读</span>
                                <motion.span
                                  whileHover={{ x: 2 }}
                                  transition={{ duration: 0.4 }}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </motion.span>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
              </div>
            )}
            
            {paginationData.currentPosts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-muted-foreground text-lg mb-2">
                  没有找到相关文章
                </p>
                <p className="text-muted-foreground text-sm">
                  试试调整搜索条件或浏览其他分类
                </p>
              </div>
            )}

            {/* 翻页器 */}
            {paginationData.totalPages > 1 && (
              <div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={paginationData.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* 右下角滚动控制组件 */}
      <Suspense fallback={null}>
        <LazyScrollToTop />
      </Suspense>
    </div>
  );
}