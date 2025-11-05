
(function(){
  'use strict';
  if(window.__SBQ_LOADED){ return; }
  window.__SBQ_LOADED = true;

  var LS_KEY = 'storyBellQueue';
  var CARD_SEL = '.story-card,.carousel-item,.carousel-card,.card,[data-story-id]';

  // Timings
  var AUTO_NEXT_DELAY_MS   = 10000; // wait after audio ends
  var COUNTDOWN_DURATION_S = 5;     // show overlay & play cue for last 5 seconds

  function cfg(){
    return {
      STILL_FIRST: window.SBQ_STILL_FIRST || '',  // our PNG
      COUNTDOWN_URL: window.SBQ_COUNTDOWN_URL || ''
    };
  }
  function $(s){ return document.querySelector(s); }
  function $all(s){ return Array.from(document.querySelectorAll(s)); }
  function bodyOn(cls){ document.body.classList.add(cls); }
  function bodyOff(cls){ document.body.classList.remove(cls); }
  function isOpen(){ return document.body.classList.contains('sbq-open'); }
  function isMode(){ return document.body.classList.contains('sbq-mode'); }
  function loadQ(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }catch(_){ return []; } }
  function saveQ(q){ try{ localStorage.setItem(LS_KEY, JSON.stringify(q)); }catch(_){} }

  // --- Cleanup timers/overlay/audio ---
  function clearNavAndCountdown(){
    if(window.__sbqNavTimer){ clearTimeout(window.__sbqNavTimer); window.__sbqNavTimer = null; }
    if(window.__sbqCountdownStarter){ clearTimeout(window.__sbqCountdownStarter); window.__sbqCountdownStarter = null; }
    if(window.__sbqCountdownTimer){ clearInterval(window.__sbqCountdownTimer); window.__sbqCountdownTimer = null; }
    if(window.__sbqCountdownAudio){ try{ window.__sbqCountdownAudio.pause(); window.__sbqCountdownAudio.currentTime = 0; }catch(_){ } window.__sbqCountdownAudio = null; }
    var ov = $('#sbq-next-overlay'); if(ov) ov.remove();
    window.__sbqCountdownRemain = null;
    window.__sbqPaused = false;
  }

  // --- Countdown overlay at 25vh ---
  function ensureOverlay(title){
    var ov = $('#sbq-next-overlay');
    if(ov) return ov;
    ov = document.createElement('div');
    ov.id = 'sbq-next-overlay';
    ov.innerHTML = ''+
      '<div class="sbq-next-title"></div>'+
      '<div class="sbq-next-count"></div>'+
      '<button class="sbq-next-btn" aria-label="Pause auto-continue" title="Pause">⏸</button>';
    document.body.appendChild(ov);
    ov.querySelector('.sbq-next-title').textContent = title || '';
    var btn = ov.querySelector('.sbq-next-btn');
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      if(!window.__sbqPaused){
        window.__sbqPaused = true;
        if(window.__sbqNavTimer){ clearTimeout(window.__sbqNavTimer); window.__sbqNavTimer = null; }
        if(window.__sbqCountdownTimer){ clearInterval(window.__sbqCountdownTimer); window.__sbqCountdownTimer = null; }
        if(window.__sbqCountdownAudio){ try{ window.__sbqCountdownAudio.pause(); }catch(_){ } }
        btn.textContent = '▶'; btn.title = 'Resume'; btn.setAttribute('aria-label','Resume auto-continue');
      }else{
        window.__sbqPaused = false;
        var remain = Math.max(1, Number(window.__sbqCountdownRemain)||COUNTDOWN_DURATION_S);
        scheduleNavigation(remain * 1000);
        startCountdown(remain);
        btn.textContent = '⏸'; btn.title = 'Pause'; btn.setAttribute('aria-label','Pause auto-continue');
      }
    }, true);
    return ov;
  }
  function setOverlayVisible(v){ var ov = $('#sbq-next-overlay'); if(ov) ov.style.display = v ? 'flex' : 'none'; }
  function updateOverlayText(sec, title){
    var ov = ensureOverlay(title);
    var tEl = ov.querySelector('.sbq-next-title');
    var cEl = ov.querySelector('.sbq-next-count');
    if(title) tEl.textContent = title;
    cEl.textContent = 'Continuing in… ' + sec;
  }

  function playCountdownCue(){
    var url = cfg().COUNTDOWN_URL;
    if(!url) return;
    try{
      if(window.__sbqCountdownAudio){ try{ window.__sbqCountdownAudio.pause(); }catch(_){ } }
      var a = new Audio(url);
      a.volume = 1.0; a.currentTime = 0;
      a.play().catch(function(_){});
      window.__sbqCountdownAudio = a;
    }catch(_){}
  }

  function humanizeTitle(s){
    try{ s = decodeURI(s||''); }catch(_){}
    s = (s||'').replace(/\.[^.]+$/,'').replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim();
    if(!s) return s;
    return s.split(' ').map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }

  function storyIdFromHref(href){
    try{ var u=new URL(href,location.href); var fn=u.pathname.split('/').pop()||''; return fn.replace(/\.[^.]+$/,'').toLowerCase(); }
    catch(_){ var fn2=(href||'').split('/').pop()||''; return fn2.replace(/\.[^.]+$/,'').toLowerCase(); }
  }
  function collectCards(){
    var set = new Set();
    document.querySelectorAll(CARD_SEL).forEach(function(el){ set.add(el); });
    document.querySelectorAll('a[href$=".html"]').forEach(function(a){
      if(a.closest('header,nav,footer')) return;
      if(a.closest(CARD_SEL)) return;
      set.add(a);
    });
    return Array.from(set);
  }
  function extract(el){
    var a = (el.tagName==='A') ? el : el.querySelector('a[href]');
    var href = a ? a.getAttribute('href') : (el.getAttribute('href')||'#');
    var id = (el.getAttribute('data-story-id') || storyIdFromHref(href));
    var titleNode = (
      el.getAttribute('data-title')
      || (el.querySelector('[data-title]') && el.querySelector('[data-title]').getAttribute('data-title'))
      || (el.querySelector('.title,.card-title,h3,h4') && el.querySelector('.title,.card-title,h3,h4').textContent.trim())
      || (a && (a.getAttribute('title') || (a.textContent||'').trim()))
      || (el.querySelector('img') && el.querySelector('img').getAttribute('alt'))
      || ''
    );
    var title = (titleNode && titleNode.trim()) || humanizeTitle((a && a.getAttribute('href')) || id || '');
    return { id:id, title:title, url:href };
  }

  function clearAllBadges(){
    document.querySelectorAll('.sbq-badge').forEach(function(b){ b.remove(); });
    document.querySelectorAll(CARD_SEL+',a[href$=".html"]').forEach(function(el){
      el.classList.remove('sbq-queued');
      el.style.position = el.style.position || 'relative';
    });
  }
  function ensureBadge(el, n){
    el.classList.add('sbq-queued');
    if(!el.style.position) el.style.position = 'relative';
    var b = el.querySelector(':scope > .sbq-badge');
    if(!b){
      b = document.createElement('div');
      b.className = 'sbq-badge';
      el.insertAdjacentElement('afterbegin', b);
    }
    b.textContent = String(n);
  }
  function syncBadges(){
    var q = loadQ();
    var map = new Map(q.map(function(it,i){ return [it.id, i+1]; }));
    clearAllBadges();
    collectCards().forEach(function(card){
      var info = extract(card);
      var n = map.get(info.id);
      if(n) ensureBadge(card, n);
    });
    renderList();
  }

  // Render queue list with DnD
  function renderList(){
    var list = document.querySelector('#queue-list'); if(!list) return;
    var q = loadQ();
    if(!q.length){
      list.innerHTML = '<div class="queue-empty-message">✨ Tap stories to add to your list ✨</div>';
      ['#queue-prev','#queue-next','#queue-clear'].forEach(function(sel){ var b=document.querySelector(sel); if(b) b.disabled=true; });
      return;
    }
    list.innerHTML = q.map(function(item,i){
      var t = (item.title && item.title.trim()) || humanizeTitle(item.url||item.id||'');
      return '<div class="queue-item" draggable="true" data-id="'+item.id+'">'
           +   '<div class="queue-item-number">'+(i+1)+'</div>'
           +   '<div class="queue-item-title">'+t+'</div>'
           +   '<button class="queue-item-remove" data-id="'+item.id+'" title="Remove">×</button>'
           + '</div>';
    }).join('');
    document.querySelectorAll('.queue-item-remove').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var q2 = loadQ().filter(function(x){ return x.id !== id; });
        saveQ(q2);
        syncBadges();
      }, {capture:true});
    });
    enableDnd(list);
    ['#queue-prev','#queue-next','#queue-clear'].forEach(function(sel){ var b=document.querySelector(sel); if(b) b.disabled=false; });
  }
  function enableDnd(list){
    list.querySelectorAll('.queue-item').forEach(function(it){
      it.addEventListener('dragstart', function(e){
        it.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try{ e.dataTransfer.setData('text/plain', it.getAttribute('data-id')); }catch(_){}
      });
      it.addEventListener('dragend', function(){ it.classList.remove('dragging'); });
    });
    list.addEventListener('dragover', function(e){
      e.preventDefault();
      var after = getDragAfterElement(list, e.clientY);
      var draggingEl = list.querySelector('.queue-item.dragging');
      if(!draggingEl) return;
      if(after == null){ list.appendChild(draggingEl); } else { list.insertBefore(draggingEl, after); }
    });
    list.addEventListener('drop', function(e){
      e.preventDefault();
      var ids = Array.from(list.querySelectorAll('.queue-item')).map(function(el){ return el.getAttribute('data-id'); });
      var old = loadQ();
      var map = new Map(old.map(function(o){ return [o.id, o]; }));
      var reordered = ids.map(function(id){ return map.get(id); }).filter(Boolean);
      saveQ(reordered);
      syncBadges();
    });
  }
  function getDragAfterElement(container, y){
    var els = [].slice.call(container.querySelectorAll('.queue-item:not(.dragging)'));
    return els.reduce(function(closest, child){
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if(offset < 0 && offset > closest.offset){ return { offset: offset, element: child }; }
      else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Auto-advance with countdown
  function bindAutoAdvanceOnAudio(){
    var id  = (location.pathname.split('/').pop()||'').replace(/\.[^.]+$/,'').toLowerCase();
    var q   = loadQ();
    var idx = q.findIndex(function(x){ return x.id === id; });
    if(idx < 0) return;

    var main = document.querySelector('audio[data-sbq-main]')
            || Array.from(document.querySelectorAll('audio')).find(function(a){ return a.offsetParent !== null; })
            || document.querySelector('audio');
    if(!main || main.__sbqAA) return;
    main.__sbqAA = true;

    main.addEventListener('play', function(){ clearNavAndCountdown(); });
    main.addEventListener('ended', function(){
      var curQ = loadQ();
      var curIndex = curQ.findIndex(function(x){ return x.id === id; });
      var nextIndex = (curIndex >= 0 ? curIndex + 1 : idx + 1);
      if(nextIndex >= curQ.length) return;

      clearNavAndCountdown();
      var nextDelay = AUTO_NEXT_DELAY_MS;
      scheduleNavigation(nextDelay);
      var title = (document.title && document.title.trim()) || (curQ[curIndex] && curQ[curIndex].title) || id;
      window.__sbqCountdownStarter = setTimeout(function(){
        playCountdownCue();
        startCountdown(COUNTDOWN_DURATION_S, title);
      }, Math.max(0, nextDelay - COUNTDOWN_DURATION_S*1000));
    });
  }
  function scheduleNavigation(delayMs){
    if(window.__sbqNavTimer){ clearTimeout(window.__sbqNavTimer); }
    window.__sbqNavTimer = setTimeout(function(){
      var id  = (location.pathname.split('/').pop()||'').replace(/\.[^.]+$/,'').toLowerCase();
      var qNow = loadQ();
      var cur = qNow.findIndex(function(x){ return x.id === id; });
      var nextIdx = (cur >= 0 ? cur + 1 : 0);
      if(nextIdx < qNow.length){
        var u = qNow[nextIdx].url || '#';
        if(!/\.html($|\?)/i.test(u)) u += '.html';
        location.href = u;
      }
    }, Math.max(0, delayMs));
  }
  function startCountdown(startSeconds, title){
    window.__sbqCountdownRemain = startSeconds;
    var ov = ensureOverlay(title);
    setOverlayVisible(true);
    updateOverlayText(window.__sbqCountdownRemain, title);
    if(window.__sbqCountdownTimer){ clearInterval(window.__sbqCountdownTimer); }
    window.__sbqCountdownTimer = setInterval(function(){
      if(window.__sbqPaused) return;
      window.__sbqCountdownRemain = Math.max(0, (Number(window.__sbqCountdownRemain)||1) - 1);
      if(window.__sbqCountdownRemain <= 0){
        clearInterval(window.__sbqCountdownTimer); window.__sbqCountdownTimer = null;
      }
      updateOverlayText(window.__sbqCountdownRemain, title);
    }, 1000);
  }

  function bindQueueMode(){
    var btn = document.querySelector('#queue-mode-toggle');
    if(!btn || btn.__sbqBound) return;
    btn.__sbqBound = true;
    var label = btn.querySelector('.label');
    btn.addEventListener('click', function(){
      var active = !isMode();
      if(active){ bodyOn('sbq-mode'); btn.classList.add('active'); if(label) label.textContent = 'Done'; }
      else      { bodyOff('sbq-mode'); btn.classList.remove('active'); if(label) label.textContent = 'Create Queue'; }
      syncBadges();
    });
    if(!window.__sbqDocClickBound){
      window.__sbqDocClickBound = true;
      document.addEventListener('click', function(e){
        if(!isMode()) return;
        var card = e.target.closest(CARD_SEL+',a[href$=".html"]');
        if(!card) return;
        if(card.closest('header,nav,footer')) return;
        e.preventDefault(); e.stopPropagation();
        var info = extract(card);
        var q = loadQ();
        var i = q.findIndex(function(x){ return x.id === info.id; });
        if(i >= 0) q.splice(i,1); else q.push(info);
        info.title = (info.title && info.title.trim()) || humanizeTitle(info.url||info.id||'');
        saveQ(q);
        syncBadges();
      }, true);
    }
  }
  function navToIndex(idx){
    var q = loadQ();
    if(!q.length) return;
    idx = Math.max(0, Math.min(idx, q.length-1));
    var u = q[idx].url || '#';
    if(!/\.html($|\?)/i.test(u)) u += '.html';
    location.href = u;
  }
  function bindPrevNext(){
    var prev = document.querySelector('#queue-prev'), next = document.querySelector('#queue-next');
    var getIdx = function(){
      var id = (location.pathname.split('/').pop()||'').replace(/\.[^.]+$/,'').toLowerCase();
      var q = loadQ(); var i = q.findIndex(function(x){ return x.id === id; });
      return i >= 0 ? i : 0;
    };
    if(prev && !prev.__sbqBound){
      prev.__sbqBound = true;
      prev.addEventListener('click', function(){
        clearNavAndCountdown();
        var i=getIdx(); navToIndex(Math.max(i-1,0));
      }, true);
    }
    if(next && !next.__sbqBound){
      next.__sbqBound = true;
      next.addEventListener('click', function(){
        clearNavAndCountdown();
        var i=getIdx(); navToIndex(Math.min(i+1, loadQ().length-1));
      }, true);
    }
  }
  function bindClear(){
    var c = document.querySelector('#queue-clear');
    if(!c || c.__sbqBound) return;
    c.__sbqBound = true;
    c.addEventListener('click', function(){
      if(!loadQ().length) return;
      clearNavAndCountdown();
      if(confirm('Clear all stories from your queue?')){
        saveQ([]); syncBadges();
      }
    }, true);
  }
  function bindClose(){
    var x = document.querySelector('.queue-menu-close');
    if(!x || x.__sbqBound) return;
    x.__sbqBound = true;
    x.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      clearNavAndCountdown();
      bodyOff('sbq-open');
    }, true);
  }

  // Static button binding (PNG only)
  function bindButton(){
    var btn = document.querySelector('#story-queue-button');
    if(!btn || btn.__sbqBound) return;
    btn.__sbqBound = true;
    var img = btn.querySelector('img');
    var cfgv = cfg();
    if(img && cfgv.STILL_FIRST) img.src = cfgv.STILL_FIRST;

    ['mousedown','touchstart'].forEach(function(ev){ btn.addEventListener(ev, function(){ btn.classList.add('sbq-press'); }, {passive:true}); });
    ['mouseup','mouseleave','touchend','touchcancel'].forEach(function(ev){ btn.addEventListener(ev, function(){ btn.classList.remove('sbq-press'); }, {passive:true}); });

    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var open = isOpen();
      if(!open){
        bodyOn('sbq-open'); bodyOn('sbq-mode'); // open + queue mode ON
        var qm = document.querySelector('#queue-mode-toggle'); if(qm){ qm.classList.add('active'); var label = qm.querySelector('.label'); if(label) label.textContent = 'Done'; }
        syncBadges();
      } else {
        bodyOff('sbq-open');
      }
    }, true);

    btn.addEventListener('keydown', function(e){
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); e.stopPropagation(); btn.click(); }
    });
  }

  // Enforce click-only menu
  function hardOverrides(){
    try{
      var s = document.createElement('style');
      s.textContent =
        '#story-queue-menu{display:none!important;}'
      + 'body.sbq-open #story-queue-menu{display:flex!important;}'
      + 'body:not(.sbq-open) #story-queue-button:hover + #story-queue-menu{display:none!important;}'
      + 'body.sbq-open     #story-queue-button:hover + #story-queue-menu{display:flex!important;}';
      document.head.appendChild(s);
    }catch(_){}
  }
  function bindPlay(){
    var p = document.querySelector('#queue-play');
    if(!p || p.__sbqBound) return;
    p.__sbqBound = true;
    p.addEventListener('click', function(){
      clearNavAndCountdown();
      var q = loadQ();
      if(q.length && q[0] && q[0].url){
        var u = q[0].url; if(!/\.html($|\?)/i.test(u)) u += '.html';
        location.href = u; return;
      }
      alert('Add stories to your queue first!');
    }, true);
  }

  function boot(){
    hardOverrides();
    bindButton();
    bindQueueMode();
    bindPlay();
    bindPrevNext();
    bindClear();
    bindClose();
    bindAutoAdvanceOnAudio();
    syncBadges();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
