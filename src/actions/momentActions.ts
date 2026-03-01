'use server';

/**
 * 动态 Server Actions
 * 处理动态的本地文件操作
 */

import { revalidatePath } from 'next/cache';
import { 
  CONTENT_DIRS, 
  readFile, 
  writeFile, 
  deleteFile, 
  listFiles, 
  fileExists 
} from '@/utils/fileOperations';
import { parseFrontMatter } from '@/utils/momentsUtils';
import { generateMomentId } from '@/utils/adminUtils';

/**
 * 动态数据接口
 */
export interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images?: string[];
  pinned?: boolean;
  filePath: string;
}

/**
 * 动态数据接口（用于创建/更新）
 */
export interface MomentData {
  time: string;
  content: string;
  tags?: string[];
  images?: string[];
  pinned?: boolean;
}

/**
 * 操作结果接口
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: Moment | Moment[];
  filePath?: string;
}

/**
 * 将动态内容转换为 Markdown 格式（包含 frontmatter）
 */
function convertToMarkdown(id: string, data: MomentData): string {
  const frontmatter: Record<string, string | string[] | boolean> = {
    id: id,
    time: data.time,
    tags: data.tags || [],
    pinned: data.pinned || false,
  };
  
  if (data.images && data.images.length > 0) {
    frontmatter.images = data.images;
  }
  
  // 构建 frontmatter 字符串
  const frontmatterLines: string[] = ['---'];
  
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === '' || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    
    if (Array.isArray(value)) {
      frontmatterLines.push(`${key}:`);
      value.forEach(item => {
        frontmatterLines.push(`  - "${item}"`);
      });
    } else if (typeof value === 'string') {
      frontmatterLines.push(`${key}: "${value}"`);
    } else if (typeof value === 'boolean') {
      frontmatterLines.push(`${key}: ${value}`);
    }
  }
  
  frontmatterLines.push('---');
  
  return `${frontmatterLines.join('\n')}\n\n${data.content}`;
}

/**
 * 获取动态列表
 * @returns 动态列表
 */
