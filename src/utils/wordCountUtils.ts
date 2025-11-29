/**
 * 高级字数统计工具类
 * 支持中英文混合文本的精确字数统计
 */

export interface WordCountResult {
  totalChars: number;      // 总字符数（含空格）
  totalWords: number;      // 总词数
  chineseChars: number;    // 中文字符数
  englishWords: number;    // 英文单词数
  numbers: number;         // 数字数量
  punctuation: number;     // 标点符号数
  spaces: number;          // 空格数
  lines: number;          // 行数
  paragraphs: number;       // 段落数
}

export interface ReadingTimeResult {
  totalMinutes: number;    // 总阅读时间（分钟）
  chineseMinutes: number;  // 中文阅读时间
  englishMinutes: number;  // 英文阅读时间
  formattedTime: string;   // 格式化时间显示
}

/**
 * 扩展的CJK字符范围
 * 包含中日韩统一表意符号、扩展区、兼容字符等
 */
const CJK_RANGES = [
  [0x4e00, 0x9fff],   // CJK Unified Ideographs
  [0x3400, 0x4dbf],   // CJK Extension A
  [0x20000, 0x2a6df], // CJK Extension B
  [0x2a700, 0x2b73f], // CJK Extension C
  [0x2b740, 0x2b81f], // CJK Extension D
  [0x2b820, 0x2ceaf], // CJK Extension E
  [0x2ceb0, 0x2ebef], // CJK Extension F
  [0x3000, 0x303f],   // CJK Symbols and Punctuation
  [0x3040, 0x309f],   // Hiragana
  [0x30a0, 0x30ff],   // Katakana
  [0x31f0, 0x31ff],   // Katakana Phonetic Extensions
  [0xff00, 0xffef],   // Halfwidth and Fullwidth Forms
  [0xf900, 0xfaff],   // CJK Compatibility Ideographs
];

/**
 * 标点符号范围
 */
const PUNCTUATION_RANGES = [
  [0x21, 0x2f],     // ! " # $ % & ' ( ) * + , - . /
  [0x3a, 0x40],     // : ; < = > ? @
  [0x5b, 0x60],     // [ \ ] ^ _ `
  [0x7b, 0x7e],     // { | } ~
  [0x3001, 0x303f], // CJK标点符号
  [0xff01, 0xff0f], // 全角标点1
  [0xff1a, 0xff20], // 全角标点2
  [0xff3b, 0xff40], // 全角标点3
  [0xff5b, 0xff65], // 全角标点4
];

/**
 * 数字字符范围
 */
const NUMBER_RANGES = [
  [0x30, 0x39],     // 0-9
  [0xff10, 0xff19], // 全角数字
];

/**
 * 检查字符是否在指定范围内
 */
function isCharInRanges(charCode: number, ranges: number[][]): boolean {
  return ranges.some(([start, end]) => charCode >= start && charCode <= end);
}

/**
 * 移除Markdown标记和HTML标签
 */
