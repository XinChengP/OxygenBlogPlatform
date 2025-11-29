// 字数统计算法验证脚本
import { calculateAdvancedWordCount, calculateReadingTime } from '../src/utils/wordCountUtils';

console.log('🧪 开始字数统计算法验证测试...\n');

// 测试用例
const testCases = [
  {
    name: '空文本',
    input: '',
    expected: { totalWords: 0, chineseChars: 0, englishWords: 0 }
  },
  {
    name: '纯中文',
    input: '这是一个测试文本',
    expected: { totalWords: 7, chineseChars: 7, englishWords: 0 }
  },
  {
    name: '纯英文',
    input: 'This is a test text',
    expected: { totalWords: 5, chineseChars: 0, englishWords: 5 }
  },
  {
    name: '中英文混合',
    input: 'Hello 世界，这是一个测试 world',
    expected: { totalWords: 9, chineseChars: 7, englishWords: 2 }
  },
  {
    name: '包含数字',
    input: '我有123个苹果和456个橙子',
    expected: { totalWords: 14, chineseChars: 8, numbers: 6 }
  },
  {
    name: '包含标点符号',
    input: '你好，世界！这是一个测试。',
    expected: { totalWords: 9, chineseChars: 9, punctuation: 3 }
  },
  {
    name: 'Markdown格式',
    input: '# 标题\n\n**加粗**和*斜体*文本',
    expected: { totalWords: 6, chineseChars: 6 } // 应该移除Markdown标记
  }
];

// 运行测试
let passedTests = 0;
let totalTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}: ${testCase.name}`);
  console.log(`输入: "${testCase.input}"`);
  
  try {
    const result = calculateAdvancedWordCount(testCase.input);
    console.log(`结果:`, result);
    
    let passed = true;
    Object.entries(testCase.expected).forEach(([key, expectedValue]) => {
      if (result[key] !== expectedValue) {
        console.log(`❌ ${key} 不匹配: 期望 ${expectedValue}, 实际 ${result[key]}`);
        passed = false;
      }
    });
    
    if (passed) {
      console.log('✅ 通过\n');
      passedTests++;
    } else {
      console.log('❌ 失败\n');
    }
    
  } catch (error) {
    console.log(`❌ 错误: ${error.message}\n`);
  }
  
  totalTests++;
});

// 阅读时间测试
console.log('\n📖 阅读时间测试:');
const readingTimeTests = [
  { input: '这是一个短文本', expected: 1 },
  { input: '这是一个很长的文本。'.repeat(100), expected: '>' }
];

readingTimeTests.forEach((test, index) => {
  console.log(`阅读时间测试 ${index + 1}:`);
  const time = calculateReadingTime(test.input);
  console.log(`输入长度: ${test.input.length} 字符`);
  console.log(`预计阅读时间: ${time} 分钟`);
  
  if (test.expected === '>') {
    if (time > 1) {
      console.log('✅ 通过\n');
      passedTests++;
    } else {
      console.log('❌ 失败\n');
    }
  } else if (time === test.expected) {
    console.log('✅ 通过\n');
    passedTests++;
  } else {
    console.log('❌ 失败\n');
  }
  totalTests++;
});

// 性能测试
console.log('\n⚡ 性能测试:');
const largeText = '测试文本。'.repeat(10000);
const startTime = Date.now();
const perfResult = calculateAdvancedWordCount(largeText);
const endTime = Date.now();

console.log(`大文本处理时间: ${endTime - startTime}ms`);
console.log(`处理字符数: ${perfResult.totalChars}`);
console.log(`中文字符数: ${perfResult.chineseChars}`);

if (endTime - startTime < 100) {
  console.log('✅ 性能测试通过\n');
  passedTests++;
} else {
  console.log('❌ 性能测试失败\n');
}
totalTests++;

// 总结
console.log('='.repeat(50));
console.log(`📊 测试结果总结:`);
console.log(`通过测试: ${passedTests}/${totalTests}`);
console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过！字数统计算法优化成功。');
} else {
  console.log('⚠️  部分测试失败，请检查算法实现。');
}