/**
 * 本地配置管理服务
 * 用于管理后台系统的本地配置（密码、GitHub Token等敏感信息）
 * 所有配置仅存储在本地，永不提交到GitHub
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import type { AdminConfig, AdminLogEntry } from '../types';

const CONFIG_FILE_NAME = 'admin-config.json';
const CONFIG_FILE_PATH = path.join(process.cwd(), CONFIG_FILE_NAME);
const LOG_FILE_NAME = 'admin-logs.json';
const LOG_FILE_PATH = path.join(process.cwd(), LOG_FILE_NAME);

const DEFAULT_CONFIG: AdminConfig = {
  passwordHash: '',
  github: {
    blogRepo: {
      owner: '',
      repo: '',
      branch: 'main',
      token: '',
    },
    imageRepo: {
      owner: 'Eiheir',
      repo: 'Luo_Tianyi_Image',
      branch: 'main',
      token: '',
    },
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE_PATH);
}

export function readConfig(): AdminConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    return JSON.parse(content) as AdminConfig;
  } catch (error) {
    console.error('读取配置文件失败:', error);
    return null;
  }
}

export function saveConfig(config: AdminConfig): boolean {
  try {
    config.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存配置文件失败:', error);
    return false;
  }
}

export function initConfig(): AdminConfig {
  const config = { ...DEFAULT_CONFIG };
  saveConfig(config);
  return config;
}

export async function setPassword(password: string): Promise<boolean> {
  try {
    const config = readConfig() || initConfig();
    const saltRounds = 12;
    config.passwordHash = await bcrypt.hash(password, saltRounds);
    return saveConfig(config);
  } catch (error) {
    console.error('设置密码失败:', error);
    return false;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const config = readConfig();
    if (!config || !config.passwordHash) {
      return false;
    }
    return await bcrypt.compare(password, config.passwordHash);
  } catch (error) {
    console.error('验证密码失败:', error);
    return false;
  }
}

export function updateGithubConfig(
  type: 'blog' | 'image',
  config: { owner: string; repo: string; branch: string; token: string }
): boolean {
  try {
    const currentConfig = readConfig() || initConfig();
    if (type === 'blog') {
      currentConfig.github.blogRepo = { ...config };
    } else {
      currentConfig.github.imageRepo = { ...config };
    }
    return saveConfig(currentConfig);
  } catch (error) {
    console.error('更新 GitHub 配置失败:', error);
    return false;
  }
}

export function getGithubConfig(type: 'blog' | 'image') {
  const config = readConfig();
  if (!config) {
    return null;
  }
  return type === 'blog' ? config.github.blogRepo : config.github.imageRepo;
}

export function addLogEntry(action: string, details: string): boolean {
  try {
    let logs: AdminLogEntry[] = [];
    
    if (fs.existsSync(LOG_FILE_PATH)) {
      const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      logs = JSON.parse(content);
    }
    
    const entry: AdminLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action,
      details,
    };
    
    logs.unshift(entry);
    
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }
    
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('添加日志失败:', error);
    return false;
  }
}

export function getLogEntries(): AdminLogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE_PATH)) {
      return [];
    }
    const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('读取日志失败:', error);
    return [];
  }
}

export function clearLogs(): boolean {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      fs.unlinkSync(LOG_FILE_PATH);
    }
    return true;
  } catch (error) {
    console.error('清空日志失败:', error);
    return false;
  }
}

export function exportConfig(): string | null {
  try {
    const config = readConfig();
    if (config) {
      return JSON.stringify(config, null, 2);
    }
    return null;
  } catch (error) {
    console.error('导出配置失败:', error);
    return null;
  }
}

export function importConfig(jsonString: string): boolean {
  try {
    const config = JSON.parse(jsonString) as AdminConfig;
    if (!config.passwordHash || !config.github) {
      throw new Error('无效的配置格式');
    }
    return saveConfig(config);
  } catch (error) {
    console.error('导入配置失败:', error);
    return false;
  }
}
