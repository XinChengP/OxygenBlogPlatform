'use client';

/**
 * Admin备份管理组件
 * 提供本地Git备份功能的管理界面，支持推送到远程仓库
 * 版本恢复功能支持二次确认和密码验证
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Cloud,
  Settings,
  Link,
  Globe,
  Key,
  GitCommit,
  ArrowUp,
  Shield,
  Lock,
} from 'lucide-react';
import {
  performBackup,
  getBackupStatus,
  getBackupHistory,
  restoreBackup,
  pushToRemote,
  configureRemote,
  getRemoteInfo,
  testRemoteConnection,
  type BackupHistory,
  type PushConfig,
} from '../../actions/backupActions';
import { toast } from './AdminToast';

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
  hasRemote: boolean;
  remoteUrl: string;
}

/**
 * 远程仓库信息接口
 */
interface RemoteInfo {
  remoteUrl: string;
  branch: string;
  ahead: number;
}

/**
 * 备份管理组件
 */
export default function BackupManager({ className = '' }: BackupManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'backup' | 'history' | 'restore' | 'push'>('backup');

  // 远程仓库相关状态
  const [remoteInfo, setRemoteInfo] = useState<RemoteInfo | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [showPushConfig, setShowPushConfig] = useState(false);
  const [pushConfig, setPushConfig] = useState<PushConfig>({
    remoteUrl: '',
    branch: 'main',
    token: '',
  });

  // 版本恢复二次确认和密码验证状态
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreStep, setRestoreStep] = useState<'confirm' | 'password'>('confirm');
  const [restorePassword, setRestorePassword] = useState('');
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState('');

  // 加载备份状态
  useEffect(() => {
    loadStatus();
  }, []);

  // 当切换到推送标签时加载远程信息
  useEffect(() => {
    if (activeTab === 'push') {
      loadRemoteInfo();
    }
  }, [activeTab]);

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
          hasRemote: result.hasRemote || false,
          remoteUrl: result.remoteUrl || '',
        });
      }
    } catch (error) {
      console.error('加载备份状态失败:', error);
    }
  };

  /**
   * 加载远程仓库信息
   */
  const loadRemoteInfo = async () => {
    try {
      const result = await getRemoteInfo();
      if (result.success) {
        setRemoteInfo({
          remoteUrl: result.remoteUrl || '',
          branch: result.branch || 'main',
          ahead: result.ahead || 0,
        });
        // 如果已配置远程仓库，更新表单
        if (result.remoteUrl) {
          setPushConfig(prev => ({
            ...prev,
            remoteUrl: result.remoteUrl?.replace(/https:\/\/\*\*\*@/, 'https://') || '',
            branch: result.branch || 'main',
          }));
        }
      }
    } catch (error) {
      console.error('加载远程信息失败:', error);
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
   * 打开恢复确认对话框（第一步：二次确认）
   * 点击恢复按钮时调用，显示确认对话框
   */
  const openRestoreModal = (commitHash?: string) => {
    setSelectedCommitHash(commitHash);
    setRestoreStep('confirm');
    setRestorePassword('');
    setPasswordError('');
    setRestoreModalOpen(true);
  };

  /**
   * 关闭恢复对话框
   */
  const closeRestoreModal = () => {
    if (isRestoring) return; // 恢复中不允许关闭
    setRestoreModalOpen(false);
    setRestoreStep('confirm');
    setRestorePassword('');
    setPasswordError('');
    setSelectedCommitHash(undefined);
  };

  /**
   * 确认恢复（从确认步骤进入密码验证步骤）
   */
  const handleConfirmRestore = () => {
    setRestoreStep('password');
    setPasswordError('');
  };

  /**
   * 执行恢复操作（带密码验证）
   * 用户输入密码后调用，验证密码并执行恢复
   */
  const handleRestoreWithPassword = async () => {
    // 验证密码是否输入
    if (!restorePassword.trim()) {
      setPasswordError('请输入恢复密码');
      return;
    }

    setIsRestoring(true);
    setPasswordError('');

    try {
      // 调用恢复接口，传入密码进行验证
      const result = await restoreBackup(selectedCommitHash, restorePassword);

      if (result.success) {
        toast.success(result.message);
        closeRestoreModal();
      } else {
        // 密码错误或恢复失败
        if (result.message.includes('密码') || result.message.includes('认证')) {
          setPasswordError(result.message);
        } else {
          toast.error(result.message);
          closeRestoreModal();
        }
      }
    } catch (error) {
      console.error('恢复失败:', error);
      setPasswordError('恢复失败，请稍后重试');
    } finally {
      setIsRestoring(false);
    }
  };

  /**
   * 切换标签页
   */
  const handleTabChange = (tab: 'backup' | 'history' | 'restore' | 'push') => {
    setActiveTab(tab);
    if (tab === 'history' && history.length === 0) {
      loadHistory();
    }
  };

  /**
   * 测试远程仓库连接
   */
  const handleTestConnection = async () => {
    if (!pushConfig.remoteUrl) {
      toast.error('请输入远程仓库地址');
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testRemoteConnection(pushConfig);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      toast.error('测试连接失败');
    } finally {
      setIsTestingConnection(false);
    }
  };

  /**
   * 配置远程仓库
   */
  const handleConfigureRemote = async () => {
    if (!pushConfig.remoteUrl) {
      toast.error('请输入远程仓库地址');
      return;
    }

    setIsConfiguring(true);
    try {
      const result = await configureRemote(pushConfig);
      if (result.success) {
        toast.success(result.message);
        await loadStatus();
        await loadRemoteInfo();
        setShowPushConfig(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('配置远程仓库失败:', error);
      toast.error('配置远程仓库失败');
    } finally {
      setIsConfiguring(false);
    }
  };

  /**
   * 推送到远程仓库
   */
  const handlePush = async () => {
    // 如果没有配置远程仓库，显示配置面板
    if (!status?.hasRemote) {
      setShowPushConfig(true);
      return;
    }

    setIsPushing(true);
    try {
      const result = await pushToRemote();
      if (result.success) {
        toast.success(result.message);
        await loadRemoteInfo();
      } else {
        // 如果推送失败且提示未配置远程仓库，显示配置面板
        if (result.message.includes('未配置远程仓库')) {
          setShowPushConfig(true);
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error('推送失败:', error);
      toast.error('推送失败');
    } finally {
      setIsPushing(false);
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-xl p-4 border ${status.hasRemote ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border-cyan-500/30' : 'bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-gray-500/20'}`}
          >
            <div className="flex items-center gap-3">
              <Cloud className={`w-8 h-8 ${status.hasRemote ? 'text-cyan-400' : 'text-gray-400'}`} />
              <div>
                <div className="text-sm font-bold truncate max-w-[120px]">
                  {status.hasRemote ? '已配置' : '未配置'}
                </div>
                <div className="text-xs opacity-70">远程仓库</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 标签页 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { id: 'backup', label: '立即备份', icon: Upload },
          { id: 'history', label: '备份历史', icon: History },
          { id: 'restore', label: '版本恢复', icon: RotateCcw },
          { id: 'push', label: '推送远程', icon: Cloud },
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
                      onClick={() => openRestoreModal(item.commitHash)}
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

        {/* 推送远程 */}
        {activeTab === 'push' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">推送到远程仓库</h3>
              {remoteInfo?.remoteUrl && (
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                  已连接
                </span>
              )}
            </div>

            {/* 远程仓库信息卡片 */}
            {remoteInfo?.remoteUrl && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium">远程仓库信息</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-cyan-400" />
                    <span className="opacity-70">地址:</span>
                    <code className="bg-black/20 px-2 py-0.5 rounded text-xs truncate max-w-[300px]">
                      {remoteInfo.remoteUrl}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-cyan-400" />
                    <span className="opacity-70">分支:</span>
                    <span>{remoteInfo.branch || 'main'}</span>
                  </div>
                  {remoteInfo.ahead > 0 && (
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-cyan-400" />
                      <span className="opacity-70">待推送:</span>
                      <span className="text-cyan-400 font-medium">{remoteInfo.ahead} 个提交</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 推送按钮区域 */}
            {!showPushConfig ? (
              <div className="text-center py-8">
                <Cloud className="w-16 h-16 mx-auto mb-4 text-[#66ccff]" />
                <h3 className="text-lg font-medium mb-2">
                  {status?.hasRemote ? '推送到远程仓库' : '配置远程仓库'}
                </h3>
                <p className="text-sm opacity-70 mb-6 max-w-md mx-auto">
                  {status?.hasRemote
                    ? '将本地备份推送到已配置的远程仓库，实现云端同步和版本管理'
                    : '配置远程仓库地址，将本地备份推送到GitHub等平台进行云端存储'}
                </p>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handlePush}
                    disabled={isPushing}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-all disabled:opacity-50 shadow-lg"
                  >
                    {isPushing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        推送中...
                      </>
                    ) : (
                      <>
                        <Cloud className="w-5 h-5" />
                        {status?.hasRemote ? '立即推送' : '配置并推送'}
                      </>
                    )}
                  </button>

                  {status?.hasRemote && (
                    <button
                      onClick={() => setShowPushConfig(true)}
                      className="inline-flex items-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      <Settings className="w-5 h-5" />
                      重新配置
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* 配置表单 */
              <div className="space-y-4">
                <div className="bg-gray-500/10 rounded-lg p-4 space-y-4">
                  {/* 远程仓库地址 */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Globe className="w-4 h-4" />
                      远程仓库地址
                    </label>
                    <input
                      type="text"
                      value={pushConfig.remoteUrl}
                      onChange={(e) => setPushConfig(prev => ({ ...prev, remoteUrl: e.target.value }))}
                      placeholder="https://github.com/username/repo.git"
                      className="w-full px-3 py-2 bg-white/5 border border-gray-300/20 rounded-lg focus:outline-none focus:border-[#66ccff] transition-colors text-sm"
                    />
                    <p className="text-xs opacity-50 mt-1">
                      支持 GitHub、GitLab 等平台的 HTTPS 地址
                    </p>
                  </div>

                  {/* 分支名 */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <GitBranch className="w-4 h-4" />
                      分支名
                    </label>
                    <input
                      type="text"
                      value={pushConfig.branch}
                      onChange={(e) => setPushConfig(prev => ({ ...prev, branch: e.target.value }))}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-white/5 border border-gray-300/20 rounded-lg focus:outline-none focus:border-[#66ccff] transition-colors text-sm"
                    />
                  </div>

                  {/* Token */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Key className="w-4 h-4" />
                      访问令牌 (Token)
                    </label>
                    <input
                      type="password"
                      value={pushConfig.token}
                      onChange={(e) => setPushConfig(prev => ({ ...prev, token: e.target.value }))}
                      placeholder="ghp_xxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-white/5 border border-gray-300/20 rounded-lg focus:outline-none focus:border-[#66ccff] transition-colors text-sm"
                    />
                    <p className="text-xs opacity-50 mt-1">
                      GitHub Personal Access Token，用于认证推送权限
                    </p>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleConfigureRemote}
                    disabled={isConfiguring || !pushConfig.remoteUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-all disabled:opacity-50"
                  >
                    {isConfiguring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        配置中...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        保存配置
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !pushConfig.remoteUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        测试中...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4" />
                        测试连接
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowPushConfig(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300/30 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <X className="w-4 h-4" />
                    取消
                  </button>
                </div>

                {/* 提示信息 */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div className="text-xs opacity-80 space-y-1">
                      <p>1. 在GitHub创建私有仓库，不要初始化（不勾选README）</p>
                      <p>2. 生成Personal Access Token，勾选repo权限</p>
                      <p>3. Token仅用于推送，不会被存储在代码中</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* 版本恢复二次确认和密码验证对话框 */}
      <AnimatePresence>
        {restoreModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 遮罩层 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !isRestoring && closeRestoreModal()}
            />

            {/* 对话框内容 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-md rounded-xl shadow-2xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50"
              onClick={e => e.stopPropagation()}
            >
              {/* 步骤一：二次确认 */}
              {restoreStep === 'confirm' && (
                <>
                  {/* 内容区域 */}
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* 警告图标 */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>

                      {/* 标题和消息 */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          确认恢复版本
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          您确定要将代码恢复到选定的版本吗？此操作将覆盖当前项目中的所有Admin代码，且无法撤销。
                        </p>
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">
                            <strong>提示：</strong>建议在恢复前先创建一个新的备份，以防万一。
                          </p>
                        </div>
                        {selectedCommitHash && (
                          <div className="mt-3 flex items-center gap-2 text-sm">
                            <span className="text-gray-500">目标版本：</span>
                            <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-orange-500 font-mono">
                              {selectedCommitHash}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 底部按钮 */}
                  <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-xl">
                    <button
                      onClick={closeRestoreModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleConfirmRestore}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      确认恢复
                    </button>
                  </div>
                </>
              )}

              {/* 步骤二：密码验证 */}
              {restoreStep === 'password' && (
                <>
                  {/* 内容区域 */}
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* 密码图标 */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                        <Lock className="w-6 h-6" />
                      </div>

                      {/* 标题和输入 */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          身份验证
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          请输入恢复密码以继续操作。此操作需要管理员权限。
                        </p>

                        {/* 密码输入框 */}
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            恢复密码
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              value={restorePassword}
                              onChange={(e) => {
                                setRestorePassword(e.target.value);
                                if (passwordError) setPasswordError('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isRestoring) {
                                  handleRestoreWithPassword();
                                }
                              }}
                              placeholder="请输入恢复密码"
                              disabled={isRestoring}
                              autoFocus
                              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm ${
                                passwordError
                                  ? 'border-red-500 focus:ring-red-500/20'
                                  : 'border-gray-300 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500/20'
                              }`}
                            />
                            <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          </div>
                          {/* 错误提示 */}
                          {passwordError && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 text-sm text-red-500 flex items-center gap-1"
                            >
                              <AlertCircle className="w-4 h-4" />
                              {passwordError}
                            </motion.p>
                          )}
                        </div>

                        {/* 密码提示 */}
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            <strong>默认密码：</strong>admin123（可在系统设置中修改）
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 底部按钮 */}
                  <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-xl">
                    <button
                      onClick={() => setRestoreStep('confirm')}
                      disabled={isRestoring}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      返回
                    </button>
                    <button
                      onClick={handleRestoreWithPassword}
                      disabled={isRestoring || !restorePassword.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          恢复中...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          确认恢复
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
