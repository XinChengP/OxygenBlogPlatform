const { contextBridge, ipcRenderer } = require('electron')

/**
 * 预加载脚本
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 刷新页面
   */
  reload: () => ipcRenderer.send('reload-page'),

  /**
   * 重启服务器
   */
  restartServer: () => ipcRenderer.send('restart-server'),

  /**
   * 导航到前台（博客首页）
   */
  navigateFront: () => ipcRenderer.send('navigate-front'),

  /**
   * 导航到后台（管理面板）
   */
  navigateAdmin: () => ipcRenderer.send('navigate-admin'),

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
})
