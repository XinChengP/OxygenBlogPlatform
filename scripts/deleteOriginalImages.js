const fs = require('fs');
const path = require('path');

// 配置
const config = {
  inputDir: 'public/Blogabout',
  keepFormats: ['.svg', '.webp'],
  deleteFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']
};

// 获取所有需要删除的图片文件
const getAllOriginalImages = (dir) => {
  let images = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      images = images.concat(getAllOriginalImages(fullPath));
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (config.delete