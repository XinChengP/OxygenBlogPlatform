declare module 'chinese-lunar-calendar' {
  interface LunarDate {
    lunarYear: number;
    lunarMonth: number;
    lunarDay: number;
    isLeap: boolean;
    lunarFestival?: string;
    solarFestival?: string;
    solarTerms?: string;
  }

  /**
   * 公历转农历
   * @param solarYear 公历年
   * @param solarMonth 公历月
   * @param solarDay 公历日
   * @returns 农历日期对象
   */
  export function solarToLunar(solarYear: number, solarMonth: number, solarDay: number): LunarDate;

  /**
   * 农历转公历
   * @param lunarYear 农历年
   * @param lunarMonth 农历月
   * @param lunarDay 农历日
   * @param isLeap 是否闰月
   * @returns 公历日期对象
   */
  export function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number, isLeap?: boolean): Date;
}
