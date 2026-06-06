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
const DEV_SERVER_URL = 'http://localhost:7120'
const ADMIN_URL = 'http://localhost:7120/admin'
const NOT_FOUND_URL = 'http://localhost:7120/404'
const BLOGS_URL = 'http://localhost:7120/blogs'
const ARCHIVE_URL = 'http://localhost:7120/archive'
const GALLERY_URL = 'http://localhost:7120/gallery'
const MOMENTS_URL = 'http://localhost:7120/moments'
const CHANGELOGS_URL = 'http://localhost:7120/changelogs'
const GUESTBOOK_URL = 'http://localhost:7120/guestbook'
const TOOLS_URL = 'http://localhost:7120/tools'

// 项目路径
const PROJECT_ROOT = path.join(__dirname, '..')

// ==================== 配置文件路径 ====================
// 窗口状态配置文件路径
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json')
// 应用设置配置文件路径
const APP_SETTINGS_FILE = path.join(app.getPath('userData'), 'app-settings.json')
// 自定义导航配置文件路径
const CUSTOM_NAV_FILE = path.join(app.getPath('userData'), 'custom-nav.json')

// ==================== 窗口状态管理 ====================
/**
 * 保存窗口状态到配置文件
 * 包括窗口位置、大小、是否最大化等信息
 */
function saveWindowState() {
  if (!mainWindow) return

  try {
    // 如果窗口处于最大化状态，不保存位置和大小，只保存最大化状态
    const isMaximized = mainWindow.isMaximized()
    const isFullScreen = mainWindow.isFullScreen()

    let state = {
      isMaximized,
      isFullScreen,
      timestamp: new Date().toISOString()
    }

    // 只有在非最大化、非全屏状态下才保存位置和大小
    if (!isMaximized && !isFullScreen) {
      const bounds = mainWindow.getBounds()
      state = {
        ...state,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }
    }

    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error('保存窗口状态失败:', error)
  }
}

/**
 * 加载窗口状态配置
 * @returns {Object} 窗口状态对象，包含位置、大小等信息
 */
function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf8'))
      return state
    }
  } catch (error) {
    console.error('加载窗口状态失败:', error)
  }

  // 返回默认状态
  return {
    width: 1400,
    height: 900,
    isMaximized: false,
    isFullScreen: false
  }
}

// ==================== 应用设置管理 ====================
/**
 * 加载应用设置
 * @returns {Object} 应用设置对象
 */
