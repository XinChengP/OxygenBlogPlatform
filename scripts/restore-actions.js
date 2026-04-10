/**
 * 恢复原始 Actions 脚本
 * 在静态导出构建后，恢复原始的 Server Actions 文件
 */

const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, '..', 'src', 'actions');
const backupDir = path.join(__dirname, '..', '.backup', 'actions');

console.log('🔄 恢复原始 Actions 文件...');

// 检查备份目录是否存在
if (!fs.existsSync(backupDir)) {
  console.log('⚠️ 未找到备份目录，跳过恢复');
  process.exit(0);
}

// 恢复备份文件
const actionFiles = [
  'blogActions.ts',
  'momentActions.ts',
  'galleryActions.ts',
  'settingsActions.ts',
  'backupActions.ts'
];

let restoredCount = 0;

actionFiles.forEach(file => {
  const backupPath = path.join(backupDir, file);
  const destPath = path.join(actionsDir, file);
  
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, destPath);
    fs.unlinkSync(backupPath);
    console.log(`✅ 已恢复: ${file}`);
    restoredCount++;
  }
});

// 如果备份目录为空，删除它
const remainingFiles = fs.readdirSync(backupDir);
if (remainingFiles.length === 0) {
  fs.rmdirSync(backupDir);
  // 尝试删除父目录 .backup（如果为空）
  const parentBackupDir = path.dirname(backupDir);
  try {
    fs.rmdirSync(parentBackupDir);
    console.log('🗑️ 已清理备份目录');
  } catch {
    // 目录不为空，忽略错误
  }
}

console.log(`✨ 恢复完成，共恢复 ${restoredCount} 个文件`);
