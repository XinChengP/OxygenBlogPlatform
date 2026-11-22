'use client';

/**
 * 图床管理概览页
 *
 * 【改造说明】
 * 远程图床（GitHub Token）已被「洛佬の美图」本地图床管理器替代：
 * - 概览只统计本地图床数据，不再请求 GitHub 仓库；
 * - 「图床管理器」入口显示在线状态并新标签页打开管理器；
 * - 原「图床设置」（GitHub Token 配置）页已删除，地址配置移入管理器页面。
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Image as ImageIcon,
  FolderOpen,
  Server,
  Upload,
  HardDrive,
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Play,
} from 'lucide-react';
import { useGallery } from '@/hooks/useGallery';
import { useGalleryManager } from '@/hooks/useGalleryManager';
import { formatFileSize } from '@/utils/adminUtils';
import { toast, AdminLoading } from '@/components/admin';

/**
 * 统计卡片组件属性接口
 */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

/**
 * 统计卡片组件
 * 显示单个统计数据
 */
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, description }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
        isDark ? 'bg-gray-700/50 hover:bg-gray-700/70' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* 图标容器 */}
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          {/* 标题 */}
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
          {/* 数值 */}
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {/* 描述 */}
          {description && (
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 标签页配置
 * 「图床设置」已随 GitHub Token 远程图床一并移除
 */
const TABS = [
  { id: 'local', label: '本地图床', icon: FolderOpen, href: '/admin/gallery/local' },
  { id: 'remote', label: '图床管理器', icon: Server, href: '/admin/gallery/remote' },
] as const;

/**
 * 图床管理主页面
 * 显示本地图床概览、管理器在线状态和快捷入口
 */
export default function GalleryManagePage() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // 本地图床数据（远程图床已由独立的图床管理器接管）
  const {
    images: localImages,
    loading: localLoading,
    refresh: refreshLocal,
  } = useGallery({ autoLoad: true });

  // 图床管理器地址、在线状态与进程启停
  const {
    url: managerUrl,
    checking: managerChecking,
    online: managerOnline,
    check: checkManager,
    starting: managerStarting,
    startManager,
  } = useGalleryManager();

  /**
   * 组件挂载后设置状态
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 根据路径设置活动标签
   */
  useEffect(() => {
    if (pathname.includes('/local')) {
      setActiveTab('local');
    } else if (pathname.includes('/remote')) {
      setActiveTab('remote');
    } else {
      setActiveTab('overview');
    }
  }, [pathname]);

  const isDark = resolvedTheme === 'dark';

  // 统计本月上传的本地图片数量（按创建时间判断）
  const monthlyUploadCount = useMemo(() => {
    const now = new Date();
    return localImages.filter(image => {
      const createdAt = new Date(image.createdAt);
      return (
        !Number.isNaN(createdAt.getTime()) &&
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth()
      );
    }).length;
  }, [localImages]);

  // 本地图片真实体积（按文件 size 求和）
  const localSizeBytes = useMemo(
    () => localImages.reduce((sum, image) => sum + (image.size || 0), 0),
    [localImages]
  );

  /**
   * 管理器地址去掉协议后的展示值（如 127.0.0.1:3210），用于统计卡片描述
   */
  const managerHost = useMemo(() => {
    try {
      const parsed = new URL(managerUrl);
      return parsed.host;
    } catch {
      return managerUrl;
    }
  }, [managerUrl]);

  /**
   * 管理器状态文案
   */
  const managerStatusLabel = managerChecking
    ? '检测中'
    : managerOnline === true
      ? '在线'
      : managerOnline === false
        ? '离线'
        : '待检测';

  // 统计卡片数据
  const statsData = [
    {
      title: '图片总数',
      value: localImages.length,
      icon: ImageIcon,
      color: 'bg-blue-500',
      description: '张（本地）',
    },
    {
      title: '本地存储',
      value: formatFileSize(localSizeBytes),
      icon: HardDrive,
      color: 'bg-green-500',
      description: 'public 目录',
    },
    {
      title: '本月上传',
      value: monthlyUploadCount,
      icon: Upload,
      color: 'bg-orange-500',
      description: '张',
    },
    {
      title: '图床管理器',
      value: managerStatusLabel,
      icon: Server,
      color: managerOnline === true ? 'bg-purple-500' : 'bg-gray-500',
      description: managerHost,
    },
  ];

  /**
   * 刷新：重新扫描本地图片并重新探测管理器
   */
  const handleRefresh = () => {
    refreshLocal();
    checkManager();
  };

  /**
   * 启动图床管理器
   * 概览页在管理器离线时直接提供启动入口，省去进入详情页的一步
   */
  const handleStartManager = async () => {
    const result = await startManager();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  /**
   * 获取管理器状态标识
   */
  const getManagerStatusBadge = () => {
    if (managerChecking) {
      return (
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>检测中</span>
        </span>
      );
    }

    if (managerOnline === true) {
      return (
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <Check className="w-3 h-3" />
          <span>已启动</span>
        </span>
      );
    }

    return (
      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        <AlertCircle className="w-3 h-3" />
        <span>{managerOnline === false ? '未启动' : '待检测'}</span>
      </span>
    );
  };

  // 未挂载时显示统一的加载状态
  if (!mounted) {
    return <AdminLoading text="加载图床数据..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            图床管理
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            本地图床在后台管理，图片上传与归档由图床管理器完成
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* 刷新按钮：同时刷新本地图片列表与管理器状态 */}
          <button
            onClick={handleRefresh}
            disabled={localLoading}
            className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${localLoading || managerChecking ? 'animate-spin' : ''}`} />
            刷新
          </button>
          {/* 管理器在线时打开管理页；离线时直接提供启动入口 */}
          {managerOnline === true ? (
            <a
              href={managerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors shadow-md"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              打开图床管理器
            </a>
          ) : (
            <button
              onClick={handleStartManager}
              disabled={managerStarting}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors shadow-md disabled:opacity-50"
            >
              {managerStarting ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {managerStarting ? '启动中…' : '启动管理器'}
            </button>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-xl backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg overflow-hidden`}
      >
        <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* 概览标签 */}
          <button
            onClick={() => {
              setActiveTab('overview');
              router.push('/admin/gallery');
            }}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-[#66ccff] border-b-2 border-[#66ccff]'
                : isDark
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>概览</span>
          </button>

          {/* 其他标签 */}
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                router.push(tab.href);
              }}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[#66ccff] border-b-2 border-[#66ccff]'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`rounded-xl p-6 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          存储概览
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 本地图床 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Link href="/admin/gallery/local">
            <div
              className={`relative overflow-hidden rounded-xl p-6 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                isDark
                  ? 'bg-gray-800/50 border border-gray-700/50 hover:border-[#66ccff]/50'
                  : 'bg-white/70 border border-gray-200/50 hover:border-[#66ccff]/50'
              } shadow-lg`}
            >
              {/* 背景装饰 */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-green-500"
                style={{ transform: 'translate(30%, -30%)' }}
              />

              <div className="relative">
                {/* 图标和数量 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-green-500">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {localImages.length} 张
                  </span>
                </div>

                {/* 标题和描述 */}
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  本地图床
                </h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  浏览与管理 public 目录下的图片资源，支持上传和删除
                </p>

                {/* 进入按钮 */}
                <div className="flex items-center text-[#66ccff] text-sm font-medium">
                  <span>进入管理</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 图床管理器 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          {/*
            使用 <a target="_blank"> 直接打开管理器，
            地址来自 localStorage，127.0.0.1 已在外链守卫白名单中
          */}
          <a href={managerUrl} target="_blank" rel="noopener noreferrer">
            <div
              className={`relative overflow-hidden rounded-xl p-6 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                isDark
                  ? 'bg-gray-800/50 border border-gray-700/50 hover:border-[#66ccff]/50'
                  : 'bg-white/70 border border-gray-200/50 hover:border-[#66ccff]/50'
              } shadow-lg`}
            >
              {/* 背景装饰 */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-purple-500"
                style={{ transform: 'translate(30%, -30%)' }}
              />

              <div className="relative">
                {/* 图标和状态 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-purple-500">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-mono ${
                      isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {managerHost}
                    </span>
                    {getManagerStatusBadge()}
                  </div>
                </div>

                {/* 标题和描述 */}
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  图床管理器
                </h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  上传、查重、自动归档、批量取链与 Git 同步，替代原有远程图床
                </p>

                {/* 打开入口 */}
                <div className="flex items-center text-[#66ccff] text-sm font-medium">
                  <span>打开管理器</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </a>
        </motion.div>
      </div>

      {/* 最近上传预览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className={`rounded-xl p-6 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            最近上传
          </h2>
          <Link
            href="/admin/gallery/local"
            className="text-sm text-[#66ccff] hover:text-[#66ccff]/80 transition-colors flex items-center space-x-1"
          >
            <span>查看全部</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 图片网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {localLoading ? (
            // 加载骨架屏
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg animate-pulse ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              />
            ))
          ) : localImages.length > 0 ? (
            // 显示图片
            localImages.slice(0, 6).map((image, i) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className={`aspect-square rounded-lg overflow-hidden ${
                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              </motion.div>
            ))
          ) : (
            // 空状态
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <ImageIcon className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* 存储空间使用情况（仅本地图床） */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className={`rounded-xl p-6 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          本地存储使用情况
        </h2>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>本地存储</span>
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {localImages.length} 张图片
            </span>
          </div>
          {/* 进度条按 500 张容量估算，仅作视觉参考 */}
          <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min((localImages.length / 500) * 100, 100)}%` }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