function loadAppSettings() {
  try {
    if (fs.existsSync(APP_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(APP_SETTINGS_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('加载应用设置失败:', error)
  }

  // 返回默认设置
  return {
    autoUpdate: true,
    updateChannel: 'stable',
    lastCheckTime: null
  }
}

/**
 * 保存应用设置
 * @param {Object} settings - 应用设置对象
 */
function saveAppSettings(settings) {
  try {
    fs.writeFileSync(APP_SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('保存应用设置失败:', error)
  }
}

// ==================== 自定义导航管理 ====================
/**
 * 加载自定义导航列表
 * @returns {Array} 自定义导航列表
 */
function loadCustomNav() {
  try {
    if (fs.existsSync(CUSTOM_NAV_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_NAV_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('加载自定义导航失败:', error)
  }
  return []
}

/**
 * 保存自定义导航列表
 * @param {Array} navList - 导航列表
 */
function saveCustomNav(navList) {
  try {
    fs.writeFileSync(CUSTOM_NAV_FILE, JSON.stringify(navList, null, 2))
  } catch (error) {
    console.error('保存自定义导航失败:', error)
  }
}

/**
 * 添加自定义导航
 * @param {string} name - 导航名称
 * @param {string} url - 导航URL
 */
async function addCustomNav() {
  if (!mainWindow) return

  // 输入导航名称
  const nameResult = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['确认', '取消'],
    defaultId: 0,
    cancelId: 1,
    title: '添加自定义导航',
    message: '请输入导航名称',
    detail: '例如: 百度、GitHub、我的博客等'
  })

  if (nameResult.response !== 0) return

  // 使用input框获取名称和URL
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['下一步', '取消'],
    defaultId: 0,
    cancelId: 1,
    title: '添加自定义导航 - 步骤 1/2',
    message: '请输入导航名称',
    detail: '在下一步中输入URL地址'
  })

  if (result.response !== 0) return

  // 创建输入窗口来获取导航信息
  const inputWindow = new BrowserWindow({
    width: 500,
    height: 300,
    title: '添加自定义导航',
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      padding: 30px;
      height: 100vh;
    }
    h2 { color: #66ccff; margin-bottom: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; color: #888; font-size: 0.9em; }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid rgba(102, 204, 255, 0.3);
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.3);
      color: #e0e0e0;
      font-size: 14px;
    }
    input:focus {
      outline: none;
      border-color: #66ccff;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    button {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #66ccff 0%, #3399cc 100%);
      color: #1a1a2e;
      font-weight: bold;
    }
    .btn-primary:hover { transform: translateY(-1px); }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.2); }
    .hint { color: #666; font-size: 0.85em; margin-top: 10px; }
  </style>
</head>
<body>
  <h2>添加自定义导航</h2>
  <div class="form-group">
    <label>导航名称</label>
    <input type="text" id="name" placeholder="例如: 百度、GitHub">
  </div>
  <div class="form-group">
    <label>URL地址</label>
    <input type="text" id="url" placeholder="例如: https://www.baidu.com">
  </div>
  <p class="hint">提示: 可以输入本地路径如 http://localhost:3000</p>
  <div class="buttons">
    <button class="btn-secondary" onclick="cancel()">取消</button>
    <button class="btn-primary" onclick="confirm()">确认</button>
  </div>
  <script>
    function cancel() {
      window.close();
    }
    function confirm() {
      const name = document.getElementById('name').value.trim();
      let url = document.getElementById('url').value.trim();
      
      if (!name || !url) {
        alert('请填写完整信息');
        return;
      }
      
      // 自动添加协议
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // 发送给主进程
      if (window.opener && window.opener.electronAPI) {
        window.opener.electronAPI.addCustomNavItem(name, url);
      }
      window.close();
    }
    // 回车确认
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') cancel();
    });
    document.getElementById('name').focus();
  </script>
</body>
</html>
  `

  inputWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
}

/**
 * 删除自定义导航
 * @param {number} index - 导航索引
 */
async function removeCustomNav(index) {
  const navList = loadCustomNav()
  if (index >= 0 && index < navList.length) {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['确认删除', '取消'],
      defaultId: 0,
      cancelId: 1,
      title: '删除自定义导航',
      message: `确定要删除 "${navList[index].name}" 吗？`,
      detail: '此操作不可恢复。'
    })

    if (result.response === 0) {
      navList.splice(index, 1)
      saveCustomNav(navList)
      // 刷新菜单
      createMenu()
    }
  }
}

/**
 * 导航到指定URL
 * @param {string} url - 目标URL
 */
function navigateTo(url) {
  if (mainWindow) {
    mainWindow.loadURL(url)
  }
}

// ==================== 自动更新功能 ====================
/**
 * 检查应用更新
 * 从 GitHub 仓库获取最新版本信息并与当前版本比较
 */
async function checkForUpdates(showNoUpdate = false) {
  const packagePath = path.join(PROJECT_ROOT, 'package.json')

  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const currentVersion = packageData.version
    const repoUrl = packageData.repository?.url || ''

    // 从仓库URL提取owner和repo名称
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/]+)\.git/)
    if (!match) {
      throw new Error('无法解析仓库地址')
    }

    const [, owner, repo] = match

    // 显示检查中提示
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '检查更新',
        message: '正在检查更新...',
        detail: '正在连接 GitHub 获取最新版本信息',
        buttons: ['确定']
      })
    }

    // 使用 GitHub API 获取最新 release
    const https = require('https')
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'Oxygen-Blog-Electron'
      }
    }

    const latestRelease = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
      req.on('error', reject)
      req.setTimeout(10000, () => {
        req.destroy()
        reject(new Error('请求超时'))
      })
      req.end()
    })

    if (latestRelease.message && latestRelease.message.includes('API rate limit')) {
      throw new Error('GitHub API 速率限制，请稍后再试')
    }

    const latestVersion = latestRelease.tag_name?.replace(/^v/, '') || '0.0.0'

    // 比较版本号
    const compareVersions = (v1, v2) => {
      const parts1 = v1.split('.').map(Number)
      const parts2 = v2.split('.').map(Number)
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0
        const p2 = parts2[i] || 0
        if (p1 > p2) return 1
        if (p1 < p2) return -1
      }
      return 0
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    // 更新最后检查时间
    const settings = loadAppSettings()
    settings.lastCheckTime = new Date().toISOString()
    saveAppSettings(settings)

    if (hasUpdate) {
      // 有新版本
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: `发现新版本: v${latestVersion}`,
        detail: `当前版本: v${currentVersion}\n\n更新内容:\n${latestRelease.body?.substring(0, 500) || '暂无更新说明'}...\n\n是否前往下载页面？`,
        buttons: ['前往下载', '稍后提醒', '查看详情'],
        defaultId: 0
      })

      if (result.response === 0) {
        // 打开下载页面
        shell.openExternal(latestRelease.html_url || `https://github.com/${owner}/${repo}/releases`)
      } else if (result.response === 2) {
        // 在窗口中显示完整更新日志
        showUpdateDetails(latestRelease)
      }
    } else if (showNoUpdate) {
      // 没有新版本且用户主动检查
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '已是最新版本',
        message: '当前已是最新版本',
        detail: `版本: v${currentVersion}\n\n无需更新。`
      })
    }

    return { hasUpdate, currentVersion, latestVersion }

  } catch (error) {
    console.error('检查更新失败:', error)

    if (showNoUpdate) {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: '检查更新失败',
        message: '无法检查更新',
        detail: error.message
      })
    }

    return { hasUpdate: false, error: error.message }
  }
}