function cleanText(text: string): string {
  return text
    // 移除HTML标签
    .replace(/<\/?[^>]+(>|$)/g, '')
    // 移除Markdown链接和图片
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 移除代码块
    .replace(/```[\s\S]*?```/g, '')
    // 移除行内代码
    .replace(/`[^`]*`/g, '')
    // 移除标题标记
    .replace(/#{1,6}\s/g, '')
    // 移除列表标记
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // 移除引用标记
    .replace(/^[\s]*>\s+/gm, '')
    // 移除表格标记
    .replace(/\|/g, '')
    .replace(/^[\s]*-+[\s|-]*$/gm, '')
    // 移除强调标记
    .replace(/\*\*|__|~~|\*|_/g, '');
}

/**
 * 高级字数统计函数
 * 支持中英文混合文本的精确统计
 */
export function advancedWordCount(text: string): WordCountResult {
  if (!text || text.trim().length === 0) {
    return {
      totalChars: 0,
      totalWords: 0,
      chineseChars: 0,
      englishWords: 0,
      numbers: 0,
      punctuation: 0,
      spaces: 0,
      lines: 0,
      paragraphs: 0
    };
  }

  // 清理文本
  const cleanedText = cleanText(text);
  
  let chineseChars = 0;
  let englishWords = 0;
  let numbers = 0;
  let punctuation = 0;
  let spaces = 0;
  
  let currentWord = '';
  let inEnglishWord = false;
  
  // 逐字符分析
  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const charCode = char.codePointAt(0) || 0;
    
    // 统计空格
    if (char === ' ' || char === '\t') {
      spaces++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }
    
    // 统计中文字符
    if (isCharInRanges(charCode, CJK_RANGES)) {
      chineseChars++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }
    
    // 统计数字
    if (isCharInRanges(charCode, NUMBER_RANGES)) {
      numbers++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }
    
    // 统计标点符号
    if (isCharInRanges(charCode, PUNCTUATION_RANGES)) {
      punctuation++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }
    
    // 处理英文字符
    if ((charCode >= 0x41 && charCode <= 0x5a) || // A-Z
        (charCode >= 0x61 && charCode <= 0x7a)) {  // a-z
      currentWord += char;
      inEnglishWord = true;
      continue;
    }
    
    // 处理其他情况（如特殊字符）
    if (inEnglishWord && currentWord) {
      englishWords++;
      currentWord = '';
      inEnglishWord = false;
    }
  }
  
  // 处理最后一个单词
  if (inEnglishWord && currentWord) {
    englishWords++;
  }
  
  // 计算行数
  const lines = cleanedText.split('\n').length;
  
  // 计算段落数（空行分隔）
  const paragraphs = cleanedText.split(/\n\s*\n/).filter(p => p.trim()).length || 1;
  
  // 总词数 = 中文字符 + 英文单词 + 数字
  const totalWords = chineseChars + englishWords + numbers;
  
  return {
    totalChars: text.length,
    totalWords,
    chineseChars,
    englishWords,
    numbers,
    punctuation,
    spaces,
    lines,
    paragraphs
  };
}

/**
 * 改进的阅读时间计算
 * 基于语言类型和文本复杂度
 */
export function calculateAdvancedReadingTime(
  text: string,
  options: {
    cnCharsPerMinute?: number;
    enWordsPerMinute?: number;
    complexityFactor?: number;
  } = {}
): ReadingTimeResult {
  const {
    cnCharsPerMinute = 350,    // 中文阅读速度（考虑理解深度）
    enWordsPerMinute = 200,    // 英文阅读速度
    complexityFactor = 1.0    // 复杂度因子
  } = options;
  
  const wordCount = advancedWordCount(text);
  
  if (wordCount.totalWords === 0) {
    return {
      totalMinutes: 1,
      chineseMinutes: 0,
      englishMinutes: 0,
      formattedTime: '< 1 分钟'
    };
  }
  
  // 计算各语言阅读时间
  const chineseMinutes = wordCount.chineseChars / cnCharsPerMinute;
  const englishMinutes = wordCount.englishWords / enWordsPerMinute;
  
  // 考虑复杂度因子（如专业术语、长句等）
  const adjustedChineseMinutes = chineseMinutes * complexityFactor;
  const adjustedEnglishMinutes = englishMinutes * complexityFactor;
  
  const totalMinutes = Math.max(1, Math.ceil(
    adjustedChineseMinutes + adjustedEnglishMinutes
  ));
  
  // 格式化时间显示
  let formattedTime: string;
  if (totalMinutes < 1) {
    formattedTime = '< 1 分钟';
  } else if (totalMinutes === 1) {
    formattedTime = '1 分钟';
  } else if (totalMinutes < 60) {
    formattedTime = `${totalMinutes} 分钟`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    formattedTime = minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
  }
  
  return {
    totalMinutes,
    chineseMinutes: Math.ceil(adjustedChineseMinutes),
    englishMinutes: Math.ceil(adjustedEnglishMinutes),
    formattedTime
  };
}

/**
 * 获取文本复杂度因子
 * 基于句子长度、词汇难度等指标
 */
export function getTextComplexity(text: string): number {
  if (!text || text.trim().length === 0) {
    return 1.0;
  }
  
  const cleanedText = cleanText(text);
  
  // 计算平均句子长度（以句号、问号、感叹号分隔）
  const sentences = cleanedText.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 
    ? cleanedText.length / sentences.length 
    : cleanedText.length;
  
  // 计算长词比例（超过6个字符的词）
  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
  const longWords = words.filter(w => w.length > 6);
  const longWordRatio = words.length > 0 ? longWords.length / words.length : 0;
  
  // 计算专业术语密度（假设包含数字、大写字母的词为专业术语）
  const technicalTerms = words.filter(w => 
    /\d/.test(w) || /^[A-Z]/.test(w) || w.includes('-')
  );
  const technicalDensity = words.length > 0 ? technicalTerms.length / words.length : 0;
  
  // 基础复杂度
  let complexity = 1.0;
  
  // 句子长度因子（超过100字符增加复杂度）
  if (avgSentenceLength > 100) {
    complexity += 0.2;
  } else if (avgSentenceLength > 60) {
    complexity += 0.1;
  }
  
  // 长词因子
  complexity += longWordRatio * 0.3;
  
  // 专业术语因子
  complexity += technicalDensity * 0.4;
  
  return Math.min(2.0, complexity); // 最大复杂度为2.0
}

/**
 * 智能字数统计
 * 根据文本类型自动调整统计策略
 */
export function smartWordCount(text: string, textType: 'general' | 'technical' | 'literary' = 'general'): WordCountResult {
  const baseResult = advancedWordCount(text);
  
  if (textType === 'technical') {
    // 技术文档：降低阅读速度
    return {
      ...baseResult,
      totalWords: Math.ceil(baseResult.totalWords * 1.2) // 技术词汇需要更多时间理解
    };
  } else if (textType === 'literary') {
    // 文学作品：考虑修辞手法
    return {
      ...baseResult,
      totalWords: Math.ceil(baseResult.totalWords * 1.1) // 文学语言需要品味
    };
  }
  
  return baseResult;
}

// 兼容旧版本函数名
export const calculateAdvancedWordCount = advancedWordCount;
export const calculateReadingTime = calculateAdvancedReadingTime;

export default {
  advancedWordCount,
  calculateAdvancedReadingTime,
  calculateAdvancedWordCount,
  calculateReadingTime,
  getTextComplexity,
  smartWordCount
};