/**
 * 友链巡检脚本
 *
 * 职责：检查每个友链站点的可达性（HTTP 状态 + 响应耗时），
 *       结果写入 public/friends-status.json，供友链卡片显示在线状态点。
 *
 * 运行时机：
 *   - GitHub Actions 每次部署前（deploy.yml 的 check:friends 步骤）
 *   - deploy.yml 的每周 schedule
 *   - 本地手动：npm run check:friends
 *
 * 容错策略：单个友链失败不影响其他友链；
 *   超时/DNS/TLS 失败统一标记为离线（status 为 null）。
 */

import { writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

import { friendsLinks } from '../src/setting/AboutSetting';

/** 单个友链的巡检结果 */
interface FriendStatus {
  url: string;
  online: boolean;
  /** HTTP 状态码；超时/DNS 失败时为 null */
  status: number | null;
  responseTimeMs: number | null;
}

/** friends-status.json 的文件结构 */
interface FriendsStatusFile {
  checkedAt: string | null;
  friends: FriendStatus[];
}

const OUTPUT_FILE = path.join(process.cwd(), 'public', 'friends-status.json');

/** 首页请求超时；实测部分友链（如 alimeylab）响应要 10s 以上，不能太苛刻 */
const FETCH_TIMEOUT_MS = 15000;

const USER_AGENT =
  'Mozilla/5.0 (compatible; OxygenBlogFriendChecker/1.0; +https://blog.xinchengp.cn)';

// ---------------------------------------------------------------------------
// 抓取与巡检
// ---------------------------------------------------------------------------

async function fetchStatus(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<{ ok: boolean; status: number | null; responseTimeMs: number }> {
  const start = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    },
  });
  return {
    ok: response.ok,
    status: response.status,
    responseTimeMs: Date.now() - start,
  };
}

async function checkFriend(friendName: string, friendUrl: string): Promise<FriendStatus> {
  const result: FriendStatus = {
    url: `${friendUrl.replace(/\/+$/, '')}/`,
    online: false,
    status: null,
    responseTimeMs: null,
  };

  try {
    const probed = await fetchStatus(friendUrl);
    result.status = probed.status;
    result.responseTimeMs = probed.responseTimeMs;
    result.online = probed.ok;
  } catch {
    // 超时 / DNS / TLS 失败：保持 offline 默认值
  }

  if (!result.online) {
    console.warn(`[check-friends] ${friendName} 不可达（${result.status ?? '无响应'}）`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, content, 'utf-8');
  await rename(tmpPath, filePath);
}

async function main(): Promise<void> {
  console.log(`[check-friends] 开始巡检 ${friendsLinks.length} 个友链…`);
  const friends = await Promise.all(
    friendsLinks.map((friend) => checkFriend(friend.name, friend.url))
  );

  const output: FriendsStatusFile = {
    checkedAt: new Date().toISOString(),
    friends,
  };
  await atomicWrite(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);

  const offline = friends.filter((item) => !item.online);
  console.log(
    `[check-friends] 完成：${friends.length - offline.length}/${friends.length} 在线，结果已写入 public/friends-status.json`
  );
}

main().catch((error) => {
  console.error('[check-friends] 执行失败：', error);
  // 不以非零退出：巡检失败不应阻塞站点部署（deploy.yml 侧也有 continue-on-error 兜底）
});
