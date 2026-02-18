/**
 * 农历日期转换工具
 * 用于计算春节、元宵节等传统节日的公历日期
 */

interface LunarDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-30
}

interface SolarDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * 农历春节日期表（2020-2030）
 * 数据来源：天文计算
 */
const SPRING_FESTIVAL_DATES: Record<number, SolarDate> = {
  2020: { year: 2020, month: 1, day: 25 },   // 正月初一
  2021: { year: 2021, month: 2, day: 12 },   // 正月初一
  2022: { year: 2022, month: 2, day: 1 },    // 正月初一
  2023: { year: 2023, month: 1, day: 22 },   // 正月初一
  2024: { year: 2024, month: 2, day: 10 },   // 正月初一
  2025: { year: 2025, month: 1, day: 29 },   // 正月初一
  2026: { year: 2026, month: 2, day: 17 },   // 正月初一
  2027: { year: 2027, month: 2, day: 6 },    // 正月初一
  2028: { year: 2028, month: 1, day: 26 },   // 正月初一
  2029: { year: 2029, month: 2, day: 13 },   // 正月初一
  2030: { year: 2030, month: 2, day: 3 },    // 正月初一
};

/**
 * 获取指定年份的春节日期
 */
export function getSpringFestivalDate(year: number): SolarDate {
  return SPRING_FESTIVAL_DATES[year] || SPRING_FESTIVAL_DATES[2025];
}

/**
 * 获取指定年份的元宵节日期（正月十五）
 * 元宵节是春节后第15天
 */
export function getLanternFestivalDate(year: number): SolarDate {
  const springFestival = getSpringFestivalDate(year);
  const springFestivalDate = new Date(springFestival.year, springFestival.month - 1, springFestival.day);
  
  // 元宵节是正月十五，即春节后第14天（因为春节是第1天）
  const lanternFestivalDate = new Date(springFestivalDate);
  lanternFestivalDate.setDate(springFestivalDate.getDate() + 14);
  
  return {
    year: lanternFestivalDate.getFullYear(),
    month: lanternFestivalDate.getMonth() + 1,
    day: lanternFestivalDate.getDate()
  };
}

/**
 * 判断当前是否在春节期间（正月初一到十五）
 */
export function isInSpringFestivalPeriod(): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const springFestival = getSpringFestivalDate(currentYear);
  const lanternFestival = getLanternFestivalDate(currentYear);
  
  const springFestivalDate = new Date(springFestival.year, springFestival.month - 1, springFestival.day);
  const lanternFestivalDate = new Date(lanternFestival.year, lanternFestival.month - 1, lanternFestival.day);
  
  // 包含春节当天和元宵节当天
  return now >= springFestivalDate && now <= lanternFestivalDate;
}

/**
 * 获取当前农历节日信息
 */
export function getCurrentFestivalInfo(): { isFestival: boolean; festivalName?: string; daysRemaining?: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const springFestival = getSpringFestivalDate(currentYear);
  const lanternFestival = getLanternFestivalDate(currentYear);
  
  const springFestivalDate = new Date(springFestival.year, springFestival.month - 1, springFestival.day);
  const lanternFestivalDate = new Date(lanternFestival.year, lanternFestival.month - 1, lanternFestival.day);
  
  if (now < springFestivalDate) {
    // 春节前
    const daysUntilSpringFestival = Math.ceil((springFestivalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isFestival: false,
      festivalName: '春节',
      daysRemaining: daysUntilSpringFestival
    };
  }
  
  if (now > lanternFestivalDate) {
    // 元宵节后，计算下一年
    const nextSpringFestival = getSpringFestivalDate(currentYear + 1);
    const nextSpringFestivalDate = new Date(nextSpringFestival.year, nextSpringFestival.month - 1, nextSpringFestival.day);
    const daysUntilNextSpringFestival = Math.ceil((nextSpringFestivalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isFestival: false,
      festivalName: '春节',
      daysRemaining: daysUntilNextSpringFestival
    };
  }
  
  // 在春节期间
  const daysFromSpringFestival = Math.ceil((now.getTime() - springFestivalDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  if (daysFromSpringFestival === 1) {
    return { isFestival: true, festivalName: '春节' };
  } else if (daysFromSpringFestival === 15) {
    return { isFestival: true, festivalName: '元宵节' };
  } else {
    return { isFestival: true, festivalName: `正月初${daysFromSpringFestival}` };
  }
}

/**
 * 获取指定年份的农历节日日期列表
 */
export function getLunarFestivalsInYear(year: number): Array<{ name: string; date: SolarDate }> {
  const springFestival = getSpringFestivalDate(year);
  const lanternFestival = getLanternFestivalDate(year);
  
  return [
    { name: '春节', date: springFestival },
    { name: '元宵节', date: lanternFestival }
  ];
}