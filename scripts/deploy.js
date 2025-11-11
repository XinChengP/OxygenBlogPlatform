const fs = require('fs');
const path = require('path');

console.log('🚀 准备GitHub Pages部署...');

// 检查out目录是否存在
const outDir = path.join(__dirname, '..', 'out');
if (!fs.existsSync(outDir)) {
    console.error('❌ out目录不存在，请先运行 npm run build');
    process.exit(1);
}

// 创建.github/workflows目录（如果不存在）
const workflowDir = path.join(__dirname, '..', '.github', 'workflows');
if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
    console.log('📁 创建.github/workflows目录');
}

// 检查并更新环境变量
const envFile = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envFile)) {
    const envContent = `# GitHub Pages部署配置
# 如果您的仓库名称不是 OxygenBlogPlatform，请修改为实际的仓库名
NEXT_PUBLIC_BASE_PATH=/OxygenBlogPlatform

# 开发环境配置
NODE_ENV=production
`;
    fs.writeFileSync(envFile, envContent);
    console.log('📝 创建 .env.local 环境配置文件');
    console.log('⚠️  请注意：NEXT_PUBLIC_BASE_PATH 变量已设置为 /OxygenBlogPlatform');
    console.log('   如果您的仓库名称不同，请修改为正确的仓库名');
} else {
    console.log('✅ .env.local 文件已存在');
}

console.log('✅ GitHub Pages部署准备完成！');
console.log('');
console.log('📋 部署步骤：');
console.log('1. 将代码推送到main分支');
console.log('2. 在GitHub仓库设置中启用GitHub Pages');
console.log('3. 选择 "GitHub Actions" 作为源');
console.log('4. GitHub Actions将自动部署');
console.log('');
console.log('🔧 重要提醒：');
console.log('- 确保您的仓库名称与 NEXT_PUBLIC_BASE_PATH 匹配');
console.log('- Live2D资源文件需要放在 public 目录下');
console.log('- 404.html页面已配置为静态404页面');