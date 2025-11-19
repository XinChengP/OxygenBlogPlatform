/**
 * 拼音转换器类型定义
 */
export interface PinyinOptions {
    /** 是否保留声调 */
    keepTone?: boolean;
    /** 声调样式：'mark' (āáǎà), 'number' (a1 a2 a3 a4), 'none' (a) */
    toneStyle?: 'mark' | 'number' | 'none';
    /** 是否返回多音字的所有读音 */
    heteronym?: boolean;
    /** 分隔符，默认空格 */
    separator?: string;
    /** 是否转换为小写 */
    lowercase?: boolean;
    /** 是否处理非中文字符 */
    nonChinese?: 'keep' | 'remove' | 'replace';
    /** 替换非中文字符的字符串 */
    replaceChar?: string;
}
export interface PinyinResult {
    /** 原始字符 */
    origin: string;
    /** 拼音数组（可能包含多音字） */
    pinyin: string[];
    /** 是否为多音字 */
    isHeteronym: boolean;
}
export interface PinyinData {
    [unicode: string]: string[];
}
export interface IPinyinConverter {
    convert(text: string, options?: PinyinOptions): PinyinResult[];
    convertToString(text: string, options?: PinyinOptions): string;
    getHeteronyms(char: string): string[];
    isChinese(char: string): boolean;
    getAvailablePinyins(): string[];
}
declare global {
    interface Window {
        PinyinConverter: any;
    }
}
//# sourceMappingURL=types.d.ts.map