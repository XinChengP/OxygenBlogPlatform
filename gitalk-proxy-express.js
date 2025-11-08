const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// 启用 CORS
app.use(cors());

// 代理 GitHub OAuth API
app.use('/github/oauth', createProxyMiddleware({
  target: 'https://github.com',
  changeOrigin: true,
  pathRewrite: {
    '^/github/oauth': '/login/oauth/access_token'
  },
  onProxyReq: (proxyReq, req, res) => {
    // 设置请求头
    proxyReq.setHeader('Accept', 'application/json');
    proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
  },
  onProxyRes: (proxyRes, req, res) => {
    // 设置响应头
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }
}));

const PORT = 9099;
app.listen(PORT, () => {
  console.log(`Gitalk 代理服务器已启动，监听端口 ${PORT}`);
  console.log(`代理地址: http://localhost:${PORT}/github/oauth`);
});