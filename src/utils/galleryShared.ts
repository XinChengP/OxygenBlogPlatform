/**
 * 画廊共享工具模块（同构）
 *
 * 定位说明：
 * 服务端（构建期抓取）与浏览器端（运行时实时刷新）都需要使用图床拉取、
 * 路径分类映射、分类树构建等逻辑。本模块将这部分共享逻辑抽离出来，
 * 供 server 与 client 两端复用。
 *
 * 硬性约束：
 * 1. 禁止在此文件引入任何 Node.js 专属模块（fs / path / https 等）。
 *    原因：客户端组件一旦导入本模块，整份代码会进入浏览器打包产物，
 *    Node 内置模块会导致浏览器端构建直接失败。
 * 2. 所有路径处理一律使用字符串操作实现（替代 path.dirname / basename / extname）。
 *
 * 职责清单：
 * - 图床仓库配置常量（GITHUB_IMAGE_REPO_CONFIG）
 * - 图片扩展名判断、唯一 ID 生成（字符串实现）
 * - 画廊路径分类映射配置与匹配逻辑（含新文件夹智能推断）
 * - 分类树构建与排序
 * - GitHub Trees API 目录树解析（纯函数，两端共用）
 * - 浏览器端实时拉取入口（fetch + 重试 + 限流静默降级）
 */

import { GalleryImage, ImageSource, ImageCategoryTree } from '../types/gallery';

// ============================================================
// 图床仓库配置
// ============================================================

/**
 * GitHub 图床仓库配置（单一事实来源）
 * 原先该配置硬编码在 galleryUtils.ts 的 getAllImages 内部，
 * 客户端实时刷新也需要同一份配置，故提升为导出常量，两端共用。
 */
export const GITHUB_IMAGE_REPO_CONFIG = {
  owner: 'Eiheir',
  repo: 'Luo_Tianyi_Image',
  branch: 'main',
  path: '' // 空字符串表示扫描整个仓库
} as const;

// ============================================================
// 基础工具（字符串实现，不依赖 Node 的 path 模块）
// ============================================================

// 支持的图片扩展名（与原 galleryUtils 保持一致）
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];

/**
 * 判断文件名是否为图片
 * 使用字符串截取替代 path.extname，保证浏览器端可用
 * @param fileName - 文件名（可含路径，只取最后一段判断）
 * @returns 是否为支持的图片格式
 */
export const isImageFile = (fileName: string): boolean => {
  const dotIndex = fileName.lastIndexOf('.');
  // 无扩展名或以点开头（隐藏文件）均不算图片
  if (dotIndex <= 0) return false;
  const ext = fileName.slice(dotIndex).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
};

/**
 * 生成唯一图片ID
 * 与原实现保持一致：路径分隔符和点号统一替换为连字符后转小写
 * @param filePath - 图片路径（相对仓库根目录或 public 目录）
 * @returns 唯一ID字符串
 */
export const generateImageId = (filePath: string): string => {
  return filePath
    .replace(/[\\/]/g, '-') // 统一替换所有路径分隔符
    .replace(/\./g, '-')
    .toLowerCase();
};

// ============================================================
// 路径分类映射
// ============================================================

/**
 * 画廊分类配置类型
 */
export interface GalleryCategoryConfig {
  pathPattern: string;        // 路径匹配模式（用于匹配文件夹路径）
  mainCategory: string;       // 主分类名称（显示在标签页上）
  subCategory?: string;       // 子分类名称（可选，用于更细粒度的分类）
  sortOrder?: number;         // 排序顺序（数字越小越靠前）
  icon?: string;              // 图标（可选）
  description?: string;       // 描述（可选）
}

/**
 * 画廊分类映射配置
 * 可扩展：只需在此处添加新的路径映射规则
 *
 * 说明：未命中下方任何规则的图床文件夹，会走 mapPathToCategory 中的
 * 智能推断逻辑自动归类（LTYpicture 下取第二级目录为主分类），
 * 因此新增图床文件夹无需修改此配置也能自动识别。
 *
 * 文件结构示例:
 * LTYpicture/
 *   ├── emoticon/ 或 表情包/
 *   │   └── Zi_Series/ 或 Zi系列/
 *   ├── temporary/ 或 临时/
 *   └── wallpapers&illustration/ 或 壁纸插画/
 *       ├── heng/ 或 横屏/
 *       └── shu/ 或 竖屏/
 *
 * 支持中文路径和英文路径两种形式
 */
