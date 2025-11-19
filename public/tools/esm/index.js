/**
 * 拼音转换器 - 主入口文件
 * 提供完整的汉字到拼音转换功能
 */
export { PinyinConverter } from './converter';
export { PinyinDataLoader } from './data-loader';
export { PinyinUtils } from './utils';
export * from './types';
import { PinyinConverter } from './converter';
// 创建全局实例
let globalInstance = null;
/**
 * 获取全局拼音转换器实例
 */
export async function getPinyinConverter() {
    if (!globalInstance) {
        globalInstance = new PinyinConverter();
        await globalInstance.initialize();
    }
    return globalInstance;
}
/**
 * 快速转换函数
 */
export async function pinyin(text, options) {
    const converter = await getPinyinConverter();
    return converter.convertToString(text, options);
}
/**
 * 浏览器环境下的全局变量
 */
if (typeof window !== 'undefined') {
    window.PinyinConverter = {
        PinyinConverter,
        getPinyinConverter,
        pinyin
    };
}
//# sourceMappingURL=index.js.map