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
};

// 右键菜单类型
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  petId: number | null;
  context: 'list' | 'banned' | 'lineup';
}

// 模态框类型
interface ModalState {
  skin: boolean;
  talent: boolean;
  rules: boolean;
  batchBan: boolean;
  batchLineup: boolean;
}

// 拖拽状态
interface DragState {
  isDragging: boolean;
  draggedPetId: number | null;
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
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, draggedPetId: null });
  const [isDragOverLineup, setIsDragOverLineup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // 获取宠物图片URL（网络优先，失败用本地）
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

    // 返回网络URL，让img标签的onError处理失败情况
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

    // 如果宠物有血脉且未选择过，默认选择第一个血脉
    const petTalents = getPetTalents(petId);
    if (petTalents.length > 0 && !selectedTalents[petId]) {
      setSelectedTalents(prev => ({
        ...prev,
        [petId]: petTalents[0],
      }));
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

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, petId: number) => {
    setDragState({ isDragging: true, draggedPetId: petId });
    e.dataTransfer.effectAllowed = 'move';
    // 设置拖拽数据
    e.dataTransfer.setData('text/plain', petId.toString());
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDragState({ isDragging: false, draggedPetId: null });
    setIsDragOverLineup(false);
  }, []);

  // 拖拽进入阵容区域
  const handleDragOverLineup = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverLineup(true);
  }, []);

  // 拖拽离开阵容区域
  const handleDragLeaveLineup = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLineup(false);
  }, []);

  // 放置到阵容区域
  const handleDropOnLineup = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLineup(false);
    const petId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!isNaN(petId)) {
      addToLineup(petId);
    }
  }, [addToLineup]);

  // 渲染宠物卡片
  const renderPetCard = useCallback((pet: Pet, context: 'list' | 'banned' | 'lineup' | 'hidden') => {
    const isBanned = bannedPets.includes(pet.id);
    const inLineup = lineup.includes(pet.id);
    const hasSkins = skinPets[pet.id] && skinPets[pet.id].length > 1;
    const hasTalents = getPetTalents(pet.id).length > 0;
    const selectedTalentId = selectedTalents[pet.id];
    const isLarge = context === 'banned' || context === 'lineup';
    const imgSize = isLarge ? 'w-14 h-14' : 'w-12 h-12';
    const isDraggable = context === 'list' || context === 'hidden';

    // 处理宠物图片加载失败
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

    return (
      <motion.div
        key={`${context}-${pet.id}`}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, pet.id)}
        onDragEnd={handleDragEnd}
        className={`relative flex flex-col items-center p-1 rounded-lg cursor-pointer transition-colors min-h-[80px] ${
          isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50'
        } ${isDraggable ? 'cursor-move' : ''} ${dragState.draggedPetId === pet.id ? 'opacity-50' : ''}`}
        onContextMenu={(e) => handleContextMenu(e, pet.id, context === 'banned' ? 'banned' : context === 'lineup' ? 'lineup' : 'list')}
      >
        {/* 宠物图片 */}
        <div className="relative flex-shrink-0">
          <img
            src={getPetImageUrl(pet)}
            alt={pet.name}
            onError={handlePetImageError}
            className={`${imgSize} rounded-lg object-cover border-2 ${
              context === 'banned' ? 'border-red-500' :
              context === 'lineup' ? getMagicColor(pet.magic).border :
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
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center"
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
  }, [bannedPets, lineup, selectedTalents, showSkinButton, getPetImageUrl, getTalentImageUrl, getLocalPetImageUrl, getLocalTalentImageUrl, handleContextMenu, isDark, dragState.draggedPetId, handleDragStart, handleDragEnd, getMagicColor]);

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
      });
    });

    return filtered;
  }, [petsByMagic, searchQuery, magicFilter]);

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
              onDragOver={handleDragOverLineup}
              onDragLeave={handleDragLeaveLineup}
              onDrop={handleDropOnLineup}
              className={`rounded-xl border-2 p-4 backdrop-blur-sm transition-colors ${
                isDragOverLineup
                  ? 'border-green-500 bg-green-500/20'
                  : isDark
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
                  isDragOverLineup
                    ? 'border-green-500 bg-green-500/10'
                    : isDark
                    ? 'border-gray-600 text-gray-400'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  <p className="text-sm">拖拽宠物到此处</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
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
                        draggable
                        onDragStart={(e) => {
                          setDragState({ isDragging: true, draggedPetId: pet.id });
                          (e as unknown as React.DragEvent).dataTransfer?.setData('text/plain', JSON.stringify({ petId: pet.id, fromIndex: index }));
                        }}
                        onDragEnd={() => setDragState({ isDragging: false, draggedPetId: null })}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                            if (data.fromIndex !== undefined && data.fromIndex !== index) {
                              // 交换位置
                              const newLineup = [...lineup];
                              const [movedPet] = newLineup.splice(data.fromIndex, 1);
                              newLineup.splice(index, 0, movedPet);
                              setLineup(newLineup);
                            }
                          } catch {
                            // 如果不是内部拖拽，尝试添加新宠物
                            const petId = parseInt(e.dataTransfer.getData('text/plain'));
                            if (!isNaN(petId)) {
                              addToLineup(petId);
                            }
                          }
                        }}
                        whileHover={{ scale: 1.05 }}
                        className={`relative flex flex-col items-center p-1 rounded-lg cursor-move transition-colors min-h-[80px] ${
                          isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50'
                        } ${dragState.draggedPetId === pet.id ? 'opacity-50' : ''}`}
                        onClick={() => {
                          // 点击取消该宠物
                          removeFromLineup(pet.id);
                        }}
                        title="点击移除，拖拽调整顺序"
                      >
                        {/* 宠物图片 */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={getLineupPetImageUrl()}
                            alt={pet.name}
                            onError={handleLineupPetImageError}
                            className={`w-14 h-14 rounded-lg object-cover border-2 ${getMagicColor(pet.magic).border}`}
                          />
                          {/* 魔力值徽章 */}
                          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getMagicColor(pet.magic).bg} text-white text-[10px] flex items-center justify-center font-bold`}>
                            {pet.magic}
                          </span>
                          {/* 血脉标记 */}
                          {selectedTalentId && selectedTalentId !== 0 && (
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border border-orange-400 flex items-center justify-center">
                              <img
                                src={`https://res.17roco.qq.com/res/talent/${selectedTalentId}_small.png`}
                                alt="血脉"
                                onError={handleLineupTalentImageError}
                                className="w-3 h-3 rounded-full"
                              />
                            </div>
                          )}
                        </div>
                        {/* 宠物名称 - 强制一行显示，缩小字体确保完整显示 */}
                        <span className={`mt-1 text-[9px] leading-tight text-center whitespace-nowrap w-full px-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>宠物列表</h3>
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

              {/* 魔力值筛选按钮 */}
              <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {/* 点击其他地方隐藏右键菜单 */}
      {contextMenu.visible && (
        <div className="fixed inset-0 z-40" onClick={hideContextMenu} />
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
    </div>
  );
}
