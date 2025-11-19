/**
 * 拼音数据加载器
 * 负责从数据文件中加载拼音映射数据
 */
class PinyinDataLoader {
    constructor() {
        this.data = {};
        this.loaded = false;
        // 常用汉字Unicode范围
        this.CJK_RANGES = [
            [0x4e00, 0x9fff], // 基本汉字
            [0x3400, 0x4dbf], // 扩展A
            [0x20000, 0x2a6df], // 扩展B
            [0x2a700, 0x2b73f], // 扩展C
            [0x2b740, 0x2b81f], // 扩展D
            [0x2b820, 0x2ceaf], // 扩展E
            [0x2ceb0, 0x2ebef], // 扩展F
        ];
    }
    static getInstance() {
        if (!PinyinDataLoader.instance) {
            PinyinDataLoader.instance = new PinyinDataLoader();
        }
        return PinyinDataLoader.instance;
    }
    /**
     * 加载拼音数据
     */
    async loadData() {
        if (this.loaded)
            return;
        try {
            // 优先使用kMandarin数据，然后使用pinyin.txt作为补充
            await this.loadMandarinData();
            await this.loadPinyinData();
            this.loaded = true;
            console.log(`拼音数据加载完成，共${Object.keys(this.data).length}个字符`);
        }
        catch (error) {
            console.error('加载拼音数据失败:', error);
            throw new Error('Failed to load pinyin data');
        }
    }
    /**
     * 获取拼音数据
     */
    getData() {
        if (!this.loaded) {
            throw new Error('Pinyin data not loaded. Call loadData() first.');
        }
        return this.data;
    }
    /**
     * 从kMandarin.txt加载数据
     */
    async loadMandarinData() {
        try {
            // 在浏览器环境中使用fetch，在Node.js环境中使用fs
            const mandarinData = await this.loadTextFile('./pinyin-data/kMandarin.txt');
            this.parseMandarinData(mandarinData);
        }
        catch (error) {
            console.warn('无法加载kMandarin数据，将使用pinyin.txt作为主要数据源');
        }
    }
    /**
     * 从pinyin.txt加载数据
     */
    async loadPinyinData() {
        try {
            const pinyinData = await this.loadTextFile('./pinyin-data/pinyin.txt');
            this.parsePinyinData(pinyinData);
        }
        catch (error) {
            console.error('无法加载pinyin数据:', error);
            throw error;
        }
    }
    /**
     * 加载文本文件
     */
    async loadTextFile(path) {
        // 浏览器环境
        if (typeof window !== 'undefined') {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        }
        // Node.js环境
        if (typeof require !== 'undefined') {
            const fs = require('fs');
            const pathModule = require('path');
            const fullPath = pathModule.resolve(__dirname, path);
            return fs.readFileSync(fullPath, 'utf-8');
        }
        throw new Error('Unsupported environment');
    }
    /**
     * 解析kMandarin格式数据
     */
    parseMandarinData(data) {
        const lines = data.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#'))
                continue;
            const match = trimmedLine.match(/^U\+([0-9A-Fa-f]+):\s*(.+?)(?:\s*#.*)?$/);
            if (!match)
                continue;
            const unicode = match[1].toUpperCase();
            const pinyins = match[2].split(',').map(p => p.trim()).filter(p => p);
            if (pinyins.length > 0) {
                this.data[unicode] = pinyins;
            }
        }
    }
    /**
     * 解析pinyin.txt格式数据
     */
    parsePinyinData(data) {
        const lines = data.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#'))
                continue;
            const match = trimmedLine.match(/^U\+([0-9A-Fa-f]+):\s*(.+?)(?:\s*#.*)?$/);
            if (!match)
                continue;
            const unicode = match[1].toUpperCase();
            const pinyins = match[2].split(',').map(p => p.trim()).filter(p => p);
            // 如果kMandarin中已有数据，则合并
            if (this.data[unicode]) {
                // 合并并去重
                this.data[unicode] = [...new Set([...this.data[unicode], ...pinyins])];
            }
            else {
                this.data[unicode] = pinyins;
            }
        }
    }
    /**
     * 检查字符是否为中文
     */
    isChinese(char) {
        if (!char || char.length !== 1)
            return false;
        const code = char.charCodeAt(0);
        // 检查是否在CJK范围内
        return this.CJK_RANGES.some(([start, end]) => code >= start && code <= end);
    }
    /**
     * 字符转Unicode编码
     */
    charToUnicode(char) {
        if (!this.isChinese(char))
            return '';
        return char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    }
}

/**
 * 拼音工具类
 * 提供拼音转换相关的工具函数
 */
class PinyinUtils {
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

/**
 * 拼音转换器核心类
 * 提供完整的汉字到拼音转换功能
 */
class PinyinConverter {
    constructor() {
        this.dataLoaded = false;
        this.dataLoader = PinyinDataLoader.getInstance();
    }
    /**
     * 初始化拼音转换器
     */
    async initialize() {
        if (!this.dataLoaded) {
            await this.dataLoader.loadData();
            this.dataLoaded = true;
        }
    }
    /**
     * 将文本转换为拼音
     */
    convert(text, options = {}) {
        if (!this.dataLoaded) {
            throw new Error('PinyinConverter not initialized. Call initialize() first.');
        }
        const results = [];
        const chars = Array.from(text);
        for (const char of chars) {
            const result = this.convertChar(char, options);
            results.push(result);
        }
        return results;
    }
    /**
     * 将文本转换为拼音字符串
     */
    convertToString(text, options = {}) {
        var _a;
        const results = this.convert(text, options);
        const separator = (_a = options.separator) !== null && _a !== void 0 ? _a : ' ';
        return results.map(result => {
            if (options.heteronym && result.isHeteronym) {
                return result.pinyin.join(',');
            }
            return result.pinyin[0];
        }).join(separator);
    }
    /**
     * 获取字符的多音字
     */
    getHeteronyms(char) {
        if (!this.dataLoaded) {
            throw new Error('PinyinConverter not initialized. Call initialize() first.');
        }
        if (!this.isChinese(char))
            return [];
        const unicode = this.dataLoader.charToUnicode(char);
        const data = this.dataLoader.getData();
        const pinyins = data[unicode] || [];
        return [...new Set(pinyins)]; // 去重
    }
    /**
     * 检查是否为中文
     */
    isChinese(char) {
        return this.dataLoader.isChinese(char);
    }
    /**
     * 获取所有可用的拼音
     */
    getAvailablePinyins() {
        if (!this.dataLoaded) {
            throw new Error('PinyinConverter not initialized. Call initialize() first.');
        }
        const data = this.dataLoader.getData();
        const allPinyins = new Set();
        for (const pinyins of Object.values(data)) {
            pinyins.forEach(pinyin => allPinyins.add(pinyin));
        }
        return Array.from(allPinyins).sort();
    }
    /**
     * 转换单个字符
     */
    convertChar(char, options) {
        const defaultOptions = {
            keepTone: true,
            toneStyle: 'mark',
            heteronym: false,
            separator: ' ',
            lowercase: false,
            nonChinese: 'keep',
            replaceChar: ''
        };
        const opts = { ...defaultOptions, ...options };
        // 处理非中文字符
        if (!this.isChinese(char)) {
            return this.handleNonChinese(char, opts);
        }
        const unicode = this.dataLoader.charToUnicode(char);
        const data = this.dataLoader.getData();
        const pinyins = data[unicode] || [];
        // 如果没有找到拼音，返回原字符
        if (pinyins.length === 0) {
            return {
                origin: char,
                pinyin: [char],
                isHeteronym: false
            };
        }
        // 格式化拼音
        let formattedPinyins = pinyins.map(pinyin => {
            let formatted = PinyinUtils.formatPinyin(pinyin, opts.toneStyle);
            if (opts.lowercase) {
                formatted = formatted.toLowerCase();
            }
            return formatted;
        });
        // 去重
        formattedPinyins = [...new Set(formattedPinyins)];
        return {
            origin: char,
            pinyin: formattedPinyins,
            isHeteronym: formattedPinyins.length > 1
        };
    }
    /**
     * 处理非中文字符
     */
    handleNonChinese(char, options) {
        switch (options.nonChinese) {
            case 'remove':
                return {
                    origin: char,
                    pinyin: [''],
                    isHeteronym: false
                };
            case 'replace':
                return {
                    origin: char,
                    pinyin: [options.replaceChar || ''],
                    isHeteronym: false
                };
            case 'keep':
            default:
                return {
                    origin: char,
                    pinyin: [char],
                    isHeteronym: false
                };
        }
    }
    /**
     * 获取拼音首字母
     */
    getInitials(text, options = {}) {
        const results = this.convert(text, options);
        return results.map(result => {
            if (result.pinyin[0] && PinyinUtils.isValidPinyin(result.pinyin[0])) {
                return PinyinUtils.getInitial(result.pinyin[0]);
            }
            return result.origin;
        });
    }
    /**
     * 获取拼音首字母字符串
     */
    getInitialsString(text, options = {}) {
        var _a;
        const initials = this.getInitials(text, options);
        const separator = (_a = options.separator) !== null && _a !== void 0 ? _a : '';
        return initials.join(separator);
    }
    /**
     * 统计文本中的中文数量
     */
    countChinese(text) {
        return Array.from(text).filter(char => this.isChinese(char)).length;
    }
    /**
     * 获取所有多音字
     */
    getAllHeteronyms(text) {
        const results = [];
        const chars = Array.from(text);
        for (const char of chars) {
            if (this.isChinese(char)) {
                const heteronyms = this.getHeteronyms(char);
                if (heteronyms.length > 1) {
                    results.push({
                        char,
                        pinyins: heteronyms
                    });
                }
            }
        }
        return results;
    }
}

/**
 * 拼音转换器 - 主入口文件
 * 提供完整的汉字到拼音转换功能
 */
// 创建全局实例
let globalInstance = null;
/**
 * 获取全局拼音转换器实例
 */
async function getPinyinConverter() {
    if (!globalInstance) {
        globalInstance = new PinyinConverter();
        await globalInstance.initialize();
    }
    return globalInstance;
}
/**
 * 快速转换函数
 */
async function pinyin(text, options) {
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

export { PinyinConverter, PinyinDataLoader, PinyinUtils, getPinyinConverter, pinyin };
//# sourceMappingURL=pinyin-converter.esm.js.map
