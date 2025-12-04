/**
 * Live2D 实例管理器 - 跨页面实例状态保持
 * 实现Live2D实例的持久化缓存、生命周期管理和跨页面复用
 */

import { live2dResourceManager, Live2DResourceConfig } from './live2dResourceManager';

export interface Live2DInstance {
  id: string;
  canvas: HTMLCanvasElement;
  model: any;
  modelPath: string;
  createdAt: number;
  lastAccessed: number;
  isActive: boolean;
  state: 'loading' | 'ready' | 'error' | 'destroyed';
  position: { x: number; y: number };
  scale: number;
  currentMotion?: string;
  currentExpression?: string;
}

export interface InstanceManagerConfig {
  maxInstances: number;
  instanceTimeout: number;
  enablePersistence: boolean;
  persistenceKey: string;
  cleanupInterval: number;
  memoryLimit: number;
}

interface CachedInstance {
  instance: Live2DInstance;
  resourceUsage: {
    memory: number;
    textures: number;
    motions: number;
  };
  lastUsed: number;
  useCount: number;
}

interface InstanceState {
  position: { x: number; y: number };
  scale: number;
  currentMotion?: string;
  currentExpression?: string;
  lastMessage?: string;
  messageTime?: number;
  theme?: string;
}

class Live2DInstanceManager {
  private instances: Map<string, CachedInstance> = new Map();
  private activeInstance: Live2DInstance | null = null;
  private config: InstanceManagerConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private persistenceTimer: NodeJS.Timeout | null = null;
  private memoryUsage: number = 0;
  private instanceCounter: number = 0;

  private readonly DEFAULT_CONFIG: InstanceManagerConfig = {
    maxInstances: 3,
    instanceTimeout: 30 * 60 * 1000, // 30分钟
    enablePersistence: true,
    persistenceKey: 'live2d-instance-state',
    cleanupInterval: 5 * 60 * 1000, // 5分钟
    memoryLimit: 100 * 1024 * 1024 // 100MB
  };

