const fs = require('fs');
const path = require('path');

// 获取所有博客文章
const getAllBlogs = (dir) => {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(file => file.isFile() && path.extname(file.name) === '.md')
    .map(file => path.join(dir, file.name));
};

// 更新博客文章的封面图片引用
const updateCoverImages = () => {
  try {
    const blogDir = 'src/content/blogs';
    const blogFiles = getAllBlogs(blogDir);
    
    console.log(`📋 找到 ${blogFiles.length} 篇博客文章`);
    
    let updatedCount = 0;
    
    for (const blogFile of blogFiles) {
      const content = fs.readFileSync(blogFile, 'utf8');
      
      // 查找coverImage字段
      const coverRegex = /coverImage: "(.+)"/g;
      const match = coverRegex.exec(content);
      
      if (match && match[1]) {
        const coverPath = match[1];
        const ext = path.extname(coverPath).toLowerCase();
        
        // 只更新非SVG图片
        if (ext !== '.svg') {
          const newCoverPath = coverPath.replace(ext, '.webp');
          const updatedContent = content.replace(coverRegex, `coverImage: "${newCoverPath}"`);
          
          if (updatedContent !== content) {
            fs.writeFileSync(blogFile, updatedContent, 'utf8');
            console.log(`📝 更新封面图片: ${blogFile} -> ${newCoverPath}`);
            updatedCount++;
          }
        }
      }
    }
    
    console.log(`✅ 成功更新 ${updatedCount} 篇博客文章的封面图片`);
  } catch (error) {
    console.error('❌ 更新封面图片失败:', error.message);
  }
};

// 执行更新
console.log('🚀 开始更新博客文章封面图片...');
updateCoverImages();
console.log('🎉 封面图片更新完成！');
