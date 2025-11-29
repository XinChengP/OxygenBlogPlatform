import { calculateAdvancedWordCount, calculateReadingTime } from '../wordCountUtils';

describe('字数统计工具函数测试', () => {
  describe('calculateAdvancedWordCount', () => {
    it('应该正确处理空文本', () => {
      const result = calculateAdvancedWordCount('');
      expect(result).toEqual({
        totalChars: 0,
        totalWords: 0,
        chineseChars: 0,
        englishWords: 0,
        numbers: 0,
        punctuation: 0,
        spaces: 0,
        lines: 0,
        paragraphs: 0
      });
    });

    it('应该正确处理纯中文文本', () => {
      const result = calculateAdvancedWordCount('这是一个测试文本');
      expect(result.chineseChars).toBe(7);
      expect(result.totalWords).toBe(7);
      expect(result.totalChars).toBe(7);
    });

    it('应该正确处理纯英文文本', () => {
      const result = calculateAdvancedWordCount('This is a test text');
      expect(result.englishWords).toBe(5);
      expect(result.totalWords).toBe(5);
      expect(result.spaces).toBe(4);
    });

    it('应该正确处理中英文混合文本', () => {
      const result = calculateAdvancedWordCount('Hello 世界，这是一个测试 world');
      expect(result.chineseChars).toBe(7);
      expect(result.englishWords).toBe(2);
      expect(result.totalWords).toBe(9); // 7中文 + 2英文
    });

    it('应该正确处理包含数字的文本', () => {
      const result = calculateAdvancedWordCount('我有123个苹果和456个橙子');
      expect(result.chineseChars).toBe(8);
      expect(result.numbers).toBe(6); // 123456
      expect(result.totalWords).toBe(14); // 8中文 + 6数字
    });

    it('应该正确处理包含标点符号的文本', () => {
      const result = calculateAdvancedWordCount('你好，世界！这是一个测试。');
      expect(result.chineseChars).toBe(9);
      expect(result.punctuation).toBe(3); // ，！。
      expect(result.totalWords).toBe(9); // 只统计中文字符
    });

    it('应该正确处理多行文本', () => {
      const result = calculateAdvancedWordCount('第一行\n第二行\n第三行');
      expect(result.lines).toBe(3);
      expect(result.chineseChars).toBe(9);
    });

    it('应该正确处理段落分隔', () => {
      const result = calculateAdvancedWordCount('第一段\n\n第二段\n\n第三段');
      expect(result.paragraphs).toBe(3);
      expect(result.chineseChars).toBe(9);
    });

    it('应该正确处理Markdown标记', () => {
      const result = calculateAdvancedWordCount('# 标题\n\n**加粗**和*斜体*');
      expect(result.chineseChars).toBe(4); // 标题和加粗斜体
      expect(result.punctuation).toBeGreaterThan(0); // Markdown符号
    });

    it('应该正确处理HTML标签', () => {
      const result = calculateAdvancedWordCount('<p>这是一个段落</p><div>这是一个div</div>');
      expect(result.chineseChars).toBe(10); // 应该移除HTML标签后统计
    });

    it('应该正确处理扩展CJK字符', () => {
      const result = calculateAdvancedWordCount('𠮷野家のラーメン');
      expect(result.chineseChars).toBeGreaterThan(0); // 应该识别扩展CJK字符
    });

    it('应该正确处理复杂混合文本', () => {
      const complexText = `
# 标题

这是一个**测试**文本，包含[链接](https://example.com)和\`代码\`。

- 列表项1
- 列表项2

英文部分：Hello World!
数字部分：123 456
`;
      const result = calculateAdvancedWordCount(complexText);
      expect(result.chineseChars).toBeGreaterThan(0);
      expect(result.englishWords).toBeGreaterThan(0);
      expect(result.numbers).toBeGreaterThan(0);
      expect(result.lines).toBeGreaterThan(5);
      expect(result.paragraphs).toBeGreaterThan(0);
    });
  });

  describe('calculateReadingTime', () => {
    it('应该正确处理空文本', () => {
      expect(calculateReadingTime('')).toBe(1);
    });

    it('应该正确处理短文本', () => {
      expect(calculateReadingTime('这是一个短文本')).toBe(1);
    });

    it('应该正确处理中等长度文本', () => {
      const mediumText = '这是一段中等长度的文本，用于测试阅读时间计算功能是否正常工作。';
      const result = calculateReadingTime(mediumText);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
    });

    it('应该正确处理长文本', () => {
      const longText = '这是一段很长的文本。'.repeat(100);
      const result = calculateReadingTime(longText);
      expect(result).toBeGreaterThan(1);
    });

    it('应该正确处理英文为主的文本', () => {
      const englishText = 'This is a test text for reading time calculation. '.repeat(50);
      const result = calculateReadingTime(englishText);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('应该正确处理中英文混合文本', () => {
      const mixedText = 'Hello 世界，这是一个测试 world。'.repeat(50);
      const result = calculateReadingTime(mixedText);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('应该正确处理包含数字的文本', () => {
      const numberText = '数字测试：123, 456, 789, 101112。'.repeat(30);
      const result = calculateReadingTime(numberText);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('应该正确处理包含大量数字的文本', () => {
      const numberHeavyText = '数据：123456789 987654321 111111111 222222222。'.repeat(20);
      const result = calculateReadingTime(numberHeavyText);
      expect(result).toBeGreaterThanOrEqual(2); // 数字多应该增加阅读时间
    });

    it('应该基于文本复杂度调整阅读速度', () => {
      const simpleText = '简单文本测试。'.repeat(100);
      const complexText = '复杂的技术文档包含专业术语和英文单词 technical documentation。'.repeat(50);
      
      const simpleTime = calculateReadingTime(simpleText);
      const complexTime = calculateReadingTime(complexText);
      
      expect(complexTime).toBeGreaterThanOrEqual(simpleTime); // 复杂文本应该需要更多时间
    });

    it('应该正确处理Markdown格式文本', () => {
      const markdownText = `
# 标题

这是一个**加粗**文本和*斜体*文本。

\`\`\`javascript
const code = "test";
\`\`\`

- 列表项1
- 列表项2
`;
      const result = calculateReadingTime(markdownText);
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大文本', () => {
      const largeText = '测试文本。'.repeat(10000);
      const startTime = Date.now();
      const result = calculateAdvancedWordCount(largeText);
      const endTime = Date.now();
      
      expect(result.chineseChars).toBe(40000); // 4字符 * 10000
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该能够处理超长文本', () => {
      const veryLargeText = '这是一个很长的文本，用于测试性能。'.repeat(50000);
      const startTime = Date.now();
      const result = calculateReadingTime(veryLargeText);
      const endTime = Date.now();
      
      expect(result).toBeGreaterThan(100); // 应该需要很多分钟
      expect(endTime - startTime).toBeLessThan(200); // 应该在200ms内完成
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理只有空格的文本', () => {
      const result = calculateAdvancedWordCount('   \n\n   \t   ');
      expect(result.totalWords).toBe(0);
      expect(result.spaces).toBeGreaterThan(0);
    });

    it('应该正确处理只有标点符号的文本', () => {
      const result = calculateAdvancedWordCount('!@#$%^&*()');
      expect(result.totalWords).toBe(0);
      expect(result.punctuation).toBeGreaterThan(0);
    });

    it('应该正确处理只有数字的文本', () => {
      const result = calculateAdvancedWordCount('123456789');
      expect(result.numbers).toBe(9);
      expect(result.totalWords).toBe(9);
    });

    it('应该正确处理Unicode特殊字符', () => {
      const result = calculateAdvancedWordCount('🎉🎊🎈🎁');
      expect(result.totalWords).toBe(0); // 表情符号不计入字数
    });

    it('应该正确处理混合空白字符', () => {
      const result = calculateAdvancedWordCount('文本\r\n\r\n文本');
      expect(result.lines).toBe(3);
      expect(result.chineseChars).toBe(2);
    });
  });
});