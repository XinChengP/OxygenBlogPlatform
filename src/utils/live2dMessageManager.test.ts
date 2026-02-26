import live2dMessageManager from './live2dMessageManager';

// 模拟 window 对象
beforeEach(() => {
  global.window = {
    showMessage: jest.fn(),
  } as any;
});

describe('Live2DMessageManager 烟花消息测试', () => {
  beforeEach(() => {
    // 重置消息管理器状态
    live2dMessageManager.forceReset();
  });

  test('烟花模式下，普通消息应该被阻止', () => {
    // 进入烟花模式
    live2dMessageManager.enterFireworksMode();
    
    // 尝试显示普通消息
    const testMessage = '普通消息';
    live2dMessageManager.showMessage(testMessage);
    
    // 验证 showMessage 未被调用（消息被阻止）
    expect(global.window.showMessage).not.toHaveBeenCalled();
    
    // 退出烟花模式
    live2dMessageManager.exitFireworksMode();
  });

  test('烟花模式下，烟花消息应该正常显示', () => {
    // 进入烟花模式
    live2dMessageManager.enterFireworksMode();
    
    // 尝试显示烟花消息
    const testMessage = '烟花消息';
    live2dMessageManager.showFireworksMessage(testMessage);
    
    // 验证 showMessage 被调用（烟花消息正常显示）
    expect(global.window.showMessage).toHaveBeenCalledWith(testMessage, 5000);
    
    // 退出烟花模式
    live2dMessageManager.exitFireworksMode();
  });

  test('非烟花模式下，所有消息应该正常显示', () => {
    // 确保不在烟花模式
    expect(live2dMessageManager.isInFireworksMode()).toBe(false);
    
    // 尝试显示普通消息
    const testMessage = '普通消息';
    live2dMessageManager.showMessage(testMessage);
    
    // 验证 showMessage 被调用（普通消息正常显示）
    expect(global.window.showMessage).toHaveBeenCalledWith(testMessage, 3000);
  });

  test('烟花模式状态切换测试', () => {
    // 初始状态
    expect(live2dMessageManager.isInFireworksMode()).toBe(false);
    
    // 进入烟花模式
    live2dMessageManager.enterFireworksMode();
    expect(live2dMessageManager.isInFireworksMode()).toBe(true);
    
    // 退出烟花模式
    live2dMessageManager.exitFireworksMode();
    expect(live2dMessageManager.isInFireworksMode()).toBe(false);
  });

  test('showFireworksMessage 应该绕过烟花模式的阻塞', () => {
    // 进入烟花模式
    live2dMessageManager.enterFireworksMode();
    
    // 显示烟花消息
    const fireworksMessage = '烟花特效启动！';
    live2dMessageManager.showFireworksMessage(fireworksMessage);
    
    // 验证消息被显示
    expect(global.window.showMessage).toHaveBeenCalledWith(fireworksMessage, 5000);
    
    // 退出烟花模式
    live2dMessageManager.exitFireworksMode();
  });
});

describe('Live2DMessageManager 消息优先级测试', () => {
  beforeEach(() => {
    // 重置消息管理器状态
    live2dMessageManager.forceReset();
  });

  test('高优先级消息应该能够中断低优先级消息', () => {
    // 显示低优先级消息
    const lowPriorityMessage = '低优先级消息';
    live2dMessageManager.showMessage(lowPriorityMessage, 5000, 1);
    
    // 显示高优先级消息
    const highPriorityMessage = '高优先级消息';
    live2dMessageManager.showMessage(highPriorityMessage, 3000, 5);
    
    // 验证高优先级消息被显示（中断了低优先级消息）
    expect(global.window.showMessage).toHaveBeenCalledWith(highPriorityMessage, 3000);
  });

  test('彩蛋消息应该具有最高优先级', () => {
    // 显示普通消息
    const normalMessage = '普通消息';
    live2dMessageManager.showMessage(normalMessage, 5000, 1);
    
    // 显示彩蛋消息
    const easterEggMessage = '彩蛋消息';
    live2dMessageManager.showMessage(easterEggMessage, 3000, 10);
    
    // 验证彩蛋消息被显示（中断了普通消息）
    expect(global.window.showMessage).toHaveBeenCalledWith(easterEggMessage, 3000);
  });
});
