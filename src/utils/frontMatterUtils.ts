/**
 * YAML Front Matter 解析工具模块
 * 
 * 使用 gray-matter 库提供统一的 markdown 文件 front matter 解析功能
 * 支持的数据类型：
 * - 字符串（带引号或不带引号）
 * - 数字
 * - 布尔值（true/false）
 * - 数组（单行格式 [item1, item2] 或多行格式）
 * - 对象数组（用于解析复杂结构如 commits）
 */

import matter from 'gray-matter';

/**
 * 从 markdown 文件中解析 YAML front matter
 * 使用 gray-matter 库替代手写解析逻辑，消除与 blogActions.ts 中内嵌解析器的冗余
 * @param content markdown 文件内容
 * @returns 解析后的元数据和正文内容
 */
export function parseFrontMatter(
  content: string
): { metadata: Record<string, unknown>; content: string } {
  // 使用 gray-matter 解析 frontmatter，替代原有的手写 YAML 解析逻辑
  const { data, content: body } = matter(content);

  return {
    metadata: (data || {}) as Record<string, unknown>,
    content: body.trim(),
  };
}
