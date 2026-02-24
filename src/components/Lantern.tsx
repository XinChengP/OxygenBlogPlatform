'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigationVisibility } from '@/contexts/NavigationVisibilityContext';

interface LanternProps {
  text?: string;
  enabled?: boolean;
}

export default function Lantern({ text = '新春快乐', enabled = true }: LanternProps) {
  const { isVisible } = useNavigationVisibility();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 存储灯笼元素引用
  const lanternRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // 拖拽状态管理
  const draggingRef = useRef<{
    isDragging: boolean;
    lanternIndex: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    lastX: number;
    lastY: number;
    velocityX: number;
    velocityY: number;
    lastTime: number;
  }>({
    isDragging: false,
    lanternIndex: -1,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    velocityX: 0,
    velocityY: 0,
    lastTime: 0,
  });
  
  // 存储灯笼位置
  const positionRefs = useRef<Map<number, { x: number; y: number }>>(new Map());
  
  // 点击超时引用，用于区分点击和拖拽
  const clickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // 创建灯笼容器
    const container = document.createElement('div');
    container.className = 'deng-container';
    container.setAttribute('data-lantern-feature', 'true');
    containerRef.current = container;

    // 解析文本为字符数组
    const texts = text.split('');

    // 创建灯笼
    texts.forEach((char, index) => {
      const box = document.createElement('div');
      box.className = `deng-box deng-box${index + 1}`;
      box.style.cursor = 'move';
      box.style.pointerEvents = 'auto';
      
      // 存储灯笼引用
      lanternRefs.current.set(index, box);
      
      // 初始化位置
      const initialPosition = {
        x: parseInt(getComputedStyle(box).left) || 0,
        y: parseInt(getComputedStyle(box).top) || 0
      };
      positionRefs.current.set(index, initialPosition);

      // 3D 容器 (负责摆动)
      const lantern3D = document.createElement('div');
      lantern3D.className = 'lantern-3d';

      // 吊线
      const xian = document.createElement('div');
      xian.className = 'xian';

      // 创建简单的盖子
      const capTop = document.createElement('div');
      capTop.className = 'lantern-cap-top';
      // 添加提环
      const capLoop = document.createElement('div');
      capLoop.className = 'cap-loop';
      capTop.appendChild(capLoop);

      const capBottom = document.createElement('div');
      capBottom.className = 'lantern-cap-bottom';

      // 灯笼主体 (负责自转)
      const lanternBody = document.createElement('div');
      lanternBody.className = 'lantern-body';

      // 内部光源
      const lanternLight = document.createElement('div');
      lanternLight.className = 'lantern-light';
      lanternBody.appendChild(lanternLight);

      // 创建瓣片
      for (let i = 0; i < 10; i++) {
        const rib = document.createElement('div');
        rib.className = 'rib';
        rib.style.transform = `rotateY(${i * 36}deg)`; 
        lanternBody.appendChild(rib);
      }

      // 文字
      const textDeng = document.createElement('div');
      textDeng.className = 'deng-t';
      textDeng.textContent = char;

      // 吊尾
      const tassel = document.createElement('div');
      tassel.className = 'tassel-total';
      tassel.innerHTML = `
        <div class="tassel-bead"></div> 
        <div class="tassel-knot-flat"></div>
        <div class="tassel-threads"></div>
      `;
      
      // 组装
      lantern3D.appendChild(xian);
      lantern3D.appendChild(capTop);
      lantern3D.appendChild(capBottom);
      lantern3D.appendChild(lanternBody);
      lantern3D.appendChild(textDeng);
      lantern3D.appendChild(tassel);
      box.appendChild(lantern3D);
      container.appendChild(box);
    });

    // 添加CSS样式 - 关键：使用CSS变量和transition实现平滑动画
    const style = document.createElement('style');
    style.setAttribute('data-lantern-style', 'true');
    style.textContent = `
      .deng-container {
        position: fixed;
        top: 104px; /* 原40px + 64px = 104px */
        left: 0;
        width: 100%;
        height: 0;
        z-index: 40; /* 导航栏z-index是50，所以灯笼放在40 */
        pointer-events: auto;
        perspective: 800px;
        /* 关键：使用CSS变量和transition实现平滑动画，与导航栏完全同步 */
        transform: translateY(var(--lantern-y, 0px));
        transition: transform 0.3s ease-in-out;
      }
      
      /* 拖拽时的样式 */
      .deng-box.dragging {
        z-index: 55 !important;
        transform: scale(1.1);
        transition: all 0.2s ease;
      }
      
      /* 点击时的动画 */
      .deng-box.clicked {
        animation: clickAnimation 0.5s ease-in-out;
      }
      
      @keyframes clickAnimation {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      .deng-box {
        position: fixed;
        z-index: 45; /* 导航栏z-index是50，灯笼盒子放在45 */
      }
      .deng-box1 {
        left: 40px;
        top: -10px;
        animation-delay: 0s;
      }
      .deng-box2 {
        left: 180px;
        top: 30px;
        animation-delay: 0.5s;
      }
      .deng-box3 {
        right: 180px;
        top: 30px;
        animation-delay: 1s;
      }
      .deng-box4 {
        right: 40px;
        top: -10px;
        animation-delay: 1.5s;
      }

      .xian {
        position: absolute;
        left: 60px;
        width: 3px;
        background: #ffca28;
        height: 1000px;
        top: -1000px;
        box-shadow: 0 0 5px rgba(255, 202, 40, 0.6);
        z-index: 20; /* 导航栏z-index是50，吊绳放在20，确保在导航栏后面 */
      }

      /* 容器负责整体摆动 */
      .lantern-3d {
        position: relative;
        width: 120px;
        height: 100px;
        transform-style: preserve-3d;
        transform-origin: 50% 0;
        animation: swingNatural 5s infinite ease-in-out;
      }

      /* 主体负责自转 */
      .lantern-body {
        position: absolute;
        width: 100%;
        height: 100%;
        transform-style: preserve-3d;
        animation: rotateBody 18s infinite linear;
        z-index: 5;
      }

      .rib {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 1px solid rgba(255, 202, 40, 0.6);
        box-sizing: border-box;
        background: radial-gradient(circle at 50% 50%, rgba(216,0,15,0) 20%, rgba(216,0,15,0.7) 60%, rgba(216,0,15,0.95) 100%);
        backface-visibility: visible;
      }

      /* 简化的、不旋转的盖子 */
      .lantern-cap-top,
      .lantern-cap-bottom {
        position: absolute;
        left: 35px;
        width: 50px;
        height: 12px;
        background: linear-gradient(to bottom, #ffd700, #ffca28, #b8860b);
        border: 1px solid #ffca28;
        border-radius: 4px;
        z-index: 20;
        box-shadow: 0 2px 5px rgba(0,0,0,0.4);
      }
      .lantern-cap-top {
        top: -6px;
        border-bottom: none;
      }
      .lantern-cap-bottom {
        bottom: -6px;
        border-top: none;
      }

      /* 提环 */
      .cap-loop {
        position: absolute;
        left: 18px;
        top: -8px;
        width: 14px;
        height: 8px;
        border: 2px solid #ffca28;
        border-bottom: none;
        border-radius: 10px 10px 0 0;
      }

      .lantern-light {
        position: absolute;
        width: 60px;
        height: 60px;
        top: 20px;
        left: 30px;
        background: #ffeb3b;
        border-radius: 50%;
        filter: blur(18px);
        opacity: 0.9;
        animation: flicker 3s infinite ease-in-out;
      }

      .deng-t {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 3rem;
        color: #ffca28;
        font-weight: 700;
        font-family: "华文行楷", "KaiTi", serif;
        text-shadow: 0 0 5px #ff6a00, 0 0 20px #ff0000;
        transform: translateZ(62px);
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
        z-index: 30;
      }

      .tassel-total {
        position: absolute;
        top: 100px;
        left: 60px;
        width: 0;
        height: auto;
        transform-style: preserve-3d;
        animation: tasselSwing 5s infinite ease-in-out;
        animation-delay: 0.5s;
      }

      .tassel-bead {
        position: absolute;
        left: -6px;
        top: 5px;
        width: 12px;
        height: 12px;
        background: radial-gradient(circle at 30% 30%, #fff, #ef5350);
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        z-index: 5;
      }

      /* 改回扁平的中国结 */
      .tassel-knot-flat {
        position: absolute;
        left: -8px;
        top: 18px;
        width: 16px;
        height: 16px;
        background: #d8000f;
        border: 1px solid #ffca28;
        transform: rotate(45deg);
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        z-index: 4;
      }

      .tassel-threads {
        position: absolute;
        left: -7px;
        top: 32px;
        width: 14px;
        height: 70px;
        background: repeating-linear-gradient(90deg, #d8000f, #d8000f 2px, #ff5252 2.5px, #d8000f 3px);
        border-radius: 2px 2px 5px 5px;
        mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
      }

      @keyframes flicker {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      @keyframes swingNatural {
        0% { transform: rotateX(-4deg) rotateZ(-2deg); }
        25% { transform: rotateX(2deg) rotateZ(3deg); }
        50% { transform: rotateX(4deg) rotateZ(2deg); }
        75% { transform: rotateX(-2deg) rotateZ(-3deg); }
        100% { transform: rotateX(-4deg) rotateZ(-2deg); }
      }
      @keyframes tasselSwing {
        0% { transform: rotateX(-5deg) rotateZ(-5deg); }
        50% { transform: rotateX(5deg) rotateZ(5deg); }
        100% { transform: rotateX(-5deg) rotateZ(-5deg); }
      }
      @keyframes rotateBody {
        from { transform: rotateY(0deg); }
        to { transform: rotateY(360deg); }
      }

      @media (max-width: 768px) {
        .deng-box { transform: scale(0.6); }
        .deng-box1 { left: 10px; }
        .deng-box2 { left: 80px; }
        .deng-box3 { right: 80px; }
        .deng-box4 { right: 10px; }
      }
    `;

    // 拖拽相关函数
    const handleMouseDown = (e: MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      
      const lantern = lanternRefs.current.get(index);
      if (!lantern) return;
      
      const rect = lantern.getBoundingClientRect();
      const position = positionRefs.current.get(index) || { x: 0, y: 0 };
      
      draggingRef.current = {
        isDragging: true,
        lanternIndex: index,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        lastX: e.clientX,
        lastY: e.clientY,
        velocityX: 0,
        velocityY: 0,
        lastTime: performance.now(),
      };
      
      // 添加拖拽样式
      lantern.classList.add('dragging');
      
      // 清除点击超时
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current.isDragging) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - draggingRef.current.lastTime;
      const deltaX = e.clientX - draggingRef.current.lastX;
      const deltaY = e.clientY - draggingRef.current.lastY;
      
      // 计算速度
      draggingRef.current.velocityX = deltaX / deltaTime;
      draggingRef.current.velocityY = deltaY / deltaTime;
      draggingRef.current.lastX = e.clientX;
      draggingRef.current.lastY = e.clientY;
      draggingRef.current.lastTime = currentTime;
      
      const lantern = lanternRefs.current.get(draggingRef.current.lanternIndex);
      if (!lantern) return;
      
      // 计算新位置
      let newX = e.clientX - draggingRef.current.offsetX;
      let newY = e.clientY - draggingRef.current.offsetY;
      
      // 边界检测
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const lanternWidth = lantern.offsetWidth;
      const lanternHeight = lantern.offsetHeight;
      
      newX = Math.max(0, Math.min(newX, windowWidth - lanternWidth));
      newY = Math.max(0, Math.min(newY, windowHeight - lanternHeight));
      
      // 更新位置
      lantern.style.left = `${newX}px`;
      lantern.style.top = `${newY}px`;
      
      // 更新存储的位置
      positionRefs.current.set(draggingRef.current.lanternIndex, { x: newX, y: newY });
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!draggingRef.current.isDragging) return;
      
      const lantern = lanternRefs.current.get(draggingRef.current.lanternIndex);
      if (!lantern) return;
      
      // 移除拖拽样式
      lantern.classList.remove('dragging');
      
      // 实现惯性效果
      const velocityX = draggingRef.current.velocityX * 10;
      const velocityY = draggingRef.current.velocityY * 10;
      
      if (Math.abs(velocityX) > 1 || Math.abs(velocityY) > 1) {
        let currentX = positionRefs.current.get(draggingRef.current.lanternIndex)?.x || 0;
        let currentY = positionRefs.current.get(draggingRef.current.lanternIndex)?.y || 0;
        let currentVelocityX = velocityX;
        let currentVelocityY = velocityY;
        const friction = 0.9;
        const minVelocity = 0.1;
        
        // 惯性运动动画
        function animateInertia() {
          // 检查灯笼是否存在
          if (!lantern) return;
          
          // 应用摩擦力
          currentVelocityX *= friction;
          currentVelocityY *= friction;
          
          // 更新位置
          currentX += currentVelocityX;
          currentY += currentVelocityY;
          
          // 边界检测
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          const lanternWidth = lantern.offsetWidth;
          const lanternHeight = lantern.offsetHeight;
          
          currentX = Math.max(0, Math.min(currentX, windowWidth - lanternWidth));
          currentY = Math.max(0, Math.min(currentY, windowHeight - lanternHeight));
          
          // 更新灯笼位置
          lantern.style.left = `${currentX}px`;
          lantern.style.top = `${currentY}px`;
          
          // 更新存储的位置
          positionRefs.current.set(draggingRef.current.lanternIndex, { x: currentX, y: currentY });
          
          // 检查是否需要继续动画
          if (Math.abs(currentVelocityX) > minVelocity || Math.abs(currentVelocityY) > minVelocity) {
            animationFrameRef.current = requestAnimationFrame(animateInertia);
          } else {
            // 惯性结束后应用吸附效果
            applySnapEffect(draggingRef.current.lanternIndex);
          }
        }
        
        // 开始惯性动画
        animationFrameRef.current = requestAnimationFrame(animateInertia);
      } else {
        // 没有明显速度时直接应用吸附效果
        applySnapEffect(draggingRef.current.lanternIndex);
      }
      
      // 重置拖拽状态
      draggingRef.current.isDragging = false;
      draggingRef.current.lanternIndex = -1;
    };
    
    // 吸附效果函数
    function applySnapEffect(index: number) {
      const lantern = lanternRefs.current.get(index);
      if (!lantern) return;
      
      const position = positionRefs.current.get(index);
      if (!position) return;
      
      // 网格吸附：吸附到20px网格
      const gridSize = 20;
      const snappedX = Math.round(position.x / gridSize) * gridSize;
      const snappedY = Math.round(position.y / gridSize) * gridSize;
      
      // 边界检测
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const lanternWidth = lantern.offsetWidth;
      const lanternHeight = lantern.offsetHeight;
      
      const finalX = Math.max(0, Math.min(snappedX, windowWidth - lanternWidth));
      const finalY = Math.max(0, Math.min(snappedY, windowHeight - lanternHeight));
      
      // 应用吸附动画
      lantern.style.transition = 'all 0.3s ease-out';
      lantern.style.left = `${finalX}px`;
      lantern.style.top = `${finalY}px`;
      
      // 更新存储的位置
      positionRefs.current.set(index, { x: finalX, y: finalY });
      
      // 清除过渡效果
      setTimeout(() => {
        lantern.style.transition = '';
      }, 300);
    }
    
    const handleClick = (e: MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 检查是否是拖拽后的松���
      if (draggingRef.current.isDragging) return;
      
      // 设置点击超时，区分点击和拖拽
      clickTimeoutRef.current = window.setTimeout(() => {
        const lantern = lanternRefs.current.get(index);
        if (lantern) {
          lantern.classList.add('clicked');
          setTimeout(() => {
            lantern.classList.remove('clicked');
          }, 500);
        }
      }, 100);
    };
    
    // 为每个灯笼添加事件监听器
    texts.forEach((_, index) => {
      const lantern = lanternRefs.current.get(index);
      if (lantern) {
        lantern.addEventListener('mousedown', (e) => handleMouseDown(e, index));
        lantern.addEventListener('click', (e) => handleClick(e, index));
      }
    });
    
    // 添加全局事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    
    // 窗口大小变化处理函数
    function handleResize() {
      // 检查每个灯笼的位置是否在新的窗口边界内
      positionRefs.current.forEach((position, index) => {
        const lantern = lanternRefs.current.get(index);
        if (lantern) {
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          const lanternWidth = lantern.offsetWidth;
          const lanternHeight = lantern.offsetHeight;
          
          // 调整位置以保持在边界内
          let newX = Math.max(0, Math.min(position.x, windowWidth - lanternWidth));
          let newY = Math.max(0, Math.min(position.y, windowHeight - lanternHeight));
          
          // 如果位置发生变化，更新灯笼位置
          if (newX !== position.x || newY !== position.y) {
            lantern.style.left = `${newX}px`;
            lantern.style.top = `${newY}px`;
            positionRefs.current.set(index, { x: newX, y: newY });
          }
        }
      });
    }
    
    // 添加到文档
    document.head.appendChild(style);
    document.body.appendChild(container);

    // 清理函数
    return () => {
      // 移除事件监听器
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      
      // 清理每个灯笼的事件监听器
      texts.forEach((_, index) => {
        const lantern = lanternRefs.current.get(index);
        if (lantern) {
          lantern.removeEventListener('mousedown', (e) => handleMouseDown(e, index));
          lantern.removeEventListener('click', (e) => handleClick(e, index));
        }
      });
      
      if (containerRef.current) {
        containerRef.current.remove();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [text, enabled]);

  // 关键：使用CSS变量实现平滑动画，避免直接操作DOM
  useEffect(() => {
    if (containerRef.current) {
      // 使用CSS变量实现平滑变换，与导航栏动画同步
      containerRef.current.style.setProperty('--lantern-y', isVisible ? '0px' : '-64px');
    }
  }, [isVisible]);

  return null;
}