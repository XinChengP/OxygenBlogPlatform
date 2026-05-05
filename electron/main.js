const { app, BrowserWindow, Menu, ipcMain, dialog, shell, clipboard, Tray, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { exec } = require('child_process')

// 禁用 Electron 安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 添加 Chromium 命令行参数，禁用 libpng sRGB 警告
app.commandLine.appendSwitch('disable-features', 'MediaRouter')
app.commandLine.appendSwitch('log-level', '3')

// ==================== 全局变量 ====================
// 窗口引用
let mainWindow = null
// 托盘图标引用
let tray = null
// 子窗口数组
let childWindows = []

// ==================== URL 配置 ====================
const DEV_SERVER_URL = 'http://localhost:3000'
const ADMIN_URL = 'http://localhost:3000/admin'
const NOT_FOUND_URL = 'http://localhost:3000/404'
const BLOGS_URL = 'http://localhost:3000/blogs'
const ARCHIVE_URL = 'http://localhost:3000/archive'
const GALLERY_URL = 'http://localhost:3000/gallery'
const MOMENTS_URL = 'http://localhost:3000/moments'
const CHANGELOGS_URL = 'http://localhost:3000/changelogs'
const GUESTBOOK_URL = 'http://localhost:3000/guestbook'
const TOOLS_URL = 'http://localhost:3000/tools'

// 项目路径
const PROJECT_ROOT = path.join(__dirname, '..')

// ==================== 窗口创建 ====================
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
      preload: path.join(__dirname, 'preload.js'),
      // 启用开发者工具扩展
      devTools: true
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

  // 创建托盘图标
  createTray()

  // 监听控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // 可以在这里处理控制台日志
    const levels = ['debug', 'info', 'warning', 'error']
    console.log(`[${levels[level] || 'log'}] ${message}`)
  })

  // 窗口关闭时处理
  mainWindow.on('close', (event) => {
    // 如果启用了最小化到托盘，则不退出
    if (app.isQuiting === false && tray) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null
    // 关闭所有子窗口
    childWindows.forEach(win => {
      if (!win.isDestroyed()) {
        win.close()
      }
    })
    childWindows = []
  })
}

/**
 * 创建子窗口
 */
function createChildWindow(url, title = 'Oxygen Blog Preview') {
  const childWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    title: title,
    icon: path.join(__dirname, '../public/favicon.ico'),
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a2e'
  })

  childWindow.loadURL(url)

  childWindow.on('closed', () => {
    // 从数组中移除
    const index = childWindows.indexOf(childWindow)
    if (index > -1) {
      childWindows.splice(index, 1)
    }
  })

  childWindows.push(childWindow)
  return childWindow
}

// ==================== 托盘图标 ====================
/**
 * 创建托盘图标
 */
