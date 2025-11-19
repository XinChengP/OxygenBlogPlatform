/**
 * 拼音转换器 - 主入口文件
 * 提供完整的汉字到拼音转换功能
 */
export { PinyinConverter } from './converter';
export { PinyinDataLoader } from './data-loader';
export { PinyinUtils } from './utils';
export * from './types';
import { PinyinConverter } from './converter';
/**
 * 获取全局拼音转换器实例
 */
export declare function getPinyinConverter(): Promise<PinyinConverter>;
/**
 * 快速转换函数
 */
export declare function pinyin(text: string, options?: any): Promise<string>;
//# sourceMappingURL=index.d.ts.map