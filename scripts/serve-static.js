#!/usr/bin/env node

const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.resolve(__dirname, '../out');

// 启用压缩
app.use(compression());

// GitHub Pages 代理 - 处理 /OxygenBlogPlatform/ 路径
app.use('/OxygenBlogPlatform', express.static(STATIC_DIR, {
  setHeaders: (res, filePath) => {
    // 为静态资源设置缓存头
    if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// 直接访问静态文件（开发时的备用方案）
app.use(express.static(STATIC_DIR, {
  setHeaders: (res, filePath) => {
    // 为静态资源设置缓存头
    if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// 为所有其他请求返回 index.html（处理 SPA 路由）
app.use((req, res) => {
  const indexPath = path.join(STATIC_DIR, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`🚀 静态网站服务器启动成功！`);
  console.log(`   📍 本地地址: http://localhost:${PORT}`);
  console.log(`   🌐 GitHub Pages: http://localhost:${PORT}/OxygenBlogPlatform/`);
  console.log(`   📁 静态目录: ${STATIC_DIR}`);
  console.log('');
  console.log('📖 使用说明:');
  console.log(`   - 直接访问 http://localhost:${PORT} 查看首页`);
  console.log(`   - 访问 http://localhost:${PORT}/OxygenBlogPlatform/ 查看GitHub Pages版本`);
  console.log('   - 所有路由都已配置SPA支持');
});