function createTray() {
  // 使用 favicon 作为托盘图标
  const iconPath = path.join(__dirname, '../public/favicon.ico')
  
  // 如果图标不存在，则不创建托盘
  if (!fs.existsSync(iconPath)) {
    console.log('托盘图标不存在，跳过创建托盘')
    return
  }

  tray = new Tray(iconPath)
  tray.setToolTip('Oxygen Blog Dev Preview')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '隐藏窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.hide()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // 点击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

// ==================== 菜单创建 ====================
/**
 * 创建自定义菜单栏
 */
function createMenu() {
  const template = [
    // ==================== 操作菜单 ====================
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
        },
        {
          label: '运行构建',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => {
            runBuildCommand()
          }
        }
      ]
    },
    // ==================== 导航菜单 ====================
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
          accelerator: 'Alt+End',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(ADMIN_URL)
            }
          }
        },
        { type: 'separator' },
        {
          label: '常用页面',
          submenu: [
            {
              label: '博客列表',
              accelerator: 'Alt+1',
              click: () => {
                if (mainWindow) {
                  mainWindow.loadURL(BLOGS_URL)
                }
              }
            },
            {
              label: '归档',
              accelerator: 'Alt+2',
              click: () => {
                if (mainWindow) {
                  mainWindow.loadURL(ARCHIVE_URL)
                }
              }
            },
            {
              label: '画廊',
              accelerator: 'Alt+3',
              click: () => {
                if (mainWindow) {
                  mainWindow.loadURL(GALLERY_URL)
                }
              }
            },
            {
              label: '动态',
              accelerator: 'Alt+5',
              click: () => {
                if (mainWindow) {
                  mainWindow.loadURL(MOMENTS_URL)
                }
              }
            },
            {
              label: '更新日志',
              accelerator: 'Alt+6',
              click: () => {
                if (mainWindow) {
                  mainWindow.loadURL(CHANGELOGS_URL)
                }
              }
            },
            {
              label: '留言板',
              accelerator: 'Alt+7',
              click: () => {
                if (mainWindow) {
                  mainWindow.loadURL(GUESTBOOK_URL)
                }
              }
            },
            {
              label: '工具页面',
              accelerator: 'Alt+8',
              click: () => {
                if (mainWindow) {
                  mainWindow.loadURL(TOOLS_URL)
                }
              }
            }
          ]
        },
        {
          label: '跳转404页面',
          accelerator: 'Alt+4',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(NOT_FOUND_URL)
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
    // ==================== 视图菜单 ====================
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
        {
          label: '控制台日志',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            showConsoleWindow()
          }
        },
        { type: 'separator' },
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel()
              mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
            }
          }
        },
        {
          label: '缩小',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel()
              mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
            }
          }
        },
        {
          label: '重置缩放',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0)
            }
          }
        },
        { type: 'separator' },
        {
          label: '深色模式',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            toggleDarkMode(menuItem.checked)
          }
        },
        {
          label: '浅色模式',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            toggleLightMode(menuItem.checked)
          }
        },
        { type: 'separator' },
        {
          label: '全屏',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              const isFullScreen = mainWindow.isFullScreen()
              mainWindow.setFullScreen(!isFullScreen)
            }
          }
        },
        {
          label: '退出全屏',
          accelerator: 'Esc',
          visible: false,
          click: () => {
            if (mainWindow && mainWindow.isFullScreen()) {
              mainWindow.setFullScreen(false)
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
    // ==================== 窗口菜单 ====================
    {
      label: '窗口',
      submenu: [
        {
          label: '重置窗口大小',
          accelerator: 'CmdOrCtrl+Shift+0',
          click: () => {
            if (mainWindow) {
              mainWindow.setSize(1400, 900)
              mainWindow.center()
            }
          }
        },
        {
          label: '最小化到托盘',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow) {
              mainWindow.hide()
            }
          }
        },
        { type: 'separator' },
        {
          label: '打开新窗口',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            createChildWindow(DEV_SERVER_URL, 'Oxygen Blog - 新窗口')
          }
        },
        {
          label: '复制当前窗口',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            if (mainWindow) {
              const currentUrl = mainWindow.webContents.getURL()
              createChildWindow(currentUrl, 'Oxygen Blog - 副本')
            }
          }
        }
      ]
    },
    // ==================== 工具菜单 ====================
    {
      label: '工具',
      submenu: [
        {
          label: '复制当前URL',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => {
            if (mainWindow) {
              const currentUrl = mainWindow.webContents.getURL()
              clipboard.writeText(currentUrl)
              showNotification('URL已复制', currentUrl)
            }
          }
        },
        {
          label: '在浏览器中打开',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            if (mainWindow) {
              const currentUrl = mainWindow.webContents.getURL()
              shell.openExternal(currentUrl)
            }
          }
        },
        { type: 'separator' },
        {
          label: '页面截图',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            capturePageScreenshot()
          }
        },
        {
          label: '性能监控',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            showPerformanceInfo()
          }
        },
        { type: 'separator' },
        {
          label: '清除缓存',
          accelerator: 'CmdOrCtrl+Shift+Delete',
          click: () => {
            clearBrowserCache()
          }
        },
        {
          label: '检查更新',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => {
            checkForUpdates()
          }
        }
      ]
    },
    // ==================== 快捷操作菜单 ====================
    {
      label: '快捷操作',
      submenu: [
        {
          label: '打开项目文件夹',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            shell.openPath(PROJECT_ROOT)
          }
        },
        {
          label: '打开配置文件',
          submenu: [
            {
              label: 'package.json',
              click: () => {
                openConfigFile('package.json')
              }
            },
            {
              label: 'next.config.ts',
              click: () => {
                openConfigFile('next.config.ts')
              }
            },
            {
              label: 'tailwind.config.ts',
              click: () => {
                openConfigFile('tailwind.config.ts')
              }
            },
            {
              label: '.env.local',
              click: () => {
                openConfigFile('.env.local')
              }
            }
          ]
        },
        {
          label: '打开内容文件夹',
          submenu: [
            {
              label: '博客文章',
              click: () => {
                openFolder('src/content/blogs')
              }
            },
            {
              label: '个人动态',
              click: () => {
                openFolder('src/content/moments')
              }
            },
            {
              label: '更新日志',
              click: () => {
                openFolder('src/content/changelogs')
              }
            }
          ]
        }
      ]
    },
    // ==================== 帮助菜单 ====================
    {
      label: '帮助',
      submenu: [
        {
          label: '快捷键参考',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            showShortcutsHelp()
          }
        },
        {
          label: '关于',
          click: () => {
            showAboutDialog()
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ==================== 功能函数 ====================

/**
 * 显示关于对话框
 */
function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '关于 Oxygen Blog Dev Preview',
    message: 'Oxygen Blog 开发预览工具',
    detail: `版本: 1.0.0
用于本地开发环境的博客预览

核心快捷键:
F5 - 刷新页面
Ctrl+Shift+R - 强制刷新
Ctrl+Shift+N - 重启服务器
Ctrl+Shift+B - 运行构建
Alt+Home - 返回前台（博客首页）
Alt+End - 进入后台（管理面板）
Alt+1~8 - 常用页面跳转
Alt+4 - 跳转404页面
F11 - 全屏切换
F12 - 开发者工具

更多快捷键请查看「帮助」→「快捷键参考」`
  })
}

