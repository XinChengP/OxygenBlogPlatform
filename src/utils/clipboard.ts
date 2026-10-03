/**
 * 复制文本到剪贴板
 * 使用现代 Clipboard API，并提供降级方案
 *
 * 全站唯一的剪贴板实现：此前 adminUtils、CodeCopyButton、BlogSharePanel、
 * ClientBlogDetail（密码复制）、about、pinyin-converter、RocoPetSimulator、
 * MarkdownEditor 各有一份手写拷贝，现统一引用本模块。
 *
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
