'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AdminLayout from '../../../../admin/components/AdminLayout';
import type { BlogPostForAdmin } from '../../../../admin/types';

// 动态导入Markdown编辑器，避免SSR问题
const MarkdownEditor = dynamic(() => import('@/components/tools/MarkdownEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )
});

/**
 * 博文编辑页面
 * 支持新建和编辑博文
 */
export default function BlogEditorPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const isNew = slug === 'new';

  // 博文状态
  const [blog, setBlog] = useState<Partial<BlogPostForAdmin>>({
    title: '',
    slug: '',
    date: new Date().toISOString().split('T')[0],
    category: '技术',
    tags: [],
    excerpt: '',
    coverImage: '',
    content: '',
    pinned: false,
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // 加载博文数据（编辑模式）
  useEffect(() => {
    if (!isNew) {
      loadBlog();
    }
  }, [isNew]);

  // 加载博文
  const loadBlog = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/blogs');
      const blogs = await res.json();
      const targetBlog = blogs.find((b: BlogPostForAdmin) => b.slug === slug);
      
      if (targetBlog) {
        setBlog(targetBlog);
      } else {
        setMessage({ text: '博文不存在', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: '加载博文失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !blog.tags?.includes(tagInput.trim())) {
      setBlog({
        ...blog,
        tags: [...(blog.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    setBlog({
      ...blog,
      tags: blog.tags?.filter(tag => tag !== tagToRemove),
    });
  };

  // 保存博文
  const saveBlog = async () => {
    // 验证必填字段
    if (!blog.title || !blog.slug || !blog.date || !blog.category || !blog.content) {
      setMessage({ text: '请填写所有必填字段', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blog),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        // 保存成功后跳转到列表页
        setTimeout(() => router.push('/admin/blogs'), 1500);
      } else {
        // 显示详细错误信息
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || '保存失败';
        setMessage({ text: errorMessage, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isNew ? '新建博文' : '编辑博文'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isNew ? '创建一篇新的博客文章' : '修改现有博客文章'}
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/blogs')}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            ← 返回列表
          </button>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 编辑表单 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* 标题和Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  标题 *
                </label>
                <input
                  type="text"
                  value={blog.title || ''}
                  onChange={(e) => setBlog({ ...blog, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入博文标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  value={blog.slug || ''}
                  onChange={(e) => setBlog({ ...blog, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="my-blog-post"
                  disabled={!isNew}
                />
                {!isNew && (
                  <p className="text-xs text-gray-500 mt-1">Slug 创建后不可修改</p>
                )}
              </div>
            </div>

            {/* 日期和分类 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  日期 *
                </label>
                <input
                  type="date"
                  value={blog.date || ''}
                  onChange={(e) => setBlog({ ...blog, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  分类 *
                </label>
                {!showNewCategoryInput ? (
                  <select
                    value={blog.category || ''}
                    onChange={(e) => {
                      if (e.target.value === '新增') {
                        setShowNewCategoryInput(true);
                      } else {
                        setBlog({ ...blog, category: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="技术">技术</option>
                    <option value="生活">生活</option>
                    <option value="洛天依">洛天依</option>
                    <option value="学习">学习</option>
                    <option value="新增">新增</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategory.trim()) {
                          setBlog({ ...blog, category: newCategory.trim() });
                          setShowNewCategoryInput(false);
                          setNewCategory('');
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入新分类"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (newCategory.trim()) {
                          setBlog({ ...blog, category: newCategory.trim() });
                          setShowNewCategoryInput(false);
                          setNewCategory('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      确定
                    </button>
                    <button
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategory('');
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 封面图片和置顶 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  封面图片
                </label>
                <input
                  type="text"
                  value={blog.coverImage || ''}
                  onChange={(e) => setBlog({ ...blog, coverImage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="/path/to/image.png"
                />
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          const res = await fetch('/api/admin/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          const data = await res.json();
                          if (data.success) {
                            setBlog({ ...blog, coverImage: data.url });
                            setMessage({ text: '图片上传成功！', type: 'success' });
                            setTimeout(() => setMessage(null), 3000);
                          } else {
                            setMessage({ text: data.error || '上传失败', type: 'error' });
                          }
                        } catch (error) {
                          setMessage({ text: '上传失败', type: 'error' });
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                {/* 封面图片预览 */}
                {blog.coverImage && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      预览
                    </label>
                    <div className="relative w-full max-w-md">
                      <img
                        src={blog.coverImage}
                        alt="封面图片预览"
                        className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                      />
                      <button
                        onClick={() => setBlog({ ...blog, coverImage: '' })}
                        className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                        title="清除图片"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blog.pinned || false}
                    onChange={(e) => setBlog({ ...blog, pinned: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    置顶文章
                  </span>
                </label>
              </div>
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                标签
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {blog.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入标签后按 Enter 添加"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  添加
                </button>
              </div>
            </div>

            {/* 摘要 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                摘要
              </label>
              <textarea
                value={blog.excerpt || ''}
                onChange={(e) => setBlog({ ...blog, excerpt: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="文章摘要..."
              />
            </div>

            {/* 内容 - 使用Markdown编辑器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                内容 *
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <MarkdownEditor 
                  initialContent={blog.content || ''}
                  height="600px"
                  blogMode={true}
                  onSave={(content) => {
                    setBlog({ ...blog, content });
                  }}
                  onContentChange={(content) => {
                    setBlog({ ...blog, content });
                  }}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => router.push('/admin/blogs')}
                className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveBlog}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存博文'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