export const GALLERY_PATH_MAPPINGS: GalleryCategoryConfig[] = [
  // ========== 表情包分类 ==========
  // 英文路径
  {
    pathPattern: 'LTYpicture/emoticon',
    mainCategory: '表情包',
    sortOrder: 10,
    description: '洛天依表情包合集'
  },
  {
    pathPattern: 'LTYpicture/emoticon/Zi_Series',
    mainCategory: '表情包',
    subCategory: 'Zi系列',
    sortOrder: 11,
    description: '活！字！乱！刷！ 来源：B站up主 Armillary_璇玑'
  },
  {
    pathPattern: 'LTYpicture/emoticon/辟浪',
    mainCategory: '表情包',
    subCategory: '辟浪',
    sortOrder: 12,
    description: '辟浪系列表情包'
  },
  // 中文路径支持
  {
    pathPattern: 'LTYpicture/表情包',
    mainCategory: '表情包',
    sortOrder: 10,
    description: '洛天依表情包合集'
  },
  {
    pathPattern: 'LTYpicture/表情包/Zi系列',
    mainCategory: '表情包',
    subCategory: 'Zi系列',
    sortOrder: 11,
    description: '活！字！乱！刷！ 来源：B站up主 Armillary_璇玑'
  },
  {
    pathPattern: 'LTYpicture/表情包/辟浪',
    mainCategory: '表情包',
    subCategory: '辟浪',
    sortOrder: 12,
    description: '辟浪系列表情包'
  },

  // ========== 美图分类 ==========
  // 英文路径
  {
    pathPattern: 'LTYpicture/wallpapers&illustration',
    mainCategory: '美图',
    sortOrder: 1,
    description: '佬の壁纸和曲绘'
  },
  {
    pathPattern: 'LTYpicture/wallpapers&illustration/heng',
    mainCategory: '美图',
    subCategory: '横屏',
    sortOrder: 2,
    description: '横版壁纸'
  },
  {
    pathPattern: 'LTYpicture/wallpapers&illustration/shu',
    mainCategory: '美图',
    subCategory: '竖屏',
    sortOrder: 3,
    description: '竖版壁纸'
  },
  {
    pathPattern: 'LTYpicture/wallpapers&illustration/avatar',
    mainCategory: '美图',
    subCategory: '头像',
    sortOrder: 4,
    description: '头像图片'
  },
  // 中文路径支持
  {
    pathPattern: 'LTYpicture/壁纸插画',
    mainCategory: '美图',
    sortOrder: 1,
    description: '佬の壁纸和曲绘'
  },
  {
    pathPattern: 'LTYpicture/壁纸插画/横屏',
    mainCategory: '美图',
    subCategory: '横屏',
    sortOrder: 2,
    description: '横版壁纸'
  },
  {
    pathPattern: 'LTYpicture/壁纸插画/竖屏',
    mainCategory: '美图',
    subCategory: '竖屏',
    sortOrder: 3,
    description: '竖版壁纸'
  },
  {
    pathPattern: 'LTYpicture/壁纸插画/头像',
    mainCategory: '美图',
    subCategory: '头像',
    sortOrder: 4,
    description: '头像图片'
  },

  // ========== 其他分类 ==========
  // 英文路径
  {
    pathPattern: 'LTYpicture/temporary',
    mainCategory: '临时',
    sortOrder: 99,
    description: '临时存放的图片'
  },
  // 中文路径支持
  {
    pathPattern: 'LTYpicture/临时',
    mainCategory: '临时',
    sortOrder: 99,
    description: '临时存放的图片'
  },
  // 直接映射 LTYpicture 目录下的其他图片
  {
    pathPattern: 'LTYpicture',
    mainCategory: '默认',
    sortOrder: 100,
    description: '洛天依图片合集'
  },
];

