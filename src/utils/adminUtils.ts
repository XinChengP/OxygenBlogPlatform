/**
 * 博客管理后台工具函数库
 * 提供文件名处理、Token加密存储、本地存储管理、中文路径编码等功能
 */

/**
 * 管理后台配置接口
 */
export interface AdminConfig {
  githubOwner: string
  githubRepo: string
  githubBranch: string
  imageRepo: string
  theme: 'light' | 'dark' | 'system'
}

/**
 * 草稿类型
 */
type DraftType = 'blog' | 'moment'

/**
 * 本地存储前缀
 */
const STORAGE_PREFIX = 'admin_'

/**
 * Token 加密密钥
 * 注意：生产环境应使用更安全的加密方式
 */
const ENCRYPTION_KEY = 'admin_token_key'

/**
 * 生成文章文件名
 * 规则：小写字母 + 连字符，保留中文字符，移除特殊字符
 * @param title 文章标题
 * @returns 处理后的文件名（不含扩展名）
 */
export function generateBlogFileName(title: string): string {
  if (!title || typeof title !== 'string') {
    return `untitled-${Date.now()}`
  }

  let fileName = title.trim()

  fileName = fileName.replace(/[<>:"/\\|?*]/g, '')

  fileName = fileName.replace(/\s+/g, '-')

  fileName = fileName.replace(/\.+/g, '')

  fileName = fileName.replace(/-+/g, '-')

  fileName = fileName.replace(/^-|-$/g, '')

  if (!fileName) {
    return `untitled-${Date.now()}`
  }

  return fileName
}

/**
 * 生成动态 ID
 * 规则：6位递增数字，如 000004
 * @param existingIds 现有 ID 列表
 * @returns 新的 6 位数字 ID
 */
export function generateMomentId(existingIds: string[]): string {
  if (!Array.isArray(existingIds)) {
    existingIds = []
  }

  let maxId = 0

  existingIds.forEach((id) => {
    if (typeof id === 'string') {
      const numId = parseInt(id, 10)
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId
      }
    }
  })

  const newId = maxId + 1

  return newId.toString().padStart(6, '0')
}

/**
 * 生成图片文件名
 * 规则：{原名处理}-{时间戳}.{扩展名}
 * @param originalName 原始文件名
 * @returns 处理后的文件名
 */
export function generateImageFileName(originalName: string): string {
  if (!originalName || typeof originalName !== 'string') {
    return `image-${Date.now()}.png`
  }

  const lastDotIndex = originalName.lastIndexOf('.')
  let baseName = originalName
  let extension = 'png'

  if (lastDotIndex > 0) {
    baseName = originalName.substring(0, lastDotIndex)
    extension = originalName.substring(lastDotIndex + 1).toLowerCase()
  }

  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  if (!validExtensions.includes(extension)) {
    extension = 'png'
  }

  baseName = baseName.replace(/[<>:"/\\|?*\s]/g, '-')
  baseName = baseName.replace(/-+/g, '-')
  baseName = baseName.replace(/^-|-$/g, '')

  if (!baseName) {
    baseName = 'image'
  }

  const timestamp = Date.now()

  return `${baseName}-${timestamp}.${extension}`
}

/**
 * 检测文件名冲突并处理
 * @param fileName 文件名
 * @param existingFiles 现有文件列表
 * @returns 处理后的唯一文件名
 */
export function resolveFileNameConflict(fileName: string, existingFiles: string[]): string {
  if (!fileName || typeof fileName !== 'string') {
    return `file-${Date.now()}`
  }

  if (!Array.isArray(existingFiles)) {
    existingFiles = []
  }

  if (!existingFiles.includes(fileName)) {
    return fileName
  }

  const lastDotIndex = fileName.lastIndexOf('.')
  let baseName = fileName
  let extension = ''

  if (lastDotIndex > 0) {
    baseName = fileName.substring(0, lastDotIndex)
    extension = fileName.substring(lastDotIndex)
  }

  let counter = 1
  let newFileName = `${baseName}-${counter}${extension}`

  while (existingFiles.includes(newFileName)) {
    counter++
    newFileName = `${baseName}-${counter}${extension}`
  }

  return newFileName
}

/**
 * 简单的 XOR 加密算法
 * 注意：这是一个简单的加密方式，仅用于增加 Token 存储的安全性
 * 生产环境应使用更安全的加密方式
 * @param text 要加密的文本
 * @param key 加密密钥
 * @returns 加密后的 Base64 字符串
 */
function xorEncrypt(text: string, key: string): string {
  if (!text || !key) {
    return ''
  }

  let result = ''
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }

  return btoa(unescape(encodeURIComponent(result)))
}

/**
 * 简单的 XOR 解密算法
 * @param encryptedText 加密后的 Base64 字符串
 * @param key 解密密钥
 * @returns 解密后的原始文本
 */
function xorDecrypt(encryptedText: string, key: string): string {
  if (!encryptedText || !key) {
    return ''
  }

  try {
    const decoded = decodeURIComponent(escape(atob(encryptedText)))
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      result += String.fromCharCode(charCode)
    }
    return result
  } catch {
    return ''
  }
}

/**
 * 加密并存储 Token
 * @param token GitHub Token
 */
export function encryptAndStoreToken(token: string): void {
  if (!token || typeof token !== 'string') {
    return
  }

  const encryptedToken = xorEncrypt(token, ENCRYPTION_KEY)

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}token`, encryptedToken)
  }
}

/**
 * 获取并解密 Token
 * @returns 解密后的 Token 或 null
 */
export function getDecryptedToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const encryptedToken = localStorage.getItem(`${STORAGE_PREFIX}token`)

  if (!encryptedToken) {
    return null
  }

  const decryptedToken = xorDecrypt(encryptedToken, ENCRYPTION_KEY)

  return decryptedToken || null
}

/**
 * 清除存储的 Token
 */
export function clearStoredToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${STORAGE_PREFIX}token`)
  }
}

