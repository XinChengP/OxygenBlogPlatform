/**
 * 发布说说组件
 * 支持文字输入、图片上传、心情选择
 */

'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  PhotoIcon, 
  FaceSmileIcon,
  PaperAirplaneIcon 
} from '@heroicons/react/24/outline';
import { 
  FaceSmileIcon as FaceSmileSolid 
} from '@heroicons/react/24/solid';

import { MoodType, CreateMomentRequest } from '@/types/moments';
import { 
  MOMENT_VALIDATION, 
  MOOD_CONFIGS,
  getAllMoodConfigs 
} from '@/setting/momentsSetting';
import { imageUploadService } from '@/services/imageUploadService';

interface CreateMomentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMomentRequest) => void;
  loading?: boolean;
}

export default function CreateMomentModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  loading = false 
}: CreateMomentModalProps) {
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | undefined>();
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 处理文字输入
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MOMENT_VALIDATION.maxContentLength) {
      setContent(value);
    }
  };
  
  // 处理图片选择
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    
    setUploadingImages(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 验证图片
        const validation = imageUploadService.validateImageFile(file);
        if (!validation.valid) {
          alert(validation.error);
          continue;
        }
        
        // 检查总数限制
        if (images.length + newFiles.length >= MOMENT_VALIDATION.maxImages) {
          alert(`最多只能上传${MOMENT_VALIDATION.maxImages}张图片`);
          break;
        }
        
        newFiles.push(file);
        
        // 生成预览
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newPreviews.push(event.target.result as string);
            if (newPreviews.length === newFiles.length) {
              setImages(prev => [...prev, ...newFiles]);
              setImagePreviews(prev => [...prev, ...newPreviews]);
              setUploadingImages(false);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('图片处理失败:', error);
      alert('图片处理失败，请重试');
      setUploadingImages(false);
    }
  };
  
  // 删除图片
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  // 提交表单
  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('请输入说说内容');
      return;
    }
    
    onSubmit({
      content: content.trim(),
      images,
      mood: selectedMood
    });
  };
  
  // 选择心情
  const selectMood = (mood: MoodType) => {
    setSelectedMood(selectedMood === mood ? undefined : mood);
    setShowMoodSelector(false);
  };
  
  // 清空表单
  const resetForm = () => {
    setContent('');
    setSelectedMood(undefined);
    setImages([]);
    setImagePreviews([]);
    setShowMoodSelector(false);
  };
  
  // 关闭弹窗
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />
          
          {/* 弹窗内容 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                发布说说
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* 心情选择 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    心情状态
                  </span>
                  {selectedMood && (
                    <button
                      onClick={() => setSelectedMood(undefined)}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      清除
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowMoodSelector(!showMoodSelector)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${
                    selectedMood 
                      ? getAllMoodConfigs().find(m => m.type === selectedMood)?.color 
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {selectedMood ? (
                    <>
                      <span className="mr-2">{getAllMoodConfigs().find(m => m.type === selectedMood)?.emoji}</span>
                      {getAllMoodConfigs().find(m => m.type === selectedMood)?.label}
                    </>
                  ) : (
                    <>
                      <FaceSmileIcon className="w-5 h-5 mr-2" />
                      选择心情
                    </>
                  )}
                </button>
                
                {/* 心情选择器 */}
                <AnimatePresence>
                  {showMoodSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="grid grid-cols-4 gap-3">
                        {getAllMoodConfigs().map((mood) => (
                          <button
                            key={mood.type}
                            onClick={() => selectMood(mood.type)}
                            className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                              selectedMood === mood.type
                                ? `${mood.color} border-opacity-100`
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <span className="text-2xl mb-1">{mood.emoji}</span>
                            <span className="text-xs font-medium">{mood.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* 内容输入 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    说说内容
                  </label>
                  <span className={`text-xs ${
                    content.length > MOMENT_VALIDATION.maxContentLength * 0.9 
                      ? 'text-red-500' 
                      : 'text-gray-500'
                  }`}>
                    {content.length}/{MOMENT_VALIDATION.maxContentLength}
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="分享你的生活点滴..."
                  className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                />
              </div>
              
              {/* 图片上传 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    图片 ({images.length}/{MOMENT_VALIDATION.maxImages})
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={images.length >= MOMENT_VALIDATION.maxImages || uploadingImages}
                    className="text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                  >
                    <PhotoIcon className="w-4 h-4 inline mr-1" />
                    添加图片
                  </button>
                </div>
                
                {/* 图片预览 */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={preview}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={images.length >= MOMENT_VALIDATION.maxImages || uploadingImages}
                />
              </div>
            </div>
            
            {/* 底部按钮 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || loading || uploadingImages}
                className="inline-flex items-center px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    发布中...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                    发布
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}