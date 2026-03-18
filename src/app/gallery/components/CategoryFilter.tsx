'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageCategoryTree } from '../../../types/gallery';
import { FolderOpen, Layers, ChevronDown, ChevronRight, FileImage } from 'lucide-react';

// CategoryFilter组件属性
interface CategoryFilterProps {
  categories: ImageCategoryTree[];
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  onCategoryChange: (category: string | null, subCategory?: string | null) => void;
  getGlassStyle: (baseStyle: string) => string;
}

// 分类项组件
interface CategoryItemProps {
  category: ImageCategoryTree;
  level: number;
  isExpanded: boolean;
  onToggleExpand: (categoryName: string) => void;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  onCategoryChange: (category: string | null, subCategory?: string | null) => void;
  index: number;
}

const CategoryItem = ({ 
  category, 
  level, 
  isExpanded, 
  onToggleExpand, 
  selectedCategory, 
  selectedSubCategory, 
  onCategoryChange, 
  index 
}: CategoryItemProps) => {
  const isSelected = selectedCategory === category.name && !selectedSubCategory;
  
  return (
    <div className="space-y-1">
      {/* 主分类项 */}
      <motion.button
        className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between group ${
          isSelected
            ? 'bg-primary/20 text-primary shadow-sm'
            : 'hover:bg-muted text-foreground hover:text-primary'
        }`}
        style={{ paddingLeft: `${level * 12 + 16}px` }}
        onClick={() => onCategoryChange(category.name, null)}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <div className="flex items-center gap-2 flex-1">
          {/* 分类图标 */}
          <FolderOpen className={`w-4 h-4 ${
            isSelected 
              ? 'text-primary' 
              : 'text-muted-foreground group-hover:text-primary transition-colors'
          }`} />
          {/* 分类名称 */}
          <span>{category.name}</span>
        </div>
        {/* 图片数量 */}
        <span className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
          isSelected 
            ? 'bg-primary/30 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {category.count}
        </span>
      </motion.button>
      
      {/* 展开/折叠按钮 - 独立于主按钮之外 */}
      {category.subCategories && category.subCategories.length > 0 && (
        <motion.button
          onClick={() => onToggleExpand(category.name)}
          className="w-full px-4 py-1 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
          style={{ paddingLeft: `${level * 12 + 28}px` }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="text-xs">{isExpanded ? '收起子分类' : `展开 ${category.subCategories.length} 个子分类`}</span>
        </motion.button>
      )}
      
      {/* 子分类列表 */}
      {category.subCategories && category.subCategories.length > 0 && isExpanded && (
        <div className="space-y-1">
          {category.subCategories.map((subCategory, subIndex) => {
            const isSubSelected = selectedCategory === category.name && selectedSubCategory === subCategory.name;
            
            return (
              <motion.button
                key={subCategory.slug}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between group ${
                  isSubSelected
                    ? 'bg-primary/20 text-primary shadow-sm'
                    : 'hover:bg-muted text-foreground hover:text-primary'
                }`}
                style={{ paddingLeft: `${(level + 1) * 12 + 16}px` }}
                onClick={() => onCategoryChange(category.name, subCategory.name)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: (index * 10 + subIndex) * 0.02 }}
              >
                <span className="flex items-center gap-2">
                  <FileImage className={`w-4 h-4 ${
                    isSubSelected 
                      ? 'text-primary' 
                      : 'text-muted-foreground group-hover:text-primary transition-colors'
                  }`} />
                  <span>{subCategory.name}</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  isSubSelected 
                    ? 'bg-primary/30 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {subCategory.count}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// CategoryFilter组件
const CategoryFilter = ({ 
  categories, 
  selectedCategory, 
  selectedSubCategory, 
  onCategoryChange, 
  getGlassStyle 
}: CategoryFilterProps) => {
  // 调试日志：输出接收到的分类数据
  console.log('[CategoryFilter] 接收到的分类:', categories.map(c => ({
    name: c.name,
    count: c.count,
    hasSubCategories: !!c.subCategories,
    subCategoriesCount: c.subCategories?.length || 0
  })));
  
  // 计算总图片数
  const totalImages = categories.reduce((sum, cat) => sum + cat.count, 0);
  
  // 展开状态管理 - 默认展开所有有子分类的分类
  const defaultExpanded = categories
    .filter(c => c.subCategories && c.subCategories.length > 0)
    .map(c => c.name);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([
    '表情包', '美图', ...defaultExpanded  // 默认展开的分类
  ]));
  
  // 切换展开状态
  const toggleExpand = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className={getGlassStyle("rounded-lg border p-4")}>
      {/* 分类标题 */}
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">图片分类</h2>
      </div>
      
      {/* 分类列表 */}
      <div className="space-y-1">
        {/* 全部分类按钮 */}
        <motion.button
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between group ${
            !selectedCategory && !selectedSubCategory
              ? 'bg-primary/20 text-primary shadow-sm'
              : 'hover:bg-muted text-foreground hover:text-primary'
          }`}
          onClick={() => onCategoryChange(null, null)}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="flex items-center gap-2">
            <FolderOpen className={`w-4 h-4 ${
              !selectedCategory && !selectedSubCategory 
                ? 'text-primary' 
                : 'text-muted-foreground group-hover:text-primary transition-colors'
            }`} />
            <span>全部</span>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
            !selectedCategory && !selectedSubCategory 
              ? 'bg-primary/30 text-primary' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {totalImages}
          </span>
        </motion.button>
        
        {/* 树形分类列表 */}
        {categories.map((category, index) => (
          <CategoryItem
            key={category.slug}
            category={category}
            level={0}
            isExpanded={expandedCategories.has(category.name)}
            onToggleExpand={toggleExpand}
            selectedCategory={selectedCategory}
            selectedSubCategory={selectedSubCategory}
            onCategoryChange={onCategoryChange}
            index={index + 1} // +1 是因为全部分类占了第一个位置
          />
        ))}
      </div>

      {/* 底部提示 */}
      <motion.div 
        className="mt-4 pt-4 border-t border-border/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p className="text-xs text-muted-foreground text-center">
          点击分类筛选图片
        </p>
      </motion.div>
    </div>
  );
};

export default CategoryFilter;
