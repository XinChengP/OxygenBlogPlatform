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
  console.log('Electron Dev Preview loaded')
  console.log('可用快捷键:')
  console.log('  F5 - 刷新页面')
  console.log('  Ctrl+Shift+R - 强制刷新')
  console.log('  Ctrl+Shift+N - 重启服务器')
  console.log('  Ctrl+Shift+B - 运行构建')
  console.log('  Alt+Home - 返回前台')
  console.log('  Alt+End - 进入后台')
  console.log('  Alt+1~8 - 常用页面跳转')
  console.log('  Ctrl+/ - 查看完整快捷键列表')
})
