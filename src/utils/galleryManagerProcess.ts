/**
 * 图床管理器进程管理工具（仅服务端使用）
 *
 * 【用途】
 * 供后台 Server Action 调用，实现「启动 / 关闭」本机图床管理器：
 * - 启动：以源码方式运行「洛佬の美图」的 manager/server.js
 * - 关闭：优先使用启动时记录的 PID；记录缺失时按端口反查监听进程
 *
 * 【安全约束】
 * - 关闭前会校验进程命令行，只有确认是图床管理器才执行 taskkill，
 *   避免端口被其他程序占用时误杀无辜进程；
 * - 本模块只在 Node.js 运行时执行（Server Action），不会被客户端打包。
 *
 * 【为什么用源码方式启动】
 * exe 版需要先手动复制到图库仓库根目录，且会脱离 manager 目录；
 * 源码方式只需 manager/node_modules 已安装，路径固定、行为可预期。
 */

import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';

/**
 * 图床管理器源码目录
 * 与后台页面「启动说明」中展示的路径保持一致，换机时只需改这一处
 */
const MANAGER_DIR = 'W:\\Web\\洛佬の美图\\manager';

/**
 * 管理器入口文件
 * package.json 的 start 脚本就是 `node server.js`
 */
const MANAGER_ENTRY = path.join(MANAGER_DIR, 'server.js');

/**
 * PID 文件位置
 * 放在项目 .next/cache 下：属于构建缓存目录（已被 gitignore），
 * 既能跨 Server Action 热更新保留，又不会污染仓库文件。
 */
const PID_FILE = path.join(process.cwd(), '.next', 'cache', 'gallery-manager.pid');

/**
 * 管理器默认端口（读取 config.json 失败时兜底）
 */
const DEFAULT_PORT = 3210;

/**
 * 进程状态接口
 */
export interface GalleryManagerProcessStatus {
  /** 管理器源码是否存在（换机或目录变动后为 false） */
  available: boolean;
  /** 端口上是否已有管理器在响应 */
  running: boolean;
  /** 已知 PID（未启动或用户手动启动时可能为 null） */
  pid: number | null;
  /** config.json 中配置的端口 */
  port: number;
}

/**
 * 启动/关闭操作结果接口
 */
export interface GalleryManagerProcessResult {
  success: boolean;
  message: string;
  pid?: number;
  /** 启动时发现已在运行 */
  alreadyRunning?: boolean;
}

/**
 * 读取管理器端口
 * 直接解析 manager/config.json，避免把端口写死在两处
 */
function getManagerPort(): number {
  try {
    const raw = fs.readFileSync(path.join(MANAGER_DIR, 'config.json'), 'utf8');
    const config = JSON.parse(raw) as { port?: number };
    const port = Number(config.port);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  } catch {
    // 配置缺失或损坏时回退默认端口
  }
  return DEFAULT_PORT;
}

/**
 * 探测端口上是否运行着图床管理器
 * 使用 /api/health（不校验访问令牌），比单纯 TCP 连接更准确，
 * 可避免把占用同端口的其他程序误判为管理器
 */
function probeManagerHealth(port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: timeoutMs },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      },
    );

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

/**
 * 探测端口是否处于监听状态（用于确认关闭后端口已释放）
 */
function isPortListening(port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = (listening: boolean) => {
      socket.destroy();
      resolve(listening);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

/**
 * 读取 PID 文件
 */
function readPid(): number | null {
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf8').trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/**
 * 写入 PID 文件
 */
function writePid(pid: number): void {
  try {
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(pid), 'utf8');
  } catch {
    // 写入失败不影响本次启动，关闭时会通过端口反查兜底
  }
}

/**
 * 清除 PID 文件
 */
function clearPid(): void {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // 文件不存在时忽略
  }
}

/**
 * 判断进程是否存活
 * 向进程发送信号 0 不会真正终止它，仅用于检测存在性
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取进程命令行（Windows）
 * 设置控制台输出为 UTF-8，避免中文路径在 PowerShell 5 下乱码
 */
function getProcessCommandLine(pid: number): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; (Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
      ],
      { windowsHide: true, timeout: 5000, encoding: 'utf8' },
      (error, stdout) => resolve(error ? '' : String(stdout || '')),
    );
  });
}

/**
 * 按端口反查监听进程 PID（Windows）
 * 用于关闭「用户手动启动、后台没有 PID 记录」的管理器实例
 */
