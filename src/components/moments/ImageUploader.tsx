'use client';

import { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { validateImageFile, compressImage, localImageStorage } from '@/utils/imageUtils';
import GalleryImageSelector from './GalleryImageSelector';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

export default function ImageUploader({ 
  images = [], 
  onImagesChange, 
  maxImages = 100, 
  className = '' 
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showGallerySelector, setShowGallerySelector] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [...images];
    const remainingSlots = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        
        // 验证图片文件
        const validation = validateImageFile(file);
        if (!validation.valid) {
          alert(validation.error);
          continue;
        }

        // 压缩图片
        const compressedBlob = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8
        });

        // 转换为Base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressedBlob);
        });

        // 生成唯一文件名
        const filename = `moment-${Date.now()}-${i}.webp`;
        
        // 保存到本地存储
        await localImageStorage.saveImage(base64, filename);
        
        // 添加到图片数组
        newImages.push(base64);
        
        // 更新进度
        setUploadProgress(Math.round(((i + 1) / filesToProcess.length) * 100));
      }

      // 更新父组件
      onImagesChange(newImages);
    } catch (error) {
      console.error('图片上传失败:', error);
      alert('图片上传失败，请重试');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // 重置文件输入
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleClearAll = () => {
    onImagesChange([]);
  };

  const handleGallerySelect = (selectedImages: string[]) => {
    // 确保不超过最大图片数量
    const combinedImages = [...images, ...selectedImages].slice(0, maxImages);
    onImagesChange(combinedImages);
    setShowGallerySelector(false);
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">上传图片</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGallerySelector(true)}
            className="text-xs text-primary hover:text-primary/80"
            disabled={images.length >= maxImages}
          >
            从画廊选择
          </button>
          {images.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清空
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* 已上传的图片 */}
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square overflow-hidden rounded-md">
            <img
              src={image}
              alt={`已上传图片 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleRemoveImage(index)}
              className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              aria-label="删除图片"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* 上传按钮 */}
        {images.length < maxImages && (
          <label className="aspect-square border-2 border-dashed border-muted rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="text-center p-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">{uploadProgress}%</span>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <PlusIcon className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">
                  {images.length === 0 ? '添加图片' : `${images.length}/${maxImages}`}
                </span>
              </div>
            )}
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        支持上传多张图片，每张不超过5MB
      </p>

      {/* 画廊图片选择器 */}
      <GalleryImageSelector
        isOpen={showGallerySelector}
        onClose={() => setShowGallerySelector(false)}
        onSelect={handleGallerySelect}
        maxImages={maxImages - images.length}
        selectedImages={images}
      />
    </div>
  );
}
