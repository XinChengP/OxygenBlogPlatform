/**
 * MarkdownEditor 彩蛋功能模块
 * 用于集中管理编辑器中的各种彩蛋交互
 */

import live2dMessageManager from '../../utils/live2dMessageManager';

/**
 * 颜色彩蛋配置
 * 定义不同颜色对应的Live2D消息
 */
export const colorEggs = {
  // 阿绫红 - 对应乐正绫的代表色
  '#ee0000': {
    message: '这是阿绫红哦~(　ﾟ∀ﾟ) ﾉ♡',
    description: '乐正绫的代表红色'
  },
  // 天依蓝 - 对应洛天依的代表色
  '#66ccff': {
    message: '这是天依蓝(〃\'▽\'〃)',
    description: '洛天依的代表蓝色'
  }
} as const;

/**
 * 触发颜色彩蛋
 * @param color - 颜色值
 * @param duration - 消息显示时长(毫秒)
 */
export const triggerColorEgg = (color: string, duration: number = 3000) => {
  const egg = colorEggs[color as keyof typeof colorEggs];
  if (egg) {
    // 使用最高优先级10显示彩蛋消息，与笨鸥彩蛋同级
    live2dMessageManager.showMessage(egg.message, duration, 10);
  }
};

/**
 * 隐藏颜色彩蛋消息
 * @param color - 颜色值
 */
export const hideColorEgg = (color: string) => {
  const egg = colorEggs[color as keyof typeof colorEggs];
  if (egg) {
    live2dMessageManager.hideMessage();
  }
};

/**
 * 获取颜色彩蛋描述
 * @param color - 颜色值
 * @returns 彩蛋描述或undefined
 */
export const getColorEggDescription = (color: string) => {
  const egg = colorEggs[color as keyof typeof colorEggs];
  return egg?.description;
};

/**
 * 检查颜色是否有彩蛋
 * @param color - 颜色值
 * @returns 是否有彩蛋
 */
export const hasColorEgg = (color: string): boolean => {
  return color in colorEggs;
};

/**
 * 获取所有有彩蛋的颜色列表
 * @returns 颜色数组
 */
export const getEggColors = (): string[] => {
  return Object.keys(colorEggs);
};

/**
 * Markdown编辑器彩蛋管理器
 * 统一管理所有彩蛋功能
 */
export const markdownEditorEasterEggs = {
  // 颜色相关彩蛋
  color: {
    trigger: triggerColorEgg,
    hide: hideColorEgg,
    has: hasColorEgg,
    getDescription: getColorEggDescription,
    getColors: getEggColors,
    config: colorEggs
  },

  // 初始化彩蛋系统
  init() {
    console.log('Markdown编辑器彩蛋系统已初始化');
  },

  // 获取彩蛋统计信息
  getStats() {
    return {
      totalColorEggs: Object.keys(colorEggs).length,
      eggColors: getEggColors()
    };
  }
};

export default markdownEditorEasterEggs;