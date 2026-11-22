'use client';

/**
 * Admin备份管理页面
 * 提供本地Git备份功能的管理界面
 */

import React from 'react';
import { BackupManager } from '@/components/admin';

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <BackupManager />
    </div>
  );
}
