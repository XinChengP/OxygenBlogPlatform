/**
 * 安全防护工具
 * 提供XSS过滤、输入验证等安全功能
 */

import DOMPurify from 'dompurify';

/**
 * XSS过滤配置
 */
const SANITIZE_CONFIG = {
  // 允许的标签
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
  // 允许的属性和协议
  ALLOWED_ATTR: ['href', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  // 允许的协议
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|sms):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // 返回DOM节点而不是字符串
  RETURN_DOM: false,
  // 返回受信任的HTML
  RETURN_TRUSTED_TYPE: true
};

/**
 * 说说内容的安全过滤
 */
export function sanitizeMomentContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  try {
    // 使用DOMPurify进行XSS过滤
    const sanitized = DOMPurify.sanitize(content, {
      ...SANITIZE_CONFIG,
      // 额外的安全设置
      KEEP_CONTENT: true,
      SAFE_FOR_TEMPLATES: true
    });
    
    // 进一步清理：移除所有HTML标签，只保留纯文本
    const textOnly = sanitized.replace(/<[^>]*>/g, '');
    
    return textOnly.trim();
  } catch (error) {
    console.error('内容过滤失败:', error);
    // 如果过滤失败，返回空字符串以确保安全
    return '';
  }
}

/**
 * 评论内容的安全过滤
 */
export function sanitizeCommentContent(content: string): string {
  return sanitizeMomentContent(content); // 使用相同的过滤逻辑
}

/**
 * 用户名的安全验证
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: '用户名不能为空' };
  }
  
  const trimmed = username.trim();
  
  // 长度验证
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { valid: false, error: '用户名长度必须在2-20个字符之间' };
  }
  
  // 字符验证：只允许字母、数字、中文、下划线
  const validPattern = /^[a-zA-Z0-9\u4e00-\u9fa5_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: '用户名只能包含字母、数字、中文和下划线' };
  }
  
  // 敏感词过滤（简化版）
  const sensitiveWords = ['admin', 'root', 'system', '管理员', '系统'];
  const lowerUsername = trimmed.toLowerCase();
  for (const word of sensitiveWords) {
    if (lowerUsername.includes(word.toLowerCase())) {
      return { valid: false, error: '用户名包含敏感词汇' };
    }
  }
  
  return { valid: true };
}

/**
 * 内容长度验证
 */
export function validateContentLength(
  content: string, 
  minLength: number, 
  maxLength: number
): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: '内容不能为空' };
  }
  
  const trimmed = content.trim();
  const length = trimmed.length;
  
  if (length < minLength) {
    return { 
      valid: false, 
      error: `内容长度不能少于${minLength}个字符` 
    };
  }
  
  if (length > maxLength) {
    return { 
      valid: false, 
      error: `内容长度不能超过${maxLength}个字符` 
    };
  }
  
  return { valid: true };
}

/**
 * 图片URL的安全验证
 */
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: '图片URL不能为空' };
  }
  
  try {
    // 验证URL格式
    const urlObj = new URL(url);
    
    // 允许的协议
    const allowedProtocols = ['http:', 'https:', 'data:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return { valid: false, error: '不支持的图片协议' };
    }
    
    // 数据URL的特殊验证
    if (urlObj.protocol === 'data:') {
      // 验证数据URL格式
      const dataUrlPattern = /^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/]*={0,2}$/;
      if (!dataUrlPattern.test(url)) {
        return { valid: false, error: '无效的数据URL格式' };
      }
      
      // 检查数据大小（限制在5MB以内）
      const base64Length = url.split(',')[1]?.length || 0;
      const estimatedSize = base64Length * 0.75; // Base64编码的大致大小
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (estimatedSize > maxSize) {
        return { valid: false, error: '图片大小不能超过5MB' };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: '无效的URL格式' };
  }
}

/**
 * 文件名的安全验证
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: '文件名不能为空' };
  }
  
  const trimmed = fileName.trim();
  
  // 长度验证
  if (trimmed.length > 255) {
    return { valid: false, error: '文件名过长' };
  }
  
  // 禁止字符验证
  const forbiddenChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (forbiddenChars.test(trimmed)) {
    return { valid: false, error: '文件名包含非法字符' };
  }
  
  // 禁止的文件名（Windows保留字）
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  
  const nameWithoutExt = trimmed.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return { valid: false, error: '文件名是系统保留字' };
  }
  
  return { valid: true };
}

/**
 * 防重复提交（防抖）
 */
export class AntiSpam {
  private submissions: Map<string, number> = new Map();
  private readonly cooldownMs: number;
  
  constructor(cooldownMs: number = 5000) { // 默认5秒冷却
    this.cooldownMs = cooldownMs;
  }
  
  /**
   * 检查是否可以提交
   */
  canSubmit(key: string): { can: boolean; remainingMs?: number } {
    const lastSubmission = this.submissions.get(key);
    const now = Date.now();
    
    if (lastSubmission) {
      const remainingMs = lastSubmission + this.cooldownMs - now;
      if (remainingMs > 0) {
        return { can: false, remainingMs };
      }
    }
    
    return { can: true };
  }
  
  /**
   * 记录提交
   */
  recordSubmission(key: string): void {
    this.submissions.set(key, Date.now());
  }
  
  /**
   * 清理过期的记录
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.cooldownMs;
    
    for (const [key, timestamp] of this.submissions.entries()) {
      if (timestamp < cutoff) {
        this.submissions.delete(key);
      }
    }
  }
}

/**
 * 创建全局防垃圾实例
 */
export const globalAntiSpam = new AntiSpam(5000); // 5秒冷却时间