/**
 * 开发日志类型定义和纯函数
 * 此文件不包含任何 Node.js 模块依赖，可安全在客户端使用
 */

/**
 * 开发日志类型定义
 * - feature: 新功能
 * - fix: 修复问题
 * - refactor: 代码重构
 * - docs: 文档更新
 * - style: 样式调整
 * - chore: 其他改动
 */
export type ChangelogType = 'feature' | 'fix' | 'refactor' | 'docs' | 'style' | 'chore';

/**
 * 开发日志接口定义
 */
export interface Changelog {
  id: string;           // 文件名作为ID
  date: string;         // 日期 YYYY-MM-DD
  title: string;        // 日志标题
  type: ChangelogType;  // 日志类型
  commits: string[];    // 关联的Git提交
  content: string;      // 日志正文内容
  filePath: string;     // 文件路径
}

/**
 * 从markdown文件中解析YAML front matter
 * @param content markdown文件内容
 * @returns 解析后的元数据和内容
 */
export function parseFrontMatter(content: string): { metadata: Record<string, unknown>; content: string } {
  // 处理不同的换行符，统一转换为 \n
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  // 使用正则表达式匹配YAML前置元数据
  // 匹配格式：---\n元数据\n---\n正文内容
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = normalizedContent.match(frontMatterRegex);
  
  // 如果没有匹配到 front matter，返回空元数据和原始内容
  if (!match) {
    return { metadata: {}, content };
  }
  
  const [, frontMatter, body] = match;
  const metadata: Record<string, unknown> = {};
  
  // 解析YAML格式，支持多行数组
  const lines = frontMatter.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];
  
  lines.forEach(line => {
    // 跳过空行和注释
    if (!line.trim() || line.trim().startsWith('#')) {
      return;
    }
    
    // 检查是否是缩进的数组元素（以 "- " 或 "-\t" 开头）
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
    
    // 处理之前累积的数组
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
      // 检查是否是数组开始（值为空表示多行数组）
      if (value === '') {
        currentKey = key;
        currentArray = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // 单行数组格式：[item1, item2]
        try {
          // 尝试直接解析JSON
          metadata[key] = JSON.parse(value);
        } catch {
          try {
            // 尝试解析YAML格式的数组
            const arrayContent = value.substring(1, value.length - 1).trim();
            if (arrayContent) {
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
        // 布尔值 true
        metadata[key] = true;
      } else if (value === 'false') {
        // 布尔值 false
        metadata[key] = false;
      } else if (!isNaN(Number(value))) {
        // 数字类型
        metadata[key] = Number(value);
      } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        // 带引号的字符串，移除引号
        metadata[key] = value.slice(1, -1);
      } else {
        // 普通字符串
        metadata[key] = value;
      }
    }
  });
  
  // 处理最后一个数组（如果存在）
  if (currentKey && currentArray.length > 0) {
    metadata[currentKey] = currentArray;
  }
  
  return { metadata, content: body.trim() };
}

/**
 * 获取开发日志类型对应的Tailwind背景颜色类名
 * @param type 开发日志类型
 * @returns Tailwind背景颜色类名
 */
export function getChangelogTypeColor(type: ChangelogType): string {
  const colorMap: Record<ChangelogType, string> = {
    feature: 'bg-green-500',   // 新功能 - 绿色
    fix: 'bg-red-500',         // 修复问题 - 红色
    refactor: 'bg-blue-500',   // 代码重构 - 蓝色
    docs: 'bg-purple-500',     // 文档更新 - 紫色
    style: 'bg-orange-500',    // 样式调整 - 橙色
    chore: 'bg-gray-500',      // 其他改动 - 灰色
  };
  
  return colorMap[type] || colorMap.chore;
}

/**
 * 获取开发日志类型的中文标签
 * @param type 开发日志类型
 * @returns 中文标签
 */
export function getChangelogTypeLabel(type: ChangelogType): string {
  const labelMap: Record<ChangelogType, string> = {
    feature: '新功能',
    fix: '修复',
    refactor: '重构',
    docs: '文档',
    style: '样式',
    chore: '其他',
  };
  
  return labelMap[type] || labelMap.chore;
}
