"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, useMotionValue } from 'framer-motion';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { Pin, Clock, BookOpen, Calendar } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

/**
 * 博客文章接口
 * 与 page.tsx 中的服务端数据类型保持一致
 */
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
  slug: string;
  readTime: number;
  /** 封面图片路径，未配置时为空 */
  coverImage?: string;
  pinned?: boolean;
  pinnedAt?: string;
}

/**
 * 归档页面 Props 接口
 */
interface ClientArchivePageProps {
  /** 已按发布日期倒序排列的文章列表 */
  archivedPosts: BlogPost[];
}

/**
 * 将 YYYY-MM-DD 格式的日期转换为「2026.9.12」这种更轻量的展示格式
 *
 * 实现说明：
 * 刻意不经过 new Date() 解析。因为 new Date('2026-09-12') 会按 UTC 零点解析，
 * 在东八区以外的时区回退会导致日期显示偏差一天，直接用字符串拆分最稳妥。
 *
 * 与参考实现（含时分）的差异：本站归档页只展示到日，不展示时分。
 *
 * @param dateStr - 标准格式的日期字符串
 * @returns 去掉补零的展示用日期
 */
function formatTimelineDate(dateStr: string): string {
  const parts = dateStr.split('-');
  // 格式异常时原样返回，避免展示出 undefined
  if (parts.length !== 3) {
    return dateStr;
  }
  const [year, month, day] = parts;
  return `${year}.${Number(month)}.${Number(day)}`;
}

/**
 * 从标准日期字符串中取出年份
 *
 * 与 formatTimelineDate 同理，直接用字符串截取而不经过 new Date()，
 * 避免时区回退导致跨年边界判断出错。
 *
 * @param dateStr - 标准格式的日期字符串（YYYY-MM-DD）
 * @returns 四位年份字符串；格式异常时原样返回，避免截出残缺字符串
 */
function getPostYear(dateStr: string): string {
  return dateStr.length >= 4 ? dateStr.slice(0, 4) : dateStr;
}

/**
 * 计算某个横坐标 x 处在河流上的纵坐标（波形函数）
 *
 * 这是整条「时光河流」的核心公式：三个振幅、波长、相位均不相同的正弦波叠加。
 * 系数 0.5 + 0.3 + 0.2 = 1，因此合成波的最大起伏幅度恰好等于 amplitude。
 * 由于三个正弦的周期比例（1 : 0.6 : 1.5）不可通约，波形不会周期性重复，
 * 视觉上更接近天然河流而非机械正弦曲线。
 *
 * 河道路径与卡片定位必须共用这一个函数，才能保证卡片严格「贴合」河流起伏。
 *
 * @param x - 横坐标
 * @param riverY - 河流中轴线纵坐标
 * @param amplitude - 河流起伏总幅度
 * @param wavelength - 主波波长
 * @returns 该横坐标对应的河流纵坐标
 */
function computeWaveY(
  x: number,
  riverY: number,
  amplitude: number,
  wavelength: number,
): number {
  return (
    riverY +
    amplitude * 0.5 * Math.sin((x / wavelength) * Math.PI * 2) +
    amplitude * 0.3 * Math.sin((x / (wavelength * 0.6)) * Math.PI * 2 + 1) +
    amplitude * 0.2 * Math.sin((x / (wavelength * 1.5)) * Math.PI * 2 + 2.5)
  );
}

/**
 * 生成河流的 SVG 路径指令串
 *
 * 实现说明：
 * 用「每 stepSize 像素取一个采样点、相邻点用直线连接」的方式逼近曲线。
 * 步长越小曲线越平滑，但路径点数越多、字符串越长，渲染开销也越大，
 * 因此移动端使用更大的步长（20px）来降低开销。
 *
 * @param totalWidth - 画布总宽度
 * @param riverY - 河流中轴线纵坐标
 * @param amplitude - 河流起伏总幅度
 * @param wavelength - 主波波长
 * @param offsetY - 整体垂直偏移，用于生成与主河道平行的次要线条
 * @param stepSize - 采样步长
 * @returns SVG path 的 d 属性值
 */
function buildRiverPath(
  totalWidth: number,
  riverY: number,
  amplitude: number,
  wavelength: number,
  offsetY: number,
  stepSize: number,
): string {
  const parts: string[] = [];
  const steps = Math.max(1, Math.ceil(totalWidth / stepSize));

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * totalWidth;
    const y = computeWaveY(x, riverY, amplitude, wavelength) + offsetY;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return parts.join(' ');
}