/**
 * 将GitHub仓库路径映射到分类名称
 * @param relativePath - 相对于仓库根目录（或 public 目录）的目录路径
 * @returns 包含主分类和子分类的对象
 *
 * 匹配策略（最长前缀匹配 + 剩余部分归类）：
 * 1. 在所有配置中找出"匹配得最深"的那一条（最长前缀），而非第一个匹配就返回。
 *    原因：配置表同时存在 LTYpicture/emoticon 与 LTYpicture/emoticon/Zi_Series，
 *    若按顺序返回，父级规则会吞掉子级映射，导致子分类永远无法生效。
 * 2. 若路径与命中的配置完全一致 → 直接采用配置定义的主/子分类。
 * 3. 若路径比命中的配置更深（配置未覆盖到该层）→ 把配置未覆盖的剩余目录继续归类，
 *    这是"新目录自动识别"的关键：图床上新建文件夹后，只要它在已配置目录之下，
 *    无需修改配置表即可被识别为新分类或新子分类。
 *    - 位于顶层兜底（LTYpicture）之下 → 剩余首段作为新主分类
 *    - 位于分类容器（如 LTYpicture/emoticon）之下 → 继承主分类，剩余部分作为新子分类
 * 4. 完全未命中配置的路径 → 按第一级目录作主分类、最后一级作子分类兜底推断。
 */
export const mapPathToCategory = (relativePath: string): GalleryCategoryConfig => {
  // 规范化路径：去除首尾多余斜杠，空串统一表示仓库根目录
  // 目的：防止 "LTYpicture/emoticon/" 这类带尾斜杠的路径导致前缀匹配与切片计算错位
  const normalizedPath = (relativePath || '').replace(/^\/+|\/+$/g, '');

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Gallery] 开始匹配路径: "${normalizedPath}"`);
  }

  // ---------- 第 1 步：最长前缀匹配 ----------
  // 遍历全部配置，保留"匹配得最深"（pathPattern 最长）的一条
  let matched: GalleryCategoryConfig | null = null;
  for (const config of GALLERY_PATH_MAPPINGS) {
    const pattern = config.pathPattern;
    const isMatch =
      normalizedPath === pattern ||
      (pattern !== '' && normalizedPath.startsWith(pattern + '/'));
    if (!isMatch) continue;
    if (!matched || pattern.length > matched.pathPattern.length) {
      matched = config;
    }
  }

  // ---------- 第 2 步：命中配置时的分类判定 ----------
  if (matched) {
    // 2a. 精确命中：路径与配置完全一致，直接采用配置定义的主/子分类
    if (normalizedPath === matched.pathPattern) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gallery] 精确命中: "${normalizedPath}" = ${matched.mainCategory}${matched.subCategory ? '/' + matched.subCategory : ''}`);
      }
      return { ...matched };
    }

    // 2b. 深层未配置目录：配置只覆盖到父级，剩余目录继续参与归类
    // 剩余目录 = 去掉已命中前缀后接续的目录片段（如 emoticon/Zi_Series 命中 emoticon 后剩余 Zi_Series）
    const remainder = normalizedPath.slice(matched.pathPattern.length + 1);

    // 顶层兜底配置（LTYpicture 本身）之下的一级目录视为"新主分类"，
    // 例如 LTYpicture/新分类 → 主分类"新分类"
    if (matched.pathPattern === 'LTYpicture') {
      const parts = remainder.split('/').filter(Boolean);
      const mainCategory = parts[0] || '默认';
      const subCategory = parts.length >= 2 ? parts[parts.length - 1] : undefined;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gallery] LTYpicture 下新增主分类: 主分类="${mainCategory}", 子分类="${subCategory || '无'}"`);
      }

      return {
        mainCategory,
        subCategory,
        sortOrder: 100,
        description: `来自 ${normalizedPath} 文件夹`,
        pathPattern: ''
      };
    }

    // 分类容器（如 LTYpicture/emoticon）之下新增的子目录，继承容器主分类，剩余部分作为新子分类
    // 例如 LTYpicture/emoticon/新系列 → 主分类"表情包"、子分类"新系列"
    const subCategory = remainder || undefined;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Gallery] 分类容器下新增子分类: 主分类="${matched.mainCategory}", 子分类="${subCategory || '无'}"`);
    }

    return {
      mainCategory: matched.mainCategory,
      subCategory,
      sortOrder: matched.sortOrder ?? 100,
      description: `来自 ${normalizedPath} 文件夹`,
      pathPattern: matched.pathPattern
    };
  }

  // ---------- 第 3 步：完全未命中配置 ----------
  // 根目录情况
  if (!normalizedPath) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Gallery] 未匹配到配置，使用默认分类（根目录）`);
    }
    return {
      mainCategory: '默认',
      sortOrder: 100,
      description: '来自根目录',
      pathPattern: ''
    };
  }

  // 兜底推断：第一级目录作为主分类（保证新顶层文件夹整体归为一组），最后一级作为子分类
  const parts = normalizedPath.split('/').filter(Boolean);
  const mainCategory = parts[0] || '默认';
  const subCategory = parts.length >= 2 ? parts[parts.length - 1] : undefined;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Gallery] 未匹配到配置，智能推断: 主分类="${mainCategory}"${subCategory ? `, 子分类="${subCategory}"` : ''}`);
  }

  return {
    mainCategory,
    subCategory,
    sortOrder: 100,
    description: `来自 ${mainCategory} 文件夹`,
    pathPattern: ''
  };
};