/**
 * 存储管理后台配置
 * @param config 管理后台配置对象
 */
export function saveAdminConfig(config: AdminConfig): void {
  if (!config || typeof config !== 'object') {
    return
  }

  if (typeof window !== 'undefined') {
    try {
      const configString = JSON.stringify(config)
      localStorage.setItem(`${STORAGE_PREFIX}config`, configString)
    } catch (error) {
      console.error('保存管理后台配置失败:', error)
    }
  }
}

/**
 * 获取管理后台配置
 * @returns 管理后台配置对象或 null
 */
export function getAdminConfig(): AdminConfig | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const configString = localStorage.getItem(`${STORAGE_PREFIX}config`)

    if (!configString) {
      return null
    }

    const config = JSON.parse(configString) as AdminConfig

    return config
  } catch (error) {
    console.error('获取管理后台配置失败:', error)
    return null
  }
}

/**
 * 存储草稿内容
 * @param type 草稿类型（博客或动态）
 * @param content 草稿内容
 */
export function saveDraft(type: DraftType, content: string): void {
  if (!type || typeof content !== 'string') {
    return
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}draft_${type}`, content)
    } catch (error) {
      console.error('保存草稿失败:', error)
    }
  }
}

/**
 * 获取草稿内容
 * @param type 草稿类型（博客或动态）
 * @returns 草稿内容或 null
 */
export function getDraft(type: DraftType): string | null {
  if (!type) {
    return null
  }

  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem(`${STORAGE_PREFIX}draft_${type}`)
  } catch (error) {
    console.error('获取草稿失败:', error)
    return null
  }
}

/**
 * 清除草稿
 * @param type 草稿类型（博客或动态）
 */
export function clearDraft(type: DraftType): void {
  if (!type) {
    return
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${STORAGE_PREFIX}draft_${type}`)
  }
}

