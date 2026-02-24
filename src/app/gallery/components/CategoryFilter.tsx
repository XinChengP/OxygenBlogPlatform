'use client';

import { ImageCategory } from '../../../types/gallery';

// CategoryFilter组件属性
interface CategoryFilterProps {
  categories: ImageCategory[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

// CategoryFilter组件
const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="sticky top-4">
      {/* 分类标题 */}
      <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">图片分类</h2>
      
      {/* 分类列表 */}
      <div className="flex flex-col gap-2">
        {/* 全部分类按钮 */}
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left ${selectedCategory === null
            ? 'bg-primary text-white shadow-md hover:shadow-lg hover:bg-primary/90'
            : 'bg-gray-100 text-gray-700 hover:bg-primary/10 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-primary/20'
          }`}
          onClick={() => onCategoryChange(null)}
        >
          全部 ({categories.reduce((sum, cat) => sum + cat.count, 0)})
        </button>
        
        {/* 各个分类按钮 */}
        {categories.map(category => (
          <button
            key={category.slug}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left ${selectedCategory === category.name
              ? 'bg-primary text-white shadow-md hover:shadow-lg hover:bg-primary/90'
              : 'bg-gray-100 text-gray-700 hover:bg-primary/10 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-primary/20'
            }`}
            onClick={() => onCategoryChange(category.name)}
          >
            {category.name} ({category.count})
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;