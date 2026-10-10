/**
 * 计算博客文章的阅读时长
 * 
 * 基于平均阅读速度计算：
 * - 中文：每分钟300字
 * - 英文：每分钟200单词
 * 
 * @param content - 博客内容
 * @param cnCharsPerMinute - 中文每分钟阅读字数，默认为400
 * @param enWordsPerMinute - 英文每分钟阅读单词数，默认为200
 * @returns 阅读时长（分钟），最小为1分钟
 */
export function calculateReadingTime(content: string): number {
  if (!content || content.trim().length === 0) return 1;
  
  // 移除HTML标签和Markdown标记
  const cleanContent = content
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // 处理Markdown链接和图片
    .replace(/#{1,6}\s/g, '') // 移除标题标记
    .replace(/\*\*|__|~~|\*|_/g, '') // 移除加粗、斜体等标记
    .trim();
  
  if (cleanContent.length === 0) return 1;
  
  // CJK字符范围（包含中日韩统一表意符号）
  const CJK_RANGES = [
    [0x4e00, 0x9fff],   // CJK Unified Ideographs
    [0x3400, 0x4dbf],   // CJK Extension A
    [0xf900, 0xfaff],   // CJK Compatibility Ideographs
    [0x3000, 0x303f],   // CJK Symbols and Punctuation
  ];
  
  // 检查字符是否在指定范围内
  const isCharInRanges = (charCode: number, ranges: number[][]) => {
    return ranges.some(([start, end]) => charCode >= start && charCode <= end);
  };
  
  let chineseChars = 0;
  let englishWords = 0;
  let numbers = 0;
  let totalWords = 0;
  
  let currentWord = '';
  let inEnglishWord = false;
  
  // 逐字符分析
  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const charCode = char.codePointAt(0) || 0;
    
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
    if (charCode >= 0x30 && charCode <= 0x39) {
      numbers++;
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
    
    // 处理空格和标点符号
    if (char === ' ' || char === '\t' || char === '\n') {
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }
    
    // 处理其他情况
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
  
  // 总词数 = 中文字符 + 英文单词 + 数字
  totalWords = chineseChars + englishWords + numbers;
  
  // 基于文本复杂度调整阅读速度
  let readingSpeed = 400; // 基础阅读速度（中文）
  
  // 如果英文比例较高，降低阅读速度
  const englishRatio = englishWords / totalWords;
  if (englishRatio > 0.3) {
    readingSpeed = 350; // 混合文本降低速度
  } else if (englishRatio > 0.6) {
    readingSpeed = 300; // 英文为主进一步降低
  }
  
  // 如果数字较多，适当增加阅读时间
  const numberRatio = numbers / totalWords;
  if (numberRatio > 0.1) {
    readingSpeed *= 0.9; // 数字多，阅读速度降低10%
  }
  
  // 计算阅读时间
  const readingTime = totalWords / readingSpeed;
  
  return Math.max(1, Math.ceil(readingTime));
}

/**
 * 格式化博客日期，支持多种日期格式
 * 
 * 支持的格式：
 * - YYYY-MM-DD (如: 2024-01-01)
 * - 不补零的 YYYY-M-D (如: 2024-1-1，解析前会自动补零归一化)
 * - YYYY-MM-DD HH:mm (如: 2024-01-01 14:30)
 * - YYYY-MM-DD HH:mm:ss (如: 2024-01-01 14:30:45)
 * - ISO 8601 格式 (如: 2024-01-01T14:30:45.123Z)
 * - 其他 JavaScript Date 构造函数支持的格式
 * 
 * @param dateInput - 日期字符串或 undefined
 * @param defaultDate - 默认日期，当输入无效时使用
 * @returns 格式化后的日期字符串 (YYYY-MM-DD)
 */
export function formatBlogDate(dateInput?: string, defaultDate: string = '2024-01-01'): string {
  if (!dateInput) {
    return defaultDate;
  }
  
  try {
    // 第一步：归一化不补零的年月日写法（如 2025-9-24 → 2025-09-24、2025-09-4 → 2025-09-04）。
    // 修复原因：下方分支只识别补零格式，不补零时会掉进兜底的 new Date(非标准字符串)，
    // V8 按本地时间解析后再经 toISOString() 转 UTC，在东八区会把日期回退一天
    // （实测 2025-9-24 会输出 2025-09-23，导致归档页时光河流按年分组串年）。
    // 先补零可让它走上方的标准分支（按 UTC 解析），彻底避开时区偏移；
    // 已补零的输入经过此步保持原样，不影响既有行为。
    const normalizedInput = dateInput.replace(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/,
      (_match, year: string, month: string, day: string) =>
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    );

    // 尝试解析各种日期格式
    let date: Date;
    
    // 处理常见的日期格式（统一基于归一化后的字符串判断与解析）
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedInput)) {
      // YYYY-MM-DD 格式
      date = new Date(normalizedInput + 'T00:00:00.000Z');
    } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(normalizedInput)) {
      // YYYY-MM-DD HH:mm 格式
      date = new Date(normalizedInput + ':00.000Z');
    } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(normalizedInput)) {
      // YYYY-MM-DD HH:mm:ss 格式
      date = new Date(normalizedInput + '.000Z');
    } else {
      // 其他格式，直接使用 Date 构造函数
      date = new Date(normalizedInput);
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateInput}, using default date: ${defaultDate}`);
      return defaultDate;
    }
    
    // 返回 YYYY-MM-DD 格式
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error(`Error parsing date: ${dateInput}`, error);
    return defaultDate;
  }
}
