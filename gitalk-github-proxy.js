// GitHub Pages 代理服务器
// 使用 GitHub Actions 部署到 GitHub Pages

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用 CORS
app.use(cors());

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// GitHub OAuth 代理
app.use('/github/oauth', createProxyMiddleware({
  target: 'https://github.com',
  changeOrigin: true,
  pathRewrite: {
    '^/github/oauth': '/login/oauth/access_token',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('代理请求到 GitHub:', proxyReq.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('GitHub 响应状态:', proxyRes.statusCode);
  },
  onError: (err, req, res) => {
    console.error('代理错误:', err);
    res.status(500).json({ error: '代理服务器错误' });
  }
}));

// GitHub API 代理
app.use('/github/api', createProxyMiddleware({
  target: 'https://api.github.com',
  changeOrigin: true,
  pathRewrite: {
    '^/github/api': '',
  },
  headers: {
    'User-Agent': 'Gitalk-Proxy'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('代理 API 请求到 GitHub:', proxyReq.path);
  },
  onError: (err, req, res) => {
    console.error('API 代理错误:', err);
    res.status(500).json({ error: 'API 代理服务器错误' });
  }
}));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 默认路由
app.get('/', (req, res) => {
  res.json({
    message: 'Gitalk 代理服务器',
    endpoints: {
      'GitHub OAuth': '/github/oauth',
      'GitHub API': '/github/api',
      'Health Check': '/health'
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Gitalk 代理服务器已启动，监听端口 ${PORT}`);
  console.log(`GitHub OAuth 代理: http://localhost:${PORT}/github/oauth`);
  console.log(`GitHub API 代理: http://localhost:${PORT}/github/api`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
});