// 动态设置路径变量 - 支持GitHub Pages部署
var message_Path = window.message_Path || (function() {
    // 检测是否在GitHub Pages环境下
    const pathSegments = window.location.pathname.split('/');
    if (pathSegments.length >= 3 && pathSegments[1] && pathSegments[2]) {
        // GitHub Pages路径格式: /username/repo-name/
        return '/' + pathSegments[1] + '/' + pathSegments[2] + '/luotianyi-live2d-master/live2d/';
    }
    // 默认路径
    return '/luotianyi-live2d-master/live2d/';
})();
var home_Path = window.home_Path || '/';

// 🚀 消息系统修复 - 解决初始加载后消息不再显示的问题
var messageSystemFixed = false;
function fixMessageSystem() {
    if (messageSystemFixed) return;
    messageSystemFixed = true;
    
    console.log('🔧 Live2D消息系统修复启动...');
    
    // 1. 确保消息容器存在
    ensureMessageContainers();
    
    // 2. 增强showMessage函数
    enhanceShowMessage();
    
    // 3. 修复事件监听
    fixEventListeners();
    
    // 4. 移除频率限制
    removeFrequencyLimits();
    
    console.log('✅ 消息系统修复完成');
}

// 确保消息容器存在
function ensureMessageContainers() {
    // 检查原始消息容器
    let originalMessage = document.querySelector('.message');
    if (!originalMessage) {
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
        }
    }
}

// 增强showMessage函数
function enhanceShowMessage() {
    const originalShowMessage = window.showMessage;
    
    window.showMessage = function(text, timeout = 4000) {
        console.log('📢 showMessage调用:', text);
        
        try {
            // 尝试多种消息系统
            let success = false;
            
            // 1. 尝试原始showMessage
            if (originalShowMessage) {
                try {
                    originalShowMessage(text, timeout);
                    success = true;
                } catch (error) {
                    console.warn('原始showMessage失败:', error);
                }
            }
            
            // 2. 尝试GlobalMessageManager
            if (!success && window.GlobalMessageManager && window.GlobalMessageManager.showGlobalMessage) {
                try {
                    window.GlobalMessageManager.showGlobalMessage(text, timeout);
                    success = true;
                } catch (error) {
                    console.warn('GlobalMessageManager失败:', error);
                }
            }
            
            // 3. 手动显示（最后手段）
            if (!success) {
                manualShowMessage(text, timeout);
            }
            
        } catch (error) {
            console.error('showMessage完全失败:', error);
        }
    };
}

// 手动显示消息
function manualShowMessage(text, timeout) {
    const messageEl = document.querySelector('.message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.style.opacity = '1';
        messageEl.style.display = 'block';
        messageEl.classList.add('show');
        
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                messageEl.style.opacity = '0';
                messageEl.style.display = 'none';
            }, 300);
        }, timeout);
    }
}

// 修复事件监听
function fixEventListeners() {
    // 确保复制事件正常工作
    document.addEventListener('copy', handleCopyEvent, true);
}

