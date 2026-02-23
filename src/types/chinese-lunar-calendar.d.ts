declare module 'chinese-lunar-calendar' {
  interface LunarDate {
    lunarYear: string;
    lunarMonth: number;
    lunarDate: number;
    isLeap: boolean;
    solarTerm?: string;
    zodiac: string;
    dateStr: string;
  }

  /**
   * 公历转农历
   * @param year 公历年
   * @param month 公历月
   * @param day 公历日
   * @returns 农历日期对象
   */
  export function getLunar(year: number, month: number, day: number): LunarDate;
}
