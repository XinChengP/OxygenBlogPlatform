/**
 * 洛克王国官方资源 CDN 地址构造（RocoPetSimulator 全组件唯一实现）
 *
 * 此前 15 处内联模板分散在组件各处（含多份逐字重复的皮肤判断分支），
 * 现收敛到本模块。皮肤版 id 规则：前缀 1 + 三位补零宠物 id + (skinIndex - 1)。
 */

/** 三位补零的宠物 id */
const padPetId = (id: number | string): string => String(id).padStart(3, '0');

/** 宠物战斗图标（无皮肤） */
export function getPetIconUrl(imageId: number | string): string {
  return `https://res.17roco.qq.com/res/combat/icons/${padPetId(imageId)}-.png`;
}

/** 宠物战斗图标（皮肤版，skinIndex 从 1 开始） */
export function getPetSkinIconUrl(petId: number | string, skinIndex: number): string {
  return `https://res.17roco.qq.com/res/combat/icons/1${padPetId(petId)}${skinIndex - 1}-.png`;
}

/**
 * 按皮肤配置选择宠物图标：
 * 配置了皮肤（skinIndex > 0）且该宠物确有皮肤数据时返回皮肤版，
 * 否则返回原皮版本（imageId 允许与 petId 不同，如异色/形态共用图源）。
 */
export function getPetIconUrlWithSkin(
  imageId: number | string,
  petId: number | string,
  skinIndex: number | undefined,
  hasSkinData: boolean
): string {
  if (skinIndex && skinIndex > 0 && hasSkinData) {
    return getPetSkinIconUrl(petId, skinIndex);
  }
  return getPetIconUrl(imageId);
}

/** 天赋（血脉）图标 */
export function getTalentIconUrl(talentId: number | string): string {
  return `https://res.17roco.qq.com/res/talent/${talentId}_small.png`;
}
