// 测试标点符号情况下切换读音对应出错的问题

const testCases = [
  {
    name: "简单标点测试",
    input: "你好，世界！",
    description: "测试基本标点符号情况"
  },
  {
    name: "重复多音字带标点",
    input: "行长说，行，行！",
    description: "测试重复多音字'行'在标点后的情况"
  },
  {
    name: "复杂标点混合",
    input: "重(chóng)要的事情说三遍：重要、重要、重要！",
    description: "测试括号、冒号、顿号等复杂标点"
  }
];

console.log("=== 标点符号切换读音问题测试 ===");

testCases.forEach((testCase, index) => {
  console.log(`\n测试用例 ${index + 1}: ${testCase.name}`);
  console.log(`输入: "${testCase.input}"`);
  console.log(`描述: ${testCase.description}`);
  
  // 模拟分析字符位置
  const chars = testCase.input.split('');
  const charPositions = chars.map((char, i) => ({
    index: i,
    char: char,
    isChinese: /[\u4e00-\u9fa5]/.test(char),
    isPunctuation: /[，。！？、；：""''【】《》（）〈〉「」『』〔〕［］｛｝]/g.test(char)
  }));
  
  console.log('字符位置分析:');
  charPositions.forEach(pos => {
    const type = pos.isChinese ? '汉字' : pos.isPunctuation ? '标点' : '其他';
    console.log(`  [${pos.index}] "${pos.char}" - ${type}`);
  });
  
  // 识别多音字
  const heteronyms = charPositions.filter(pos => pos.isChinese && 
    ['行', '重', '要', '好', '世', '界'].includes(pos.char));
  
  console.log('识别的多音字:');
  heteronyms.forEach(pos => {
    console.log(`  位置 ${pos.index}: "${pos.char}"`);
  });
});

console.log("\n=== 问题分析 ===");
console.log("1. 队列匹配机制可能因标点符号导致位置错位");
console.log("2. 需要确保字符位置索引与parts数组索引正确对应");
console.log("3. 标点符号处理可能影响匹配顺序");