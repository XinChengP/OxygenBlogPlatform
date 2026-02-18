/**
 * 说说（动态）数据管理服务
 * 基于本地存储的静态解决方案，适用于GitHub Pages部署
 */

import { 
  Moment, 
  Comment, 
  CreateMomentRequest, 
  UpdateMomentRequest, 
  CreateCommentRequest,
  MomentsResponse,
  MomentsStats,
  CachedMoment,
  UserAuth
} from '@/types/moments';
import { 
  STORAGE_KEYS, 
  MOMENTS_PAGINATION,
  MOMENTS_DEFAULTS,
  MOMENT_VALIDATION
} from '@/setting/momentsSetting';
import { 
  sanitizeMomentContent, 
  sanitizeCommentContent,
  validateContentLength,
  globalAntiSpam
} from '@/utils/securityUtils';

// 本地存储管理器
class MomentsStorageManager {
  private static instance: MomentsStorageManager;
  
  private constructor() {}
  
  static getInstance(): MomentsStorageManager {
    if (!MomentsStorageManager.instance) {
      MomentsStorageManager.instance = new MomentsStorageManager();
    }
    return MomentsStorageManager.instance;
  }
  
  // 获取说说数据
  getMoments(): Moment[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.MOMENTS_CACHE);
      if (!cached) return [];
      
      const moments = JSON.parse(cached) as CachedMoment[];
      // 清理过期缓存（7天）
      const now = Date.now();
      const validMoments = moments.filter(moment => {
        const cacheAge = now - moment._cachedAt;
        return cacheAge < 7 * 24 * 60 * 60 * 1000; // 7天
      });
      
      // 转换为标准格式
      return validMoments.map(moment => {
        const { _cachedAt, _isDirty, ...cleanMoment } = moment;
        return cleanMoment;
      });
    } catch (error) {
      console.error('获取说说数据失败:', error);
      return [];
    }
  }
  
  // 保存说说数据
  saveMoments(moments: Moment[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cachedMoments: CachedMoment[] = moments.map(moment => ({
        ...moment,
        _cachedAt: Date.now()
      }));
      
      localStorage.setItem(STORAGE_KEYS.MOMENTS_CACHE, JSON.stringify(cachedMoments));
    } catch (error) {
      console.error('保存说说数据失败:', error);
    }
  }
  
  // 获取用户身份
  getUserAuth(): UserAuth {
    if (typeof window === 'undefined') {
      return {
        userId: 'anonymous',
        username: '访客'
      };
    }
    
    try {
      const auth = localStorage.getItem(STORAGE_KEYS.USER_IDENTITY);
      if (auth) {
        return JSON.parse(auth);
      }
    } catch (error) {
      console.error('获取用户身份失败:', error);
    }
    
    // 默认身份
    return {
      userId: MOMENTS_DEFAULTS.defaultUserId,
      username: MOMENTS_DEFAULTS.defaultAuthor
    };
  }
  
  // 保存用户身份
  saveUserAuth(auth: UserAuth): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.USER_IDENTITY, JSON.stringify(auth));
    } catch (error) {
      console.error('保存用户身份失败:', error);
    }
  }
  
  // 获取点赞状态
  getLikedItems(): { moments: string[], comments: string[] } {
    if (typeof window === 'undefined') return { moments: [], comments: [] };
    
    try {
      const likedMoments = localStorage.getItem(STORAGE_KEYS.LIKED_MOMENTS);
      const likedComments = localStorage.getItem(STORAGE_KEYS.LIKED_COMMENTS);
      
      return {
        moments: likedMoments ? JSON.parse(likedMoments) : [],
        comments: likedComments ? JSON.parse(likedComments) : []
      };
    } catch (error) {
      console.error('获取点赞状态失败:', error);
      return { moments: [], comments: [] };
    }
  }
  
  // 保存点赞状态
  saveLikedItems(likedMoments: string[], likedComments: string[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.LIKED_MOMENTS, JSON.stringify(likedMoments));
      localStorage.setItem(STORAGE_KEYS.LIKED_COMMENTS, JSON.stringify(likedComments));
    } catch (error) {
      console.error('保存点赞状态失败:', error);
    }
  }
}

// 说说服务类
export class MomentsService {
  private storage = MomentsStorageManager.getInstance();
  
  // 生成唯一ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 验证说说内容
  private validateContent(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.length >= MOMENT_VALIDATION.minContentLength && 
           trimmed.length <= MOMENT_VALIDATION.maxContentLength;
  }
  
  // 获取说说列表（分页）
  async getMoments(page: number = 1, pageSize: number = MOMENTS_PAGINATION.pageSize): Promise<MomentsResponse> {
    try {
      const allMoments = this.storage.getMoments();
      
      // 按时间倒序排序
      const sortedMoments = allMoments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // 分页
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const data = sortedMoments.slice(startIndex, endIndex);
      
      // 添加用户相关状态
      const userAuth = this.storage.getUserAuth();
      const { moments: likedMoments } = this.storage.getLikedItems();
      
      const momentsWithUserState = data.map(moment => ({
        ...moment,
        isLiked: likedMoments.includes(moment.id),
        isOwner: moment.author === userAuth.userId
      }));
      
      return {
        data: momentsWithUserState,
        total: allMoments.length,
        page,
        pageSize,
        hasNext: endIndex < allMoments.length
      };
    } catch (error) {
      console.error('获取说说列表失败:', error);
      throw new Error('获取说说列表失败');
    }
  }
  