/**
 * 显示更新详情窗口
 * @param {Object} release - GitHub release 信息
 */
function showUpdateDetails(release) {
  const detailsWindow = new BrowserWindow({
    width: 700,
    height: 600,
    title: '更新详情',
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const releaseBody = release.body?.replace(/\n/g, '<br>') || '暂无更新说明'

  detailsWindow.loadURL(`data:text/html,
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 30px;
            margin: 0;
            line-height: 1.6;
          }
          h1 {
            color: #66ccff;
            border-bottom: 2px solid #66ccff;
            padding-bottom: 10px;
            margin-top: 0;
          }
          h2 {
            color: #66ccff;
            margin-top: 25px;
          }
          .version {
            background: rgba(102, 204, 255, 0.1);
            border-left: 4px solid #66ccff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .version-number {
            font-size: 1.5em;
            font-weight: bold;
            color: #66ccff;
          }
          .release-date {
            color: #888;
            font-size: 0.9em;
            margin-top: 5px;
          }
          .content {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .download-btn {
            display: inline-block;
            background: linear-gradient(135deg, #66ccff 0%, #3399cc 100%);
            color: #1a1a2e;
            padding: 12px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 204, 255, 0.4);
          }
          code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', monospace;
          }
          ul, ol {
            padding-left: 20px;
          }
          li {
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <h1>🚀 新版本发布</h1>
        <div class="version">
          <div class="version-number">${release.tag_name || 'v?.?.?'}</div>
          <div class="release-date">发布于: ${new Date(release.published_at).toLocaleString('zh-CN')}</div>
        </div>
        <div class="content">
          ${releaseBody}
        </div>
        <center>
          <a href="${release.html_url}" class="download-btn" onclick="require('electron').shell.openExternal('${release.html_url}'); return false;">
            前往下载页面
          </a>
        </center>
      </body>
    </html>
  `)
}

// ==================== 窗口创建 ====================
/**
 * 创建主窗口
 * 恢复上次保存的窗口状态和位置
 */
function createWindow() {
  // 加载保存的窗口状态
  const windowState = loadWindowState()

  mainWindow = new BrowserWindow({
    width: windowState.width || 1400,
    height: windowState.height || 900,
    x: windowState.x,
    y: windowState.y,
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

  // 恢复最大化状态
  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // 恢复全屏状态
  if (windowState.isFullScreen) {
    mainWindow.setFullScreen(true)
  }

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

  // 监听窗口状态变化并保存
  const saveState = () => {
    saveWindowState()
  }

  mainWindow.on('resize', saveState)
  mainWindow.on('move', saveState)
  mainWindow.on('maximize', saveState)
  mainWindow.on('unmaximize', saveState)
  mainWindow.on('enter-full-screen', saveState)
  mainWindow.on('leave-full-screen', saveState)

  // 监听控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // 可以在这里处理控制台日志
    const levels = ['debug', 'info', 'warning', 'error']
    console.log(`[${levels[level] || 'log'}] ${message}`)
  })

  // 监听拖拽事件
  setupDragAndDrop()

  // 窗口关闭时处理
  mainWindow.on('close', (event) => {
    // 保存窗口状态
    saveWindowState()

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

// ==================== 拖拽打开文件功能 ====================
/**
 * 设置窗口的拖拽文件处理
 * 支持拖拽 Markdown 文件到窗口打开编辑
 */
function setupDragAndDrop() {
  if (!mainWindow) return

  // 监听拖拽进入事件
  mainWindow.webContents.on('drag-enter', (event) => {
    // 阻止默认行为，允许拖拽
    event.preventDefault()
  })

  // 监听拖拽悬停事件
  mainWindow.webContents.on('drag-over', (event) => {
    event.preventDefault()
  })

  // 监听拖拽离开事件
  mainWindow.webContents.on('drag-leave', (event) => {
    event.preventDefault()
  })

  // 监听文件拖放事件
  mainWindow.webContents.on('drop', async (event, filePaths) => {
    event.preventDefault()

    if (!filePaths || filePaths.length === 0) return

    // 处理拖放的文件
    for (const filePath of filePaths) {
      await handleDroppedFile(filePath)
    }
  })
}

/**
 * 处理拖放的文件
 * @param {string} filePath - 拖放的文件路径
 */
async function handleDroppedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)

  // 支持的文件类型
  const supportedExts = ['.md', '.markdown', '.txt', '.json']

  if (!supportedExts.includes(ext)) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '不支持的文件类型',
      message: `无法打开文件: ${fileName}`,
      detail: `支持的文件类型: ${supportedExts.join(', ')}`
    })
    return
  }

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error('文件不存在')
    }

    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8')

    // 根据文件类型处理
    if (ext === '.md' || ext === '.markdown') {
      // Markdown 文件 - 打开编辑器或显示内容
      await openMarkdownEditor(filePath, content, fileName)
    } else if (ext === '.json') {
      // JSON 文件 - 尝试解析并显示
      await openJsonViewer(filePath, content, fileName)
    } else if (ext === '.txt') {
      // 文本文件 - 简单显示
      await openTextViewer(filePath, content, fileName)
    }

    // 添加到最近文件列表
    addToRecentFiles(filePath)

  } catch (error) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: '打开文件失败',
      message: `无法打开文件: ${fileName}`,
      detail: error.message
    })
  }
}

