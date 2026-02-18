/**
 * 导航栏可见性状态管理
 * 用于同步灯笼等组件与导航栏的显示/隐藏状态
 */

'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationVisibilityContextType {
  isVisible: boolean;
  isAtTop: boolean;
  setVisibility: (visible: boolean) => void;
  setAtTop: (atTop: boolean) => void;
}

const NavigationVisibilityContext = createContext<NavigationVisibilityContextType | undefined>(undefined);

export function NavigationVisibilityProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);

  const setVisibility = (visible: boolean) => {
    setIsVisible(visible);
  };

  const setAtTop = (atTop: boolean) => {
    setIsAtTop(atTop);
  };

  return (
    <NavigationVisibilityContext.Provider value={{
      isVisible,
      isAtTop,
      setVisibility,
      setAtTop
    }}>
      {children}
    </NavigationVisibilityContext.Provider>
  );
}

export function useNavigationVisibility() {
  const context = useContext(NavigationVisibilityContext);
  if (context === undefined) {
    throw new Error('useNavigationVisibility must be used within a NavigationVisibilityProvider');
  }
  return context;
}