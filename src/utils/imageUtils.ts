/**
 * 图片处理工具 - 纯客户端实现
 * 用于在静态环境下处理图片上传和压缩
 */

export interface ImageProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULT_OPTIONS: ImageProcessOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'image/webp'
};

/**
 * 验证图片文件
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: '文件无效' };
  }

  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `不支持的图片格式。支持的格式: ${allowedTypes.join(', ')}` 
    };
  }
  
  // 检查文件大小 (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `图片大小不能超过 5MB` 
    };
  }
  
  return { valid: true };
}

/**
 * 压缩图片
 */
export async function compressImage(file: File, options: ImageProcessOptions = {}): Promise<Blob> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
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

/**
 * 文件转Base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Blob转Base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data URL前缀，只保留Base64数据
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 生成缩略图
 */
export async function generateThumbnail(file: File, maxSize: number = 200): Promise<string> {
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

/**
 * 获取图片尺寸
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
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

/**
 * 本地存储图片管理
 */
export class LocalImageStorage {
  private static instance: LocalImageStorage;
  private readonly maxStorageSize = 50 * 1024 * 1024; // 50MB 总限制
  private readonly maxImages = 100; // 最多存储100张图片

  static getInstance(): LocalImageStorage {
    if (!LocalImageStorage.instance) {
      LocalImageStorage.instance = new LocalImageStorage();
    }
    return LocalImageStorage.instance;
  }

  /**
   * 保存图片到本地存储
   */
  async saveImage(base64: string, filename: string): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('浏览器环境不支持本地存储');
    }

    try {
      // 获取现有图片存储
      const existingImages = this.getStoredImages();
      
      // 检查存储限制
      if (Object.keys(existingImages).length >= this.maxImages) {
        throw new Error('已达到最大图片存储数量限制');
      }

      // 计算base64数据大小（大致估算）
      const imageSize = Math.ceil(base64.length * 0.75); // base64编码的大致大小
      
      // 检查总存储大小
      const totalSize = this.getTotalStorageSize(existingImages) + imageSize;
      if (totalSize > this.maxStorageSize) {
        throw new Error('已达到最大存储空间限制');
      }

      // 保存图片数据
      const imageData = {
        base64,
        filename,
        size: imageSize,
        uploadedAt: new Date().toISOString(),
        mimeType: this.detectMimeType(base64)
      };

      existingImages[filename] = imageData;
      localStorage.setItem('moment-images', JSON.stringify(existingImages));
      
      return filename;
    } catch (error) {
      console.error('保存图片失败:', error);
      throw error;
    }
  }

  /**
   * 获取存储的图片
   */
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

  /**
   * 获取图片数据
   */
  getImage(filename: string): string | null {
    const images = this.getStoredImages();
    return images[filename]?.base64 || null;
  }

  /**
   * 删除图片
   */
  deleteImage(filename: string): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const existingImages = this.getStoredImages();
      
      if (existingImages[filename]) {
        delete existingImages[filename];
        localStorage.setItem('moment-images', JSON.stringify(existingImages));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('删除图片失败:', error);
      return false;
    }
  }

  /**
   * 清理过期图片（7天前的图片）
   */
  cleanupExpiredImages(): number {
    if (typeof window === 'undefined') return 0;
    
    try {
      const existingImages = this.getStoredImages();
      const now = new Date().getTime();
      const expiryTime = 7 * 24 * 60 * 60 * 1000; // 7天
      
      let deletedCount = 0;
      const cleanedImages: Record<string, any> = {};
      
      for (const [filename, data] of Object.entries(existingImages)) {
        const uploadTime = new Date(data.uploadedAt).getTime();
        
        if (now - uploadTime < expiryTime) {
          cleanedImages[filename] = data;
        } else {
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        localStorage.setItem('moment-images', JSON.stringify(cleanedImages));
      }
      
      return deletedCount;
    } catch (error) {
      console.error('清理过期图片失败:', error);
      return 0;
    }
  }

  /**
   * 获取总存储大小
   */
  private getTotalStorageSize(images: Record<string, any>): number {
    return Object.values(images).reduce((total, image) => total + (image.size || 0), 0);
  }

  /**
   * 检测MIME类型
   */
  private detectMimeType(base64: string): string {
    if (base64.startsWith('data:image/webp')) return 'image/webp';
    if (base64.startsWith('data:image/png')) return 'image/png';
    if (base64.startsWith('data:image/jpeg')) return 'image/jpeg';
    if (base64.startsWith('data:image/jpg')) return 'image/jpg';
    return 'image/webp'; // 默认
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats() {
    const images = this.getStoredImages();
    const totalImages = Object.keys(images).length;
    const totalSize = this.getTotalStorageSize(images);
    
    return {
      totalImages,
      totalSize,
      maxImages: this.maxImages,
      maxStorageSize: this.maxStorageSize,
      usagePercentage: (totalSize / this.maxStorageSize) * 100
    };
  }
}

// 导出单例实例
export const localImageStorage = LocalImageStorage.getInstance();