// 测试标点符号处理
const testCases = [
  {
    name: "中文标点符号",
    input: "你好，世界！",
    expected: "ni hao ， shi jie ！"
  },
  {
    name: "英文标点符号", 
    input: "hello, world!",
    expected: "hello , world !"
  },
  {
    name: "混合标点符号",
    input: "你好,世界!",
    expected: "ni hao , shi jie !"
  },
  {
    name: "复杂标点",
    input: "《红楼梦》是中国名著。",
    expected: "《 hong lou meng 》 shi zhong guo ming zhu 。"
  }
];

// 模拟当前的 convertToPinyin 函数逻辑
function testPunctuationHandling(text, options = {}) {
  const defaultOptions = {
    nonChinese: 'keep',
    separator: ' ',
    toneStyle: 'none',
    lowercase: true,
    outputFormat: 'pinyin'
  };
  
  const opts = { ...defaultOptions, ...options };
  const result = [];
  
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    
    // 检查是否为汉字
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 模拟拼音转换
      const pinyinMap = {
        '你': 'ni', '好': 'hao', '世': 'shi', '界': 'jie',
        '红': 'hong', '楼': 'lou', '梦': 'meng', '是': 'shi',
        '中': 'zhong', '国': 'guo', '名': 'ming', '著': 'zhu'
      };
      
      const pinyin = pinyinMap[char] || char;
      result.push(pinyin);
      i++;
    } else {
      // 非中文字符处理
      let nonChineseSegment = '';
      let j = i;
      
      while (j < text.length && !/[\u4e00-\u9fa5]/.test(text[j])) {
        nonChineseSegment += text[j];
        j++;
      }
      
      // 检查是否为标点符号
      const isPunctuation = /[，。！？、；：""''【】《》（）〈〉「」『』〔〕［］｛｝]/g.test(char);
      
      if (isPunctuation) {
        switch (opts.nonChinese) {
          case 'keep':
            result.push(nonChineseSegment);
            break;
          case 'remove':
            break;
          case 'replace':
            result.push('*'.repeat(nonChineseSegment.length));
            break;
        }
      } else {
        // 其他非中文字符（如英文字母）
        switch (opts.nonChinese) {
          case 'keep':
            result.push(nonChineseSegment);
            break;
          case 'remove':
            break;
          case 'replace':
            result.push('*'.repeat(nonChineseSegment.length));
            break;
        }
      }
      
      i = j;
      continue;
    }
    
    i++;
  }
  
  return result.join(opts.separator);
}

// 运行测试
console.log("=== 标点符号处理测试 ===");
testCases.forEach(test => {
  const result = testPunctuationHandling(test.input);
  const passed = result === test.expected;
  
  console.log(`\n测试: ${test.name}`);
  console.log(`输入: "${test.input}"`);
  console.log(`期望: "${test.expected}"`);
  console.log(`实际: "${result}"`);
  console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
  
  if (!passed) {
    console.log(`问题分析: 输出与期望不符`);
  }
});