/**
 * 相关文章推荐工具
 *
 * 设计背景：
 * 本站文章带有 category（分类）与 tags（标签）两个维度的元数据，
 * 而「相关」本身是一个模糊概念，单一维度（例如只看同分类）很容易推出
 * 分类相同但主题毫不相干的文章。因此这里采用「多维度加权评分」：
 * 把若干个弱信号叠加成一个总分，再按总分降序排列。
 *
 * 各维度的权重是如何确定的：
 * - 同系列（+15）权重最高。系列是作者人工编排的顺序，语义关联最强，
 *   例如「VOCALOID 入门」系列的上下篇必须优先推荐。
 * - 标签重合（+10/个）是核心信号。标签由作者手动标注，重合越多说明主题越接近，
 *   且允许叠加，重合 3 个标签即得 30 分，足以压过「同分类」这类泛信号。
 * - 同分类（+6）作为兜底信号，权重低于单个标签重合，避免它主导排序。
 * - 时间新鲜度（最高 +5）权重最低，只用于在关联度接近时让较新的文章靠前，
 *   不喧宾夺主。
 *
 * 为什么时间新鲜度以「当前文章日期」为基准，而不是构建时间：
 * 本站采用静态导出（output: 'export'），所有页面在构建期一次性生成。
 * 若以构建时间为基准，每次构建都会产生不同的推荐顺序，导致同一篇文章的
 * 推荐结果反复变化，既不利于缓存也让读者困惑。改用当前文章日期作基准后，
 * 结果与文章内容一样是确定的。
 */

/**
 * 相关文章候选条目
 *
 * 服务端在构建期读取 Markdown 后组装该结构，直接传给客户端组件渲染，
 * 因此浏览器端无需再次请求数据，符合静态导出的约束。
 *
 * @interface RelatedPost
 * @property title - 文章标题
 * @property slug - 文章唯一标识符，用于生成跳转链接
 * @property date - 发布日期，格式为 YYYY-MM-DD
 * @property category - 文章分类
 * @property tags - 文章标签数组
 * @property excerpt - 文章摘要，用于卡片展示
 * @property readTime - 预估阅读时间（分钟）
 * @property coverImage - 封面图片路径，未设置封面时为空
 * @property series - 所属系列名称，不属于任何系列时为空
 */
export interface RelatedPost {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  readTime: number;
  coverImage?: string;
  series?: string;
}

/**
 * 打分时使用的当前文章上下文
 *
 * 只暴露打分真正需要的字段，而不是直接传整个文章对象，
 * 这样调用方无法误传无关字段，也让函数意图更清晰。
 *
 * @interface RelatedScoreContext
 * @property slug - 当前文章标识，用于把自身从候选中剔除
 * @property category - 当前文章分类
 * @property tags - 当前文章标签
 * @property series - 当前文章所属系列，可选
 * @property date - 当前文章日期，作为时间新鲜度的基准
 */
export interface RelatedScoreContext {
  slug: string;
  category: string;
  tags: string[];
  series?: string;
  date: string;
}

/**
 * 各维度的权重配置
 *
 * 抽成常量而非散落在计算代码里，是为了让「调权重」这件事只需改一处，
 * 后续若要调整推荐风格，直接改这里的数字即可。
 */
export const RELATED_WEIGHTS = {
  /** 同系列加成：系列由作者人工排序，关联度最高 */
  sameSeries: 15,
  /** 每个重合标签的加成：核心信号，可叠加 */
  perSharedTag: 10,
  /** 同分类加成：兜底信号，权重低于单个标签 */
  sameCategory: 6,
  /** 时间新鲜度的最高加分：仅用于关联度接近时做微调 */
  maxRecency: 5,
  /** 时间新鲜度的衰减周期（天）：超过该天数则新鲜度得分为 0 */
  recencyWindowDays: 180,
} as const;

/**
 * 把日期字符串安全地转换为时间戳
 *
 * 为什么不直接用 new Date(date).getTime()：
 * 'YYYY-MM-DD' 这种格式在部分环境下会按本地时区解析，部分环境按 UTC 解析，
 * 跨时区时可能产生 1 天的偏差。这里统一补上时间部分并按 UTC 解析，
 * 保证服务端（构建期）与客户端得到完全一致的结果，避免水合前后排序不一致。
 *
 * @param dateInput - 形如 YYYY-MM-DD 的日期字符串
 * @returns 毫秒时间戳；无法解析时返回 null，由调用方决定如何处理
 */
