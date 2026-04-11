/**
 * Electron 离线安装脚本
 * 用于手动下载和安装 Electron 34+ 版本
 * 
 * 使用步骤：
 * 1. 访问 https://github.com/electron/electron/releases/tag/v34.0.0
 * 2. 下载对应系统的文件：
 *    - Windows: electron-v34.0.0-win32-x64.zip
 * 3. 将下载的文件放到本项目的 electron-offline 目录
 * 4. 运行此脚本：node scripts/install-electron-offline.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ELECTRON_VERSION = '34.0.0';
const OFFLINE_DIR = path.join(__dirname, '..', 'electron-offline');

// 检测操作系统和架构
function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  
  if (platform === 'win32') {
    return `win32-${arch === 'x64' ? 'x64' : 'ia32'}`;
  } else if (platform === 'darwin') {
    return `darwin-${arch === 'arm64' ? 'arm64' : 'x64'}`;
  } else {
    return `linux-${arch === 'x64' ? 'x64' : 'arm64'}`;
  }
}

// 获取文件名
function getFilename() {
  const platform = getPlatform();
  return `electron-v${ELECTRON_VERSION}-${platform}.zip`;
}

// 主函数
function main() {
  console.log('========================================');
  console.log('  Electron 离线安装助手');
  console.log('========================================\n');
  
  const filename = getFilename();
  const filepath = path.join(OFFLINE_DIR, filename);
  
  console.log(`目标版本: Electron ${ELECTRON_VERSION}`);
  console.log(`系统平台: ${getPlatform()}`);
  console.log(`期望文件: ${filename}\n`);
  
  // 检查离线目录是否存在
  if (!fs.existsSync(OFFLINE_DIR)) {
    fs.mkdirSync(OFFLINE_DIR, { recursive: true });
    console.log(`✓ 创建目录: ${OFFLINE_DIR}\n`);
  }
  
  // 检查文件是否存在
  if (!fs.existsSync(filepath)) {
    console.log('❌ 未找到 Electron 离线安装包\n');
    console.log('请按以下步骤操作：\n');
    console.log('1. 访问下载页面：');
    console.log(`   https://github.com/electron/electron/releases/tag/v${ELECTRON_VERSION}\n`);
    console.log('2. 下载对应文件：');
    console.log(`   ${filename}\n`);
    console.log('3. 将文件放到以下目录：');
    console.log(`   ${OFFLINE_DIR}\n`);
    console.log('4. 重新运行此脚本\n');
    
    // 尝试打开浏览器
    try {
      const url = `https://github.com/electron/electron/releases/tag/v${ELECTRON_VERSION}`;
      if (process.platform === 'win32') {
        execSync(`start "" "${url}"`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`open "${url}"`, { stdio: 'ignore' });
      } else {
        execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
      }
      console.log('✓ 已尝试在浏览器中打开下载页面\n');
    } catch {
      // 忽略错误
    }
    
    process.exit(1);
  }
  
  console.log('✓ 找到离线安装包\n');
  console.log('开始安装...\n');
  
  try {
    // 设置环境变量使用离线安装包
    process.env.ELECTRON_SKIP_BINARY_DOWNLOAD = '1';
    process.env.ELECTRON_OFFLINE_MIRROR = OFFLINE_DIR;
    
    // 运行 npm install
    console.log('运行 npm install electron@34.0.0...\n');
    execSync('npm install electron@34.0.0 --save-dev --force', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('\n========================================');
    console.log('  ✓ Electron 安装成功！');
    console.log('========================================\n');
    console.log('现在可以运行以下命令启动 Electron：');
    console.log('  npm run electron');
    console.log('  或');
    console.log('  npm run electron:dev\n');
    
  } catch (error) {
    console.error('\n❌ 安装失败\n');
    console.error('错误信息:', error.message);
    console.error('\n请尝试手动安装：');
    console.error('1. 删除 node_modules/electron 目录');
    console.error('2. 重新运行此脚本\n');
    process.exit(1);
  }
}

main();
