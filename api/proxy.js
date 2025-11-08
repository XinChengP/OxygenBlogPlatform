// Vercel 无服务器函数代理
// 保存为 api/proxy.js

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: '缺少路径参数' });
    }
    
    // 构建目标 URL
    const targetUrl = path.startsWith('http') ? path : `https://github.com${path}`;
    
    console.log(`代理请求: ${req.method} ${targetUrl}`);
    
    // 获取请求体
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined;
    
    // 发送代理请求
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Gitalk-Proxy',
        ...req.headers,
        // 移除可能导致问题的头
        host: undefined,
        'content-length': undefined,
        'accept-encoding': undefined,
      },
      body,
    });
    
    // 获取响应数据
    const data = await response.text();
    
    // 设置响应头
    Object.entries(response.headers).forEach(([key, value]) => {
      // 跳过一些可能导致问题的头
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    // 返回响应
    return res.status(response.status).send(data);
  } catch (error) {
    console.error('代理错误:', error);
    return res.status(500).json({ error: '代理服务器错误' });
  }
}