/**
 * 打开 Markdown 编辑器窗口
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {string} fileName - 文件名
 */
async function openMarkdownEditor(filePath, content, fileName) {
  // 检查是否是博客文章（在 blogs 目录中）
  const isBlogPost = filePath.includes('blogs') || filePath.includes('content')

  // 如果是博客文章，跳转到对应的文章页面
  if (isBlogPost) {
    // 提取文章 slug（文件名去掉扩展名）
    const slug = path.basename(filePath, path.extname(filePath))
    const blogUrl = `${DEV_SERVER_URL}/blogs/${slug}/`

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['在博客中查看', '在编辑器中打开', '取消'],
      defaultId: 0,
      title: '打开 Markdown 文件',
      message: `检测到博客文章: ${fileName}`,
      detail: '您希望在博客中查看这篇文章，还是在编辑器中编辑？'
    })

    if (result.response === 0) {
      // 在博客中查看
      mainWindow.loadURL(blogUrl)
      return
    } else if (result.response === 2) {
      return
    }
  }

  // 在编辑器窗口中打开
  const editorWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `编辑: ${fileName}`,
    parent: mainWindow,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a2e'
  })

  // 创建编辑器 HTML 内容
  const editorHtml = createMarkdownEditorHtml(filePath, content, fileName)
  editorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(editorHtml)}`)

  childWindows.push(editorWindow)

  editorWindow.on('closed', () => {
    const index = childWindows.indexOf(editorWindow)
    if (index > -1) {
      childWindows.splice(index, 1)
    }
  })
}

/**
 * 创建 Markdown 编辑器 HTML
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {string} fileName - 文件名
 * @returns {string} HTML 字符串
 */
function createMarkdownEditorHtml(filePath, content, fileName) {
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>编辑: ${fileName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: rgba(0, 0, 0, 0.3);
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(102, 204, 255, 0.2);
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .file-icon {
      font-size: 1.5em;
    }
    .file-name {
      font-weight: bold;
      color: #66ccff;
    }
    .file-path {
      color: #888;
      font-size: 0.85em;
    }
    .actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #66ccff 0%, #3399cc 100%);
      color: #1a1a2e;
      font-weight: bold;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 204, 255, 0.3);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .editor-container {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    .editor-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(102, 204, 255, 0.2);
    }
    .pane-header {
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 15px;
      font-size: 0.85em;
      color: #66ccff;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    textarea {
      flex: 1;
      background: rgba(0, 0, 0, 0.2);
      border: none;
      color: #e0e0e0;
      padding: 15px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: none;
      outline: none;
    }
    textarea:focus {
      background: rgba(0, 0, 0, 0.3);
    }
    .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .preview-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.02);
    }
    .preview-content h1,
    .preview-content h2,
    .preview-content h3 {
      color: #66ccff;
      margin: 20px 0 10px;
    }
    .preview-content p {
      margin: 10px 0;
      line-height: 1.8;
    }
    .preview-content code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .preview-content pre {
      background: rgba(0, 0, 0, 0.3);
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
    }
    .status-bar {
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 20px;
      font-size: 0.85em;
      color: #888;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid rgba(102, 204, 255, 0.2);
    }
    .unsaved {
      color: #ff9966;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="file-info">
      <span class="file-icon">📝</span>
      <div>
        <div class="file-name">${fileName}</div>
        <div class="file-path">${filePath}</div>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-secondary" onclick="openInExternal()">外部打开</button>
      <button class="btn btn-primary" onclick="saveFile()">保存</button>
    </div>
  </div>

  <div class="editor-container">
    <div class="editor-pane">
      <div class="pane-header">编辑</div>
      <textarea id="editor" spellcheck="false">${escapedContent}</textarea>
    </div>
    <div class="preview-pane">
      <div class="pane-header">预览</div>
      <div class="preview-content" id="preview"></div>
    </div>
  </div>

  <div class="status-bar">
    <span id="status">就绪</span>
    <span id="stats">行 1, 列 1 | ${escapedContent.length} 字符</span>
  </div>

  <script>
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const status = document.getElementById('status');
    const stats = document.getElementById('stats');
    let isModified = false;

    // 简单的 Markdown 渲染
    function renderMarkdown(text) {
      return text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
        .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
        .replace(/^\\* (.*$)/gim, '<li>$1</li>')
        .replace(/\\n/g, '<br>');
    }

    function updatePreview() {
      preview.innerHTML = renderMarkdown(editor.value);
      updateStats();
    }

    function updateStats() {
      const lines = editor.value.split('\\n');
      const cursorPos = editor.selectionStart;
      const textBeforeCursor = editor.value.substring(0, cursorPos);
      const lineNum = textBeforeCursor.split('\\n').length;
      const colNum = textBeforeCursor.split('\\n').pop().length + 1;
      stats.textContent = '行 ' + lineNum + ', 列 ' + colNum + ' | ' + editor.value.length + ' 字符';
    }

    function markModified() {
      if (!isModified) {
        isModified = true;
        status.innerHTML = '<span class="unsaved">● 已修改</span>';
        document.title = '编辑: ${fileName} *';
      }
    }

    function saveFile() {
      // 通过 IPC 发送保存请求
      if (window.electronAPI && window.electronAPI.saveFile) {
        window.electronAPI.saveFile('${filePath}', editor.value);
      }
      isModified = false;
      status.textContent = '已保存';
      document.title = '编辑: ${fileName}';
    }

    function openInExternal() {
      if (window.electronAPI && window.electronAPI.openInExternal) {
        window.electronAPI.openInExternal('${filePath}');
      }
    }

    editor.addEventListener('input', () => {
      updatePreview();
      markModified();
    });

    editor.addEventListener('keyup', updateStats);
    editor.addEventListener('click', updateStats);

    // 快捷键
    editor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    });

    // 初始化预览
    updatePreview();
  </script>
</body>
</html>
  `
}

