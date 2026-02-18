/**
 * 图片上传服务
 * 处理图片压缩、格式转换和本地存储
 */

import { ImageUploadResponse } from '@/types/moments';
import { MOMENT_VALIDATION } from '@/setting/momentsSetting';
import { validateImageUrl, globalAntiSpam } from '@/utils/securityUtils';

// 图片压缩配置
interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

// 默认压缩配置
const DEFAULT_COMPRESSION: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'image/webp'
};

class ImageUploadService {
  private static instance: ImageUploadService;
  
  private constructor() {}
  
  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }
  
  // 验证图片文件
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // 检查文件类型
    if (!MOMENT_VALIDATION.supportedImageFormats.includes(file.type)) {
      return { 
        valid: false, 
        error: `不支持的图片格式。支持的格式: ${MOMENT_VALIDATION.supportedImageExtensions.join(', ')}` 
      };
    }
    
    // 检查文件大小
    const maxSizeInBytes = MOMENT_VALIDATION.maxImageSize * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return { 
        valid: false, 
        error: `图片大小不能超过 ${MOMENT_VALIDATION.maxImageSize}MB` 
      };
    }
    
    return { valid: true };
  }
  
  // 压缩图片
  async compressImage(file: File, options: CompressionOptions = {}): Promise<Blob> {
    const config = { ...DEFAULT_COMPRESSION, ...options };
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('无法创建Canvas上下文'));
              return;
            }
            
            // 计算压缩后的尺寸
            let { width, height } = img;
            
            if (width > config.maxWidth! || height > config.maxHeight!) {
              const aspectRatio = width / height;
              
              if (width > height) {
                width = config.maxWidth!;
                height = width / aspectRatio;
              } else {
                height = config.maxHeight!;
                width = height * aspectRatio;
              }
            }
            
            // 设置Canvas尺寸
            canvas.width = width;
            canvas.height = height;
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为Blob
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('图片压缩失败'));
                }
              },
              config.format,
              config.quality
            );
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // 生成文件名
  private generateFileName(originalName: string, format: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    const extension = format.split('/')[1];
    
    return `moment-${timestamp}-${random}.${extension}`;
  }
  
  // 上传到本地存储（使用Base64编码）
  async uploadToLocal(file: File, options?: CompressionOptions): Promise<ImageUploadResponse> {
    try {
      // 防重复提交检查
      const spamKey = `image_upload_${file.name}`;
      const spamCheck = globalAntiSpam.canSubmit(spamKey);
      
      if (!spamCheck.can) {
        throw new Error(`上传太频繁，请稍后再试（还需等待${Math.ceil((spamCheck.remainingMs || 0) / 1000)}秒）`);
      }
      
      // 验证文件
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // 压缩图片
      const compressedBlob = await this.compressImage(file, options);
      
      // 转换为Base64
      const base64 = await this.blobToBase64(compressedBlob);
      
      // 验证生成的数据URL
      const dataUrl = `data:${compressedBlob.type};base64,${base64}`;
      const urlValidation = validateImageUrl(dataUrl);
      if (!urlValidation.valid) {
        throw new Error(urlValidation.error);
      }
      
      // 生成文件名
      const fileName = this.generateFileName(file.name, compressedBlob.type);
      
      // 保存到localStorage（实际项目中应该上传到云存储）
      const imageData = {
        base64,
        fileName,
        mimeType: compressedBlob.type,
        size: compressedBlob.size,
        uploadedAt: new Date().toISOString()
      };
      
      // 获取现有图片存储
      const existingImages = this.getStoredImages();
      existingImages[fileName] = imageData;
      
      // 保存到localStorage
      localStorage.setItem('moment-images', JSON.stringify(existingImages));
      
      // 记录提交时间
      globalAntiSpam.recordSubmission(spamKey);
      
      return {
        url: dataUrl,
        filename: fileName,
        size: compressedBlob.size,
        mimeType: compressedBlob.type
      };
    } catch (error) {
      console.error('图片上传失败:', error);
      throw error;
    }
  }
  
  // 获取存储的图片
  getStoredImages(): Record<string, any> {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem('moment-images');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('获取存储图片失败:', error);
      return {};
    }
  }
  
  // 删除存储的图片
  deleteStoredImage(fileName: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const existingImages = this.getStoredImages();
      delete existingImages[fileName];
      localStorage.setItem('moment-images', JSON.stringify(existingImages));
    } catch (error) {
      console.error('删除图片失败:', error);
    }
  }
  
  // Blob转Base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除data URL前缀，只保留Base64数据
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Base64转换失败'));
      reader.readAsDataURL(blob);
    });
  }
  
  // 获取图片尺寸
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
  
  // 生成缩略图
  async generateThumbnail(file: File, maxSize: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('无法创建Canvas上下文'));
            return;
          }
          
          // 计算缩略图尺寸
          let { width, height } = img;
          
          if (width > height) {
            width = maxSize;
            height = (img.height / img.width) * maxSize;
          } else {
            height = maxSize;
            width = (img.width / img.height) * maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 绘制缩略图
          ctx.drawImage(img, 0, 0, width, height);
          
          // 转换为Base64
          resolve(canvas.toDataURL('image/webp', 0.7));
        };
        
        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsDataURL(file);
    });
  }
}

// 创建服务实例
export const imageUploadService = new ImageUploadService();

export default imageUploadService;