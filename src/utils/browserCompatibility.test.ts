/**
 * 浏览器兼容性检测单元测试
 */

import { Live2DBrowserCompatibility, live2DBrowserCompatibility } from './browserCompatibility';

describe('Live2DBrowserCompatibility', () => {
  let originalUserAgent: string;
  
  beforeEach(() => {
    // 保存原始值
    originalUserAgent = navigator.userAgent;
    
    // 清除单例缓存
    (Live2DBrowserCompatibility as any).instance = null;
    live2DBrowserCompatibility.clearCache();
  });
  
  afterEach(() => {
    // 恢复原始值
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true
    });
    
    // 清理缓存
    live2DBrowserCompatibility.clearCache();
  });
  
  describe('detectCompatibility', () => {
    it('应该正确检测 Chrome 浏览器', () => {
      // 模拟 Chrome 用户代理
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true,
        configurable: true
      });
      
      const result = live2DBrowserCompatibility.detectCompatibility();
      
      expect(result.browser).toBe('Chrome');
      expect(result.version).toBe('91.0');
      expect(result.webglSupport).toBe(true);
      expect(result.localStorageSupport).toBe(true);
      expect(result.performanceSupport).toBe(true);
    });
    
    it('应该正确检测 Firefox 浏览器', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        writable: true,
        configurable: true
      });
      
      const result = live2DBrowserCompatibility.detectCompatibility();
      
      expect(result.browser).toBe('Firefox');
      expect(result.version).toBe('89.0');
    });
    
    it('应该检测 WebGL 支持', () => {
      // 模拟不支持 WebGL
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);
      
      const result = live2DBrowserCompatibility.detectCompatibility();
      
      expect(result.webglSupport).toBe(false);
      expect(result.issues).toContain('WebGL 不支持');
      expect(result.recommendations).toContain('请启用 WebGL 或使用支持的浏览器');
      
      // 恢复原始方法
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });
    
    it('应该检测 LocalStorage 支持', () => {
      // 模拟不支持 LocalStorage
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn().mockImplementation(() => {
        throw new Error('LocalStorage not supported');
      });
      
      const result = live2DBrowserCompatibility.detectCompatibility();
      
      expect(result.localStorageSupport).toBe(false);
      expect(result.issues).toContain('LocalStorage 不支持');
      expect(result.recommendations).toContain('请启用 Cookie 和本地存储');
      
      // 恢复原始方法
      Storage.prototype.setItem = originalSetItem;
    });
    
    it('应该检测版本过低的浏览器', () => {
      // 模拟旧版 Chrome
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
        writable: true,
        configurable: true
      });
      
      const result = live2DBrowserCompatibility.detectCompatibility();
      
      expect(result.issues).toContain('Chrome 版本过低');
      expect(result.recommendations).toContain('请升级到 Chrome 60 或更高版本');
    });
    
    it('应该检测 IE 浏览器并标记为不支持', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
        writable: true,
        configurable: true
      });
      
      const result = live2DBrowserCompatibility.detectCompatibility();
      
      expect(result.browser).toBe('IE');
      expect(result.issues).toContain('IE 浏览器不支持 Live2D');
      expect(result.recommendations).toContain('请使用 Chrome、Firefox、Safari 或 Edge 浏览器');
      expect(result.isSupported).toBe(false);
    });
  });
  
  describe('getCompatibilityReport', () => {
    it('应该生成格式化的兼容性报告', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true,
        configurable: true
      });
      
      const report = live2DBrowserCompatibility.getCompatibilityReport();
      
      expect(report).toContain('浏览器: Chrome 91.0');
      expect(report).toContain('支持状态: ✅ 支持');
      expect(report).toContain('WebGL: ✅ 支持');
      expect(report).toContain('LocalStorage: ✅ 支持');
      expect(report).toContain('性能API: ✅ 支持');
    });
  });
  
  describe('shouldShowWarning', () => {
    it('应该在浏览器不支持时返回 true', () => {
      // 模拟不支持的浏览器
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
        writable: true,
        configurable: true
      });
      
      const shouldShow = live2DBrowserCompatibility.shouldShowWarning();
      
      expect(shouldShow).toBe(true);
    });
    
    it('应该在有兼容性问题时返回 true', () => {
      // 模拟有问题的浏览器
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
        writable: true,
        configurable: true
      });
      
      const shouldShow = live2DBrowserCompatibility.shouldShowWarning();
      
      expect(shouldShow).toBe(true);
    });
    
    it('应该在完全支持时返回 false', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true,
        configurable: true
      });
      
      const shouldShow = live2DBrowserCompatibility.shouldShowWarning();
      
      expect(shouldShow).toBe(false);
    });
  });
  
  describe('clearCache', () => {
    it('应该清除兼容性缓存', () => {
      // 先进行一次检测
      const firstResult = live2DBrowserCompatibility.detectCompatibility();
      
      // 清除缓存
      live2DBrowserCompatibility.clearCache();
      
      // 再次检测，应该重新计算
      const secondResult = live2DBrowserCompatibility.detectCompatibility();
      
      expect(firstResult).toEqual(secondResult);
    });
  });
  
  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = Live2DBrowserCompatibility.getInstance();
      const instance2 = Live2DBrowserCompatibility.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});