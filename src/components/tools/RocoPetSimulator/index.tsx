'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  pets,
  talentData,
  exclusiveGroups,
  hiddenPets,
  skinPets,
  talentPets,
  getPetById,
  getPetTalents,
  getPetSkins,
  isPetHidden,
  arePetsExclusive,
  getPetsByMagic,
  type Pet,
  type Talent,
} from '@/data/rocoPets';
import {
  accountManager,
  initializePresetAccounts,
  type AccountPets,
} from '@/data/rocoPets';
import { Live2DMessageHelper } from '@/utils/live2dMessageManager';

// 魔力值颜色配置 - 使用自定义配色方案，支持亮色/暗色模式
// 亮色模式颜色：5魔力-紫色, 4魔力-粉色, 3魔力-天依蓝, 2魔力-黄色, 1魔力-绿色
// 暗色模式颜色：降低饱和度，提高亮度，使颜色在深色背景上更舒适
const magicColors = {
  light: {
    5: { bg: 'bg-[#b866ff]', text: 'text-[#b866ff]', border: 'border-[#b866ff]', color: '#b866ff' },
    4: { bg: 'bg-[#ff668f]', text: 'text-[#ff668f]', border: 'border-[#ff668f]', color: '#ff668f' },
    3: { bg: 'bg-[#66ccff]', text: 'text-[#66ccff]', border: 'border-[#66ccff]', color: '#66ccff' },
    2: { bg: 'bg-[#fff566]', text: 'text-[#d4c700]', border: 'border-[#fff566]', color: '#fff566' },
    1: { bg: 'bg-[#66ff7a]', text: 'text-[#36c748]', border: 'border-[#66ff7a]', color: '#66ff7a' },
  },
  dark: {
    5: { bg: 'bg-[#d4a3ff]', text: 'text-[#d4a3ff]', border: 'border-[#d4a3ff]', color: '#d4a3ff' },
    4: { bg: 'bg-[#ff9ab3]', text: 'text-[#ff9ab3]', border: 'border-[#ff9ab3]', color: '#ff9ab3' },
    3: { bg: 'bg-[#a3e0ff]', text: 'text-[#a3e0ff]', border: 'border-[#a3e0ff]', color: '#a3e0ff' },
    2: { bg: 'bg-[#fff9a3]', text: 'text-[#fff9a3]', border: 'border-[#fff9a3]', color: '#fff9a3' },
    1: { bg: 'bg-[#a3ffb3]', text: 'text-[#a3ffb3]', border: 'border-[#a3ffb3]', color: '#a3ffb3' },
  },
} as const;

// 本地存储键名
const STORAGE_KEYS = {
  bannedPets: 'roco-banned-pets',
  lineup: 'roco-lineup',
  selectedSkins: 'roco-selected-skins',
  selectedTalents: 'roco-selected-talents',
  showSkinButton: 'roco-show-skin-button',
  imageCache: 'roco-image-cache', // 图片缓存状态记录
};

// ==================== 宠物图标缓存系统 ====================
// 缓存策略：使用内存缓存 + localStorage 持久化记录
// 避免每次刷新页面都重新从网络加载图片

// 内存缓存：存储已经加载成功的图片 URL
const imageCache = new Map<string, string>();

// 从 localStorage 读取缓存记录（记录哪些 URL 曾经加载成功过）
function getCachedImageUrls(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.imageCache);
    if (stored) {
      const urls = JSON.parse(stored) as string[];
      return new Set(urls);
    }
  } catch {
    // 解析失败时返回空集合
  }
  return new Set();
}

// 保存缓存记录到 localStorage
function saveCachedImageUrls(urls: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEYS.imageCache, JSON.stringify(Array.from(urls)));
  } catch {
    // 存储失败时静默处理
  }
}

// 全局缓存记录集合
const cachedImageUrls = getCachedImageUrls();

// 标记某个图片 URL 已缓存成功
function markImageAsCached(url: string) {
  if (!cachedImageUrls.has(url)) {
    cachedImageUrls.add(url);
    saveCachedImageUrls(cachedImageUrls);
  }
  imageCache.set(url, url);
}

// 检查某个图片 URL 是否已经缓存过
function isImageCached(url: string): boolean {
  return imageCache.has(url) || cachedImageUrls.has(url);
}

// 预加载单张图片并缓存
function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 如果已经在内存缓存中，直接返回成功
    if (imageCache.has(url)) {
      resolve(true);
      return;
    }

    const img = new Image();
    img.onload = () => {
      markImageAsCached(url);
      resolve(true);
    };
    img.onerror = () => {
      resolve(false);
    };
    img.src = url;
  });
}

// 批量预加载图片
async function preloadImages(urls: string[], batchSize = 10): Promise<void> {
  // 过滤掉已经缓存的图片
  const uncachedUrls = urls.filter(url => !isImageCached(url));
  if (uncachedUrls.length === 0) return;

  // 分批加载，避免同时发起过多请求
  for (let i = 0; i < uncachedUrls.length; i += batchSize) {
    const batch = uncachedUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(url => preloadImage(url)));
  }
}
// ==================== 缓存系统结束 ====================

// 右键菜单类型
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  petId: number | null;
  context: 'list' | 'banned' | 'lineup' | 'hidden';
}

// 模态框类型
interface ModalState {
  skin: boolean;
  talent: boolean;
  rules: boolean;
  batchBan: boolean;
  batchLineup: boolean;
}

// 魔力值筛选选项 - 与魔力值颜色配置保持一致
const MAGIC_FILTERS = [
  { value: 'all', label: '全部', color: { light: 'bg-[#94a3b8]', dark: 'bg-[#94a3b8]' } },
  { value: '5', label: '5魔力', color: { light: 'bg-[#b866ff]', dark: 'bg-[#d4a3ff]' } },
  { value: '4', label: '4魔力', color: { light: 'bg-[#ff668f]', dark: 'bg-[#ff9ab3]' } },
  { value: '3', label: '3魔力', color: { light: 'bg-[#66ccff]', dark: 'bg-[#a3e0ff]' } },
  { value: '2', label: '2魔力', color: { light: 'bg-[#fff566]', dark: 'bg-[#fff9a3]' } },
  { value: '1', label: '1魔力', color: { light: 'bg-[#66ff7a]', dark: 'bg-[#a3ffb3]' } },
] as const;

