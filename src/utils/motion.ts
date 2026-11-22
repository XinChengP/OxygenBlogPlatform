/**
 * 全站动效节奏常量
 *
 * 此前各处的入场参数各自为政：
 * 首页 Hero 位移 75px、PageHeader 位移 -20px、博客卡片 20px + scale 0.9、
 * 工具卡片 20px 且每张额外延迟 0.1s、动态卡片则完全没有入场。
 * 结果是页面之间切换时"手感"不一致，列表越往后等得越久。
 *
 * 这里只保留一套克制节奏：
 * - 位移 14px：足以被感知，又不至于让内容像从屏幕外飞进来
 * - 0.35s ease-out：快速进入、迅速稳定，不拖慢阅读
 * - stagger 60ms：列表逐项出现，最后一项也不会等超过半秒
 *
 * 说明：本文件只约束 Framer Motion 驱动的入场；
 * 纯 CSS 动画（Hero 遮罩、画廊行、弹窗等）仍以各自 CSS 中的时长为准。
 */
import type { Transition } from 'framer-motion';

/** 标准入场时长（秒） */
export const MOTION_DURATION = 0.35;

/** 首屏或大区块的入场时长（秒）：比标准档略慢，给视觉留出落点 */
export const MOTION_DURATION_SLOW = 0.55;

/** 入场位移距离（像素） */
export const MOTION_DISTANCE = 14;

/** 列表逐项延迟（秒） */
export const MOTION_STAGGER = 0.06;

/**
 * 统一缓动曲线：先快后缓，收尾干净
 * 与原 PageHeader 使用的曲线接近，但对末段做了更快收敛，
 * 避免大位移元素在结束时仍有明显"滑行"。
 */
export const MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** 标准入场过渡配置，可直接展开到 transition 属性 */
export const MOTION_TRANSITION: Transition = {
  duration: MOTION_DURATION,
  ease: MOTION_EASE,
};