  // 获取单条说说
  async getMoment(id: string): Promise<Moment | null> {
    try {
      const moments = this.storage.getMoments();
      const moment = moments.find(m => m.id === id);
      
      if (!moment) return null;
      
      // 添加用户相关状态
      const userAuth = this.storage.getUserAuth();
      const { moments: likedMoments, comments: likedComments } = this.storage.getLikedItems();
      
      return {
        ...moment,
        isLiked: likedMoments.includes(moment.id),
        isOwner: moment.author === userAuth.userId,
        comments: moment.comments.map(comment => ({
          ...comment,
          isLiked: likedComments.includes(comment.id)
        }))
      };
    } catch (error) {
      console.error('获取说说失败:', error);
      throw new Error('获取说说失败');
    }
  }
  
  // 创建说说
  async createMoment(request: CreateMomentRequest): Promise<Moment> {
    try {
      // 防重复提交检查
      const userAuth = this.storage.getUserAuth();
      const spamKey = `moment_${userAuth.userId}`;
      const spamCheck = globalAntiSpam.canSubmit(spamKey);
      
      if (!spamCheck.can) {
        throw new Error(`发布太频繁，请稍后再试（还需等待${Math.ceil((spamCheck.remainingMs || 0) / 1000)}秒）`);
      }
      
      // 内容安全过滤
      const sanitizedContent = sanitizeMomentContent(request.content);
      
      // 验证内容长度
      const contentValidation = validateContentLength(
        sanitizedContent,
        MOMENT_VALIDATION.minContentLength,
        MOMENT_VALIDATION.maxContentLength
      );
      
      if (!contentValidation.valid) {
        throw new Error(contentValidation.error);
      }
      
      // 验证图片数量
      if (request.images && request.images.length > MOMENT_VALIDATION.maxImages) {
        throw new Error(`最多只能上传${MOMENT_VALIDATION.maxImages}张图片`);
      }
      
      const now = new Date().toISOString();
      
      const newMoment: Moment = {
        id: this.generateId(),
        content: sanitizedContent,
        images: request.images ? Array.from(request.images).map(file => URL.createObjectURL(file)) : [],
        mood: request.mood,
        author: userAuth.userId,
        createdAt: now,
        updatedAt: now,
        likes: 0,
        comments: [],
        isOwner: true,
        isLiked: false
      };
      
      const moments = this.storage.getMoments();
      moments.unshift(newMoment); // 添加到开头
      this.storage.saveMoments(moments);
      
      // 记录提交时间
      globalAntiSpam.recordSubmission(spamKey);
      
      return newMoment;
    } catch (error) {
      console.error('创建说说失败:', error);
      throw error;
    }
  }
  
  // 更新说说
  async updateMoment(id: string, request: UpdateMomentRequest): Promise<Moment> {
    try {
      const moments = this.storage.getMoments();
      const momentIndex = moments.findIndex(m => m.id === id);
      
      if (momentIndex === -1) {
        throw new Error('说说不存在');
      }
      
      const moment = moments[momentIndex];
      const userAuth = this.storage.getUserAuth();
      
      // 验证权限
      if (moment.author !== userAuth.userId) {
        throw new Error('没有权限修改此说说');
      }
      
      // 内容安全过滤
      let sanitizedContent = moment.content;
      if (request.content) {
        sanitizedContent = sanitizeMomentContent(request.content);
        
        // 验证内容长度
        const contentValidation = validateContentLength(
          sanitizedContent,
          MOMENT_VALIDATION.minContentLength,
          MOMENT_VALIDATION.maxContentLength
        );
        
        if (!contentValidation.valid) {
          throw new Error(contentValidation.error);
        }
      }
      
      // 更新说说
      const updatedMoment: Moment = {
        ...moment,
        content: sanitizedContent,
        images: request.images || moment.images,
        mood: request.mood !== undefined ? request.mood : moment.mood,
        updatedAt: new Date().toISOString()
      };
      
      moments[momentIndex] = updatedMoment;
      this.storage.saveMoments(moments);
      
      return updatedMoment;
    } catch (error) {
      console.error('更新说说失败:', error);
      throw error;
    }
  }
  
  // 删除说说
  async deleteMoment(id: string): Promise<void> {
    try {
      const moments = this.storage.getMoments();
      const momentIndex = moments.findIndex(m => m.id === id);
      
      if (momentIndex === -1) {
        throw new Error('说说不存在');
      }
      
      const moment = moments[momentIndex];
      const userAuth = this.storage.getUserAuth();
      
      // 验证权限
      if (moment.author !== userAuth.userId) {
        throw new Error('没有权限删除此说说');
      }
      
      moments.splice(momentIndex, 1);
      this.storage.saveMoments(moments);
    } catch (error) {
      console.error('删除说说失败:', error);
      throw error;
    }
  }
  