// ============================================================
// 分类排序与查询
// ============================================================

/**
 * 获取所有已配置的主分类（按排序顺序）
 * @returns 主分类名称数组
 */
export const getConfiguredMainCategories = (): string[] => {
  const mainCategories = new Map<number, string>();

  for (const config of GALLERY_PATH_MAPPINGS) {
    if (!mainCategories.has(config.sortOrder || 99)) {
      mainCategories.set(config.sortOrder || 99, config.mainCategory);
    }
  }

  // 按排序顺序返回
  return Array.from(mainCategories.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, name]) => name);
};

/**
 * 获取所有分类配置
 * @returns 分类配置数组
 */
export const getAllCategoryConfigs = (): Omit<GalleryCategoryConfig, 'pathPattern'>[] => {
  const categoryMap = new Map<string, Omit<GalleryCategoryConfig, 'pathPattern'>>();

  for (const config of GALLERY_PATH_MAPPINGS) {
    const key = config.mainCategory;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        mainCategory: config.mainCategory,
        sortOrder: config.sortOrder,
        description: config.description
      });
    }
  }

  return Array.from(categoryMap.values())
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
};

/**
 * 获取指定主分类下的所有子分类
 * @param mainCategory - 主分类名称
 * @returns 子分类配置数组
 */
export const getSubCategories = (mainCategory: string): GalleryCategoryConfig[] => {
  return GALLERY_PATH_MAPPINGS
    .filter(config => config.mainCategory === mainCategory && config.subCategory)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
};

/**
 * 获取分类的显示顺序
 * @param mainCategory - 主分类名称
 * @param subCategory - 子分类名称（可选）
 * @returns 排序顺序
 */
export const getCategorySortOrder = (
  mainCategory: string,
  subCategory?: string
): number => {
  // 查找主分类的排序顺序（不带子分类的配置项）
  if (!subCategory) {
    // 优先查找完全匹配主分类且没有子分类的配置
    for (const config of GALLERY_PATH_MAPPINGS) {
      if (config.mainCategory === mainCategory && !config.subCategory) {
        return config.sortOrder || 99;
      }
    }
  } else {
    // 查找子分类的排序顺序
    for (const config of GALLERY_PATH_MAPPINGS) {
      if (config.mainCategory === mainCategory && config.subCategory === subCategory) {
        return config.sortOrder || 99;
      }
    }
  }
  return 99;
};

// ============================================================
// 分类树构建
// ============================================================

/**
 * 按分类过滤图片
 * @param images - 图片数组
 * @param category - 分类名称（null表示所有分类）
 * @param subCategory - 子分类名称（可选，null表示不筛选子分类）
 * @returns 过滤后的图片数组
 */
export const filterImagesByCategory = (images: GalleryImage[], category: string | null, subCategory?: string | null): GalleryImage[] => {
  if (!category) {
    // 全部分类：按分类排序顺序排序图片，让美图排在表情包前面
    return [...images].sort((a, b) => {
      const orderA = getCategorySortOrder(a.category);
      const orderB = getCategorySortOrder(b.category);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // 同一分类内按子分类排序
      const subOrderA = getCategorySortOrder(a.category, a.subCategory);
      const subOrderB = getCategorySortOrder(b.category, b.subCategory);
      return subOrderA - subOrderB;
    });
  }

  if (subCategory) {
    return images.filter(image => image.category === category && image.subCategory === subCategory);
  }

  return images.filter(image => image.category === category);
};

