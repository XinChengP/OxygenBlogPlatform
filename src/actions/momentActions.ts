'use server';

/**
 * 动态管理相关的 Server Actions
 * 提供动态的增删改查功能
 * 动态文件使用 Markdown 格式存储（带 frontmatter）
 */

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';

// 动态数据存储路径
const MOMENTS_DIR = path.join(process.cwd(), 'src', 'content', 'moments');

/**
 * 动态数据接口
 * 用于创建和更新动态时传递的数据结构
 */
export interface MomentData {
  time: string;
  content: string;
  tags?: string[];
  images?: string[];
  pinned?: boolean;
  hidden?: boolean; // 隐藏状态，true 表示该动态被隐藏，前台不显示
}

/**
 * 动态接口
 * 完整的动态数据结构，包含所有字段
 */
export interface Moment {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images: string[];
  pinned: boolean;
  hidden: boolean; // 隐藏状态，true 表示该动态被隐藏，前台不显示
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
 * 解析 Markdown frontmatter
 * 将 Markdown 文件中的 YAML 格式的 frontmatter 解析为对象
 * 支持解析普通字段、数组字段以及布尔值字段（如 pinned、hidden）
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter: Record<string, any> = {};
  
  // 简单的 YAML 解析
  const lines = frontmatterStr.split('\n');
  let currentKey = '';
  let currentArray: string[] | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // 检查是否是数组项
    if (trimmed.startsWith('- ')) {
      if (currentArray !== null) {
        currentArray.push(trimmed.substring(2).replace(/"/g, ''));
      }
      continue;
    }
    
    // 检查是否是键值对
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      // 检查是否是数组开始
      if (value === '') {
        currentKey = key;
        currentArray = [];
        frontmatter[key] = currentArray;
      } else {
        currentKey = key;
        currentArray = null;
        // 移除引号
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  // 处理布尔值字段：将字符串 'true'/'false' 转换为布尔值
  // pinned 字段：置顶状态
  if (frontmatter.pinned !== undefined) {
    frontmatter.pinned = frontmatter.pinned === true || frontmatter.pinned === 'true';
  }
  // hidden 字段：隐藏状态
  if (frontmatter.hidden !== undefined) {
    frontmatter.hidden = frontmatter.hidden === true || frontmatter.hidden === 'true';
  }
  
  return { frontmatter, body };
}

/**
 * 生成 frontmatter 字符串
 * 将数据对象转换为 YAML 格式的 frontmatter 字符串
 * 注意：布尔值字段（如 pinned、hidden）仅在值为 true 时才写入，避免冗余
 */
function generateFrontmatter(data: Record<string, any>): string {
  let result = '---\n';
  
  for (const [key, value] of Object.entries(data)) {
    // 处理数组类型字段（如 tags、images）
    if (Array.isArray(value)) {
      if (value.length > 0) {
        result += `${key}:\n`;
        for (const item of value) {
          result += `  - "${item}"\n`;
        }
      }
    } 
    // 处理布尔值字段：pinned 和 hidden 仅在值为 true 时才写入
    // 这样可以保持文件的简洁性，避免写入不必要的 false 值
    else if (key === 'pinned' || key === 'hidden') {
      if (value === true) {
        result += `${key}: true\n`;
      }
      // 值为 false 时不写入，保持文件简洁
    }
    // 处理其他普通字段（字符串、数字等）
    else if (value !== undefined && value !== null && value !== '') {
      result += `${key}: "${value}"\n`;
    }
  }
  
  result += '---\n';
  return result;
}

/**
 * 获取所有动态列表
 * 返回所有动态数据，包括隐藏的动态（后台管理需要显示所有动态）
 * 按时间倒序排列，置顶的动态优先显示
 */
export async function getMomentList(): Promise<ActionResult<Moment[]>> {
  try {
    await ensureMomentsDir();
    const files = await fs.readdir(MOMENTS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const moments: Moment[] = [];
    
    for (const file of mdFiles) {
      try {
        const filePath = path.join(MOMENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        
        // 构建动态对象，包含所有必要字段
        // hidden 字段默认为 false，只有明确设置为 true 时才为隐藏状态
        moments.push({
          id: frontmatter.id || file.replace('.md', ''),
          time: frontmatter.time || '',
          content: body.trim(),
          tags: frontmatter.tags || [],
          images: frontmatter.images || [],
          pinned: frontmatter.pinned === true, // parseFrontmatter 已处理布尔值转换
          hidden: frontmatter.hidden === true, // 隐藏状态，默认为 false
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
 * 根据动态 ID 获取完整的动态信息
 * 支持 .md 和 .json 两种文件格式
 */
export async function getMomentDetail(id: string): Promise<ActionResult<Moment>> {
  try {
    // 尝试多种文件名格式
    const possibleFiles = [
      path.join(MOMENTS_DIR, `${id}.md`),
      path.join(MOMENTS_DIR, `${id}.json`),
    ];
    
    let filePath = '';
    let content = '';
    
    for (const fp of possibleFiles) {
      try {
        content = await fs.readFile(fp, 'utf-8');
        filePath = fp;
        break;
      } catch {
        continue;
      }
    }
    
    if (!content) {
      return { success: false, message: '动态不存在' };
    }
    
    // 根据文件扩展名解析
    const ext = path.extname(filePath);
    let data: any = {};
    
    if (ext === '.md') {
      const { frontmatter, body } = parseFrontmatter(content);
      data = { ...frontmatter, content: body.trim() };
    } else {
      data = JSON.parse(content);
    }
    
    // 构建动态对象，包含所有必要字段
    // hidden 字段默认为 false，只有明确设置为 true 时才为隐藏状态
    const moment: Moment = {
      id: data.id || id,
      time: data.time || '',
      content: data.content || '',
      tags: data.tags || [],
      images: data.images || [],
      pinned: data.pinned === true, // parseFrontmatter 已处理布尔值转换
      hidden: data.hidden === true, // 隐藏状态，默认为 false
    };
    
    return { success: true, message: '获取成功', data: moment };
  } catch (error) {
    console.error('获取动态详情失败:', error);
    return { success: false, message: '动态不存在' };
  }
}

/**
 * 创建新动态
 * 自动生成 6 位数字 ID，创建 Markdown 格式的动态文件
 * 支持 hidden 属性，可创建隐藏状态的动态
 */
export async function createMoment(data: MomentData): Promise<ActionResult<Moment>> {
  try {
    await ensureMomentsDir();
    
    // 生成 ID（6位数字）
    // 查找现有文件中最大的数字 ID，然后加 1
    const existingFiles = await fs.readdir(MOMENTS_DIR);
    const existingIds = existingFiles
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .filter(id => /^\d+$/.test(id))
      .map(id => parseInt(id, 10));
    
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newId = String(maxId + 1).padStart(6, '0');
    
    const filePath = path.join(MOMENTS_DIR, `${newId}.md`);
    
    // 生成 Markdown 内容
    // frontmatter 包含 id、time、tags、images、pinned、hidden 等字段
    const frontmatter = generateFrontmatter({
      id: newId,
      time: data.time || new Date().toISOString().replace('T', ' ').substring(0, 19),
      tags: data.tags || [],
      images: data.images || [],
      pinned: data.pinned || false,
      hidden: data.hidden || false, // 隐藏状态，默认为 false
    });
    
    const markdownContent = frontmatter + '\n' + (data.content || '');
    
    await fs.writeFile(filePath, markdownContent, 'utf-8');
    
    // 清除相关页面的缓存
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    // 构建并返回新创建的动态对象
    const moment: Moment = {
      id: newId,
      time: data.time || '',
      content: data.content || '',
      tags: data.tags || [],
      images: data.images || [],
      pinned: data.pinned || false,
      hidden: data.hidden || false, // 隐藏状态，默认为 false
    };
    
    return { success: true, message: '发布成功', data: moment, filePath };
  } catch (error) {
    console.error('创建动态失败:', error);
    return { success: false, message: '发布失败' };
  }
}

/**
 * 更新动态
 * 支持部分更新，只更新传入的字段，其他字段保持不变
 * 支持 hidden 属性的更新
 */
export async function updateMoment(id: string, data: Partial<MomentData>): Promise<ActionResult<Moment>> {
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.md`);
    
    // 读取现有数据
    let existingData: MomentData = {
      time: '',
      content: '',
      tags: [],
      images: [],
      pinned: false,
      hidden: false, // 默认隐藏状态为 false
    };
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      existingData = {
        time: frontmatter.time || '',
        content: body.trim(),
        tags: frontmatter.tags || [],
        images: frontmatter.images || [],
        pinned: frontmatter.pinned === true, // parseFrontmatter 已处理布尔值转换
        hidden: frontmatter.hidden === true, // 隐藏状态，默认为 false
      };
    } catch {
      // 文件不存在，使用默认值
    }
    
    // 合并数据：使用传入的新值覆盖现有值
    const updatedData: MomentData = {
      time: data.time ?? existingData.time,
      content: data.content ?? existingData.content,
      tags: data.tags ?? existingData.tags,
      images: data.images ?? existingData.images,
      pinned: data.pinned ?? existingData.pinned,
      hidden: data.hidden ?? existingData.hidden, // 合并隐藏状态
    };
    
    // 生成 Markdown 内容
    const frontmatter = generateFrontmatter({
      id,
      time: updatedData.time,
      tags: updatedData.tags,
      images: updatedData.images,
      pinned: updatedData.pinned,
      hidden: updatedData.hidden, // 包含隐藏状态
    });
    
    const markdownContent = frontmatter + '\n' + (updatedData.content || '');
    
    await fs.writeFile(filePath, markdownContent, 'utf-8');
    
    // 清除相关页面的缓存
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    // 构建并返回更新后的动态对象
    const moment: Moment = {
      id,
      time: updatedData.time || '',
      content: updatedData.content || '',
      tags: updatedData.tags || [],
      images: updatedData.images || [],
      pinned: updatedData.pinned || false,
      hidden: updatedData.hidden || false, // 隐藏状态
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
    // 尝试删除 .md 文件
    const mdPath = path.join(MOMENTS_DIR, `${id}.md`);
    try {
      await fs.unlink(mdPath);
    } catch {
      // 尝试删除 .json 文件
      const jsonPath = path.join(MOMENTS_DIR, `${id}.json`);
      try {
        await fs.unlink(jsonPath);
      } catch {
        // 文件不存在
      }
    }
    
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
      await deleteMoment(id);
    }
    
    return { success: true, message: `成功删除 ${ids.length} 条动态` };
  } catch (error) {
    console.error('批量删除动态失败:', error);
    return { success: false, message: '批量删除失败' };
  }
}

/**
 * 切换动态置顶状态
 * 切换单条动态的置顶状态，同时保留其他字段（包括 hidden）
 */
export async function toggleMomentPinned(id: string): Promise<ActionResult<Moment>> {
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    
    const newPinned = !(frontmatter.pinned === true);
    
    // 生成新的 frontmatter，保留所有字段（包括 hidden）
    const newFrontmatter = generateFrontmatter({
      id,
      time: frontmatter.time,
      tags: frontmatter.tags || [],
      images: frontmatter.images || [],
      pinned: newPinned,
      hidden: frontmatter.hidden === true, // 保留原有的隐藏状态
    });
    
    const markdownContent = newFrontmatter + '\n' + body;
    
    await fs.writeFile(filePath, markdownContent, 'utf-8');
    
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    const moment: Moment = {
      id,
      time: frontmatter.time || '',
      content: body.trim(),
      tags: frontmatter.tags || [],
      images: frontmatter.images || [],
      pinned: newPinned,
      hidden: frontmatter.hidden === true, // 返回隐藏状态
    };
    
    return { success: true, message: newPinned ? '已置顶' : '已取消置顶', data: moment };
  } catch (error) {
    console.error('切换置顶状态失败:', error);
    return { success: false, message: '操作失败' };
  }
}

/**
 * 批量切换置顶状态
 * 批量设置多条动态的置顶状态，同时保留其他字段（包括 hidden）
 */
export async function batchToggleMomentPinned(ids: string[], pinned: boolean): Promise<ActionResult> {
  try {
    for (const id of ids) {
      const filePath = path.join(MOMENTS_DIR, `${id}.md`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        
        // 生成新的 frontmatter，保留所有字段（包括 hidden）
        const newFrontmatter = generateFrontmatter({
          id,
          time: frontmatter.time,
          tags: frontmatter.tags || [],
          images: frontmatter.images || [],
          pinned,
          hidden: frontmatter.hidden === true, // 保留原有的隐藏状态
        });
        
        const markdownContent = newFrontmatter + '\n' + body;
        await fs.writeFile(filePath, markdownContent, 'utf-8');
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
  try {
    await ensureMomentsDir();
    const existingFiles = await fs.readdir(MOMENTS_DIR);
    const existingIds = existingFiles
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .filter(id => /^\d+$/.test(id))
      .map(id => parseInt(id, 10));
    
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return String(maxId + 1).padStart(6, '0');
  } catch {
    return '000001';
  }
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

/**
 * 切换动态隐藏状态
 * 切换单条动态的隐藏状态，隐藏的动态在前台不显示
 * 同时保留其他字段（包括 pinned）
 */
export async function toggleMomentHidden(id: string): Promise<ActionResult<Moment>> {
  try {
    const filePath = path.join(MOMENTS_DIR, `${id}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    
    // 切换隐藏状态：如果当前是隐藏则取消隐藏，否则设为隐藏
    const newHidden = !(frontmatter.hidden === true);
    
    // 生成新的 frontmatter，保留所有字段（包括 pinned）
    const newFrontmatter = generateFrontmatter({
      id,
      time: frontmatter.time,
      tags: frontmatter.tags || [],
      images: frontmatter.images || [],
      pinned: frontmatter.pinned === true, // 保留原有的置顶状态
      hidden: newHidden, // 新的隐藏状态
    });
    
    const markdownContent = newFrontmatter + '\n' + body;
    
    await fs.writeFile(filePath, markdownContent, 'utf-8');
    
    // 清除相关页面的缓存
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    // 构建并返回更新后的动态对象
    const moment: Moment = {
      id,
      time: frontmatter.time || '',
      content: body.trim(),
      tags: frontmatter.tags || [],
      images: frontmatter.images || [],
      pinned: frontmatter.pinned === true, // 返回置顶状态
      hidden: newHidden, // 返回新的隐藏状态
    };
    
    return { success: true, message: newHidden ? '已隐藏' : '已取消隐藏', data: moment };
  } catch (error) {
    console.error('切换隐藏状态失败:', error);
    return { success: false, message: '操作失败' };
  }
}

/**
 * 批量切换隐藏状态
 * 批量设置多条动态的隐藏状态，隐藏的动态在前台不显示
 * 同时保留其他字段（包括 pinned）
 */
export async function batchToggleMomentHidden(ids: string[], hidden: boolean): Promise<ActionResult> {
  try {
    for (const id of ids) {
      const filePath = path.join(MOMENTS_DIR, `${id}.md`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        
        // 生成新的 frontmatter，保留所有字段（包括 pinned）
        const newFrontmatter = generateFrontmatter({
          id,
          time: frontmatter.time,
          tags: frontmatter.tags || [],
          images: frontmatter.images || [],
          pinned: frontmatter.pinned === true, // 保留原有的置顶状态
          hidden, // 新的隐藏状态
        });
        
        const markdownContent = newFrontmatter + '\n' + body;
        await fs.writeFile(filePath, markdownContent, 'utf-8');
      } catch {
        // 忽略不存在的文件
      }
    }
    
    // 清除相关页面的缓存
    revalidatePath('/admin/moments');
    revalidatePath('/moments');
    
    return { success: true, message: `成功${hidden ? '隐藏' : '取消隐藏'} ${ids.length} 条动态` };
  } catch (error) {
    console.error('批量切换隐藏状态失败:', error);
    return { success: false, message: '操作失败' };
  }
}
