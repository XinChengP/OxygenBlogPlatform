/**
 * 批量下载洛克王国宠物图标脚本
 * 下载所有缺失的宠物图标到本地
 * 使用方法: node scripts/download-roco-icons.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 图标保存目录
const ICONS_DIR = path.join(__dirname, '..', 'public', 'roco-icons', 'pets');

// 确保目录存在
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  console.log(`创建目录: ${ICONS_DIR}`);
}

// 从 rocoPets.ts 文件中提取宠物ID和imageId
function extractPets() {
  const rocoPetsPath = path.join(__dirname, '..', 'src', 'data', 'rocoPets.ts');
  const content = fs.readFileSync(rocoPetsPath, 'utf-8');
  
  // 匹配宠物定义行，包括 id 和可选的 imageId
  const petMatches = content.match(/\{[^}]*id:\s*(\d+)[^}]*\}/g);
  if (!petMatches) {
    console.error('无法从 rocoPets.ts 中提取宠物数据');
    return [];
  }
  
  const pets = [];
  petMatches.forEach(match => {
    const idMatch = match.match(/id:\s*(\d+)/);
    const imageIdMatch = match.match(/imageId:\s*(\d+)/);
    
    if (idMatch) {
      const id = parseInt(idMatch[1]);
      const imageId = imageIdMatch ? parseInt(imageIdMatch[1]) : null;
      pets.push({ id, imageId });
    }
  });
  
  // 去重（基于id）
  const seen = new Set();
  return pets.filter(pet => {
    if (seen.has(pet.id)) return false;
    seen.add(pet.id);
    return true;
  });
}

// 获取已存在的图标
function getExistingIcons() {
  if (!fs.existsSync(ICONS_DIR)) return [];
  return fs.readdirSync(ICONS_DIR)
    .filter(file => file.endsWith('.png'))
    .map(file => parseInt(file.replace('.png', '')));
}

// 下载函数
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`  重定向到: ${redirectUrl}`);
        downloadImage(redirectUrl, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 主函数
async function main() {
  console.log('正在提取宠物数据...');
  const pets = extractPets();
  console.log(`共找到 ${pets.length} 个宠物`);
  
  const existingIcons = getExistingIcons();
  console.log(`已存在 ${existingIcons.length} 个图标`);
  
  // 找出缺失的图标
  const missingPets = pets.filter(pet => !existingIcons.includes(pet.id));
  console.log(`需要下载 ${missingPets.length} 个图标`);
  
  if (missingPets.length === 0) {
    console.log('所有图标已存在，无需下载');
    return;
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < missingPets.length; i++) {
    const pet = missingPets[i];
    // 优先使用 imageId，如果没有则使用 id
    const imageId = pet.imageId || pet.id;
    const formattedId = String(imageId).padStart(3, '0');
    const url = `https://res.17roco.qq.com/res/combat/icons/${formattedId}-.png`;
    const filepath = path.join(ICONS_DIR, `${pet.id}.png`);
    
    console.log(`[${i + 1}/${missingPets.length}] 下载宠物 ${pet.id}${pet.imageId ? ` (imageId: ${pet.imageId})` : ''}...`);
    
    try {
      await downloadImage(url, filepath);
      console.log(`  ✓ 成功`);
      successCount++;
      
      // 添加延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`  ✗ 失败: ${error.message}`);
      failCount++;
    }
  }
  
  console.log('\n========================');
  console.log(`下载完成: ${successCount} 成功, ${failCount} 失败`);
  console.log(`总计: ${existingIcons.length + successCount} / ${pets.length} 个图标`);
  console.log('========================');
  
  if (failCount > 0) {
    console.log('\n提示: 下载失败的宠物可能是测试宠物或使用了特殊的图片ID');
    console.log('这些宠物在网络加载失败时会显示默认占位图');
  }
}

main().catch(console.error);