/**
 * 显示快捷键帮助
 */
function showShortcutsHelp() {
  const shortcuts = `
【操作】
F5 - 刷新页面
Ctrl+Shift+R - 强制刷新
Ctrl+Shift+N - 重启服务器
Ctrl+Shift+B - 运行构建

【导航】
Alt+Home - 返回前台（博客首页）
Alt+End - 进入后台（管理面板）
Alt+1 - 博客列表
Alt+2 - 归档
Alt+3 - 画廊
Alt+4 - 404页面
Alt+5 - 动态
Alt+6 - 更新日志
Alt+7 - 留言板
Alt+8 - 工具页面
Alt+Left - 后退
Alt+Right - 前进

【视图】
F12 - 开发者工具
Ctrl+Shift+C - 控制台日志
Ctrl++ - 放大
Ctrl+- - 缩小
Ctrl+0 - 重置缩放
F11 - 全屏

【窗口】
Ctrl+Shift+0 - 重置窗口大小
Ctrl+M - 最小化到托盘
Ctrl+Shift+T - 打开新窗口
Ctrl+Shift+D - 复制当前窗口

【工具】
Ctrl+Shift+U - 复制当前URL
Ctrl+Shift+O - 在浏览器中打开
Ctrl+Shift+S - 页面截图
Ctrl+Shift+P - 性能监控
Ctrl+Shift+Delete - 清除缓存

【快捷操作】
Ctrl+Shift+F - 打开项目文件夹
Ctrl+/ - 快捷键参考
`

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '快捷键参考',
    message: '完整的快捷键列表',
    detail: shortcuts
  })
}

/**
 * 显示通知
 */
function showNotification(title, body) {
  // 使用对话框显示通知
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: title,
    message: body,
    buttons: ['确定']
  })
}

/**
 * 重启开发服务器
 */
async function restartDevServer() {
  if (!mainWindow) return

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
    showLoadingScreen('正在重启服务器...')

    // 等待服务器重启后重新加载
    setTimeout(() => {
      checkServerAndReload()
    }, 3000)
  }
}

/**
 * 显示加载屏幕
 */
function showLoadingScreen(message) {
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
          <h2>${message}</h2>
          <p>请稍候</p>
        </div>
      </body>
    </html>
  `)
}

/**
 * 检查服务器状态并重新加载
 */
async function checkServerAndReload() {
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

/**
 * 运行构建命令
 */
function runBuildCommand() {
  dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['确认构建', '取消'],
    defaultId: 0,
    cancelId: 1,
    title: '运行构建',
    message: '确定要运行 npm run build 吗？',
    detail: '这将构建生产版本，可能需要一些时间。'
  }).then((result) => {
    if (result.response === 0) {
      showLoadingScreen('正在构建项目...')
      
      exec('npm run build', { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
        if (error) {
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: '构建失败',
            message: '构建过程中出现错误',
            detail: stderr || error.message
          })
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '构建完成',
            message: '项目构建成功！',
            detail: '构建输出位于 out 目录中。'
          })
        }
        // 返回首页
        if (mainWindow) {
          mainWindow.loadURL(DEV_SERVER_URL)
        }
      })
    }
  })
}

/**
 * 切换深色模式
 */
function toggleDarkMode(enabled) {
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    `).catch(() => {})
  }
}

/**
 * 切换浅色模式
 */
