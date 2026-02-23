import { solarToLunar, lunarToSolar } from 'chinese-lunar-calendar';

/**
 * 检查当前日期是否在农历北方小年到元宵节期间
 * 北方小年：农历腊月二十三
 * 元宵节：农历正月十五
 * @returns 是否在显示期间
 */
export function isLanternDisplayPeriod(): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  // 转换为农历日期
  const lunarDate = solarToLunar(currentYear, currentMonth, currentDay);
  const lunarMonth = lunarDate.lunarMonth;
  const lunarDay = lunarDate.lunarDay;
  const lunarYear = lunarDate.lunarYear;

  // 测试模式：强制返回true，以便验证功能
  // 注意：上线前请注释掉这行
  // return true;

  // 检查是否在农历腊月二十三到正月十五期间
  if (lunarMonth === 12 && lunarDay >= 23) {
    // 腊月二十三到除夕
    return true;
  } else if (lunarMonth === 1 && lunarDay <= 15) {
    // 正月初一到十五
    return true;
  }

  return false;
}

/**
 * 获取当前农历日期信息
 * @returns 农历日期对象
 */
export function getCurrentLunarDate() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  
  return solarToLunar(currentYear, currentMonth, currentDay);
}
