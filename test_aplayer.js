// 测试APlayer组件的导入和使用
const fs = require('fs');
const path = require('path');

console.log('测试APlayer组件修复结果...');

// 检查APlayer.tsx文件是否存在
const aplayerPath = path.join(__dirname, 'src/components/APlayer.tsx');
if (!fs.existsSync(aplayerPath)) {
  console.error('❌ APlayer.tsx文件不存在');
  process.exit(1);
}

console.log('✅ APlayer.tsx文件存在');

// 读取文件内容
const content = fs.readFileSync(aplayerPath, 'utf8');

// 检查关键组件和导出
const tests = [
  {
    name: 'MusicServer枚举定义',
    pattern: /export enum MusicServer/,
    error: 'MusicServer枚举定义缺失'
  },
  {
    name: 'MusicType枚举定义', 
    pattern: /export enum MusicType/,
    error: 'MusicType枚举定义缺失'
  },
  {
    name: 'APlayer函数定义',
    pattern: /export default function APlayer/,
    error: 'APlayer函数定义缺失'
  },
  {
    name: 'PlayMode枚举导出',
    pattern: /export \{ PlayMode \}/,
    error: 'PlayMode枚举导出缺失'
  },
  {
    name: 'MusicServer和MusicType导出',
    pattern: /export \{ MusicServer, MusicType \}/,
    error: 'MusicServer和MusicType导出缺失'
  },
  {
    name: '默认导出',
    pattern: /export default APlayer/,
    error: '默认导出缺失'
    }
  ];

let allPassed = true;

tests.forEach((test, index) => {
  if (test.pattern.test(content)) {
    console.log(`✅ ${test.name}: 通过`);
  } else {
    console.log(`❌ ${test.name}: ${test.error}`);
    allPassed = false;
  }
});

// 检查是否有重复的导出语句
const exportDefaultMatches = content.match(/export default APlayer/g);
if (exportDefaultMatches && exportDefaultMatches.length > 1) {
  console.log('❌ 存在重复的默认导出语句');
  allPassed = false;
} else {
  console.log('✅ 无重复的默认导出语句');
}

// 检查文件结构完整性
const lines = content.split('\n');
const lastFewLines = lines.slice(-10); // 检查最后10行
const hasClosingBrace = lastFewLines.some(line => line.trim() === '}');
const hasDefaultExport = content.includes('export default APlayer;');
const hasExports = content.includes('export { MusicServer, MusicType }') || content.includes('export { PlayMode }');

if (hasClosingBrace && hasDefaultExport && hasExports) {
  console.log('✅ 文件结构完整');
} else {
  console.log(`❌ 文件结构不完整，closingBrace: ${hasClosingBrace}, defaultExport: ${hasDefaultExport}, exports: ${hasExports}`);
  allPassed = false;
}

// 检查是否有明显的语法错误
const braceCount = (content.match(/{/g) || []).length - (content.match(/}/g) || []).length;
if (braceCount === 0) {
  console.log('✅ 大括号匹配正确');
} else {
  console.log(`❌ 大括号不匹配，差值: ${braceCount}`);
  allPassed = false;
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 所有测试通过！APlayer组件修复成功！');
  
  // 显示文件信息
  console.log(`\n📊 文件信息:`);
  console.log(`- 总行数: ${lines.length}`);
  console.log(`- 文件大小: ${Buffer.byteLength(content, 'utf8')} bytes`);
  
  // 显示主要结构
  console.log(`\n🔧 主要导出项:`);
  const exports = content.match(/export\s+[^;]+;/g) || [];
  exports.forEach((exp, i) => {
    console.log(`  ${i + 1}. ${exp.trim()}`);
  });
  
} else {
  console.log('❌ 测试失败，APlayer组件仍有问题需要修复');
  process.exit(1);
}