/**
 * 统一错误处理工具
 * 提供标准化的错误处理和用户反馈
 */

import { toast } from '@/components/admin';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否显示用户通知 */
  showToast?: boolean;
  /** 自定义错误消息 */
  customMessage?: string;
  /** 是否上报错误 */
  reportError?: boolean;
  /** 降级返回值 */
  fallbackValue?: unknown;
  /** 错误类型 */
  type?: ErrorType;
}

/**
 * 默认错误处理选项
 */
const defaultOptions: ErrorHandlerOptions = {
  showToast: true,
  reportError: true,
  type: ErrorType.UNKNOWN,
};

/**
 * 获取用户友好的错误消息
 */
function getUserFriendlyMessage(error: unknown, type: ErrorType): string {
  if (error instanceof Error) {
    // 网络错误
    if (type === ErrorType.NETWORK || error.message.includes('fetch') || error.message.includes('network')) {
      return '网络连接失败，请检查网络设置后重试';
    }
    
    // API 错误
    if (type === ErrorType.API) {
      if (error.message.includes('401')) return '登录已过期，请重新登录';
      if (error.message.includes('403')) return '没有权限执行此操作';
      if (error.message.includes('404')) return '请求的资源不存在';
      if (error.message.includes('500')) return '服务器内部错误，请稍后重试';
    }
    
    // 验证错误
    if (type === ErrorType.VALIDATION) {
      return `数据验证失败: ${error.message}`;
    }
    
    return error.message;
  }
  
  return '发生未知错误，请稍后重试';
}

/**
 * 上报错误（生产环境）
 */
function reportErrorToService(error: unknown, context?: string): void {
  if (process.env.NODE_ENV === 'production') {
    // 这里可以集成错误上报服务，如 Sentry
    console.error('[Error Report]', { error, context, timestamp: new Date().toISOString() });
  }
}

/**
 * 统一错误处理函数
 */
export function handleError(
  error: unknown,
  context?: string,
  options: ErrorHandlerOptions = {}
): { success: false; error: string } {
  const mergedOptions = { ...defaultOptions, ...options };
  
  // 获取错误消息
  const errorMessage = mergedOptions.customMessage || 
    getUserFriendlyMessage(error, mergedOptions.type || ErrorType.UNKNOWN);
  
  // 控制台输出
  console.error(`[Error] ${context || 'Unknown Context'}:`, error);
  
  // 用户通知
  if (mergedOptions.showToast) {
    toast.error(errorMessage);
  }
  
  // 错误上报
  if (mergedOptions.reportError) {
    reportErrorToService(error, context);
  }
  
  return { success: false, error: errorMessage };
}

/**
 * 包装异步函数，统一处理错误
 */
export function withErrorHandling<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  context?: string,
  options?: ErrorHandlerOptions
): (...args: Args) => Promise<T | { success: false; error: string }> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleError(error, context, options);
    }
  };
}

/**
 * 创建特定上下文的错误处理器
 */
export function createErrorHandler(context: string, defaultOptions?: ErrorHandlerOptions) {
  return {
    handle: (error: unknown, options?: ErrorHandlerOptions) => 
      handleError(error, context, { ...defaultOptions, ...options }),
    wrap: <T, Args extends unknown[]>(fn: (...args: Args) => Promise<T>) => 
      withErrorHandling(fn, context, { ...defaultOptions, ...options }),
  };
}

// 预定义的错误处理器
export const apiErrorHandler = createErrorHandler('API', { type: ErrorType.API });
export const networkErrorHandler = createErrorHandler('Network', { type: ErrorType.NETWORK });
export const validationErrorHandler = createErrorHandler('Validation', { type: ErrorType.VALIDATION });
