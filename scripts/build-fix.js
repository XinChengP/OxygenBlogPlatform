const fs = require('fs');
const path = require('path');

// 构建修复脚本：在构建前重命名API路由文件，构建后恢复
const apiRoutesDir = path.join(__dirname, '..', 'src', 'app', 'api');
const publicDir = path.join(__dirname, '..', 'public');
const outDir = path.join(__dirname, '..', 'out');

function renameApiRoutes() {
  if (!fs.existsSync(apiRoutesDir)) {
    console.log('API routes directory does not exist, skipping...');
    return;
  }
  
  const items = fs.readdirSync(apiRoutesDir);
  
  for (const item of items) {
    const itemPath = path.join(apiRoutesDir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      const routeFile = path.join(itemPath, 'route.ts');
      const backupFile = path.join(itemPath, 'route.ts.bak');
      
      if (fs.existsSync(routeFile)) {
        fs.renameSync(routeFile, backupFile);
        console.log(`Renamed ${routeFile} to ${backupFile}`);
      }
    }
  }
}

function restoreApiRoutes() {
  if (!fs.existsSync(apiRoutesDir)) {
    console.log('API routes directory does not exist, skipping...');
    return;
  }
  
  const items = fs.readdirSync(apiRoutesDir);
  
  for (const item of items) {
    const itemPath = path.join(apiRoutesDir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      const routeFile = path.join(itemPath, 'route.ts');
      const backupFile = path.join(itemPath, 'route.ts.bak');
      
      if (fs.existsSync(backupFile)) {
        if (fs.existsSync(routeFile)) {
          fs.unlinkSync(routeFile);
        }
        fs.renameSync(backupFile, routeFile);
        console.log(`Restored ${backupFile} to ${routeFile}`);
      }
    }
  }
}

// 复制音乐文件到out目录
function copyMusicFiles() {
  const musicSourceDir = path.join(publicDir, 'MusicList');
  const musicTargetDir = path.join(outDir, 'MusicList');
  
  if (!fs.existsSync(musicSourceDir)) {
    console.log('MusicList directory does not exist in public folder, skipping...');
    return;
  }
  
  if (!fs.existsSync(outDir)) {
    console.log('Out directory does not exist, skipping music file copy...');
    return;
  }
  
  // 确保目标目录存在
  if (!fs.existsSync(musicTargetDir)) {
    fs.mkdirSync(musicTargetDir, { recursive: true });
  }
  
  // 复制MusicList目录及其内容
  copyDirectory(musicSourceDir, musicTargetDir);
  console.log('Music files copied to out directory');
}

// 递归复制目录
function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${sourcePath} to ${targetPath}`);
    }
  }
}

// 根据命令行参数执行相应操作
const action = process.argv[2];

if (action === 'rename') {
  renameApiRoutes();
} else if (action === 'restore') {
  restoreApiRoutes();
  // 在恢复API路由后复制音乐文件
  copyMusicFiles();
} else {
  console.log('Usage: node build-fix.js [rename|restore]');
  console.log('  rename  - Rename API route files before build');
  console.log('  restore - Restore API route files after build');
  console.log('           (also copies music files to out directory)');
}