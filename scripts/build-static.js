/**
 * 静态导出构建脚本
 * 在构建前将 actions 文件替换为静态导出版本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const actionsDir = path.join(__dirname, '..', 'src', 'actions');
const backupDir = path.join(__dirname, '..', '.backup', 'actions');

// 需要替换的文件
const filesToReplace = [
  'todoActions.ts',
  'settingsActions.ts',
  'githubActions.ts',
  'backupActions.ts',
  'momentActions.ts',
  'galleryActions.ts',
  'blogActions.ts',
];

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 备份原始文件
console.log('备份原始 actions 文件...');
filesToReplace.forEach(file => {
  const srcPath = path.join(actionsDir, file);
  const backupPath = path.join(backupDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, backupPath);
  }
});

// 读取静态实现文件
const staticImpl = fs.readFileSync(path.join(actionsDir, 'index.static.ts'), 'utf-8');

// 替换为静态实现
console.log('替换为静态导出版本...');
filesToReplace.forEach(file => {
  const filePath = path.join(actionsDir, file);
  fs.writeFileSync(filePath, staticImpl);
});

// 运行构建
try {
  console.log('开始构建...');
  
  // 先运行 sync-theme
  execSync('npm run sync-theme', {
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: 'true', NEXT_PRIVATE_STATIC_EXPORT: 'true' },
  });
  
  // 再运行 next build
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: 'true', NEXT_PRIVATE_STATIC_EXPORT: 'true' },
  });
  
  console.log('构建成功！');
} catch (error) {
  console.error('构建失败:', error);
  process.exit(1);
} finally {
  // 恢复原始文件
  console.log('恢复原始 actions 文件...');
  filesToReplace.forEach(file => {
    const srcPath = path.join(actionsDir, file);
    const backupPath = path.join(backupDir, file);
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, srcPath);
    }
  });
}