export default function RocoPetSimulator() {
  // 右侧卡片引用
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [rightPanelStyle, setRightPanelStyle] = useState<React.CSSProperties>({});

  // 监听滚动，实现右侧卡片固定（仅在桌面端lg及以上屏幕启用）
  useEffect(() => {
    const handleScroll = () => {
      if (!rightPanelRef.current) return;

      // 只在桌面端（屏幕宽度大于等于1024px）启用固定定位
      const isDesktop = window.innerWidth >= 1024;
      if (!isDesktop) {
        setRightPanelStyle({ position: 'static' });
        return;
      }

      const scrollY = window.scrollY;
      const initialTop = 200; // 初始距离顶部的位置

      if (scrollY > initialTop) {
        setRightPanelStyle({
          position: 'fixed',
          top: '80px',
          width: rightPanelRef.current.parentElement?.clientWidth,
        });
      } else {
        setRightPanelStyle({
          position: 'static',
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始化

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 监听窗口大小变化，更新宽度（仅在桌面端）
  useEffect(() => {
    const handleResize = () => {
      if (!rightPanelRef.current) return;
      
      // 只在桌面端更新宽度
      const isDesktop = window.innerWidth >= 1024;
      if (!isDesktop) {
        setRightPanelStyle({ position: 'static' });
        return;
      }
      
      const parentWidth = rightPanelRef.current.parentElement?.clientWidth;
      if (parentWidth && window.scrollY > 200) {
        setRightPanelStyle(prev => ({
          ...prev,
          width: parentWidth,
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 获取当前主题对应的魔力值颜色
  const getMagicColor = useCallback((magic: number) => {
    return isDark ? magicColors.dark[magic as keyof typeof magicColors.dark] : magicColors.light[magic as keyof typeof magicColors.light];
  }, [isDark]);

  // 状态管理
  const [bannedPets, setBannedPets] = useState<number[]>([]);
  const [lineup, setLineup] = useState<number[]>([]);
  const [selectedSkins, setSelectedSkins] = useState<Record<number, number>>({});
  const [selectedTalents, setSelectedTalents] = useState<Record<number, number>>({});
  const [showSkinButton, setShowSkinButton] = useState(false);
  const [showHiddenPets, setShowHiddenPets] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    petId: null,
    context: 'list',
  });
  const [modals, setModals] = useState<ModalState>({
    skin: false,
    talent: false,
    rules: false,
    batchBan: false,
    batchLineup: false,
  });
  const [currentPetId, setCurrentPetId] = useState<number | null>(null);
  const [batchInput, setBatchInput] = useState('');
  const [magicFilter, setMagicFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 账号管理状态
  const [accounts, setAccounts] = useState<AccountPets[]>([]);
  const [currentAccount, setCurrentAccount] = useState<string>('');
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatchPets, setSelectedBatchPets] = useState<number[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [showNewAccountInput, setShowNewAccountInput] = useState(false);
  const [importExportModal, setImportExportModal] = useState<{ open: boolean; mode: 'import' | 'export' }>({ open: false, mode: 'import' });
  const [importText, setImportText] = useState('');
  const [exportFormat, setExportFormat] = useState<'id' | 'name'>('id');

  // 批量操作栏拖拽状态
  const [batchPanelPos, setBatchPanelPos] = useState({ x: 16, y: 96 }); // 默认位置：左上角
  const [isDraggingBatchPanel, setIsDraggingBatchPanel] = useState(false);
  const batchPanelDragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // 从本地存储加载数据
  useEffect(() => {
    const loadData = () => {
      try {
        const savedBanned = localStorage.getItem(STORAGE_KEYS.bannedPets);
        const savedLineup = localStorage.getItem(STORAGE_KEYS.lineup);
        const savedSkins = localStorage.getItem(STORAGE_KEYS.selectedSkins);
        const savedTalents = localStorage.getItem(STORAGE_KEYS.selectedTalents);
        const savedShowSkin = localStorage.getItem(STORAGE_KEYS.showSkinButton);

        if (savedBanned) setBannedPets(JSON.parse(savedBanned));
        if (savedLineup) setLineup(JSON.parse(savedLineup));
        if (savedSkins) setSelectedSkins(JSON.parse(savedSkins));
        if (savedTalents) setSelectedTalents(JSON.parse(savedTalents));
        if (savedShowSkin) setShowSkinButton(JSON.parse(savedShowSkin));
      } catch (error) {
        console.error('加载本地数据失败:', error);
      }
    };

    loadData();
    // 页面加载时触发Live2D消息
    Live2DMessageHelper.showRocoSimulatorMessage('PAGE_VISIT');
  }, []);

  // 初始化账号数据（加载预设账号）
  useEffect(() => {
    const initAccounts = () => {
      // 先初始化预设账号
      initializePresetAccounts();
      // 然后加载账号数据到状态
      setAccounts(accountManager.getAccounts());
      setCurrentAccount(accountManager.getCurrentAccount());
    };
    initAccounts();
  }, []);

  // 预加载宠物图片到缓存
  useEffect(() => {
    // 组件挂载后，延迟预加载当前可见的宠物图片
    // 使用 requestIdleCallback 或 setTimeout 避免阻塞页面渲染
    const preloadPetImages = () => {
      // 收集所有需要预加载的图片 URL
      const urlsToPreload: string[] = [];

      // 预加载所有宠物的主图片（分批进行，避免一次性请求过多）
      pets.forEach((pet, index) => {
        const imageId = pet.imageId || pet.id;
        const formattedId = String(imageId).padStart(3, '0');
        const networkUrl = `https://res.17roco.qq.com/res/combat/icons/${formattedId}-.png`;

        // 只预加载前 30 个可见宠物和已拥有的宠物，避免一次性加载过多
        if (index < 30 || accountManager.hasPet(pet.id)) {
          urlsToPreload.push(networkUrl);
        }
      });

      // 批量预加载图片
      if (urlsToPreload.length > 0) {
        preloadImages(urlsToPreload, 5); // 每批 5 个，避免阻塞
      }
    };

    // 使用 requestIdleCallback 如果可用，否则用 setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => preloadPetImages(), { timeout: 2000 });
    } else {
      setTimeout(preloadPetImages, 1000);
    }
  }, []);

  // 保存到本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bannedPets, JSON.stringify(bannedPets));
  }, [bannedPets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.lineup, JSON.stringify(lineup));
  }, [lineup]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.selectedSkins, JSON.stringify(selectedSkins));
  }, [selectedSkins]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.selectedTalents, JSON.stringify(selectedTalents));
  }, [selectedTalents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.showSkinButton, JSON.stringify(showSkinButton));
  }, [showSkinButton]);

  // 显示通知
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // 刷新账号数据
  const refreshAccounts = useCallback(() => {
    setAccounts(accountManager.getAccounts());
    setCurrentAccount(accountManager.getCurrentAccount());
  }, []);

  // 切换账号
  const handleSwitchAccount = useCallback((name: string) => {
    accountManager.switchAccount(name);
    refreshAccounts();
    showNotification(`已切换到账号：${name}`);
    setShowAccountDropdown(false);
  }, [refreshAccounts, showNotification]);

  // 创建新账号
  const handleCreateAccount = useCallback(() => {
    if (!newAccountName.trim()) {
      showNotification('请输入账号名称', 'error');
      return;
    }
    const success = accountManager.createAccount(newAccountName.trim());
    if (success) {
      refreshAccounts();
      setNewAccountName('');
      setShowNewAccountInput(false);
      showNotification(`账号 "${newAccountName.trim()}" 创建成功`);
    } else {
      showNotification('账号名称已存在', 'error');
    }
  }, [newAccountName, refreshAccounts, showNotification]);

  // 删除账号
  const handleDeleteAccount = useCallback((name: string) => {
    if (confirm(`确定要删除账号 "${name}" 吗？此操作不可恢复。`)) {
      const success = accountManager.deleteAccount(name);
      if (success) {
        refreshAccounts();
        showNotification(`账号 "${name}" 已删除`);
      } else {
        showNotification('至少保留一个账号', 'error');
      }
    }
  }, [refreshAccounts, showNotification]);

  // 标记宠物拥有状态
  const togglePetOwnership = useCallback((petId: number) => {
    const hasPet = accountManager.hasPet(petId);
    if (hasPet) {
      accountManager.removePetFromCurrentAccount(petId);
      showNotification('已标记为未拥有');
    } else {
      accountManager.addPetToCurrentAccount(petId);
      showNotification('已标记为已拥有');
    }
    refreshAccounts();
  }, [refreshAccounts, showNotification]);

  // 批量标记宠物
  const batchToggleOwnership = useCallback((own: boolean) => {
    if (selectedBatchPets.length === 0) {
      showNotification('请先选择宠物', 'error');
      return;
    }
    if (own) {
      const result = accountManager.batchAddPetsToCurrentAccount(selectedBatchPets);
      showNotification(`成功标记 ${result.added} 只宠物为已拥有`);
    } else {
      const result = accountManager.batchRemovePetsFromCurrentAccount(selectedBatchPets);
      showNotification(`成功标记 ${result.removed} 只宠物为未拥有`);
    }
    setSelectedBatchPets([]);
    refreshAccounts();
  }, [selectedBatchPets, refreshAccounts, showNotification]);

  // 批量操作栏拖拽逻辑
  const handleBatchPanelMouseDown = useCallback((e: React.MouseEvent) => {
    // 只有点击标题栏才能拖拽
    if ((e.target as HTMLElement).closest('.batch-panel-header')) {
      setIsDraggingBatchPanel(true);
      batchPanelDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: batchPanelPos.x,
        initialY: batchPanelPos.y,
      };
      e.preventDefault();
    }
  }, [batchPanelPos]);

  const handleBatchPanelMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingBatchPanel || !batchPanelDragRef.current) return;
    const dx = e.clientX - batchPanelDragRef.current.startX;
    const dy = e.clientY - batchPanelDragRef.current.startY;
    setBatchPanelPos({
      x: Math.max(0, Math.min(window.innerWidth - 200, batchPanelDragRef.current.initialX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 150, batchPanelDragRef.current.initialY + dy)),
    });
  }, [isDraggingBatchPanel]);

  const handleBatchPanelMouseUp = useCallback(() => {
    setIsDraggingBatchPanel(false);
    batchPanelDragRef.current = null;
  }, []);

  // 监听拖拽事件
  useEffect(() => {
    if (isDraggingBatchPanel) {
      window.addEventListener('mousemove', handleBatchPanelMouseMove);
      window.addEventListener('mouseup', handleBatchPanelMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleBatchPanelMouseMove);
        window.removeEventListener('mouseup', handleBatchPanelMouseUp);
      };
    }
  }, [isDraggingBatchPanel, handleBatchPanelMouseMove, handleBatchPanelMouseUp]);

  // 导入宠物
  const handleImportPets = useCallback(() => {
    if (!importText.trim()) {
      showNotification('请输入宠物列表', 'error');
      return;
    }
    const { found, notFound } = accountManager.parsePetInput(importText);
    if (found.length > 0) {
      const result = accountManager.batchAddPetsToCurrentAccount(found);
      showNotification(`成功导入 ${result.added} 只宠物，${notFound.length} 只未找到`);
    } else {
      showNotification('未找到匹配的宠物', 'error');
    }
    setImportText('');
    setImportExportModal({ open: false, mode: 'import' });
    refreshAccounts();
  }, [importText, refreshAccounts, showNotification]);

  // 获取导出文本
  const getExportText = useCallback(() => {
    const petIds = accountManager.getCurrentAccountPetIds();
    if (exportFormat === 'id') {
      return petIds.join(', ');
    } else {
      return petIds.map(id => getPetById(id)?.name || id).join(', ');
    }
  }, [exportFormat]);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('已复制到剪贴板');
    } catch {
      showNotification('复制失败', 'error');
    }
  }, [showNotification]);

  // 获取宠物图片URL（网络优先，失败用本地，支持缓存）
  const getPetImageUrl = useCallback((pet: Pet): string => {
    const skinIndex = selectedSkins[pet.id];
    const imageId = pet.imageId || pet.id;
    const formattedId = String(imageId).padStart(3, '0');

    // 构建网络URL
    let networkUrl: string;
    if (skinIndex && skinIndex > 0 && skinPets[pet.id]) {
      networkUrl = `https://res.17roco.qq.com/res/combat/icons/1${formattedId}${skinIndex - 1}-.png`;
    } else {
      networkUrl = `https://res.17roco.qq.com/res/combat/icons/${formattedId}-.png`;
    }

    // 本地备用路径
    const localUrl = `/roco-icons/pets/${imageId}.png`;

    // 如果网络图片已经缓存成功过，直接返回网络URL（浏览器会从缓存读取）
    // 如果网络图片未缓存过，仍然返回网络URL，让img标签尝试加载
    return networkUrl;
  }, [selectedSkins]);

  // 获取宠物图片URL（带缓存优化版本）
  // 如果网络图片之前加载成功过，直接返回网络URL；否则先尝试本地图片
  const getPetImageUrlWithCache = useCallback((pet: Pet): string => {
    const skinIndex = selectedSkins[pet.id];
    const imageId = pet.imageId || pet.id;
    const formattedId = String(imageId).padStart(3, '0');

    // 构建网络URL
    let networkUrl: string;
    if (skinIndex && skinIndex > 0 && skinPets[pet.id]) {
      networkUrl = `https://res.17roco.qq.com/res/combat/icons/1${formattedId}${skinIndex - 1}-.png`;
    } else {
      networkUrl = `https://res.17roco.qq.com/res/combat/icons/${formattedId}-.png`;
    }

    // 本地备用路径
    const localUrl = `/roco-icons/pets/${imageId}.png`;

    // 如果网络图片已经缓存成功过，直接返回网络URL（浏览器会从磁盘缓存读取）
    if (isImageCached(networkUrl)) {
      return networkUrl;
    }

    // 未缓存过，返回网络URL让浏览器尝试加载
    return networkUrl;
  }, [selectedSkins]);

  // 获取本地宠物图片URL（用于网络加载失败时）
  const getLocalPetImageUrl = useCallback((pet: Pet): string => {
    const imageId = pet.imageId || pet.id;
    return `/roco-icons/pets/${imageId}.png`;
  }, []);

  // 获取血脉图片URL（网络优先，失败用本地）
  const getTalentImageUrl = useCallback((talentId: number): string => {
    if (!talentId || talentId === 0) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRkZGIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMSIgcng9IjIiLz4KPHBhdGggZD0iTTYgNkwxNCAxNE0xNCA2TDYgMTQiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==';
    }
    return `https://res.17roco.qq.com/res/talent/${talentId}_small.png`;
  }, []);

  // 获取本地血脉图片URL（用于网络加载失败时）
  const getLocalTalentImageUrl = useCallback((talentId: number): string => {
    if (!talentId || talentId === 0) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRkZGIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMSIgcng9IjIiLz4KPHBhdGggZD0iTTYgNkwxNCAxNE0xNCA2TDYgMTQiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==';
    }
    return `/roco-icons/talents/${talentId}.png`;
  }, []);

  // 禁赛操作
  const toggleBanPet = useCallback((petId: number) => {
    setBannedPets(prev => {
      if (prev.includes(petId)) {
        Live2DMessageHelper.showRocoSimulatorMessage('UNBAN_PET');
        showNotification('已移出禁赛列表');
        return prev.filter(id => id !== petId);
      } else {
        Live2DMessageHelper.showRocoSimulatorMessage('BAN_PET');
        showNotification('已添加到禁赛列表');
        return [...prev, petId];
      }
    });
  }, [showNotification]);

  // 添加到阵容
  const addToLineup = useCallback((petId: number) => {
    if (lineup.length >= 6) {
      Live2DMessageHelper.showRocoSimulatorMessage('LINEUP_FULL');
      showNotification('阵容已满，最多6只宠物', 'error');
      return false;
    }

    if (lineup.includes(petId)) {
      showNotification('该宠物已在阵容中', 'error');
      return false;
    }

    // 检查互斥
    for (const existingId of lineup) {
      if (arePetsExclusive(petId, existingId)) {
        const pet1 = getPetById(petId);
        const pet2 = getPetById(existingId);
        Live2DMessageHelper.showRocoSimulatorMessage('EXCLUSIVE_CONFLICT');
        showNotification(`${pet1?.name} 与 ${pet2?.name} 互斥，无法同时参赛`, 'error');
        return false;
      }
    }

    // 如果宠物有血脉且未选择过，默认选择第一个血脉（部分宠物例外）
    const petTalents = getPetTalents(petId);
    if (petTalents.length > 0 && !selectedTalents[petId]) {
      // 定义需要默认选择第二个血脉的宠物ID列表
      const secondTalentDefaultPets = [3152, 3362];
      // 定义不需要默认选择血脉的宠物ID列表（戟叶蓼、雷嘉、洛一纪）
      const noTalentDefaultPets = [3298, 2817, 3034];
      
      // 判断当前宠物的血脉选择策略
      if (secondTalentDefaultPets.includes(petId)) {
        // 翡翠皇后和塞勒姆：默认选择第二个血脉
        setSelectedTalents(prev => ({
          ...prev,
          [petId]: petTalents[1],
        }));
      } else if (!noTalentDefaultPets.includes(petId)) {
        // 其他有血脉的宠物（除戟叶蓼、雷嘉、洛一纪外）：默认选择第一个血脉
        setSelectedTalents(prev => ({
          ...prev,
          [petId]: petTalents[0],
        }));
      }
      // 戟叶蓼、雷嘉、洛一纪：不自动选择血脉，保持为0（无血脉状态）
    }

    setLineup(prev => [...prev, petId]);
    Live2DMessageHelper.showRocoSimulatorMessage('ADD_TO_LINEUP');
    showNotification('已添加到阵容');
    return true;
  }, [lineup, selectedTalents, showNotification]);

  // 从阵容移除
  const removeFromLineup = useCallback((petId: number) => {
    setLineup(prev => prev.filter(id => id !== petId));
    Live2DMessageHelper.showRocoSimulatorMessage('REMOVE_FROM_LINEUP');
    showNotification('已从阵容移除');
  }, [showNotification]);

  // 清空阵容
  const clearLineup = useCallback(() => {
    setLineup([]);
    Live2DMessageHelper.showRocoSimulatorMessage('CLEAR_LINEUP');
    showNotification('阵容已清空');
  }, [showNotification]);

  // 清空禁赛
  const clearBanned = useCallback(() => {
    setBannedPets([]);
    showNotification('禁赛列表已清空');
  }, [showNotification]);

  // 切换外观
  const selectSkin = useCallback((petId: number, skinIndex: number) => {
    setSelectedSkins(prev => ({
      ...prev,
      [petId]: skinIndex,
    }));
    Live2DMessageHelper.showRocoSimulatorMessage('SWITCH_SKIN');
    showNotification('外观已切换');
    setModals(prev => ({ ...prev, skin: false }));
  }, [showNotification]);

  // 选择血脉
  const selectTalent = useCallback((petId: number, talentId: number) => {
    setSelectedTalents(prev => ({
      ...prev,
      [petId]: talentId,
    }));
    Live2DMessageHelper.showRocoSimulatorMessage('SELECT_TALENT');
    const pet = getPetById(petId);
    const talent = talentData.find(t => t.id === talentId);
    if (talentId === 0) {
      showNotification(`已为 ${pet?.name} 选择不携带血脉`);
    } else {
      showNotification(`已为 ${pet?.name} 选择血脉：${talent?.name}`);
    }
    setModals(prev => ({ ...prev, talent: false }));
  }, [showNotification]);

  // 批量添加禁赛
  const batchAddBanned = useCallback(() => {
    const inputs = batchInput.split(/[,，]/).map(item => item.trim()).filter(Boolean);
    let addedCount = 0;
    const notFound: string[] = [];

    inputs.forEach(input => {
      const petId = parseInt(input);
      if (!isNaN(petId)) {
        const pet = getPetById(petId);
        if (pet && !bannedPets.includes(petId)) {
          setBannedPets(prev => [...prev, petId]);
          addedCount++;
        } else if (!pet) {
          notFound.push(input);
        }
      } else {
        // 按名称匹配
        const pet = pets.find(p => p.name.includes(input) && !bannedPets.includes(p.id));
        if (pet) {
          setBannedPets(prev => [...prev, pet.id]);
          addedCount++;
        } else {
          notFound.push(input);
        }
      }
    });

    if (addedCount > 0) {
      showNotification(`成功添加 ${addedCount} 个宠物到禁赛列表`);
    }
    if (notFound.length > 0) {
      showNotification(`未找到: ${notFound.join(', ')}`, 'error');
    }

    setBatchInput('');
    setModals(prev => ({ ...prev, batchBan: false }));
  }, [batchInput, bannedPets, showNotification]);

  // 批量添加阵容
  const batchAddLineup = useCallback(() => {
    const inputs = batchInput.split(/[,，\n]/).map(item => item.trim()).filter(Boolean);
    let addedCount = 0;
    const failed: string[] = [];

    inputs.forEach(input => {
      const petId = parseInt(input);
      let pet: Pet | undefined;

      if (!isNaN(petId)) {
        pet = getPetById(petId);
      } else {
        pet = pets.find(p => p.name.includes(input));
      }

      if (pet) {
        if (addToLineup(pet.id)) {
          addedCount++;
        } else {
          failed.push(input);
        }
      } else {
        failed.push(input);
      }
    });

    if (addedCount > 0) {
      showNotification(`成功添加 ${addedCount} 个宠物到阵容`);
    }
    if (failed.length > 0) {
      showNotification(`以下宠物未添加成功: ${failed.join(', ')}`, 'error');
    }

    setBatchInput('');
    setModals(prev => ({ ...prev, batchLineup: false }));
  }, [batchInput, addToLineup, showNotification]);

  // 计算总魔力值
  const totalMagic = useMemo(() => {
    return lineup.reduce((sum, petId) => {
      const pet = getPetById(petId);
      return sum + (pet?.magic || 0);
    }, 0);
  }, [lineup]);

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, petId: number, context: 'list' | 'banned' | 'lineup') => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      petId,
      context,
    });
  }, []);

  // 隐藏右键菜单
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // 渲染宠物卡片
  const renderPetCard = useCallback((pet: Pet, context: 'list' | 'banned' | 'lineup' | 'hidden') => {
    const isBanned = bannedPets.includes(pet.id);
    const inLineup = lineup.includes(pet.id);
    const hasSkins = skinPets[pet.id] && skinPets[pet.id].length > 1;
    const hasTalents = getPetTalents(pet.id).length > 0;
    const selectedTalentId = selectedTalents[pet.id];
    const isLarge = context === 'banned' || context === 'lineup';
    const imgSize = isLarge ? 'w-14 h-14' : 'w-12 h-12';
    // 账号管理相关状态
    const isOwned = accountManager.hasPet(pet.id);
    const isBatchSelected = selectedBatchPets.includes(pet.id);
    const showBatchCheckbox = isBatchMode && (context === 'list' || context === 'hidden');

    // 处理宠物图片加载成功 - 标记缓存
    const handlePetImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      // 标记这张图片已经成功加载过，下次刷新时可以直接从缓存读取
      markImageAsCached(img.src);
    };

    // 处理宠物图片加载失败 - 切换到本地备用图片
    const handlePetImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const localUrl = getLocalPetImageUrl(pet);
      if (img.src !== localUrl) {
        img.src = localUrl;
      }
    };

    // 处理血脉图片加载失败
    const handleTalentImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const localUrl = getLocalTalentImageUrl(selectedTalentId || 0);
      if (img.src !== localUrl) {
        img.src = localUrl;
      }
    };

    // 处理批量选择复选框点击
    const handleBatchCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedBatchPets(prev => {
        if (prev.includes(pet.id)) {
          return prev.filter(id => id !== pet.id);
        } else {
          return [...prev, pet.id];
        }
      });
    };

    // 处理标记拥有状态点击
    const handleOwnershipClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      togglePetOwnership(pet.id);
    };

    // 处理宠物卡片点击 - 添加到阵容或从阵容移除
    const handlePetCardClick = () => {
      // 批量模式下不处理点击
      if (isBatchMode) return;
      
      // 禁赛列表中的宠物不能添加
      if (context === 'banned') return;
      
      // 如果已在阵容中，点击移除
      if (inLineup) {
        removeFromLineup(pet.id);
        return;
      }
      
      // 添加到阵容
      addToLineup(pet.id);
    };

    return (
      <motion.div
        key={`${context}-${pet.id}`}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        className={`relative flex flex-col items-center p-1 rounded-lg cursor-pointer transition-colors min-h-[80px] ${
          isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50'
        } ${inLineup ? 'ring-2 ring-green-500 bg-green-500/10' : ''} ${isOwned && !isBatchMode ? (isDark ? 'bg-green-900/20' : 'bg-green-50/50') : ''} ${isBatchSelected ? (isDark ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-400') : ''}`}
        onClick={handlePetCardClick}
        onContextMenu={(e) => handleContextMenu(e, pet.id, context === 'banned' ? 'banned' : context === 'lineup' ? 'lineup' : 'list')}
      >
        {/* 批量选择复选框 */}
        {showBatchCheckbox && (
          <div
            className="absolute top-0 left-0 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: isBatchSelected ? '#3b82f6' : isDark ? '#374151' : '#ffffff',
              borderColor: isBatchSelected ? '#3b82f6' : isDark ? '#6b7280' : '#d1d5db',
            }}
            onClick={handleBatchCheckboxClick}
          >
            {isBatchSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
        {/* 宠物图片 */}
        <div className="relative flex-shrink-0">
          <img
            src={getPetImageUrlWithCache(pet)}
            alt={pet.name}
            onLoad={handlePetImageLoad}
            onError={handlePetImageError}
            className={`${imgSize} rounded-lg object-cover border-2 ${
              context === 'banned' ? 'border-red-500' :
              context === 'lineup' ? getMagicColor(pet.magic).border :
              isOwned ? 'border-green-400 dark:border-green-500' :
              'border-gray-300 dark:border-gray-600'
            }`}
          />
          {/* 魔力值徽章 */}
          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getMagicColor(pet.magic).bg} text-white text-[10px] flex items-center justify-center font-bold`}>
            {pet.magic}
          </span>
          {/* 禁赛标记 */}
          {isBanned && context !== 'banned' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <span className="text-red-500 text-2xl font-bold">×</span>
            </div>
          )}
          {/* 血脉标记 */}
          {selectedTalentId && selectedTalentId !== 0 && (
            <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border border-orange-400 flex items-center justify-center">
              <img
                src={getTalentImageUrl(selectedTalentId)}
                alt="血脉"
                onError={handleTalentImageError}
                className="w-3 h-3 rounded-full"
              />
            </div>
          )}
          {/* 外观按钮 */}
          {hasSkins && showSkinButton && context === 'list' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPetId(pet.id);
                setModals(prev => ({ ...prev, skin: true }));
              }}
              className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center"
              title="切换外观"
            >
              🎨
            </button>
          )}
        </div>
        {/* 宠物名称 - 强制一行显示，缩小字体确保完整显示 */}
        <span className={`mt-1 text-[9px] leading-tight text-center whitespace-nowrap w-full px-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {pet.name}
        </span>
      </motion.div>
    );
  }, [bannedPets, lineup, selectedTalents, showSkinButton, getPetImageUrl, getPetImageUrlWithCache, getTalentImageUrl, getLocalPetImageUrl, getLocalTalentImageUrl, handleContextMenu, isDark, getMagicColor, isBatchMode, selectedBatchPets, togglePetOwnership, addToLineup, removeFromLineup]);

  // 按魔力值分组的宠物
  const petsByMagic = useMemo(() => getPetsByMagic(), []);

  // 过滤后的宠物列表
  const filteredPetsByMagic = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered: typeof petsByMagic = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    Object.entries(petsByMagic).forEach(([magic, magicPets]) => {
      // 魔力值筛选
      if (magicFilter !== 'all' && magic !== magicFilter) {
        return;
      }

      filtered[parseInt(magic) as keyof typeof filtered] = magicPets.filter(pet => {
        // 搜索筛选
        if (searchQuery.trim()) {
          return pet.name.toLowerCase().includes(query) ||
                 pet.id.toString().includes(query);
        }
        return true;
      }).filter(pet => {
        // 只显示已有宠物筛选
        if (showOnlyOwned) {
          return accountManager.hasPet(pet.id);
        }
        return true;
      });
    });

    return filtered;
  // 添加 currentAccount 到依赖项，确保切换账号时刷新宠物列表
  }, [petsByMagic, searchQuery, magicFilter, showOnlyOwned, currentAccount]);

  // 是否有搜索结果
  const hasSearchResults = useMemo(() => {
    return Object.values(filteredPetsByMagic).some(list => list.length > 0);
  }, [filteredPetsByMagic]);

  return (
    <div className="space-y-6">
      {/* 通知 - 位置下移防止被导航栏遮挡 */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 左右七三分布局 - 手机端改为上下布局，阵容在上方 */}
      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* 手机端：阵容和禁赛在上方 / 桌面端：右侧 30% */}
        <div className="lg:w-[30%] lg:order-2">
          <div ref={rightPanelRef} style={rightPanelStyle} className="space-y-4">
            {/* 阵容区域 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border-2 p-4 backdrop-blur-sm transition-colors ${
                isDark
                  ? 'border-green-400/50 bg-green-900/10'
                  : 'border-green-400/50 bg-green-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  阵容 ({lineup.length}/6)
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setModals(prev => ({ ...prev, batchLineup: true }))}
                    className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                    title="批量添加"
                  >
                    +
                  </button>
                  <button
                    onClick={clearLineup}
                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                    title="清空"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* 魔力值统计 */}
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 text-lg font-bold">
                  <span className={totalMagic > 16 ? 'text-red-500' : 'text-green-500'}>{totalMagic}</span>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>/ 16</span>
                </div>
                <div className={`h-3 rounded-full overflow-hidden mt-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalMagic / 16) * 100)}%` }}
                    className={`h-full rounded-full ${totalMagic > 16 ? 'bg-red-500' : 'bg-green-500'}`}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {totalMagic > 16 && (
                  <p className="text-red-500 text-xs text-center mt-1">魔力值超限</p>
                )}
              </div>

              {/* 阵容列表 */}
              {lineup.length === 0 ? (
                <div className={`text-center py-6 rounded-lg border-2 border-dashed ${
                  isDark
                    ? 'border-gray-600 text-gray-400'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  <p className="text-sm">点击宠物添加到阵容</p>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1">
                  {lineup.map((petId, index) => {
                    const pet = getPetById(petId);
                    if (!pet) return null;

                    // 处理阵容宠物图片加载失败
                    const handleLineupPetImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                      const img = e.currentTarget;
                      const localUrl = `/roco-icons/pets/${pet.imageId || pet.id}.png`;
                      if (img.src !== localUrl) {
                        img.src = localUrl;
                      }
                    };
                    
                    // 处理阵容宠物血脉图片加载失败
                    const selectedTalentId = selectedTalents[pet.id];
                    const handleLineupTalentImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                      const img = e.currentTarget;
                      const localUrl = `/roco-icons/talents/${selectedTalentId}.png`;
                      if (img.src !== localUrl) {
                        img.src = localUrl;
                      }
                    };
                    
                    // 获取宠物图片URL
                    const getLineupPetImageUrl = () => {
                      const skinIndex = selectedSkins[pet.id];
                      const imageId = pet.imageId || pet.id;
                      const formattedId = String(imageId).padStart(3, '0');
                      if (skinIndex && skinIndex > 0 && skinPets[pet.id]) {
                        return `https://res.17roco.qq.com/res/combat/icons/1${formattedId}${skinIndex - 1}-.png`;
                      }
                      return `https://res.17roco.qq.com/res/combat/icons/${formattedId}-.png`;
                    };
                    
                    return (
                      <motion.div
                        key={`lineup-${pet.id}`}
                        layout
                        layoutId={`lineup-${pet.id}`}
                        whileHover={{ scale: 1.05 }}
                        className={`relative flex flex-col items-center justify-center p-1 rounded-lg cursor-pointer transition-colors aspect-square ${
                          isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50'
                        }`}
                        onClick={() => {
                          // 点击取消该宠物
                          removeFromLineup(pet.id);
                        }}
                        title="点击移除"
                      >
                        {/* 宠物图片 */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={getLineupPetImageUrl()}
                            alt={pet.name}
                            onError={handleLineupPetImageError}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border-2 ${getMagicColor(pet.magic).border}`}
                          />
                          {/* 魔力值徽章 */}
                          <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${getMagicColor(pet.magic).bg} text-white text-[7px] flex items-center justify-center font-bold`}>
                            {pet.magic}
                          </span>
                          {/* 血脉标记 */}
                          {selectedTalentId && selectedTalentId !== 0 && (
                            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-white dark:bg-gray-800 border border-orange-400 flex items-center justify-center">
                              <img
                                src={`https://res.17roco.qq.com/res/talent/${selectedTalentId}_small.png`}
                                alt="血脉"
                                onError={handleLineupTalentImageError}
                                className="w-2 h-2 rounded-full"
                              />
                            </div>
                          )}
                        </div>
                        {/* 宠物名称 - 强制一行显示，缩小字体确保完整显示 */}
                        <span className={`mt-0.5 text-[7px] leading-tight text-center whitespace-nowrap w-full px-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {pet.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* 操作按钮 - 使用更柔和的颜色 */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowSkinButton(prev => !prev)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                    showSkinButton
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {showSkinButton ? '隐藏外观' : '显示外观'}
                </button>
                <button
                  onClick={() => setModals(prev => ({ ...prev, rules: true }))}
                  className="flex-1 px-2 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded transition-colors"
                >
                  互斥规则
                </button>
              </div>
            </motion.div>

            {/* 禁赛宠物区域 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-xl border-2 border-red-400/50 p-4 ${isDark ? 'bg-red-900/10' : 'bg-red-50/50'} backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  禁赛 ({bannedPets.length})
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setModals(prev => ({ ...prev, batchBan: true }))}
                    className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                    title="批量添加"
                  >
                    +
                  </button>
                  <button
                    onClick={clearBanned}
                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                    title="清空"
                  >
                    ×
                  </button>
                </div>
              </div>
              {bannedPets.length === 0 ? (
                <p className={`text-center py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  暂无禁赛宠物
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {bannedPets.map(petId => {
                    const pet = getPetById(petId);
                    return pet ? renderPetCard(pet, 'banned') : null;
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* 左侧 70% - 宠物列表 */}
        <div className="lg:w-[70%] lg:order-1">
          {/* 宠物列表 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white/50'} backdrop-blur-sm p-4`}>
            {/* 标题、搜索框和魔力值筛选 */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* 账号切换器 */}
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>宠物列表</h3>
                  <div className="relative">
                    <button
                      onClick={() => setShowAccountDropdown(prev => !prev)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-colors ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="max-w-[80px] truncate">{currentAccount || '默认账号'}</span>
                      <svg className={`w-3 h-3 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* 账号下拉菜单 */}
                    {showAccountDropdown && (
                      <div className={`absolute top-full left-0 mt-1 z-20 rounded-lg shadow-lg py-1 min-w-[140px] ${
                        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                      }`}>
                        {accounts.map(account => (
                          <div key={account.name} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap">
                            <button
                              onClick={() => handleSwitchAccount(account.name)}
                              className={`text-left text-sm whitespace-nowrap ${
                                account.name === currentAccount
                                  ? 'text-green-500 font-medium'
                                  : isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}
                            >
                              {account.name} ({account.petIds.length})
                            </button>
                            {accounts.length > 1 && (
                              <button
                                onClick={() => handleDeleteAccount(account.name)}
                                className="ml-2 text-red-500 hover:text-red-600 text-xs flex-shrink-0"
                                title="删除账号"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {/* 新建账号输入框 */}
                        {showNewAccountInput ? (
                          <div className="px-3 py-1.5 flex items-center gap-1">
                            <input
                              type="text"
                              value={newAccountName}
                              onChange={(e) => setNewAccountName(e.target.value)}
                              placeholder="账号名称"
                              className={`flex-1 px-2 py-1 text-xs rounded border ${
                                isDark
                                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                              }`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateAccount();
                                if (e.key === 'Escape') {
                                  setShowNewAccountInput(false);
                                  setNewAccountName('');
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={handleCreateAccount}
                              className="text-green-500 hover:text-green-600 text-xs"
                              title="确认"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setShowNewAccountInput(false);
                                setNewAccountName('');
                              }}
                              className="text-red-500 hover:text-red-600 text-xs"
                              title="取消"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowNewAccountInput(true)}
                            className={`w-full text-left px-3 py-1.5 text-sm ${isDark ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-500 hover:bg-gray-50'}`}
                          >
                            + 新建账号
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索宠物名称或ID..."
                    className={`w-full sm:w-64 px-4 py-2 pl-10 rounded-lg border text-sm transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500'
                    } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
                  />
                  <svg
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center ${
                        isDark ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* 魔力值筛选按钮和账号管理操作 */}
              <div className="flex flex-wrap items-center gap-2">
                {MAGIC_FILTERS.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setMagicFilter(filter.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      magicFilter === filter.value
                        ? `${isDark ? filter.color.dark : filter.color.light} text-white shadow-md`
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
                {/* 分隔线 */}
                <div className={`w-px h-5 mx-1 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                {/* 只显示已有开关 */}
                <button
                  onClick={() => setShowOnlyOwned(prev => !prev)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    showOnlyOwned
                      ? 'bg-green-500 text-white shadow-md'
                      : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={showOnlyOwned ? '显示全部宠物' : '只显示已拥有的宠物'}
                >
                  {showOnlyOwned ? '✓ 已有' : '已有'}
                </button>
                {/* 批量选择按钮 */}
                <button
                  onClick={() => {
                    setIsBatchMode(prev => !prev);
                    setSelectedBatchPets([]);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    isBatchMode
                      ? 'bg-blue-500 text-white shadow-md'
                      : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isBatchMode ? '✓ 批量' : '批量'}
                </button>
                {/* 导入/导出按钮 */}
                <button
                  onClick={() => setImportExportModal({ open: true, mode: 'import' })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="导入/导出宠物列表"
                >
                  导入/导出
                </button>
              </div>
            </div>

            {/* 搜索结果提示 */}
            {searchQuery && !hasSearchResults && (
              <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-lg mb-2">🔍</p>
                <p>未找到匹配的宠物</p>
                <p className="text-sm mt-1">请尝试其他关键词</p>
              </div>
            )}

            <div className="space-y-4">
              {[5, 4, 3, 2, 1].map(magic => {
                const magicPets = filteredPetsByMagic[magic] || [];
                const visiblePets = magicPets.filter(p => !isPetHidden(p.id));
                const hiddenMagicPets = magic === 1 ? magicPets.filter(p => isPetHidden(p.id)) : [];

                if (visiblePets.length === 0 && hiddenMagicPets.length === 0) return null;

                return (
                  <div key={magic} className="flex items-start gap-4">
                    <span className={`text-2xl font-bold ${getMagicColor(magic).text} w-8 text-center flex-shrink-0 pt-2`}>
                      {magic}
                    </span>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 gap-3 flex-1">
                      {visiblePets.map(pet => renderPetCard(pet, 'list'))}
                      {magic === 1 && hiddenMagicPets.length > 0 && (
                        <>
                          {!showHiddenPets ? (
                            <button
                              onClick={() => setShowHiddenPets(true)}
                              className={`w-[72px] h-[72px] rounded-lg border-2 border-dashed flex items-center justify-center text-xl ${
                                isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                              }`}
                              title="展开更多宠物"
                            >
                              ⋯
                            </button>
                          ) : (
                            <>
                              {hiddenMagicPets.map(pet => renderPetCard(pet, 'hidden'))}
                              <button
                                onClick={() => setShowHiddenPets(false)}
                                className={`w-[72px] h-[72px] rounded-lg border-2 border-dashed flex items-center justify-center text-xl ${
                                  isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                                }`}
                                title="收起"
                              >
                                −
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && contextMenu.petId && (
        <div
          className={`fixed z-50 rounded-lg shadow-lg py-2 min-w-[150px] ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={hideContextMenu}
        >
          {contextMenu.context !== 'banned' && !bannedPets.includes(contextMenu.petId) && (
            <button
              onClick={() => toggleBanPet(contextMenu.petId!)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 text-red-500`}
            >
              加入禁赛
            </button>
          )}
          {contextMenu.context === 'banned' || bannedPets.includes(contextMenu.petId) ? (
            <button
              onClick={() => toggleBanPet(contextMenu.petId!)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-green-500/10 text-green-500`}
            >
              移出禁赛
            </button>
          ) : null}
          <div className={`my-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          {contextMenu.context !== 'lineup' && !lineup.includes(contextMenu.petId) && (
            <button
              onClick={() => addToLineup(contextMenu.petId!)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-green-500/10 text-green-500`}
            >
              加入阵容
            </button>
          )}
          {contextMenu.context === 'lineup' || lineup.includes(contextMenu.petId) ? (
            <button
              onClick={() => removeFromLineup(contextMenu.petId!)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-orange-500/10 text-orange-500`}
            >
              移出阵容
            </button>
          ) : null}
          {skinPets[contextMenu.petId] && skinPets[contextMenu.petId].length > 1 && (
            <>
              <div className={`my-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <button
                onClick={() => {
                  setCurrentPetId(contextMenu.petId);
                  setModals(prev => ({ ...prev, skin: true }));
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-500/10 text-blue-500`}
              >
                切换外观
              </button>
            </>
          )}
          {getPetTalents(contextMenu.petId).length > 0 && (
            <>
              <div className={`my-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <button
                onClick={() => {
                  setCurrentPetId(contextMenu.petId);
                  setModals(prev => ({ ...prev, talent: true }));
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-purple-500/10 text-purple-500`}
              >
                选择血脉
              </button>
            </>
          )}
          {/* 标记拥有状态 */}
          {(contextMenu.context === 'list' || contextMenu.context === 'hidden') && (
            <>
              <div className={`my-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              {accountManager.hasPet(contextMenu.petId!) ? (
                <button
                  onClick={() => {
                    accountManager.removePetFromCurrentAccount(contextMenu.petId!);
                    refreshAccounts();
                    showNotification('已标记为未拥有');
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 text-red-500`}
                >
                  标记为未拥有
                </button>
              ) : (
                <button
                  onClick={() => {
                    accountManager.addPetToCurrentAccount(contextMenu.petId!);
                    refreshAccounts();
                    showNotification('已标记为已拥有');
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-green-500/10 text-green-500`}
                >
                  标记为已拥有
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 点击其他地方隐藏右键菜单 */}
      {contextMenu.visible && (
        <div className="fixed inset-0 z-40" onClick={hideContextMenu} />
      )}

      {/* 批量操作栏 - 可拖拽，悬浮在页面上 */}
      {isBatchMode && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          style={{
            left: `${batchPanelPos.x}px`,
            top: `${batchPanelPos.y}px`,
          }}
          onMouseDown={handleBatchPanelMouseDown}
          className={`fixed z-[10003] px-3 py-2 rounded-xl shadow-2xl border max-w-[280px] cursor-default select-none ${
            isDark
              ? 'bg-gray-800/95 border-gray-700'
              : 'bg-white/95 border-gray-200'
          } backdrop-blur-sm ${isDraggingBatchPanel ? 'cursor-move' : ''}`}
        >
          {/* 拖拽标题栏 */}
          <div className="batch-panel-header flex items-center justify-between mb-2 cursor-move">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              已选 <span className="text-blue-500 font-bold">{selectedBatchPets.length}</span>
            </span>
            <button
              onClick={() => {
                setIsBatchMode(false);
                setSelectedBatchPets([]);
              }}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                isDark
                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
              title="退出批量模式"
            >
              ×
            </button>
          </div>

          {/* 快捷操作 */}
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => {
                // 全选当前可见的所有宠物
                const allVisiblePetIds: number[] = [];
                Object.values(filteredPetsByMagic).forEach(list => {
                  list.forEach(pet => {
                    if (!allVisiblePetIds.includes(pet.id)) {
                      allVisiblePetIds.push(pet.id);
                    }
                  });
                });
                setSelectedBatchPets(allVisiblePetIds);
              }}
              className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors ${
                isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全选
            </button>
            <button
              onClick={() => setSelectedBatchPets([])}
              className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors ${
                isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              清空
            </button>
          </div>

          {/* 主要操作按钮 */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => batchToggleOwnership(true)}
              className="w-full px-2 py-1.5 text-[11px] bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
            >
              标记为已拥有
            </button>
            <button
              onClick={() => batchToggleOwnership(false)}
              className="w-full px-2 py-1.5 text-[11px] bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              标记为未拥有
            </button>
          </div>
        </motion.div>
      )}

      {/* 外观选择模态框 */}
      {modals.skin && currentPetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModals(prev => ({ ...prev, skin: false }))}>
          <div className={`rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>选择外观</h3>
            <div className="grid grid-cols-3 gap-4">
              {skinPets[currentPetId]?.map((skinName, index) => {
                const pet = getPetById(currentPetId);
                if (!pet) return null;
                const isSelected = (selectedSkins[currentPetId] || 0) === index;
                const imageId = pet.imageId || pet.id;
                // 网络URL
                let networkUrl: string;
                if (index === 0) {
                  networkUrl = `https://res.17roco.qq.com/res/combat/icons/${String(imageId).padStart(3, '0')}-.png`;
                } else {
                  networkUrl = `https://res.17roco.qq.com/res/combat/icons/1${String(pet.id).padStart(3, '0')}${index - 1}-.png`;
                }
                // 本地备用URL
                const localUrl = `/roco-icons/pets/${imageId}.png`;

                const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                  const img = e.currentTarget;
                  if (img.src !== localUrl) {
                    img.src = localUrl;
                  }
                };

                return (
                  <button
                    key={index}
                    onClick={() => selectSkin(currentPetId, index)}
                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-500/10'
                        : isDark
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={networkUrl}
                      alt={skinName}
                      onError={handleImageError}
                      className="w-16 h-16 rounded-lg object-cover mb-2"
                    />
                    <span className={`text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{skinName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 血脉选择模态框 */}
      {modals.talent && currentPetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModals(prev => ({ ...prev, talent: false }))}>
          <div className={`rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>选择血脉</h3>
            <div className="space-y-3">
              <button
                onClick={() => selectTalent(currentPetId, 0)}
                className={`w-full flex items-center gap-4 p-3 rounded-lg border-2 transition-all ${
                  (selectedTalents[currentPetId] || 0) === 0
                    ? 'border-green-500 bg-green-500/10'
                    : isDark
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img src={getTalentImageUrl(0)} alt="不携带" className="w-10 h-10 rounded-lg" />
                <div className="text-left">
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>不携带血脉</div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>参赛时不携带任何血脉</div>
                </div>
              </button>
              {getPetTalents(currentPetId).map(talentId => {
                const talent = talentData.find(t => t.id === talentId);
                if (!talent) return null;
                const isSelected = selectedTalents[currentPetId] === talentId;
                const networkUrl = `https://res.17roco.qq.com/res/talent/${talentId}_small.png`;
                const localUrl = `/roco-icons/talents/${talentId}.png`;

                const handleTalentModalError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                  const img = e.currentTarget;
                  if (img.src !== localUrl) {
                    img.src = localUrl;
                  }
                };

                return (
                  <button
                    key={talentId}
                    onClick={() => selectTalent(currentPetId, talentId)}
                    className={`w-full flex items-start gap-4 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-500/10'
                        : isDark
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={networkUrl}
                      alt={talent.name}
                      onError={handleTalentModalError}
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                    />
                    <div className="text-left flex-1">
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{talent.name}</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{talent.effect}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 互斥规则模态框 */}
      {modals.rules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModals(prev => ({ ...prev, rules: false }))}>
          <div className={`rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>互斥规则说明</h3>
            <div className="space-y-4">
              {exclusiveGroups.map((group, index) => (
                <div key={index} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className={`font-medium mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>互斥组 {index + 1}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.map(petId => {
                      const pet = getPetById(petId);
                      return pet ? (
                        <span key={petId} className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-gray-600 text-gray-200' : 'bg-white text-gray-700 border'}`}>
                          {pet.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>这些宠物不可同时参赛</p>
                </div>
              ))}
            </div>
            <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
              <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                <strong>规则说明：</strong>同一互斥组内的宠物不可同时出现在阵容中。当您尝试添加互斥宠物时，系统会提示冲突信息。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 批量添加禁赛模态框 */}
      {modals.batchBan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModals(prev => ({ ...prev, batchBan: false }))}>
          <div className={`rounded-xl p-6 max-w-md w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>批量添加禁赛宠物</h3>
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="输入宠物序号/名称，多个请用逗号分隔&#10;例如：2585, 2810, 海芙约忒, 巴哈姆特"
              className={`w-full h-32 p-3 rounded-lg border resize-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModals(prev => ({ ...prev, batchBan: false }))}
                className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                取消
              </button>
              <button
                onClick={batchAddBanned}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量添加阵容模态框 */}
      {modals.batchLineup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModals(prev => ({ ...prev, batchLineup: false }))}>
          <div className={`rounded-xl p-6 max-w-md w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>批量添加阵容</h3>
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="请输入宠物名称，多个名称用逗号或换行分隔"
              className={`w-full h-32 p-3 rounded-lg border resize-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModals(prev => ({ ...prev, batchLineup: false }))}
                className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                取消
              </button>
              <button
                onClick={batchAddLineup}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入/导出模态框 */}
      {importExportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setImportExportModal({ open: false, mode: 'import' })}>
          <div className={`rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            {/* 模态框标题和模式切换 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {importExportModal.mode === 'import' ? '导入宠物' : '导出宠物'}
              </h3>
              <div className="flex rounded-lg overflow-hidden border">
                <button
                  onClick={() => {
                    setImportExportModal({ open: true, mode: 'import' });
                    setImportText('');
                  }}
                  className={`px-3 py-1 text-xs transition-colors ${
                    importExportModal.mode === 'import'
                      ? 'bg-blue-500 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  导入
                </button>
                <button
                  onClick={() => {
                    setImportExportModal({ open: true, mode: 'export' });
                    setExportFormat('id');
                  }}
                  className={`px-3 py-1 text-xs transition-colors ${
                    importExportModal.mode === 'export'
                      ? 'bg-blue-500 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  导出
                </button>
              </div>
            </div>

            {/* 导入模式内容 */}
            {importExportModal.mode === 'import' && (
              <div className="space-y-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  输入宠物ID或名称，多个宠物用逗号、换行或空格分隔。系统会自动识别并匹配宠物。
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="例如：2585, 海芙约忒, 巴哈姆特&#10;或者每行一个宠物名称"
                  className={`w-full h-48 p-3 rounded-lg border resize-none text-sm ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setImportExportModal({ open: false, mode: 'import' })}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleImportPets}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  >
                    导入
                  </button>
                </div>
              </div>
            )}

            {/* 导出模式内容 */}
            {importExportModal.mode === 'export' && (
              <div className="space-y-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  导出当前账号拥有的宠物列表。选择导出格式后，可以复制到剪贴板。
                </p>
                {/* 导出格式选择 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportFormat('id')}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      exportFormat === 'id'
                        ? 'bg-blue-500 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ID格式
                  </button>
                  <button
                    onClick={() => setExportFormat('name')}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      exportFormat === 'name'
                        ? 'bg-blue-500 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    名称格式
                  </button>
                </div>
                {/* 导出内容预览 */}
                <div className={`p-3 rounded-lg border max-h-48 overflow-y-auto ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <pre className={`text-xs whitespace-pre-wrap break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getExportText() || '当前账号没有宠物'}
                  </pre>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setImportExportModal({ open: false, mode: 'import' })}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    关闭
                  </button>
                  <button
                    onClick={() => copyToClipboard(getExportText())}
                    disabled={!getExportText()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    复制到剪贴板
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
