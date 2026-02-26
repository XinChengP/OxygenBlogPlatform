'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../../admin/components/AdminLayout';
import type { MomentForAdmin } from '../../../../admin/types';

/**
 * 动态编辑页面
 * 支持新建和编辑动态
 */
export default function MomentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  // 动态状态
  const [moment, setMoment] = useState<Partial<MomentForAdmin>>({
    id: isNew ? Date.now().toString() : id,
    time: new Date().toISOString().slice(0, 16),
    tags: [],
    images: [],
    content: '',
    pinned: false,
  });

  const [tagInput, setTagInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 加载动态数据（编辑模式）
  useEffect(() => {
    if (!isNew) {
      loadMoment();
    }
  }, [isNew]);

  // 加载动态
  const loadMoment = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/moments');
      const moments = await res.json();
      const targetMoment = moments.find((m: MomentForAdmin) => m.id === id);
      
      if (targetMoment) {
        // 处理日期时间格式，确保兼容 datetime-local 输入
        let formattedTime = targetMoment.time;
        try {
          // 尝试将各种时间格式转换为 ISO 格式
          const date = new Date(targetMoment.time);
          if (!isNaN(date.getTime())) {
            formattedTime = date.toISOString().slice(0, 16);
          }
        } catch (e) {
          console.error('时间格式转换错误:', e);
        }
        
        setMoment({
          ...targetMoment,
          time: formattedTime
        });
      } else {
        setMessage({ text: '动态不存在', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: '加载动态失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !moment.tags?.includes(tagInput.trim())) {
      setMoment({
        ...moment,
        tags: [...(moment.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    setMoment({
      ...moment,
      tags: moment.tags?.filter(tag => tag !== tagToRemove),
    });
  };

  // 添加图片
  const addImage = () => {
    if (imageInput.trim() && !moment.images?.includes(imageInput.trim())) {
      setMoment({
        ...moment,
        images: [...(moment.images || []), imageInput.trim()],
      });
      setImageInput('');
    }
  };

  // 删除图片
  const removeImage = (imageToRemove: string) => {
    setMoment({
      ...moment,
      images: moment.images?.filter(image => image !== imageToRemove),
    });
  };

  // 保存动态
  const saveMoment = async () => {
    // 验证必填字段
    if (!moment.id || !moment.time || !moment.content) {
      setMessage({ text: '请填写所有必填字段', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // 转换时间格式为 YYYY-MM-DD HH:MM:SS
      let formattedTime = moment.time as string;
      // 确保时间格式正确转换，无论输入格式如何
      if (typeof formattedTime === 'string') {
        if (formattedTime.includes('T')) {
          // 将 datetime-local 格式转换为 YYYY-MM-DD HH:MM:SS
          formattedTime = formattedTime.replace('T', ' ') + ':00';
        } else if (formattedTime.length === 16) {
          // 如果是 YYYY-MM-DD HH:MM 格式，添加秒数
          formattedTime += ':00';
        }
      }

      const res = await fetch('/api/admin/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...moment,
          time: formattedTime
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        // 保存成功后跳转到列表页
        setTimeout(() => router.push('/admin/moments'), 1500);
      } else {
        setMessage({ text: data.error || '保存失败', type: 'error' });
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
              {isNew ? '新建动态' : '编辑动态'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isNew ? '发布一条新的个人动态' : '修改现有动态'}
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/moments')}
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
            {/* ID和时间 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID *
                </label>
                <input
                  type="text"
                  value={moment.id || ''}
                  onChange={(e) => setMoment({ ...moment, id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="动态唯一ID"
                  disabled={!isNew}
                />
                {!isNew && (
                  <p className="text-xs text-gray-500 mt-1">ID 创建后不可修改</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  时间 *
                </label>
                <input
                  type="datetime-local"
                  value={moment.time || ''}
                  onChange={(e) => setMoment({ ...moment, time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 置顶选项 */}
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moment.pinned || false}
                  onChange={(e) => setMoment({ ...moment, pinned: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  置顶动态
                </span>
              </label>
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                标签
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {moment.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
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

            {/* 内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                内容 *
              </label>
              <textarea
                value={moment.content || ''}
                onChange={(e) => setMoment({ ...moment, content: e.target.value })}
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="动态内容..."
              />
            </div>

            {/* 图片 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                图片
              </label>
              <div 
                className="flex flex-wrap gap-2 mb-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedIndex = Number(e.dataTransfer.getData('text/plain'));
                  const targetIndex = Array.from(e.currentTarget.children).indexOf(e.target.closest('span'));
                  
                  if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
                    const newImages = [...(moment.images || [])];
                    const [draggedImage] = newImages.splice(draggedIndex, 1);
                    newImages.splice(targetIndex, 0, draggedImage);
                    setMoment({ ...moment, images: newImages });
                  }
                }}
              >
                {moment.images?.map((image, index) => (
                  <span
                    key={image}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 max-w-full cursor-move"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedIndex = Number(e.dataTransfer.getData('text/plain'));
                      if (draggedIndex !== index) {
                        const newImages = [...(moment.images || [])];
                        const [draggedImage] = newImages.splice(draggedIndex, 1);
                        newImages.splice(index, 0, draggedImage);
                        setMoment({ ...moment, images: newImages });
                      }
                    }}
                  >
                    <span className="truncate max-w-xs">{image}</span>
                    <button
                      onClick={() => removeImage(image)}
                      className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入图片URL后按 Enter 添加"
                />
                <button
                  onClick={addImage}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  添加
                </button>
              </div>
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (files) {
                      try {
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          const res = await fetch('/api/admin/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          const data = await res.json();
                          if (data.success) {
                            setMoment({
                              ...moment,
                              images: [...(moment.images || []), data.url]
                            });
                          } else {
                            setMessage({ text: data.error || '上传失败', type: 'error' });
                          }
                        }
                        if (files.length > 0) {
                          setMessage({ text: `成功上传 ${files.length} 张图片！`, type: 'success' });
                          setTimeout(() => setMessage(null), 3000);
                        }
                      } catch (error) {
                        setMessage({ text: '上传失败', type: 'error' });
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">点击上传图片或拖拽到此处</p>
              </div>
              {/* 图片预览 */}
              {moment.images && moment.images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    图片预览
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {moment.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`图片 ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                        />
                        <button
                          onClick={() => removeImage(image)}
                          className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                          title="删除图片"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => router.push('/admin/moments')}
                className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveMoment}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存动态'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
