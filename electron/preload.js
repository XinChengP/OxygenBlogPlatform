const { contextBridge, ipcRenderer } = require('electron')

/**
 * 预加载脚本
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== 页面操作 ====================
  /**
   * 刷新页面
   */
  reload: () => ipcRenderer.send('reload-page'),

  /**
   * 重启服务器
   */
  restartServer: () => ipcRenderer.send('restart-server'),

  /**
   * 运行构建命令
   */
  runBuild: () => ipcRenderer.send('run-build'),

  // ==================== 导航功能 ====================
  /**
   * 导航到前台（博客首页）
   */
  navigateFront: () => ipcRenderer.send('navigate-front'),

  /**
   * 导航到后台（管理面板）
   */
  navigateAdmin: () => ipcRenderer.send('navigate-admin'),

  /**
   * 导航到404页面
   */
  navigate404: () => ipcRenderer.send('navigate-404'),

  /**
   * 导航到博客列表
   */
  navigateBlogs: () => ipcRenderer.send('navigate-blogs'),

  /**
   * 导航到归档
   */
  navigateArchive: () => ipcRenderer.send('navigate-archive'),

  /**
   * 导航到画廊
   */
  navigateGallery: () => ipcRenderer.send('navigate-gallery'),

  /**
   * 导航到动态
   */
  navigateMoments: () => ipcRenderer.send('navigate-moments'),

  /**
   * 导航到更新日志
   */
  navigateChangelogs: () => ipcRenderer.send('navigate-changelogs'),

  /**
   * 导航到留言板
   */
  navigateGuestbook: () => ipcRenderer.send('navigate-guestbook'),

  /**
   * 导航到工具页面
   */
  navigateTools: () => ipcRenderer.send('navigate-tools'),

  // ==================== 工具功能 ====================
  /**
   * 复制当前URL
   */
  copyCurrentUrl: () => ipcRenderer.send('copy-current-url'),

  /**
   * 在浏览器中打开
   */
  openInBrowser: () => ipcRenderer.send('open-in-browser'),

  /**
   * 页面截图
   */
  captureScreenshot: () => ipcRenderer.send('capture-screenshot'),

  /**
   * 显示性能信息
   */
  showPerformance: () => ipcRenderer.send('show-performance'),

  /**
   * 清除缓存
   */
  clearCache: () => ipcRenderer.send('clear-cache'),

  // ==================== 窗口功能 ====================
  /**
   * 重置窗口大小
   */
  resetWindowSize: () => ipcRenderer.send('reset-window-size'),

  /**
   * 创建新窗口
   */
  createNewWindow: () => ipcRenderer.send('create-new-window'),

  // ==================== 文件操作功能 ====================
  /**
   * 保存文件
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   */
  saveFile: (filePath, content) => ipcRenderer.send('save-file', filePath, content),

  /**
   * 在外部编辑器中打开文件
   * @param {string} filePath - 文件路径
   */
  openInExternal: (filePath) => ipcRenderer.send('open-in-external', filePath),

  /**
   * 打开本地文件夹
   * @param {string} folderPath - 文件夹路径（相对于 public）
   */
  openLocalFolder: (folderPath) => ipcRenderer.send('open-local-folder', folderPath),

  /**
   * 监听文件保存结果
   * @param {Function} callback - 回调函数，接收 {success, path, error} 参数
   */
  onFileSaved: (callback) => {
    ipcRenderer.on('file-saved', (event, result) => callback(result))
  },

  /**
   * 移除文件保存监听
   */
  removeFileSavedListener: () => {
    ipcRenderer.removeAllListeners('file-saved')
  },

  // ==================== 自定义导航功能 ====================
  /**
   * 添加自定义导航项
   * @param {string} name - 导航名称
   * @param {string} url - 导航URL
   */
  addCustomNavItem: (name, url) => ipcRenderer.send('add-custom-nav-item', name, url),

  // ==================== 事件监听 ====================
  /**
   * 监听服务器重启事件
   * @param {Function} callback - 回调函数
   */
  onRestartServer: (callback) => {
    ipcRenderer.on('restart-server', callback)
  },

  /**
   * 移除服务器重启监听
   */
  removeRestartServerListener: () => {
    ipcRenderer.removeAllListeners('restart-server')
  }
})

// 页面加载完成后的处理
window.addEventListener('DOMContentLoaded', () => {
  console.log('%c🚀 Electron Dev Preview 已加载', 'color: #66ccff; font-size: 16px; font-weight: bold;')
  console.log('%c新增功能:', 'color: #ff9966; font-weight: bold;')
  console.log('%c  ✓ 窗口状态记忆 - 自动保存窗口位置和大小', 'color: #66ff99;')
  console.log('%c  ✓ 自动更新检查 - 从 GitHub 检查新版本', 'color: #66ff99;')
  console.log('%c  ✓ 拖拽打开文件 - 支持 Markdown/JSON/TXT 文件', 'color: #66ff99;')
  console.log('%c  ✓ 自定义导航 - 添加常用网站快捷访问', 'color: #66ff99;')
  console.log('')
  console.log('%c可用快捷键:', 'color: #66ccff; font-weight: bold;')
  console.log('  F5 - 刷新页面')
  console.log('  Ctrl+Shift+R - 强制刷新')
  console.log('  Ctrl+Shift+N - 重启服务器')
  console.log('  Ctrl+Shift+B - 运行构建')
  console.log('  Alt+Home - 返回前台')
  console.log('  Alt+End - 进入后台')
  console.log('  Alt+1~8 - 常用页面跳转')
  console.log('  Ctrl+/ - 查看完整快捷键列表')
  console.log('')
  console.log('%c提示: 你可以直接拖拽 Markdown/JSON/TXT 文件到窗口中打开', 'color: #ffcc00;')
  console.log('%c提示: 使用 导航 → 自定义导航 添加常用网站', 'color: #ffcc00;')
})