function toggleLightMode(enabled) {
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    `).catch(() => {})
  }
}

/**
 * 页面截图
 */
async function capturePageScreenshot() {
  if (!mainWindow) return

  try {
    const image = await mainWindow.webContents.capturePage()
    const buffer = image.toPNG()
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `screenshot-${timestamp}.png`
    const filepath = path.join(app.getPath('pictures'), filename)
    
    fs.writeFileSync(filepath, buffer)
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '截图已保存',
      message: `截图已保存到：${filepath}`,
      buttons: ['打开文件夹', '确定'],
      defaultId: 1
    }).then((result) => {
      if (result.response === 0) {
        shell.showItemInFolder(filepath)
      }
    })
  } catch (error) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: '截图失败',
      message: '无法捕获页面截图',
      detail: error.message
    })
  }
}

/**
 * 显示性能信息
 */
async function showPerformanceInfo() {
  if (!mainWindow) return

  try {
    const metrics = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const memory = performance.memory || {}
        const timing = performance.timing || {}
        const navigation = performance.navigation || {}
        
        return {
          // 内存信息
          usedJSHeapSize: Math.round((memory.usedJSHeapSize || 0) / 1024 / 1024),
          totalJSHeapSize: Math.round((memory.totalJSHeapSize || 0) / 1024 / 1024),
          jsHeapSizeLimit: Math.round((memory.jsHeapSizeLimit || 0) / 1024 / 1024),
          
          // 页面加载时间
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
          
          // 导航信息
          redirectCount: navigation.redirectCount || 0,
          type: navigation.type || 0
        }
      })()
    `)

    const typeNames = ['导航', '重载', '后退/前进', '预渲染']
    
    const info = `
内存使用:
  已用堆内存: ${metrics.usedJSHeapSize} MB
  总堆内存: ${metrics.totalJSHeapSize} MB
  堆内存限制: ${metrics.jsHeapSizeLimit} MB

页面加载:
  总加载时间: ${metrics.loadTime} ms
  DOM就绪时间: ${metrics.domReadyTime} ms

导航信息:
  重定向次数: ${metrics.redirectCount}
  导航类型: ${typeNames[metrics.type] || '未知'}
`

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '性能监控',
      message: '页面性能信息',
      detail: info
    })
  } catch (error) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '性能监控',
      message: '无法获取性能信息',
      detail: '某些浏览器可能不支持性能API'
    })
  }
}

/**
 * 显示控制台窗口
 */
function showConsoleWindow() {
  if (!mainWindow) return

  const consoleWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: '控制台日志',
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  consoleWindow.loadURL(`data:text/html,
    <html>
      <head>
        <style>
          body {
            background: #1a1a2e;
            color: #66ccff;
            font-family: 'Consolas', 'Monaco', monospace;
            padding: 20px;
            margin: 0;
          }
          h2 { color: #66ccff; border-bottom: 1px solid #333; padding-bottom: 10px; }
          .log-entry {
            margin: 5px 0;
            padding: 5px;
            border-left: 3px solid #66ccff;
            padding-left: 10px;
          }
          .log-debug { border-color: #888; color: #888; }
          .log-info { border-color: #66ccff; color: #66ccff; }
          .log-warning { border-color: #ffcc00; color: #ffcc00; }
          .log-error { border-color: #ff6666; color: #ff6666; }
          .timestamp { color: #666; font-size: 0.8em; }
        </style>
      </head>
      <body>
        <h2>📝 控制台日志</h2>
        <div id="logs">
          <div class="log-entry log-info">
            <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            控制台日志窗口已打开
          </div>
        </div>
        <script>
          // 这里可以添加日志接收逻辑
        </script>
      </body>
    </html>
  `)
}

/**
 * 清除浏览器缓存
 */
async function clearBrowserCache() {
  if (!mainWindow) return

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['确认清除', '取消'],
    defaultId: 0,
    cancelId: 1,
    title: '清除缓存',
    message: '确定要清除浏览器缓存吗？',
    detail: '这将清除所有缓存数据，包括Cookie、本地存储等。'
  })

  if (result.response === 0) {
    await mainWindow.webContents.session.clearCache()
    await mainWindow.webContents.session.clearStorageData()
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '缓存已清除',
      message: '浏览器缓存已成功清除',
      detail: '建议刷新页面以应用更改。'
    })
  }
}

/**
 * 检查更新
 */
