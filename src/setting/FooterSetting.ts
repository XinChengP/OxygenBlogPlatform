// 页脚配置

export const year = "2025"; // 年份
export const name = "歆橙"; // 名字
export const aWord = "Like a fish that out of water."; // 自定义一句话

/**
 * 站点上线时刻（ISO 字符串，东八区）
 *
 * 页脚的「已陪你走下去」运行时间统计使用该数据源；
 * 放在 setting 层是因为它需要被浏览器组件直接引用，不能放在依赖 fs 的 utils 里。
 */
export const siteLaunchDate = '2025-11-06T20:00:00';