/**
 * 打开 JSON 查看器
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {string} fileName - 文件名
 */
async function openJsonViewer(filePath, content, fileName) {
  try {
    const jsonData = JSON.parse(content)
    const formatted = JSON.stringify(jsonData, null, 2)

    const viewerWindow = new BrowserWindow({
      width: 900,
      height: 700,
      title: `查看: ${fileName}`,
      parent: mainWindow,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    viewerWindow.loadURL(`data:text/html,
      <html>
        <head>
          <style>
            body {
              background: #1a1a2e;
              color: #e0e0e0;
              font-family: 'Consolas', monospace;
              padding: 20px;
              margin: 0;
            }
            h2 { color: #66ccff; }
            pre {
              background: rgba(0,0,0,0.3);
              padding: 20px;
              border-radius: 8px;
              overflow-x: auto;
              line-height: 1.6;
            }
            .string { color: #66ff99; }
            .number { color: #ff9966; }
            .boolean { color: #9966ff; }
            .null { color: #ff66cc; }
            .key { color: #66ccff; }
          </style>
        </head>
        <body>
          <h2>📋 ${fileName}</h2>
          <pre>${syntaxHighlightJson(formatted)}</pre>
        </body>
      </html>
    `)

    childWindows.push(viewerWindow)
  } catch (error) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'JSON 解析失败',
      message: `无法解析文件: ${fileName}`,
      detail: error.message
    })
  }
}