/**
 * 编码路径中的特殊字符（包括中文）
 * 用于 GitHub API 调用
 * @param path 原始路径
 * @returns 编码后的路径
 */
export function encodeChinesePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return ''
  }

  const segments = path.split('/')

  const encodedSegments = segments.map((segment) => {
    if (!segment) {
      return ''
    }

    return encodeURIComponent(segment)
  })

  return encodedSegments.join('/')
}

/**
 * 解码 GitHub API 返回的路径
 * @param encodedPath 编码后的路径
 * @returns 解码后的路径
 */
export function decodeChinesePath(encodedPath: string): string {
  if (!encodedPath || typeof encodedPath !== 'string') {
    return ''
  }

  try {
    const segments = encodedPath.split('/')

    const decodedSegments = segments.map((segment) => {
      if (!segment) {
        return ''
      }

      try {
        return decodeURIComponent(segment)
      } catch {
        return segment
      }
    })

    return decodedSegments.join('/')
  } catch (error) {
    console.error('解码路径失败:', error)
    return encodedPath
  }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
    return '0 B'
  }

  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)

  const formattedSize = size.toFixed(2)

  return `${formattedSize} ${units[i]}`
}

/**
 * 格式化日期时间
 * @param date 日期对象或字符串
 * @returns 格式化后的字符串（YYYY-MM-DD HH:MM 格式）
 */
export function formatDateTime(date: Date | string): string {
  if (!date) {
    return ''
  }

  let dateObj: Date

  if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (date instanceof Date) {
    dateObj = date
  } else {
    return ''
  }

  if (isNaN(dateObj.getTime())) {
    return ''
  }

  const year = dateObj.getFullYear()
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const day = dateObj.getDate().toString().padStart(2, '0')
  const hours = dateObj.getHours().toString().padStart(2, '0')
  const minutes = dateObj.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化相对时间
 * @param date 日期对象或字符串
 * @returns 相对时间字符串（如：3分钟前、2小时前、昨天等）
 */
export function formatRelativeTime(date: Date | string): string {
  if (!date) {
    return ''
  }

  let dateObj: Date

  if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (date instanceof Date) {
    dateObj = date
  } else {
    return ''
  }

  if (isNaN(dateObj.getTime())) {
    return ''
  }

  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else if (days < 30) {
    return `${Math.floor(days / 7)}周前`
  } else if (days < 365) {
    return `${Math.floor(days / 30)}个月前`
  } else {
    return `${Math.floor(days / 365)}年前`
  }
}

/**
 * 验证 GitHub Token 格式
 * GitHub Token 格式：
 * - 经典 Token: 以 'ghp_' 开头，后跟 36 个字符
 * - Fine-grained Token: 以 'github_pat_' 开头
 * - OAuth Token: 以 'gho_' 开头
 * - 个人访问 Token: 以 'ghu_' 或 'ghs_' 开头
 * @param token Token 字符串
 * @returns 是否有效
 */
export function validateGitHubToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  const trimmedToken = token.trim()

  if (trimmedToken.length === 0) {
    return false
  }

  const validPrefixes = [
    'ghp_',
    'github_pat_',
    'gho_',
    'ghu_',
    'ghs_',
    'ghr_',
  ]

  const hasValidPrefix = validPrefixes.some((prefix) =>
    trimmedToken.startsWith(prefix)
  )

  if (!hasValidPrefix) {
    return false
  }

  if (trimmedToken.startsWith('ghp_')) {
    return trimmedToken.length >= 40
  }

  if (trimmedToken.startsWith('github_pat_')) {
    return trimmedToken.length >= 50
  }

  return trimmedToken.length >= 20
}