function parseDateToTimestamp(dateInput?: string): number | null {
  if (!dateInput) return null;

  // 仅处理标准的 YYYY-MM-DD 格式，其余格式交给 Date 构造函数兜底
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? `${dateInput}T00:00:00.000Z`
    : dateInput;

  const timestamp = new Date(normalized).getTime();

  // NaN 表示日期非法，返回 null 以便调用方跳过该维度而非污染总分
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * 计算单篇候选文章与当前文章的关联得分
 *
 * 评分是「多维度累加」而非「加权平均」，因为各维度之间是互相独立的正向证据：
 * 一篇文章既同系列又标签重合，理应比只满足一项的更相关，
 * 累加能自然体现这种叠加效应。
 *
 * @param candidate - 候选文章
 * @param context - 当前文章上下文
 * @returns 关联得分，数值越大越相关；0 表示未发现任何关联信号
 */
export function calculateRelatedScore(
  candidate: RelatedPost,
  context: RelatedScoreContext
): number {
  let score = 0;

  // 维度一：同系列。系列名需非空且一致，空字符串不代表同一系列
  if (context.series && candidate.series && candidate.series === context.series) {
    score += RELATED_WEIGHTS.sameSeries;
  }

  // 维度二：标签重合数。用 Set 去重，避免作者重复标注同一标签时被重复计分
  const contextTags = new Set(context.tags);
  const sharedTagCount = candidate.tags.filter((tag) => contextTags.has(tag)).length;
  score += sharedTagCount * RELATED_WEIGHTS.perSharedTag;

  // 维度三：同分类。分类可能为空或未设置，此时不参与计分
  if (context.category && candidate.category === context.category) {
    score += RELATED_WEIGHTS.sameCategory;
  }

  // 维度四：时间新鲜度。与当前文章的发布间隔越近得分越高，线性衰减到 0
  const candidateTime = parseDateToTimestamp(candidate.date);
  const contextTime = parseDateToTimestamp(context.date);
  if (candidateTime !== null && contextTime !== null) {
    const diffDays = Math.abs(candidateTime - contextTime) / (1000 * 60 * 60 * 24);
    const recencyRatio = Math.max(
      0,
      1 - diffDays / RELATED_WEIGHTS.recencyWindowDays
    );
    score += recencyRatio * RELATED_WEIGHTS.maxRecency;
  }

  return score;
}

/**
 * 获取按关联度排序的相关文章列表
 *
 * 排序规则：
 * 1. 先按关联得分降序
 * 2. 得分完全相同时按日期降序（新文章靠前）
 * 3. 日期也相同时按 slug 升序，保证顺序稳定可复现
 *
 * 为什么第 3 条要按 slug 兜底：
 * Array.prototype.sort 在比较结果为 0 时保留原顺序，但原顺序取决于文件扫描顺序，
 * 不同操作系统（Windows 与 Linux 构建机）的文件系统返回顺序可能不同。
 * 补上 slug 这层确定性比较，可确保本地构建与 CI 构建产出完全一致的推荐顺序。
 *
 * @param candidates - 候选文章列表（应已排除当前文章与隐藏文章）
 * @param context - 当前文章上下文
 * @returns 排序后的新数组，不修改原数组
 */
export function getSortedRelatedPosts(
  candidates: RelatedPost[],
  context: RelatedScoreContext
): RelatedPost[] {
  return [...candidates]
    .map((candidate) => ({
      candidate,
      score: calculateRelatedScore(candidate, context),
    }))
    .sort((a, b) => {
      // 关联度优先
      if (b.score !== a.score) return b.score - a.score;

      // 关联度相同时，较新的文章靠前
      const aTime = parseDateToTimestamp(a.candidate.date) ?? 0;
      const bTime = parseDateToTimestamp(b.candidate.date) ?? 0;
      if (bTime !== aTime) return bTime - aTime;

      // 最后按 slug 字典序兜底，保证跨平台顺序稳定
      return a.candidate.slug.localeCompare(b.candidate.slug);
    })
    .map((item) => item.candidate);
}

/**
 * 按批次切分相关文章
 *
 * 「换一批」的实现依据：列表已在服务端排好序，客户端只需按固定大小切片，
 * 不必在浏览器里重新计算评分，交互响应更快，逻辑也更简单。
 *
 * @param posts - 已排序的相关文章列表
 * @param batchIndex - 批次序号，从 0 开始
 * @param batchSize - 每批展示数量
 * @returns 该批次对应的文章数组；越界时返回空数组
 */
export function getRelatedBatch(
  posts: RelatedPost[],
  batchIndex: number,
  batchSize: number
): RelatedPost[] {
  // 防御非正数尺寸，避免 slice 产生反直觉的结果
  if (batchSize <= 0) return [];

  const start = batchIndex * batchSize;
  return posts.slice(start, start + batchSize);
}

/**
 * 计算总批次数
 *
 * 用于判断是否还需要展示「换一批」按钮：只有一批时该按钮毫无意义。
 *
 * @param total - 相关文章总数
 * @param batchSize - 每批展示数量
 * @returns 批次总数，向上取整；输入非法时返回 0
 */
export function getRelatedBatchCount(total: number, batchSize: number): number {
  if (batchSize <= 0 || total <= 0) return 0;
  return Math.ceil(total / batchSize);
}