/**
 * 构建树形分类结构
 * @param images - 图片数组
 * @returns 树形分类数组
 */
export const buildCategoryTree = (images: GalleryImage[]): ImageCategoryTree[] => {
  // 1. 按主分类分组
  const mainCategoryMap = new Map<string, GalleryImage[]>();

  images.forEach(image => {
    if (!mainCategoryMap.has(image.category)) {
      mainCategoryMap.set(image.category, []);
    }
    mainCategoryMap.get(image.category)?.push(image);
  });

  // 2. 构建树形结构
  const categoryTrees: ImageCategoryTree[] = [];

  mainCategoryMap.forEach((categoryImages, mainCategoryName) => {
    // 统计主分类图片数量（包含子分类）
    const mainCategoryCount = categoryImages.length;

    // 按子分类分组
    const subCategoryMap = new Map<string, GalleryImage[]>();

    categoryImages.forEach(image => {
      if (image.subCategory) {
        if (!subCategoryMap.has(image.subCategory)) {
          subCategoryMap.set(image.subCategory, []);
        }
        subCategoryMap.get(image.subCategory)?.push(image);
      }
    });

    // 生成主分类 slug
    const mainCategorySlug = mainCategoryName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '') // 保留中文、字母、数字、下划线和连字符
      || 'category-' + Math.random().toString(36).substr(2, 9); // 如果为空则生成随机 slug

    // 构建子分类数组
    const subCategories: ImageCategoryTree[] = [];

    subCategoryMap.forEach((subCategoryImages, subCategoryName) => {
      // 生成子分类 slug
      const subCategorySlug = `${mainCategorySlug}-${subCategoryName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '')}`
        || `subcategory-${Math.random().toString(36).substr(2, 9)}`;

      subCategories.push({
        name: subCategoryName,
        slug: subCategorySlug,
        count: subCategoryImages.length,
        source: ImageSource.Remote, // 暂时默认为远程，实际应该根据图片来源判断
        parentCategory: mainCategoryName
      });
    });

    // 按排序顺序排序子分类
    subCategories.sort((a, b) => {
      const orderA = getCategorySortOrder(mainCategoryName, a.name);
      const orderB = getCategorySortOrder(mainCategoryName, b.name);
      return orderA - orderB;
    });

    // 创建主分类节点
    const mainCategoryTree: ImageCategoryTree = {
      name: mainCategoryName,
      slug: mainCategorySlug,
      count: mainCategoryCount,
      source: ImageSource.Remote, // 暂时默认为远程，实际应该根据图片来源判断
      subCategories: subCategories.length > 0 ? subCategories : undefined
    };

    categoryTrees.push(mainCategoryTree);
  });

  // 3. 按排序顺序排序主分类
  categoryTrees.sort((a, b) => {
    const orderA = getCategorySortOrder(a.name);
    const orderB = getCategorySortOrder(b.name);
    return orderA - orderB;
  });

  return categoryTrees;
};

// ============================================================
// GitHub Trees API 目录树解析（纯函数，两端共用）
// ============================================================

/**
 * GitHub Trees API 响应中单个条目的结构（仅声明用到的字段）
 */
interface GitHubTreeItem {
  type?: string;   // 'blob' 表示文件，'tree' 表示目录
  path?: string;   // 相对仓库根目录的路径
}

/**
 * GitHub Trees API 响应结构（仅声明用到的字段）
 */
export interface GitHubTreeResponse {
  tree?: GitHubTreeItem[];
}

/**
 * 将 GitHub Trees API 返回的目录树解析为画廊图片数组
 *
 * 设计说明：
 * 原先这段解析逻辑内嵌在 galleryUtils.ts 的 getRemoteImages 中，
 * 客户端实时刷新需要同样的解析能力，故抽为纯函数供两端复用。
 * 所有路径处理均使用字符串操作（不依赖 Node 的 path 模块）。
 *
 * @param treeData - Trees API 返回的目录树 JSON
 * @param config - 图床仓库配置（owner/repo/branch/path）
 * @param bustImageCache - 是否给图片 URL 追加时间戳强制绕过 CDN 缓存
 *                          （仅服务端管理场景的强制刷新使用；
 *                           客户端例行刷新必须传 false，否则时间戳会导致
 *                           jsDelivr CDN 缓存全部失效、加载显著变慢）
 * @returns 解析后的远程图片数组
 */
