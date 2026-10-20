import type { GalleryImage } from '@/types/gallery';

/**
 * 画廊横向行布局
 *
 * 背景：原来的 CSS 多列瀑布流（columns-*）在每次追加图片时都会重新平衡所有
 * 列的高度，导致已经在屏幕上的卡片整体挪位，滚动加载时视觉上“鬼畜”。
 * 这里把图片预先切成一条条固定高度的横向行：
 *
 *  - 行与行相互独立，追加新图片只会在末尾新增行，已有行不会重排；
 *  - 每行根据清单里的 width/height 计算每个格子的宽度，图片未加载前就能占位；
 *  - 横屏 / 竖屏 / 方图按 6:6:1 的权重穿插，避免长串同比例图片；
 *  - 表情包固定排在最后，并用更矮的方形密排行承载。
 */

export type GalleryOrientation = 'landscape' | 'portrait' | 'square';

export interface GalleryRowItem {
  image: GalleryImage;
  /** 在整份视觉顺序里的序号，用于展签编号与首屏优先级 */
  index: number;
  /** 该格子的像素宽度 */
  width: number;
}

export interface GalleryRow {
  id: string;
  kind: 'mixed' | 'emoticon';
  /** 行内图片的像素高度（不含图注） */
  height: number;
  /** 行内格子间距（像素） */
  gap: number;
  items: GalleryRowItem[];
}

const DEFAULT_CONTAINER_WIDTH = 1200;
const DEFAULT_ASPECT_RATIO = 4 / 5;
// 极端长图（如 1200×15960）按 0.45 展示并裁切，完整图留给灯箱
const MIN_LAYOUT_ASPECT_RATIO = 0.45;
const MAX_LAYOUT_ASPECT_RATIO = 4;

// 横 / 竖 / 方 的穿插权重。6:6:1 让方图大约每 13 张出现一次，
// 55 张方图可以均匀铺满全部 610 张美图，而不是中途耗尽。
const ORIENTATION_WEIGHTS: Record<GalleryOrientation, number> = {
  landscape: 6,
  portrait: 6,
  square: 1,
};

const ORIENTATION_ORDER: GalleryOrientation[] = ['landscape', 'portrait', 'square'];

export interface RowLayoutConfig {
  gap: number;
  targetHeight: number;
  /** 行高下限：低于这个值时拆行，避免极端比例把整行压成细条 */
  minHeight: number;
  /** 行高上限：避免单张竖图按行宽反算后变成巨幅 */
  maxHeight: number;
}

/** 用于布局的宽高比：极端长图/全景图做钳制，避免出现 20px 宽的细条 */
export const getGalleryAspectRatio = (image: GalleryImage): number => {
  const raw =
    image.width && image.height
      ? image.width / image.height
      : DEFAULT_ASPECT_RATIO;
  return Math.min(MAX_LAYOUT_ASPECT_RATIO, Math.max(MIN_LAYOUT_ASPECT_RATIO, raw));
};

/**
 * 判定横 / 竖 / 方。
 *
 * 优先用图库已有的“横屏 / 竖屏 / 头像”子分类，语义比纯比例更准确；
 * 新目录没有子分类时再按宽高比兜底（>1.1 横，<0.9 竖，其余方）。
 */
export const getGalleryOrientation = (image: GalleryImage): GalleryOrientation => {
  if (image.subCategory === '横屏') return 'landscape';
  if (image.subCategory === '竖屏') return 'portrait';
  if (image.subCategory === '头像') return 'square';

  const raw =
    image.width && image.height
      ? image.width / image.height
      : DEFAULT_ASPECT_RATIO;
  if (raw > 1.1) return 'landscape';
  if (raw < 0.9) return 'portrait';
  return 'square';
};

/**
 * 按 6:6:1 对横 / 竖 / 方做平滑加权穿插。
 *
 * 使用平滑加权轮询（SWRR），每轮给所有还有剩余的桶加权重、选当前值最大的，
 * 再减去本轮活跃权重之和。某个桶耗尽后自动按剩余桶的权重继续，不会卡住
 * 或出现长串补位。
 */
export const interleaveGalleryImages = (images: GalleryImage[]): GalleryImage[] => {
  if (images.length <= 1) return [...images];

  const buckets: Record<GalleryOrientation, GalleryImage[]> = {
    landscape: [],
    portrait: [],
    square: [],
  };
  for (const image of images) {
    buckets[getGalleryOrientation(image)].push(image);
  }

  const active = ORIENTATION_ORDER.filter(o => buckets[o].length > 0);
  if (active.length <= 1) return [...images];

  const current: Record<GalleryOrientation, number> = {
    landscape: 0,
    portrait: 0,
    square: 0,
  };
  const cursor: Record<GalleryOrientation, number> = {
    landscape: 0,
    portrait: 0,
    square: 0,
  };

  const result: GalleryImage[] = [];
  while (result.length < images.length) {
    let picked: GalleryOrientation | null = null;
    let activeWeight = 0;

    for (const orientation of active) {
      if (cursor[orientation] >= buckets[orientation].length) continue;
      activeWeight += ORIENTATION_WEIGHTS[orientation];
      current[orientation] += ORIENTATION_WEIGHTS[orientation];
      if (picked === null || current[orientation] > current[picked]) {
        picked = orientation;
      }
    }

    if (picked === null) break;
    current[picked] -= activeWeight;
    result.push(buckets[picked][cursor[picked]++]);
  }

  return result;
};