/**
 * JSON 语法高亮
 * @param {string} json - JSON 字符串
 * @returns {string} 带高亮的 HTML
 */
function syntaxHighlightJson(json) {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(".*?"):/g, '<span class="key">$1</span>:')
    .replace(/: (".*?")/g, ': <span class="string">$1</span>')
    .replace(/: (\d+)/g, ': <span class="number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="null">$1</span>')
}

/**
 * 打开文本查看器
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {string} fileName - 文件名
 */
async function openTextViewer(filePath, content, fileName) {
  const viewerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: `查看: ${fileName}`,
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  viewerWindow.loadURL(`data:text/html,
    <html>
      <head>
        <style>
          body {
            background: #1a1a2e;
            color: #e0e0e0;
            font-family: 'Consolas', monospace;
            padding: 20px;
            margin: 0;
            line-height: 1.6;
          }
          h2 { color: #66ccff; }
          .content {
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 8px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <h2>📄 ${fileName}</h2>
        <div class="content">${escapedContent}</div>
      </body>
    </html>
  `)

  childWindows.push(viewerWindow)
}

// ==================== 最近文件管理 ====================
const RECENT_FILES_FILE = path.join(app.getPath('userData'), 'recent-files.json')
const MAX_RECENT_FILES = 10

/**
 * 加载最近文件列表
 * @returns {Array} 最近文件列表
 */