  // 点赞/取消点赞
  async toggleLike(targetId: string, targetType: 'moment' | 'comment'): Promise<boolean> {
    try {
      const { moments: likedMoments, comments: likedComments } = this.storage.getLikedItems();
      
      if (targetType === 'moment') {
        const moments = this.storage.getMoments();
        const momentIndex = moments.findIndex(m => m.id === targetId);
        
        if (momentIndex === -1) {
          throw new Error('说说不存在');
        }
        
        const isLiked = likedMoments.includes(targetId);
        const updatedLikedMoments = isLiked
          ? likedMoments.filter(id => id !== targetId)
          : [...likedMoments, targetId];
        
        // 更新点赞数
        moments[momentIndex].likes += isLiked ? -1 : 1;
        this.storage.saveMoments(moments);
        this.storage.saveLikedItems(updatedLikedMoments, likedComments);
        
        return !isLiked;
      } else {
        // 处理评论点赞
        const moments = this.storage.getMoments();
        let commentFound = false;
        
        for (const moment of moments) {
          const commentIndex = moment.comments.findIndex(c => c.id === targetId);
          if (commentIndex !== -1) {
            const isLiked = likedComments.includes(targetId);
            const updatedLikedComments = isLiked
              ? likedComments.filter(id => id !== targetId)
              : [...likedComments, targetId];
            
            // 更新点赞数
            moment.comments[commentIndex].likes += isLiked ? -1 : 1;
            commentFound = true;
            this.storage.saveLikedItems(likedMoments, updatedLikedComments);
            break;
          }
        }
        
        if (!commentFound) {
          throw new Error('评论不存在');
        }
        
        this.storage.saveMoments(moments);
        return !likedComments.includes(targetId);
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      throw error;
    }
  }
  
  // 添加评论
  async addComment(request: CreateCommentRequest): Promise<Comment> {
    try {
      // 防重复提交检查
      const userAuth = this.storage.getUserAuth();
      const spamKey = `comment_${userAuth.userId}_${request.momentId}`;
      const spamCheck = globalAntiSpam.canSubmit(spamKey);
      
      if (!spamCheck.can) {
        throw new Error(`评论太频繁，请稍后再试（还需等待${Math.ceil((spamCheck.remainingMs || 0) / 1000)}秒）`);
      }
      
      // 内容安全过滤
      const sanitizedContent = sanitizeCommentContent(request.content);
      
      // 验证内容长度
      const contentValidation = validateContentLength(
        sanitizedContent,
        1, // 评论最小长度
        200 // 评论最大长度
      );
      
      if (!contentValidation.valid) {
        throw new Error(contentValidation.error);
      }
      
      const moments = this.storage.getMoments();
      const momentIndex = moments.findIndex(m => m.id === request.momentId);
      
      if (momentIndex === -1) {
        throw new Error('说说不存在');
      }
      
      const now = new Date().toISOString();
      
      const newComment: Comment = {
        id: this.generateId(),
        momentId: request.momentId,
        content: sanitizedContent,
        author: userAuth.userId,
        createdAt: now,
        likes: 0,
        isLiked: false
      };
      
      moments[momentIndex].comments.push(newComment);
      this.storage.saveMoments(moments);
      
      // 记录提交时间
      globalAntiSpam.recordSubmission(spamKey);
      
      return newComment;
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  }
  
  // 删除评论
  async deleteComment(commentId: string): Promise<void> {
    try {
      const moments = this.storage.getMoments();
      const userAuth = this.storage.getUserAuth();
      
      let commentFound = false;
      
      for (const moment of moments) {
        const commentIndex = moment.comments.findIndex(c => c.id === commentId);
        if (commentIndex !== -1) {
          const comment = moment.comments[commentIndex];
          
          // 验证权限
          if (comment.author !== userAuth.userId) {
            throw new Error('没有权限删除此评论');
          }
          
          moment.comments.splice(commentIndex, 1);
          commentFound = true;
          break;
        }
      }
      
      if (!commentFound) {
        throw new Error('评论不存在');
      }
      
      this.storage.saveMoments(moments);
    } catch (error) {
      console.error('删除评论失败:', error);
      throw error;
    }
  }
  
  // 获取统计信息
  async getStats(): Promise<MomentsStats> {
    try {
      const moments = this.storage.getMoments();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const recentMoments = moments.filter(moment => 
        new Date(moment.createdAt) >= sevenDaysAgo
      );
      
      const totalLikes = moments.reduce((sum, moment) => sum + moment.likes, 0);
      const totalComments = moments.reduce((sum, moment) => sum + moment.comments.length, 0);
      
      return {
        totalMoments: moments.length,
        totalLikes,
        totalComments,
        recentMoments: recentMoments.length
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw new Error('获取统计信息失败');
    }
  }
}

// 创建服务实例
export const momentsService = new MomentsService();

export default momentsService;