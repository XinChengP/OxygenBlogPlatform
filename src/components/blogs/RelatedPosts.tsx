'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ArrowPathIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import {
  getRelatedBatch,
  getRelatedBatchCount,
  type RelatedPost,
} from '../../utils/relatedPostsUtils';

/**
 * 每批展示的文章数量
 *
 * 取 3 的原因：与下方网格的桌面端列数（lg:grid-cols-3）一致，
 * 一批恰好铺满一行，横向不会留下半个空位；
 * 文章总量有限时，3 篇也能切出足够多的批次，「换一批」才有实际意义。
 */
const DEFAULT_BATCH_SIZE = 3;

/**
 * 相关文章组件属性接口
 *
 * @interface RelatedPostsProps
 * @property posts - 已按关联度排好序的相关文章列表（由服务端构建期计算并传入）
 * @property batchSize - 每批展示数量，默认 3；一般无需外部指定
 */
interface RelatedPostsProps {
  posts: RelatedPost[];
  batchSize?: number;
}

/**
 * 相关文章展示组件
 *
 * 设计取舍说明：
 * 1. 为什么是「静态网格 + 换一批」，而不是轮播或自动翻页：
 *    文章底部的读者已经读完正文，此时要么离开要么继续读，注意力是分散的。
 *    自动轮播会在他阅读卡片文字的过程中突然换掉内容，属于打断；
 *    静态网格配合手动「换一批」，由读者自己掌握节奏，体验更可控。
 *
 * 2. 为什么排序在服务端做、组件只负责切片：
 *    本站是静态导出站点，构建期即可完成全部打分排序，无需运行时计算。
 *    组件只做 slice，逻辑简单、响应即时，也不会因浏览器性能差异出现卡顿。
 *
 * 3. 为什么卡片不带封面图：
 *    本区域处于页面最底部，若再拉取 3~6 张封面大图，会让滚动到底时的加载明显变慢。
 *    相关文章属于辅助导航而非主角，用「分类 + 标题 + 摘要」的文字卡片足以完成引导，
 *    同时避免图片加载失败时出现难看的破图。
 *
 * @param props - 组件属性
 * @returns 相关文章区域 JSX；无可推荐文章时返回 null，不占据任何空间
 */
export default function RelatedPosts({
  posts,
  batchSize = DEFAULT_BATCH_SIZE,
}: RelatedPostsProps) {
  /** 当前展示的批次序号，从 0 开始 */
  const [batchIndex, setBatchIndex] = useState(0);

  /**
   * 总批次数
   *
   * 用 useMemo 缓存：该值只取决于文章总数与批大小，
   * 批次切换时不会变化，没必要重复计算。
   */
  const batchCount = useMemo(
    () => getRelatedBatchCount(posts.length, batchSize),
    [posts.length, batchSize]
  );

  /** 当前批次要渲染的文章 */
  const currentBatch = useMemo(
    () => getRelatedBatch(posts, batchIndex, batchSize),
    [posts, batchIndex, batchSize]
  );

  /**
   * 切换到下一批
   *
   * 采用循环而非「到末尾停止」：文章数量不多时，循环能让读者随时回看，
   * 不必为了找回上一批而反复点击。取模运算天然实现了首尾相接。
   */
  const handleNextBatch = useCallback(() => {
    setBatchIndex((prev) => (prev + 1) % batchCount);
  }, [batchCount]);

  // 没有任何可推荐文章时直接不渲染，避免在文章底部留下一块空标题
  if (posts.length === 0 || batchCount === 0) {
    return null;
  }

  return (
    <section
      className="mb-8 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-5"
      aria-label="相关文章推荐"
    >
      {/* 区域标题栏：左侧标题，右侧批次进度与「换一批」按钮 */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-primary/70" />
          <span className="text-sm font-medium text-foreground">相关文章</span>
          <span className="text-xs text-muted-foreground">
            （为你精选 {posts.length} 篇）
          </span>
        </div>

        {/*
          换一批按钮
          仅当批次多于一批时才渲染：若只有一批，这个按钮点了也不会变化，
          属于典型的「无效交互」，宁可不出现在界面上。
        */}
        {batchCount > 1 && (
          <motion.button
            type="button"
            onClick={handleNextBatch}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label="换一批相关文章"
          >
            <ArrowPathIcon className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-300" />
            <span>换一批</span>
            {/* 批次进度：让读者知道自己换了多少次、还剩多少批 */}
            <span className="text-primary/60 font-mono">
              {batchIndex + 1}/{batchCount}
            </span>
          </motion.button>
        )}
      </div>

      {/*
        批次内容区
        AnimatePresence 必须配 mode="wait"：
        默认为「同时进出」，切换瞬间新旧两批卡片会同时存在于网格中，
        导致网格临时变成 6 列内容、页面高度猛然撑开又缩回，视觉上很突兀。
        mode="wait" 会等旧批次完全退场后再让新批次进场，高度变化干净利落。

        key={batchIndex} 是关键：React 依靠这个 key 判断「这是新的一批内容」，
        没有它，AnimatePresence 无法感知内容已更换，动画也就不会触发。
      */}
      <AnimatePresence mode="wait">
        <motion.div
          key={batchIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {/*
            卡片使用固定高度而非 auto，原因有三：
            1. 摘要为条件渲染（无摘要的文章少约 47px），若不固定，
               同批卡片会因某篇缺摘要而高低不齐；
            2. 「换一批」切换时，若高度随内容浮动，容器高度会忽高忽低，
               页面在切换瞬间产生跳动，读者的视线焦点会丢失；
            3. 固定高度后配合下方日期上的 mt-auto，可让日期稳定贴住卡片底边，
               同批卡片的日期形成一条水平线，观感更整齐。

            180px 的取值依据：按内容最多的情形逐项累加 ——
            上下内边距 p-4 共 32px，元信息行约 30px（含 mb-2.5），
            标题两行约 40px，摘要两行约 47px（含 mt-2），
            日期约 28px（含 pt-3），合计约 177px，取 180px 留少量余量。

            溢出由 overflow-hidden 裁掉：标题与摘要都已用 line-clamp 限制行数，
            正常情况下不会触发裁剪，此处仅作防御，避免极端长标题把卡片撑破。
          */}
          {currentBatch.map((post) => (
            <Link
              key={post.slug}
              href={`/blogs/${encodeURIComponent(post.slug)}`}
              className="group flex flex-col h-[180px] overflow-hidden rounded-xl border border-border/40 bg-background/50 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              {/* 元信息行：分类胶囊 + 阅读时长 */}
              <div className="flex items-center gap-2 mb-2.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {post.category}
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <BookOpenIcon className="h-3 w-3" />
                  {post.readTime} 分钟
                </span>
              </div>

              {/*
                标题
                用 line-clamp-2 限制两行：相关文章的标题长短不一，
                若不限行数，同一行三张卡片会因标题折行数不同而高低不齐。
              */}
              <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h3>

              {/* 摘要：固定两行，保证同批卡片高度一致 */}
              {post.excerpt && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              {/* 日期：mt-auto 把日期压到卡片底部，使同批卡片底边对齐 */}
              <div className="mt-auto pt-3 text-xs text-muted-foreground font-mono">
                {post.date}
              </div>
            </Link>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