function loadRecentFiles() {
  try {
    if (fs.existsSync(RECENT_FILES_FILE)) {
      return JSON.parse(fs.readFileSync(RECENT_FILES_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('加载最近文件失败:', error)
  }
  return []
}

/**
 * 保存最近文件列表
 * @param {Array} files - 文件列表
 */
function saveRecentFiles(files) {
  try {
    fs.writeFileSync(RECENT_FILES_FILE, JSON.stringify(files, null, 2))
  } catch (error) {
    console.error('保存最近文件失败:', error)
  }
}

/**
 * 添加文件到最近文件列表
 * @param {string} filePath - 文件路径
 */
function addToRecentFiles(filePath) {
  let recentFiles = loadRecentFiles()

  // 移除已存在的相同路径
  recentFiles = recentFiles.filter(f => f.path !== filePath)

  // 添加到开头
  recentFiles.unshift({
    path: filePath,
    name: path.basename(filePath),
    openedAt: new Date().toISOString()
  })

  // 限制数量
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES)
  }

  saveRecentFiles(recentFiles)

  // 更新菜单
  updateRecentFilesMenu()
}

/**
 * 更新最近文件菜单
 */
function updateRecentFilesMenu() {
  // 重新创建菜单以更新最近文件列表
  createMenu()
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
      label: '检查更新',
      click: () => {
        checkForUpdates(true)
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
  const recentFiles = loadRecentFiles()
  const customNav = loadCustomNav()

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
        ...(customNav.length > 0 ? [
          { type: 'separator' },
          {
            label: '自定义导航',
            submenu: customNav.map((nav, index) => ({
              label: nav.name,
              click: () => navigateTo(nav.url)
            })).concat([
              { type: 'separator' },
              {
                label: '管理自定义导航',
                submenu: [
                  {
                    label: '添加导航',
                    click: () => addCustomNav()
                  },
                  { type: 'separator' },
                  ...customNav.map((nav, index) => ({
                    label: `删除: ${nav.name}`,
                    click: () => removeCustomNav(index)
                  }))
                ]
              }
            ])
          }
        ] : [
          { type: 'separator' },
          {
            label: '自定义导航',
            submenu: [
              {
                label: '添加导航',
                click: () => addCustomNav()
              },
              {
                label: '暂无自定义导航',
                enabled: false
              }
            ]
          }
        ]),
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
              // 清除保存的状态
              if (fs.existsSync(WINDOW_STATE_FILE)) {
                fs.unlinkSync(WINDOW_STATE_FILE)
              }
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
            checkForUpdates(true)
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
  const packagePath = path.join(PROJECT_ROOT, 'package.json')
  let version = '1.0.0'

  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    version = packageData.version
  } catch (error) {
    console.error('读取版本失败:', error)
  }

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '关于 Oxygen Blog Dev Preview',
    message: 'Oxygen Blog 开发预览工具',
    detail: `版本: ${version}
用于本地开发环境的博客预览

新增功能:
✓ 窗口状态记忆 - 自动保存窗口位置和大小
✓ 自动更新检查 - 从 GitHub 检查新版本
✓ 拖拽打开文件 - 支持 Markdown/JSON/TXT 文件

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

【文件】
Ctrl+O - 打开文件
支持拖拽 Markdown/JSON/TXT 文件到窗口

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
 * 设置主题
 * @param {string} theme - 主题类型: 'dark' | 'light' | 'system'
 */
function setTheme(theme) {
  if (!mainWindow) return

  const script = `
    (function() {
      const theme = '${theme}';
      
      if (theme === 'system') {
        // 跟随系统主题
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', 'system');
      } else if (theme === 'dark') {
        // 强制深色模式
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else if (theme === 'light') {
        // 强制浅色模式
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      
      // 触发主题变化事件，让应用知道主题已更改
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: theme } }));
      
      return 'Theme set to: ' + theme;
    })()
  `

  mainWindow.webContents.executeJavaScript(script).then((result) => {
    console.log('主题切换成功:', result)
  }).catch((error) => {
    console.error('主题切换失败:', error)
  })
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
  // 保存窗口状态
  saveWindowState()
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

// 保存文件（从编辑器窗口调用）
ipcMain.on('save-file', (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    event.reply('file-saved', { success: true, path: filePath })
  } catch (error) {
    event.reply('file-saved', { success: false, error: error.message })
  }
})

// 在外部编辑器中打开文件
ipcMain.on('open-in-external', (event, filePath) => {
  // 使用 shell.openExternal 打开文件，确保使用正确的协议
  const fileUrl = filePath.startsWith('file://') ? filePath : `file://${filePath}`
  shell.openExternal(fileUrl).catch((error) => {
    console.error('外部打开文件失败:', error)
    // 如果 openExternal 失败，尝试使用 openPath
    shell.openPath(filePath)
  })
})

// 打开本地文件夹
ipcMain.on('open-local-folder', (event, folderPath) => {
  const fullPath = path.join(PROJECT_ROOT, 'public', folderPath)

  if (fs.existsSync(fullPath)) {
    shell.openPath(fullPath)
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '文件夹不存在',
      message: `找不到文件夹: ${folderPath}`,
      detail: `路径: ${fullPath}`
    })
  }
})

// 添加自定义导航项
ipcMain.on('add-custom-nav-item', (event, name, url) => {
  const navList = loadCustomNav()
  navList.push({ name, url, createdAt: new Date().toISOString() })
  saveCustomNav(navList)
  // 刷新菜单
  createMenu()
})