const getMixedRowConfig = (containerWidth: number): RowLayoutConfig => {
  if (containerWidth < 480) return { gap: 8, targetHeight: 170, minHeight: 120, maxHeight: 270 };
  if (containerWidth < 768) return { gap: 10, targetHeight: 210, minHeight: 150, maxHeight: 330 };
  if (containerWidth < 1024) return { gap: 12, targetHeight: 250, minHeight: 180, maxHeight: 390 };
  return { gap: 14, targetHeight: 290, minHeight: 200, maxHeight: 430 };
};

const getEmoticonRowConfig = (containerWidth: number): RowLayoutConfig => {
  if (containerWidth < 480) return { gap: 6, targetHeight: 96, minHeight: 72, maxHeight: 140 };
  if (containerWidth < 768) return { gap: 6, targetHeight: 112, minHeight: 80, maxHeight: 160 };
  return { gap: 8, targetHeight: 132, minHeight: 96, maxHeight: 180 };
};

/**
 * 把一串图片切成两端对齐的横向行。
 *
 * 算法：先按目标行高累加图片宽度，达到容器宽度后，反算一个统一的行高，
 * 让整行刚好铺满容器（justified layout）。最后一行不足一行宽时保持目标
 * 行高、左对齐，避免最后几张被拉成巨幅。
 */
const buildRowsForSequence = (
  images: GalleryImage[],
  config: RowLayoutConfig,
  containerWidth: number,
  kind: GalleryRow['kind'],
  startIndex: number,
): { rows: GalleryRow[]; nextIndex: number } => {
  const width = containerWidth > 0 ? containerWidth : DEFAULT_CONTAINER_WIDTH;
  const rows: GalleryRow[] = [];
  let imageIndex = startIndex;
  let cursor = 0;

  while (cursor < images.length) {
    const pending: { image: GalleryImage; aspect: number; index: number }[] = [];
    let ratioSum = 0;

    while (cursor < images.length) {
      const image = images[cursor];
      const aspect = getGalleryAspectRatio(image);
      pending.push({ image, aspect, index: imageIndex++ });
      ratioSum += aspect;
      cursor += 1;

      const estimatedWidth =
        config.targetHeight * ratioSum + config.gap * (pending.length - 1);
      if (estimatedWidth >= width) break;
    }

    const isLastRow = cursor >= images.length;
    let availableWidth = width - config.gap * (pending.length - 1);

    // 非末行铺满容器；末行保持目标行高，避免几张图被拉伸。
    let height = isLastRow
      ? config.targetHeight
      : Math.min(config.maxHeight, availableWidth / ratioSum);

    /*
      极端比例保护：一张方图后面紧跟一张 3:1 全景图时，两个格子确实能铺满
      一行，但反算出来的行高会低到 70px 左右。此时把行尾的图片退回去，
      让当前行少放一张，把高度拉回可读范围；退回的图片成为下一行的开头。
    */
    while (
      kind === 'mixed' &&
      !isLastRow &&
      pending.length > 1 &&
      height < config.minHeight
    ) {
      const dropped = pending.pop();
      if (!dropped) break;
      ratioSum -= dropped.aspect;
      cursor -= 1;
      imageIndex -= 1;
      availableWidth = width - config.gap * (pending.length - 1);
      height = Math.min(config.maxHeight, availableWidth / ratioSum);
    }

    const items: GalleryRowItem[] = pending.map(item => ({
      image: item.image,
      index: item.index,
      width: Math.max(1, Math.round(height * item.aspect)),
    }));

    rows.push({
      id: `${kind}-${items[0].image.id}`,
      kind,
      height: Math.round(height),
      gap: config.gap,
      items,
    });
  }

  return { rows, nextIndex: imageIndex };
};

/**
 * 生成整个画廊的行列表。
 *
 * 非表情包图片先做 6:6:1 穿插再切行；表情包单独排在最后，用密排行处理。
 * 行列表只依赖图片顺序和容器宽度，渲染时按行分批追加即可保持已有行稳定。
 */
export const buildGalleryRows = (
  images: GalleryImage[],
  containerWidth: number,
): GalleryRow[] => {
  if (images.length === 0) return [];

  const width = containerWidth > 0 ? containerWidth : DEFAULT_CONTAINER_WIDTH;

  const emoticonImages: GalleryImage[] = [];
  const otherImages: GalleryImage[] = [];
  for (const image of images) {
    if (image.category === '表情包') emoticonImages.push(image);
    else otherImages.push(image);
  }

  const orderedOthers = interleaveGalleryImages(otherImages);
  const mixed = buildRowsForSequence(
    orderedOthers,
    getMixedRowConfig(width),
    width,
    'mixed',
    0,
  );

  const emoticons = buildRowsForSequence(
    emoticonImages,
    getEmoticonRowConfig(width),
    width,
    'emoticon',
    mixed.nextIndex,
  );

  return [...mixed.rows, ...emoticons.rows];
};