export const parseGitHubTreeToImages = (
  treeData: GitHubTreeResponse,
  config: { owner: string; repo: string; branch: string; path?: string },
  bustImageCache: boolean = false
): GalleryImage[] => {
  const images: GalleryImage[] = [];

  // 处理目录树中的所有文件
  // Trees API 返回的是扁平化的文件列表，需要过滤出图片文件
  const basePath = config.path ? config.path.replace(/^\//, '') : '';

  for (const item of treeData.tree || []) {
    // 只处理文件（type === 'blob'）
    if (item.type !== 'blob') continue;

    // 解码路径中的 URL 编码字符（如中文）
    // GitHub Trees API 返回的路径可能是 URL 编码的
    const decodedPath = decodeURIComponent(item.path || '');

    // 检查是否在指定路径下
    if (basePath && !decodedPath.startsWith(basePath + '/') && decodedPath !== basePath) {
      continue;
    }

    // 从完整路径中提取文件名（字符串截取替代 path.basename）
    const fileName = decodedPath.substring(decodedPath.lastIndexOf('/') + 1);

    // 检查是否为图片文件
    if (!isImageFile(fileName)) continue;

    // 计算目录路径（去掉最后一段文件名，字符串截取替代 path.dirname）
    let dirPath = decodedPath.substring(0, decodedPath.lastIndexOf('/'));

    // 处理根目录情况：路径中不含斜杠时 lastIndexOf 返回 -1，
    // substring(0, -1) 得到空串；防御性处理 '.' 与负值场景
    if (!dirPath || dirPath === '.') {
      dirPath = '';
    }

    // 调试日志：输出处理后的路径信息（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Gallery] 处理图片路径:`, {
        original: item.path,
        decoded: decodedPath,
        dirPath
      });
    }

    // 使用路径映射函数确定分类
    const { mainCategory, subCategory } = mapPathToCategory(dirPath);

    // 构造jsDelivr加速URL
    const encodedImagePath = decodedPath.split('/').map(encodeURIComponent).join('/');
    // 仅在明确要求绕过图片缓存时追加时间戳（默认不追加，保护 CDN 缓存）
    const cacheBuster = bustImageCache ? `?t=${Date.now()}` : '';
    // 注意：图床仓库已远超 jsDelivr 的 50MB 仓库服务上限，主域名 cdn.jsdelivr.net
    // 会 301 慢速重定向到 raw.githubusercontent.com（实测 40 秒传不完一张 260KB 图）。
    // testingcf.jsdelivr.net 是 jsDelivr 官方多 CDN 备用域名（走 Cloudflare 边缘），
    // 实测对该仓库直接 200 返回内容，故作为主 URL 使用。
    const jsdelivrUrl = `https://testingcf.jsdelivr.net/gh/${config.owner}/${config.repo}@${config.branch}/${encodedImagePath}${cacheBuster}`;

    // 构造 GitHub raw URL 作为备用
    const githubRawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${encodedImagePath}`;

    images.push({
      id: generateImageId(decodedPath), // 使用完整路径生成唯一ID
      src: jsdelivrUrl, // 使用jsDelivr加速URL作为主URL
      fallbackSrc: githubRawUrl, // 使用 GitHub raw URL 作为备用
      alt: fileName.replace(/\.[^.]+$/, ''), // 去掉扩展名作为展示名（替代 path.extname）
      source: ImageSource.Remote,
      category: mainCategory, // 使用映射后的分类名称
      subCategory, // 子分类（可选）
      createdAt: new Date().toISOString(), // Trees API 不提供创建时间，使用当前时间
      updatedAt: new Date().toISOString() // Trees API 不提供更新时间，使用当前时间
    });
  }

  return images;
};

// ============================================================
// R2 图床源（Cloudflare R2 + Worker 自定义域）
// ============================================================

/**
 * R2 图床访问地址（Workers Static Assets 自定义域，沿用 R2 时代的常量名）
 *
 * 实际实现（2026-10-17）：图片 + 清单都作为 Worker gallery-assets 的静态资产部署，
 * - GET {R2_IMAGE_BASE}/manifest.json 返回图片清单（CORS 开放，缓存 2 分钟）
 * - GET {R2_IMAGE_BASE}/{图片相对路径} 直出图片，缓存 1 天
 *
 * 清单 path 与 GitHub 图床仓库相对路径一致（LTYpicture/...），
 * 分类映射逻辑（mapPathToCategory）无需任何改动即可复用。
 *
 * 为什么不用 workers.dev：该域名在大陆无法访问，访客必须走自有域。
 */
export const R2_IMAGE_BASE = 'https://img.xinchengp.cn';

/** R2 /manifest.json 返回的单个图片条目 */
export interface R2ImageEntry {
  path: string;          // 对象 key，同 GitHub 仓库相对路径
  size: number;          // 文件大小（字节）
  lastModified?: string; // 上传时间（ISO 字符串）
  width?: number;        // 图片宽度（清单生成器提供，用于首帧算出正确比例、消除重排）
  height?: number;       // 图片高度（同上）
  thumb?: string;        // 缩略图相对路径（如 thumbs/LTYpicture/xx/001.webp），缺失则回退原图
}

/** R2 /manifest.json 的响应结构 */
export interface R2ListResponse {
  generatedAt: string;
  count: number;
  images: R2ImageEntry[];
}

/** 拼接 R2 图片 URL（对每段路径做 URL 编码，兼容中文和 & 等特殊字符） */
export const r2ImageUrl = (path: string): string =>
  `${R2_IMAGE_BASE}/${path.split('/').map(encodeURIComponent).join('/')}`;

/** 拼接 jsDelivr 官方备用域名 URL（作为 R2 图片的保底地址） */
export const jsDelivrFallbackUrl = (path: string): string =>
  `https://testingcf.jsdelivr.net/gh/${GITHUB_IMAGE_REPO_CONFIG.owner}/${GITHUB_IMAGE_REPO_CONFIG.repo}@${GITHUB_IMAGE_REPO_CONFIG.branch}/${path.split('/').map(encodeURIComponent).join('/')}`;

