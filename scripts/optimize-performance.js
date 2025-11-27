const fs = require('fs');
const path = require('path');

/**
 * 性能优化脚本
 * 用于分析和优化项目性能
 */

// 分析构建产物大小
function analyzeBuildSize() {
  const outDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(outDir)) {
    console.log('📊 构建目录不存在，请先运行构建命令');
    return;
  }

  console.log('📊 分析构建产物大小...');
  
  // 获取文件大小
  function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  // 递归分析目录
  function analyzeDir(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    let totalSize = 0;
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(prefix, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        const dirSize = analyzeDir(fullPath, relativePath);
        totalSize += dirSize;
        
        if (dirSize > 1024 * 1024) { // 大于1MB
          console.log(`📁 ${relativePath}/: ${(dirSize / 1024 / 1024).toFixed(2)} MB`);
        }
      } else {
        const fileSize = getFileSize(fullPath);
        totalSize += fileSize;
        
        if (fileSize > 500 * 1024) { // 大于500KB
          console.log(`📄 ${relativePath}: ${(fileSize / 1024).toFixed(2)} KB`);
        }
      }
    });
    
    return totalSize;
  }

  const totalSize = analyzeDir(outDir);
  console.log(`\n📊 总构建大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

// 优化图片资源
function optimizeImages() {
  console.log('🖼️  优化图片资源...');
  
  const publicDir = path.join(process.cwd(), 'public');
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  
  function findImages(dir) {
    const images = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        images.push(...findImages(fullPath));
      } else {
        const ext = path.extname(item).toLowerCase();
        if (imageExts.includes(ext)) {
          images.push(fullPath);
        }
      }
    });
    
    return images;
  }
  
  const images = findImages(publicDir);
  console.log(`📸 发现 ${images.length} 张图片`);
  
  let totalSize = 0;
  let largeImages = 0;
  let webpConvertible = 0;
  
  images.forEach(imagePath => {
    const stats = fs.statSync(imagePath);
    const sizeInKB = stats.size / 1024;
    totalSize += sizeInKB;
    
    const ext = path.extname(imagePath).toLowerCase();
    const relativePath = path.relative(publicDir, imagePath);
    
    if (sizeInKB > 500) { // 大于500KB的图片
      console.log(`⚠️  大图片警告: ${relativePath} (${sizeInKB.toFixed(2)} KB)`);
      largeImages++;
    }
    
    // 检查可转换为WebP的图片
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      webpConvertible++;
      if (sizeInKB > 100) {
        console.log(`💡 WebP转换建议: ${relativePath} (${sizeInKB.toFixed(2)} KB)`);
      }
    }
    
    // 检查SVG优化
    if (ext === '.svg') {
      const content = fs.readFileSync(imagePath, 'utf8');
      if (content.length > 10000) { // 大于10KB的SVG
        console.log(`🔧 SVG优化建议: ${relativePath} (${(content.length / 1024).toFixed(2)} KB)`);
      }
    }
  });
  
  console.log(`\n📊 图片统计:`);
  console.log(`   总图片数: ${images.length}`);
  console.log(`   总大小: ${(totalSize / 1024).toFixed(2)} MB`);
  console.log(`   大图片(>500KB): ${largeImages}`);
  console.log(`   可转WebP: ${webpConvertible}`);
  
  // 生成优化建议
  if (largeImages > 0) {
    console.log(`\n💡 优化建议:`);
    console.log(`   1. 将大图片压缩至500KB以下`);
    console.log(`   2. JPG/PNG图片转换为WebP格式`);
    console.log(`   3. 使用响应式图片，提供多种尺寸`);
    console.log(`   4. 启用图片懒加载`);
    console.log(`   5. 使用CDN加速图片加载`);
  }
}

// 检查未使用的依赖
function checkUnusedDependencies() {
  console.log('📦 检查依赖优化...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies || {});
  
  // 检查可能的重复依赖
  const potentialDuplicates = [
    ['framer-motion', 'motion'],
    ['marked', 'react-markdown'],
    ['highlight.js', 'react-syntax-highlighter', 'rehype-highlight'],
  ];
  
  potentialDuplicates.forEach(group => {
    const found = group.filter(dep => dependencies.includes(dep));
    if (found.length > 1) {
      console.log(`⚠️  发现可能的重复依赖: ${found.join(', ')}`);
    }
  });
  
  // 检查大型依赖
  const largeDependencies = [
    'react-markdown',
    'framer-motion',
    'marked',
    'react-syntax-highlighter',
  ];
  
  largeDependencies.forEach(dep => {
    if (dependencies.includes(dep)) {
      console.log(`📦 大型依赖: ${dep} (考虑按需加载)`);
    }
  });
}

// 生成性能报告
function generateReport() {
  console.log('\n📈 性能优化建议:');
  console.log('1. 启用代码分割和懒加载');
  console.log('2. 优化图片大小和格式');
  console.log('3. 使用CDN加速静态资源');
  console.log('4. 启用Gzip压缩');
  console.log('5. 实施缓存策略');
  console.log('6. 减少JavaScript包大小');
  console.log('7. 优化CSS加载');
  console.log('8. 使用Web Workers处理复杂计算');
}

// 主函数
function main() {
  console.log('🚀 开始性能优化分析...\n');
  
  analyzeBuildSize();
  console.log('');
  
  optimizeImages();
  console.log('');
  
  checkUnusedDependencies();
  console.log('');
  
  generateReport();
  
  console.log('\n✅ 性能分析完成！');
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeBuildSize,
  optimizeImages,
  checkUnusedDependencies,
  generateReport,
};