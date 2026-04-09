'use client';

/**
 * GitHub 推送功能 Hook
 * 提供 Git 状态刷新、直接推送和构建推送的功能封装
 * 支持检测已推送状态，防止重复推送
 */

import { useState, useCallback } from 'react';
import { pushToGitHub, buildAndPush, getGitStatus, GitStatus, GitPushResult } from '@/actions/githubActions';

/**
 * useGitHubPush Hook 返回值接口
 * 封装 GitHub 推送相关状态和操作方法
 */
export interface UseGitHubPushReturn {
  /** 是否正在推送中 */
  pushing: boolean;
  /** 是否正在构建中 */
  building: boolean;
  /** 最近一次操作的结果 */
  lastResult: GitPushResult | null;
  /** 当前 Git 状态 */
  gitStatus: GitStatus | null;
  /** 是否有待推送的提交（本地有提交但远程没有，用于防止重复推送） */
  hasPushable: boolean;
  /** 刷新 Git 状态 */
  refreshStatus: () => Promise<GitStatus>;
  /** 直接推送（不构建） */
  push: (message?: string) => Promise<GitPushResult>;
  /** 构建并推送 */
  buildPush: (buildMessage?: string, pushMessage?: string) => Promise<GitPushResult>;
}

/**
 * useGitHubPush Hook
 *
 * 用于管理 GitHub 推送功能的 React Hook
 *
 * 功能特点：
 * - 管理推送状态（pushing/building）
 * - 存储最近一次操作结果
 * - 提供 Git 状态刷新功能
 * - 支持直接推送（不构建）和构建推送两种模式
 * - 自动检测 hasPushable 状态，防止重复推送
 *
 * @returns 包含状态和操作方法的对象
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { pushing, building, hasPushable, push, buildPush, refreshStatus } = useGitHubPush();
 *
 *   const handlePush = async () => {
 *     await push('更新内容');
 *   };
 *
 *   const handleBuildPush = async () => {
 *     await buildPush('构建更新', '发布新版本');
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handlePush} disabled={pushing || !hasPushable}>推送</button>
 *       <button onClick={handleBuildPush} disabled={building}>构建并推送</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGitHubPush(): UseGitHubPushReturn {
  /** 是否正在推送中的状态 */
  const [pushing, setPushing] = useState(false);

  /** 是否正在构建中的状态 */
  const [building, setBuilding] = useState(false);

  /** 最近一次 Git 操作的结果，用于展示操作状态和错误信息 */
  const [lastResult, setLastResult] = useState<GitPushResult | null>(null);

  /** 当前 Git 仓库状态，包含分支信息、提交状态等 */
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);

  /** 是否有待推送的提交（本地有提交但远程没有）
   * 用于防止重复推送：如果没有待推送的提交，按钮应该禁用或显示提示
   */
  const [hasPushable, setHasPushable] = useState(false);

  /**
   * 刷新 Git 状态
   *
   * 调用 getGitStatus 获取当前 Git 仓库状态并更新内部状态
   * 同时更新 hasPushable 状态
   *
   * @returns Promise<GitStatus> - 返回 Git 状态对象
   */
  const refreshStatus = useCallback(async (): Promise<GitStatus> => {
    const status = await getGitStatus();
    setGitStatus(status);
    setHasPushable(status.hasPushable);
    return status;
  }, []);

  /**
   * 直接推送（不进行构建）
   *
   * 用于快速推送当前更改到远程仓库
   * 推送成功后会自动刷新 Git 状态
   *
   * @param message - 可选的提交信息，如果为空则使用默认信息
   * @returns Promise<GitPushResult> - 返回推送操作的结果
   */
  const push = useCallback(async (message?: string): Promise<GitPushResult> => {
    setPushing(true);
    setLastResult(null);

    try {
      const result = await pushToGitHub(message);
      setLastResult(result);

      // 推送成功后，等待一段时间后刷新 Git 状态
      // 这样可以更新 hasPushable 等状态，防止重复推送
      if (result.success) {
        // 使用 setTimeout 确保状态更新在 UI 渲染之后
        setTimeout(() => {
          refreshStatus();
        }, 2000);
      }

      return result;
    } finally {
      setPushing(false);
    }
  }, [refreshStatus]);

  /**
   * 构建并推送
   *
   * 先执行项目构建，然后推送构建产物到远程仓库
   * 适用于需要先构建再发布的场景
   * 推送成功后会自动刷新 Git 状态
   *
   * @param buildMessage - 可选的构建相关信息，用于生成构建提交信息
   * @param pushMessage - 可选的推送提交信息，如果为空则使用默认信息
   * @returns Promise<GitPushResult> - 返回构建和推送操作的结果
   */
  const buildPush = useCallback(
    async (buildMessage?: string, pushMessage?: string): Promise<GitPushResult> => {
      setBuilding(true);
      setPushing(true);
      setLastResult(null);

      try {
        const result = await buildAndPush(buildMessage, pushMessage);
        setLastResult(result);

        // 构建并推送成功后，等待一段时间后刷新 Git 状态
        if (result.success) {
          setTimeout(() => {
            refreshStatus();
          }, 2000);
        }

        return result;
      } finally {
        setBuilding(false);
        setPushing(false);
      }
    },
    [refreshStatus]
  );

  return {
    pushing,
    building,
    lastResult,
    gitStatus,
    hasPushable,
    refreshStatus,
    push,
    buildPush,
  };
}

/**
 * 从 @/actions/githubActions 导出的类型
 * 方便其他模块直接从本模块导入所需类型
 */
export type { GitStatus, GitPushResult };

export default useGitHubPush;