/**
 * 将 R2 清单解析为画廊图片数组（纯函数，两端共用）
 * @param data - /list 接口的 JSON
 */
export const parseR2ListToImages = (data: R2ListResponse): GalleryImage[] =>
  (data.images || [])
    .filter(entry => isImageFile(entry.path))
    .map(entry => {
      // 字符串截取替代 path.dirname / path.basename（同构约束）
      const lastSlash = entry.path.lastIndexOf('/');
      const dirPath = lastSlash > 0 ? entry.path.slice(0, lastSlash) : '';
      const fileName = entry.path.slice(lastSlash + 1);
      const { mainCategory, subCategory } = mapPathToCategory(dirPath);

      return {
        id: generateImageId(entry.path),
        // src 始终是原图：点开预览需要清晰大图
        src: r2ImageUrl(entry.path),
        // thumbnail 是缩略图（宽 640 WebP，约原图 1/20 体积）：画廊卡片用它，避免下载解码大图
        // 清单未提供 thumb 时保持 undefined，卡片自动回退 src，老版本清单也不会报错
        thumbnail: entry.thumb ? r2ImageUrl(entry.thumb) : undefined,
        fallbackSrc: jsDelivrFallbackUrl(entry.path),
        alt: fileName.replace(/\.[^.]+$/, ''),
        source: ImageSource.Remote,
        category: mainCategory,
        subCategory,
        width: entry.width,
        height: entry.height,
        size: entry.size,
        createdAt: entry.lastModified || new Date().toISOString(),
        updatedAt: entry.lastModified || new Date().toISOString()
      };
    });

/**
 * 从 R2 图床拉取图片清单（同构函数：服务端与浏览器端共用同一份实现）
 *
 * 用途：
 * - 浏览器端：画廊挂载后的实时刷新（新图无需重新构建部署即可识别）
 * - 服务端：构建期优先用它作为初始数据，使静态 HTML 首帧就带上缩略图与真实宽高，
 *   避免先渲染一遍原图卡片、客户端刷新后又整体替换一次
 *
 * 失败时抛出错误，由调用方（fetchRemoteImagesWithFallback / getAllImages）决定回退策略
 */
