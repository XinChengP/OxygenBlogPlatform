# 🎵 音乐播放器歌词默认隐藏功能

## 功能概述
音乐播放器现在支持歌词默认隐藏功能，用户可以通过多种方式控制歌词的显示和隐藏状态。

## 实现细节

### 1. 默认隐藏逻辑
在 `MusicPlayer.tsx` 中，播放器初始化后会自动隐藏歌词：

```typescript
// 默认隐藏歌词 - 使用更可靠的方法
setTimeout(() => {
  if (ap.lrc) {
    ap.lrc.hide();
    // 确保歌词元素被正确隐藏
    const lrcElement = document.querySelector('.aplayer-lrc');
    if (lrcElement) {
      lrcElement.classList.add('aplayer-lrc-hide');
      lrcElement.classList.remove('aplayer-lrc-show');
    }
  }
}, 100);
```

### 2. CSS样式控制
在 `aplayer-theme.css` 中添加了专门的样式类：

```css
/* 歌词显示控制 */
.aplayer-lrc.aplayer-lrc-hide {
  display: none !important;
}

/* 默认隐藏歌词 */
.aplayer .aplayer-lrc {
  display: none;
}

/* 当需要显示歌词时 */
.aplayer .aplayer-lrc.aplayer-lrc-show {
  display: block;
}
```

### 3. 全局管理器方法
`globalMusicPlayerManager.ts` 提供了完整的歌词控制API：

```typescript
// 显示歌词
showLyrics() {
  if (this.player && this.player.lrc) {
    this.player.lrc.show();
    // 同时更新CSS类
    const lrcElement = document.querySelector('.aplayer-lrc');
    if (lrcElement) {
      lrcElement.classList.remove('aplayer-lrc-hide');
      lrcElement.classList.add('aplayer-lrc-show');
    }
  }
}

// 隐藏歌词
hideLyrics() {
  if (this.player && this.player.lrc) {
    this.player.lrc.hide();
    // 同时更新CSS类
    const lrcElement = document.querySelector('.aplayer-lrc');
    if (lrcElement) {
      lrcElement.classList.add('aplayer-lrc-hide');
      lrcElement.classList.remove('aplayer-lrc-show');
    }
  }
}

// 切换歌词显示状态
toggleLyrics() {
  if (this.player && this.player.lrc) {
    this.player.lrc.toggle();
    // 同时更新CSS类
    const lrcElement = document.querySelector('.aplayer-lrc');
    if (lrcElement) {
      if (lrcElement.classList.contains('aplayer-lrc-hide')) {
        lrcElement.classList.remove('aplayer-lrc-hide');
        lrcElement.classList.add('aplayer-lrc-show');
      } else {
        lrcElement.classList.add('aplayer-lrc-hide');
        lrcElement.classList.remove('aplayer-lrc-show');
      }
    }
  }
}

// 获取歌词当前显示状态
isLyricsVisible(): boolean {
  if (this.player && this.player.lrc) {
    const lrcElement = document.querySelector('.aplayer-lrc');
    if (lrcElement) {
      return !lrcElement.classList.contains('aplayer-lrc-hide') && 
             lrcElement.classList.contains('aplayer-lrc-show');
    }
  }
  return false;
}
```

## 使用方法

### 1. 通过全局管理器控制
```javascript
// 显示歌词
window.globalMusicPlayerManager.showLyrics();

// 隐藏歌词
window.globalMusicPlayerManager.hideLyrics();

// 切换歌词显示状态
window.globalMusicPlayerManager.toggleLyrics();

// 检查歌词是否可见
const isVisible = window.globalMusicPlayerManager.isLyricsVisible();
```

### 2. 直接通过APlayer实例控制
```javascript
// 显示歌词
window.globalAPlayer.lrc.show();

// 隐藏歌词
window.globalAPlayer.lrc.hide();

// 切换歌词显示状态
window.globalAPlayer.lrc.toggle();
```

### 3. 通过用户界面控制
可以在播放器的控制栏中添加歌词显示/隐藏按钮，绑定上述方法。

## 测试验证

### 测试页面
创建了 `test_lyrics_visibility.html` 测试页面，可以验证：
- 歌词默认隐藏状态
- 显示/隐藏/切换功能
- 播放器初始化状态
- 歌词元素DOM状态

### 预期行为
1. 页面加载后，歌词自动隐藏
2. 可以通过API控制歌词显示状态
3. 状态切换时CSS类正确更新
4. 歌词可见性状态准确返回

## 浏览器兼容性
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ 移动端浏览器

## 注意事项
1. 歌词隐藏功能依赖于APlayer的lrc组件
2. 需要等待播放器完全初始化后才能控制歌词
3. CSS样式优先级确保隐藏状态可靠
4. 全局管理器方法提供了更完整的控制功能

## 未来改进
- 添加用户偏好设置，记住歌词显示状态
- 支持键盘快捷键控制歌词显示
- 添加歌词显示状态的视觉指示器
- 支持更多歌词样式自定义选项