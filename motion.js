/* CVM B2B · анимации и подгонка экрана
   Изменения
   - 27.10.2026: переходы между экранами, поочерёдная сборка блоков, слова заголовка выезжают из маски
   - 27.10.2026: вход в «Следующие шаги» и выход из них раскрываются кругом от места нажатия
   - 27.10.2026: шар-бегунок катится по прогрессу, индикатор раздела скользит, экран подгоняется под высоту окна
   Тексты не меняются: скрипт только оборачивает слова заголовка в span и расставляет классы.
   Подключается до app.js. Если файл убрать, презентация работает без анимаций.
*/
(function(){
  'use strict';
  var doc=document, root=doc.documentElement, stage=doc.getElementById('stage');
  if(!stage||!window.MutationObserver) return;
  var reduce=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
  root.classList.add('motion');

  /* контейнеры, чьи дети появляются по очереди; сами контейнеры не анимируются */
  var SPLIT=['.cover','.cover-story','.process-line','.brief-story','.motive-tabs','.method-rules',
    '.attribute-case','.match-list','.profile-layout','.gate-story','.gate-checks','.branch','.pilot-top',
    '.test-matrix','.channel-route','.crm-detail','.result-flow','.shift','.concept-line','.journeys',
    '.data-layout','.agents','.signal-grid','.case-steps','.library-cycle','.final-columns','.route-split',
    '.demo-row','.measurement'].join(',');
  /* списки внутри блока: блок появляется, потом его пункты */
  var INNER=['.question-list','.brief-output ul','.profile','.journey ol','.final-columns ul','.crm-detail ul',
    '.regular-loop>div','.data-list','.hypothesis-example','.common-path'].join(',');
  var STEP=52, MAXD=900, WSTEP=34, WMAX=14;
  var quiet=false, still=false, cleanupT=0, navT=0, lastCh=null, vtToken=0, fitRaf=0;
  var lastPointer={x:0,y:0,t:-1e9};

  function setD(el,d,cls,list){el.style.setProperty('--d',Math.round(d)+'ms');el.classList.add(cls);list.push(el)}

  /* слова заголовка: каждое в маске; текст и пробелы остаются теми же */
  function splitWords(h){
    var out=[];
    (function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if(n.nodeType===3){
          var parts=n.textContent.split(/(\s+)/), frag=doc.createDocumentFragment(), any=false;
          parts.forEach(function(p){
            if(!p) return;
            if(/^\s+$/.test(p)){frag.appendChild(doc.createTextNode(p));return}
            var w=doc.createElement('span'), i=doc.createElement('span');
            w.className='w'; i.className='wi'; i.textContent=p; w.appendChild(i); frag.appendChild(w); out.push(i); any=true;
          });
          if(any) n.parentNode.replaceChild(frag,n);
        }else if(n.nodeType===1){
          if(n.tagName==='EM'){out.push(n)}
          else if(n.tagName!=='BR'){walk(n)}
        }
      });
    })(h);
    return out;
  }

  function collect(el,out,skip){
    Array.prototype.forEach.call(el.children,function(c){
      if(skip.indexOf(c)>-1||c.tagName==='H1'&&skip.indexOf('h1')>-1) return;
      if(c.matches(SPLIT)) collect(c,out,skip); else out.push(c);
    });
  }

  function build(f){
    clearTimeout(cleanupT);
    /* при смене темы экран раскрывается кругом целиком, без поэтапной сборки */
    if(quiet||still||reduce.matches){f.classList.add('built');quiet=false;still=false;return}
    var items=[], d=70, end=0;
    var eyebrow=f.querySelector('.eyebrow'), h1=f.querySelector('h1'), lede=f.querySelector('.lede,.cover-intro');
    if(eyebrow){setD(eyebrow,d,'rv',items);d+=80}
    if(h1){
      var ws=splitWords(h1);
      ws.forEach(function(w,i){setD(w,d+Math.min(i,WMAX)*WSTEP,w.tagName==='EM'?'pill-in':'w-in',items)});
      d+=Math.min(ws.length,WMAX)*WSTEP+150;
    }
    if(lede){setD(lede,d,'rv',items);d+=100}
    var units=[]; collect(f,units,[eyebrow,lede,'h1']);
    units.forEach(function(u,i){
      var ud=Math.min(d+i*STEP,MAXD); setD(u,ud,'rv',items); end=Math.max(end,ud);
      var lists=(u.matches(INNER)?[u]:[]).concat(Array.prototype.slice.call(u.querySelectorAll(INNER)));
      lists.forEach(function(l){
        if(l.closest('details')) return;
        Array.prototype.forEach.call(l.children,function(c,j){var cd=ud+150+j*48;setD(c,cd,'rvi',items);end=Math.max(end,cd)});
      });
    });
    /* контейнеры получают задержку первого ребёнка: от неё считаются линии и шкалы */
    Array.prototype.forEach.call(f.querySelectorAll(SPLIT),function(c){
      var first=c.querySelector('.rv'); if(first){c.style.setProperty('--d',first.style.getPropertyValue('--d'));items.push(c)}
    });
    var total=Math.max(end+1300, f.querySelector('.cover')?2900:0);
    cleanupT=setTimeout(function(){
      items.forEach(function(el){el.classList.remove('rv','rvi','w-in','pill-in');el.style.removeProperty('--d')});
      f.classList.add('built');
    },total);
  }

  /* индикатор раздела и шар на прогрессе */
  function sync(instant){
    var nav=doc.getElementById('chapterNav'), a=nav&&nav.querySelector('button.active');
    if(a){
      if(instant) nav.classList.add('no-tr');
      nav.style.setProperty('--ix',a.offsetLeft+'px');
      nav.style.setProperty('--iw',a.offsetWidth+'px');
      var ch=doc.body.getAttribute('data-chapter');
      if(!nav.classList.contains('has-ind')){nav.classList.add('has-ind','no-tr');instant=true}
      else if(lastCh!==null&&ch!==lastCh&&!instant){
        nav.classList.remove('moving'); void nav.offsetWidth; nav.classList.add('moving');
        clearTimeout(navT); navT=setTimeout(function(){nav.classList.remove('moving')},900);
      }
      lastCh=ch;
      if(instant) requestAnimationFrame(function(){requestAnimationFrame(function(){nav.classList.remove('no-tr')})});
    }
    var track=doc.querySelector('.progress-track'), bar=doc.getElementById('progress');
    if(track&&bar&&typeof pages!=='undefined'){
      var frac=(index+1)/pages.length;
      bar.style.setProperty('--roll',(track.clientWidth*frac/(Math.PI*18)*360).toFixed(1)+'deg');
    }
  }

  /* подгонка под высоту окна на ноутбуке и проекторе: экран целиком, без прокрутки */
  var MIN=.8;
  function fit(){
    var f=stage.firstElementChild; if(!f) return;
    stage.style.removeProperty('zoom'); stage.style.removeProperty('max-width');
    stage.style.removeProperty('padding-left'); stage.style.removeProperty('padding-right');
    if(!('zoom' in stage.style)) return;
    if(innerWidth<1024||innerHeight<560||innerWidth<=innerHeight) return;
    var cs=getComputedStyle(stage), bar=doc.querySelector('.bottom');
    var top=stage.getBoundingClientRect().top+(window.scrollY||0);
    var need=parseFloat(cs.paddingTop)+f.offsetHeight+20;
    var avail=innerHeight-(bar?bar.offsetHeight:0)-top-6;
    if(need<=avail) return;
    var s=Math.max(MIN,avail/need), pad=parseFloat(cs.paddingLeft), mw=parseFloat(cs.maxWidth);
    stage.style.zoom=s.toFixed(3);
    if(mw) stage.style.maxWidth=(mw/s).toFixed(1)+'px';
    stage.style.paddingLeft=stage.style.paddingRight=(pad/s).toFixed(1)+'px';
  }
  function refit(){cancelAnimationFrame(fitRaf);fitRaf=requestAnimationFrame(function(){fit();sync(true)})}

  new MutationObserver(function(){
    var f=stage.firstElementChild;
    if(!f||f.getAttribute('data-m')) return;
    f.setAttribute('data-m','1');
    build(f); sync(false); fit();
  }).observe(stage,{childList:true});

  addEventListener('resize',refit);
  doc.addEventListener('fullscreenchange',refit);
  if(doc.fonts&&doc.fonts.ready) doc.fonts.ready.then(refit);
  addEventListener('pointerdown',function(e){lastPointer={x:e.clientX,y:e.clientY,t:performance.now()}},true);

  /* переходы: обёртка над render из app.js */
  addEventListener('DOMContentLoaded',function(){
    var base=window.render;
    if(typeof base!=='function'||typeof pages==='undefined') return;
    window.render=function(n,focus){
      var N=pages.length, to=Math.min(N-1,Math.max(0,n));
      if(!stage.firstElementChild) return base(n,focus);
      if(to===index){quiet=true;return base(n,focus)}
      root.setAttribute('data-dir',to<index?'back':'fwd');
      if(reduce.matches||!doc.startViewTransition||doc.hidden) return base(n,focus);
      if((window.scrollY||0)>2) scrollTo(0,0);
      var theme=(pages[to].group===2)!==(pages[index].group===2);
      /* номер экрана меняется сразу: быстрые нажатия подряд не теряются */
      index=to;
      if(theme){
        var x,y;
        if(performance.now()-lastPointer.t<1500){x=lastPointer.x;y=lastPointer.y}
        else{var b=doc.getElementById(to<index?'prev':'next').getBoundingClientRect();x=b.left+b.width/2;y=b.top+b.height/2}
        var r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
        root.style.setProperty('--vx',Math.round(x)+'px');
        root.style.setProperty('--vy',Math.round(y)+'px');
        root.style.setProperty('--vr',Math.ceil(r+2)+'px');
      }
      root.setAttribute('data-vt',theme?'theme':'slide');
      still=theme;
      var token=++vtToken, t;
      try{t=doc.startViewTransition(function(){base(n,focus)})}
      catch(e){root.removeAttribute('data-vt');return base(n,focus)}
      var done=function(){if(token===vtToken) root.removeAttribute('data-vt')};
      if(t&&t.ready) t.ready.catch(function(){});
      if(t&&t.updateCallbackDone) t.updateCallbackDone.catch(function(){});
      if(t&&t.finished) t.finished.then(done,done); else done();
    };
  });
})();
