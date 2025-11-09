const fs = require('fs');
const path = require('path');

// 构建修复脚本：在构建前重命名API路由文件，构建后恢复
const apiRoutesDir = path.join(__dirname, '..', 'src', 'app', 'api');

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

// 根据命令行参数执行相应操作
const action = process.argv[2];

if (action === 'rename') {
  renameApiRoutes();
} else if (action === 'restore') {
  restoreApiRoutes();
} else {
  console.log('Usage: node build-fix.js [rename|restore]');
  console.log('  rename  - Rename API route files before build');
  console.log('  restore - Restore API route files after build');
}