/**
 * 拼音工具类
 * 提供拼音转换相关的工具函数
 */
export declare class PinyinUtils {
    /**
     * 带声调拼音转换为数字声调
     * 例如：nǐ hǎo -> ni hao3
     * 数字声调放在拼音末尾
     */
    static toneMarkToNumber(pinyin: string): string;
    /**
     * 数字声调转换为带声调拼音
     * 例如：ni3 ha3o -> nǐ hǎo
     */
    static numberToToneMark(pinyin: string): string;
    /**
     * 移除声调
     */
    static removeTone(pinyin: string): string;
    /**
     * 查找应该带声调的元音
     * 拼音规则：a > e > o > i, u (同时出现时，后面的i/u带声调)
     */
    private static findToneVowel;
    /**
     * 格式化拼音
     */
    static formatPinyin(pinyin: string, toneStyle: 'mark' | 'number' | 'none'): string;
    /**
     * 检查是否为有效的拼音
     */
    static isValidPinyin(pinyin: string): boolean;
    /**
     * 获取拼音的首字母
     */
    static getInitial(pinyin: string): string;
    /**
     * 比较两个拼音（考虑声调）
     */
    static comparePinyin(pinyin1: string, pinyin2: string): boolean;
}
//# sourceMappingURL=utils.d.ts.map