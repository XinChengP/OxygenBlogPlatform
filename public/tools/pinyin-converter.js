(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.PinyinConverter = {}));
})(this, (function (exports) { 'use strict';

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
            // 获取当前脚本的基础路径
            const basePath = this.getBasePath();
            console.log('Loading pinyin data with basePath:', basePath);
            
            // 优先使用kMandarin数据，然后使用pinyin.txt作为补充
            console.log('Loading kMandarin data from:', basePath + 'pinyin-data/kMandarin.txt');
            await this.loadMandarinData(basePath);
            
            console.log('Loading pinyin data from:', basePath + 'pinyin-data/pinyin.txt');
            await this.loadPinyinData(basePath);
            
            this.loaded = true;
            console.log(`拼音数据加载完成，共${Object.keys(this.data).length}个字符`);
        }
        catch (error) {
            console.error('加载拼音数据失败:', error);
            throw new Error('Failed to load pinyin data');
        }
    }
        /**
     * 获取当前脚本的基础路径
     */
    getBasePath() {
        if (typeof window === 'undefined') {
            return './';
        }
        
        // 从当前脚本的src属性中提取基础路径
        let scriptPath = '';
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (script.src.includes('pinyin-converter.js')) {
                scriptPath = script.src;
                break;
            }
        }
        
        // 如果找到了脚本路径，提取基础路径
        if (scriptPath) {
            // 移除文件名，只保留目录路径
            const basePath = scriptPath.replace('pinyin-converter.js', '');
            return basePath;
        }
        
        // 降级方案：使用URL路径
        const pathname = window.location.pathname;
        const pathSegments = pathname.split('/').filter(segment => segment);
        
        // 如果路径包含仓库名（GitHub Pages部署），则使用仓库名作为基础路径
        let basePath = '';
        if (pathSegments.length > 0 && pathSegments[0] !== '' && pathSegments[0] !== 'settings') {
            basePath = `/${pathSegments[0]}`;
        }
        
        // 数据文件位于public/tools/pinyin-data/
        return `${basePath}/tools/`;
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
    async loadMandarinData(basePath) {
        try {
            const response = await fetch(basePath + 'pinyin-data/kMandarin.txt');
            if (!response.ok) {
                throw new Error(`Failed to fetch kMandarin.txt: ${response.status}`);
            }
            const text = await response.text();
            const lines = text.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) {
                    continue;
                }
                
                const parts = trimmedLine.split(' ');
                if (parts.length < 2) {
                    continue;
                }
                
                const charCode = parseInt(parts[0], 16);
                const pinyin = parts[1].toLowerCase();
                
                if (isNaN(charCode)) {
                    continue;
                }
                
                const char = String.fromCharCode(charCode);
                if (!this.data[char]) {
                    this.data[char] = [];
                }
                
                if (!this.data[char].includes(pinyin)) {
                    this.data[char].push(pinyin);
                }
            }
            
            console.log(`Loaded ${Object.keys(this.data).length} characters from kMandarin.txt`);
        } catch (error) {
            console.warn('Failed to load kMandarin.txt, falling back to pinyin.txt:', error);
        }
    }
        /**
     * 从pinyin.txt加载数据
     */
    async loadPinyinData(basePath) {
        try {
            const response = await fetch(basePath + 'pinyin-data/pinyin.txt');
            if (!response.ok) {
                throw new Error(`Failed to fetch pinyin.txt: ${response.status}`);
            }
            const text = await response.text();
            const lines = text.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) {
                    continue;
                }
                
                const parts = trimmedLine.split(' ');
                if (parts.length < 2) {
                    continue;
                }
                
                const char = parts[0];
                const pinyins = parts.slice(1).map(p => p.toLowerCase());
                
                // 如果字符已经存在于数据中，合并拼音列表
                if (this.data[char]) {
                    for (const pinyin of pinyins) {
                        if (!this.data[char].includes(pinyin)) {
                            this.data[char].push(pinyin);
                        }
                    }
                } else {
                    this.data[char] = pinyins;
                }
            }
            
            console.log(`Loaded ${Object.keys(this.data).length} characters from pinyin.txt`);
        } catch (error) {
            console.error('Failed to load pinyin.txt:', error);
            throw new Error('Failed to load pinyin.txt');
        }
    }
    }
    
    /**
     * 拼音转换器
     * 负责将中文文本转换为拼音
     */
    class PinyinConverter {
        constructor() {
            this.dataLoader = PinyinDataLoader.getInstance();
        }
        
        static getInstance() {
            if (!PinyinConverter.instance) {
                PinyinConverter.instance = new PinyinConverter();
            }
            return PinyinConverter.instance;
        }
        
        /**
         * 初始化转换器
         */
        async init() {
            if (!this.initialized) {
                await this.dataLoader.loadData();
                this.initialized = true;
            }
        }
        
        /**
         * 转换文本为拼音
         * @param text 要转换的中文文本
         * @param options 转换选项
         */
        convert(text, options = {}) {
            const defaultOptions = {
                toneStyle: 'mark', // mark, number, none
                outputFormat: 'full', // full, initials, both
                separator: ' ',
                nonChinese: 'keep', // keep, remove, replace
                replaceChar: '',
                lowercase: true,
                heteronym: false
            };
            
            const finalOptions = { ...defaultOptions, ...options };
            const data = this.dataLoader.getData();
            const results = [];
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const pinyins = data[char] || [];
                
                if (pinyins.length > 0) {
                    // 中文字符
                    const isHeteronym = pinyins.length > 1;
                    
                    // 处理声调
                    const processedPinyins = pinyins.map(pinyin => {
                        return this.processTone(pinyin, finalOptions.toneStyle);
                    });
                    
                    // 处理大小写
                    const caseProcessedPinyins = finalOptions.lowercase 
                        ? processedPinyins 
                        : processedPinyins.map(p => p.toUpperCase());
                    
                    // 处理输出格式
                    const formatProcessedPinyins = caseProcessedPinyins.map(pinyin => {
                        return this.processOutputFormat(pinyin, finalOptions.outputFormat);
                    });
                    
                    results.push({
                        origin: char,
                        pinyin: finalOptions.heteronym ? formatProcessedPinyins : [formatProcessedPinyins[0]],
                        isHeteronym: isHeteronym
                    });
                } else {
                    // 非中文字符
                    let processedChar = char;
                    
                    if (finalOptions.nonChinese === 'remove') {
                        continue;
                    } else if (finalOptions.nonChinese === 'replace') {
                        processedChar = finalOptions.replaceChar;
                    }
                    
                    results.push({
                        origin: char,
                        pinyin: [processedChar],
                        isNonChinese: true
                    });
                }
            }
            
            return results;
        }
        
        /**
         * 处理声调
         * @param pinyin 带数字声调的拼音
         * @param toneStyle 声调样式
         */
        processTone(pinyin, toneStyle) {
            if (toneStyle === 'none') {
                // 移除声调
                return pinyin.replace(/\d$/, '');
            } else if (toneStyle === 'mark') {
                // 转换为符号声调
                return this.numberToMark(pinyin);
            }
            // 保留数字声调
            return pinyin;
        }
        
        /**
         * 处理输出格式
         * @param pinyin 拼音
         * @param outputFormat 输出格式
         */
        processOutputFormat(pinyin, outputFormat) {
            if (outputFormat === 'initials') {
                // 只输出首字母
                return pinyin.charAt(0);
            } else if (outputFormat === 'both') {
                // 输出完整拼音和首字母
                return `${pinyin}(${pinyin.charAt(0)})`;
            }
            // 输出完整拼音
            return pinyin;
        }
        
        /**
         * 将数字声调转换为符号声调
         * @param pinyin 带数字声调的拼音
         */
        numberToMark(pinyin) {
            const toneMap = {
                'a1': 'ā', 'a2': 'á', 'a3': 'ǎ', 'a4': 'à',
                'e1': 'ē', 'e2': 'é', 'e3': 'ě', 'e4': 'è',
                'i1': 'ī', 'i2': 'í', 'i3': 'ǐ', 'i4': 'ì',
                'o1': 'ō', 'o2': 'ó', 'o3': 'ǒ', 'o4': 'ò',
                'u1': 'ū', 'u2': 'ú', 'u3': 'ǔ', 'u4': 'ù',
                'v1': 'ǖ', 'v2': 'ǘ', 'v3': 'ǚ', 'v4': 'ǜ'
            };
            
            // 处理ü
            pinyin = pinyin.replace(/ü/g, 'v');
            
            // 提取声调数字
            const toneNumber = pinyin.charAt(pinyin.length - 1);
            if (isNaN(parseInt(toneNumber))) {
                return pinyin.replace(/v/g, 'ü');
            }
            
            const basePinyin = pinyin.slice(0, -1);
            
            // 查找需要添加声调的元音
            const vowels = ['a', 'e', 'i', 'o', 'u', 'v'];
            let vowelIndex = -1;
            
            for (const vowel of vowels) {
                const index = basePinyin.indexOf(vowel);
                if (index !== -1) {
                    vowelIndex = index;
                    break;
                }
            }
            
            if (vowelIndex === -1) {
                return pinyin.replace(/v/g, 'ü');
            }
            
            // 构建带声调的拼音
            const vowelWithTone = toneMap[basePinyin[vowelIndex] + toneNumber] || basePinyin[vowelIndex];
            const markedPinyin = basePinyin.slice(0, vowelIndex) + vowelWithTone + basePinyin.slice(vowelIndex + 1);
            
            // 将v转换回ü
            return markedPinyin.replace(/v/g, 'ü');
        }
    }
    
    // 初始化全局实例
    const converter = new PinyinConverter();
    
    // 导出API
    exports.PinyinConverter = PinyinConverter;
    exports.PinyinDataLoader = PinyinDataLoader;
    exports.getPinyinConverter = async () => {
        await converter.init();
        return converter;
    };
    
    Object.defineProperty(exports, '__esModule', { value: true });

}));