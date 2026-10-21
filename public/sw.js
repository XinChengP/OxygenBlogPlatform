/**
 * Oxygen Blog Service Worker
 *
 * 目标：改善弱网环境与回访的加载速度，不改变站点功能。
 *
 * 缓存策略（按请求类型分流）：
 * - 导航请求（HTML）        → network-first：在线一律拿最新页面，
 *                             离线回退到已缓存页面，最后兜底到缓存的首页。
 *   选 network-first 而不是 stale-while-revalidate，是为了避免
 *   静态导出部署后 SW 长期提供旧 HTML、旧 HTML 再引用已被删除的
 *   旧 hash 分块（页面已有 ChunkLoadError 自愈逻辑兜底）。
 * - /_next/static/*         → cache-first：文件名为内容哈希，命中即永不过期；
 *                             旧哈希资产失去引用后由 LRU 配额逐步清理。
 * - 站内大图片目录           → cache-first + LRU 上限（默认 300 项）：
 *                             画廊/正文/About 图片向后访问速度显著受益，
 *                             且同一张图在文章页与灯箱间只下载一次。
 * - /search-index.json、*.xml → stale-while-revalidate：搜索/RSS 类内容
 *                             允许短暂陈旧，同时后台自动更新。
 * - 第三方域名（51la、twikoo、图床等）不接管，保持浏览器默认行为。
 *
 * 离线：HTML 命中缓存可直接浏览旧页面；未访问过的页面离线时报错。
 *
 * 部署兼容性说明：
 * - HTML 数据按 URL 存进 pages 缓存（带尾斜杠）；
 * - 新部署上线时，在线访客拿到的是新 HTML 与新哈希分块；
 *   旧哈希分块仍躺在 assets 缓存中无害，LRU 会自然淘汰；
 * - VERSION 只在 SW 行为变化时手动升级（见下方 bump 注释）。
 */

const VERSION = 'obp-sw-v1';

/** 四套运行时缓存：页面 / 静态资产 / 图片 / 数据 */
const CACHE = {
  pages: `${VERSION}-pages`,
  assets: `${VERSION}-assets`,
  images: `${VERSION}-images`,
  data: `${VERSION}-data`,
};

/**
 * 各缓存的条目上限（超出后按插入顺序淘汰最旧的条目）。
 * 图片 300 项大致对应几十篇文章的图片量，足够一次完整浏览会话。
 */
const TRIM_LIMITS = {
  [CACHE.pages]: 30,
  [CACHE.assets]: 200,
  [CACHE.images]: 300,
  [CACHE.data]: 20,
};

/** cache-first 的图片目录前缀（同源路径） */
const IMAGE_DIRS = [
  '/_responsive/',
  '/Blogabout/',
  '/Momentsabout/',
  '/aboutme/',
  '/LTY_Picture/',
  '/friendlink/',
  '/assets/',
  '/roco-icons/',
];

const ALL_CACHE_NAMES = Object.values(CACHE);

self.addEventListener('install', () => {
  // 安装即激活：新版本立即接管（页面切换/刷新后生效），
  // SW 里全是运行时缓存，没有需要预热的资源清单。
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清掉所有旧版本缓存；只保留当前 VERSION 命名空间下的缓存
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !ALL_CACHE_NAMES.includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理同源 GET：非 GET 请求一律交给浏览器默认行为
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // SW 自身与本地 API 不缓存
  if (url.pathname === '/sw.js') return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHE.pages));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE.assets));
    return;
  }

  if (IMAGE_DIRS.some((dir) => url.pathname.startsWith(dir))) {
    event.respondWith(cacheFirst(request, CACHE.images));
    return;
  }

  if (url.pathname === '/search-index.json' || url.pathname.endsWith('.xml')) {
    event.respondWith(staleWhileRevalidate(request, CACHE.data));
    return;
  }

  // 其余同源静态资源（favicon、js、字体文件等）
  event.respondWith(staleWhileRevalidate(request, CACHE.assets));
});

/**
 * cache-first：命中直接返回；未命中抓网络并入库；网络失败时尽力回退到缓存
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trim(cacheName);
    }
    return response;
  } catch (error) {
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    throw error;
  }
}

/**
 * network-first：在线总是取网络；离线回退到缓存（页面），再兜底到首页
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trim(cacheName);
    }
    return response;
  } catch (error) {
    // 离线时用缓存（忽略 query，例如 ?category=all）
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    const home = await cache.match('/');
    if (home) return home;
    throw error;
  }
}

/**
 * stale-while-revalidate：命中立即返回缓存，并后台静默更新；未命中等网络
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trim(cacheName);
      }
      return response;
    })
    .catch(() => null);
  return hit || network;
}

/**
 * 简单 LRU 修剪（按 keys() 顺序删除最旧条目，fetch 后 fire-and-forget）
 */
function trim(cacheName) {
  const limit = TRIM_LIMITS[cacheName];
  if (!limit) return;
  // 不 await：放在后台异步执行，避免影响当次响应
  caches
    .open(cacheName)
    .then((cache) =>
      cache.keys().then((keys) => {
        const overflow = keys.length - limit;
        if (overflow > 0) {
          return Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
        }
      })
    )
    .catch(() => {});
}