/**
 * 在单调递增数组中查找「第一个不小于目标值的元素下标」（二分查找）
 *
 * 用途：把屏幕可见区间换算成卡片索引区间。
 *
 * 为什么不继续用「(坐标 - 左侧留白) / 卡片步长」这种直接除法反推：
 * 自从为年份预留了独立槽位，卡片坐标在跨年处会出现一个不连续的跳跃，
 * 直接除法的假设（坐标随索引线性增长）不再成立，跨年附近会算偏，
 * 导致该显示的卡片没渲染出来。二分查找不依赖线性假设，始终准确。
 *
 * @param values - 单调递增的坐标数组
 * @param target - 目标坐标
 * @returns 第一个不小于 target 的元素下标；全部小于时返回数组长度
 */
function lowerBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;

  while (low < high) {
    // 位运算右移一位等价于除以 2 并向下取整，比 Math.floor 更快
    const mid = (low + high) >> 1;
    if (values[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * 画布布局常量
 *
 * 桌面端与移动端各一套参数。移动端整体缩小卡片、缩短波长、降低振幅，
 * 让单屏能容纳更多内容，同时关闭高开销的发光滤镜与流动粒子。
 */
const LAYOUT = {
  desktop: {
    cardWidth: 240,
    cardHeight: 230,
    cardGap: 60,
    riverY: 240,
    amplitude: 80,
    wavelength: 600,
    padding: 600,
    stepSize: 4,
    coverHeight: 100,
    /**
     * 跨年处额外预留的空位宽度，用于独立安放年份水印。
     * 取值依据：水印字号 96px 时四位年份实宽约 238px，
     * 槽位连同两侧 cardGap 共留出 300 + 60 = 360px，水印居中后左右各有约 60px 余量，
     * 保证年份不会压到相邻卡片。
     */
    yearSlotWidth: 300,
    /** 年份水印竖直虚线的长度：只作短距离牵引，过长的虚线会显得空旷 */
    yearStemLength: 70,
  },
  mobile: {
    cardWidth: 170,
    cardHeight: 180,
    cardGap: 40,
    riverY: 180,
    amplitude: 50,
    wavelength: 400,
    padding: 300,
    stepSize: 20,
    coverHeight: 70,
    /**
     * 移动端整体收窄，年份空位同步压缩。
     * 移动端水印字号 64px，四位年份实宽约 158px，
     * 槽位连同两侧 cardGap 共 170 + 40 = 210px，居中后左右各余约 26px。
     */
    yearSlotWidth: 170,
    /** 移动端虚线同步减半，避免数字顶出画布上边界 */
    yearStemLength: 44,
  },
} as const;

/**
 * 画布顶部留白
 * 取负值是为了给「位于河流上方」的内容预留负坐标空间，否则上半部分会被 SVG 视口裁剪。
 *
 * 取 -170 的依据（桌面端最不利情况，即波浪处于波谷 waveY = riverY - amplitude = 160 时）：
 * - 朝上的年份水印：虚线 70 + 间距 18 + 半字高 48 → 顶端约 -24
 * - 朝上的文章卡片：间距 50 + 卡高 230 → 顶端约 -120
 * 两者取更高者 -120，再留 50px 余量即为 -170。移动端数值更小，天然被覆盖。
 */
const SVG_TOP = -170;

/**
 * 客户端归档页面组件（时光河流视图）
 *
 * 视觉结构：
 * 用一条横向可拖拽的 SVG 波浪曲线作为时间轴，波浪由三重正弦叠加生成；
 * 每篇文章是一个沿波浪上下交替排布的毛玻璃卡片，通过虚线连接线与河流节点相连；
 * 河流本身带渐变描边、发光滤镜，并有若干光点沿路径循环流动。
 *
 * 与参考实现的差异（为适配本站所做的必要调整）：
 * 1. 配色全部改用主题变量（--primary / --card / --border / --muted-foreground），
 *    而非参考实现里硬编码的 sky/indigo 色值，以适配本站天依蓝主题与暗黑模式
 * 2. 日期只展示到「日」，不展示时分
 * 3. 卡片底部右侧展示阅读时长（本站数据无阅读数、点赞数）
 * 4. 卡片内保留标签入口，点击后弹出标签筛选浮层（本站既有功能）
 * 5. 跨年处预留独立空位安放年份标记：年份节点落在专属槽位中心，
 *    并由竖直虚线向上牵出一枚巨型水印数字（描边为主、填充极淡），
 *    所有年份在河流上方排成一条基准线，横向拖拽时能随时辨认所处的时间范围
 */
export default function ClientArchivePage({ archivedPosts }: ClientArchivePageProps) {
  // containerStyle 在背景开启时不带底色（让全局背景图透出），关闭时自动补上 bg-background
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('archive');

  // ── 标签筛选浮层状态 ──
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tagPosts, setTagPosts] = useState<BlogPost[]>([]);

  // ── 响应式状态 ──
  // 初始值与服务端渲染保持一致（桌面端布局），避免水合不一致报错；
  // 挂载后由 effect 读取真实窗口宽度并修正。
  const [isMobile, setIsMobile] = useState(false);
  const [viewWidth, setViewWidth] = useState(1200);

  // ── 拖拽相关 ──
  /**
   * 画布横向位移的 MotionValue（单位 px）
   *
   * 为什么必须用它而不是 info.offset.x：
   * Framer Motion 的 onDrag 回调里 info.offset.x 表示「相对本次拖拽起点」的增量，
   * 手指松开后会归零，而且松手后的惯性滑动阶段不会再触发 onDrag，
   * 因此无法用它还原画布的绝对位置，可视区域裁剪就会算错。
   * MotionValue 记录的始终是元素当前真实的 translateX，惯性阶段也会持续同步。
   */
  const riverX = useMotionValue(0);
  /** 标记「刚刚发生过拖拽」，用于屏蔽拖拽结束瞬间误触发的卡片点击 */
  const didDrag = useRef(false);
  /** 可视区域裁剪的重算触发器：拖拽时递增它来驱动重渲染 */
  const [visibleRangeKey, setVisibleRangeKey] = useState(0);
  /** requestAnimationFrame 句柄，用于对拖拽中的重算做节流 */
  const rafRef = useRef<number>(0);

  // 监听窗口尺寸变化，同步移动端标记与视口宽度
  useEffect(() => {
    const handleResize = () => {
      setViewWidth(window.innerWidth);
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * 拖拽过程中触发可视区域重算
   *
   * 说明：拖拽事件触发极其频繁，若每次变化都直接重渲染会导致严重掉帧，
   * 因此用 requestAnimationFrame 把重算合并到每帧最多一次。
   */
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setVisibleRangeKey((k) => k + 1);
    });
  }, []);

  /**
   * 订阅画布位移变化，驱动可视区域重算
   *
   * 为什么订阅 MotionValue 而不在 onDrag 回调里处理：
   * 拖拽松手后还有一段惯性滑动，该阶段不会再触发 onDrag，
   * 只有订阅 MotionValue 才能覆盖到惯性阶段，保证裁剪窗口始终准确。
   */
  useEffect(() => {
    const unsubscribe = riverX.on('change', scheduleUpdate);
    return () => {
      unsubscribe();
      // 取消尚未执行的动画帧，避免在已卸载组件上触发状态更新
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [riverX, scheduleUpdate]);

  // 根据设备类型取出当前生效的布局参数
  const layout = isMobile ? LAYOUT.mobile : LAYOUT.desktop;
  const {
    cardWidth,
    cardHeight,
    cardGap,
    riverY,
    amplitude,
    wavelength,
    padding,
    coverHeight,
    yearSlotWidth,
    yearStemLength,
  } = layout;

  // 文章总数
  const totalPosts = archivedPosts.length;

  /**
   * 年份区段
   *
   * archivedPosts 已由服务端按发布日期倒序排列，同一年的文章必然首尾相连，
   * 因此只需一次线性扫描即可切分出各年份区段，无需额外排序。
   * 这里只负责「切分」，坐标换算交给后面的 cardXList，职责单一便于维护。
   */
  const yearSpans = useMemo(() => {
    const spans: Array<{ year: string; startIdx: number }> = [];

    archivedPosts.forEach((post, index) => {
      const year = getPostYear(post.date);
      const lastSpan = spans[spans.length - 1];

      // 只有遇到新年份才开启新区段，同一年内的后续文章无需重复记录
      if (!lastSpan || lastSpan.year !== year) {
        spans.push({ year, startIdx: index });
      }
    });

    return spans;
  }, [archivedPosts]);

  /**
   * 每张卡片左边缘的横坐标（升序数组）
   *
   * 布局规则：卡片按「卡片宽 + 间距」等距排布，但每遇到一个新年份，
   * 就在该年第一张卡片之前额外让出一段 yearSlotWidth 宽的空位，
   * 专供年份标记使用。这样年份不会与任何卡片争抢位置，
   * 也就不必像早期方案那样把年份硬塞进上一年最后一张卡片的位置上。
   *
   * 之所以先算成数组而不是每次现算：
   * 1. 可视区间的二分查找需要一份升序坐标表；
   * 2. 坐标表只与布局参数、文章数量有关，拖拽时不会变化，可长期缓存。
   */
  const cardXList = useMemo(() => {
    const step = cardWidth + cardGap;
    // 年份区段起点集合，用于判断某个索引是不是「新年份的第一篇」
    const spanStartSet = new Set(yearSpans.map((span) => span.startIdx));
    const xs: number[] = [];
    // 已经累计让出的年份槽位数量
    let slotCount = 0;

    for (let i = 0; i < totalPosts; i++) {
      /*
        第一篇文章之前不额外让位（左侧本来就是 padding 留白，够用），
        从第二个年份区段起，每跨一次年就多让一个槽位。
      */
      if (i > 0 && spanStartSet.has(i)) {
        slotCount += 1;
      }
      xs.push(padding + i * step + slotCount * yearSlotWidth);
    }

    return xs;
  }, [totalPosts, yearSpans, cardWidth, cardGap, padding, yearSlotWidth]);

  /**
   * 画布总宽度
   * 右侧需容纳最后一张卡片的完整宽度，再补上一段 padding 留白。
   */
  const totalWidth = totalPosts > 0
    ? cardXList[totalPosts - 1] + cardWidth + padding
    : viewWidth;

  /**
   * 画布总高度
   * 需要容纳「河流最低点 + 下方卡片 + 底部留白」，并减去顶部负留白。
   */
  const svgHeight = riverY + amplitude + cardHeight + 120 - SVG_TOP;

  // 主河道路径：仅在布局参数或文章数变化时重算
  const riverPath = useMemo(
    () => buildRiverPath(totalWidth, riverY, amplitude, wavelength, 0, layout.stepSize),
    [totalWidth, riverY, amplitude, wavelength, layout.stepSize],
  );

  // 河道底部微光路径：与主河道平行、下移 12px 的一条细线
  const riverPathBottom = useMemo(
    () => buildRiverPath(totalWidth, riverY, amplitude, wavelength, 12, layout.stepSize),
    [totalWidth, riverY, amplitude, wavelength, layout.stepSize],
  );

  /**
   * 拖拽初始位移
   * 目的是让第一张卡片水平居中，而不是让画布从最左端开始展示。
   */
  const initialX = -(padding - (viewWidth - cardWidth) / 2);

  /**
   * 视口宽度或布局参数变化时，把画布归位到「首张卡片水平居中」的位置
   *
   * 若不归位，切换设备或调整窗口后画布会停留在旧偏移量上，首张卡片可能偏出屏幕。
   * 这里刻意不使用 motion.div 的 initial 属性：x 已经由 riverX 这个 MotionValue 接管，
   * 同时声明 initial 会与 MotionValue 争抢同一属性，因此统一走 riverX.set 设置。
   */
  useEffect(() => {
    riverX.set(initialX);
  }, [riverX, initialX]);

  /**
   * 可视区域裁剪范围
   *
   * 画布总宽可达数千像素，若把全部卡片都渲染出来，图片解码与布局开销会很高。
   * 这里只渲染「当前视口 ±2 张卡片」范围内的卡片，拖拽时动态调整窗口。
   *
   * 索引换算改用二分查找（lowerBound），而不再用「(坐标 - 左侧留白) / 卡片步长」反推：
   * 跨年处的年份槽位会让卡片坐标出现跳跃，线性除法在跨年附近会算错，
   * 导致本该显示的卡片没被渲染出来。
   *
   * 注意：计算需要读取 riverX 的实时值，但 MotionValue 变化不会触发 React 重渲染，
   * 因此把 visibleRangeKey 放进数组充当重算触发器。
   */
  const visibleRange = useMemo(() => {
    // 画布左移 currentX 后，屏幕左边缘对应画布坐标 -currentX
    const currentX = riverX.get();
    // 两侧各多渲染 2 张卡片作为缓冲，避免快速拖拽时露出空白
    const buffer = (cardWidth + cardGap) * 2;
    const visibleLeft = -currentX - buffer;
    const visibleRight = -currentX + viewWidth + buffer;

    /*
      cardXList 存的是每张卡片「左边缘」坐标，而判定可见与否应按卡片中心算，
      因此比较前把目标坐标右移半个卡宽，等价于把宽计入边界。
      起始下标再往前多退一张，作为拖拽缓冲。
    */
    const halfCard = cardWidth / 2;
    const startIdx = Math.max(0, lowerBound(cardXList, visibleLeft + halfCard) - 1);
    const endIdx = Math.min(
      totalPosts,
      lowerBound(cardXList, visibleRight - halfCard) + 1,
    );

    return { startIdx, endIdx };
    // 依赖数组中的 visibleRangeKey 只是「触发器」，值本身不参与运算，
    // 目的是让 riverX 变化后能够重新执行本段计算。
  }, [visibleRangeKey, totalPosts, cardWidth, cardGap, viewWidth, riverX, cardXList]);

  /**
   * 年份标记
   *
   * 呈现方式与文章卡片共用同一套时间轴语言：在河流上落一个节点，
   * 再由竖直虚线向上牵出一枚巨型年份水印数字，让横向拖拽时随时知道身处哪一年。
   *
   * 关键点：年份节点落在 cardXList 为它预留的槽位中心，
   * 而不是像早期方案那样硬挤到上一年最后一张卡片的位置上，
   * 因此永远不会与任何卡片重叠。年份区段的切分已抽到 yearSpans，这里直接复用。
   */
  const yearGroups = useMemo(() => {
    return yearSpans.map((span) => {
      /*
        空位区间是 [上一张卡片右边缘, 本年首张卡片左边缘]，
        宽度 = yearSlotWidth + cardGap（槽位宽 + 卡片常规间距）。
        取该区间的正中心作为年份节点的横坐标，两侧留白均等，视觉最平衡。
        第一年左侧同样是 padding 留白，公式依然成立，无需特判。
      */
      const nodeX = cardXList[span.startIdx] - (yearSlotWidth + cardGap) / 2;
      // 与河道共用同一个波形函数，保证节点严格落在河流上
      const waveY = computeWaveY(nodeX, riverY, amplitude, wavelength);

      /*
        垂直朝向：年份标记统一放在河流上方，因此不再记录方向字段。
        时间跨度只有数年，统一朝上能让所有年份排成一条整齐的基准线，
        阅读时视线只需沿画布顶部扫过，比上下跳动更容易辨认。
      */
      return { year: span.year, nodeX, waveY };
    });
  }, [yearSpans, cardXList, yearSlotWidth, cardGap, riverY, amplitude, wavelength]);

  /**
   * 拖拽边界
   *
   * 说明：dragConstraints 传入对象时，left/right 表示「相对元素初始位置」的位移上限。
   * - 左边界：画布总宽减去视口宽，即拖到最右端时露出的最后一段
   * - 右边界：当视口足够宽、initialX 为正（需要右移才能让首卡居中）时，
   *   右边界必须放宽到 initialX，否则初始位移会被立刻夹回 0，首张卡片无法居中
   *
   * 当文章很少、画布比视口还窄时用 Math.min 兜底，避免出现反向边界。
   */
  const dragConstraints = useMemo(
    () => ({
      left: Math.min(initialX, -(totalWidth - viewWidth)),
      right: Math.max(0, initialX),
    }),
    [totalWidth, viewWidth, initialX],
  );

  // 毛玻璃样式函数（供标签筛选浮层使用）
  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 处理标签点击：弹出该标签下的文章列表浮层
  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    // 阻止冒泡到外层卡片链接，同时取消链接的默认跳转行为
    e.preventDefault();
    e.stopPropagation();
    // 服务端已按时间倒序，筛选后天然保持有序，无需再次排序
    const filteredPosts = archivedPosts.filter(post => post.tags.includes(tag));
    setSelectedTag(tag);
    setTagPosts(filteredPosts);
    setShowTagModal(true);
  };

  // 关闭标签浮层
  const closeTagModal = () => {
    setShowTagModal(false);
    setSelectedTag('');
    setTagPosts([]);
  };

  return (
    /*
      容器样式交由 useBackgroundStyle 决定：
      背景图开启时不加任何底色，让全局背景图透出；
      背景图关闭时才回退到 bg-background 纯色底。
    */
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="px-4 sm:px-6 lg:px-8 pb-16">
        <PageHeader
          title="归档"
          description={`时光河流 · 共 ${totalPosts} 篇文章`}
          size="lg"
          className="mb-8"
        />

        {totalPosts > 0 ? (
          /*
            拖拽区
            overflow-hidden 负责裁掉画布超出视口的横向部分；
            select-none 避免拖拽时选中文字；
            key 绑定 viewWidth：窗口宽度变化时强制重新挂载，
            让 Framer Motion 的 initial 位移能按新的视口宽度重新计算。
          */
          <div className="overflow-hidden pb-4 select-none">
            <motion.div
              drag="x"
              dragMomentum
              dragElastic={0.1}
              dragConstraints={dragConstraints}
              style={{ x: riverX }}
              onDragStart={() => {
                didDrag.current = true;
              }}
              onDragEnd={() => {
                // 延迟复位，确保拖拽结束瞬间产生的 click 事件也能被识别并拦截
                setTimeout(() => {
                  didDrag.current = false;
                }, 100);
              }}
              draggable={false}
              className="cursor-grab active:cursor-grabbing"
            >
              <svg
                width={totalWidth}
                height={svgHeight}
                viewBox={`0 ${SVG_TOP} ${totalWidth} ${svgHeight}`}
                className="block"
              >
                <defs>
                  {/*
                    主渐变：横向贯穿整块画布（x1=0% x2=100% 是相对画布而非相对路径），
                    因此整条河呈现「左端透明 → 中段渐显 → 右端透明」的效果。
                    颜色通过 style 写入 CSS 变量，从而跟随主题在明暗模式间自动切换
                    （SVG 的 stop-color 作为表现属性时不解析 var()，必须走 CSS）。
                  */}
                  <linearGradient id="archive-river-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
                    <stop offset="5%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.5 }} />
                    <stop offset="50%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.7 }} />
                    <stop offset="95%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.5 }} />
                    <stop offset="100%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
                  </linearGradient>
                  {/* 次渐变：用于底部微光线，整体透明度更低 */}
                  <linearGradient id="archive-river-grad-soft" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
                    <stop offset="5%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.3 }} />
                    <stop offset="50%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.4 }} />
                    <stop offset="95%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
                  </linearGradient>
                  {/*
                    高斯模糊滤镜仅桌面端启用。
                    大范围模糊对 GPU 压力较大，移动端直接省去发光层。
                  */}
                  {!isMobile && (
                    <>
                      <filter id="archive-river-glow" x="-5%" y="-20%" width="110%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                      </filter>
                      <filter id="archive-dot-glow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                      </filter>
                    </>
                  )}
                </defs>

                {/* 河流主体：入场时用 pathLength 从 0 到 1 做「光照亮河道」的描边动画 */}
                <motion.path
                  d={riverPath}
                  fill="none"
                  stroke="url(#archive-river-grad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                />

                {/* 河流发光层：同路径加粗描边再模糊，形成光晕 */}
                {!isMobile && (
                  <motion.path
                    d={riverPath}
                    fill="none"
                    stroke="url(#archive-river-grad)"
                    strokeWidth="20"
                    filter="url(#archive-river-glow)"
                    opacity="0.3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.8, ease: 'easeInOut' }}
                  />
                )}

                {/* 河道底部微光 */}
                <motion.path
                  d={riverPathBottom}
                  fill="none"
                  stroke="url(#archive-river-grad-soft)"
                  strokeWidth="1"
                  opacity="0.15"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                />

                {/*
                  沿河道循环流动的光点：仅桌面端启用。
                  三颗光点速度与起始时刻错开，形成连绵流动感。
                */}
                {!isMobile && (
                  <>
                    {[0, 0.3, 0.6].map((offset, i) => (
                      <circle
                        key={i}
                        r="3"
                        style={{ fill: 'var(--primary)' }}
                        opacity="0.7"
                        filter="url(#archive-dot-glow)"
                      >
                        <animateMotion
                          dur={`${8 + i * 1.5}s`}
                          repeatCount="indefinite"
                          begin={`${offset * (8 + i * 1.5)}s`}
                        >
                          <mpath href="#archive-river-flow-path" />
                        </animateMotion>
                      </circle>
                    ))}
                    {/* 供 animateMotion 引用轨迹的隐形路径，不参与绘制 */}
                    <path id="archive-river-flow-path" d={riverPath} fill="none" stroke="none" />
                  </>
                )}

                {/*
                  年份标记：与文章卡片共用同一套视觉语言（河流节点 + 竖直虚线 + 文字）。
                  放在卡片之前渲染保证节点与虚线处于卡片下层，不会遮挡卡片内容。
                  年份等于时间跨度（本站仅数年），因此无需像卡片那样做可视裁剪。
                */}
                {yearGroups.map((group) => {
                  /*
                    虚线从河流节点出发竖直向上，牵到年份水印数字的下沿。
                    长度由布局参数 yearStemLength 统一控制：
                    桌面端 70px、移动端 44px，只作短距离牵引。
                    虚线不宜过长，否则节点与水印之间会留出大片空白，
                    反而让人误以为两者没有关联。
                  */
                  // 年份统一朝上，因此虚线方向恒为向上（纵坐标递减）
                  const lineY = group.waveY - yearStemLength;

                  /*
                    年份改用「巨型水印数字」呈现：去掉底托与边框，只留一枚超大字号数字。
                    用描边勾勒数字轮廓、内部填一层淡色，形成镂空水印质感。
                    这样年份既有足够的存在感，又不会像实心色块那样与文章卡片抢夺视觉重心。

                    字号与描边都取得比较激进：
                    水印是纯线条构成、没有实心底托，若字重与透明度偏弱，
                    在浅色背景与卡片之间很容易被当成脏点忽略掉，
                    因此宁可比常规标题大一号，保证一眼能读出年份。
                    所有年份统一朝上，在河流上方排成一条整齐的基准线，
                    视线沿画布顶部扫过即可掌握整条时间轴，不必上下跳跃。
                  */
                  // 水印字号：远看即可辨认年份，近看是装饰性的时间坐标
                  const watermarkFontSize = isMobile ? 64 : 96;
                  // 数字下沿与虚线端点之间留出的呼吸间距，避免数字贴着虚线显得局促
                  const watermarkGap = isMobile ? 12 : 18;
                  /*
                    数字垂直中心：从虚线端点再往上抬「间距 + 半个字高」。
                    字号约等于数字的实际高度，故以 fontSize / 2 作为半高估算，
                    配合 dominantBaseline="middle" 即可让数字稳稳悬在虚线上方。
                  */
                  const watermarkCenterY = lineY - watermarkGap - watermarkFontSize / 2;
                  // 描边粗细：跟着字号同步放大，否则笔画会被拉细成灰线
                  const watermarkStrokeWidth = isMobile ? 2 : 3;

                  return (
                    <g key={group.year}>
                      {/* 竖直虚线：连接河流节点与年份水印，形式与卡片连接线一致 */}
                      <line
                        x1={group.nodeX}
                        y1={group.waveY}
                        x2={group.nodeX}
                        y2={lineY}
                        style={{ stroke: 'var(--primary)' }}
                        strokeWidth="1.5"
                        opacity="0.4"
                        strokeDasharray="4 3"
                      />

                      {/*
                        河流节点：外圈光晕 + 内圈实心圆。
                        尺寸与配色和文章卡片的节点完全一致，
                        让「年份」读起来是时间轴上的一个刻度，而不是另起一套装饰。
                      */}
                      <circle
                        cx={group.nodeX}
                        cy={group.waveY}
                        r="10"
                        style={{ fill: 'var(--primary)' }}
                        opacity="0.25"
                      />
                      <circle
                        cx={group.nodeX}
                        cy={group.waveY}
                        r="6"
                        className="fill-card"
                        style={{ stroke: 'var(--primary)' }}
                        strokeWidth="2"
                      />

                      {/*
                        年份水印数字：描边 + 淡填充的镂空质感。
                        - stroke 用主色勾出数字轮廓，是水印最主要的可见部分
                        - fill 同样用主色但透明度较低，在字腔内铺一层色雾，
                          避免纯描边看起来像空心的错误状态
                        paintOrder 设为 stroke，保证描边压在填充之上，轮廓线始终清晰。

                        清晰度取值说明：水印没有底托，直接压在背景与卡片之上，
                        若透明度偏弱就会与背景糊在一起。这里把描边提到完全不透明、
                        填充提到 0.45，让数字在任何背景上都有明确的边界；
                        但填充仍留有余量，不会变成实心色块，镂空的轻盈感得以保留。
                      */}
                      <text
                        x={group.nodeX}
                        y={watermarkCenterY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fill: 'var(--primary)',
                          stroke: 'var(--primary)',
                          paintOrder: 'stroke',
                        }}
                        fillOpacity="0.45"
                        strokeWidth={watermarkStrokeWidth}
                        strokeOpacity="1"
                        fontSize={watermarkFontSize}
                        fontWeight="900"
                        letterSpacing="2"
                      >
                        {group.year}
                      </text>
                    </g>
                  );
                })}

                {/* 文章卡片：按可视范围裁剪，只渲染视口附近的若干张 */}
                {archivedPosts.slice(visibleRange.startIdx, visibleRange.endIdx).map((post, ri) => {
                  const index = visibleRange.startIdx + ri;
                  /*
                    直接查坐标表，而不再用 padding + index * 步长 现算。
                    因为跨年处多让了年份槽位，坐标随索引不再线性增长，
                    现算会让跨年之后的卡片整体左偏，压在年份标记上。
                  */
                  const x = cardXList[index];
                  // 卡片中心横坐标，用于取该处的河流纵坐标
                  const cx = x + cardWidth / 2;
                  // 与河道共用同一个波形函数，保证卡片严格贴合河流起伏
                  const waveY = computeWaveY(cx, riverY, amplitude, wavelength);

                  // 奇偶决定卡片在河流上方还是下方，形成上下交错
                  const isAbove = index % 2 === 0;
                  const verticalGap = isMobile ? 30 : 50;
                  const cardY = isAbove
                    ? waveY - verticalGap - cardHeight
                    : waveY + verticalGap;

                  // 连接线从卡片靠近河流的一侧边缘起，接到河流节点
                  const lineStartY = isAbove ? cardY + cardHeight : cardY;
                  const dateText = formatTimelineDate(post.date);

                  return (
                    <g key={post.id}>
                      {/* 卡片与河流节点之间的虚线连接线 */}
                      <line
                        x1={cx}
                        y1={lineStartY}
                        x2={cx}
                        y2={waveY}
                        style={{ stroke: 'var(--primary)' }}
                        strokeWidth="1.5"
                        opacity="0.4"
                        strokeDasharray="4 3"
                      />

                      {/* 河流节点：外圈光晕 + 内圈实心圆 */}
                      <circle
                        cx={cx}
                        cy={waveY}
                        r="10"
                        style={{ fill: 'var(--primary)' }}
                        opacity="0.25"
                      />
                      <circle
                        cx={cx}
                        cy={waveY}
                        r="6"
                        className="fill-card"
                        style={{ stroke: 'var(--primary)' }}
                        strokeWidth="2"
                      />

                      {/* 河流上的日期标注，位于节点背离卡片的一侧 */}
                      <text
                        x={cx}
                        y={waveY + (isAbove ? 22 : -12)}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        fontSize={isMobile ? '9' : '11'}
                        fontWeight="700"
                      >
                        {dateText}
                      </text>

                      {/*
                        卡片本体
                        foreignObject 让 HTML 内容能嵌入 SVG 坐标系内随画布一起被拖拽，
                        overflow: visible 允许卡片轻微超出所声明的矩形范围（阴影、悬停放大）。
                      */}
                      <foreignObject
                        x={x}
                        y={cardY}
                        width={cardWidth}
                        height={cardHeight}
                        style={{ overflow: 'visible' }}
                      >
                        <Link
                          href={`/blogs/${encodeURIComponent(post.slug)}`}
                          onClick={(e) => {
                            // 拖拽结束瞬间的点击视为误触，拦截跳转
                            if (didDrag.current) {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="block w-full h-full group"
                        >
                          <div className="w-full h-full rounded-xl md:rounded-2xl overflow-hidden border border-border shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/20 bg-card/70 supports-[backdrop-filter]:bg-card/60 backdrop-blur-xl">
                            {/* 封面区：无封面时降级为渐变底 + 书本图标 */}
                            {post.coverImage ? (
                              <div className="relative overflow-hidden" style={{ height: coverHeight }}>
                                <img
                                  src={post.coverImage}
                                  alt={post.title}
                                  loading="lazy"
                                  decoding="async"
                                  draggable={false}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                {/* 底部压暗渐变，保证日期文字在浅色封面上依然可读 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                <div className="absolute bottom-1.5 left-2 md:bottom-2 md:left-3 flex items-center gap-1 text-white/80 text-[8px] md:text-[10px]">
                                  <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                  {dateText}
                                </div>
                              </div>
                            ) : (
                              <div
                                className="relative bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center"
                                style={{ height: coverHeight }}
                              >
                                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground/40" />
                                <span className="absolute bottom-1.5 left-2 md:bottom-2 md:left-3 flex items-center gap-1 text-[8px] md:text-[10px] text-muted-foreground">
                                  <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                  {dateText}
                                </span>
                              </div>
                            )}

                            {/* 内容区 */}
                            <div className="p-2 md:p-3">
                              {/* 标题行：置顶文章额外展示置顶标记 */}
                              <div className="flex items-start gap-1 mb-1 md:mb-1.5">
                                {post.pinned && (
                                  <span className="shrink-0 mt-0.5 inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[7px] md:text-[9px] font-medium bg-primary text-primary-foreground">
                                    <Pin className="w-2 h-2 md:w-2.5 md:h-2.5" />
                                    置顶
                                  </span>
                                )}
                                <h3 className="text-[10px] md:text-xs font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                  {post.title}
                                </h3>
                              </div>

                              {/* 摘要 */}
                              {post.excerpt && (
                                <p className="text-[8px] md:text-[10px] text-muted-foreground line-clamp-2 mb-1.5 md:mb-2 leading-relaxed">
                                  {post.excerpt}
                                </p>
                              )}

                              {/* 标签入口：点击弹出标签筛选浮层，最多展示两个避免溢出 */}
                              {post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5 md:mb-2">
                                  {post.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      onClick={(e) => handleTagClick(tag, e)}
                                      className="px-1 py-0.5 rounded-full text-[7px] md:text-[9px] bg-muted/60 text-muted-foreground hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* 底部行：左侧分类，右侧阅读时长 */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[7px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary truncate">
                                  {post.category}
                                </span>
                                <span className="flex items-center gap-0.5 text-[7px] md:text-[9px] text-muted-foreground shrink-0">
                                  <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                  {post.readTime} 分钟
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mx-auto mb-6 text-muted-foreground/40" />
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                暂无博客文章
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                还没有发布任何博客文章，请稍后再来查看。
              </p>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
              >
                返回首页
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* 标签筛选浮层 */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, type: "spring", damping: 25 }}
            className={getGlassStyle("w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 border shadow-2xl")}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  标签筛选
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent font-medium">#{selectedTag}</span> 相关文章
                </p>
              </div>
              <button
                onClick={closeTagModal}
                className="w-10 h-10 rounded-full bg-muted/50 hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {tagPosts.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  共找到 <span className="font-medium text-foreground">{tagPosts.length}</span> 篇相关文章
                </p>
                <div className="space-y-3">
                  {tagPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="group"
                    >
                      <Link
                        href={`/blogs/${encodeURIComponent(post.slug)}`}
                        className="block"
                        onClick={closeTagModal}
                      >
                        <div className="p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            {post.pinned && (
                              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-0.5 shadow-sm">
                                <Pin className="w-3 h-3" />
                                置顶
                              </span>
                            )}
                            <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                              {post.title}
                            </h3>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                            <span>{formatTimelineDate(post.date)}</span>
                            <span className="text-border">·</span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                              {post.category}
                            </span>
                          </div>
                          {post.excerpt && (
                            <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  暂无相关文章
                </h3>
                <p className="text-muted-foreground mb-6">
                  没有找到带有标签 #{selectedTag} 的文章
                </p>
                <button
                  onClick={closeTagModal}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
                >
                  关闭
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