/**
 * 复制文本到剪贴板
 * 使用现代 Clipboard API，并提供降级方案
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || typeof text !== 'string') {
    return false
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('使用 Clipboard API 复制失败:', error)
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text

      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'

      document.body.appendChild(textarea)

      textarea.focus()
      textarea.select()

      const successful = document.execCommand('copy')

      document.body.removeChild(textarea)

      return successful
    } catch (error) {
      console.error('使用降级方案复制失败:', error)
      return false
    }
  }

  return false
}

/**
 * 仪表盘统计数据接口
 */
export interface DashboardStats {
  /** 文章总数 */
  blogCount: number
  /** 动态总数 */
  momentCount: number
  /** 图片总数 */
  imageCount: number
  /** 本月新增文章数 */
  monthlyBlogCount: number
  /** 更新日志总数 */
  changelogCount: number
  /** 待办事项总数 */
  todoCount: number
  /** 待办事项完成数 */
  todoCompletedCount: number
  /** 分类统计 */
  categoryStats: { name: string; count: number }[]
  /** 标签统计 */
  tagStats: { name: string; count: number }[]
  /** 更新日志列表（用于统计图） */
  changelogs: { date: string; type: string; title: string }[]
  /** 文章总字数 */
  blogWordCount: number
  /** 动态总字数 */
  momentWordCount: number
  /** 日志总字数 */
  changelogWordCount: number
}

/**
 * 活动记录接口
 */
export interface ActivityRecord {
  /** 活动ID */
  id: string
  /** 操作类型 */
  action: 'create' | 'update' | 'delete'
  /** 操作对象类型 */
  resource: 'blog' | 'moment' | 'image' | 'changelog' | 'todo'
  /** 操作对象名称 */
  resourceName: string
  /** 操作时间 */
  time: string
  /** 操作状态 */
  status: 'success' | 'failed' | 'pending'
}

/**
 * 系统状态接口
 */
export interface SystemStatus {
  /** GitHub连接状态 */
  githubConnected: boolean
  /** 存储空间使用情况（字节） */
  storageUsed: number
  /** 存储空间总量（字节） */
  storageTotal: number
  /** 最后同步时间 */
  lastSyncTime: string | null
}

/**
 * 从markdown文件中解析YAML front matter
 * @param content markdown文件内容
 * @returns 解析后的元数据和内容
 */
function parseFrontMatter(content: string): { metadata: any; content: string } {
  // 处理不同的换行符
  const normalizedContent = content.replace(/\r\n/g, '\n');

  // 使用更灵活的正则表达式匹配YAML前置元数据
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = normalizedContent.match(frontMatterRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  const [, frontMatter, body] = match;
  const metadata: any = {};

  // 解析YAML格式，支持多行数组
  const lines = frontMatter.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  lines.forEach(line => {
    // 跳过空行和注释
    if (!line.trim() || line.trim().startsWith('#')) {
      return;
    }

    // 检查是否是缩进的数组元素
    if (currentKey && (line.trim().startsWith('- ') || line.trim().startsWith('-\t'))) {
      // 处理数组元素
      let value = line.trim().substring(1).trim();
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1);
      }
      currentArray.push(value);
      return;
    }

    // 处理之前的数组
    if (currentKey && currentArray.length > 0) {
      metadata[currentKey] = currentArray;
      currentKey = null;
      currentArray = [];
    }

    // 处理新的键值对
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return;
    }

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    if (key) {
      // 检查是否是数组开始
      if (value === '') {
        // 多行数组开始
        currentKey = key;
        currentArray = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // 单行数组
        try {
          // 尝试直接解析JSON
          metadata[key] = JSON.parse(value);
        } catch {
          try {
            // 尝试解析YAML格式的数组
            // 移除首尾的方括号，分割元素
            const arrayContent = value.substring(1, value.length - 1).trim();
            if (arrayContent) {
              // 分割元素，处理可能的引号和空格
              const elements = arrayContent.split(',').map(item => {
                const trimmed = item.trim();
                // 移除引号
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
                  return trimmed.slice(1, -1);
                }
                return trimmed;
              });
              metadata[key] = elements;
            } else {
              metadata[key] = [];
            }
          } catch {
            metadata[key] = value;
          }
        }
      } else if (value === 'true') {
        metadata[key] = true;
      } else if (value === 'false') {
        metadata[key] = false;
      } else if (!isNaN(Number(value))) {
        metadata[key] = Number(value);
      } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        metadata[key] = value.slice(1, -1);
      } else {
        metadata[key] = value;
      }
    }
  });

  // 处理最后一个数组
  if (currentKey && currentArray.length > 0) {
    metadata[currentKey] = currentArray;
  }

  return { metadata, content: body.trim() };
}

