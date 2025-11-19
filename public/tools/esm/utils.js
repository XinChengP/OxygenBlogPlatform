/**
 * 拼音工具类
 * 提供拼音转换相关的工具函数
 */
export class PinyinUtils {
    /**
     * 带声调拼音转换为数字声调
     * 例如：nǐ hǎo -> ni hao3
     * 数字声调放在拼音末尾
     */
    static toneMarkToNumber(pinyin) {
        const toneMap = {
            'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
            'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
            'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
            'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
            'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
            'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü',
            'ü': 'ü'
        };
        let result = '';
        let toneNumber = 0;
        // 首先移除声调符号，转换为普通字母
        for (const char of pinyin) {
            if (toneMap[char]) {
                result += toneMap[char];
                // 从带声调字符中提取声调数字
                const toneMatch = char.match(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/);
                if (toneMatch) {
                    const toneChar = toneMatch[0];
                    if ('āēīōūǖ'.includes(toneChar))
                        toneNumber = 1;
                    else if ('áéíóúǘ'.includes(toneChar))
                        toneNumber = 2;
                    else if ('ǎěǐǒǔǚ'.includes(toneChar))
                        toneNumber = 3;
                    else if ('àèìòùǜ'.includes(toneChar))
                        toneNumber = 4;
                }
            }
            else {
                result += char;
            }
        }
        // 如果没有找到声调但包含元音，默认添加声调5（轻声）
        if (toneNumber === 0 && result.match(/[aeiouü]/)) {
            toneNumber = 5;
        }
        // 将声调数字添加到拼音末尾
        if (toneNumber > 0) {
            result += toneNumber.toString();
        }
        return result;
    }
    /**
     * 数字声调转换为带声调拼音
     * 例如：ni3 ha3o -> nǐ hǎo
     */
    static numberToToneMark(pinyin) {
        // const vowels = ['a', 'e', 'i', 'o', 'u', 'v']; // 备用元音数组
        const toneMarks = {
            'a': ['ā', 'á', 'ǎ', 'à'],
            'e': ['ē', 'é', 'ě', 'è'],
            'i': ['ī', 'í', 'ǐ', 'ì'],
            'o': ['ō', 'ó', 'ǒ', 'ò'],
            'u': ['ū', 'ú', 'ǔ', 'ù'],
            'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
        };
        // 查找数字声调
        const match = pinyin.match(/^(.+?)([1-5])$/);
        if (!match)
            return pinyin;
        const [, base, toneStr] = match;
        const tone = parseInt(toneStr) - 1;
        if (tone < 0 || tone > 4)
            return base;
        // 根据拼音规则，确定哪个元音应该带声调
        const targetVowel = this.findToneVowel(base);
        if (!targetVowel)
            return base;
        return base.replace(targetVowel, toneMarks[targetVowel][tone]);
    }
    /**
     * 移除声调
     */
    static removeTone(pinyin) {
        const toneMap = {
            'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
            'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
            'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
            'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
            'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
            'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü'
        };
        return pinyin.split('').map(char => toneMap[char] || char).join('');
    }
    /**
     * 查找应该带声调的元音
     * 拼音规则：a > e > o > i, u (同时出现时，后面的i/u带声调)
     */
    static findToneVowel(pinyin) {
        const vowels = ['a', 'e', 'o', 'i', 'u', 'v'];
        // 特殊处理iu和ui
        if (pinyin.includes('iu'))
            return 'u';
        if (pinyin.includes('ui'))
            return 'i';
        // 按优先级查找
        for (const vowel of vowels) {
            if (pinyin.includes(vowel)) {
                return vowel;
            }
        }
        return null;
    }
    /**
     * 格式化拼音
     */
    static formatPinyin(pinyin, toneStyle) {
        switch (toneStyle) {
            case 'number':
                return this.toneMarkToNumber(pinyin);
            case 'none':
                return this.removeTone(pinyin);
            case 'mark':
            default:
                return pinyin;
        }
    }
    /**
     * 检查是否为有效的拼音
     */
    static isValidPinyin(pinyin) {
        if (!pinyin || typeof pinyin !== 'string')
            return false;
        // 检查是否包含有效的拼音字符
        const validPattern = /^[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜvV]+[1-5]?$/;
        return validPattern.test(pinyin);
    }
    /**
     * 获取拼音的首字母
     */
    static getInitial(pinyin) {
        if (!pinyin)
            return '';
        // 移除声调
        const cleanPinyin = this.removeTone(pinyin);
        // 获取首字母
        return cleanPinyin.charAt(0).toUpperCase();
    }
    /**
     * 比较两个拼音（考虑声调）
     */
    static comparePinyin(pinyin1, pinyin2) {
        if (!pinyin1 || !pinyin2)
            return false;
        // 移除声调后比较
        const clean1 = this.removeTone(pinyin1.toLowerCase());
        const clean2 = this.removeTone(pinyin2.toLowerCase());
        return clean1 === clean2;
    }
}
//# sourceMappingURL=utils.js.map