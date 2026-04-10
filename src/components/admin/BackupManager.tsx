'use client';

/**
 * Admin备份管理组件
 * 提供本地Git备份功能的管理界面
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Upload,
  History,
  RotateCcw,
  Check,
  X,
  Loader2,
  AlertCircle,
  FolderOpen,
  GitBranch,
  FileText,
} from 'lucide-react';
import {
  performBackup,
  getBackupStatus,
  getBackupHistory,
  restoreBackup,
  type BackupHistory,
} from '@/actions/backupActions';
import { toast } from '@/components/admin';

interface BackupManagerProps {
  className?: string;
}

/**
 * 备份状态接口
 */
interface BackupStatus {
  totalCommits: number;
  lastBackup: string;
  trackedFiles: number;
  isGitRepo: boolean;
}

/**
 * 备份管理组件
 */
export default function BackupManager({ className = '' }: BackupManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'backup' | 'history' | 'restore'>('backup');

  // 加载备份状态
  useEffect(() => {
    loadStatus();
  }, []);

  /**
   * 加载备份状态
   */
  const loadStatus = async () => {
    try {
      const result = await getBackupStatus();
      if (result.success) {
        setStatus({
          totalCommits: result.totalCommits || 0,
          lastBackup: result.lastBackup || '',
          trackedFiles: result.trackedFiles || 0,
          isGitRepo: result.totalCommits !== undefined,
        });
      }
    } catch (error) {
      console.error('加载备份状态失败:', error);
    }
  };

  /**
   * 执行备份
   */
  const handleBackup = async () => {
    setIsLoading(true);
    try {
      const result = await performBackup();
      if (result.success) {
        toast.success(result.message);
        await loadStatus();
        await loadHistory();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('备份失败:', error);
      toast.error('备份失败');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 加载备份历史
   */
  const loadHistory = async () => {
    try {
      const result = await getBackupHistory(20);
      if (result.success && result.history) {
        setHistory(result.history);
      }
    } catch (error) {
      console.error('加载历史失败:', error);
    }
  };

  /**
   * 执行恢复
   */
  const handleRestore = async (commitHash?: string) => {
    if (!confirm('确定要恢复到此版本吗？当前修改将被覆盖！')) {
      return;
    }

    setIsRestoring(true);
    try {
      const result = await restoreBackup(commitHash);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('恢复失败:', error);
      toast.error('恢复失败');
    } finally {
      setIsRestoring(false);
    }
  };

  /**
   * 切换标签页
   */
  const handleTabChange = (tab: 'backup' | 'history' | 'restore') => {
    setActiveTab(tab);
    if (tab === 'history' && history.length === 0) {
      loadHistory();
    }
  };

  /**
   * 格式化时间
   */
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={className}>
      {/* 页面标题 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6" />
          本地备份管理
        </h2>
        <p className="text-sm opacity-70 mt-1">
          将Admin代码备份到本地Git仓库，支持版本回溯
        </p>
      </div>

      {/* 状态卡片 */}
      {status && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30"
          >
            <div className="flex items-center gap-3">
              <GitBranch className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold">{status.totalCommits}</div>
                <div className="text-xs opacity-70">备份次数</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold">{status.trackedFiles}</div>
                <div className="text-xs opacity-70">文件数量</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30"
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-sm font-bold truncate max-w-[120px]">
                  {status.lastBackup ? formatDate(status.lastBackup) : '从未备份'}
                </div>
                <div className="text-xs opacity-70">上次备份</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 标签页 */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'backup', label: '立即备份', icon: Upload },
          { id: 'history', label: '备份历史', icon: History },
          { id: 'restore', label: '版本恢复', icon: RotateCcw },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-[#66ccff] text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="bg-white/5 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200/10 dark:border-gray-700/50">
        {/* 立即备份 */}
        {activeTab === 'backup' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="text-center py-8">
              <Database className="w-16 h-16 mx-auto mb-4 text-[#66ccff]" />
              <h3 className="text-lg font-medium mb-2">创建本地备份</h3>
              <p className="text-sm opacity-70 mb-6 max-w-md mx-auto">
                将当前的Admin代码（页面、组件、Actions）复制到本地Git仓库，
                支持版本历史查看和回滚
              </p>

              <button
                onClick={handleBackup}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-all disabled:opacity-50 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    备份中...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    开始备份
                  </>
                )}
              </button>
            </div>

            <div className={`p-4 rounded-lg ${status?.isGitRepo ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {status?.isGitRepo ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
                <span className="font-medium">
                  {status?.isGitRepo ? 'Git仓库已初始化' : 'Git仓库未初始化'}
                </span>
              </div>
              <p className="text-sm opacity-70">
                {status?.isGitRepo
                  ? `已追踪 ${status.trackedFiles} 个文件，共 ${status.totalCommits} 次备份`
                  : '点击"开始备份"将自动初始化Git仓库'}
              </p>
            </div>
          </motion.div>
        )}

        {/* 备份历史 */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="text-lg font-medium mb-4">备份历史</h3>

            {history.length === 0 ? (
              <div className="text-center py-8 text-opacity-50">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无备份记录</p>
                <p className="text-sm opacity-70">点击"立即备份"创建第一个备份</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={item.commitHash}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {index === 0 ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.message}</div>
                        <div className="text-xs opacity-60">
                          {formatDate(item.timestamp)} · {item.filesCount} 个文件
                        </div>
                      </div>
                    </div>
                    <code className="text-xs opacity-50 font-mono">{item.commitHash}</code>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 版本恢复 */}
        {activeTab === 'restore' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="text-lg font-medium mb-4">版本恢复</h3>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <span className="font-medium text-yellow-400">警告</span>
              </div>
              <p className="text-sm opacity-80">
                恢复操作会将备份版本覆盖到当前项目，请谨慎操作。
                建议在恢复前先创建新的备份。
              </p>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-opacity-50">
                <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无可恢复的版本</p>
                <p className="text-sm opacity-70">点击"立即备份"创建备份后再试</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={item.commitHash}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-xs opacity-50 font-mono">{item.commitHash}</code>
                      <div>
                        <div className="font-medium text-sm">{item.message}</div>
                        <div className="text-xs opacity-60">
                          {formatDate(item.timestamp)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(item.commitHash)}
                      disabled={isRestoring || index === 0}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          恢复中...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          恢复
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
