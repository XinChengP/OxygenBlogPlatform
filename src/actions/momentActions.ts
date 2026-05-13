/**
 * 动态管理相关的 Server Actions
 * 提供动态的增删改查功能
 * 动态文件使用 Markdown 格式存储（带 frontmatter）
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

'use server';

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
export interface MomentData {
  time: string;
  content: string;
  tags?: string[];
  images?: string[];
  pinned?: boolean;
  hidden?: boolean; // 隐藏状态，true 表示该动态被隐藏，前台不显示
}

export interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images: string[];
  pinned: boolean;
  hidden: boolean; // 隐藏状态，true 表示该动态被隐藏，前台不显示
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

// ============================================
// 本地开发模式：真实实现
// ============================================

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

// 动态文件存储目录
const MOMENTS_DIR = path.join(process.cwd(), 'src', 'content', 'moments');

/**
 * 确保动态目录存在
 */
async function ensureMomentsDir(): Promise<void> {
  try {
    await fs.access(MOMENTS_DIR);
  } catch {
    await fs.mkdir(MOMENTS_DIR, { recursive: true });
  }
}

/**
 * 解析 frontmatter
 * @param content Markdown 文件内容
 * @returns 解析后的 frontmatter 和正文
 */
function parseFrontMatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter: Record<string, unknown> = {};

  // 解析 YAML 格式的 frontmatter
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: unknown = line.slice(colonIndex + 1).trim();

      // 移除引号
      if (typeof value === 'string') {
        value = value.replace(/^["']|["']$/g, '');

        // 解析数组格式
        if ((value as string).startsWith('[') && (value as string).endsWith(']')) {
          try {
            value = JSON.parse((value as string).replace(/'/g, '"'));
          } catch {
            // 保持原字符串
          }
        }

        // 解析布尔值
        if (value === 'true') value = true;
        if (value === 'false') value = false;
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * 生成 frontmatter 字符串
 * @param data 动态数据
 * @returns frontmatter 字符串
 */
function generateFrontMatter(data: MomentData): string {
  const lines = ['---'];

  lines.push(`time: "${data.time}"`);

  if (data.pinned) {
    lines.push('pinned: true');
  }

  if (data.hidden) {
    lines.push('hidden: true');
  }

  if (data.tags && data.tags.length > 0) {
    lines.push(`tags: [${data.tags.map((tag) => `"${tag}"`).join(', ')}]`);
  }

  if (data.images && data.images.length > 0) {
    lines.push(`images: [${data.images.map((img) => `"${img}"`).join(', ')}]`);
  }

  lines.push('---');

  return lines.join('\n');
}

/**
 * 获取所有动态文件列表
 * @returns 文件名数组
 */
async function getMomentFiles(): Promise<string[]> {
  // 静态导出模式下返回空数组
  if (isStaticExport) {
    return [];
  }
  
  try {
    await ensureMomentsDir();
    const files = await fs.readdir(MOMENTS_DIR);
    return files.filter((file) => file.endsWith('.md')).sort();
  } catch {
    return [];
  }
}

/**
 * 从文件名提取 ID
 * @param filename 文件名
 * @returns ID 字符串
 */
function extractIdFromFilename(filename: string): string {
  return filename.replace('.md', '');
}

/**
 * 读取动态文件内容
 * @param id 动态 ID
 * @returns 动态数据
 */
async function readMomentFile(id: string): Promise<Moment | null> {
  // 静态导出模式下返回 null
  if (isStaticExport) {
    return null;
  }
  
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontMatter(content);

    return {
      id,
      time: (frontmatter.time as string) || '',
      content: body.trim(),
      tags: (frontmatter.tags as string[]) || [],
      images: (frontmatter.images as string[]) || [],
      pinned: (frontmatter.pinned as boolean) || false,
      hidden: (frontmatter.hidden as boolean) || false,
    };
  } catch {
    return null;
  }
}

/**
 * 写入动态文件
 * @param id 动态 ID
 * @param data 动态数据
 */
async function writeMomentFile(id: string, data: MomentData): Promise<void> {
  // 静态导出模式下不执行写入
  if (isStaticExport) {
    return;
  }
  
  await ensureMomentsDir();
  const filePath = path.join(MOMENTS_DIR, `${id}.md`);
  const frontmatter = generateFrontMatter(data);
  const content = `${frontmatter}\n\n${data.content}`;
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * 删除动态文件
 * @param id 动态 ID
 */
async function deleteMomentFile(id: string): Promise<void> {
  // 静态导出模式下不执行删除
  if (isStaticExport) {
    return;
  }
  
  const filePath = path.join(MOMENTS_DIR, `${id}.md`);
  await fs.unlink(filePath);
}

/**
 * 生成新的动态 ID
 * @returns 新的 6 位数字 ID
 */
export async function generateNewMomentId(): Promise<string> {
  // 静态导出模式下返回默认 ID
  if (isStaticExport) {
    return '000001';
  }
  
  const files = await getMomentFiles();
  const ids = files.map((file) => parseInt(extractIdFromFilename(file), 10));
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return (maxId + 1).toString().padStart(6, '0');
}

/**
 * 获取动态列表
 * @returns 动态列表
 */
export async function getMomentList(): Promise<ActionResult<Moment[]>> {
  // 静态导出模式下返回空数组
  if (isStaticExport) {
    return {
      success: true,
      message: 'Static export mode',
      data: [],
    };
  }
  
  try {
    const files = await getMomentFiles();
    const moments: Moment[] = [];

    for (const file of files) {
      const id = extractIdFromFilename(file);
      const moment = await readMomentFile(id);
      if (moment) {
        moments.push(moment);
      }
    }

    // 按时间倒序排列，置顶动态优先
    moments.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    return {
      success: true,
      message: 'Success',
      data: moments,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
}

/**
 * 获取动态详情
 * @param id 动态 ID
 * @returns 动态详情
 */
export async function getMomentDetail(id: string): Promise<ActionResult<Moment>> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    const moment = await readMomentFile(id);

    if (!moment) {
      return {
        success: false,
        message: 'Moment not found',
      };
    }

    return {
      success: true,
      message: 'Success',
      data: moment,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 创建动态
 * @param data 动态数据
 * @returns 创建的动态
 */
export async function createMoment(data: MomentData): Promise<ActionResult<Moment>> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    if (!data.content || data.content.trim() === '') {
      return {
        success: false,
        message: 'Content cannot be empty',
      };
    }

    if (!data.time) {
      return {
        success: false,
        message: 'Time cannot be empty',
      };
    }

    const id = await generateNewMomentId();

    const newMoment: Moment = {
      id,
      time: data.time,
      content: data.content.trim(),
      tags: data.tags || [],
      images: data.images || [],
      pinned: data.pinned || false,
      hidden: data.hidden || false,
    };

    await writeMomentFile(id, {
      time: newMoment.time,
      content: newMoment.content,
      tags: newMoment.tags,
      images: newMoment.images,
      pinned: newMoment.pinned,
      hidden: newMoment.hidden,
    });

    // 重新验证相关页面
    revalidatePath('/admin/moments');
    revalidatePath('/moments');

    return {
      success: true,
      message: 'Created successfully',
      data: newMoment,
      filePath: `src/content/moments/${id}.md`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 更新动态
 * @param id 动态 ID
 * @param data 更新的数据
 * @returns 更新后的动态
 */
export async function updateMoment(
  id: string,
  data: Partial<MomentData>
): Promise<ActionResult<Moment>> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    const existingMoment = await readMomentFile(id);

    if (!existingMoment) {
      return {
        success: false,
        message: 'Moment not found',
      };
    }

    const updatedData: MomentData = {
      time: data.time ?? existingMoment.time,
      content: data.content ?? existingMoment.content,
      tags: data.tags ?? existingMoment.tags,
      images: data.images ?? existingMoment.images,
      pinned: data.pinned ?? existingMoment.pinned,
      hidden: data.hidden ?? existingMoment.hidden,
    };

    await writeMomentFile(id, updatedData);

    const updatedMoment: Moment = {
      id,
      time: updatedData.time,
      content: updatedData.content,
      tags: updatedData.tags || [],
      images: updatedData.images || [],
      pinned: updatedData.pinned || false,
      hidden: updatedData.hidden || false,
    };

    // 重新验证相关页面
    revalidatePath('/admin/moments');
    revalidatePath('/moments');

    return {
      success: true,
      message: 'Updated successfully',
      data: updatedMoment,
      filePath: `src/content/moments/${id}.md`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 删除动态
 * @param id 动态 ID
 * @returns 操作结果
 */
export async function deleteMoment(id: string): Promise<ActionResult> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    const existingMoment = await readMomentFile(id);

    if (!existingMoment) {
      return {
        success: false,
        message: 'Moment not found',
      };
    }

    await deleteMomentFile(id);

    // 重新验证相关页面
    revalidatePath('/admin/moments');
    revalidatePath('/moments');

    return {
      success: true,
      message: 'Deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 批量删除动态
 * @param ids 动态 ID 数组
 * @returns 操作结果
 */
export async function batchDeleteMoments(ids: string[]): Promise<ActionResult> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: 'No moments selected',
      };
    }

    let deletedCount = 0;
    for (const id of ids) {
      const existingMoment = await readMomentFile(id);
      if (existingMoment) {
        await deleteMomentFile(id);
        deletedCount++;
      }
    }

    // 重新验证相关页面
    revalidatePath('/admin/moments');
    revalidatePath('/moments');

    return {
      success: true,
      message: `Successfully deleted ${deletedCount} moments`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 切换动态置顶状态
 * @param id 动态 ID
 * @returns 更新后的动态
 */
export async function toggleMomentPinned(id: string): Promise<ActionResult<Moment>> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    const existingMoment = await readMomentFile(id);

    if (!existingMoment) {
      return {
        success: false,
        message: 'Moment not found',
      };
    }

    const updatedMoment = await updateMoment(id, {
      pinned: !existingMoment.pinned,
    });

    return updatedMoment;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 批量切换动态置顶状态
 * @param ids 动态 ID 数组
 * @param pinned 置顶状态
 * @returns 操作结果
 */
export async function batchToggleMomentPinned(
  ids: string[],
  pinned: boolean
): Promise<ActionResult> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: 'No moments selected',
      };
    }

    let updatedCount = 0;
    for (const id of ids) {
      const existingMoment = await readMomentFile(id);
      if (existingMoment) {
        await writeMomentFile(id, {
          time: existingMoment.time,
          content: existingMoment.content,
          tags: existingMoment.tags,
          images: existingMoment.images,
          pinned,
          hidden: existingMoment.hidden,
        });
        updatedCount++;
      }
    }

    // 重新验证相关页面
    revalidatePath('/admin/moments');
    revalidatePath('/moments');

    return {
      success: true,
      message: `Successfully ${pinned ? 'pinned' : 'unpinned'} ${updatedCount} moments`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取所有标签
 * @returns 标签列表
 */
export async function getMomentTags(): Promise<string[]> {
  // 静态导出模式下返回空数组
  if (isStaticExport) {
    return [];
  }
  
  try {
    const result = await getMomentList();
    if (!result.success || !result.data) {
      return [];
    }

    const tagSet = new Set<string>();
    for (const moment of result.data) {
      if (moment.tags) {
        for (const tag of moment.tags) {
          tagSet.add(tag);
        }
      }
    }

    return Array.from(tagSet).sort();
  } catch {
    return [];
  }
}

/**
 * 切换动态隐藏状态
 * @param id 动态 ID
 * @returns 更新后的动态
 */
export async function toggleMomentHidden(id: string): Promise<ActionResult<Moment>> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    const existingMoment = await readMomentFile(id);

    if (!existingMoment) {
      return {
        success: false,
        message: 'Moment not found',
      };
    }

    const updatedMoment = await updateMoment(id, {
      hidden: !existingMoment.hidden,
    });

    return updatedMoment;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 批量切换动态隐藏状态
 * @param ids 动态 ID 数组
 * @param hidden 隐藏状态
 * @returns 操作结果
 */
export async function batchToggleMomentHidden(
  ids: string[],
  hidden: boolean
): Promise<ActionResult> {
  // 静态导出模式下返回错误
  if (isStaticExport) {
    return {
      success: false,
      message: 'Static export mode does not support this feature',
    };
  }
  
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: 'No moments selected',
      };
    }

    let updatedCount = 0;
    for (const id of ids) {
      const existingMoment = await readMomentFile(id);
      if (existingMoment) {
        await writeMomentFile(id, {
          time: existingMoment.time,
          content: existingMoment.content,
          tags: existingMoment.tags,
          images: existingMoment.images,
          pinned: existingMoment.pinned,
          hidden,
        });
        updatedCount++;
      }
    }

    // 重新验证相关页面
    revalidatePath('/admin/moments');
    revalidatePath('/moments');

    return {
      success: true,
      message: `Successfully ${hidden ? 'hidden' : 'shown'} ${updatedCount} moments`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
