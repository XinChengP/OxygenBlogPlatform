# 主题切换测试

## 代码块测试

### JavaScript示例
```javascript
function testTheme() {
  console.log("测试主题切换");
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? '深色模式' : '浅色模式';
}
```

### CSS示例
```css
.code-block {
  background-color: var(--code-bg);
  border-color: var(--code-border);
  transition: all 0.2s ease-in-out;
}
```

## 行内代码测试
这是一个行内代码示例：`const message = "Hello World";`

## 其他元素测试
**粗体文本** 和 *斜体文本* 也应该正确显示。