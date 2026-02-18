'use client';

import { useEffect } from 'react';
import { useNavigationVisibility } from '@/contexts/NavigationVisibilityContext';

interface Lantern3DProps {
  text?: string;
  enabled?: boolean;
}

export default function Lantern3D({ text = '新年快乐', enabled = true }: Lantern3DProps) {
  const { isVisible } = useNavigationVisibility();

  useEffect(() => {
    if (!enabled) return;

    // Create lantern container
    const container = document.createElement('div');
    container.className = 'lantern-3d-container';
    container.setAttribute('data-lantern-feature', 'true');

    // 根据导航栏可见性设置灯笼显示状态
    container.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    container.style.transform = isVisible ? 'translateY(0)' : 'translateY(-100px)';
    container.style.opacity = isVisible ? '1' : '0';

    // Parse text into characters
    const texts = text.split('');

    // Create lanterns
    texts.forEach((char, index) => {
      const box = document.createElement('div');
      box.className = `lantern-box lantern-box${index + 1}`;

      const lantern = document.createElement('div');
      lantern.className = 'lantern';

      const line = document.createElement('div');
      line.className = 'lantern-line';

      const lanternA = document.createElement('div');
      lanternA.className = 'lantern-a';

      const lanternB = document.createElement('div');
      lanternB.className = 'lantern-b';

      const lanternT = document.createElement('div');
      lanternT.className = 'lantern-t';
      lanternT.textContent = char;

      // Create tassel elements
      const tasselA = document.createElement('div');
      tasselA.className = 'tassel tassel-a';

      const tasselC = document.createElement('div');
      tasselC.className = 'tassel-c';
      const tasselB = document.createElement('div');
      tasselB.className = 'tassel-b';

      // Assemble tassel
      tasselA.appendChild(tasselC);
      tasselA.appendChild(tasselB);

      // Assemble lantern
      lanternB.appendChild(lanternT);
      lanternA.appendChild(lanternB);
      lantern.appendChild(line);
      lantern.appendChild(lanternA);
      lantern.appendChild(tasselA);

      box.appendChild(lantern);
      container.appendChild(box);
    });

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .lantern-3d-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
      }

      .lantern-box {
        position: fixed;
        width: 120px;
        height: 120px;
      }

      .lantern-box1 { top: 90px; left: 30px; }
      .lantern-box2 { top: 85px; left: 160px; }
      .lantern-box3 { top: 80px; right: 160px; }
      .lantern-box4 { top: 95px; right: 30px; }

      .lantern {
        position: relative;
        width: 120px;
        height: 90px;
        background: rgba(220, 20, 60, 0.85);
        border-radius: 50% 50%;
        animation: lantern-swing 3s infinite ease-in-out;
        box-shadow: -5px 5px 50px 4px rgba(255, 107, 53, 0.8);
        transform-origin: center top;
      }

      .lantern-a {
        width: 100px;
        height: 90px;
        background: rgba(220, 20, 60, 0.1);
        border-radius: 50%;
        border: 2px solid #dc8f03;
        margin-left: 7px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .lantern-b {
        width: 65px;
        height: 83px;
        background: rgba(220, 20, 60, 0.1);
        border-radius: 60%;
        border: 2px solid #dc8f03;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .lantern-t {
        font-size: 24px;
        font-weight: bold;
        color: #fff;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
      }

      .lantern-line {
        position: absolute;
        top: -20px;
        left: 59px;
        width: 2px;
        height: 20px;
        background: #dc8f03;
      }

      .tassel {
        position: relative;
        width: 5px;
        height: 20px;
        margin: -5px 0 0 57px;
        animation: tassel-swing 4s infinite ease-in-out;
        transform-origin: 50% -45px;
        background: linear-gradient(to bottom, #dc8f03, orange);
        border-radius: 0 0 5px 5px;
      }

      .tassel-b {
        position: absolute;
        top: 14px;
        left: -2px;
        width: 10px;
        height: 10px;
        background: #dc8f03;
        border-radius: 50%;
      }

      .tassel-c {
        position: absolute;
        top: 18px;
        left: -2px;
        width: 10px;
        height: 35px;
        background: orange;
        border-radius: 0 0 0 5px;
      }

      .lantern:before,
      .lantern:after {
        content: '';
        position: absolute;
        border-radius: 5px;
        border: solid 1px #dc8f03;
        background: linear-gradient(to right, #dc8f03, orange, #dc8f03, orange, #dc8f03);
      }

      .lantern:before {
        top: -7px;
        left: 29px;
        height: 12px;
        width: 60px;
        border-radius: 5px 5px 0 0;
      }

      .lantern:after {
        top: -10px;
        left: 27px;
        height: 8px;
        width: 64px;
        border-radius: 5px 5px 0 0;
      }

      @keyframes lantern-swing {
        0%, 100% { transform: rotate(-3deg); }
        50% { transform: rotate(3deg); }
      }

      @keyframes tassel-swing {
        0%, 100% { transform: rotate(-8deg); }
        50% { transform: rotate(8deg); }
      }

      /* Dark mode adjustments */
      .dark .lantern {
        background: rgba(255, 69, 0, 0.9);
        box-shadow: -5px 5px 50px 4px rgba(255, 140, 0, 0.9);
      }

      .dark .lantern-a,
      .dark .lantern-b {
        border-color: #ffa500;
      }

      .dark .lantern-line {
        background: #ffa500;
      }

      .dark .tassel {
        background: linear-gradient(to bottom, #ffa500, #ff8c00);
      }

      .dark .tassel-b {
        background: #ffa500;
      }

      .dark .lantern:before,
      .dark .lantern:after {
        border-color: #ffa500;
        background: linear-gradient(to right, #ffa500, #ff8c00, #ffa500, #ff8c00, #ffa500);
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .lantern-box1 { top: 85px; left: 10px; }
        .lantern-box2 { top: 80px; left: 100px; }
        .lantern-box3 { top: 75px; right: 100px; }
        .lantern-box4 { top: 90px; right: 10px; }
        
        .lantern {
          width: 80px;
          height: 60px;
        }
        
        .lantern-a {
          width: 70px;
          height: 60px;
        }
        
        .lantern-b {
          width: 45px;
          height: 55px;
        }
        
        .lantern-t {
          font-size: 18px;
        }
        
        .lantern-box {
          width: 80px;
          height: 80px;
        }
      }

      @media (max-width: 480px) {
        .lantern-box3,
        .lantern-box4 {
          display: none;
        }
      }
    `;

    // Append to document
    document.head.appendChild(style);
    document.body.appendChild(container);

    // Cleanup function
    return () => {
      const existingContainer = document.querySelector('.lantern-3d-container');
      const existingStyle = document.querySelector('style[data-lantern-style]');
      
      if (existingContainer) {
        existingContainer.remove();
      }
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [text, enabled, isVisible]);

  // 监听导航栏可见性变化，更新灯笼显示状态
  useEffect(() => {
    const container = document.querySelector('.lantern-3d-container') as HTMLElement;
    if (container) {
      container.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
      container.style.transform = isVisible ? 'translateY(0)' : 'translateY(-100px)';
      container.style.opacity = isVisible ? '1' : '0';
    }
  }, [isVisible]);

  return null;
}