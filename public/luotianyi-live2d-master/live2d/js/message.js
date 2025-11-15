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

$(document).on('copy', function (){
    showMessage('你都复制了些什么呀，转载要记得加上出处哦~~', 5000);
});

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
                selector: ".nav-link, .navigation a, a[href]",
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
initTips();

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
    $.getJSON('https://v1.hitokoto.cn/',function(result){
        showMessage(result.hitokoto, 5000);
    });
}

function showMessage(text, timeout){
    if(Array.isArray(text)) text = text[Math.floor(Math.random() * text.length + 1)-1];
    //console.log('showMessage', text);
    $('.message').stop();
    $('.message').html(text).css('opacity', 1);
    // 确保消息框可见
    $('.message').show();
    if (timeout === null) timeout = 5000;
    hideMessage(timeout);
}

function hideMessage(timeout){
    $('.message').stop().css('opacity', 1);
    // 不隐藏消息框，只重置内容
    if (timeout === null) timeout = 5000;
    setTimeout(() => {
        // 只在消息框当前没有显示内容时才重置为默认消息
        if ($('.message').html() === '') {
            $('.message').html('你好～我是洛天依！').css('opacity', 1);
        }
    }, timeout);
}

function initLive2d (){
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


var num=2;
function getsong(){
		if(num%2==0){
					
	$.getJSON(`${message_Path}songs.json`,function(songs_json){
			var rnum = parseInt(Math.random()*songs_json.length);
			var songs_url = songs_json[rnum]["url"];
			var songs_name = songs_json[rnum]["name"];
		showMessage("正在播放 [ " + songs_name + " ]", 5000);
        document.getElementById("sing").innerHTML='<audio src='+songs_url+' id="myaudio" controls="controls" loop="false" hidden="true">';
		
		document.getElementById("sing-button").innerHTML="Pause";
		var myAuto = document.getElementById('myaudio');
            myAuto.play();
			num=num+1;
	});
}
		
		else {
		document.getElementById("sing-button").innerHTML="Sing";
		document.getElementById("sing").innerHTML='<audio src="" id="myaudio" controls="controls" loop="false" hidden="true">';
		num=num+1;
        }

}

