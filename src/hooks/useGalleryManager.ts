'use client';

/**
 * 图床管理器状态 Hook
 *
 * 供后台「图床概览」与「图床管理器」两个页面共用：
 * - 读取/保存管理器地址（localStorage）
 * - 自动探活 + 手动重新检测
 *
 * 之所以抽成 Hook：两个页面都需要同一份「地址 + 在线状态 + 检测中」状态，
 * 若各自实现容易在地址变更后的刷新时机上产生分歧。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkGalleryManagerOnline,
  DEFAULT_GALLERY_MANAGER_URL,
  getGalleryManagerUrl,
  resetGalleryManagerUrl,
  saveGalleryManagerUrl,
} from '@/utils/galleryManager';
import {
  startGalleryManager,
  stopGalleryManager,
} from '@/actions/galleryManagerActions';

/**
 * Hook 返回值接口
 */
export interface UseGalleryManagerReturn {
  /** 当前生效的管理器地址 */
  url: string;
  /** 是否正在探活 */
  checking: boolean;
  /** 在线状态：null 表示尚未完成首次检测 */
  online: boolean | null;
  /** 最近一次检测完成的时间戳（毫秒） */
  lastCheckedAt: number | null;
  /** 手动重新检测当前地址 */
  check: () => void;
  /** 保存新地址（成功后会立即重新检测），返回是否保存成功 */
  saveUrl: (input: string) => boolean;
  /** 恢复默认地址并重新检测 */
  resetUrl: () => void;
  /** 是否正在启动管理器 */
  starting: boolean;
  /** 是否正在关闭管理器 */
  stopping: boolean;
  /** 启动管理器（仅开发环境），返回操作结果供页面提示 */
  startManager: () => Promise<{ success: boolean; message: string }>;
  /** 关闭管理器（仅开发环境），返回操作结果供页面提示 */
  stopManager: () => Promise<{ success: boolean; message: string }>;
}

/**
 * 图床管理器状态 Hook
 */
export function useGalleryManager(): UseGalleryManagerReturn {
  // 初始值统一使用默认地址，真正的已保存地址在挂载后从 localStorage 读取，
  // 避免服务端渲染与客户端首次渲染结果不一致导致 hydration 警告
  const [url, setUrl] = useState(DEFAULT_GALLERY_MANAGER_URL);
  const [checking, setChecking] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  // 启动/关闭进程时的过渡状态，用于禁用按钮并显示加载动画
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // 组件卸载后不再写入状态，避免异步探活回调触发 React 警告
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 挂载后读取本地保存的地址（若有）
  useEffect(() => {
    setUrl(getGalleryManagerUrl());
  }, []);

  /**
   * 执行一次探活
   * 使用 requestIdRef 丢弃过期结果：用户连续点击「重新检测」或快速改地址时，
   * 只保留最后一次请求的结果，避免旧结果覆盖新状态。
   */
  const requestIdRef = useRef(0);

  const runCheck = useCallback(async (target: string) => {
    const requestId = ++requestIdRef.current;
    setChecking(true);

    const ok = await checkGalleryManagerOnline(target);

    // 组件已卸载或已有更新的请求，丢弃本次结果
    if (!mountedRef.current || requestId !== requestIdRef.current) return;

    setOnline(ok);
    setLastCheckedAt(Date.now());
    setChecking(false);
  }, []);

  // 地址变化时自动检测（首次挂载也会触发）
  useEffect(() => {
    void runCheck(url);
  }, [url, runCheck]);

  /**
   * 手动重新检测当前地址
   */
  const check = useCallback(() => {
    void runCheck(url);
  }, [url, runCheck]);

  /**
   * 保存新地址
   * 保存成功后 setUrl 会触发上面的 effect 自动重新检测
   */
  const saveUrl = useCallback((input: string): boolean => {
    const saved = saveGalleryManagerUrl(input);
    if (!saved) return false;
    setUrl(saved);
    return true;
  }, []);

  /**
   * 恢复默认地址
   * 若当前已是默认地址，setUrl 不会变化，需要手动触发一次检测
   */
  const resetUrl = useCallback(() => {
    const next = resetGalleryManagerUrl();
    if (next === url) {
      void runCheck(next);
    } else {
      setUrl(next);
    }
  }, [url, runCheck]);

  /**
   * 轮询等待管理器进入在线状态
   * 启动进程后还要加载依赖、扫描图库，不能仅凭进程创建就判定启动成功
   */
  const waitUntilOnline = useCallback(async (target: string, maxMs = 15000): Promise<boolean> => {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      if (await checkGalleryManagerOnline(target, 1200)) return true;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    return false;
  }, []);

  /**
   * 启动图床管理器
   * 成功后同步在线状态，用户无需再手动点一次「重新检测」
   */
  const startManager = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setStarting(true);
    try {
      const result = await startGalleryManager();
      if (!result.success) {
        return { success: false, message: result.message };
      }

      const onlineAfterStart = await waitUntilOnline(url);
      if (!onlineAfterStart) {
        return {
          success: false,
          message: '管理器进程已创建，但 15 秒内未响应，请检查管理器日志',
        };
      }

      if (mountedRef.current) {
        setOnline(true);
        setLastCheckedAt(Date.now());
      }
      return { success: true, message: result.message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '启动管理器失败',
      };
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }, [url, waitUntilOnline]);

  /**
   * 关闭图床管理器
   * 关闭成功后立即把状态置为离线，与进程实际状态保持一致
   */
  const stopManager = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setStopping(true);
    try {
      const result = await stopGalleryManager();
      if (!result.success) {
        return { success: false, message: result.message };
      }

      if (mountedRef.current) {
        setOnline(false);
        setLastCheckedAt(Date.now());
      }
      return { success: true, message: result.message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '关闭管理器失败',
      };
    } finally {
      if (mountedRef.current) setStopping(false);
    }
  }, []);

  return {
    url,
    checking,
    online,
    lastCheckedAt,
    check,
    saveUrl,
    resetUrl,
    starting,
    stopping,
    startManager,
    stopManager,
  };
}

export default useGalleryManager;
