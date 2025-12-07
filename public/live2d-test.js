// 简单的Live2D消息功能测试
// 在浏览器控制台中运行这些测试

(function() {
    console.log('🎤 Live2D消息功能测试工具已加载！');
    
    // 检测Live2D组件状态
    function checkLive2DStatus() {
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
    }
    
    // 发送测试消息
    function sendTestMessage(message) {
        if (window.showMessage) {
            console.log('📤 发送消息:', message);
            window.showMessage(message);
            return true;
        } else {
            console.log('❌ showMessage 函数不可用');
            return false;
        }
    }
    
    // 添加到全局命名空间
    window.Live2DTest = {
        checkStatus: checkLive2DStatus,
        sendMessage: sendTestMessage,
        testBasic: () => sendTestMessage('这是一条基础测试消息～'),
        testWelcome: () => sendTestMessage('欢迎来到天依的博客！这里有好多有趣的内容呢～'),
        testLong: () => sendTestMessage('这是一条比较长的测试消息，用来测试Live2D看板娘对长文本的显示效果。天依会好好传达每一句话的～'),
        testEmoji: () => sendTestMessage('🎵 天依给你唱首歌吧～ 🎤')
    };
    
    console.log('✅ 可用命令:');
    console.log('  Live2DTest.checkStatus() - 检测组件状态');
    console.log('  Live2DTest.testBasic() - 基础消息测试');
    console.log('  Live2DTest.testWelcome() - 欢迎消息测试');
    console.log('  Live2DTest.testLong() - 长消息测试');
    console.log('  Live2DTest.testEmoji() - 表情消息测试');
    console.log('  Live2DTest.sendMessage("自定义消息") - 发送自定义消息');
    
    // 自动检测组件状态
    setTimeout(() => {
        console.log('🔍 自动检测Live2D组件状态...');
        checkLive2DStatus();
    }, 3000);
    
})();