function findPidByPort(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)`,
      ],
      { windowsHide: true, timeout: 5000, encoding: 'utf8' },
      (error, stdout) => {
        if (error) return resolve(null);
        const pid = Number(String(stdout || '').trim());
        resolve(Number.isInteger(pid) && pid > 0 ? pid : null);
      },
    );
  });
}

/**
 * 判断命令行是否指向图床管理器
 * - 源码运行：node.exe "...\洛佬の美图\manager\server.js"（server.js 为英文，乱码时仍可命中）
 * - exe 运行：...\LTY-图床管理器.exe / LTY-Image-Manager.exe（lty- 前缀可命中）
 */
function looksLikeGalleryManager(commandLine: string): boolean {
  const lower = commandLine.toLowerCase();
  return (
    lower.includes('server.js') ||
    lower.includes('lty-') ||
    lower.includes('洛佬の美图') ||
    lower.includes('图床管理器')
  );
}

/**
 * 终止进程树
 * 使用 taskkill /T 一并结束子进程，避免管理器派生的子进程残留
 */
function killProcessTree(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'taskkill',
      ['/PID', String(pid), '/T', '/F'],
      { windowsHide: true, timeout: 10000 },
      (error) => resolve(!error),
    );
  });
}

/**
 * 轮询等待管理器进入在线状态
 */
async function waitForManagerOnline(port: number, maxMs: number): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await probeManagerHealth(port, 800)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * 轮询等待端口释放
 */
async function waitForPortClosed(port: number, maxMs: number): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (!(await isPortListening(port, 500))) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

/**
 * 获取管理器进程状态
 */
export async function getGalleryManagerProcessStatus(): Promise<GalleryManagerProcessStatus> {
  const port = getManagerPort();
  const pid = readPid();

  return {
    available: fs.existsSync(MANAGER_ENTRY),
    running: await probeManagerHealth(port, 800),
    pid: pid && isProcessAlive(pid) ? pid : null,
    port,
  };
}

/**
 * 启动图床管理器
 *
 * 实现要点：
 * - 已在线时直接返回成功（避免重复启动两份服务）；
 * - detached + stdio ignore 让管理器独立于 dev server 运行，
 *   dev server 重启不会连带杀掉管理器；
 * - 启动后轮询 /api/health 确认真正可用，而不是只看进程是否创建。
 */
export async function startManagerProcess(): Promise<GalleryManagerProcessResult> {
  if (!fs.existsSync(MANAGER_ENTRY)) {
    return {
      success: false,
      message: `未找到图床管理器入口：${MANAGER_ENTRY}，请确认目录是否变动`,
    };
  }

  const port = getManagerPort();

  // 已经有管理器在响应时不再重复启动
  if (await probeManagerHealth(port, 800)) {
    return {
      success: true,
      alreadyRunning: true,
      message: '图床管理器已经在运行',
    };
  }

  const child = spawn(process.execPath, [MANAGER_ENTRY], {
    cwd: MANAGER_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env },
  });

  // 让子进程脱离父进程的事件循环，dev server 重启时不会连带退出
  child.unref();

  if (!child.pid) {
    return { success: false, message: '启动失败：未能获取管理器进程 PID' };
  }

  writePid(child.pid);

  // 首次启动可能需要加载依赖与扫描图库，留 15 秒余量
  const online = await waitForManagerOnline(port, 15000);
  if (!online) {
    // 超时视为启动失败，清理 PID 记录避免误导关闭操作
    clearPid();
    return {
      success: false,
      message:
        '管理器启动超时：请确认 manager 目录已执行过 npm install；若端口被占用，管理器会自动换用其他端口，请以启动横幅显示的地址为准并在本页修改',
    };
  }

  return {
    success: true,
    pid: child.pid,
    message: '图床管理器已启动',
  };
}

/**
 * 关闭图床管理器
 *
 * 查找进程的顺序：
 * 1. PID 文件（后台启动的实例）
 * 2. 按配置端口反查监听进程（用户手动启动的实例）
 *
 * 无论哪种来源，执行 taskkill 前都校验命令行，
 * 端口被其他程序占用时拒绝关闭并给出提示。
 */
export async function stopManagerProcess(): Promise<GalleryManagerProcessResult> {
  const port = getManagerPort();

  let pid = readPid();

  // PID 记录失效时清掉，并尝试按端口反查
  if (!pid || !isProcessAlive(pid)) {
    clearPid();
    pid = await findPidByPort(port);
  }

  if (!pid) {
    return { success: false, message: '未找到运行中的图床管理器进程' };
  }

  // 安全校验：确认该 PID 确实是图床管理器
  const commandLine = await getProcessCommandLine(pid);
  if (!looksLikeGalleryManager(commandLine)) {
    return {
      success: false,
      message: `端口 ${port} 被其他程序占用（PID ${pid}），已拒绝关闭以避免误杀`,
    };
  }

  const killed = await killProcessTree(pid);
  if (!killed) {
    return { success: false, pid, message: `终止进程 ${pid} 失败，请手动关闭管理器` };
  }

  clearPid();

  // 等待端口释放，确认服务确实停止
  const closed = await waitForPortClosed(port, 5000);
  if (!closed) {
    return {
      success: false,
      pid,
      message: '已发送关闭指令，但端口仍在监听，请稍后重试',
    };
  }

  return { success: true, pid, message: '图床管理器已关闭' };
}
