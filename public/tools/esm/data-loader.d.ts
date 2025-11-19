/**
 * 拼音数据加载器
 * 负责从数据文件中加载拼音映射数据
 */
import { PinyinData } from './types';
export declare class PinyinDataLoader {
    private static instance;
    private data;
    private loaded;
    private readonly CJK_RANGES;
    static getInstance(): PinyinDataLoader;
    /**
     * 加载拼音数据
     */
    loadData(): Promise<void>;
    /**
     * 获取拼音数据
     */
    getData(): PinyinData;
    /**
     * 从kMandarin.txt加载数据
     */
    private loadMandarinData;
    /**
     * 从pinyin.txt加载数据
     */
    private loadPinyinData;
    /**
     * 加载文本文件
     */
    private loadTextFile;
    /**
     * 解析kMandarin格式数据
     */
    private parseMandarinData;
    /**
     * 解析pinyin.txt格式数据
     */
    private parsePinyinData;
    /**
     * 检查字符是否为中文
     */
    isChinese(char: string): boolean;
    /**
     * 字符转Unicode编码
     */
    charToUnicode(char: string): string;
}
//# sourceMappingURL=data-loader.d.ts.map