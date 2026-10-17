(function () {
  var hiddenTitle = '';
  var titleTime;
  var titleLeave = '请你留下，不要离开QAQ';
  var titleBack = '还有我，在你身边说我爱你啊awa';

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      // 记录离开瞬间的标题，而不是脚本加载时的初始标题
      hiddenTitle = document.title;
      clearTimeout(titleTime);
      document.title = titleLeave;
    } else {
      document.title = titleBack;
      titleTime = setTimeout(function () {
        document.title = hiddenTitle || document.title;
      }, 2000);
    }
  });
})();