  constructor(config: Partial<InstanceManagerConfig> = {}) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.initializePersistence();
    this.startCleanupTimer();
    console.log('[Live2DInstanceManager] 初始化完成');
  }

  /**
   * 获取或创建Live2D实例
   */
  async getOrCreateInstance(
    modelPath: string,
    canvas: HTMLCanvasElement,
    options: {
      position?: { x: number; y: number };
      scale?: number;
      preserveState?: boolean;
    } = {}
  ): Promise<Live2DInstance> {
    const instanceId = this.generateInstanceId(modelPath);
    
    // 检查是否已有活跃实例
    if (this.activeInstance && this.activeInstance.id === instanceId) {
      console.log(`[Live2DInstanceManager] 复用活跃实例: ${instanceId}`);
      this.activeInstance.lastAccessed = Date.now();
      return this.activeInstance;
    }

    // 检查缓存中是否有可用实例
    const cachedInstance = this.instances.get(instanceId);
    if (cachedInstance && cachedInstance.instance.state === 'ready') {
      console.log(`[Live2DInstanceManager] 复用缓存实例: ${instanceId}`);
      return this.reuseCachedInstance(cachedInstance.instance, canvas, options);
    }

    // 创建新实例
    console.log(`[Live2DInstanceManager] 创建新实例: ${instanceId}`);
    return this.createNewInstance(modelPath, canvas, options);
  }

  /**
   * 创建新的Live2D实例
   */
  private async createNewInstance(
    modelPath: string,
    canvas: HTMLCanvasElement,
    options: {
      position?: { x: number; y: number };
      scale?: number;
      preserveState?: boolean;
    }
  ): Promise<Live2DInstance> {
    // 检查内存限制
    if (this.memoryUsage > this.config.memoryLimit) {
      await this.cleanupLeastUsedInstances();
    }

    const instanceId = this.generateInstanceId(modelPath);
    const instanceState = options.preserveState ? this.loadInstanceState() : null;

    const instance: Live2DInstance = {
      id: instanceId,
      canvas,
      model: null,
      modelPath,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
      state: 'loading',
      position: instanceState?.position || options.position || { x: 0, y: 0 },
      scale: instanceState?.scale || options.scale || 1,
      currentMotion: instanceState?.currentMotion,
      currentExpression: instanceState?.currentExpression
    };

    try {
      // 预加载资源 - 优化加载顺序
      const criticalConfigs: Live2DResourceConfig[] = [
        {
          modelPath,
          texturePath: '',
          motionPath: '',
          priority: 10,
          preload: true,
          cache: true,
          retryCount: 3,
          timeout: 30000
        }
      ];

      const loadResults = await live2dResourceManager.preloadResources(resourceConfigs);
      const successCount = loadResults.filter(r => r.success).length;
      
      if (successCount === 0) {
        throw new Error('资源加载失败');
      }

      // 初始化模型
      await this.initializeModel(instance);
      
      instance.state = 'ready';
      this.activeInstance = instance;
      
      // 缓存实例
      this.cacheInstance(instance);
      
      console.log(`[Live2DInstanceManager] 实例创建成功: ${instanceId}`);
      return instance;
      
    } catch (error) {
      instance.state = 'error';
      console.error(`[Live2DInstanceManager] 实例创建失败: ${instanceId}`, error);
      throw error;
    }
  }

  /**
   * 复用缓存的实例
   */
  private async reuseCachedInstance(
    instance: Live2DInstance,
    newCanvas: HTMLCanvasElement,
    options: {
      position?: { x: number; y: number };
      scale?: number;
    }
  ): Promise<Live2DInstance> {
    // 更新画布引用
    instance.canvas = newCanvas;
    instance.isActive = true;
    instance.lastAccessed = Date.now();
    
    // 应用新的位置和缩放
    if (options.position) {
      instance.position = options.position;
    }
    if (options.scale) {
      instance.scale = options.scale;
    }

    // 重新激活模型
    await this.reactivateModel(instance);
    
    this.activeInstance = instance;
    return instance;
  }

  /**
   * 初始化模型
   */
  private async initializeModel(instance: Live2DInstance): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).loadlive2d === 'function') {
        try {
          (window as any).loadlive2d(instance.canvas.id, instance.modelPath);
          
          // 等待模型加载完成
          const checkInterval = setInterval(() => {
            if ((window as any).Live2D && instance.canvas) {
              clearInterval(checkInterval);
              
              // 恢复之前的状态
              this.restoreInstanceState(instance);
              resolve();
            }
          }, 100);
          
          // 设置超时
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('模型初始化超时'));
          }, 10000);
          
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Live2D库未加载'));
      }
    });
  }

  /**
   * 重新激活模型
   */
  private async reactivateModel(instance: Live2DInstance): Promise<void> {
    // 重新绑定画布事件
    this.bindCanvasEvents(instance.canvas);
    
    // 恢复模型状态
    if (instance.currentMotion) {
      this.playMotion(instance, instance.currentMotion);
    }
    
    if (instance.currentExpression) {
      this.setExpression(instance, instance.currentExpression);
    }
  }

  /**
   * 缓存实例
   */
  private cacheInstance(instance: Live2DInstance): void {
    const cachedInstance: CachedInstance = {
      instance,
      resourceUsage: this.calculateResourceUsage(instance),
      lastUsed: Date.now(),
      useCount: 1
    };
    
    this.instances.set(instance.id, cachedInstance);
    this.updateMemoryUsage();
    
    // 检查实例数量限制
    if (this.instances.size > this.config.maxInstances) {
      this.evictLeastUsedInstance();
    }
  }

  /**
   * 销毁实例
   */
  async destroyInstance(instanceId: string): Promise<void> {
    const cachedInstance = this.instances.get(instanceId);
    if (!cachedInstance) return;

    const instance = cachedInstance.instance;
    
    // 保存实例状态
    if (this.config.enablePersistence) {
      this.saveInstanceState(instance);
    }
    
    // 清理模型资源
    if (instance.model) {
      this.cleanupModelResources(instance);
    }
    
    // 清理画布
    if (instance.canvas) {
      const ctx = instance.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, instance.canvas.width, instance.canvas.height);
      }
    }
    
    // 清理localStorage中的实例数据
    try {
      localStorage.removeItem(`live2d-${instanceId}`);
      console.log(`[Live2DInstanceManager] 清理localStorage实例数据: live2d-${instanceId}`);
    } catch (error) {
      console.warn(`[Live2DInstanceManager] 清理localStorage失败: live2d-${instanceId}`, error);
    }
    
    instance.state = 'destroyed';
    instance.isActive = false;
    
    // 从缓存中移除
    this.instances.delete(instanceId);
    
    // 更新活跃实例引用
    if (this.activeInstance?.id === instanceId) {
      this.activeInstance = null;
    }
    
    this.updateMemoryUsage();
    
    // 强制垃圾回收（如果可用）
    if ((window as any).gc) {
      setTimeout(() => {
        try {
          (window as any).gc();
          console.log(`[Live2DInstanceManager] 实例销毁后执行垃圾回收: ${instanceId}`);
        } catch (error) {
          console.warn('垃圾回收执行失败:', error);
        }
      }, 100);
    }
    
    console.log(`[Live2DInstanceManager] 实例销毁: ${instanceId}`);
  }

  /**
   * 清理模型资源
   */
  private cleanupModelResources(instance: Live2DInstance): void {
    try {
      // 释放纹理资源
      if ((window as any).Live2D && instance.model) {
        // 调用Live2D的清理函数
        if (typeof instance.model.release === 'function') {
          instance.model.release();
        }
      }
      
      // 清理创建的URL对象
      const urlsToRevoke = (instance as any).__createdUrls;
      if (urlsToRevoke && Array.isArray(urlsToRevoke)) {
        urlsToRevoke.forEach((url: string) => URL.revokeObjectURL(url));
      }
      
    } catch (error) {
      console.warn(`[Live2DInstanceManager] 清理模型资源时出错:`, error);
    }
  }

  /**
   * 播放动作
   */
  playMotion(instance: Live2DInstance, motionName: string): void {
    if (instance.state !== 'ready' || !instance.model) return;
    
    try {
      if (typeof instance.model.startMotion === 'function') {
        instance.model.startMotion(motionName);
        instance.currentMotion = motionName;
      }
    } catch (error) {
      console.warn(`[Live2DInstanceManager] 播放动作失败: ${motionName}`, error);
    }
  }

  /**
   * 设置表情
   */
  setExpression(instance: Live2DInstance, expressionName: string): void {
    if (instance.state !== 'ready' || !instance.model) return;
    
    try {
      if (typeof instance.model.setExpression === 'function') {
        instance.model.setExpression(expressionName);
        instance.currentExpression = expressionName;
      }
    } catch (error) {
      console.warn(`[Live2DInstanceManager] 设置表情失败: ${expressionName}`, error);
    }
  }

  /**
   * 绑定画布事件
   */
  private bindCanvasEvents(canvas: HTMLCanvasElement): void {
    // 防止内存泄漏，先移除旧的事件监听器
    this.unbindCanvasEvents(canvas);
    
    const eventHandlers = {
      mouseenter: () => this.handleCanvasMouseEnter(canvas),
      mouseleave: () => this.handleCanvasMouseLeave(canvas),
      click: (event: MouseEvent) => this.handleCanvasClick(canvas, event)
    };
    
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      canvas.addEventListener(event, handler as EventListener);
    });
    
    // 存储事件处理器引用以便后续清理
    (canvas as any).__live2dEventHandlers = eventHandlers;
  }

  /**
   * 解绑画布事件
   */
  private unbindCanvasEvents(canvas: HTMLCanvasElement): void {
    const handlers = (canvas as any).__live2dEventHandlers;
    if (handlers) {
      Object.entries(handlers).forEach(([event, handler]) => {
        canvas.removeEventListener(event, handler as EventListener);
      });
      delete (canvas as any).__live2dEventHandlers;
    }
  }

  /**
   * 画布事件处理
   */
  private handleCanvasMouseEnter(canvas: HTMLCanvasElement): void {
    // 实现鼠标进入逻辑
  }

  private handleCanvasMouseLeave(canvas: HTMLCanvasElement): void {
    // 实现鼠标离开逻辑
  }

  private handleCanvasClick(canvas: HTMLCanvasElement, event: MouseEvent): void {
    // 实现点击逻辑
  }

  /**
   * 保存实例状态
   */
  private saveInstanceState(instance: Live2DInstance): void {
    if (!this.config.enablePersistence) return;
    
    const state: InstanceState = {
      position: instance.position,
      scale: instance.scale,
      currentMotion: instance.currentMotion,
      currentExpression: instance.currentExpression,
      lastMessage: (instance as any).__lastMessage,
      messageTime: (instance as any).__messageTime,
      theme: (instance as any).__currentTheme
    };
    
    // 持久化到localStorage（压缩存储，避免存储空间过大）
    try {
      const compressedState = {
        p: state.position,
        s: state.scale,
        m: state.currentMotion,
        e: state.currentExpression,
        l: state.lastMessage,
        t: state.messageTime,
        th: state.theme
      };
      localStorage.setItem(this.config.persistenceKey, JSON.stringify(compressedState));
    } catch (error) {
      console.warn(`[Live2DInstanceManager] 无法保存实例状态到localStorage:`, error);
      // 如果localStorage满了，尝试清理旧数据
      this.cleanupLocalStorage();
    }
  }

  /**
   * 加载实例状态
   */
  private loadInstanceState(): InstanceState | null {
    if (!this.config.enablePersistence) return null;
    
    try {
      const stored = sessionStorage.getItem(this.config.persistenceKey);
      if (stored) {
        return JSON.parse(stored) as InstanceState;
      }
    } catch (error) {
      console.warn(`[Live2DInstanceManager] 加载实例状态失败:`, error);
    }
    
    return null;
  }

  /**
   * 恢复实例状态
   */
  private restoreInstanceState(instance: Live2DInstance): void {
    const state = this.loadInstanceState();
    if (!state) return;
    
    // 恢复位置
    if (state.position) {
      instance.position = state.position;
    }
    
    // 恢复缩放
    if (state.scale) {
      instance.scale = state.scale;
    }
    
    // 恢复动作
    if (state.currentMotion) {
      instance.currentMotion = state.currentMotion;
    }
    
    // 恢复表情
    if (state.currentExpression) {
      instance.currentExpression = state.currentExpression;
    }
    
    // 存储额外状态
    (instance as any).__lastMessage = state.lastMessage;
    (instance as any).__messageTime = state.messageTime;
    (instance as any).__currentTheme = state.theme;
  }

  /**
   * 初始化持久化
   */
  private initializePersistence(): void {
    if (!this.config.enablePersistence) return;
    
    // 监听页面卸载事件
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.activeInstance) {
          this.saveInstanceState(this.activeInstance);
        }
      });
      
      // 定期保存状态
      this.persistenceTimer = setInterval(() => {
        if (this.activeInstance) {
          this.saveInstanceState(this.activeInstance);
        }
      }, 30000); // 每30秒保存一次
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 执行清理
   */
  private performCleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [id, cached] of this.instances.entries()) {
      // 跳过活跃实例
      if (cached.instance.isActive) continue;
      
      // 检查超时
      if (now - cached.lastUsed > this.config.instanceTimeout) {
        toRemove.push(id);
        continue;
      }
      
      // 检查资源使用
      if (cached.resourceUsage.memory > 50 * 1024 * 1024) { // 50MB
        toRemove.push(id);
      }
    }
    
    // 移除过期实例
    toRemove.forEach(id => {
      this.destroyInstance(id);
    });
    
    // 清理localStorage中的过期数据
    this.cleanupLocalStorage();
    
    // 如果资源使用超过阈值，执行更激进的清理
    const totalInstances = this.instances.size;
    if (totalInstances > this.config.maxInstances * 1.5) {
      console.log(`[Live2DInstanceManager] 实例数量过多(${totalInstances})，执行深度清理`);
      this.aggressiveCleanup();
    }
    
    if (toRemove.length > 0) {
      console.log(`[Live2DInstanceManager] 清理完成，移除 ${toRemove.length} 个实例`);
    }
  }
  
  /**
   * 清理localStorage中的过期数据
   */
  private cleanupLocalStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      for (const key of keys) {
        if (key.startsWith('live2d-')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const data = JSON.parse(value);
              // 检查是否有过期时间字段
              if (data.t && now - data.t > oneDay) {
                localStorage.removeItem(key);
                console.log(`[Live2DInstanceManager] 清理localStorage过期数据: ${key}`);
              }
            }
          } catch (error) {
            // 如果解析失败，删除该键
            localStorage.removeItem(key);
            console.log(`[Live2DInstanceManager] 清理localStorage损坏数据: ${key}`);
          }
        }
      }
    } catch (error) {
      console.warn('[Live2DInstanceManager] 清理localStorage失败:', error);
    }
  }
  
  /**
   * 激进清理 - 保留最近使用的实例
   */
  private aggressiveCleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const twoHours = 2 * oneHour;
    
    // 按最近使用时间排序，移除最久未使用的非活跃实例
    const candidates = Array.from(this.instances.entries())
      .filter(([_, cached]) => !cached.instance.isActive)
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    
    const toRemove = candidates.slice(0, Math.ceil(candidates.length * 0.3));
    
    toRemove.forEach(([id]) => {
      console.log(`[Live2DInstanceManager] 深度清理实例: ${id}`);
      this.destroyInstance(id);
    });
    
    // 清理内存中的临时数据
    if ((window as any).gc) {
      try {
        (window as any).gc();
        console.log('[Live2DInstanceManager] 执行垃圾回收');
      } catch (error) {
        console.warn('[Live2DInstanceManager] 垃圾回收执行失败:', error);
      }
    }
    
    // 清理图片缓存
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        img.remove();
      }
    });
  }

  /**
   * 清理最少使用的实例
   */
  private async cleanupLeastUsedInstances(): Promise<void> {
    const instances = Array.from(this.instances.entries())
      .filter(([_, cached]) => !cached.instance.isActive)
      .sort((a, b) => a[1].useCount - b[1].useCount);
    
    const toRemove = instances.slice(0, Math.ceil(instances.length * 0.3));
    
    for (const [id] of toRemove) {
      await this.destroyInstance(id);
    }
  }

  /**
   * 淘汰最少使用的实例
   */
  private evictLeastUsedInstance(): void {
    const instances = Array.from(this.instances.entries())
      .filter(([_, cached]) => !cached.instance.isActive)
      .sort((a, b) => {
        const scoreA = a[1].useCount * 0.7 + (Date.now() - a[1].lastUsed) * 0.0001;
        const scoreB = b[1].useCount * 0.7 + (Date.now() - b[1].lastUsed) * 0.0001;
        return scoreA - scoreB;
      });
    
    if (instances.length > 0) {
      const [id] = instances[0];
      this.destroyInstance(id);
    }
  }

  /**
   * 计算资源使用量
   */
  private calculateResourceUsage(instance: Live2DInstance): {
    memory: number;
    textures: number;
    motions: number;
  } {
    let memory = 0;
    let textures = 0;
    let motions = 0;
    
    // 估算画布内存使用
    if (instance.canvas) {
      memory += instance.canvas.width * instance.canvas.height * 4; // RGBA
    }
    
    // 估算模型内存使用
    if (instance.model) {
      memory += 1024 * 1024; // 粗略估计1MB
      
      // 统计纹理和动作数量
      if (instance.model.textures) {
        textures = instance.model.textures.length;
        memory += textures * 512 * 512 * 4; // 假设每个纹理512x512
      }
      
      if (instance.model.motions) {
        motions = Object.keys(instance.model.motions).length;
        memory += motions * 100 * 1024; // 假设每个动作100KB
      }
    }
    
    return { memory, textures, motions };
  }

  /**
   * 更新内存使用量
   */
  private updateMemoryUsage(): void {
    this.memoryUsage = Array.from(this.instances.values())
      .reduce((total, cached) => total + cached.resourceUsage.memory, 0);
  }

  /**
   * 生成实例ID
   */
  private generateInstanceId(modelPath: string): string {
    return `live2d-${modelPath.replace(/[^a-zA-Z0-9]/g, '-')}-${++this.instanceCounter}`;
  }

  /**
   * 获取实例状态（用于状态恢复）
   */
  getInstanceState(instanceId: string): InstanceState | null {
    const state = this.loadInstanceState();
    if (state) {
      console.log(`[Live2DInstanceManager] 获取实例状态: ${instanceId}`, state);
      // 更新最后访问时间
      state.lastAccessTime = Date.now();
      return state;
    }
    
    // 尝试从localStorage恢复
    try {
      const savedState = localStorage.getItem('live2d-instance-state');
      if (savedState) {
        const compressedState = JSON.parse(savedState);
        // 解压缩状态数据
        const decompressedState: InstanceState = {
          position: compressedState.p || { x: 0, y: 0 },
          scale: compressedState.s || 1,
          currentMotion: compressedState.m,
          currentExpression: compressedState.e,
          lastMessage: compressedState.l,
          messageTime: compressedState.t,
          theme: compressedState.th
        };
        
        console.log(`[Live2DInstanceManager] 从localStorage恢复实例状态: ${instanceId}`, decompressedState);
        return decompressedState;
      }
    } catch (error) {
      console.warn('[Live2DInstanceManager] 从localStorage恢复实例状态失败:', error);
    }
    
    return null;
  }

  /**
   * 获取实例统计
   */
  getInstanceStats(): {
    totalInstances: number;
    activeInstances: number;
    cachedInstances: number;
    memoryUsage: number;
    memoryLimit: number;
    averageUseCount: number;
  } {
    const instances = Array.from(this.instances.values());
    const totalUseCount = instances.reduce((sum, cached) => sum + cached.useCount, 0);
    
    return {
      totalInstances: this.instances.size,
      activeInstances: instances.filter(cached => cached.instance.isActive).length,
      cachedInstances: instances.filter(cached => !cached.instance.isActive).length,
      memoryUsage: this.memoryUsage,
      memoryLimit: this.config.memoryLimit,
      averageUseCount: instances.length > 0 ? totalUseCount / instances.length : 0
    };
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    // 停止定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }
    
    // 销毁所有实例
    const destroyPromises = Array.from(this.instances.keys()).map(id => 
      this.destroyInstance(id)
    );
    
    await Promise.all(destroyPromises);
    
    // 清理sessionStorage
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      sessionStorage.removeItem(this.config.persistenceKey);
    }
    
    console.log('[Live2DInstanceManager] 管理器销毁完成');
  }
}

// 创建全局单例实例
export const live2dInstanceManager = new Live2DInstanceManager();

export default live2dInstanceManager;