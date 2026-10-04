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



//主题配色说明：
//界面配色的唯一来源是 src/app/globals.css 的 :root/.dark CSS 令牌
//（--color-primary / --color-secondary / --color-accent 等），
//此处不再维护任何 JS 侧的颜色声明。
//换主题色请改 globals.css；
//另有约 46 个文件硬编码 #66ccff 等字面量（admin 后台为主），改色时需一并排查
