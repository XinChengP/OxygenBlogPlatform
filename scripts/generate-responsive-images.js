/**
 * 全站图片响应式变体生成脚本
 *
 * 背景：
 * 本站为静态导出（output: 'export'），next/image 的运行时优化端点不存在，
 * 图片此前直接引用原图（正文最大 7000×3640 / 7680×4320，
 * About 页单张封面最大 3.6MB），手机端也要下载十几 MB 并解码上百 MB 的位图。
 *
 * 本脚本在构建前扫描三处图片来源：
 *   1. 博客 Markdown：图片语法、HTML <img>、frontmatter coverImage
 *   2. 瞬间 Moments Markdown：frontmatter images 数组、图片语法、HTML <img>
 *   3. About 页配置 src/setting/AboutSetting.ts：其中引用的所有站内图片
 * 用 sharp 生成 640/1280/1920 三档 WebP（GIF 生成动画 WebP，保留动效），
 * 并输出尺寸清单 src/data/blogImageManifest.json，供各处组件构造 srcset。
 *
 * 产物位置：public/_responsive/（已加入 .gitignore，由构建流程生成）
 * 缓存：源图与变体哈希一致时直接跳过（清单比对机制，见 generate()）。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/blogs');
const MOMENTS_DIR = path.join(ROOT, 'src/content/moments');
const ABOUT_SETTING_PATH = path.join(ROOT, 'src/setting/AboutSetting.ts');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUTPUT_DIR = path.join(PUBLIC_DIR, '_responsive');
const MANIFEST_PATH = path.join(ROOT, 'src/data/blogImageManifest.json');
const BACKGROUND_MANIFEST_PATH = path.join(ROOT, 'src/data/backgroundImageManifest.json');
const WEB_SETTING_PATH = path.join(ROOT, 'src/setting/WebSetting.ts');

const TARGET_WIDTHS = [640, 1280, 1920];
const BACKGROUND_WIDTHS = [640, 1280, 1920, 2560];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);
// 小图不生成变体，但仍记录尺寸供 <img width/height> 使用
const MIN_VARIANT_WIDTH = 641;
const WEBP_QUALITY = 78;
// 动图多帧编码是 CPU 密集操作，effort 调低一档换取可接受的构建时长
const WEBP_ANIMATED_EFFORT = 3;
const BACKGROUND_WEBP_QUALITY = 80;

function walkMarkdown(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(full));
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function stripQuery(raw) {
  const hashIndex = raw.search(/[?#]/);
  return hashIndex === -1 ? raw : raw.slice(0, hashIndex);
}

/**
 * 与 src/app/blogs/[slug]/page.tsx 的路径归一化保持一致：
 * ./x、../x、裸相对路径都映射到 public 根下的绝对路径。
 */
