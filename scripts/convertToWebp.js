const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 图片转换配置
const config = {
  inputDir: 'public/Blogabout',
  quality: 100,
  excludeFormats: ['.svg'],
  formatsToConvert: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']
};

// 获取所有需要转换的图片文件
const getAllImages = (dir) => {
  let images = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      images = images.concat(getAllImages(fullPath));
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (config.formatsToConvert.includes(ext) && !config.excludeFormats.includes(ext)) {
        images.push(fullPath);
      }
    }
  }
  
  return images;
};

// 转换图片为webp格式
const convertToWebp = async (imagePath) => {
  try {
    const dir = path.dirname(imagePath);
    const filename = path.basename(imagePath, path.extname(imagePath));
    const webpPath = path.join(dir, `${filename}.webp`);
    
    // 转换为webp，质量100%
    await sharp(imagePath)
      .webp({ quality: config.quality })
      .toFile(webpPath);
    
    console.log(`✅ 转换完成: ${imagePath} -> ${webpPath}`);
    return { original: imagePath, webp: webpPath, filename: `${filename}.webp` };
  } catch (error) {
    console.error(`❌ 转换失败: ${imagePath}`, error.message);
    return null;
  }
};

// 更新博客文章中的图片引用
const updateBlogReferences = (convertedImages) => {
  try {
    // 查找所有博客文章
    const blogDir = 'src/content/blogs';
    const blogFiles = fs.readdirSync(blogDir, { withFileTypes: true })
      .filter(file => file.isFile() && path.extname(file.name) === '.md')
      .map(file => path.join(blogDir, file.name));
    
    // 更新每个博客文章
    blogFiles.forEach(blogFile => {
      let content = fs.readFileSync(blogFile, 'utf8');
      let hasChanges = false;
      
      convertedImages.forEach(image => {
        if (!image) return;
        
        const originalFilename = path.basename(image.original);
        const webpFilename = image.filename;
        const relativePath = image.original.replace('public/', '/');
        const webpRelativePath = image.webp.replace('public/', '/');
        
        // 更新Markdown中的图片引用
        const imgRegex = new RegExp(`!\[.*?\]\((.*?${originalFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?)\)`, 'g');
        const updatedContent = content.replace(imgRegex, (match, src) => {
          hasChanges = true;
          return match.replace(originalFilename, webpFilename);
        });
        
        // 更新HTML中的图片引用
        const htmlImgRegex = new RegExp(`<img[^>]*?src=["'](.*?${originalFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?)["'][^>]*?>`, 'g');
        content = updatedContent.replace(htmlImgRegex, (match) => {
          hasChanges = true;
          return match.replace(originalFilename, webpFilename);
        });
      });
      
      if (hasChanges) {
        fs.writeFileSync(blogFile, content, 'utf8');
        console.log(`📝 更新完成: ${blogFile}`);
      }
    });
  } catch (error) {
    console.error('❌ 更新博客引用失败:', error.message);
  }
};

// 主函数
const main = async () => {
  console.log('🚀 开始转换图片为webp格式...');
  console.log(`📁 输入目录: ${config.inputDir}`);
  console.log(`🎨 质量设置: ${config.quality}%`);
  console.log(`📋 转换格式: ${config.formatsToConvert.join(', ')}`);
  console.log(`🚫 排除格式: ${config.excludeFormats.join(', ')}`);
  console.log('------------------------------------');
  
  // 获取所有需要转换的图片
  const images = getAllImages(config.inputDir);
  console.log(`📊 找到 ${images.length} 张图片需要转换`);
  
  // 转换所有图片
  const convertedImages = [];
  for (const image of images) {
    const result = await convertToWebp(image);
    if (result) {
      convertedImages.push(result);
    }
  }
  
  console.log('------------------------------------');
  console.log(`✅ 成功转换 ${convertedImages.length} 张图片`);
  
  // 更新博客文章中的引用
  console.log('📝 开始更新博客文章中的图片引用...');
  updateBlogReferences(convertedImages);
  
  console.log('------------------------------------');
  console.log('🎉 所有任务完成！');
};

// 执行主函数
main().catch(console.error);
