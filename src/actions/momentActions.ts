'use server';

/**
 * 动态管理相关的 Server Actions
 * 提供动态的增删改查功能
 */

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';

// 动态数据存储路径
const MOMENTS_DIR = path.join(process.cwd(), 'src', 'content', 'moments');

/**
 * 动态数据接口
 */
export interface MomentData {
  time: string;
  content: string;
  tags?: string[];
  images?: string[];
  pinned?: boolean;
}

/**
 * 动态接口
 */
export interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images: string[];
  pinned: boolean;
}

/**
 * 操作结果接口
 */
export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

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
 * 获取所有动态列表
 */
export async function getMomentList(): Promise<ActionResult<Moment[]>> {
  try {
    await ensureMomentsDir();
    const files = await fs.readdir(MOMENTS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const moments: Moment[] = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(MOMENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        moments.push({
          id: file.replace('.json', ''),
          time: data.time || '',
          content: data.content || '',
          tags: data.tags || [],
          images: data.images || [],
          pinned: data.pinned || false,
        });
      } catch (e) {
        console.error(`读取动态文件失败: ${file}`, e);
      }
    }
    
    // 按时间倒序排列，置顶的在前
    moments.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
    
    return { success: true, message: '获取成功', data: moments };
  } catch (error) {
    console.error('获取动态列表失败:', error);
    return { success: false, message: '获取失败', data: [] };
  }
}

/**
 * 获取单个动态详情
 */
export async function getMomentDetail(id: string): Promise<ActionResult<Moment>> {
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const moment: Moment = {
      id,
      time: data.time || '',
      content: data.content || '',
      tags: data.tags || [],
      images: data.images || [],
      pinned: data.pinned || false,
    };
    
    return { success: true, message: '获取成功', data: moment };
  } catch (error) {
    console.error('获取动态详情失败:', error);
    return { success: false, message: '动态不存在' };
  }
}

/**
 * 创建新动态
 */
export async function createMoment(data: MomentData): Promise<ActionResult<Moment>> {
  try {
    await ensureMomentsDir();
    
    // 生成 ID
    const id = `moment-${Date.now()}`;
    const filePath = path.join(MOMENTS_DIR, `${id}.json`);
    
    const momentData = {
      time: data.time || new Date().toISOString(),
      content: data.content,
      tags: data.tags || [],
      images: data.images || [],
      pinned: data.pinned || false,
    };
    
    await fs.writeFile(filePath, JSON.stringify(momentData, null, 2), 'utf-8');
    
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    const moment: Moment = {
      id,
      ...momentData,
    };
    
    return { success: true, message: '发布成功', data: moment, filePath };
  } catch (error) {
    console.error('创建动态失败:', error);
    return { success: false, message: '发布失败' };
  }
}

/**
 * 更新动态
 */
export async function updateMoment(id: string, data: Partial<MomentData>): Promise<ActionResult<Moment>> {
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.json`);
    
    // 读取现有数据
    let existingData: MomentData = {
      time: '',
      content: '',
      tags: [],
      images: [],
      pinned: false,
    };
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existingData = JSON.parse(content);
    } catch {
      // 文件不存在，使用默认值
    }
    
    // 合并数据
    const updatedData: MomentData = {
      time: data.time ?? existingData.time,
      content: data.content ?? existingData.content,
      tags: data.tags ?? existingData.tags,
      images: data.images ?? existingData.images,
      pinned: data.pinned ?? existingData.pinned,
    };
    
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');
    
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    const moment: Moment = {
      id,
      ...updatedData,
    };
    
    return { success: true, message: '更新成功', data: moment };
  } catch (error) {
    console.error('更新动态失败:', error);
    return { success: false, message: '更新失败' };
  }
}

/**
 * 删除动态
 */
export async function deleteMoment(id: string): Promise<ActionResult> {
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.json`);
    await fs.unlink(filePath);
    
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('删除动态失败:', error);
    return { success: false, message: '删除失败' };
  }
}

/**
 * 批量删除动态
 */
export async function batchDeleteMoments(ids: string[]): Promise<ActionResult> {
  try {
    for (const id of ids) {
      const filePath = path.join(MOMENTS_DIR, `${id}.json`);
      try {
        await fs.unlink(filePath);
      } catch {
        // 忽略不存在的文件
      }
    }
    
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    return { success: true, message: `成功删除 ${ids.length} 条动态` };
  } catch (error) {
    console.error('批量删除动态失败:', error);
    return { success: false, message: '批量删除失败' };
  }
}

/**
 * 切换动态置顶状态
 */
export async function toggleMomentPinned(id: string): Promise<ActionResult<Moment>> {
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    data.pinned = !data.pinned;
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    const moment: Moment = {
      id,
      time: data.time || '',
      content: data.content || '',
      tags: data.tags || [],
      images: data.images || [],
      pinned: data.pinned,
    };
    
    return { success: true, message: data.pinned ? '已置顶' : '已取消置顶', data: moment };
  } catch (error) {
    console.error('切换置顶状态失败:', error);
    return { success: false, message: '操作失败' };
  }
}

/**
 * 批量切换置顶状态
 */
export async function batchToggleMomentPinned(ids: string[], pinned: boolean): Promise<ActionResult> {
  try {
    for (const id of ids) {
      const filePath = path.join(MOMENTS_DIR, `${id}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        data.pinned = pinned;
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch {
        // 忽略不存在的文件
      }
    }
    
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    return { success: true, message: `成功${pinned ? '置顶' : '取消置顶'} ${ids.length} 条动态` };
  } catch (error) {
    console.error('批量切换置顶失败:', error);
    return { success: false, message: '操作失败' };
  }
}

/**
 * 生成新的动态 ID
 */
export async function generateNewMomentId(): Promise<string> {
  return `moment-${Date.now()}`;
}

/**
 * 获取所有标签
 */
export async function getMomentTags(): Promise<string[]> {
  try {
    const result = await getMomentList();
    if (!result.success || !result.data) {
      return [];
    }
    
    const tags = new Set<string>();
    for (const moment of result.data) {
      for (const tag of moment.tags) {
        tags.add(tag);
      }
    }
    
    return Array.from(tags).sort();
  } catch (error) {
    console.error('获取标签失败:', error);
    return [];
  }
}
