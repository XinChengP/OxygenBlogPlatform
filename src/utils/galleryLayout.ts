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
 *  - 前 100 张固定按 5:4:1 穿插；之后按剩余横/竖/方的实际数量
 *    自动推导一个总份数不超过 15 的 a:b:c 比例继续穿插；
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
// 横竖方判定阈值：>1.1 横图、<0.9 竖图，中间按方图处理
const LANDSCAPE_RATIO_THRESHOLD = 1.1;
const PORTRAIT_RATIO_THRESHOLD = 0.9;

const ORIENTATION_ORDER: GalleryOrientation[] = ['landscape', 'portrait', 'square'];

// 前 100 张作为固定节奏，保持 5:4:1；之后的图片再按真实构成自适应。
const SEED_IMAGE_COUNT = 100;
const SEED_WEIGHTS: Record<GalleryOrientation, number> = {
  landscape: 5,
  portrait: 4,
  square: 1,
};

// 自适应比例用整数 a:b:c 表示，总份数不超过 15。
// 之后每个块的长度就是 a+b+c，块结束时按剩余数量重新推导比例。
const MAX_RATIO_PARTS = 15;

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
 * 按图片真实宽高比判定横 / 竖 / 方。
 *
 * 不再依赖“横屏 / 竖屏 / 头像”目录名：头像里也可能有竖图，横屏目录里也
 * 可能有接近方形的图。统一用 width / height 判断：
 *  - > 1.1：横图
 *  - < 0.9：竖图
 *  - 其余：方图
 * 缺少宽高时按方图处理，避免未知数据被强行塞进某一侧。
 */
export const getGalleryOrientation = (image: GalleryImage): GalleryOrientation => {
  if (!image.width || !image.height) return 'square';

  const ratio = image.width / image.height;
  if (ratio > LANDSCAPE_RATIO_THRESHOLD) return 'landscape';
  if (ratio < PORTRAIT_RATIO_THRESHOLD) return 'portrait';
  return 'square';
};

/**
 * 从剩余数量推导 a:b:c，要求 a+b+c ≤ 15。
 *
 * 对每个可能的总份数（非空类型数量 ~ 15）用最大余数法分配整数份，
 * 选与真实比例误差最小的那个；每种还有剩余的类型至少分到 1 份。
 */
const deriveOrientationRatio = (
  counts: Record<GalleryOrientation, number>,
): Record<GalleryOrientation, number> => {
  const active = ORIENTATION_ORDER.filter(o => counts[o] > 0);
  const zero: Record<GalleryOrientation, number> = {
    landscape: 0,
    portrait: 0,
    square: 0,
  };
  if (active.length === 0) return zero;
  if (active.length === 1) {
    zero[active[0]] = 1;
    return zero;
  }

  const total = active.reduce((sum, o) => sum + counts[o], 0);
  let bestError = Infinity;
  let best = zero;

  for (let parts = active.length; parts <= MAX_RATIO_PARTS; parts += 1) {
    const exact = ORIENTATION_ORDER.map(o => (counts[o] / total) * parts);
    const alloc = exact.map(value => Math.floor(value));
    const remainders = exact.map((value, index) => value - alloc[index]);
    let assigned = alloc.reduce((sum, value) => sum + value, 0);

    // 最大余数法补齐到 parts 份
    while (assigned < parts) {
      let pick = -1;
      for (let i = 0; i < alloc.length; i += 1) {
        if (counts[ORIENTATION_ORDER[i]] === 0) continue;
        if (pick === -1 || remainders[i] > remainders[pick] + 1e-12) pick = i;
      }
      if (pick === -1) break;
      alloc[pick] += 1;
      remainders[pick] -= 1;
      assigned += 1;
    }

    // 每种非空类型至少 1 份，从当前份数最多的类型借
    for (let i = 0; i < alloc.length; i += 1) {
      if (counts[ORIENTATION_ORDER[i]] === 0 || alloc[i] > 0) continue;
      alloc[i] = 1;
      let donor = -1;
      for (let j = 0; j < alloc.length; j += 1) {
        if (j !== i && alloc[j] > 1 && (donor === -1 || alloc[j] > alloc[donor])) {
          donor = j;
        }
      }
      if (donor !== -1) alloc[donor] -= 1;
    }

    if (alloc.reduce((sum, value) => sum + value, 0) !== parts) continue;

    let error = 0;
    for (let i = 0; i < alloc.length; i += 1) {
      const orientation = ORIENTATION_ORDER[i];
      if (counts[orientation] === 0) continue;
      error += Math.abs(alloc[i] / parts - counts[orientation] / total);
    }

    if (error < bestError - 1e-12) {
      bestError = error;
      best = {
        landscape: alloc[0],
        portrait: alloc[1],
        square: alloc[2],
      };
    }
  }

  return best;
};

/** 用给定整数权重跑平滑加权轮询，最多取 limit 张 */
const runWeightedInterleave = (
  buckets: Record<GalleryOrientation, GalleryImage[]>,
  cursor: Record<GalleryOrientation, number>,
  weights: Record<GalleryOrientation, number>,
  limit: number,
): GalleryImage[] => {
  const current: Record<GalleryOrientation, number> = {
    landscape: 0,
    portrait: 0,
    square: 0,
  };
  const result: GalleryImage[] = [];

  while (result.length < limit) {
    let picked: GalleryOrientation | null = null;
    let activeWeight = 0;

    for (const orientation of ORIENTATION_ORDER) {
      if (cursor[orientation] >= buckets[orientation].length) continue;
      if (weights[orientation] <= 0) continue;
      activeWeight += weights[orientation];
      current[orientation] += weights[orientation];
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

/**
 * 前 100 张固定 5:4:1；之后以 a+b+c（≤15）为一块，根据剩余数量重新
 * 推导 a:b:c 并走完一块，再进入下一块。随着图片消耗，比例会自动调整，
 * 避免一次性比例在尾部留下长串同类型。
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

  const cursor: Record<GalleryOrientation, number> = {
    landscape: 0,
    portrait: 0,
    square: 0,
  };

  const seedCount = Math.min(SEED_IMAGE_COUNT, images.length);
  const result = runWeightedInterleave(buckets, cursor, SEED_WEIGHTS, seedCount);

  while (result.length < images.length) {
    const remaining: Record<GalleryOrientation, number> = {
      landscape: buckets.landscape.length - cursor.landscape,
      portrait: buckets.portrait.length - cursor.portrait,
      square: buckets.square.length - cursor.square,
    };
    const ratio = deriveOrientationRatio(remaining);
    const ratioSum = ORIENTATION_ORDER.reduce((sum, o) => sum + ratio[o], 0);
    const block = runWeightedInterleave(
      buckets,
      cursor,
      ratio,
      Math.min(ratioSum > 0 ? ratioSum : 1, images.length - result.length),
    );
    if (block.length === 0) break;
    result.push(...block);
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
 * 非表情包图片先按实际横竖方比例自动穿插再切行；表情包单独排在最后，
 * 用密排行处理。行列表只依赖图片顺序和容器宽度，渲染时按行分批追加即可
 * 保持已有行稳定。
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
