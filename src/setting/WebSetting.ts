//网站基础配置
export const webTitle = "心想事成 的 Blog"; // 网站标题：浏览器显示
export const webDescription = "个人博客"; // 网站描述：浏览器显示

//网站背景图配置
export const backgroundImage = "镜境.png"; // 网站整体背景图片路径：public目录下，以/开头确保路径正确
export const enableBackground = true; // 是否启用背景图片

//背景图片显示模式配置

export const backgroundMode = "cover"; // 背景图片显示模式
/* - 'cover': 覆盖整个容器，可能会裁剪图片
 * - 'contain': 完整显示图片，可能会有空白区域
 */
export const backgroundFixed = true; // 是否固定背景（视差效果）



//预设的主题色方案，只保留蓝色主题
const themePresets = {
  blue: {
    primary: "#66ccff", // 天依蓝（洛天依应援色）
    secondary: "#1e40af", // 深蓝色
    accent: "#06b6d4", // 青色
  },
} as const;

//当前使用的主题色方案
//注意：此处仅作为"站点配色方案"的文档性声明，不再驱动任何界面颜色
//（历史上 applyThemeColors 曾用它在运行时覆盖 CSS 变量，已于 2026-10 移除）
//界面配色的真正来源是 src/app/globals.css 的 CSS 令牌：
//  - primary   → --color-primary: #66ccff（与此处一致）
//  - secondary → --color-secondary: #0066cc（与 #1e40af 已分叉）
//  - accent    → --color-accent: #0099cc（#06b6d4 对应的是 --color-chart-2）
//换主题色请改 globals.css 的 :root/.dark 令牌；
//另有约 46 个文件硬编码 #66ccff 等字面量（admin 后台为主），改色时需一并排查
export const themeColors = themePresets.blue;