/**
 * 高级字数统计函数（简化版，用于服务器端）
 * 支持中英文混合文本的精确字数统计
 */
function advancedWordCount(text: string): { totalWords: number } {
  if (!text || text.trim().length === 0) {
    return { totalWords: 0 };
  }

  // 清理文本：移除Markdown标记和HTML标签
  const cleanedText = text
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*>\s+/gm, '')
    .replace(/\|/g, '')
    .replace(/^[\s]*-+[\s|-]*$/gm, '')
    .replace(/\*\*|__|~~|\*|_/g, '');

  let chineseChars = 0;
  let englishWords = 0;
  let numbers = 0;

  // CJK字符范围
  const isCJK = (charCode: number): boolean => {
    return (
      (charCode >= 0x4e00 && charCode <= 0x9fff) ||
      (charCode >= 0x3400 && charCode <= 0x4dbf) ||
      (charCode >= 0x20000 && charCode <= 0x2a6df) ||
      (charCode >= 0x2a700 && charCode <= 0x2b73f) ||
      (charCode >= 0x2b740 && charCode <= 0x2b81f) ||
      (charCode >= 0x2b820 && charCode <= 0x2ceaf) ||
      (charCode >= 0x2ceb0 && charCode <= 0x2ebef) ||
      (charCode >= 0x3000 && charCode <= 0x303f) ||
      (charCode >= 0x3040 && charCode <= 0x309f) ||
      (charCode >= 0x30a0 && charCode <= 0x30ff) ||
      (charCode >= 0x31f0 && charCode <= 0x31ff) ||
      (charCode >= 0xff00 && charCode <= 0xffef) ||
      (charCode >= 0xf900 && charCode <= 0xfaff)
    );
  };

  // 数字范围
  const isNumber = (charCode: number): boolean => {
    return (charCode >= 0x30 && charCode <= 0x39) || (charCode >= 0xff10 && charCode <= 0xff19);
  };

  let currentWord = '';
  let inEnglishWord = false;

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const charCode = char.codePointAt(0) || 0;

    // 跳过空格和制表符
    if (char === ' ' || char === '\t') {
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }

    // 统计中文字符
    if (isCJK(charCode)) {
      chineseChars++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }

    // 统计数字
    if (isNumber(charCode)) {
      numbers++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }

    // 处理英文字符
    if ((charCode >= 0x41 && charCode <= 0x5a) || (charCode >= 0x61 && charCode <= 0x7a)) {
      currentWord += char;
      inEnglishWord = true;
      continue;
    }

    // 处理其他情况
    if (inEnglishWord && currentWord) {
      englishWords++;
      currentWord = '';
      inEnglishWord = false;
    }
  }

  // 处理最后一个单词
  if (inEnglishWord && currentWord) {
    englishWords++;
  }

  // 总词数 = 中文字符 + 英文单词 + 数字
  const totalWords = chineseChars + englishWords + numbers;

  return { totalWords };
}

/**
 * 服务器端：获取仪表盘统计数据
 * @returns 统计数据对象
 */