function normalizePublicPath(raw) {
  const value = stripQuery(raw.trim());
  if (!value) return null;
  if (/^(https?:|data:|blob:|mailto:|tel:|#)/i.test(value)) return null;
  if (value.startsWith('//')) return null;

  let publicPath = value;
  if (publicPath.startsWith('./')) publicPath = publicPath.slice(2);
  else if (publicPath.startsWith('../')) publicPath = publicPath.replace(/^\.\.\//, '');
  if (!publicPath.startsWith('/')) publicPath = `/${publicPath}`;
  return publicPath;
}

function decodePathSegments(publicPath) {
  return publicPath
    .split('/')
    .filter(Boolean)
    .map(segment => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

/**
 * 从一篇 Markdown 的正文与 frontmatter 中收集图片路径
 * （Blog 与 Moments 共用；Moments 额外有 frontmatter images 数组）。
 */
function collectFromMarkdown(raw, sources) {
  const { data, content } = matter(raw);

  // Markdown 图片语法 ![](path)
  for (const match of content.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g)) {
    const normalized = normalizePublicPath(match[1]);
    if (normalized) sources.add(normalized);
  }

  // 正文里的原生 <img src="...">
  for (const match of content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const normalized = normalizePublicPath(match[1]);
    if (normalized) sources.add(normalized);
  }

  // 封面图（frontmatter）
  if (typeof data.coverImage === 'string') {
    const normalized = normalizePublicPath(data.coverImage);
    if (normalized) sources.add(normalized);
  }

  // 瞬间的配图数组（frontmatter images: [...]）
  if (Array.isArray(data.images)) {
    for (const item of data.images) {
      if (typeof item !== 'string') continue;
      const normalized = normalizePublicPath(item);
      if (normalized) sources.add(normalized);
    }
  }
}

/**
 * 从 AboutSetting.ts 中收集 About 页引用的站内图片。
 *
 * About 页的图片不外挂在 Markdown 里，而是集中写在配置文件的
 * coverImage 字段中（约 20 余张、合计 10MB+），此前完全没有响应式处理。
 * 这里不解析 TS、不 import，只用正则抽取形如 "/aboutme/xxx.jpg" 的字面量，
 * 与组件实际使用时的路径保持一致。
 */
function collectFromAboutSetting(sources) {
  try {
    const raw = fs.readFileSync(ABOUT_SETTING_PATH, 'utf8');
    for (const match of raw.matchAll(/["'](\/[^"']*\.(?:png|jpe?g|webp|gif|avif))["']/gi)) {
      const normalized = normalizePublicPath(match[1]);
      if (normalized && normalized.startsWith('/aboutme/')) sources.add(normalized);
    }
  } catch {
    // 配置文件缺失时静默跳过
  }
}

function collectSources() {
  const sources = new Set();
  try {
    for (const file of walkMarkdown(CONTENT_DIR)) {
      collectFromMarkdown(fs.readFileSync(file, 'utf8'), sources);
    }
  } catch {
    // 目录缺失时静默跳过
  }
  try {
    for (const file of walkMarkdown(MOMENTS_DIR)) {
      collectFromMarkdown(fs.readFileSync(file, 'utf8'), sources);
    }
  } catch {
    // 目录缺失时静默跳过
  }
  collectFromAboutSetting(sources);
  return [...sources].sort();
}

function sourceFileOf(publicPath) {
  return path.join(PUBLIC_DIR, ...decodePathSegments(publicPath));
}

function outputPathOf(publicPath, width, hash) {
  const segments = decodePathSegments(publicPath);
  const fileName = segments.pop();
  const ext = path.extname(fileName);
  const baseName = fileName.slice(0, -ext.length);
  const variantName = `${baseName}-${width}-${hash}.webp`;
  return {
    publicPath: `/_responsive/${[...segments, variantName].join('/')}`,
    filePath: path.join(OUTPUT_DIR, ...segments, variantName),
  };
}

/**
 * 从 WebSetting.ts 读取背景图配置（不直接 import TS）。
 */
function getBackgroundPublicPath() {
  try {
    const text = fs.readFileSync(WEB_SETTING_PATH, 'utf8');
    const match = text.match(/backgroundImage\s*=\s*["']([^"']+)["']/);
    if (!match) return null;
    return normalizePublicPath(`/${match[1]}`);
  } catch {
    return null;
  }
}

function backgroundOutputPath(publicPath, width, hash) {
  const segments = decodePathSegments(publicPath);
  const fileName = segments.pop();
  const ext = path.extname(fileName);
  const baseName = fileName.slice(0, -ext.length);
  const variantName = `${baseName}-${width}-${hash}.webp`;
  return {
    publicPath: `/_responsive/background/${variantName}`,
    filePath: path.join(OUTPUT_DIR, 'background', variantName),
  };
}

function variantsExist(entry) {
  if (!entry || !Array.isArray(entry.variants)) return false;
  return entry.variants.every(variant =>
    fs.existsSync(path.join(PUBLIC_DIR, ...decodePathSegments(variant.path)))
  );
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function generate() {
  const imageSources = collectSources().filter(publicPath =>
    IMAGE_EXTENSIONS.has(path.extname(publicPath).toLowerCase())
  );
  const missingSources = imageSources.filter(
    publicPath => !fs.existsSync(sourceFileOf(publicPath))
  );
  if (missingSources.length > 0) {
    console.warn(
      `[responsive] 跳过 ${missingSources.length} 张不存在的图片：${missingSources.join('、')}`
    );
  }
  const sources = imageSources.filter(publicPath => !missingSources.includes(publicPath));

  const backgroundPublicPath = getBackgroundPublicPath();
  let backgroundEntry = null;
  if (backgroundPublicPath) {
    const backgroundFile = sourceFileOf(backgroundPublicPath);
    if (fs.existsSync(backgroundFile)) {
      const buffer = fs.readFileSync(backgroundFile);
      backgroundEntry = {
        publicPath: backgroundPublicPath,
        buffer,
        hash: crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 8),
      };
    } else {
      console.warn(`[responsive] 背景图不存在，跳过：${backgroundPublicPath}`);
    }
  }

  const existingManifest = loadJson(MANIFEST_PATH, { images: {} });
  const existingImages = existingManifest.images || {};
  const existingBackground = loadJson(BACKGROUND_MANIFEST_PATH, null);

  // 先读取所有源图并计算内容哈希：哈希与清单一致、且变体文件都在，才跳过。
  // 不使用 node_modules/.cache，因为 start-dev.bat 每次启动都会删除它。
  const prepared = sources.map(publicPath => {
    const file = sourceFileOf(publicPath);
    const stat = fs.statSync(file);
    const buffer = fs.readFileSync(file);
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 8);
    return { publicPath, stat, buffer, hash };
  });

  const sameSourceSet =
    prepared.length === Object.keys(existingImages).length &&
    prepared.every(({ publicPath }) => publicPath in existingImages);

  const blogUpToDate = sameSourceSet && prepared.every(({ publicPath, hash }) => {
    const entry = existingImages[publicPath];
    return entry && entry.hash === hash && variantsExist(entry);
  });
  const backgroundUpToDate = !backgroundEntry ||
    (existingBackground?.hash === backgroundEntry.hash && variantsExist(existingBackground));

  if (blogUpToDate && backgroundUpToDate) {
    console.log(`[responsive] 图片无变化，跳过生成（${sources.length} 张源图）`);
    return;
  }

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = { images: {} };
  let variantCount = 0;
  let outputBytes = 0;

  for (const { publicPath, buffer, hash } of prepared) {

    const isAnimatedSource = path.extname(publicPath).toLowerCase() === '.gif';

    const metadata = await sharp(buffer).metadata();
    // 手机照片常带 EXIF 旋转；autoOrient 给出旋转后的真实宽高
    const width = metadata.autoOrient?.width ?? metadata.width;
    const height = metadata.autoOrient?.height ?? metadata.height;

    if (!width || !height) {
      console.warn(`[responsive] 无法读取尺寸，跳过：${publicPath}`);
      continue;
    }

    const entry = { hash, width, height, variants: [] };

    if (width >= MIN_VARIANT_WIDTH) {
      for (const targetWidth of TARGET_WIDTHS) {
        if (targetWidth >= width) continue;
        const { publicPath: variantPublicPath, filePath } = outputPathOf(publicPath, targetWidth, hash);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        /*
          GIF 源按动图处理：
          sharp 以 { animated: true } 读取才会保留全部帧，
          输出时 webp({ animated: true }) 保留帧率与循环信息，
          组件拿到的仍是会动的图，只是体积从 MB 级降到百 KB 级。
        */
        await sharp(buffer, isAnimatedSource ? { animated: true } : undefined)
          .rotate()
          .resize({ width: targetWidth, withoutEnlargement: true })
          .webp({
            quality: WEBP_QUALITY,
            effort: isAnimatedSource ? WEBP_ANIMATED_EFFORT : 4,
            smartSubsample: !isAnimatedSource,
            animated: isAnimatedSource,
          })
          .toFile(filePath);

        const variantSize = fs.statSync(filePath).size;
        outputBytes += variantSize;
        variantCount += 1;
        entry.variants.push({
          width: targetWidth,
          height: Math.round((height * targetWidth) / width),
          path: variantPublicPath,
        });
      }
    }

    manifest.images[publicPath] = entry;
  }

  let backgroundManifest = null;
  if (backgroundEntry) {
    const metadata = await sharp(backgroundEntry.buffer).metadata();
    const width = metadata.autoOrient?.width ?? metadata.width;
    const height = metadata.autoOrient?.height ?? metadata.height;

    if (width && height) {
      backgroundManifest = {
        hash: backgroundEntry.hash,
        source: backgroundEntry.publicPath,
        width,
        height,
        variants: [],
      };

      for (const targetWidth of BACKGROUND_WIDTHS) {
        if (targetWidth >= width) continue;
        const { publicPath: variantPublicPath, filePath } = backgroundOutputPath(
          backgroundEntry.publicPath,
          targetWidth,
          backgroundEntry.hash
        );
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        await sharp(backgroundEntry.buffer)
          .rotate()
          .resize({ width: targetWidth, withoutEnlargement: true })
          .webp({ quality: BACKGROUND_WEBP_QUALITY, effort: 4, smartSubsample: true })
          .toFile(filePath);

        const variantSize = fs.statSync(filePath).size;
        outputBytes += variantSize;
        variantCount += 1;
        backgroundManifest.variants.push({
          width: targetWidth,
          height: Math.round((height * targetWidth) / width),
          path: variantPublicPath,
        });
      }
    }
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (backgroundManifest) {
    fs.mkdirSync(path.dirname(BACKGROUND_MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(
      BACKGROUND_MANIFEST_PATH,
      `${JSON.stringify(backgroundManifest, null, 2)}\n`,
      'utf8'
    );
  }

  console.log(
    `[responsive] 完成：${sources.length} 张源图，生成 ${variantCount} 个 WebP 变体，合计 ${formatBytes(outputBytes)}`,
  );
}

generate().catch(error => {
  console.error('[responsive] 生成失败：', error);
  process.exit(1);
});
