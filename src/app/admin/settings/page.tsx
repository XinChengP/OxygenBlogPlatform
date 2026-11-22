'use client';

/**
 * 系统设置页
 *
 * 【改造说明】
 * 1. 原页面手写了三个密码输入框（含显隐按钮、错误态、主题三元判断），
 *    而 AdminInput 已内置这些能力，统一替换以复用可访问性与样式；
 * 2. 页面表面统一走 AdminCard 语义变量，不再逐处判断 isDark，
 *    避免首屏在 SSR 阶段先渲染浅色再跳深色。
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Key, Lock } from 'lucide-react';
import { toast, AdminCard, AdminInput, AdminButton } from '@/components/admin';
import { changeRestorePassword } from '@/actions/backupActions';

/**
 * 系统设置页面
 */
export default function SettingsPage() {
  // 密码修改相关状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /**
   * 处理密码修改
   */
  const handleChangePassword = async () => {
    // 验证输入
    if (!oldPassword.trim()) {
      toast.error('请输入旧密码');
      return;
    }
    if (!newPassword.trim()) {
      toast.error('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('新密码长度不能少于6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    if (oldPassword === newPassword) {
      toast.error('新密码不能与旧密码相同');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await changeRestorePassword(oldPassword, newPassword);
      if (result.success) {
        toast.success(result.message);
        // 清空输入框
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      toast.error('修改密码失败，请稍后重试');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          系统设置
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理恢复密码与安全设置
        </p>
      </div>

      {/* 安全设置卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AdminCard
          title={
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#66ccff]" />
              修改恢复密码
            </span>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              此密码用于验证版本恢复操作的权限。建议定期更换密码以保证安全。
            </p>

            {/* 旧密码 */}
            <AdminInput
              label="旧密码"
              type="password"
              value={oldPassword}
              onChange={setOldPassword}
              placeholder="请输入当前密码"
              autoComplete="current-password"
              required
            />

            {/* 新密码 */}
            <div>
              <AdminInput
                label="新密码"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="请输入新密码（至少6位）"
                autoComplete="new-password"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                密码长度至少6个字符，建议使用字母和数字组合
              </p>
            </div>

            {/* 确认新密码 */}
            <AdminInput
              label="确认新密码"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="请再次输入新密码"
              autoComplete="new-password"
              required
            />

            {/* 修改密码按钮 */}
            <div className="pt-2">
              <AdminButton
                onClick={handleChangePassword}
                loading={isChangingPassword}
                disabled={!oldPassword || !newPassword || !confirmPassword}
              >
                {isChangingPassword ? '修改中...' : '修改密码'}
              </AdminButton>
            </div>

            {/* 操作说明 */}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Key className="w-3.5 h-3.5" />
              密码仅用于本地备份恢复，不会随内容推送到仓库。
            </p>
          </div>
        </AdminCard>
      </motion.div>

      {/* 安全提示：保持醒目的警示色，与正文卡片区分 */}
      <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/40 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 mt-0.5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              安全提示
            </h4>
            <ul className="mt-2 text-sm space-y-1 text-yellow-700 dark:text-yellow-400">
              <li>• 密码用于保护版本恢复功能，防止误操作</li>
              <li>• 建议定期更换密码</li>
              <li>• 密码保存在服务器端配置文件中</li>
              <li>• 默认密码为 admin123，请及时修改</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          提示：图床管理器地址在「图床管理 → 图床管理器」页面配置，恢复密码保存在服务器端配置文件中。
        </p>
      </div>
    </div>
  );
}
