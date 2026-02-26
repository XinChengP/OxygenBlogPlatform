'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryImage } from '../../../types/gallery';
import { useNavigationVisibility } from '@/contexts/NavigationVisibilityContext';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, 
  Move, Keyboard, Info, Tag
} from 'lucide-react';

// ImagePreview组件属性
interface ImagePreviewProps {
  images: GalleryImage[];
  initialImage: GalleryImage;
  onClose: () => void;
}

// ImagePreview组件
const ImagePreview = ({ images, initialImage, onClose }: ImagePreviewProps) => {
  // 获取导航栏可见性控制
  const { setVisibility } = useNavigationVisibility();
  
  // 计算初始图片索引
  const initialIndex = images.findIndex(img => img.id === initialImage.id);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // 缩放和拖拽状态
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  
  // 获取当前图片
  const currentImage = images[currentIndex];
  
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 缩放级别预设
  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  
  // 重置缩放和位置
  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);
  
  // 放大
  const zoomIn = useCallback(() => {
    setScale(prev => {
      const nextLevel = zoomLevels.find(level => level > prev);
      return nextLevel || 3;
    });
  }, []);
  
  // 缩小
  const zoomOut = useCallback(() => {
    setScale(prev => {
      const prevLevel = [...zoomLevels].reverse().find(level => level < prev);
      return prevLevel || 0.5;
    });
  }, []);
  
  // 切换到上一张图片
  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    resetTransform();
  }, [images.length, resetTransform]);
  
  // 切换到下一张图片
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    resetTransform();
  }, [images.length, resetTransform]);
  
  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        handlePrev();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case '+':
      case '=':
        zoomIn();
        break;
      case '-':
        zoomOut();
        break;
      case '0':
        resetTransform();
        break;
      case 'i':
      case 'I':
        setShowInfo(prev => !prev);
        break;
      case '?':
        setShowKeyboardHint(prev => !prev);
        break;
      default:
        break;
    }
  }, [onClose, handlePrev, handleNext, zoomIn, zoomOut, resetTransform]);
  
  // 鼠标拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [scale, position]);
  
  // 鼠标拖拽移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, scale, dragStart]);
  
  // 鼠标拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // 双击切换缩放
  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      setScale(2);
    } else {
      resetTransform();
    }
  }, [scale, resetTransform]);
  
  // 点击背景关闭预览
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // 添加键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // 预览打开时隐藏导航栏，关闭时恢复
  useEffect(() => {
    // 隐藏导航栏
    setVisibility(false);
    
    // 组件卸载时恢复导航栏
    return () => {
      setVisibility(true);
    };
  }, [setVisibility]);
  
  // 鼠标离开时停止拖拽
  useEffect(() => {
    const handleMouseLeave = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseUp]);
  
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={handleBackgroundClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 顶部工具栏 */}
      <motion.div 
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* 左侧：图片计数 */}
        <div className="flex items-center gap-2 text-white/80">
          <span className="text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
        
        {/* 中间：缩放控制 */}
        <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 backdrop-blur-sm">
          <motion.button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={zoomOut}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="缩小 (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </motion.button>
          
          <span className="text-white text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <motion.button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={zoomIn}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="放大 (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </motion.button>
          
          <div className="w-px h-4 bg-white/20 mx-1"></div>
          
          <motion.button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={resetTransform}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="重置 (0)"
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>
        </div>
        
        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-1">
          <motion.button
            className={`p-2 rounded-full transition-colors ${showInfo ? 'text-primary bg-primary/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
            onClick={() => setShowInfo(prev => !prev)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="图片信息 (I)"
          >
            <Info className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            className={`p-2 rounded-full transition-colors ${showKeyboardHint ? 'text-primary bg-primary/20' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
            onClick={() => setShowKeyboardHint(prev => !prev)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="快捷键 (?)"
          >
            <Keyboard className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            title="关闭 (Esc)"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
      
      {/* 左右切换按钮 */}
      <motion.button
        className="absolute left-4 z-10 p-3 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
        onClick={handlePrev}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="上一张"
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>
      
      <motion.button
        className="absolute right-4 z-10 p-3 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
        onClick={handleNext}
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="下一张"
      >
        <ChevronRight className="w-6 h-6" />
      </motion.button>
      
      {/* 图片容器 */}
      <motion.div 
        ref={containerRef}
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        key={currentImage.id}
      >
        <motion.img
          src={currentImage.src}
          alt={currentImage.alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          draggable={false}
        />
        
        {/* 拖拽提示 */}
        {scale > 1 && !isDragging && (
          <motion.div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60 text-sm bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Move className="w-4 h-4" />
            <span>拖拽查看细节</span>
          </motion.div>
        )}
      </motion.div>
      
      {/* 底部信息栏 */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent py-4 px-6"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-white text-lg font-medium truncate">{currentImage.alt}</p>
            <div className="flex items-center gap-2 mt-1">
              <Tag className="w-3 h-3 text-primary" />
              <span className="text-white/70 text-sm">{currentImage.category}</span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* 图片信息面板 */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="absolute top-16 right-4 z-20 bg-black/80 backdrop-blur-md rounded-lg p-4 text-white min-w-[200px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              图片信息
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">描述</span>
                <span className="text-white truncate max-w-[120px]">{currentImage.alt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">分类</span>
                <span className="text-primary">{currentImage.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">索引</span>
                <span>{currentIndex + 1} / {images.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">缩放</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 键盘快捷键提示 */}
      <AnimatePresence>
        {showKeyboardHint && (
          <motion.div
            className="absolute top-16 right-4 z-20 bg-black/80 backdrop-blur-md rounded-lg p-4 text-white min-w-[220px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-primary" />
              快捷键
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">上一张</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">←</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">下一张</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">→</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">放大</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">+</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">缩小</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">-</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">重置</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">0</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">图片信息</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">I</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">快捷键</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">?</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">关闭</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">Esc</kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 缩略图导航 */}
      <motion.div 
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        {images.slice(Math.max(0, currentIndex - 2), Math.min(images.length, currentIndex + 3)).map((img, idx) => {
          const actualIndex = Math.max(0, currentIndex - 2) + idx;
          return (
            <motion.button
              key={img.id}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                actualIndex === currentIndex 
                  ? 'border-primary scale-110' 
                  : 'border-white/20 opacity-50 hover:opacity-80'
              }`}
              onClick={() => {
                setCurrentIndex(actualIndex);
                resetTransform();
              }}
              whileHover={{ scale: actualIndex === currentIndex ? 1.1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img 
                src={img.src} 
                alt={img.alt}
                className="w-full h-full object-cover"
              />
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

export default ImagePreview;
