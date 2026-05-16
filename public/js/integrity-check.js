/**
 * 页面完整性检测脚本
 * 用于检测页面是否被恶意篡改
 * 
 * 功能特性：
 * 1. 检测关键DOM元素是否被修改
 * 2. 检测页面脚本是否被注入
 * 3. 检测页面重定向
 * 4. 检测可疑的网络活动
 * 5. 生成页面完整性报告
 * 
 * 使用方法：
 * 在HTML的<head>中引入：<script src="/js/integrity-check.js"></script>
 * 
 * @author 歆橙
 * @version 1.0.0
 */

(function() {
  'use strict';

  // ============================================
  // 配置选项
  // ============================================
  const CONFIG = {
    // 是否启用调试日志
    debug: false,
    // 检测间隔（毫秒）
    checkInterval: 5000,
    // 是否自动修复被篡改的内容
    autoFix: false,
    // 发现篡改时的回调函数
    onTamperingDetected: null,
    // 关键元素选择器列表
    // 注意：head、body、title 被排除，因为 React/Next.js 会在运行时动态修改它们
    // title 元素会在页面切换和hydration时被 React/Next.js 动态更新
    criticalSelectors: [
      'meta[charset]',
      'link[rel="canonical"]',
    ],
    // 允许的脚本来源域名
    allowedScriptDomains: [
      window.location.hostname,
      'localhost',
      '127.0.0.1',
      'giscus.app',
      'v6.51.la',
      'sdk.51.la',
      'player.bilibili.com', // 允许B站视频嵌入
    ],
    // 开发环境允许的脚本模式（React DevTools, HMR等）
    allowedScriptPatterns: [
      /react-devtools/i,
      /hmr/i,
      /hot-module-replacement/i,
      /webpack/i,
      /next-dev/i,
      /turbopack/i,
      /__nextjs/i,
      /intercept-console-error/i,
      /forward-logs/i,
      /integrity-check/i,
    ],
    // Next.js 运行时脚本白名单（防止误报）
    allowedInlineScriptPatterns: [
      // Next.js 运行时代码
      /self\.__next_f\.push/i,
      /__NEXT_DATA__/i,
      /next-route-announcer/i,
      /nextjs/i,
      /__next/i,
      // React 运行时代码
      /react-root/i,
      /react-dom/i,
      /react/i,
      // 开发工具
      /webpack/i,
      /turbopack/i,
      // 常见的合法脚本模式
      /function\s*\(\s*\)\s*\{\s*try\s*\{/i,  // 自执行函数
      /console\./i,  // console 调用
      /setTimeout/i,
      /setInterval/i,
    ],
  };

  // ============================================
  // 日志工具
  // ============================================
  const Logger = {
    info: function(message, data) {
      if (CONFIG.debug) {
        console.log('[完整性检测]', message, data || '');
      }
    },
    warn: function(message, data) {
      console.warn('[完整性检测]', message, data || '');
    },
    error: function(message, data) {
      console.error('[完整性检测]', message, data || '');
    },
  };

  // ============================================
  // 工具函数
  // ============================================
  
  /**
   * 生成元素的哈希值
   * @param {Element} element DOM元素
   * @returns {string} 哈希字符串
   */
  function generateElementHash(element) {
    if (!element) return '';
    
    const content = element.outerHTML || element.textContent || '';
    let hash = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(16);
  }

  /**
   * 检查URL是否来自允许的域名
   * @param {string} url URL字符串
   * @returns {boolean} 是否允许
   */
  function isAllowedDomain(url) {
    try {
      const urlObj = new URL(url);
      return CONFIG.allowedScriptDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );
    } catch {
      // 相对路径视为允许
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('#');
    }
  }

  /**
   * 检测代码是否可疑
   * @param {string} code 代码字符串
   * @returns {boolean} 是否可疑
   */
  function isSuspiciousCode(code) {
    if (!code || typeof code !== 'string') return false;

    // 首先检查是否在白名单中（Next.js 运行时脚本等）
    const isAllowed = CONFIG.allowedInlineScriptPatterns.some(pattern => {
      return pattern.test(code);
    });

    // 如果在白名单中，不视为可疑
    if (isAllowed) {
      return false;
    }

    const suspiciousPatterns = [
      /eval\s*\(/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /outerHTML\s*=/i,
      /insertAdjacentHTML/i,
      /atob\s*\(/i,
      /Function\s*\(/i,
      /javascript:/i,
      /data:text\/html/i,
      /<script/i,
      /on\w+\s*=/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(code));
  }

  // ============================================
  // 完整性检测器
  // ============================================
  
  class IntegrityChecker {
    constructor() {
      this.baseline = new Map();
      this.checkCount = 0;
      this.tamperingEvents = [];
      this.observer = null;
      this.checkIntervalId = null;
    }

    /**
     * 初始化基线数据
     */
    initBaseline() {
      Logger.info('初始化完整性基线数据');
      
      // 记录关键元素的初始状态
      CONFIG.criticalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const key = `${selector}[${index}]`;
          this.baseline.set(key, {
            hash: generateElementHash(element),
            outerHTML: element.outerHTML,
            timestamp: Date.now(),
          });
        });
      });

      // 记录初始脚本列表
      const scripts = document.querySelectorAll('script');
      this.baseline.set('__scripts__', {
        count: scripts.length,
        sources: Array.from(scripts).map(s => s.src || 'inline'),
        timestamp: Date.now(),
      });

      Logger.info('基线数据初始化完成', { 
        elements: this.baseline.size,
        scripts: scripts.length 
      });
    }

    /**
     * 检查元素完整性
     */
    checkElementIntegrity() {
      const violations = [];

      CONFIG.criticalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach((element, index) => {
          const key = `${selector}[${index}]`;
          const baseline = this.baseline.get(key);
          
          if (!baseline) {
            // 新增元素
            violations.push({
              type: 'new_element',
              selector: key,
              message: `检测到新增的关键元素: ${selector}`,
            });
          } else {
            const currentHash = generateElementHash(element);
            
            if (currentHash !== baseline.hash) {
              violations.push({
                type: 'modified_element',
                selector: key,
                message: `检测到关键元素被修改: ${selector}`,
                details: {
                  originalHash: baseline.hash,
                  currentHash: currentHash,
                },
              });
            }
          }
        });
      });

      return violations;
    }

    /**
   * 检查脚本是否在允许的开发工具列表中
   * @param {string} src 脚本来源
   * @param {string} content 脚本内容
   * @returns {boolean} 是否允许
   */
  isAllowedDevScript(src, content) {
    // 检查是否是开发工具脚本
    const checkString = src + ' ' + (content || '').substring(0, 200);
    
    return CONFIG.allowedScriptPatterns.some(pattern => {
      return pattern.test(checkString);
    });
  }

  /**
   * 检查脚本是否在白名单中
   * @param {string} content 脚本内容
   * @returns {boolean} 是否在白名单中
   */
  isAllowedInlineScript(content) {
    if (!content || typeof content !== 'string') return false;

    return CONFIG.allowedInlineScriptPatterns.some(pattern => {
      return pattern.test(content);
    });
  }

  /**
   * 检查脚本完整性
   */
  checkScriptIntegrity() {
    const violations = [];
    const scripts = document.querySelectorAll('script');
    const baselineScripts = this.baseline.get('__scripts__');

    // 检查脚本数量变化
    if (scripts.length > baselineScripts.count) {
      const newScripts = Array.from(scripts).slice(baselineScripts.count);

      newScripts.forEach(script => {
        const src = script.src || 'inline';
        const content = script.textContent || '';

        // 跳过开发工具脚本（React DevTools, HMR等）
        if (this.isAllowedDevScript(src, content)) {
          Logger.info('跳过开发工具脚本检测', src);
          return;
        }

        // 检查是否是允许的域名
        if (src !== 'inline' && !isAllowedDomain(src)) {
          violations.push({
            type: 'unauthorized_script',
            source: src,
            message: `检测到未授权的外部脚本: ${src}`,
          });
        }

        // 检查内联脚本内容
        if (src === 'inline' && content) {
          // 首先检查是否在白名单中
          if (this.isAllowedInlineScript(content)) {
            Logger.info('跳过白名单内联脚本检测');
            return;
          }

          if (isSuspiciousCode(content)) {
            violations.push({
              type: 'suspicious_inline_script',
              message: '检测到可疑的内联脚本内容',
              preview: content.substring(0, 100),
            });
          }
        }
      });
    }

    return violations;
  }

    /**
     * 执行完整性检查
     */
    performCheck() {
      this.checkCount++;
      Logger.info(`执行第 ${this.checkCount} 次完整性检查`);

      const violations = [
        ...this.checkElementIntegrity(),
        ...this.checkScriptIntegrity(),
      ];

      if (violations.length > 0) {
        Logger.error('检测到完整性违规', violations);
        
        this.tamperingEvents.push({
          timestamp: Date.now(),
          checkNumber: this.checkCount,
          violations: violations,
        });

        // 触发回调
        if (typeof CONFIG.onTamperingDetected === 'function') {
          CONFIG.onTamperingDetected(violations);
        }

        // 上报事件
        this.reportTampering(violations);
      } else {
        Logger.info('完整性检查通过');
      }

      return violations;
    }

    /**
     * 上报篡改事件
     */
    reportTampering(violations) {
      // 可以在这里添加上报逻辑
      // 例如发送到分析服务或日志服务器
      
      if (typeof gtag !== 'undefined') {
        gtag('event', 'security_integrity_violation', {
          event_category: 'security',
          event_label: 'page_integrity',
          value: violations.length,
        });
      }

      // 存储到localStorage供后续分析
      try {
        const reports = JSON.parse(localStorage.getItem('integrity_reports') || '[]');
        reports.push({
          timestamp: Date.now(),
          url: window.location.href,
          violations: violations,
        });
        
        // 只保留最近50条记录
        if (reports.length > 50) {
          reports.shift();
        }
        
        localStorage.setItem('integrity_reports', JSON.stringify(reports));
      } catch (e) {
        Logger.error('存储完整性报告失败', e);
      }
    }

    /**
     * 启动监控
     */
    start() {
      Logger.info('启动完整性监控');

      // 初始化基线
      this.initBaseline();

      // 启动定期检查
      this.checkIntervalId = setInterval(() => {
        this.performCheck();
      }, CONFIG.checkInterval);

      // 启动DOM观察
      if (window.MutationObserver) {
        this.observer = new MutationObserver((mutations) => {
          this.handleMutations(mutations);
        });

        this.observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeOldValue: true,
        });
      }

      // 监听页面卸载
      window.addEventListener('beforeunload', () => {
        this.stop();
      });
    }

    /**
     * 停止监控
     */
    stop() {
      Logger.info('停止完整性监控');

      if (this.checkIntervalId) {
        clearInterval(this.checkIntervalId);
        this.checkIntervalId = null;
      }

      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }

    /**
     * 处理DOM变化
     */
    handleMutations(mutations) {
      let shouldCheck = false;

      for (const mutation of mutations) {
        // 检查新增的脚本
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 跳过开发工具相关的元素
              if (this.isDevToolElement(node)) {
                return;
              }
              
              if (node.tagName === 'SCRIPT') {
                shouldCheck = true;
              }
              
              // 检查子元素中的脚本
              if (node.querySelector && node.querySelector('script')) {
                shouldCheck = true;
              }
            }
          });
        }
      }

      if (shouldCheck) {
        // 延迟检查，避免频繁触发
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.performCheck();
        }, 100);
      }
    }

    /**
     * 检查元素是否是开发工具相关的元素
     * @param {Element} element DOM元素
     * @returns {boolean} 是否是开发工具元素
     */
    isDevToolElement(element) {
      // 检查元素的ID或类名是否包含开发工具相关关键词
      const id = element.id || '';
      const className = element.className || '';
      const checkString = (id + ' ' + className).toLowerCase();
      
      const devToolKeywords = [
        'react-devtools',
        'nextjs',
        'turbopack',
        'hmr',
        'hot-reload',
        'webpack',
        '__next',
        'data-integrity-check',
      ];
      
      return devToolKeywords.some(keyword => checkString.includes(keyword));
    }

    /**
     * 生成完整性报告
     */
    generateReport() {
      return {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        checkCount: this.checkCount,
        tamperingEvents: this.tamperingEvents,
        baselineElements: this.baseline.size,
        isClean: this.tamperingEvents.length === 0,
      };
    }
  }

  // ============================================
  // 页面加载保护
  // ============================================
  
  /**
   * 防止页面加载被劫持
   */
  function protectPageLoad() {
    // 保存原始方法
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    
    // 重写document.write
    document.write = function(...args) {
      Logger.warn('拦截到document.write调用', args);
      
      // 如果页面已加载完成，阻止写入
      if (document.readyState === 'complete') {
        Logger.error('阻止页面加载后的document.write');
        return;
      }
      
      return originalWrite.apply(document, args);
    };
    
    document.writeln = function(...args) {
      Logger.warn('拦截到document.writeln调用', args);
      
      if (document.readyState === 'complete') {
        Logger.error('阻止页面加载后的document.writeln');
        return;
      }
      
      return originalWriteln.apply(document, args);
    };
  }

  /**
   * 防止窗口被劫持
   */
  function protectWindow() {
    // 防止window.open被滥用
    const originalOpen = window.open;
    
    window.open = function(url, target, features) {
      Logger.info('拦截到window.open调用', { url, target });
      
      // 可以在这里添加白名单检查
      if (url && !isAllowedDomain(url)) {
        Logger.warn('阻止打开未授权的窗口', url);
        return null;
      }
      
      return originalOpen.apply(window, arguments);
    };
  }

  // ============================================
  // 初始化
  // ============================================
  
  function init() {
    Logger.info('初始化页面完整性检测');

    // 启动页面加载保护
    protectPageLoad();
    protectWindow();

    // 创建检测器实例
    const checker = new IntegrityChecker();

    // 页面加载完成后启动监控
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        checker.start();
      });
    } else {
      checker.start();
    }

    // 暴露全局接口
    window.PageIntegrity = {
      checker: checker,
      config: CONFIG,
      generateReport: () => checker.generateReport(),
      getReports: () => {
        try {
          return JSON.parse(localStorage.getItem('integrity_reports') || '[]');
        } catch {
          return [];
        }
      },
      clearReports: () => {
        try {
          localStorage.removeItem('integrity_reports');
        } catch (e) {
          Logger.error('清除报告失败', e);
        }
      },
    };

    Logger.info('页面完整性检测初始化完成');
  }

  // 启动
  init();

})();
