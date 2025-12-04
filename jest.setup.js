// Jest 设置文件
// 模拟浏览器 API
global.matchMedia = global.matchMedia || function () {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// 模拟 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// 模拟 performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

// 模拟 WebGL
global.WebGLRenderingContext = jest.fn();
global.WebGL2RenderingContext = jest.fn();

// 模拟 HTMLCanvasElement 的 getContext 方法
HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
  if (type === 'webgl' || type === 'experimental-webgl') {
    return {
      getParameter: jest.fn(() => 'WebGL 1.0'),
      getExtension: jest.fn(() => null),
      clearColor: jest.fn(),
      clear: jest.fn(),
    };
  }
  return null;
});

// 模拟 window 对象
global.window = {
  ...global,
  localStorage: localStorageMock,
  performance: global.performance,
};