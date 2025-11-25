/* --- Story Bell Queue (Create / Play / End + Menu) --- */
(() => {
  const STORAGE_KEY = 'sbQueueV1';
  const MODE_KEY    = 'sbQueueMode';
  const PLAY_KEY    = 'sbQueuePlay';
  const KEEP_QUEUE_ON_END = false;

  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const $  = (s, r=document) => r.querySelector(s);

  const getQ = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };
  const setQ = (q) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(q)); window.dispatchEvent(new Event('sbq:updated')); };
  const inQ = (id) => getQ().some(x => x.id === id);
  const clearQ = () => setQ([]);

  function metaFrom(card){
    let id    = card?.getAttribute?.('data-story-id') || null;
    let title = card?.getAttribute?.('data-title') || card?.querySelector?.('[data-title], h3, h4, .title')?.textContent?.trim();
    let url   = card?.getAttribute?.('data-url')   || card?.querySelector?.('a[href*=".html"]')?.getAttribute?.('href');
    const img = card?.querySelector?.('img'); const image = img ? (img.currentSrc || img.src) : '';
    if (!id) {
      if (url)   id = url.replace(/\.html.*$/,'').replace(/[^a-z0-9]+/gi,'_').toLowerCase();
      else if (title) id = title.replace(/[^a-z0-9]+/gi,'_').toLowerCase();
      else return null;
    }
    return { id, title: title || id, url: url || '#', image };
  }

  function metaFromPage(){
    const metaId = $('meta[name="sb-story-id"]')?.content || null;
    const urlPart = location.pathname.split('/').pop() || '';
    const idFromUrl = urlPart ? urlPart.replace(/\.html.*$/,'').replace(/[^a-z0-9]+/gi,'_').toLowerCase() : null;
    const title = document.querySelector('h1,h2,.story-title,.title')?.textContent?.trim() || document.title || '';
    return { id: metaId || idFromUrl || null, title, url: urlPart || location.href, image: '' };
  }

  function add(it){ const q = getQ(); if (!q.some(x => x.id === it.id)) { q.push(it); setQ(q); } }
  function remove(id){ setQ(getQ().filter(x => x.id !== id)); }
  function idxOf(id){ return getQ().findIndex(x => x.id === id); }
  function nextAfter(id){ const q=getQ(); const i=q.findIndex(x=>x.id===id); return (i>=0 && i<q.length-1) ? q[i+1] : null; }

  // ---------- UI ----------
  function ensureControls(){
    let strip = $('#sbq-controls');
    if (!strip){
      strip = document.createElement('div');
      strip.id = 'sbq-controls';
      strip.innerHTML = `
        <div class="sbq-actions" style="display:flex;gap:.4rem;flex-wrap:wrap;">
          <button type="button" class="sbq-btn sbq-create" title="Create Queue (tap stories to add)">Create Queue</button>
          <button type="button" class="sbq-btn sbq-play primary" title="Play Queue">Play Queue</button>
          <button type="button" class="sbq-btn sbq-end" title="End Queue">End Queue</button>
        </div>
        <div id="sbq-menu" aria-label="Queue menu (in order)"></div>
      `;

      // Insert **under the tagline** first; fall back to after <header>, else body top
      const tagline = document.querySelector('.tagline') || document.querySelector('[data-role="tagline"]');
      const header  = $('header');
      if (tagline && tagline.parentNode) {
        tagline.insertAdjacentElement('afterend', strip);
      } else if (header && header.parentNode) {
        header.insertAdjacentElement('afterend', strip);
      } else {
        document.body.prepend(strip);
      }
    }

    strip.querySelector('.sbq-create')?.addEventListener('click', ()=> setMode(!queueMode));
    strip.querySelector('.sbq-play')?.addEventListener('click', startPlay);
    strip.querySelector('.sbq-end')?.addEventListener('click', endPlay);

    reflectMode(); renderMenu(); reflectPlay();
  }

  function renderMenu(){
    const host = $('#sbq-menu'); if (!host) return;
    const q = getQ(); host.innerHTML = '';
    q.forEach((it,i)=>{
      const a = document.createElement('a');
      a.className = 'sbq-chip';
      a.href = it.url || '#';
      a.innerHTML = `<span class="n">${i+1}</span><span class="t">${escapeHtml(it.title||it.id)}</span>`;
      host.appendChild(a);
    });
  }
  const escapeHtml = (s)=> (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  // Mode toggle (tap-to-add)
  let queueMode = localStorage.getItem(MODE_KEY) === '1';
  function setMode(on){
    queueMode = !!on;
    localStorage.setItem(MODE_KEY, on ? '1' : '0');
    reflectMode();
    announce(on ? 'Queue mode on. Tap stories to add.' : 'Queue mode off.');
  }
  function reflectMode(){
    document.documentElement.classList.toggle('sbq-mode', queueMode);
    const createBtn = document.querySelector('.sbq-create');
    if (createBtn) createBtn.classList.toggle('primary', queueMode);
  }

  // Play / End
  const isPlaying = () => localStorage.getItem(PLAY_KEY) === '1';
  function startPlay(){
    const q = getQ();
    if (!q.length) { announce('Queue is empty.'); return; }
    localStorage.setItem(PLAY_KEY, '1'); reflectPlay();
    const here = metaFromPage(); const i = here.id ? idxOf(here.id) : -1;
    if (i === -1) { location.href = q[0].url; return; }
    announce('Playing queue. Use Next to continue.');
    ensureNext();
  }
  function endPlay(){
    localStorage.setItem(PLAY_KEY, '0');
    if (!KEEP_QUEUE_ON_END) clearQ();
    reflectPlay(); renderMenu(); paintBadges();
    announce(KEEP_QUEUE_ON_END ? 'Stopped playing queue.' : 'Queue ended and cleared.');
    const nextBtn = $('#sbq-next'); if (nextBtn) nextBtn.remove();
  }
  function reflectPlay(){
    const playing = isPlaying();
    const playBtn = document.querySelector('.sbq-play');
    const endBtn  = document.querySelector('.sbq-end');
    if (playBtn) playBtn.disabled = playing;
    if (endBtn)  endBtn.disabled  = !playing && getQ().length === 0;
  }
  function ensureNext(){
    if (!isPlaying()) return;
    const here = metaFromPage();
    const idx  = here.id ? idxOf(here.id) : -1;
    const nxt  = idx >= 0 ? nextAfter(here.id) : null;

    let btn = $('#sbq-next');
    if (!nxt){ if (btn) btn.remove(); return; }
    if (!btn){
      btn = document.createElement('a');
      btn.id = 'sbq-next';
      btn.className = 'sbq-btn';
      Object.assign(btn.style, { position:'fixed', right:'14px', bottom:'66px', zIndex:'3400' });
      btn.textContent = 'Next in Queue ▶';
      document.body.appendChild(btn);
    }
    btn.href = nxt.url;
  }

  // Cards + badges
  function cards(){ return $$('[data-story-id], .story-card, .carousel-card'); }
  function bindCard(card){
    if (card.dataset.sbqBound === '1') return;
    card.dataset.sbqBound = '1';
    card.classList.add('sbq-card');
    const handler = (e)=>{
      if (!queueMode) return;                          // normal nav if not queueing
      e.preventDefault(); e.stopPropagation();
      const m = metaFrom(card); if (!m) return;
      if (inQ(m.id)) remove(m.id); else add(m);
    };
    card.addEventListener('click', handler, true);
    card.querySelectorAll('a[href]').forEach(a => a.addEventListener('click', handler, true));
  }
  function paintBadges(){
    const q = getQ();
    cards().forEach(card=>{
      const m = metaFrom(card); if (!m) return;
      const idx = q.findIndex(x => x.id === m.id);
      let badge = card.querySelector('.sbq-badge');
      if (idx >= 0){
        card.classList.add('sbq-queued');
        if (!badge){ badge = document.createElement('div'); badge.className='sbq-badge'; badge.setAttribute('aria-hidden','true'); card.appendChild(badge); }
        badge.textContent = String(idx + 1);
      } else {
        card.classList.remove('sbq-queued');
        if (badge) badge.remove();
      }
    });
  }

  // A11y live region
  function announce(msg){
    let live = $('#sbq-live');
    if (!live){
      live = document.createElement('div');
      live.id='sbq-live'; live.className='sbq-visually-hidden';
      live.setAttribute('role','status'); live.setAttribute('aria-live','polite');
      document.body.appendChild(live);
    }
    live.textContent = msg;
  }

  function hydrate(){ ensureControls(); cards().forEach(bindCard); paintBadges(); ensureNext(); }
  window.addEventListener('sbq:updated', ()=>{ renderMenu(); paintBadges(); reflectPlay(); ensureNext(); });
  window.addEventListener('storage', (e)=>{ if ([STORAGE_KEY, MODE_KEY, PLAY_KEY].includes(e.key)){ renderMenu(); paintBadges(); reflectMode(); reflectPlay(); ensureNext(); } });
  document.addEventListener('DOMContentLoaded', hydrate);
})();
