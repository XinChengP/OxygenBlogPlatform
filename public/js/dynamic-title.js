(function(){
  var OriginTitile=document.title,titleTime;
  var titleLeave='请你留下，不要离开QAQ';
  var titleBack='还有我，在你身边说我爱你啊awa';
  document.addEventListener("visibilitychange",function(){
    if(document.hidden){
      document.title=titleLeave;
      clearTimeout(titleTime);
    }else{
      document.title=titleBack;
      titleTime=setTimeout(function(){document.title=OriginTitile},2000);
    }
  });
})();
