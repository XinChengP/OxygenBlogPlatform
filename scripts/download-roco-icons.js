/**
 * 下载洛克王国宠物头像和血脉图标
 * 宠物头像: https://res.17roco.qq.com/res/combat/icons/{id}-.png
 * 血脉图标: https://res.17roco.qq.com/res/talent/{id}_small.png
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 创建目录
const publicDir = path.join(__dirname, '..', 'public');
const petIconsDir = path.join(publicDir, 'roco-icons', 'pets');
const talentIconsDir = path.join(publicDir, 'roco-icons', 'talents');

[petIconsDir, talentIconsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
});

// 下载文件函数
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`已存在: ${path.basename(dest)}`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`下载完成: ${path.basename(dest)}`);
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // 重定向
        const newUrl = response.headers.location;
        if (newUrl) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(newUrl, dest).then(resolve).catch(reject);
        } else {
          reject(new Error(`重定向但没有location: ${url}`));
        }
      } else {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`状态码 ${response.statusCode}: ${url}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

// 读取宠物数据
const rocoPetsPath = path.join(__dirname, '..', 'src', 'data', 'rocoPets.ts');
const rocoPetsContent = fs.readFileSync(rocoPetsPath, 'utf-8');

// 提取宠物ID列表
const petIds = [];
const petRegex = /id:\s*(\d+),\s*name:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = petRegex.exec(rocoPetsContent)) !== null) {
  petIds.push({
    id: parseInt(match[1]),
    name: match[2]
  });
}

// 提取血脉ID列表
const talentIds = [];
const talentRegex = /id:\s*(\d+),\s*name:\s*['"]([^'"]+)['"],\s*effect:/g;
while ((match = talentRegex.exec(rocoPetsContent)) !== null) {
  talentIds.push(parseInt(match[1]));
}

console.log(`找到 ${petIds.length} 个宠物`);
console.log(`找到 ${talentIds.length} 个血脉`);

// 下载宠物头像
async function downloadPetIcons() {
  console.log('\n开始下载宠物头像...');
  let success = 0;
  let failed = 0;

  for (const pet of petIds) {
    const formattedId = String(pet.id).padStart(3, '0');
    const url = `https://res.17roco.qq.com/res/combat/icons/${formattedId}-.png`;
    const dest = path.join(petIconsDir, `${pet.id}.png`);

    try {
      await downloadFile(url, dest);
      success++;
    } catch (err) {
      console.error(`下载失败: ${pet.name} (${pet.id}) - ${err.message}`);
      failed++;
    }

    // 延迟避免请求过快
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`宠物头像下载完成: 成功 ${success}, 失败 ${failed}`);
}

// 下载血脉图标
async function downloadTalentIcons() {
  console.log('\n开始下载血脉图标...');
  let success = 0;
  let failed = 0;

  // 去重
  const uniqueTalentIds = [...new Set(talentIds)];

  for (const talentId of uniqueTalentIds) {
    if (talentId === 0) continue; // 跳过0（不携带血脉）

    const url = `https://res.17roco.qq.com/res/talent/${talentId}_small.png`;
    const dest = path.join(talentIconsDir, `${talentId}.png`);

    try {
      await downloadFile(url, dest);
      success++;
    } catch (err) {
      console.error(`下载失败: 血脉 ${talentId} - ${err.message}`);
      failed++;
    }

    // 延迟避免请求过快
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`血脉图标下载完成: 成功 ${success}, 失败 ${failed}`);
}

// 主函数
async function main() {
  console.log('=== 洛克王国图标下载工具 ===\n');

  await downloadPetIcons();
  await downloadTalentIcons();

  console.log('\n=== 下载任务完成 ===');
  console.log(`宠物头像保存位置: ${petIconsDir}`);
  console.log(`血脉图标保存位置: ${talentIconsDir}`);
}

main().catch(console.error);
