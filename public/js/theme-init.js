(function() {
  try {
    var theme = localStorage.getItem('theme') || 'system';
    var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var resolvedTheme = theme === 'system' ? systemTheme : theme;

    // 职责仅此一件：首帧同步 dark 类，避免主题闪烁。
    // 界面配色由 globals.css 的 :root/.dark CSS 令牌承载，
    // 不在此重算/内联任何颜色变量（旧版亮度重算会偏离手调色板）。
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
