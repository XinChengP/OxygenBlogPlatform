// 动态设置路径变量
var message_Path = window.message_Path || '/luotianyi-live2d-master/live2d/';
var home_Path = window.home_Path || '/';

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
                text: ["要看看 {text} 么？", "这是什么呢？好有趣的样子～", "想要了解更多吗？"]
            },
            {
                selector: ".searchbox, input[type='search']",
                text: ["在找什么东西呢，需要帮忙吗？", "搜索很重要哦，我来帮你～", "找不到想要的内容吗？"]
            },
            {
                selector: "nav a, .nav-link, .navigation a, header a, .navbar a, .menu-item a",
                text: ["这里好像有很好玩的内容！", "要去看其他地方吗？", "导航很重要呢～"]
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
                text = '你是夜猫子呀？这么晚还不睡觉，明天起的来嘛？';
            } else if (now > 5 && now <= 7) {
                text = '早上好！一日之计在于晨，美好的一天就要开始了！';
            } else if (now > 7 && now <= 11) {
                text = '上午好！工作顺利嘛，不要久坐，多起来走动走动哦！';
            } else if (now > 11 && now <= 14) {
                text = '中午了，工作了一个上午，现在是午餐时间！';
            } else if (now > 14 && now <= 17) {
                text = '午后很容易犯困呢，今天的运动目标完成了吗？';
            } else if (now > 17 && now <= 19) {
                text = '傍晚了！窗外夕阳的景色很美丽呢，最美不过夕阳红~~';
            } else if (now > 19 && now <= 21) {
                text = '晚上好，今天过得怎么样？';
            } else if (now > 21 && now <= 23) {
                text = '已经这么晚了呀，早点休息吧，晚安~~';
            } else {
                text = '嗨~ 快来逗我玩吧！';
            }
        }else {
            text = '欢迎阅读<span style="color:#66ccff;">「 ' + document.title.split(' - ')[0] + ' 」</span>';
        }
    }
    showMessage(text, 12000);
})();

window.setInterval(showHitokoto,30000);

function showHitokoto(){
    if (typeof $ === 'undefined' || !$.getJSON) {
        // jQuery未加载，跳过
        return;
    }
    $.getJSON('https://v1.hitokoto.cn/',function(result){
        showMessage(result.hitokoto, 5000);
    });
}

function showMessage(text, timeout){
    if(Array.isArray(text)) text = text[Math.floor(Math.random() * text.length + 1)-1];
    //console.log('showMessage', text);
    
    // 检查jQuery是否可用，如果不可用则使用原生DOM
    if (typeof $ !== 'undefined') {
        $('.message').stop();
        $('.message').html(text).css('opacity', 1);
        $('.message').show();
    } else {
        // 使用原生DOM作为备选方案
        const messageEl = document.querySelector('.message');
        if (messageEl) {
            messageEl.innerHTML = text;
            messageEl.style.opacity = '1';
            messageEl.style.display = 'block';
        }
    }
    
    if (timeout === null) timeout = 5000;
    // 修复：只有当消息不是默认消息时才调用hideMessage
    if (text !== '你好～我是洛天依！') {
        hideMessage(timeout);
    }
}

function hideMessage(timeout){
    if (typeof $ !== 'undefined') {
        $('.message').stop().css('opacity', 1);
    }
    // 不隐藏消息框，只重置内容
    if (timeout === null) timeout = 5000;
    setTimeout(() => {
        // 修复：不要自动重置为默认消息，让消息系统保持当前状态
        // 除非消息框是空的，否则不重置
        let currentMessage;
        if (typeof $ !== 'undefined') {
            currentMessage = $('.message').html();
        } else {
            const messageEl = document.querySelector('.message');
            currentMessage = messageEl ? messageEl.innerHTML : '';
        }
        
        if (!currentMessage || currentMessage.trim() === '') {
            if (typeof $ !== 'undefined') {
                $('.message').html('你好～我是洛天依！').css('opacity', 1);
            } else {
                const messageEl = document.querySelector('.message');
                if (messageEl) {
                    messageEl.innerHTML = '你好～我是洛天依！';
                    messageEl.style.opacity = '1';
                }
            }
        }
        // 否则保持当前消息不变
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
    
    // 显示欢迎消息
    setTimeout(() => {
      showMessage('洛天依 Live2D 看板娘已就绪！点击我可以互动哦~', 3000);
    }, 1000);
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

  // 显示消息
  function showMessage(text, duration = 3000) {
    if (!messageContainer) {
      console.warn('消息容器未初始化');
      return;
    }

    // 添加全局频率限制，避免消息洪水
    const now = Date.now();
    if (window.__lastMessageTime && (now - window.__lastMessageTime) < 1500) {
      console.log('⏭️ 全局消息频率限制，跳过');
      return;
    }
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
    show: showMessage,
    add: addMessage,
    showNext: showNextMessage
  };
})();

// 禁用 GlobalMessageManager 自动初始化，避免重复的消息气泡
// 保留功能但不禁用，只在需要时手动调用
console.log('📦 GlobalMessageManager 已加载，自动初始化已禁用');

// 立即初始化（确保在页面加载完成后）
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', function() {
//     window.GlobalMessageManager.init();
//   });
// } else {
//   // 如果页面已经加载完成，立即初始化
//   setTimeout(function() {
//     window.GlobalMessageManager.init();
//   }, 500);
// }

// 确保在 Live2D 模型加载完成后也初始化
// document.addEventListener('live2d-model-loaded', function() {
//   console.log('🎯 Live2D 模型加载完成，初始化消息管理器');
//   window.GlobalMessageManager.init();
// });

// 添加一些调试信息
console.log('📦 message.js 已加载');
console.log('当前页面状态:', document.readyState);
console.log('jQuery 是否可用:', typeof window.jQuery !== 'undefined');