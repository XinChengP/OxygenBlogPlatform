const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')

// 禁用 Electron 安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 添加 Chromium 命令行参数，禁用 libpng sRGB 警告
app.commandLine.appendSwitch('disable-features', 'MediaRouter')
app.commandLine.appendSwitch('log-level', '3')

// 窗口引用
let mainWindow = null
// 开发服务器 URL
const DEV_SERVER_URL = 'http://localhost:3000'
const ADMIN_URL = 'http://localhost:3000/admin'

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Oxygen Blog - Dev Preview',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // 窗口样式
    frame: true,
    backgroundColor: '#1a1a2e',
    show: false // 先隐藏，加载完成后显示
  })

  // 加载开发服务器
  mainWindow.loadURL(DEV_SERVER_URL)

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 创建自定义菜单
  createMenu()

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * 创建自定义菜单栏
 */
function createMenu() {
  const template = [
    {
      label: '操作',
      submenu: [
        {
          label: '刷新',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.reload()
            }
          }
        },
        {
          label: '强制刷新',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache()
            }
          }
        },
        { type: 'separator' },
        {
          label: '重启服务器',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            restartDevServer()
          }
        }
      ]
    },
    {
      label: '导航',
      submenu: [
        {
          label: '返回前台（博客首页）',
          accelerator: 'Alt+Home',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(DEV_SERVER_URL)
            }
          }
        },
        {
          label: '进入后台（管理面板）',
          accelerator: 'Alt+Admin',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(ADMIN_URL)
            }
          }
        },
        { type: 'separator' },
        {
          label: '后退',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow && mainWindow.webContents.canGoBack()) {
              mainWindow.webContents.goBack()
            }
          }
        },
        {
          label: '前进',
          accelerator: 'Alt+Right',
          click: () => {
            if (mainWindow && mainWindow.webContents.canGoForward()) {
              mainWindow.webContents.goForward()
            }
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools()
            }
          }
        },
        { type: 'separator' },
        {
          label: '全屏',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen())
            }
          }
        },
        {
          label: '窗口置顶',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            if (mainWindow) {
              mainWindow.setAlwaysOnTop(menuItem.checked)
            }
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 Oxygen Blog Dev Preview',
              message: 'Oxygen Blog 开发预览工具',
              detail: '版本: 1.0.0\n用于本地开发环境的博客预览\n\n快捷键:\nF5 - 刷新页面\nCtrl+Shift+R - 强制刷新\nCtrl+Shift+N - 重启服务器\nAlt+Home - 返回前台（博客首页）\nAlt+Admin - 进入后台（管理面板）\nF11 - 全屏切换\nF12 - 开发者工具'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * 重启开发服务器
 * 通过 IPC 通知渲染进程
 */
async function restartDevServer() {
  if (!mainWindow) return

  const { dialog } = require('electron')
  
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['确认重启', '取消'],
    defaultId: 0,
    cancelId: 1,
    title: '重启开发服务器',
    message: '确定要重启开发服务器吗？',
    detail: '这将重新启动 Next.js 开发服务器，可能需要几秒钟时间。'
  })

  if (result.response === 0) {
    // 发送重启信号给渲染进程
    mainWindow.webContents.send('restart-server')
    
    // 显示加载提示
    mainWindow.loadURL(`data:text/html,
      <html>
        <head>
          <style>
            body {
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .container {
              text-align: center;
              color: #66ccff;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 3px solid #333;
              border-top-color: #66ccff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h2 { margin: 0 0 10px; }
            p { color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h2>正在重启服务器...</h2>
            <p>请稍候</p>
          </div>
        </body>
      </html>
    `)

    // 等待服务器重启后重新加载
    setTimeout(() => {
      checkServerAndReload()
    }, 3000)
  }
}

/**
 * 检查服务器状态并重新加载
 */
async function checkServerAndReload() {
  const http = require('http')
  
  const checkServer = () => {
    return new Promise((resolve) => {
      const req = http.get(DEV_SERVER_URL, (res) => {
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.setTimeout(2000, () => {
        req.destroy()
        resolve(false)
      })
    })
  }

  let attempts = 0
  const maxAttempts = 30

  const tryConnect = async () => {
    attempts++
    const isReady = await checkServer()
    
    if (isReady && mainWindow) {
      mainWindow.loadURL(DEV_SERVER_URL)
    } else if (attempts < maxAttempts && mainWindow) {
      setTimeout(tryConnect, 1000)
    } else if (mainWindow) {
      const { dialog } = require('electron')
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: '服务器重启失败',
        message: '无法连接到开发服务器',
        detail: '请检查服务器是否正常运行，或手动重启。'
      })
      mainWindow.loadURL(DEV_SERVER_URL)
    }
  }

  tryConnect()
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出（Windows/Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理
ipcMain.on('reload-page', () => {
  if (mainWindow) {
    mainWindow.reload()
  }
})

ipcMain.on('restart-server', () => {
  restartDevServer()
})

// 导航到前台
ipcMain.on('navigate-front', () => {
  if (mainWindow) {
    mainWindow.loadURL(DEV_SERVER_URL)
  }
})

// 导航到后台
ipcMain.on('navigate-admin', () => {
  if (mainWindow) {
    mainWindow.loadURL(ADMIN_URL)
  }
})
