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
    <div className="flex flex-wrap justify-center gap-2">
      {/* 全部分类按钮 */}
      <button
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === null
          ? 'bg-blue-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
        onClick={() => onCategoryChange(null)}
      >
        全部 ({categories.reduce((sum, cat) => sum + cat.count, 0)})
      </button>
      
      {/* 各个分类按钮 */}
      {categories.map(category => (
        <button
          key={category.slug}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category.name
            ? 'bg-blue-500 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          onClick={() => onCategoryChange(category.name)}
        >
          {category.name} ({category.count})
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;