export const fetchR2Images = async (options?: {
  forceRefresh?: boolean; // 服务端管理场景强制刷新时使用，浏览器例行刷新传 false
}): Promise<GalleryImage[]> => {
  const response = await fetch(`${R2_IMAGE_BASE}/manifest.json`, {
    headers: { Accept: 'application/json' },
    cache: options?.forceRefresh ? 'no-cache' : 'default'
  });
  if (!response.ok) {
    throw new Error(`R2 list error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json() as R2ListResponse;
  return parseR2ListToImages(data);
};

/**
 * 浏览器端带回退链的远程图片拉取：R2 优先，失败回退 GitHub Trees API
 * 回退是静默的：R2 尚未上线或偶发故障时画廊照常工作
 */
export const fetchRemoteImagesWithFallback = async (): Promise<GalleryImage[]> => {
  try {
    const r2Images = await fetchR2Images();
    if (r2Images.length > 0) return r2Images;
    console.warn('[Gallery] R2 清单为空，回退到 GitHub Trees API');
  } catch (error) {
    console.warn('[Gallery] R2 清单拉取失败，回退到 GitHub Trees API:',
      error instanceof Error ? error.message : '未知错误');
  }
  return fetchRemoteImagesInBrowser();
};

// ============================================================
// GitHub Trees API 浏览器端实时拉取（R2 的回退源）
// ============================================================

/**
 * 判断错误是否为 GitHub API 限流（HTTP 403 rate limit exceeded）
 * 与服务端版本语义一致：限流按整点重置，退避重试无意义，应直接降级
 */
const isRateLimitError = (error: unknown): boolean => {  const message = error instanceof Error ? error.message : String(error);
  return message.includes('403') || /rate limit/i.test(message);
};

/**
 * 浏览器端实时拉取图床最新目录树
 *
 * 使用场景：画廊页面挂载后，浏览器直接调用 GitHub Trees API
 * 获取当前最新的仓库目录树，使图床新增的文件夹无需重新构建部署
 * 即可立即在页面上识别展示。
 *
 * 降级策略：
 * - 请求失败（网络异常等）：指数退避重试 3 次，仍失败则返回空数组，
 *   调用方应静默保留构建期兜底数据
 * - 403 限流：不重试（配额按整点重置，重试只会继续消耗配额），直接降级
 *
 * @param config - 图床仓库配置（默认使用 GITHUB_IMAGE_REPO_CONFIG）
 * @param options - forceRefresh: 是否绕过浏览器 HTTP 缓存（默认 true，
 *                  因为目录树必须尽量新鲜；仅影响 API 请求本身，
 *                  图片 URL 不会追加时间戳，不影响 CDN 缓存）
 * @returns 最新远程图片数组；失败时返回空数组
 */
export const fetchRemoteImagesInBrowser = async (
  config: { owner: string; repo: string; branch: string; path?: string } = GITHUB_IMAGE_REPO_CONFIG,
  options?: { forceRefresh?: boolean }
): Promise<GalleryImage[]> => {
  // 浏览器端例行刷新默认绕过 HTTP 缓存，保证拿到最新目录树
  const { forceRefresh = true } = options || {};

  // 重试机制，最多重试3次
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 使用 GitHub Trees API 一次性获取整个目录树（递归），减少请求数量
      const treesApiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;

      const response = await fetch(treesApiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        // 强制刷新时使用 no-cache 绕过浏览器对 API 响应的缓存
        cache: forceRefresh ? 'no-cache' : 'default'
      });

      if (!response.ok) {
        const error = new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        // 403/限流直接抛出，由下方统一降级处理（重试无意义）
        throw error;
      }

      const treeData: GitHubTreeResponse = await response.json();

      // 解析目录树（注意：bustImageCache 固定传 false，
      // 例行刷新不能给图片 URL 加时间戳，否则 CDN 缓存全部失效）
      return parseGitHubTreeToImages(treeData, config, false);
    } catch (error) {
      // 限流是预期中的降级场景：未认证配额 60 次/小时/IP，按整点重置，
      // 直接静默降级（调用方会沿用构建期兜底数据）
      if (isRateLimitError(error)) {
        console.warn('[Gallery] GitHub API 限流，本次使用构建期数据展示');
        return [];
      }

      retryCount++;
      if (retryCount >= maxRetries) {
        // 静默降级：warn 级别记录，不打扰用户
        console.warn('[Gallery] 浏览器端拉取图床目录树失败，沿用构建期数据:',
          error instanceof Error ? error.message : '未知错误');
        return [];
      }

      // 指数退避后重试
      const waitTime = 1000 * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  return [];
};
