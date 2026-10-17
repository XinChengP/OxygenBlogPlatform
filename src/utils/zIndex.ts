/**
 * 全站层级令牌
 *
 * 之前各组件直接写 z-[100000]、z-[9999]、z-[100] 等魔数，
 * 导致导航栏盖住搜索弹窗、播放器盖住模态层。这里统一排序：
 * 页面内容 < 装饰/浮动控件 < 导航 < 模态弹层 < 轻提示。
 */
export const Z_INDEX = {
  /** 灯笼等页面装饰层 */
  decoration: 20,
  /** 返回顶部、音乐播放器等常驻浮动控件 */
  floatingControls: 40,
  /** 烟花等全屏特效：位于内容之上、导航之下 */
  fireworksMask: 89,
  fireworks: 90,
  /** 顶部导航栏 */
  navigation: 100,
  /** 移动端展开菜单 */
  mobileMenu: 110,
  /** 模态遮罩 */
  modalBackdrop: 1000,
  /** 模态内容 */
  modal: 1001,
  /** Toast / 全局提示 */
  toast: 1100,
} as const;
