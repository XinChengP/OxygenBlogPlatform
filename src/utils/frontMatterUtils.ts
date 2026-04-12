/**
 * YAML Front Matter 解析工具模块
 * 
 * 提供统一的 markdown 文件 front matter 解析功能
 * 支持的数据类型：
 * - 字符串（带引号或不带引号）
 * - 数字
 * - 布尔值（true/false）
 * - 数组（单行格式 [item1, item2] 或多行格式）
 * - 对象数组（用于解析复杂结构如 commits）
 */

/**
 * 从 markdown 文件中解析 YAML front matter
 * 
 * @param content markdown 文件内容
 * @returns 解析后的元数据和正文内容
 */
export function parseFrontMatter(
  content: string
): { metadata: Record<string, unknown>; content: string } {
  // 处理不同的换行符，统一转换为 \n
  const normalizedContent = content.replace(/\r\n/g, '\n');

  // 使用正则表达式匹配 YAML 前置元数据
  // 匹配格式：---\n元数据\n---\n正文内容
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = normalizedContent.match(frontMatterRegex);

  // 如果没有匹配到 front matter，返回空元数据和原始内容
  if (!match) {
    return { metadata: {}, content };
  }

  const [, frontMatter, body] = match;
  const metadata: Record<string, unknown> = {};

  // 解析 YAML 格式，支持多行数组和对象数组
  const lines = frontMatter.split('\n');
  let currentKey: string | null = null;
  let currentArray: unknown[] = [];
  let currentObject: Record<string, string> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过空行和注释
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const trimmedLine = line.trim();
    const indent = line.length - line.trimStart().length;

    // 检查是否是数组元素（以 "- " 开头）
    if (trimmedLine.startsWith('- ')) {
      const value = trimmedLine.substring(2).trim();

      // 检查是否是对象数组的开始（形如 "- name: value"，且 value 不为空）
      // 排除字符串数组元素（如 - "feat: xxx"）的情况
      if (currentKey && value.includes(':') && !value.startsWith('"') && !value.startsWith('\'')) {
        // 开始一个新的对象
        currentObject = {};
        const colonIndex = value.indexOf(':');
        const objKey = value.substring(0, colonIndex).trim();
        let objValue = value.substring(colonIndex + 1).trim();
        // 移除引号
        if ((objValue.startsWith('"') && objValue.endsWith('"')) ||
            (objValue.startsWith('\'') && objValue.endsWith('\''))) {
          objValue = objValue.slice(1, -1);
        }
        currentObject[objKey] = objValue;

        // 检查后续行是否还有该对象的属性
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          const nextTrimmed = nextLine.trim();
          const nextIndent = nextLine.length - nextLine.trimStart().length;

          // 如果遇到新的数组元素或新的键值对，停止
          if (nextTrimmed.startsWith('- ') || (nextIndent <= indent && nextTrimmed.includes(':'))) {
            break;
          }

          // 如果是当前对象的属性（缩进更大）
          if (nextIndent > indent && nextTrimmed.includes(':')) {
            const nextColonIndex = nextTrimmed.indexOf(':');
            const nextObjKey = nextTrimmed.substring(0, nextColonIndex).trim();
            let nextObjValue = nextTrimmed.substring(nextColonIndex + 1).trim();
            // 移除引号
            if ((nextObjValue.startsWith('"') && nextObjValue.endsWith('"')) ||
                (nextObjValue.startsWith('\'') && nextObjValue.endsWith('\''))) {
              nextObjValue = nextObjValue.slice(1, -1);
            }
            if (currentObject) {
              currentObject[nextObjKey] = nextObjValue;
            }
            j++;
          } else {
            break;
          }
        }

        if (currentObject && Object.keys(currentObject).length > 0) {
          currentArray.push(currentObject);
        }
        currentObject = null;
        i = j - 1; // 更新索引
        continue;
      }

      // 处理普通字符串数组元素
      let processedValue = value;
      // 移除引号
      if ((processedValue.startsWith('"') && processedValue.endsWith('"')) ||
          (processedValue.startsWith('\'') && processedValue.endsWith('\''))) {
        processedValue = processedValue.slice(1, -1);
      }
      currentArray.push(processedValue);
      continue;
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
      continue;
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
          // 尝试直接解析 JSON
          metadata[key] = JSON.parse(value);
        } catch {
          try {
            // 尝试解析 YAML 格式的数组
            const arrayContent = value.substring(1, value.length - 1).trim();
            if (arrayContent) {
              const elements = arrayContent.split(',').map(item => {
                const trimmed = item.trim();
                // 移除引号
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                    (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
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
      } else if ((value.startsWith('"') && value.endsWith('"')) ||
                 (value.startsWith('\'') && value.endsWith('\''))) {
        // 带引号的字符串，移除引号
        metadata[key] = value.slice(1, -1);
      } else {
        // 普通字符串
        metadata[key] = value;
      }
    }
  }

  // 处理最后一个数组（如果存在）
  if (currentKey && currentArray.length > 0) {
    metadata[currentKey] = currentArray;
  }

  return { metadata, content: body.trim() };
}