export async function getMomentList(): Promise<ActionResult> {
  try {
    // 确保目录存在
    if (!fileExists(CONTENT_DIRS.moments)) {
      return {
        success: true,
        message: '动态目录不存在',
        data: [],
      };
    }
    
    // 获取所有 .md 文件
    const files = listFiles(CONTENT_DIRS.moments, '.md');
    
    // 解析每个文件
    const moments: Moment[] = [];
    
    for (const file of files) {
      const result = readFile(file.path);
      
      if (result.success && result.data) {
        const { metadata, content } = parseFrontMatter(result.data);
        
        moments.push({
          id: metadata.id || file.name.replace('.md', ''),
          time: metadata.time || '',
          content: content,
          tags: metadata.tags || [],
          images: metadata.images || [],
          pinned: metadata.pinned === 'true' || metadata.pinned === true,
          filePath: file.name,
        });
      }
    }
    
    // 按置顶状态和时间倒序排序
    moments.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
    
    return {
      success: true,
      message: '获取成功',
      data: moments,
    };
  } catch (error) {
    return {
      success: false,
      message: `获取动态列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 获取单个动态详情
 * @param id 动态 ID
 * @returns 动态详情
 */
export async function getMomentDetail(id: string): Promise<ActionResult> {
  try {
    const filePath = `${CONTENT_DIRS.moments}/${id}.md`;
    const result = readFile(filePath);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    const { metadata, content } = parseFrontMatter(result.data!);
    
    const moment: Moment = {
      id: metadata.id || id,
      time: metadata.time || '',
      content: content,
      tags: metadata.tags || [],
      images: metadata.images || [],
      pinned: metadata.pinned === 'true' || metadata.pinned === true,
      filePath: `${id}.md`,
    };
    
    return {
      success: true,
      message: '获取成功',
      data: moment,
    };
  } catch (error) {
    return {
      success: false,
      message: `获取动态详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 创建动态
 * @param data 动态数据
 * @returns 操作结果
 */
export async function createMoment(data: MomentData): Promise<ActionResult> {
  try {
    // 获取现有动态列表以生成唯一 ID
    const existingMoments = await getMomentList();
    const existingIds = existingMoments.success && existingMoments.data 
      ? (existingMoments.data as Moment[]).map(m => m.id)
      : [];
    
    // 生成新的动态 ID
    const id = generateMomentId(existingIds);
    
    // 转换为 Markdown 格式
    const markdownContent = convertToMarkdown(id, data);
    
    // 写入文件
    const filePath = `${CONTENT_DIRS.moments}/${id}.md`;
    const result = writeFile(filePath, markdownContent);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    // 刷新页面缓存
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    return await getMomentDetail(id);
  } catch (error) {
    return {
      success: false,
      message: `创建动态失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 更新动态
 * @param id 动态 ID
 * @param data 动态数据
 * @returns 操作结果
 */
export async function updateMoment(id: string, data: MomentData): Promise<ActionResult> {
  try {
    // 检查动态是否存在
    const existingMoment = await getMomentDetail(id);
    if (!existingMoment.success) {
      return {
        success: false,
        message: '动态不存在',
      };
    }
    
    // 转换为 Markdown 格式
    const markdownContent = convertToMarkdown(id, data);
    
    // 写入文件
    const filePath = `${CONTENT_DIRS.moments}/${id}.md`;
    const result = writeFile(filePath, markdownContent);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    // 刷新页面缓存
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    return await getMomentDetail(id);
  } catch (error) {
    return {
      success: false,
      message: `更新动态失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 删除动态
 * @param id 动态 ID
 * @returns 操作结果
 */
export async function deleteMoment(id: string): Promise<ActionResult> {
  try {
    const filePath = `${CONTENT_DIRS.moments}/${id}.md`;
    const result = deleteFile(filePath);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    // 刷新页面缓存
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    return {
      success: true,
      message: '删除成功',
    };
  } catch (error) {
    return {
      success: false,
      message: `删除动态失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 批量删除动态
 * @param ids 动态 ID 列表
 * @returns 操作结果
 */
export async function batchDeleteMoments(ids: string[]): Promise<ActionResult> {
  try {
    const results: { id: string; success: boolean; message: string }[] = [];
    
    for (const id of ids) {
      const result = await deleteMoment(id);
      results.push({
        id,
        success: result.success,
        message: result.message,
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return {
      success: failCount === 0,
      message: `成功删除 ${successCount} 条动态${failCount > 0 ? `，失败 ${failCount} 条` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `批量删除失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 切换动态置顶状态
 * @param id 动态 ID
 * @returns 操作结果
 */
export async function toggleMomentPinned(id: string): Promise<ActionResult> {
  try {
    // 获取现有动态
    const existingMoment = await getMomentDetail(id);
    if (!existingMoment.success || !existingMoment.data) {
      return {
        success: false,
        message: '动态不存在',
      };
    }
    
    const moment = existingMoment.data as Moment;
    
    // 切换置顶状态
    const updatedData: MomentData = {
      time: moment.time,
      content: moment.content,
      tags: moment.tags,
      images: moment.images,
      pinned: !moment.pinned,
    };
    
    return await updateMoment(id, updatedData);
  } catch (error) {
    return {
      success: false,
      message: `切换置顶状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 批量切换置顶状态
 * @param ids 动态 ID 列表
 * @param pinned 置顶状态
 * @returns 操作结果
 */
export async function batchToggleMomentPinned(ids: string[], pinned: boolean): Promise<ActionResult> {
  try {
    const results: { id: string; success: boolean }[] = [];
    
    for (const id of ids) {
      // 获取现有动态
      const existingMoment = await getMomentDetail(id);
      if (existingMoment.success && existingMoment.data) {
        const moment = existingMoment.data as Moment;
        
        // 更新置顶状态
        const updatedData: MomentData = {
          time: moment.time,
          content: moment.content,
          tags: moment.tags,
          images: moment.images,
          pinned: pinned,
        };
        
        const result = await updateMoment(id, updatedData);
        results.push({ id, success: result.success });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return {
      success: failCount === 0,
      message: `成功${pinned ? '置顶' : '取消置顶'} ${successCount} 条动态${failCount > 0 ? `，失败 ${failCount} 条` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `批量操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 获取所有标签
 * @returns 标签列表
 */
export async function getMomentTags(): Promise<string[]> {
  try {
    const result = await getMomentList();
    if (!result.success || !result.data) {
      return [];
    }
    
    const moments = result.data as Moment[];
    const tags = new Set(moments.flatMap(moment => moment.tags));
    return Array.from(tags);
  } catch {
    return [];
  }
}

/**
 * 生成新的动态 ID
 * @returns 新的动态 ID
 */
export async function generateNewMomentId(): Promise<string> {
  try {
    const existingMoments = await getMomentList();
    const existingIds = existingMoments.success && existingMoments.data
      ? (existingMoments.data as Moment[]).map(m => m.id)
      : [];
    
    return generateMomentId(existingIds);
  } catch {
    return '000001';
  }
}
