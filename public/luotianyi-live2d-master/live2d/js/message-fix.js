/**
 * Live2D消息系统修复
 * 解决初始加载后消息不再显示的问题
 */

(function() {
    'use strict';
    
    console.log('🔧 Live2D消息系统修复加载中...');
    
    // 等待DOM和依赖加载完成
    function waitForDependencies(callback, maxAttempts = 50) {
        let attempts = 0;
        const checkDependencies = () => {
            attempts++;
            
            // 检查必要的依赖是否加载完成
            const hasJQuery = typeof window.jQuery !== 'undefined';
            const hasLive2D = typeof window.loadlive2d !== 'undefined';
            const hasMessageContainer = document.getElementById('live2d-message-container') || document.querySelector('.message');
            
            console.log(`第${attempts}次依赖检查:`, {
                jQuery: hasJQuery,
                live2D: hasLive2D,
                messageContainer: !!hasMessageContainer,
                attempts: attempts
            });
            
            if ((hasJQuery || attempts > 20) && attempts < maxAttempts) {
                setTimeout(callback, 500);
            } else if (attempts < maxAttempts) {
                setTimeout(checkDependencies, 200);
            } else {
                console.warn('⚠️ 依赖检查超时，继续执行修复');
                callback();
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkDependencies);
        } else {
            checkDependencies();
        }
    }
    
    // 修复消息系统
    function fixMessageSystem() {
        console.log('🚀 开始修复消息系统...');
        
        // 1. 确保消息容器存在
        ensureMessageContainers();
        
        // 2. 修复全局消息函数
        fixGlobalMessageFunction();
        
        // 3. 修复事件监听
        fixEventListeners();
        
        // 4. 移除冲突的频率限制
        removeFrequencyLimits();
        
        // 5. 确保CSS正确应用
        fixCSS();
        
        console.log('✅ 消息系统修复完成');
    }
    
    // 确保所有消息容器都存在
    function ensureMessageContainers() {
        console.log('📦 检查消息容器...');
        
        // 检查原始消息容器
        let originalMessage = document.querySelector('.message');
        if (!originalMessage) {
            console.log('创建原始消息容器...');
            originalMessage = document.createElement('div');
            originalMessage.className = 'message';
            originalMessage.style.cssText = `
                opacity: 0;
                width: 240px;
                height: auto;
                margin: auto;
                padding: 12px 16px;
                top: -120px;
                left: 20px;
                text-align: center;
                border: 1px solid rgba(102,204,255,.3);
                border-radius: 16px;
                background: linear-gradient(135deg, rgba(102,204,255,.15) 0%, rgba(102,204,255,.05) 100%);
                box-shadow: 0 8px 32px rgba(102,204,255,.2);
                font-size: 14px;
                font-weight: 500;
                text-overflow: ellipsis;
                overflow: hidden;
                position: absolute;
                z-index: 9998;
                backdrop-filter: blur(10px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform: translateY(10px) scale(0.95);
                pointer-events: none;
            `;
            
            const landlord = document.getElementById('landlord');
            if (landlord) {
                landlord.appendChild(originalMessage);
                console.log('✅ 原始消息容器已创建并添加到landlord');
            }
        }
        
        // 检查GlobalMessageManager容器
        const globalContainer = document.getElementById('live2d-message-container');
        if (!globalContainer && typeof window.GlobalMessageManager !== 'undefined') {
            console.log('创建GlobalMessageManager容器...');
            // 触发GlobalMessageManager的初始化
            if (window.GlobalMessageManager.init) {
                window.GlobalMessageManager.init();
            }
        }
    }
    
    // 修复全局消息函数
    function fixGlobalMessageFunction() {
        console.log('🔧 修复全局消息函数...');
        
        // 保存原始showMessage
        const originalShowMessage = window.showMessage;
        
        // 创建增强版showMessage
        window.showMessage = function(text, timeout = 4000) {
            console.log('📢 showMessage被调用:', text, 'timeout:', timeout);
            
            try {
                // 尝试所有可能的消息系统
                let success = false;
                
                // 1. 尝试原始showMessage
                if (originalShowMessage) {
                    try {
                        originalShowMessage(text, timeout);
                        success = true;
                        console.log('✅ 原始showMessage成功');
                    } catch (error) {
                        console.warn('原始showMessage失败:', error);
                    }
                }
                
                // 2. 尝试GlobalMessageManager
                if (!success && window.GlobalMessageManager && window.GlobalMessageManager.show) {
                    try {
                        window.GlobalMessageManager.show(text, timeout);
                        success = true;
                        console.log('✅ GlobalMessageManager成功');
                    } catch (error) {
                        console.warn('GlobalMessageManager失败:', error);
                    }
                }
                
                // 3. 尝试live2dOptimized
                if (!success && window.live2dOptimized && window.live2dOptimized.showMessage) {
                    try {
                        window.live2dOptimized.showMessage(text, timeout);
                        success = true;
                        console.log('✅ live2dOptimized成功');
                    } catch (error) {
                        console.warn('live2dOptimized失败:', error);
                    }
                }
                
                // 4. 手动显示（最后手段）
                if (!success) {
                    manualShowMessage(text, timeout);
                }
                
            } catch (error) {
                console.error('❌ showMessage完全失败:', error);
            }
        };
        
        console.log('✅ 全局消息函数已修复');
    }
    
    // 手动显示消息（最后手段）
    function manualShowMessage(text, timeout) {
        console.log('🛠️ 使用手动消息显示');
        
        const messageEl = document.querySelector('.message') || document.getElementById('live2d-message');
        
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.style.opacity = '1';
            messageEl.style.display = 'block';
            
            // 添加显示动画
            messageEl.classList.remove('hide');
            messageEl.classList.add('show');
            
            // 自动隐藏
            setTimeout(() => {
                messageEl.classList.remove('show');
                messageEl.classList.add('hide');
                
                setTimeout(() => {
                    messageEl.style.opacity = '0';
                    messageEl.style.display = 'none';
                }, 300);
            }, timeout);
            
            console.log('✅ 手动消息显示成功');
        } else {
            console.error('❌ 找不到消息元素');
        }
    }
    
    // 修复事件监听
    function fixEventListeners() {
        console.log('👂 修复事件监听...');
        
        // 确保复制事件正常工作
        if (document.addEventListener) {
            // 移除可能存在的旧监听器
            document.removeEventListener('copy', handleCopyEvent, true);
            // 添加新的监听器
            document.addEventListener('copy', handleCopyEvent, true);
            console.log('✅ 复制事件监听器已修复');
        }
        
        // 修复点击事件
        document.addEventListener('click', handleClickEvent);
    }
    
    // 复制事件处理
    function handleCopyEvent(event) {
        console.log('📋 复制事件触发');
        
        // 延迟执行，确保复制操作完成
        setTimeout(() => {
            const selection = window.getSelection()?.toString();
            if (selection && selection.length > 5) {
                const messages = [
                    '复制成功！代码已复制到剪贴板~',
                    '已复制！现在可以粘贴使用啦~',
                    '复制完成！天依帮你复制好了~'
                ];
                const message = messages[Math.floor(Math.random() * messages.length)];
                window.showMessage(message, 2000);
            }
        }, 100);
    }
    
    // 点击事件处理
    function handleClickEvent(event) {
        const target = event.target;
        
        // 检查是否是复制按钮
        if (target.closest && target.closest('.copy-button, [data-copy]')) {
            console.log('🖱️ 复制按钮点击');
            
            setTimeout(() => {
                const messages = [
                    '复制成功！代码已复制到剪贴板~',
                    '已复制！现在可以粘贴使用啦~',
                    '复制完成！天依帮你复制好了~'
                ];
                const message = messages[Math.floor(Math.random() * messages.length)];
                window.showMessage(message, 2000);
            }, 200);
        }
    }
    
    // 移除频率限制
    function removeFrequencyLimits() {
        console.log('🚫 移除频率限制...');
        
        // 移除各种频率限制
        window.__lastMessageTime = 0;
        window.__lastCopyMessageTime = 0;
        
        // 覆盖GlobalMessageManager的频率限制
        if (window.GlobalMessageManager && window.GlobalMessageManager.show) {
            const originalShow = window.GlobalMessageManager.show;
            window.GlobalMessageManager.show = function(text, duration = 3000) {
                console.log('🔄 GlobalMessageManager.show被调用:', text);
                
                const messageElement = document.getElementById('live2d-message');
                const contentElement = messageElement?.querySelector('.message-content');
                
                if (messageElement && contentElement) {
                    contentElement.textContent = text;
                    messageElement.classList.add('show');
                    
                    setTimeout(() => {
                        messageElement.classList.remove('show');
                    }, duration);
                    
                    console.log('✅ GlobalMessageManager消息显示成功');
                }
            };
        }
        
        console.log('✅ 频率限制已移除');
    }
    
    // 修复CSS
    function fixCSS() {
        console.log('🎨 修复CSS...');
        
        // 确保关键CSS存在
        const style = document.createElement('style');
        style.textContent = `
            .message.show, #live2d-message.show {
                opacity: 1 !important;
                display: block !important;
                visibility: visible !important;
            }
            
            .message.hide, #live2d-message.hide {
                opacity: 0 !important;
            }
            
            #live2d-message-container {
                z-index: 9999 !important;
            }
            
            .message {
                z-index: 9998 !important;
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ CSS修复完成');
    }
    
    // 启动修复
    waitForDependencies(fixMessageSystem);
    
    console.log('🔧 Live2D消息系统修复脚本已加载');
})();