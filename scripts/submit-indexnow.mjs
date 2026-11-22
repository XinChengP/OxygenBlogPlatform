/**
 * IndexNow 主动推送脚本（部署完成后运行）
 *
 * 为什么需要：
 * Bing 虽然能正常抓取本站，但抓取预算有限，实测 sitemap 中 37 个页面
 * 只被索引进 10 个。IndexNow 允许站点在有内容变更时主动通知搜索引擎，
 * 不必等爬虫按自己的节奏来发现新页面，能明显缩短收录延迟。
 *
 * 支持 IndexNow 的搜索引擎：Bing、Yandex、Seznam、Naver 等，
 * 推送一次即可由 api.indexnow.org 分发，不需要逐个平台提交。
 *
 * 环境变量（均可省略）：
 *   SITEMAP_URL    设置后从线上读取 sitemap，部署完成后推荐使用
 *   SITEMAP_PATH   未设置 SITEMAP_URL 时读取本地 sitemap，缺省 ./out/sitemap.xml
 *   INDEXNOW_HOST  站点域名，缺省 blog.xinchengp.cn
 *
 * 规范文档：https://www.indexnow.org/documentation
 */

import fs from 'node:fs';

/**
 * IndexNow 密钥
 *
 * 该值必须与 public/eb4b1dbbaf2f4eb3b3972245d9518e13.txt 的文件名和文件内容一致，
 * 搜索引擎会访问 https://<域名>/<key>.txt 校验提交者身份。
 * 密钥本身是公开信息（任何人都能访问该文件），因此直接写在代码里，
 * 不需要配置成 GitHub Actions Secret。
 */
const INDEXNOW_KEY = 'eb4b1dbbaf2f4eb3b3972245d9518e13';

const SITE_HOST = process.env.INDEXNOW_HOST || 'blog.xinchengp.cn';
const SITEMAP_URL = process.env.SITEMAP_URL || '';
const SITEMAP_PATH = process.env.SITEMAP_PATH || './out/sitemap.xml';

/**
 * IndexNow 通用提交端点
 *
 * 使用 api.indexnow.org 而不是 bing.com/indexnow，因为前者会把 URL
 * 自动分发给所有参与该协议的搜索引擎，一次请求覆盖多家。
 */
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * 读取 sitemap 文本
 * 优先使用线上地址，确保推送的是部署后真实可访问的 URL 清单
 *
 * @returns {Promise<string|null>} sitemap 内容，读取失败返回 null
 */
async function readSitemap() {
  if (SITEMAP_URL) {
    try {
      const response = await fetch(SITEMAP_URL, { redirect: 'follow' });
      if (!response.ok) {
        console.warn(`[indexnow] 拉取线上 sitemap 失败（HTTP ${response.status}），跳过推送`);
        return null;
      }
      return await response.text();
    } catch (error) {
      console.warn(`[indexnow] 拉取线上 sitemap 出错：${error.message}，跳过推送`);
      return null;
    }
  }

  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn(`[indexnow] 本地 sitemap 不存在：${SITEMAP_PATH}，跳过推送`);
    return null;
  }
  return fs.readFileSync(SITEMAP_PATH, 'utf8');
}

/**
 * 校验密钥文件是否已公开可访问
 *
 * 若密钥文件缺失或内容不匹配，搜索引擎会返回 403/422，
 * 提前检查可以给出更明确的错误提示。
 *
 * @returns {Promise<boolean>} 密钥文件是否可用
 */
async function verifyKeyFile() {
  const keyUrl = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;
  try {
    const response = await fetch(keyUrl, { redirect: 'follow' });
    if (!response.ok) {
      console.error(`[indexnow] 密钥文件不可访问（HTTP ${response.status}）：${keyUrl}`);
      return false;
    }
    const text = (await response.text()).trim();
    if (text !== INDEXNOW_KEY) {
      console.error(`[indexnow] 密钥文件内容与约定不一致：${keyUrl}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[indexnow] 校验密钥文件出错：${error.message}`);
    return false;
  }
}

/**
 * 主流程
 *
 * 刻意不使用 process.exit() 退出：Windows 下在 fetch 之后立即强制退出，
 * 会触发 libuv 的 "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" 崩溃。
 * 改用 process.exitCode 标记结果，让进程在所有句柄自然关闭后结束。
 */
async function main() {
  const xml = await readSitemap();
  if (!xml) {
    return;
  }

  // 提取 sitemap 中的所有页面地址
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  if (urlList.length === 0) {
    console.log('[indexnow] sitemap 中没有可推送的 URL，跳过');
    return;
  }

  // 只保留本站域名下的 URL，避免 sitemap 里混入外部地址导致 422
  const siteUrls = urlList.filter((url) => url.includes(`//${SITE_HOST}/`));

  console.log(`[indexnow] sitemap 共 ${urlList.length} 条，待推送本站 URL ${siteUrls.length} 条`);

  if (!(await verifyKeyFile())) {
    process.exitCode = 1;
    return;
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: siteUrls,
      }),
    });

    // IndexNow 的正常响应：200 表示已接收，202 表示已接收但密钥仍在验证中
    if (response.status === 200 || response.status === 202) {
      console.log(`[indexnow] 推送成功（HTTP ${response.status}），共 ${siteUrls.length} 条 URL`);
      return;
    }

    const text = await response.text();
    console.error(`[indexnow] 推送失败（HTTP ${response.status}）：${text.slice(0, 500)}`);
    process.exitCode = 1;
  } catch (error) {
    console.error(`[indexnow] 推送请求出错：${error.message}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[indexnow] 脚本执行异常：${error.message}`);
  process.exitCode = 1;
});
