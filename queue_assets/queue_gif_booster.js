
/* queue_gif_booster.js — observe menu state, play GIF once, freeze on last frame */
(function(){
  if (window.__sbGifBoost) return; window.__sbGifBoost = true;

  function setup(){
    var btn  = document.getElementById('story-queue-button');
    var menu = document.getElementById('story-queue-menu');
    if (!btn || !menu) return;

    var img  = btn.querySelector('img') || btn.querySelector('.book-img,.book-gif');
    if (!img) return;

    var gif    = img.getAttribute('data-gif')    || img.src || '';
    var closed = img.getAttribute('data-closed') || '';
    var final  = img.getAttribute('data-final')  || '';
    var msAttr = img.getAttribute('data-anim');
    var animMs = parseInt(msAttr, 10);
    if (!animMs || isNaN(animMs)) animMs = 2000; // safe default

    // Start closed if we have one
    if (closed) img.src = closed;

    // Watch the menu's "active" class instead of rebinding clicks
    var timer = null;
    function onToggle(){
      var open = menu.classList.contains('active');
      if (timer) { clearTimeout(timer); timer = null; }
      if (open){
        // Replay the GIF by cache-busting; then freeze on final if present
        if (gif && /\.gif(\?|$)/i.test(gif)){
          img.src = gif + (gif.indexOf('?')>-1 ? '&' : '?') + 't=' + Date.now();
          timer = setTimeout(function(){
            if (final) img.src = final;
          }, animMs);
        } else if (final){
          img.src = final;
        }
      } else {
        // Closing -> show closed (or fall back to gif)
        img.src = closed || gif || img.src;
      }
    }

    // Initial state
    onToggle();

    // MutationObserver for class changes
    var mo = new MutationObserver(onToggle);
    mo.observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
