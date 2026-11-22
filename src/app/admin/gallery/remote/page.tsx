'use client';

/**
 * 图床管理器页面（原「远程图床」页）
 *
 * 【改造背景】
 * 后台原先的远程图床依赖 GitHub Token 直接在仓库里上传/删除文件，
 * 能力弱（无查重、无自动分类、无批量取链），且 Token 需要长期保存。
 * 现在统一改为跳转「洛佬の美图」自带的本地图床管理器：
 * 上传、查重、归档、编号规整、批量取链与 Git 同步都由它完成。
 *
 * 本页承担三件事：
 * 1. 展示管理器在线状态（通过 /api/health 探活）
 * 2. 提供「打开图床管理器」入口（新标签页，不改变当前后台页面）
 * 3. 允许配置管理器地址（端口被占用时管理会自动换端口，可在此同步修改）
 *
 * 路由沿用 /admin/gallery/remote，避免旧书签与侧边栏链接失效。
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Server,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
  Terminal,
  Link2,
  GitBranch,
  Upload,
  Copy,
  RotateCcw,
  Save,
  Play,
  Power,
} from 'lucide-react';
import { toast } from '@/components/admin';
import { useGalleryManager } from '@/hooks/useGalleryManager';
import { DEFAULT_GALLERY_MANAGER_URL } from '@/utils/galleryManager';

/**
 * 管理器地址（用于启动说明中的 Windows 路径展示）
 * 说明：该信息仅在本地开发环境的后台中展示，不会出现在公开页面
 */
const MANAGER_ROOT = 'W:\\Web\\洛佬の美图';
const MANAGER_EXE = `${MANAGER_ROOT}\\manager\\dist\\LTY-图床管理器.exe`;

/**
 * 管理器提供的核心能力（用于页面说明，替代原远程图床的卖点）
 */
const MANAGER_FEATURES = [
  { icon: Upload, title: '批量上传', desc: '拖拽、点选或剪贴板粘贴，逐文件串行提交' },
  { icon: Copy, title: '自动查重', desc: 'MD5 精确查重 + 感知指纹相似检测' },
  { icon: FolderOpen, title: '自动归档', desc: '按横图 / 方图 / 竖图 / 表情包自动分类编号' },
  { icon: Link2, title: '批量取链', desc: 'jsDelivr 与镜像链接，支持多格式导出' },
  { icon: GitBranch, title: 'Git 同步', desc: '确认后一键提交并推送图库目录' },
] as const;

/**
 * 图床管理器页面
 */
