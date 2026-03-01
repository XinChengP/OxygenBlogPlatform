/**
 * 文件操作工具函数
 * 用于服务端文件系统的读写操作
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 项目根目录
 */
const PROJECT_ROOT = process.cwd();

/**
 * 内容目录路径
 */
export const CONTENT_DIRS = {
  blogs: path.join(PROJECT_ROOT, 'src', 'content', 'blogs'),
  moments: path.join(PROJECT_ROOT, 'src', 'content', 'moments'),
} as const;

/**
 * 文件操作结果接口
 */
export interface FileResult {
  success: boolean;
  message: string;
  data?: string;
  filePath?: string;
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

/**
 * 确保目录存在
 * @param dirPath 目录路径
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 读取文件内容
 * @param filePath 文件路径
 * @returns 文件内容或错误信息
 */
export function readFile(filePath: string): FileResult {
  try {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(PROJECT_ROOT, filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return {
        success: false,
        message: `文件不存在: ${filePath}`,
      };
    }
    
    const content = fs.readFileSync(absolutePath, 'utf-8');
    return {
      success: true,
      message: '读取成功',
      data: content,
      filePath: absolutePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 写入文件内容
 * @param filePath 文件路径
 * @param content 文件内容
 * @returns 操作结果
 */
export function writeFile(filePath: string, content: string): FileResult {
  try {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(PROJECT_ROOT, filePath);
    
    // 确保目录存在
    const dir = path.dirname(absolutePath);
    ensureDir(dir);
    
    fs.writeFileSync(absolutePath, content, 'utf-8');
    
    return {
      success: true,
      message: '写入成功',
      filePath: absolutePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `写入文件失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 删除文件
 * @param filePath 文件路径
 * @returns 操作结果
 */
export function deleteFile(filePath: string): FileResult {
  try {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(PROJECT_ROOT, filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return {
        success: false,
        message: `文件不存在: ${filePath}`,
      };
    }
    
    fs.unlinkSync(absolutePath);
    
    return {
      success: true,
      message: '删除成功',
      filePath: absolutePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 列出目录中的文件
 * @param dirPath 目录路径
 * @param extension 文件扩展名过滤（可选）
 * @returns 文件列表
 */
export function listFiles(dirPath: string, extension?: string): FileInfo[] {
  try {
    const absolutePath = path.isAbsolute(dirPath) 
      ? dirPath 
      : path.join(PROJECT_ROOT, dirPath);
    
    if (!fs.existsSync(absolutePath)) {
      return [];
    }
    
    const items = fs.readdirSync(absolutePath);
    
    return items
      .filter(item => {
        const itemPath = path.join(absolutePath, item);
        const stat = fs.statSync(itemPath);
        
        // 如果指定了扩展名，只返回匹配的文件
        if (extension && !stat.isDirectory()) {
          return item.endsWith(extension);
        }
        
        return true;
      })
      .map(item => {
        const itemPath = path.join(absolutePath, item);
        const stat = fs.statSync(itemPath);
        
        return {
          name: item,
          path: itemPath,
          isDirectory: stat.isDirectory(),
          size: stat.size,
          modifiedTime: stat.mtime,
        };
      });
  } catch (error) {
    console.error('列出文件失败:', error);
    return [];
  }
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns 是否存在
 */
export function fileExists(filePath: string): boolean {
  try {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(PROJECT_ROOT, filePath);
    return fs.existsSync(absolutePath);
  } catch {
    return false;
  }
}

/**
 * 重命名文件
 * @param oldPath 原文件路径
 * @param newPath 新文件路径
 * @returns 操作结果
 */
export function renameFile(oldPath: string, newPath: string): FileResult {
  try {
    const absoluteOldPath = path.isAbsolute(oldPath) 
      ? oldPath 
      : path.join(PROJECT_ROOT, oldPath);
    const absoluteNewPath = path.isAbsolute(newPath) 
      ? newPath 
      : path.join(PROJECT_ROOT, newPath);
    
    if (!fs.existsSync(absoluteOldPath)) {
      return {
        success: false,
        message: `原文件不存在: ${oldPath}`,
      };
    }
    
    if (fs.existsSync(absoluteNewPath)) {
      return {
        success: false,
        message: `目标文件已存在: ${newPath}`,
      };
    }
    
    fs.renameSync(absoluteOldPath, absoluteNewPath);
    
    return {
      success: true,
      message: '重命名成功',
      filePath: absoluteNewPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `重命名失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 获取文件修改时间
 * @param filePath 文件路径
 * @returns 修改时间或 null
 */
export function getFileModifiedTime(filePath: string): Date | null {
  try {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(PROJECT_ROOT, filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    
    const stat = fs.statSync(absolutePath);
    return stat.mtime;
  } catch {
    return null;
  }
}

/**
 * 复制文件
 * @param srcPath 源文件路径
 * @param destPath 目标文件路径
 * @returns 操作结果
 */
export function copyFile(srcPath: string, destPath: string): FileResult {
  try {
    const absoluteSrcPath = path.isAbsolute(srcPath) 
      ? srcPath 
      : path.join(PROJECT_ROOT, srcPath);
    const absoluteDestPath = path.isAbsolute(destPath) 
      ? destPath 
      : path.join(PROJECT_ROOT, destPath);
    
    if (!fs.existsSync(absoluteSrcPath)) {
      return {
        success: false,
        message: `源文件不存在: ${srcPath}`,
      };
    }
    
    // 确保目标目录存在
    const dir = path.dirname(absoluteDestPath);
    ensureDir(dir);
    
    fs.copyFileSync(absoluteSrcPath, absoluteDestPath);
    
    return {
      success: true,
      message: '复制成功',
      filePath: absoluteDestPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `复制失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}
