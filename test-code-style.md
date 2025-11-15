# 代码显示风格测试

## JavaScript 代码块测试

```javascript
// 现代异步编程示例
class DataFetcher {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.cache = new Map();
  }

  async fetchUserData(userId) {
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }

    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.cache.set(userId, data);
      return data;
    } catch (error) {
      console.error('获取用户数据失败:', error);
      throw error;
    }
  }
}
```

## Python 代码块测试

```python
def fibonacci(n):
    """生成斐波那契数列"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib_sequence = [0, 1]
    for i in range(2, n):
        fib_sequence.append(fib_sequence[-1] + fib_sequence[-2])
    
    return fib_sequence

# 使用示例
print(fibonacci(10))
```

## CSS 代码块测试

```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  max-width: 400px;
  width: 100%;
}
```

## 行内代码测试

这是一个包含`console.log()`函数调用的JavaScript代码示例，以及`background-color` CSS属性的演示。

## HTML 代码块测试

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>示例页面</title>
</head>
<body>
    <header>
        <h1>欢迎来到我的网站</h1>
    </header>
    <main>
        <p>这是一个示例段落。</p>
    </main>
</body>
</html>
```