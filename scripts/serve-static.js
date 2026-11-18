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

// 未匹配到静态文件：返回 404.html，而不是伪装成 200 的首页
// 静态导出产物本身包含每个路由的 index.html，不需要 SPA 回退；
// 之前的 index.html 回退会让缺失的图片/资源也返回 200 HTML，掩盖真实 404。
app.use((req, res) => {
  const notFoundPath = path.join(STATIC_DIR, '404.html');
  res.status(404).sendFile(notFoundPath, (error) => {
    if (error) {
      res.status(404).type('text/plain').send('404 Not Found');
    }
  });
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
  console.log('   - 未匹配的路径返回 404.html（不再回退首页）');
});