/**
 * 关于页面工具函数
 * 提供共享的样式生成逻辑，减少代码重复
 */

import { useMemo } from 'react';

/**
 * 生成渐变背景样式
 * @param primaryColor 主色调
 * @param secondaryColor 次要色调
 * @param accentColor 强调色
 * @param isDark 是否暗色模式
 * @param isRainbowGradient 是否使用彩虹渐变
 * @returns 样式对象
 */
export function useGradientStyles(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  isDark: boolean,
  isRainbowGradient: boolean = false
) {
  // 动画文字渐变样式
  const beforeTextGradientStyle = useMemo(() => {
    if (isRainbowGradient) {
      return {
        backgroundImage: `
          linear-gradient(135deg, 
            #ff3366 0%,
            #ff6b35 12%,
            #f7931e 24%,
            #ffcc02 36%,
            #9acd32 48%,
            #00d4aa 60%,
            #00bfff 72%,
            #6a5acd 84%,
            #ff69b4 100%
          )`,
        backgroundSize: '300% 300%',
        animation: 'gradientShift 4s ease-in-out infinite',
        filter: 'brightness(1.1) saturate(1.3)',
      };
    } else {
      return {
        backgroundImage: `
          linear-gradient(135deg, 
            ${primaryColor} 0%, 
            ${accentColor} 30%, 
            ${secondaryColor} 60%, 
            ${primaryColor} 100%
          )`,
        backgroundSize: '200% 200%',
        animation: 'gradientShift 6s ease-in-out infinite',
      };
    }
  }, [primaryColor, secondaryColor, accentColor, isRainbowGradient]);

  // 卡片渐变样式（通用）
  const cardGradientStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${accentColor}1a, ${accentColor}0d)`,
    borderColor: `${accentColor}4d`
  }), [accentColor]);

  // 图标渐变样式（通用 - 强调色为主）
  const accentIconGradientStyle = useMemo(() => ({
    background: `
      linear-gradient(135deg, 
        ${accentColor} 0%, 
        ${primaryColor} 50%, 
        ${accentColor} 100%
      )`,
    backgroundSize: '200% 200%',
    animation: 'gradientShift 4s ease-in-out infinite',
    color: 'white'
  }), [accentColor, primaryColor]);

  // 标题渐变样式
  const titleGradientStyle = useMemo(() => ({
    backgroundImage: `
      linear-gradient(135deg, 
        ${primaryColor} 0%, 
        ${accentColor} 40%, 
        ${secondaryColor} 70%, 
        ${primaryColor} 100%
      )`,
    backgroundSize: '200% 200%',
    animation: 'gradientShift 8s ease-in-out infinite',
  }), [primaryColor, secondaryColor, accentColor]);

  // 联系图标渐变样式（次要色为主）
  const secondaryIconGradientStyle = useMemo(() => ({
    background: `
      linear-gradient(135deg, 
        ${secondaryColor} 0%, 
        ${accentColor} 50%, 
        ${secondaryColor} 100%
      )`,
    backgroundSize: '200% 200%',
    animation: 'gradientShift 5s ease-in-out infinite',
    color: 'white'
  }), [secondaryColor, accentColor]);

  // 背景样式
  const backgroundStyle = useMemo(() => {
    const baseGradient = isDark 
      ? 'linear-gradient(135deg, rgb(17, 24, 39), rgb(31, 41, 55))'
      : 'linear-gradient(135deg, rgb(249, 250, 251), rgb(229, 231, 235))';

    const themeOverlay = `radial-gradient(ellipse at top left, ${primaryColor}1a, transparent 60%), radial-gradient(ellipse at bottom right, ${secondaryColor}1a, transparent 60%)`;

    return {
      background: `${themeOverlay}, ${baseGradient}`
    };
  }, [primaryColor, secondaryColor, isDark]);

  return {
    beforeTextGradientStyle,
    cardGradientStyle,
    accentIconGradientStyle,
    titleGradientStyle,
    secondaryIconGradientStyle,
    backgroundStyle
  };
}

/**
 * 生成标签样式
 * @param accentColor 强调色
 * @returns 样式对象
 */
export function getTagStyle(accentColor: string) {
  return {
    borderColor: `${accentColor}66`,
    backgroundColor: `${accentColor}11`,
    color: accentColor
  };
}

/**
 * 生成头部背景样式
 * @param primaryColor 主色调
 * @param secondaryColor 次要色调
 * @param accentColor 强调色
 * @returns 样式对象
 */
export function getHeaderBackgroundStyle(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string
) {
  return {
    background: `
      linear-gradient(135deg, ${primaryColor}cc 0%, ${accentColor}cc 50%, ${secondaryColor}cc 100%),
      radial-gradient(circle at top left, ${primaryColor}80 0%, transparent 50%),
      radial-gradient(circle at bottom right, ${secondaryColor}80 0%, transparent 50%)
    `,
  };
}