export default function GalleryManagerPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 地址、在线状态、检测与进程启停统一由 Hook 管理
  const {
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
  } = useGalleryManager();

  // 地址输入框的草稿值：用户编辑时与已生效地址解耦，保存后才生效
  const [draftUrl, setDraftUrl] = useState<string>(DEFAULT_GALLERY_MANAGER_URL);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 生效地址变化（挂载读取、保存、恢复默认）时同步输入框
  useEffect(() => {
    setDraftUrl(url);
  }, [url]);

  const isDark = resolvedTheme === 'dark';

  /**
   * 保存地址
   * 保存成功后 Hook 会自动针对新地址重新探活
   */
  const handleSave = () => {
    if (saveUrl(draftUrl)) {
      toast.success('图床管理器地址已保存，正在重新检测');
    } else {
      toast.error('地址格式无效，请填写 http:// 或 https:// 开头的地址');
    }
  };

  /**
   * 恢复默认地址
   */
  const handleReset = () => {
    resetUrl();
    toast.success('已恢复默认地址');
  };

  /**
   * 启动管理器
   * Hook 会等待 /api/health 真正响应后才返回成功，避免「进程创建了但服务没起来」的假成功
   */
  const handleStart = async () => {
    const result = await startManager();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  /**
   * 关闭管理器
   */
  const handleStop = async () => {
    const result = await stopManager();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  /**
   * 在线状态展示文案与配色
   * null 表示首次检测尚未完成
   */
  const statusView = checking
    ? {
        label: '检测中',
        detail: '正在连接图床管理器…',
        color: 'text-[#66ccff]',
        dot: 'bg-[#66ccff]',
        Icon: Loader2,
        spin: true,
      }
    : online === true
      ? {
          label: '已启动',
          detail: '管理器响应正常，可直接打开使用',
          color: 'text-green-500',
          dot: 'bg-green-500',
          Icon: CheckCircle,
          spin: false,
        }
      : online === false
        ? {
            label: '未启动',
            detail: '未检测到管理器服务，请按下方说明启动',
            color: 'text-yellow-500',
            dot: 'bg-yellow-500',
            Icon: AlertCircle,
            spin: false,
          }
        : {
            label: '尚未检测',
            detail: '点击右侧「重新检测」开始探活',
            color: 'text-gray-500',
            dot: 'bg-gray-400',
            Icon: AlertCircle,
            spin: false,
          };

  // 未挂载时显示加载状态，避免主题相关的样式在 SSR 与客户端不一致
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题与操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            图床管理器
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            已替代原有远程图床，上传、查重、归档与取链都在独立管理器中完成
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 返回图床概览 */}
          <Link
            href="/admin/gallery"
            className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            返回
          </Link>

          {/* 重新探活 */}
          <button
            onClick={check}
            disabled={checking || starting || stopping}
            className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${checking ? 'animate-spin' : ''}`} />
            重新检测
          </button>

          {/*
            启动 / 关闭按在线状态切换，避免同时出现两个相反操作。
            仅在本地开发环境的 Server Action 中生效；静态导出会被替换为空实现。
          */}
          {online === true ? (
            <button
              onClick={handleStop}
              disabled={stopping || starting}
              className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-red-800 text-red-400 hover:bg-red-900/20'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              } disabled:opacity-50`}
            >
              {stopping ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Power className="w-5 h-5 mr-2" />
              )}
              {stopping ? '关闭中…' : '关闭管理器'}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={starting || stopping}
              className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-green-700 text-green-400 hover:bg-green-900/20'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              } disabled:opacity-50`}
            >
              {starting ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {starting ? '启动中…' : '启动管理器'}
            </button>
          )}

          {/*
            打开管理器：使用 <a target="_blank"> 而非 window.open，
            保留「中键 / Ctrl + 点击」等原生浏览器习惯。
            127.0.0.1 已在外链守卫白名单中，不会弹出跳转提醒。
          */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors shadow-md"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            打开图床管理器
          </a>
        </div>
      </div>

      {/* 在线状态卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-xl p-6 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* 状态图标容器 */}
            <div
              className={`p-3 rounded-xl ${
                online === true
                  ? 'bg-green-500'
                  : online === false
                    ? 'bg-yellow-500'
                    : 'bg-gray-400'
              }`}
            >
              <Server className="w-6 h-6 text-white" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                {/* 状态圆点 + 文案 */}
                <span className={`inline-block w-2 h-2 rounded-full ${statusView.dot}`} />
                <span className={`text-lg font-semibold ${statusView.color}`} aria-live="polite">
                  {statusView.label}
                </span>
                {statusView.spin && (
                  <Loader2 className={`w-4 h-4 animate-spin ${statusView.color}`} />
                )}
              </div>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {statusView.detail}
              </p>
              {/* 当前生效地址 */}
              <p
                className={`mt-1 text-xs font-mono ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {url}
              </p>
            </div>
          </div>

          {/* 最近检测时间 */}
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {lastCheckedAt
              ? `最近检测：${new Date(lastCheckedAt).toLocaleTimeString('zh-CN')}`
              : '尚未完成检测'}
          </div>
        </div>

        {/* 未启动时给出简短指引 */}
        {online === false && !checking && (
          <div
            className={`mt-4 flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${
              isDark
                ? 'bg-yellow-900/20 border border-yellow-700/40 text-yellow-300'
                : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              点击上方「启动管理器」即可在本机拉起服务，也可以按下方说明手动启动。
              若管理器提示端口被占用并自动换端口，请在本页地址配置中同步修改。
            </span>
          </div>
        )}
      </motion.div>

      {/* 地址配置 */}
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
        <h2 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          管理器地址
        </h2>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          默认 {DEFAULT_GALLERY_MANAGER_URL}，配置保存在浏览器本地，不会上传到服务器
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* 地址输入框：支持只输 127.0.0.1:3210，保存时自动补协议 */}
          <input
            type="text"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder={DEFAULT_GALLERY_MANAGER_URL}
            spellCheck={false}
            className={`flex-1 px-4 py-2.5 rounded-lg border font-mono text-sm ${
              isDark
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
            } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
          />
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            保存地址
          </button>
          <button
            onClick={handleReset}
            className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg border transition-colors ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            恢复默认
          </button>
        </div>
      </motion.div>

      {/* 启动说明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={`rounded-xl p-6 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          启动说明
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 方式一：exe 免安装 */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2 mb-3">
              <Terminal className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
              <h3 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                方式一：exe 免安装（推荐）
              </h3>
            </div>
            <ol className={`text-sm space-y-2 list-decimal list-inside ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <li>
                将
                <code className={`mx-1 px-1.5 py-0.5 rounded text-xs break-all ${
                  isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {MANAGER_EXE}
                </code>
                复制到图库仓库根目录（与 LTYpicture 同级）
              </li>
              <li>双击运行，浏览器访问提示的地址即可使用</li>
            </ol>
          </div>

          {/* 方式二：源码运行 */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2 mb-3">
              <FolderOpen className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
              <h3 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                方式二：源码运行（需 Node.js ≥ 18）
              </h3>
            </div>
            <pre className={`text-xs leading-relaxed whitespace-pre-wrap break-all ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
{`cd ${MANAGER_ROOT}\\manager
npm install
npm start`}
            </pre>
          </div>
        </div>

        <p className={`mt-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          默认监听 127.0.0.1:3210；端口被占用时会自动递增重试，实际地址以启动横幅为准，
          可回到本页修改「管理器地址」。管理器关闭后本页会显示为「未启动」，属正常现象。
        </p>
      </motion.div>

      {/* 能力说明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className={`rounded-xl p-6 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          管理器能力
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MANAGER_FEATURES.map((feature) => (
            <div key={feature.title} className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700/60' : 'bg-gray-100'}`}>
                <feature.icon className={`w-4 h-4 ${isDark ? 'text-[#66ccff]' : 'text-[#33aadd]'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {feature.title}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
