# 代码类型显示测试

## JavaScript 代码块

```javascript
function hello() {
    console.log("Hello, World!");
    return "JavaScript 代码";
}
```

## TypeScript 代码块

```typescript
interface User {
    name: string;
    age: number;
}

const user: User = {
    name: "Test User",
    age: 25
};
```

## Python 代码块

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(f"斐波那契数列: {fibonacci(10)}")
```

## HTML 代码块

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>测试页面</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>
```

## CSS 代码块

```css
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}
```

## 无语言标识的代码块

```
这是一个没有语言标识的代码块
应该显示为"代码"
```

## 行内代码测试

这是一个行内代码示例：`const x = 42;`，应该显示为高亮的行内代码。