function checkForUpdates() {
  // 读取 package.json 中的版本
  const packagePath = path.join(PROJECT_ROOT, 'package.json')
  
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const currentVersion = packageData.version
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '检查更新',
      message: 'Oxygen Blog',
      detail: `当前版本: ${currentVersion}\n\n更新检查功能需要连接到远程仓库。\n请手动检查 GitHub 仓库获取最新版本。`
    })
  } catch (error) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: '检查更新失败',
      message: '无法读取版本信息',
      detail: error.message
    })
  }
}

/**
 * 打开配置文件
 */
function openConfigFile(filename) {
  const filePath = path.join(PROJECT_ROOT, filename)
  
  if (fs.existsSync(filePath)) {
    shell.openPath(filePath)
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '文件不存在',
      message: `找不到文件: ${filename}`,
      detail: `路径: ${filePath}`
    })
  }
}

/**
 * 打开文件夹
 */
function openFolder(folderPath) {
  const fullPath = path.join(PROJECT_ROOT, folderPath)
  
  if (fs.existsSync(fullPath)) {
    shell.openPath(fullPath)
  } else {
    // 如果文件夹不存在，尝试创建
    try {
      fs.mkdirSync(fullPath, { recursive: true })
      shell.openPath(fullPath)
    } catch (error) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: '无法打开文件夹',
        message: `无法打开或创建文件夹: ${folderPath}`,
        detail: error.message
      })
    }
  }
}

// ==================== 应用生命周期 ====================

// 应用准备就绪
app.whenReady().then(() => {
  createWindow()

  // 注册全局快捷键 F11 用于全屏切换
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen()
      mainWindow.setFullScreen(!isFullScreen)
    }
  })

  // 注册全局快捷键 Esc 用于退出全屏
  globalShortcut.register('Esc', () => {
    if (mainWindow && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  app.isQuiting = true
  // 注销所有全局快捷键
  globalShortcut.unregisterAll()
})

// ==================== IPC 处理 ====================

// 刷新页面
ipcMain.on('reload-page', () => {
  if (mainWindow) {
    mainWindow.reload()
  }
})

// 重启服务器
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

// 导航到404页面
ipcMain.on('navigate-404', () => {
  if (mainWindow) {
    mainWindow.loadURL(NOT_FOUND_URL)
  }
})

// 导航到博客列表
ipcMain.on('navigate-blogs', () => {
  if (mainWindow) {
    mainWindow.loadURL(BLOGS_URL)
  }
})

// 导航到归档
ipcMain.on('navigate-archive', () => {
  if (mainWindow) {
    mainWindow.loadURL(ARCHIVE_URL)
  }
})

// 导航到画廊
ipcMain.on('navigate-gallery', () => {
  if (mainWindow) {
    mainWindow.loadURL(GALLERY_URL)
  }
})

// 导航到动态
ipcMain.on('navigate-moments', () => {
  if (mainWindow) {
    mainWindow.loadURL(MOMENTS_URL)
  }
})

// 导航到更新日志
ipcMain.on('navigate-changelogs', () => {
  if (mainWindow) {
    mainWindow.loadURL(CHANGELOGS_URL)
  }
})

// 导航到留言板
ipcMain.on('navigate-guestbook', () => {
  if (mainWindow) {
    mainWindow.loadURL(GUESTBOOK_URL)
  }
})

// 导航到工具页面
ipcMain.on('navigate-tools', () => {
  if (mainWindow) {
    mainWindow.loadURL(TOOLS_URL)
  }
})

// 复制当前URL
ipcMain.on('copy-current-url', () => {
  if (mainWindow) {
    const currentUrl = mainWindow.webContents.getURL()
    clipboard.writeText(currentUrl)
  }
})

// 在浏览器中打开
ipcMain.on('open-in-browser', () => {
  if (mainWindow) {
    const currentUrl = mainWindow.webContents.getURL()
    shell.openExternal(currentUrl)
  }
})

// 截图
ipcMain.on('capture-screenshot', () => {
  capturePageScreenshot()
})

// 显示性能信息
ipcMain.on('show-performance', () => {
  showPerformanceInfo()
})

// 清除缓存
ipcMain.on('clear-cache', () => {
  clearBrowserCache()
})

// 运行构建
ipcMain.on('run-build', () => {
  runBuildCommand()
})

// 重置窗口大小
ipcMain.on('reset-window-size', () => {
  if (mainWindow) {
    mainWindow.setSize(1400, 900)
    mainWindow.center()
  }
})

// 创建新窗口
ipcMain.on('create-new-window', () => {
  createChildWindow(DEV_SERVER_URL, 'Oxygen Blog - 新窗口')
})
