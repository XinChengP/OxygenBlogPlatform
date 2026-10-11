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
 * 修复说明（新文件夹识别）：
 * 原实现在未命中配置时，对 LTYpicture 以外的路径"取路径最后一部分作为主分类"，
 * 导致多层结构的新文件夹（如 新文件夹/2024/图.png）主分类被错误识别为"2024"。
 * 现改为：第一级目录作为主分类，最后一级目录作为子分类（多层时），
 * 与 LTYpicture 分支的智能推断语义保持一致。
 */
export const mapPathToCategory = (relativePath: string): GalleryCategoryConfig => {
  // 按路径长度降序排序，确保更具体的路径优先匹配
  const sortedMappings = [...GALLERY_PATH_MAPPINGS].sort(
    (a, b) => b.pathPattern.length - a.pathPattern.length
  );

  // 调试日志：输出正在匹配的路径（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Gallery] 开始匹配路径: "${relativePath}"`);
  }

  // 查找匹配的路径（支持精确匹配和前缀匹配）
  for (const config of sortedMappings) {
    const pathPattern = config.pathPattern;

    // 处理相对路径为空的情况（根目录）
    if (!relativePath && !pathPattern) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gallery] 匹配成功（根目录）: ${config.mainCategory}`);
      }
      return {
        mainCategory: config.mainCategory,
        subCategory: config.subCategory,
        sortOrder: config.sortOrder,
        icon: config.icon,
        description: config.description,
        pathPattern: config.pathPattern
      };
    }

    // 正常路径匹配
    if (relativePath.startsWith(pathPattern + '/') || relativePath === pathPattern) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gallery] 匹配成功: "${relativePath}" -> "${pathPattern}" = ${config.mainCategory}${config.subCategory ? '/' + config.subCategory : ''}`);
      }
      return {
        mainCategory: config.mainCategory,
        subCategory: config.subCategory,
        sortOrder: config.sortOrder,
        icon: config.icon,
        description: config.description,
        pathPattern: config.pathPattern
      };
    }
  }

  // 处理根目录情况
  if (!relativePath) {
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

  // 智能分类推断：根据路径结构自动推断主分类和子分类
  const parts = relativePath.split('/').filter(Boolean);

  // 如果路径以 LTYpicture 开头，使用智能推断逻辑：
  // 第二级目录作为主分类（新增子文件夹自动成为新分类），最后一级目录作为子分类
  if (parts.length >= 2 && parts[0] === 'LTYpicture') {
    const mainCategory = parts[1]; // 第二级作为主分类
    const subCategory = parts.length >= 3 ? parts[parts.length - 1] : undefined; // 最后一级作为子分类

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Gallery] 智能推断分类: 主分类="${mainCategory}", 子分类="${subCategory || '无'}"`);
    }

    return {
      mainCategory,
      subCategory,
      sortOrder: 100,
      description: `来自 ${relativePath} 文件夹`,
      pathPattern: ''
    };
  }

  // 对于 LTYpicture 以外的路径：
  // 第一级目录作为主分类（保证新顶层文件夹整体归为一组），最后一级目录作为子分类
  // 注意：单层路径（parts.length === 1）行为与旧版一致，仅多层路径的归类得到修正
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
    const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${config.branch}/${encodedImagePath}${cacheBuster}`;

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
// 浏览器端实时拉取
// ============================================================

/**
 * 判断错误是否为 GitHub API 限流（HTTP 403 rate limit exceeded）
 * 与服务端版本语义一致：限流按整点重置，退避重试无意义，应直接降级
 */
const isRateLimitError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
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
