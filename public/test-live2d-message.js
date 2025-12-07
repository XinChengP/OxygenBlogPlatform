// 测试Live2D优化版组件的全局消息功能
// 在浏览器控制台中运行这些测试

const Live2DMessageTest = {
    // 检测Live2D组件状态
    checkStatus() {
        console.log('=== 🔍 Live2D消息功能检测 ===');
        
        // 检查优化版
        if (window.live2dOptimized) {
            console.log('✅ Live2D优化版组件已就绪');
            console.log('📊 性能评分:', window.live2dOptimized.getPerformanceReport().score);
            console.log('🎯 消息队列:', window.live2dOptimized.messageQueue);
            console.log('⚡ 就绪状态:', window.live2dOptimized.isReady());
            return 'optimized';
        }
        
        // 检查原版
        if (window.showMessage && typeof window.showMessage === 'function') {
            console.log('✅ Live2D全局消息函数可用');
            return 'original';
        }
        
        console.log('❌ 未检测到Live2D消息功能');
        return 'none';
    },
    
    // 发送测试消息
    sendTestMessage(type = 'basic') {
        const messages = {
            basic: '这是一条基础测试消息～',
            welcome: '欢迎来到天依的博客！这里有好多有趣的内容呢～',
            copy: '复制成功！天依已经记住这段话了～',
            theme: '主题切换成功！天依很喜欢这个颜色呢～',
            time: this.getTimeGreeting() + '天依在这里陪着你～',
            long: '这是一条比较长的测试消息，用来测试Live2D看板娘对长文本的显示效果。天依会好好传达每一句话的～',
            emoji: '🎵 天依给你唱首歌吧～ 🎤',
            special: '「复制」「天依」「欢迎」这些关键词会触发特殊处理哦～'
        };
        
        const message = messages[type] || messages.basic;
        
        console.log(`📤 发送${type}消息:`, message);
        
        try {
            if (window.showMessage) {
                window.showMessage(message);
                console.log('✅ 消息发送成功');
                return true;
            } else {
                console.log('❌ showMessage 函数不可用');
                return false;
            }
        } catch (error) {
            console.log('❌ 消息发送失败:', error);
            return false;
        }
    },
    
    // 获取时间问候语
    getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return '早上好！';
        else if (hour < 18) return '下午好！';
        else if (hour < 22) return '晚上好！';
        else return '夜深了，';
    },
    
    // 批量测试
    runBatchTest() {
        console.log('=== 🧪 批量消息测试 ===');
        const types = ['basic', 'welcome', 'copy', 'theme', 'time', 'long', 'emoji', 'special'];
        
        types.forEach((type, index) => {
            setTimeout(() => {
                this.sendTestMessage(type);
            }, index * 2000); // 每2秒发送一条
        });
        
        console.log(`📅 已安排 ${types.length} 条测试消息，每2秒发送一条`);
    },
    
    // 频率限制测试
    testRateLimit() {
        console.log('=== ⚡ 频率限制测试 ===');
        
        // 快速发送多条消息
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const message = `频率测试消息 ${i + 1}`;
                console.log(`发送频率测试消息 ${i + 1}`);
                window.showMessage(message);
            }, i * 100); // 每0.1秒发送一条
        }
    },
    
    // 自定义超时测试
    testCustomTimeout() {
        console.log('=== ⏰ 自定义超时测试 ===');
        
        window.showMessage('这条消息会显示3秒钟', 3000);
        setTimeout(() => {
            window.showMessage('这条消息会显示8秒钟', 8000);
        }, 1000);
    },
    
    // 获取性能报告
    getPerformanceReport() {
        if (window.live2dOptimized && window.live2dOptimized.getPerformanceReport) {
            const report = window.live2dOptimized.getPerformanceReport();
            console.log('=== 📊 性能报告 ===');
            console.log('性能评分:', report.score + '/100');
            console.log('初始化时间:', report.metrics.initializationTime + 'ms');
            console.log('消息数量:', report.metrics.messageCount);
            console.log('资源加载时间:', report.metrics.resourceLoadTime + 'ms');
            console.log('错误数量:', report.metrics.errorCount);
            console.log('是否优化:', report.isOptimized);
            return report;
        } else {
            console.log('❌ 性能报告功能不可用');
            return null;
        }
    },
    
    // 帮助信息
    showHelp() {
        console.log('=== 🆘 Live2D消息测试帮助 ===');
        console.log('可用方法:');
        console.log('  Live2DMessageTest.checkStatus() - 检测组件状态');
        console.log('  Live2DMessageTest.sendTestMessage(type) - 发送测试消息');
        console.log('  Live2DMessageTest.runBatchTest() - 批量测试');
        console.log('  Live2DMessageTest.testRateLimit() - 频率限制测试');
        console.log('  Live2DMessageTest.testCustomTimeout() - 自定义超时测试');
        console.log('  Live2DMessageTest.getPerformanceReport() - 获取性能报告');
        console.log('');
        console.log('消息类型: basic, welcome, copy, theme, time, long, emoji, special');
        console.log('示例: Live2DMessageTest.sendTestMessage("welcome")');
    }
};

// 添加到全局命名空间
window.Live2DMessageTest = Live2DMessageTest;

console.log('🎤 Live2D消息测试工具已加载！');
console.log('输入 Live2DMessageTest.showHelp() 查看帮助');
console.log('输入 Live2DMessageTest.checkStatus() 检测组件状态');

// 自动检测组件状态
setTimeout(() => {
    console.log('🔍 自动检测Live2D组件状态...');
    Live2DMessageTest.checkStatus();
}, 3000);