// 复制事件处理
function handleCopyEvent(event) {
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

// 移除频率限制
function removeFrequencyLimits() {
    window.__lastMessageTime = 0;
    window.__lastCopyMessageTime = 0;
}

function renderTip(template, context) {
    var tokenReg = /(\\)?\{([^\{\}\\]+)(\\)?\}/g;
    return template.replace(tokenReg, function (word, slash1, token, slash2) {
        if (slash1 || slash2) {
            return word.replace('\\', '');
        }
        var variables = token.replace(/\s/g, '').split('.');
        var currentObject = context;
        var i, length, variable;
        for (i = 0, length = variables.length; i < length; ++i) {
            variable = variables[i];
            currentObject = currentObject[variable];
            if (currentObject === undefined || currentObject === null) return '';
        }
        return currentObject;
    });
}

String.prototype.renderTip = function (context) {
    return renderTip(this, context);
};

var re = /x/;
console.log(re);
re.toString = function() {
    showMessage('哈哈，你打开了控制台，是想要看看我的秘密吗？', 5000);
    return '';
};

// 等待jQuery加载完成后再初始化
function initLive2dMessage() {
    if (typeof $ === 'undefined') {
        // jQuery未加载，延迟初始化
        setTimeout(initLive2dMessage, 100);
        return;
    }
    
    // 初始化提示（移除复制事件监听）
    initTips();
}

function initTips(){
    // 使用window.messageConfig配置，如果没有则使用默认配置
    var config = window.messageConfig || {
        mouseover: [
            {
                selector: ".title a, h1, h2, h3",
                text: ["要看看 {text} 么？", "这是什么呢？", "想了解更多吗？"]
            },
            {
                selector: ".searchbox, input[type='search']",
                text: ["在找什么呢？", "需要帮忙吗？", "我来帮你搜索~"]
            },
            {
                selector: "nav a, .nav-link, .navigation a, header a, .navbar a, .menu-item a",
                text: ["这里有好玩的内容！", "要去看其他地方吗？", "导航在这里~"]
            },
            {
                selector: "textarea, input[type='text']",
                text: ["要输入什么呢？", "这里可以输入内容~", "写点什么吧！"]
            },
            {
                selector: "button, input[type='button'], input[type='submit']",
                text: ["要点击这里吗？", "按下去会怎样呢？", "试试看吧~"]
            },
            {
                selector: "img, .image, .thumbnail, .avatar",
                text: ["哇，是图片！", "图片很好看~", "要看看吗？"]
            },
            {
                selector: "code, pre",
                text: ["这是代码！", "代码很重要~", "要仔细看看吗？"]
            },
            {
                selector: "a[href*='github']",
                text: ["GitHub链接！", "要看看吗？", "GitHub很棒~"]
            },
            {
                selector: "a[href*='music'], a[href*='song'], a[href*='audio']",
                text: ["音乐链接！", "要听听吗？", "音乐很棒~"]
            },
            {
                selector: "a[href*='video'], a[href*='youtube'], a[href*='bilibili']",
                text: ["视频链接！", "要看看吗？", "视频很有趣~"]
            },
            {
                selector: "a[href*='blog'], a[href*='post'], a[href*='article']",
                text: ["博客链接！", "要读读吗？", "文章很有意思~"]
            },
            {
                selector: "a[href*='tool'], a[href*='utility'], a[href*='app']",
                text: ["工具链接！", "要试试吗？", "工具很实用~"]
            }
        ],
        click: [
            {
                selector: "#landlord #live2d",
                text: [
                    "想听我唱歌吗？", 
                    "不要动手动脚的！快把手拿开~~", 
                    "真…真的是不知羞耻！", 
                    "再摸的话我可要报警了！⌇●﹏●⌇", 
                    "110吗，这里有个变态一直在摸我(ó﹏ò｡)",
                    "呀！你摸到我了！",
                    "害羞ing...",
                    "天依很萌的！",
                    "我是世界第一吃货殿下哦！"
                ]
            }
        ]
    };
    
    // 应用鼠标悬停事件 - 使用事件委托确保动态元素也能响应
    if (typeof $ !== 'undefined') {
        $.each(config.mouseover, function (index, tips){
            $(document).on('mouseover', tips.selector, function (e){
                e.stopPropagation();
                var text = tips.text;
                if(Array.isArray(tips.text)) text = tips.text[Math.floor(Math.random() * tips.text.length)];
                text = text.renderTip({text: $(this).text()});
                showMessage(text, 3000);
            });
        });
        
        // 应用点击事件 - 使用事件委托确保动态元素也能响应
        $.each(config.click, function (index, tips){
            $(document).on('click', tips.selector, function (e){
                e.stopPropagation();
                var text = tips.text;
                if(Array.isArray(tips.text)) text = tips.text[Math.floor(Math.random() * tips.text.length)];
                text = text.renderTip({text: $(this).text()});
                showMessage(text, 3000);
            });
        });
    }
}
// 使用新的初始化函数
initLive2dMessage();

(function (){
    // 🚀 启动消息系统修复
    fixMessageSystem();
    
    var text;
    if(document.referrer !== ''){
        var referrer = document.createElement('a');
        referrer.href = document.referrer;
        text = '嗨！来自 <span style="color:#66ccff;">' + referrer.hostname + '</span> 的朋友！';
        var domain = referrer.hostname.split('.')[1];
        if (domain == 'baidu') {
            text = '嗨！ 来自 百度搜索 的朋友！<br>欢迎访问<span style="color:#66ccff;">「 ' + document.title.split(' - ')[0] + ' 」</span>';
        }else if (domain == 'so') {
            text = '嗨！ 来自 360搜索 的朋友！<br>欢迎访问<span style="color:#66ccff;">「 ' + document.title.split(' - ')[0] + ' 」</span>';
        }else if (domain == 'google') {
            text = '嗨！ 来自 谷歌搜索 的朋友！<br>欢迎访问<span style="color:#66ccff;">「 ' + document.title.split(' - ')[0] + ' 」</span>';
        }
    }else {
        if (window.location.href == `${home_Path}`) { //主页URL判断，需要斜杠结尾
            var now = (new Date()).getHours();
            if (now > 23 || now <= 5) {
                text = '夜深了，注意休息哦~';
            } else if (now > 5 && now <= 7) {
                text = '早上好！新的一天开始啦~';
            } else if (now > 7 && now <= 11) {
                text = '上午好！工作顺利吗？';
            } else if (now > 11 && now <= 14) {
                text = '午餐时间到了~';
            } else if (now > 14 && now <= 17) {
                text = '下午好！继续加油哦~';
            } else if (now > 17 && now <= 19) {
                text = '傍晚时分，夕阳很美~';
            } else if (now > 19 && now <= 21) {
                text = '晚上好！今天过得怎么样？';
            } else if (now > 21 && now <= 23) {
                text = '早点休息，晚安~';
            } else {
                text = '你好~我是洛天依！';
            }
        }else {
            text = '欢迎阅读<span style="color:#66ccff;">「 ' + document.title.split(' - ')[0] + ' 」</span>';
        }
    }
    showMessage(text, 8000);
})();

// 优化：延长一言显示的间隔时间，减少干扰
window.setInterval(showHitokoto,45000);

function showHitokoto(){
    if (typeof $ === 'undefined' || !$.getJSON) {
        // jQuery未加载，跳过
        return;
    }
    $.getJSON('https://v1.hitokoto.cn/',function(result){
        showMessage(result.hitokoto, 4000);
    });
}

function showMessage(text, timeout){
    // 🚀 启动消息系统修复
    fixMessageSystem();
    
    console.log('📢 showMessage调用:', text);
    
    if(Array.isArray(text)) text = text[Math.floor(Math.random() * text.length + 1)-1];
    
    // 尝试多种消息系统
    let success = false;
    
    // 1. 尝试jQuery方式
    if (typeof $ !== 'undefined') {
        try {
            $('.message').stop();
            $('.message').html(text).css('opacity', 1);
            $('.message').removeClass('hide').addClass('show');
            success = true;
            console.log('✅ jQuery消息显示成功');
        } catch (error) {
            console.warn('jQuery消息显示失败:', error);
        }
    }
    
    // 2. 尝试原生DOM方式
    if (!success) {
        try {
            const messageEl = document.querySelector('.message');
            if (messageEl) {
                messageEl.innerHTML = text;
                messageEl.style.opacity = '1';
                messageEl.style.display = 'block';
                messageEl.classList.remove('hide');
                messageEl.classList.add('show');
                success = true;
                console.log('✅ 原生DOM消息显示成功');
            }
        } catch (error) {
            console.warn('原生DOM消息显示失败:', error);
        }
    }
    
    // 3. 尝试GlobalMessageManager
    if (!success && window.GlobalMessageManager && window.GlobalMessageManager.showGlobalMessage) {
        try {
            window.GlobalMessageManager.showGlobalMessage(text, timeout || 4000);
            success = true;
            console.log('✅ GlobalMessageManager消息显示成功');
        } catch (error) {
            console.warn('GlobalMessageManager消息显示失败:', error);
        }
    }
    
    // 4. 手动显示（最后手段）
    if (!success) {
        manualShowMessage(text, timeout);
    }
    
    if (timeout === null) timeout = 4000;
    // 只有当消息不是默认消息时才调用hideMessage
    if (text !== '你好～我是洛天依！') {
        hideMessage(timeout);
    }
}

function hideMessage(timeout){
    if (timeout === null) timeout = 4000;
    setTimeout(() => {
        // 使用新的动画效果隐藏消息
        if (typeof $ !== 'undefined') {
            $('.message').removeClass('show').addClass('hide');
            // 动画完成后重置状态
            setTimeout(() => {
                $('.message').removeClass('hide');
                let currentMessage = $('.message').html();
                if (!currentMessage || currentMessage.trim() === '') {
                    $('.message').html('你好～我是洛天依！').css('opacity', 1);
                }
            }, 300);
        } else {
            const messageEl = document.querySelector('.message');
            if (messageEl) {
                messageEl.classList.remove('show');
                messageEl.classList.add('hide');
                // 动画完成后重置状态
                setTimeout(() => {
                    messageEl.classList.remove('hide');
                    if (!messageEl.innerHTML || messageEl.innerHTML.trim() === '') {
                        messageEl.innerHTML = '你好～我是洛天依！';
                        messageEl.style.opacity = '1';
                    }
                }, 300);
            }
        }
    }, timeout);
}

function initLive2d (){
    if (typeof $ === 'undefined') {
        // jQuery未加载，延迟初始化
        setTimeout(initLive2d, 100);
        return;
    }
    
    $('.hide-button').fadeOut(0).on('click', () => {
        $('#landlord').css('display', 'none')
    })
    $('#landlord').hover(() => {
        $('.hide-button').fadeIn(600)
    }, () => {
        $('.hide-button').fadeOut(600)
    })
	$('#landlord').hover(() => {
        $('.sing-button').fadeIn(600)
    }, () => {
        $('.sing-button').fadeOut(600)
    })
}
initLive2d ();



// 全局消息管理器 - 增强复制事件监听
window.GlobalMessageManager = (function() {
  let messages = [];
  let currentIndex = 0;
  let messageContainer = null;
  let isInitialized = false;

  // 初始化消息系统
  function init() {
    if (isInitialized) return;
    
    console.log('🎯 初始化 GlobalMessageManager...');
    createMessageContainer();
    setupEventListeners();
    isInitialized = true;
    
    // 移除初始欢迎消息，避免干扰用户体验
    // setTimeout(() => {
    //   showMessage('洛天依 Live2D 看板娘已就绪！点击我可以互动哦~', 3000);
    // }, 1000);
  }

  // 创建消息容器
  function createMessageContainer() {
    if (messageContainer) return;
    
    messageContainer = document.createElement('div');
    messageContainer.id = 'live2d-message-container';
    messageContainer.className = 'live2d-message-container';
    messageContainer.innerHTML = `
      <div id="live2d-message" class="live2d-message">
        <div class="message-content"></div>
        <div class="message-tail"></div>
      </div>
    `;
    document.body.appendChild(messageContainer);
    
    console.log('✅ 消息容器已创建');
  }

  // 设置事件监听器
  function setupEventListeners() {
    console.log('🔧 设置事件监听器...');
    
    // 复制事件监听 - 使用多种方式确保捕获
    if (document.addEventListener) {
      document.addEventListener('copy', handleCopyEvent, true); // 使用捕获阶段
      console.log('✅ 已添加 document copy 事件监听器（捕获阶段）');
    }
    
    // 如果使用 jQuery，也添加 jQuery 事件监听
    if (typeof window.jQuery !== 'undefined') {
      window.jQuery(document).on('copy', handleCopyEvent);
      console.log('✅ 已添加 jQuery copy 事件监听器');
      
      // 也监听 body 上的 copy 事件
      window.jQuery('body').on('copy', handleCopyEvent);
      console.log('✅ 已添加 jQuery body copy 事件监听器');
    }
    
    // 监听 window 的 copy 事件
    if (window.addEventListener) {
      window.addEventListener('copy', handleCopyEvent, true);
      console.log('✅ 已添加 window copy 事件监听器（捕获阶段）');
    }
    
    // 监听自定义 copy 事件
    document.addEventListener('custom-copy', handleCopyEvent, true);
    console.log('✅ 已添加自定义 copy 事件监听器');
    
    // 监听点击事件
    document.addEventListener('click', handleClickEvent);
    
    // 监听页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      // 页面已加载，直接初始化
      setTimeout(init, 100);
    }
  }

  // 处理复制事件
  function handleCopyEvent(event) {
    console.log('📋 捕获到复制事件:', event);
    console.log('事件类型:', event.type);
    console.log('事件目标:', event.target);
    console.log('事件当前目标:', event.currentTarget);
    
    // 检查是否是 React 组件处理的复制事件（通过特定标记）
    if (event.target && event.target.closest && event.target.closest('[data-live2d-copy-handled]')) {
      console.log('🔄 检测到 React 组件已处理此复制事件，跳过原生处理');
      return true;
    }
    
    // 添加频率限制，避免短时间内重复触发
    const now = Date.now();
    if (window.__lastCopyMessageTime && (now - window.__lastCopyMessageTime) < 3000) {
      console.log('⏭️ 复制消息频率限制，跳过');
      return true;
    }
    window.__lastCopyMessageTime = now;
    
    // 延迟执行，确保复制操作已完成
    setTimeout(() => {
      // 再次检查是否有 React 处理标记
      const selection = window.getSelection()?.toString();
      if (selection && selection.length > 10 && !document.querySelector('[data-live2d-copy-handled]')) {
        showMessage(getCopyMessage(), 2000);
        console.log('🎉 复制事件处理完成，显示消息');
      } else {
        console.log('⏭️ 跳过原生复制消息显示');
      }
    }, 200); // 增加延迟，让 React 组件优先处理
    
    // 不阻止默认行为
    return true;
  }

  // 处理点击事件
  function handleClickEvent(event) {
    const target = event.target;
    
    // 检查是否是复制按钮
    if (target.closest && target.closest('.copy-button')) {
      console.log('🖱️ 检测到复制按钮点击');
      
      // 添加频率限制，避免短时间内重复触发
      const now = Date.now();
      if (window.__lastCopyMessageTime && (now - window.__lastCopyMessageTime) < 3000) {
        console.log('⏭️ 复制按钮消息频率限制，跳过');
        return;
      }
      window.__lastCopyMessageTime = now;
      
      // 延迟执行，确保复制操作已完成
      setTimeout(() => {
        showMessage(getCopyMessage(), 2000);
      }, 200);
    }
  }

  // 获取复制消息
  function getCopyMessage() {
    const messages = [
      '复制成功！代码已复制到剪贴板~',
      '已复制！现在可以粘贴使用啦~',
      '复制完成！天依帮你复制好了~',
      '复制成功！代码片段已保存~',
      '已复制！记得检查代码哦~',
      '复制完成！天依很乐意帮忙~'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // 显示消息（重命名以避免与原始showMessage冲突）
  function showGlobalMessage(text, duration = 3000) {
    if (!messageContainer) {
      console.warn('消息容器未初始化');
      return;
    }

    // 🚀 移除频率限制，确保消息能正常显示
    const now = Date.now();
    // 暂时移除频率限制，让消息系统正常工作
    // if (window.__lastMessageTime && (now - window.__lastMessageTime) < 1500) {
    //   console.log('⏭️ 全局消息频率限制，跳过');
    //   return;
    // }
    window.__lastMessageTime = now;

    const messageElement = document.getElementById('live2d-message');
    const contentElement = messageElement.querySelector('.message-content');
    
    contentElement.textContent = text;
    messageElement.classList.add('show');
    
    // 添加动画效果
    messageElement.style.animation = 'fadeIn 0.3s ease-in-out';
    
    // 自动隐藏
    setTimeout(() => {
      messageElement.style.animation = 'fadeOut 0.3s ease-in-out';
      setTimeout(() => {
        messageElement.classList.remove('show');
      }, 300);
    }, duration);
  }

  // 添加消息到队列
  function addMessage(text, duration = 3000) {
    messages.push({ text, duration });
    if (messages.length === 1) {
      showNextMessage();
    }
  }

  // 显示下一条消息
  function showNextMessage() {
    if (messages.length === 0) return;
    
    const message = messages[currentIndex];
    showMessage(message.text, message.duration);
    
    setTimeout(() => {
      messages.shift();
      if (messages.length > 0) {
        showNextMessage();
      }
    }, message.duration);
  }

  // 公共API
  return {
    init: init,
    show: showGlobalMessage,
    add: addMessage,
    showNext: showNextMessage
  };
})();

// 将原始showMessage函数暴露到全局作用域，确保彩蛋功能正常工作
window.showMessage = showMessage;

// 完全禁用 GlobalMessageManager 自动初始化和调试信息，保持系统简洁
// console.log('📦 GlobalMessageManager 已加载，自动初始化已禁用');

// 移除所有自动初始化逻辑
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', function() {
//     window.GlobalMessageManager.init();
//   });
// } else {
//   setTimeout(function() {
//     window.GlobalMessageManager.init();
//   }, 500);
// }

// document.addEventListener('live2d-model-loaded', function() {
//   console.log('🎯 Live2D 模型加载完成，初始化消息管理器');
//   window.GlobalMessageManager.init();
// });

// 移除调试信息输出
// console.log('📦 message.js 已加载');
// console.log('当前页面状态:', document.readyState);
// console.log('jQuery 是否可用:', typeof window.jQuery !== 'undefined');