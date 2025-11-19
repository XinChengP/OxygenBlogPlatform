/**
 * 拼音转换器核心类
 * 提供完整的汉字到拼音转换功能
 */
import { PinyinOptions, PinyinResult, IPinyinConverter } from './types';
export declare class PinyinConverter implements IPinyinConverter {
    private dataLoader;
    private dataLoaded;
    constructor();
    /**
     * 初始化拼音转换器
     */
    initialize(): Promise<void>;
    /**
     * 将文本转换为拼音
     */
    convert(text: string, options?: PinyinOptions): PinyinResult[];
    /**
     * 将文本转换为拼音字符串
     */
    convertToString(text: string, options?: PinyinOptions): string;
    /**
     * 获取字符的多音字
     */
    getHeteronyms(char: string): string[];
    /**
     * 检查是否为中文
     */
    isChinese(char: string): boolean;
    /**
     * 获取所有可用的拼音
     */
    getAvailablePinyins(): string[];
    /**
     * 转换单个字符
     */
    private convertChar;
    /**
     * 处理非中文字符
     */
    private handleNonChinese;
    /**
     * 获取拼音首字母
     */
    getInitials(text: string, options?: PinyinOptions): string[];
    /**
     * 获取拼音首字母字符串
     */
    getInitialsString(text: string, options?: PinyinOptions): string;
    /**
     * 统计文本中的中文数量
     */
    countChinese(text: string): number;
    /**
     * 获取所有多音字
     */
    getAllHeteronyms(text: string): {
        char: string;
        pinyins: string[];
    }[];
}
//# sourceMappingURL=converter.d.ts.map