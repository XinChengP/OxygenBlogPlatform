/** 唤起站内搜索弹窗的全局事件名 */
export const OPEN_SEARCH_EVENT = 'oxygen:open-search';

// 懒加载期间事件可能先于 SearchDialog 挂载发出，
// 用模块级标记把「打开」意图留给弹窗挂载后消费。
let pendingOpen = false;

export const requestSearchOpen = (): void => {
  pendingOpen = true;
};

export const consumeSearchOpenRequest = (): boolean => {
  const value = pendingOpen;
  pendingOpen = false;
  return value;
};
