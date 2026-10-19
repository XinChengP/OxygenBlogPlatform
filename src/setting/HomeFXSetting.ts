// ==================== 首页背景特效配置 ====================
// 这里只控制首页背景上的 canvas 特效。

// 总开关：关闭后首页只保留原有背景图和 CSS 流星，不再加载 canvas 特效。
export const enableHomeFX = true;

// 与 WebSetting.backgroundImage 对应的原图尺寸，用于 cover/contain 坐标换算。
// 更换背景图时请同步修改，否则水线、发梢和涟漪会错位。
export const homeFXImageSize = { width: 2844, height: 1600 } as const;

// 整体强度：1 为较明显的强度。首页文字较多，建议保持在 0.8 - 0.9。
export const homeFXIntensity = 0.85;
