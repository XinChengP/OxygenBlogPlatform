'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigationVisibility } from '@/contexts/NavigationVisibilityContext';
import live2dMessageManager from '@/utils/live2dMessageManager';

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

    // 存储清理函数的数组（在使用前初始化）
    const cleanupFunctions: Array<() => void> = [];

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
      
      /* 拖拽时的样式（简化缩放效果，避免复杂的位置计算） */
      .deng-box.dragging {
        z-index: 55 !important;
        /* 移除缩放效果，简化拖拽逻辑 */
        transition: none;
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
        width: 120px; /* 明确设置宽度，与.lantern-3d一致 */
        height: 200px; /* 明确设置高度，包含灯笼主体和流苏 */
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
      
      // 添加拖拽样式
      lantern.classList.add('dragging');
      
      // 获取灯笼当前位置
      // 优先使用positionRefs中存储的位置（如果有），避免被隐藏的灯笼影响计算
      let currentPosition = positionRefs.current.get(index);
      if (!currentPosition) {
        const rect = lantern.getBoundingClientRect();
        currentPosition = {
          x: rect.left,
          y: rect.top
        };
      }
      
      // 计算偏移量：鼠标指针位置相对于灯笼左上角的偏移
      const offsetX = e.clientX - currentPosition.x;
      const offsetY = e.clientY - currentPosition.y;
      
      // 更新positionRefs中的位置
      positionRefs.current.set(index, currentPosition);
      
      // 初始化拖拽状态
      draggingRef.current = {
        isDragging: true,
        lanternIndex: index,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: offsetX,
        offsetY: offsetY,
        lastX: e.clientX,
        lastY: e.clientY,
        velocityX: 0,
        velocityY: 0,
        lastTime: performance.now(),
      };
      
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
      
      // 计算速度（增加阻尼系数，使速度计算更平滑）
      const damping = 0.8;
      draggingRef.current.velocityX = draggingRef.current.velocityX * damping + (deltaX / deltaTime) * (1 - damping);
      draggingRef.current.velocityY = draggingRef.current.velocityY * damping + (deltaY / deltaTime) * (1 - damping);
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
      
      // 确保灯笼不会超出边界
      newX = Math.max(0, Math.min(newX, windowWidth - lanternWidth));
      newY = Math.max(0, Math.min(newY, windowHeight - lanternHeight));
      
      // 直接更新位置（不考虑缩放偏移，简化计算）
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
      
      // 实现惯性效果（调整参数，使惯性更自然）
      const velocityX = draggingRef.current.velocityX * 15; // 增加速度倍数，使惯性更明显
      const velocityY = draggingRef.current.velocityY * 15;
      
      if (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5) { // 降低阈值，使惯性更容易触发
        let currentX = positionRefs.current.get(draggingRef.current.lanternIndex)?.x || 0;
        let currentY = positionRefs.current.get(draggingRef.current.lanternIndex)?.y || 0;
        let currentVelocityX = velocityX;
        let currentVelocityY = velocityY;
        const friction = 0.95; // 减小摩擦力，使惯性持续更久
        const minVelocity = 0.05; // 降低最小速度，使惯性停止更平滑
        
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
          
          // 调整新位置，确保灯笼不会超出边界
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
      
      // 调整新位置，确保灯笼不会超出边界
      const finalX = Math.max(0, Math.min(snappedX, windowWidth - lanternWidth));
      const finalY = Math.max(0, Math.min(snappedY, windowHeight - lantern.offsetHeight));
      
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
    
    // 触发Live2D消息的函数（添加节流机制和随机消息）
    const triggerLanternMessage = (() => {
      let lastTriggerTime = 0;
      const COOLDOWN = 5000; // 5秒冷却时间，与消息显示时长一致
      let isMessageQueued = false;
      
      // 灯笼相关的消息数组
      const lanternMessages = [
        '新年快洛，灯笼好像糖葫芦呀！不知道是什么味道的呢',
        '红红的灯笼，好有过年的气氛呀～',
        '好想把灯笼摘下来看一看里面是什么样子～',
        '如果能把灯笼带回家就好了～',
        '要是能在灯笼上写下愿望就好了～',
      ];
      
      return () => {
        const now = Date.now();
        if (now - lastTriggerTime < COOLDOWN || isMessageQueued) {
          return; // 冷却时间内不重复触发，或消息已在队列中
        }
        
        // 随机选择一个消息
        const randomIndex = Math.floor(Math.random() * lanternMessages.length);
        const message = lanternMessages[randomIndex];
        
        live2dMessageManager.showMessage(message, 5000, 5); // 提高优先级，确保及时显示
        lastTriggerTime = now;
        isMessageQueued = true;
        
        // 消息显示完成后重置标志
        setTimeout(() => {
          isMessageQueued = false;
        }, 5000);
      };
    })();
    
    // 为每个灯笼添加事件监听器
    texts.forEach((_, index) => {
      const lantern = lanternRefs.current.get(index);
      if (lantern) {
        lantern.addEventListener('mousedown', (e) => handleMouseDown(e, index));
        lantern.addEventListener('click', (e) => handleClick(e, index));
        lantern.addEventListener('mouseenter', triggerLanternMessage);
      }
    });
    
    // 添加全局事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    
    // 初始化碰撞检测
    const collisionInterval = setInterval(() => {
      checkCollision();
    }, 100);
    
    // 检查灯笼与Live2D角色的碰撞
    function checkCollision() {
      // 检查Live2D角色是否存在
      const live2dElement = document.getElementById('landlord');
      if (!live2dElement) return;
      
      // 检查每个灯笼是否与Live2D角色碰撞
      lanternRefs.current.forEach((lantern, index) => {
        // 检查灯笼是否已经隐藏
        if (hiddenLanterns.has(index)) return;
        
        if (checkElementCollision(lantern, live2dElement)) {
          handleCollision(index);
        }
      });
    }
    
    // 检查两个元素是否碰撞
    function checkElementCollision(element1: HTMLElement, element2: HTMLElement) {
      const rect1 = element1.getBoundingClientRect();
      const rect2 = element2.getBoundingClientRect();
      
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );
    }
    
    // 碰撞处理函数
    function handleCollision(index: number) {
      // 检查灯笼是否已经隐藏
      if (hiddenLanterns.has(index)) return;
      
      // 标记灯笼为已隐藏
      hiddenLanterns.add(index);
      
      // 更新计数器值
      lanternCounter++;
      console.log('Lantern counter:', lanternCounter);
      
      // 平滑隐藏碰撞的灯笼（不使用transform，避免影响位置计算）
      const lantern = lanternRefs.current.get(index);
      if (lantern) {
        lantern.style.transition = 'opacity 0.5s ease-out';
        lantern.style.opacity = '0';
        lantern.style.pointerEvents = 'none';
        // 注意：不使用transform，避免影响getBoundingClientRect的位置计算
      }
      
      // 检查是否达到彩蛋触发条件
      if (lanternCounter === 4 && !isEasterEggTriggered) {
        // 触发彩蛋消息
        live2dMessageManager.showMessage('谢谢你的灯笼！天依都收到啦，请你看烟花！', 5000, 10);
        // 触发烟花效果
        startFireworks();
        // 标记彩蛋消息已触发
        isEasterEggTriggered = true;
        console.log('Easter egg triggered!');
      } else if (lanternCounter < 4) {
        // 触发预设消息序列（每个灯笼碰撞都触发）
        triggerMessageSequence();
      }
      // 当计数器达到4后，不再触发任何消息
    }
    
    // 触发预设消息序列
    function triggerMessageSequence() {
      const messages = [
        '谢谢你送我的灯笼！好漂亮呀～',
        '哇，收到了一个漂亮的灯笼！好开心～',
        '哇哦，这是给我的灯笼吗？太漂亮了～',
        '收到灯笼的感觉真好，谢谢你～',
        '这个灯笼好可爱，谢谢你送给我～',
        '谢谢你的灯笼，我好喜欢！',
      ];
      
      // 随机选择一条消息立即触发
      if (messages.length > 0) {
        const randomIndex = Math.floor(Math.random() * messages.length);
        live2dMessageManager.showMessage(messages[randomIndex], 3000, 10); // 最高优先级
      }
    }
    
    // 存储已隐藏的灯笼索引
    const hiddenLanterns = new Set<number>();
    
    // 灯笼隐藏计数器
    let lanternCounter = 0;
    
    // 彩蛋消息触发标志
    let isEasterEggTriggered = false;
    
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
    
    // 烟花效果实现
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let fireworks: any[] = [];
    let particles: any[] = [];
    let hue = 120;
    let timerTotal = 40;
    let timerTick = 0;
    let animationId: number | null = null;
    let isFireworksRunning = false;
    let volleyCount = 0;
    let maxVolleys = 5 + Math.floor(Math.random() * 3); // 5~7轮齐射
    
    // 获取随机数
    function random(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }
    
    // 计算两点之间的距离
    function calculateDistance(p1x: number, p1y: number, p2x: number, p2y: number) {
      const xDistance = p1x - p2x;
      const yDistance = p1y - p2y;
      return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
    }
    
    // 烟花类
    class Firework {
      x: number;
      y: number;
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      distanceToTarget: number;
      distanceTraveled: number;
      coordinates: number[][];
      coordinateCount: number;
      angle: number;
    speed: number;
    acceleration: number;
    brightness: number;
    targetRadius: number;
    size: number;
      
      constructor(sx: number, sy: number, tx: number, ty: number) {
        this.x = sx;
        this.y = sy;
        this.sx = sx;
        this.sy = sy;
        this.tx = tx;
        this.ty = ty;
        this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
        this.distanceTraveled = 0;
        this.coordinates = [];
        this.coordinateCount = 3;
        
        while (this.coordinateCount--) {
          this.coordinates.push([this.x, this.y]);
        }
        
        this.angle = Math.atan2(ty - sy, tx - sx);
        this.speed = 1;
        this.acceleration = 1.01;
        this.brightness = random(50, 70);
        this.targetRadius = 2;
        this.size = random(0.7, 2); // 大小随机为70%~200%
      }
      
      update(index: number) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        
        if (this.targetRadius < 8) {
          this.targetRadius += 0.3;
        } else {
          this.targetRadius = 1;
        }
        
        this.speed *= this.acceleration;
        
        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);
        
        if (this.distanceTraveled >= this.distanceToTarget) {
          createParticles(this.tx, this.ty, this.size);
          fireworks.splice(index, 1);
        } else {
          this.x += vx;
          this.y += vy;
        }
      }
      
      draw() {
      if (!ctx) return;

      ctx.save();
      ctx.scale(this.size, this.size);
      
      ctx.beginPath();
      ctx.moveTo(this.coordinates[this.coordinates.length - 1][0] / this.size, this.coordinates[this.coordinates.length - 1][1] / this.size);
      ctx.lineTo(this.x / this.size, this.y / this.size);
      ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.tx / this.size, this.ty / this.size, this.targetRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }
    }
    
    // 粒子类
    class Particle {
      x: number;
      y: number;
      coordinates: number[][];
      coordinateCount: number;
      angle: number;
      speed: number;
      friction: number;
      gravity: number;
      hue: number;
      brightness: number;
      alpha: number;
      decay: number;
      size: number;
      
      constructor(x: number, y: number, size: number = 1) {
        this.x = x;
        this.y = y;
        this.coordinates = [];
        this.coordinateCount = 5;
        
        while (this.coordinateCount--) {
          this.coordinates.push([this.x, this.y]);
        }
        
        this.angle = random(0, Math.PI * 2);
        this.speed = random(1, 7) * size;
        this.friction = 0.95;
        this.gravity = 0.6;
        this.hue = random(hue - 20, hue + 20);
        this.brightness = random(50, 80);
        this.alpha = 1;
        this.decay = random(0.008, 0.015); // 放缓消失速度
        this.size = size;
      }
      
      update(index: number) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.alpha -= this.decay;
        
        if (this.alpha <= this.decay) {
          particles.splice(index, 1);
        }
      }
      
      draw() {
        if (!ctx) return;
        
        ctx.save();
        ctx.scale(this.size, this.size);
        
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0] / this.size, this.coordinates[this.coordinates.length - 1][1] / this.size);
        ctx.lineTo(this.x / this.size, this.y / this.size);
        ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
      }
    }
    
    // 创建粒子
    function createParticles(x: number, y: number, size: number = 1) {
      let particleCount = 80;
      while (particleCount--) {
        particles.push(new Particle(x, y, size));
      }
    }
    
    // 动画循环
    function loop() {
      if (!isFireworksRunning) return;
      
      animationId = requestAnimationFrame(loop);
      hue += 0.5;
      
      if (!ctx || !canvas) return;
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      
      let i = fireworks.length;
      while (i--) {
        fireworks[i].draw();
        fireworks[i].update(i);
      }
      
      i = particles.length;
      while (i--) {
        particles[i].draw();
        particles[i].update(i);
      }
      
      // 检查是否所有烟花和粒子都已结束
      if (fireworks.length === 0 && particles.length === 0) {
        stopFireworks();
      }
    }
    
    // 初始化画布
    function initCanvas() {
      const oldCanvas = document.getElementById('fireworks-canvas');
      if (oldCanvas) {
        oldCanvas.remove();
      }
      
      canvas = document.createElement('canvas');
      canvas.id = 'fireworks-canvas';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.zIndex = '9999';
      canvas.style.pointerEvents = 'none';
      
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      
      // 检查是否为浅色模式
      const isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches;
      if (isLightMode) {
        const filter = document.createElement('div');
        filter.id = 'fireworks-dark-filter';
        filter.style.position = 'fixed';
        filter.style.top = '0';
        filter.style.left = '0';
        filter.style.width = '100%';
        filter.style.height = '100%';
        filter.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        filter.style.zIndex = '9998';
        filter.style.pointerEvents = 'none';
        filter.style.opacity = '0';
        filter.style.transition = 'opacity 1s ease-in-out';
        document.body.appendChild(filter);
        
        setTimeout(() => {
          filter.style.opacity = '1';
        }, 100);
      }
    }
    
    // 启动烟花
    function startFireworks() {
      if (isFireworksRunning) return;
      
      initCanvas();
      isFireworksRunning = true;
      
      // 重置齐射计数
      volleyCount = 0;
      maxVolleys = 5 + Math.floor(Math.random() * 3); // 5~7轮齐射
      
      // 开始第一轮齐射
      launchVolley();
      
      loop();
    }
    
    // 发射一轮烟花
    function launchVolley() {
      if (!isFireworksRunning || volleyCount >= maxVolleys) return;
      
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      
      // 获取live2d看板娘的位置
      const live2dElement = document.getElementById('landlord');
      let launchX1 = cw / 2;
      let launchY = ch;
      
      if (live2dElement) {
        const rect = live2dElement.getBoundingClientRect();
        launchX1 = rect.left - 50; // 看板娘左边
        launchY = rect.bottom;
      }
      
      // 计算对称的发射中心位置（沿中间竖直线对称）
      const centerLine = cw / 2;
      const distanceFromCenter = centerLine - launchX1;
      const launchX2 = centerLine + distanceFromCenter; // 对称位置
      
      // 新增三个发射中心
      const launchX3 = cw / 2; // 正下方中间
      const launchY3 = ch - 50;
      const launchX4 = 50; // 左下角
      const launchY4 = ch - 50;
      const launchX5 = cw - 50; // 右下角
      const launchY5 = ch - 50;
      
      // 根据屏幕大小调整初始速度
      const baseSpeed = Math.min(cw, ch) / 1000;
      
      // 每个发射点每轮发射5~8个烟花
      const fireworkCount = 5 + Math.floor(Math.random() * 4);
      
      for (let i = 0; i < fireworkCount; i++) {
        // 为第一个发射中心计算目标位置
        let targetX1;
        let randomValue1 = Math.random();
        
        if (randomValue1 < 0.5) {
          // 50%的概率在中间30%区域
          const centerStart = cw * 0.35;
          const centerWidth = cw * 0.3;
          targetX1 = random(centerStart, centerStart + centerWidth);
        } else if (randomValue1 < 0.8) {
          // 30%的概率在中间50%区域
          const centerStart = cw * 0.25;
          const centerWidth = cw * 0.5;
          targetX1 = random(centerStart, centerStart + centerWidth);
        } else {
          // 20%的概率在中间70%区域
          const margin = 0.15;
          targetX1 = random(cw * margin, cw * (1 - margin));
        }
        
        // Y坐标也集中在中间区域
        const margin = 0.15;
        const targetY1 = random(ch * margin, ch * (1 - margin));
        
        // 为第二个发射中心计算不同的目标位置，确保爆点不在一起
        let targetX2;
        let targetY2;
        
        // 确保两个发射中心的目标位置有足够的距离
        do {
          let randomValue2 = Math.random();
          if (randomValue2 < 0.5) {
            // 50%的概率在中间30%区域
            const centerStart = cw * 0.35;
            const centerWidth = cw * 0.3;
            targetX2 = random(centerStart, centerStart + centerWidth);
          } else if (randomValue2 < 0.8) {
            // 30%的概率在中间50%区域
            const centerStart = cw * 0.25;
            const centerWidth = cw * 0.5;
            targetX2 = random(centerStart, centerStart + centerWidth);
          } else {
            // 20%的概率在中间70%区域
            const margin = 0.15;
            targetX2 = random(cw * margin, cw * (1 - margin));
          }
          targetY2 = random(ch * margin, ch * (1 - margin));
        } while (Math.sqrt(Math.pow(targetX2 - targetX1, 2) + Math.pow(targetY2 - targetY1, 2)) < cw * 0.1); // 确保距离至少为屏幕宽度的10%
        
        // 为新增的三个发射中心计算目标位置（集中在除上方15%区域之外）
        let targetX3, targetY3, targetX4, targetY4, targetX5, targetY5;
        
        // 正下方中间发射中心的目标位置
        do {
          targetX3 = random(cw * 0.2, cw * 0.8);
          targetY3 = random(ch * 0.2, ch * 0.9); // 避开上方15%区域
        } while (Math.sqrt(Math.pow(targetX3 - targetX1, 2) + Math.pow(targetY3 - targetY1, 2)) < cw * 0.1 || 
                 Math.sqrt(Math.pow(targetX3 - targetX2, 2) + Math.pow(targetY3 - targetY2, 2)) < cw * 0.1);
        
        // 左下角发射中心的目标位置
        do {
          targetX4 = random(cw * 0.1, cw * 0.6);
          targetY4 = random(ch * 0.2, ch * 0.9); // 避开上方15%区域
        } while (Math.sqrt(Math.pow(targetX4 - targetX1, 2) + Math.pow(targetY4 - targetY1, 2)) < cw * 0.1 || 
                 Math.sqrt(Math.pow(targetX4 - targetX2, 2) + Math.pow(targetY4 - targetY2, 2)) < cw * 0.1 || 
                 Math.sqrt(Math.pow(targetX4 - targetX3, 2) + Math.pow(targetY4 - targetY3, 2)) < cw * 0.1);
        
        // 右下角发射中心的目标位置
        do {
          targetX5 = random(cw * 0.4, cw * 0.9);
          targetY5 = random(ch * 0.2, ch * 0.9); // 避开上方15%区域
        } while (Math.sqrt(Math.pow(targetX5 - targetX1, 2) + Math.pow(targetY5 - targetY1, 2)) < cw * 0.1 || 
                 Math.sqrt(Math.pow(targetX5 - targetX2, 2) + Math.pow(targetY5 - targetY2, 2)) < cw * 0.1 || 
                 Math.sqrt(Math.pow(targetX5 - targetX3, 2) + Math.pow(targetY5 - targetY3, 2)) < cw * 0.1 || 
                 Math.sqrt(Math.pow(targetX5 - targetX4, 2) + Math.pow(targetY5 - targetY4, 2)) < cw * 0.1);
        
        // 从第一个发射中心发射
        const firework1 = new Firework(launchX1, launchY, targetX1, targetY1);
        firework1.speed = baseSpeed; // 设置基于屏幕大小的速度
        fireworks.push(firework1);
        
        // 从第二个发射中心（对称位置）发射
        const firework2 = new Firework(launchX2, launchY, targetX2, targetY2);
        firework2.speed = baseSpeed; // 设置基于屏幕大小的速度
        fireworks.push(firework2);
        
        // 延迟0.75秒后从第三个发射中心（正下方中间）发射
        setTimeout(() => {
          const firework3 = new Firework(launchX3, launchY3, targetX3, targetY3);
          firework3.speed = baseSpeed; // 设置基于屏幕大小的速度
          fireworks.push(firework3);
        }, 750);
        
        // 延迟0.75秒后从第四个发射中心（左下角）发射
        setTimeout(() => {
          const firework4 = new Firework(launchX4, launchY4, targetX4, targetY4);
          firework4.speed = baseSpeed; // 设置基于屏幕大小的速度
          fireworks.push(firework4);
        }, 750);
        
        // 延迟0.75秒后从第五个发射中心（右下角）发射
        setTimeout(() => {
          const firework5 = new Firework(launchX5, launchY5, targetX5, targetY5);
          firework5.speed = baseSpeed; // 设置基于屏幕大小的速度
          fireworks.push(firework5);
        }, 750);
      }
      
      volleyCount++;
      
      // 如果还有齐射轮次，延迟1.5秒后发射下一轮
      if (volleyCount < maxVolleys) {
        setTimeout(launchVolley, 1500);
      }
    }
    
    // 停止烟花
    function stopFireworks() {
      isFireworksRunning = false;
      
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      
      const filter = document.getElementById('fireworks-dark-filter');
      if (filter) {
        filter.style.opacity = '0';
        setTimeout(() => {
          if (filter.parentNode) {
            filter.parentNode.removeChild(filter);
          }
        }, 1000);
      }
      
      canvas = null;
      ctx = null;
      fireworks = [];
      particles = [];
    }
    
    // 添加到文档
    document.head.appendChild(style);
    document.body.appendChild(container);
    
    // 初始化灯笼位置（必须在添加到DOM后执行，否则getComputedStyle会返回错误值）
    texts.forEach((_, index) => {
      const lantern = lanternRefs.current.get(index);
      if (lantern) {
        const rect = lantern.getBoundingClientRect();
        const initialPosition = {
          x: rect.left,
          y: rect.top
        };
        positionRefs.current.set(index, initialPosition);
      }
    });

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
          lantern.removeEventListener('mouseenter', triggerLanternMessage);
        }
      });
      
      // 清除碰撞检测定时器
      clearInterval(collisionInterval);
      
      // 停止烟花特效
      if (isFireworksRunning) {
        stopFireworks();
      }
      
      if (containerRef.current) {
        containerRef.current.remove();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (style.parentNode) {
        document.head.removeChild(style);
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