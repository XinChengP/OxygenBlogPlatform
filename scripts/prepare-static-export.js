/**
 * 静态导出准备脚本
 * 在静态导出构建前，将包含 'use server' 的 actions 文件替换为空实现
 */

const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, '..', 'src', 'actions');
const staticImplFile = path.join(actionsDir, 'index.static.ts');

// 需要替换的文件列表
const filesToReplace = [
  'momentActions.ts',
  'todoActions.ts',
  'backupActions.ts',
  'galleryActions.ts',
  'githubActions.ts',
  'settingsActions.ts',
  'blogActions.ts',
];

// 需要替换的子目录文件列表
const subDirFilesToReplace = [
  'src/app/admin/changelogs/changelogActions.ts',
];

// 备份文件后缀
const backupSuffix = '.bak';

function prepareStaticExport() {
  console.log('准备静态导出：替换 actions 文件...');

  // 读取静态实现文件内容
  const staticContent = fs.readFileSync(staticImplFile, 'utf-8');

  // 替换 actions 目录下的文件
  for (const file of filesToReplace) {
    const filePath = path.join(actionsDir, file);
    const backupPath = filePath + backupSuffix;

    if (fs.existsSync(filePath)) {
      // 备份原文件
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`  已备份: ${file}`);
      }

      // 替换为静态实现
      fs.writeFileSync(filePath, staticContent, 'utf-8');
      console.log(`  已替换: ${file}`);
    }
  }

  // 替换子目录下的文件
  const projectRoot = path.join(__dirname, '..');
  for (const file of subDirFilesToReplace) {
    const filePath = path.join(projectRoot, file);
    const backupPath = filePath + backupSuffix;

    if (fs.existsSync(filePath)) {
      // 备份原文件
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`  已备份: ${file}`);
      }

      // 替换为静态实现
      fs.writeFileSync(filePath, staticContent, 'utf-8');
      console.log(`  已替换: ${file}`);
    }
  }

  console.log('静态导出准备完成！');
}

function restoreOriginalFiles() {
  console.log('恢复原始 actions 文件...');

  // 恢复 actions 目录下的文件
  for (const file of filesToReplace) {
    const filePath = path.join(actionsDir, file);
    const backupPath = filePath + backupSuffix;

    if (fs.existsSync(backupPath)) {
      // 恢复备份
      fs.copyFileSync(backupPath, filePath);
      console.log(`  已恢复: ${file}`);

      // 删除备份
      fs.unlinkSync(backupPath);
    }
  }

  // 恢复子目录下的文件
  const projectRoot = path.join(__dirname, '..');
  for (const file of subDirFilesToReplace) {
    const filePath = path.join(projectRoot, file);
    const backupPath = filePath + backupSuffix;

    if (fs.existsSync(backupPath)) {
      // 恢复备份
      fs.copyFileSync(backupPath, filePath);
      console.log(`  已恢复: ${file}`);

      // 删除备份
      fs.unlinkSync(backupPath);
    }
  }

  console.log('原始文件恢复完成！');
}

// 根据命令行参数执行不同操作
const command = process.argv[2];

if (command === 'prepare') {
  prepareStaticExport();
} else if (command === 'restore') {
  restoreOriginalFiles();
} else {
  console.log('用法: node prepare-static-export.js [prepare|restore]');
  process.exit(1);
}