export function getDashboardStats(): DashboardStats {
  // 默认统计数据
    const defaultStats: DashboardStats = {
      blogCount: 0,
      momentCount: 0,
      imageCount: 0,
      monthlyBlogCount: 0,
      changelogCount: 0,
      todoCount: 0,
      todoCompletedCount: 0,
      categoryStats: [],
      tagStats: [],
      changelogs: [],
      blogWordCount: 0,
      momentWordCount: 0,
      changelogWordCount: 0,
    }

  // 检查是否在服务器端
  if (typeof window !== 'undefined') {
    return defaultStats
  }

  try {
    const fs = require('fs')
    const path = require('path')

    // 获取文章总数和分类统计
    const blogsDir = path.join(process.cwd(), 'src', 'content', 'blogs')
    let blogCount = 0
    let monthlyBlogCount = 0
    let blogWordCount = 0
    const categoryMap = new Map<string, number>()
    const tagMap = new Map<string, number>()

    if (fs.existsSync(blogsDir) && fs.statSync(blogsDir).isDirectory()) {
      const blogFiles = fs.readdirSync(blogsDir).filter((file: string) => file.endsWith('.md'))
      blogCount = blogFiles.length

      // 计算本月新增文章数和分类统计
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      blogFiles.forEach((file: string) => {
        const filePath = path.join(blogsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        // 解析 front matter 获取正文内容
        const { content: body } = parseFrontMatter(content)

        // 统计文章字数
        const wordCount = advancedWordCount(body)
        blogWordCount += wordCount.totalWords

        // 简单提取日期字段
        const dateMatch = content.match(/date:\s*["']?(\d{4}-\d{2}-\d{2})/)
        if (dateMatch) {
          const date = new Date(dateMatch[1])
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            monthlyBlogCount++
          }
        }

        // 提取分类
        const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)/)
        if (categoryMatch) {
          const category = categoryMatch[1].trim()
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
        }

        // 提取标签
        const tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/)
        if (tagsMatch) {
          const tagsStr = tagsMatch[1]
          const tags = tagsStr.split(',').map((t: string) => t.trim().replace(/["']/g, ''))
          tags.forEach((tag: string) => {
            if (tag) {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
            }
          })
        }
      })
    }

    // 获取动态总数和字数统计
    const momentsDir = path.join(process.cwd(), 'src', 'content', 'moments')
    let momentCount = 0
    let momentWordCount = 0

    if (fs.existsSync(momentsDir) && fs.statSync(momentsDir).isDirectory()) {
      const momentFiles = fs.readdirSync(momentsDir).filter((file: string) => file.endsWith('.md'))
      momentCount = momentFiles.length

      // 统计动态字数
      momentFiles.forEach((file: string) => {
        const filePath = path.join(momentsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        // 解析 front matter 获取正文内容
        const { content: body } = parseFrontMatter(content)

        // 统计动态字数
        const wordCount = advancedWordCount(body)
        momentWordCount += wordCount.totalWords
      })
    }

    // 获取更新日志数据和字数统计
    const changelogsDir = path.join(process.cwd(), 'src', 'content', 'changelogs')
    let changelogCount = 0
    let changelogWordCount = 0
    const changelogs: { date: string; type: string; title: string }[] = []

    if (fs.existsSync(changelogsDir) && fs.statSync(changelogsDir).isDirectory()) {
      const changelogFiles = fs.readdirSync(changelogsDir).filter((file: string) => file.endsWith('.md'))
      changelogCount = changelogFiles.length

      // 遍历所有日志文件
      changelogFiles.forEach((file: string) => {
        const filePath = path.join(changelogsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        // 解析 front matter 获取正文内容
        const { content: body } = parseFrontMatter(content)

        // 统计日志字数
        const wordCount = advancedWordCount(body)
        changelogWordCount += wordCount.totalWords

        // 提取日期（从文件名）
        const dateFromFile = file.replace('.md', '')

        // 提取类型和标题（从文件内容）
        const typeMatch = content.match(/type:\s*["']?([^"'\n]+)/)
        const type = typeMatch ? typeMatch[1].trim() : 'feature'

        const titleMatch = content.match(/title:\s*["']?([^"'\n]+)/)
        const title = titleMatch ? titleMatch[1].trim() : dateFromFile

        // 直接添加，不管 date 是否存在
        changelogs.push({ date: dateFromFile, type, title })
      })
    }

    // 获取待办事项统计
    const todoPath = path.join(process.cwd(), 'src', 'content', 'todo.json')
    let todoCount = 0
    let todoCompletedCount = 0

    if (fs.existsSync(todoPath)) {
      try {
        const todoContent = fs.readFileSync(todoPath, 'utf8')
        const todoData = JSON.parse(todoContent)
        if (todoData.items && Array.isArray(todoData.items)) {
          todoCount = todoData.items.length
          todoCompletedCount = todoData.items.filter((item: { completed?: boolean }) => item.completed).length
        }
      } catch (e) {
        console.error('解析待办事项数据失败:', e)
      }
    }

    // 获取图片总数（从 public 目录统计）
    const publicDir = path.join(process.cwd(), 'public')
    let imageCount = 0

    if (fs.existsSync(publicDir) && fs.statSync(publicDir).isDirectory()) {
      // 支持的图片格式
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
      
      // 递归统计图片数量
      const countImages = (dir: string): number => {
        let count = 0
        try {
          const items = fs.readdirSync(dir)
          
          items.forEach((item: string) => {
            const itemPath = path.join(dir, item)
            const stat = fs.statSync(itemPath)
            
            if (stat.isDirectory()) {
              count += countImages(itemPath)
            } else if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase()
              if (imageExtensions.includes(ext)) {
                count++
              }
            }
          })
        } catch (e) {
          // 忽略无法访问的目录
        }
        
        return count
      }

      imageCount = countImages(publicDir)
    }

    // 转换分类统计为数组并排序
    const categoryStats = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // 只取前5个

    // 转换标签统计为数组并排序
    const tagStats = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // 只取前10个

    return {
      blogCount,
      momentCount,
      imageCount,
      monthlyBlogCount,
      changelogCount,
      todoCount,
      todoCompletedCount,
      categoryStats,
      tagStats,
      changelogs,
      blogWordCount,
      momentWordCount,
      changelogWordCount,
    }
  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error)
    return defaultStats
  }
}

/**
 * 获取最近活动记录（模拟数据）
 * 实际项目中应该从数据库或日志文件中读取
 * @returns 活动记录数组
 */
export function getRecentActivities(): ActivityRecord[] {
  // 返回模拟数据，实际项目中应该从数据库或日志中读取
  const now = new Date()
  
  return [
    {
      id: '1',
      action: 'create',
      resource: 'blog',
      resourceName: 'Next.js 16 新特性详解',
      time: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), // 30分钟前
      status: 'success',
    },
    {
      id: '2',
      action: 'update',
      resource: 'moment',
      resourceName: '动态 #000123',
      time: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
      status: 'success',
    },
    {
      id: '3',
      action: 'create',
      resource: 'image',
      resourceName: 'screenshot-2026.png',
      time: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(), // 5小时前
      status: 'success',
    },
    {
      id: '4',
      action: 'delete',
      resource: 'blog',
      resourceName: '旧版文章草稿',
      time: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1天前
      status: 'success',
    },
    {
      id: '5',
      action: 'update',
      resource: 'blog',
      resourceName: '洛天依主题博客开发日志',
      time: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2天前
      status: 'success',
    },
  ]
}

/**
 * 获取系统状态（模拟数据）
 * 实际项目中应该从配置和监控系统中读取
 * @returns 系统状态对象
 */
export function getSystemStatus(): SystemStatus {
  // 返回模拟数据，实际项目中应该从配置和监控系统中读取
  return {
    githubConnected: true,
    storageUsed: 256 * 1024 * 1024, // 256 MB
    storageTotal: 1024 * 1024 * 1024, // 1 GB
    lastSyncTime: new Date().toISOString(),
  }
}
