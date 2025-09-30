// Unicorn Studio Initialization
!function(){
  if(!window.UnicornStudio){
    window.UnicornStudio={isInitialized:!1};
    var i=document.createElement("script");
    i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.31/dist/unicornStudio.umd.js";
    i.onload=function(){
      window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
    };
    (document.head || document.body).appendChild(i);
  }
}();
