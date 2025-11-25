
(function(){
  const LS_KEY="sb.queue.v1", LS_IDX="sb.queue.index.v1";

  const loadQ=()=>{ try { return JSON.parse(localStorage.getItem(LS_KEY))||[] } catch { return [] } };
  const saveQ=q=>localStorage.setItem(LS_KEY,JSON.stringify(q));
  const loadI=()=>{ const v=parseInt(localStorage.getItem(LS_IDX),10); return Number.isFinite(v)?v:-1 };
  const saveI=i=>localStorage.setItem(LS_IDX,String(i));

  function idFromUrl(url){
    try {
      const u=new URL(url,location.origin);
      const b=u.pathname.split("/").pop()||"";
      return b.replace(/\.[^.]+$/,"").toLowerCase();
    } catch {
      return (url||"").replace(/\.[^.]+$/,"").toLowerCase();
    }
  }
  function metaFromPage(){
    const m=document.querySelector('meta[name="sb-story-id"]')?.content||null;
    const base=location.pathname.split("/").pop()||"";
    const id=base?base.replace(/\.[^.]+$/,"").toLowerCase():null;
    const title=document.querySelector("main h1,.story h1,h1")?.textContent?.trim()||document.title||"";
    return {id:m||id,title,url:base||location.href};
  }
  function findTaglineElement(){
    const all=document.querySelectorAll("body *:not(script):not(style)");
    for(const el of all){
      const t=(el.textContent||"").trim();
      if(/Stories that speak, words that glow\./i.test(t)) return el;
    }
    return null;
  }

  function ensureQueueUI(){
    const wrap=document.createElement("div"); wrap.className="sb-queue-wrap";
    const imgSrc=(window.SB_QUEUE_BUTTON_IMG||"index_items/make-reading-list.png");
    wrap.innerHTML = `<button class="sb-queue-btn" type="button" id="sbQueueBtn" aria-label="Create Read List">
        <img class="sb-queue-img" src="${imgSrc}" alt="Make Reading List">
      </button>`;

    const panel=document.createElement("div"); panel.className="sb-queue-panel"; panel.id="sbQueuePanel";
    panel.innerHTML = `<div class="sb-queue-header">
        <div class="sb-queue-title">Your Read List</div>
        <div class="sb-queue-actions">
          <button id="sbPrev" title="Previous story">⟨</button>
          <button id="sbNext" title="Next story">⟩</button>
          <button id="sbExport" title="Download JSON">Export</button>
          <button id="sbClear" title="Clear list">Clear</button>
        </div>
      </div>
      <ul class="sb-queue-list" id="sbQueueList" aria-label="Read list"></ul>
      <div class="sb-queue-footer"><button id="sbClose">Close</button></div>`;

    const isIndex=/\/index[^/]*\.html?$/.test(location.pathname)||/\/$/.test(location.pathname);
    const tag=findTaglineElement();
    const header=document.querySelector("header,.header,#header,.site-header,.main-header,div[role='banner']");

    if(isIndex && tag && tag.parentNode){ tag.insertAdjacentElement("afterend",wrap); wrap.insertAdjacentElement("afterend",panel); }
    else if(header && header.parentNode){ header.insertAdjacentElement("afterend",wrap); wrap.insertAdjacentElement("afterend",panel); }
    else { document.body.insertBefore(wrap,document.body.firstChild); wrap.insertAdjacentElement("afterend",panel); }

    const btn=document.getElementById("sbQueueBtn");
    btn.addEventListener("click",()=>{
      const open=panel.classList.contains("open");
      if(!open){
        panel.classList.add("open");
        renderQueueUI();
        showQueuePill();
      } else {
        panel.classList.remove("open");
        hideQueuePill(true);
      }
    });
    document.getElementById("sbClose").addEventListener("click",()=>{ panel.classList.remove("open"); hideQueuePill(true); });
    document.getElementById("sbClear").addEventListener("click",clearQueue);
    document.getElementById("sbExport").addEventListener("click",exportJSON);
    document.getElementById("sbPrev").addEventListener("click",()=>step(-1));
    document.getElementById("sbNext").addEventListener("click",()=>step(+1));
  }

  function discoverCards(){
    const s=new Set();
    document.querySelectorAll("[data-story-id]").forEach(e=>s.add(e));
    [".story-card",".card",".sb-card",".carousel .item",".carousel a",".grid a",".list a"]
      .forEach(sel=>document.querySelectorAll(sel).forEach(e=>s.add(e)));
    document.querySelectorAll("a[href$='.html']").forEach(a=>{
      if(a.closest("nav, header, footer")) return;
      const h=a.getAttribute("href")||"";
      if(/about|contact|privacy|index/i.test(h)) return;
      s.add(a);
    });
    return Array.from(s);
  }
  function extractFromCard(el){
    const link=el.tagName==="A"?el:el.querySelector("a[href]");
    const url=link?link.getAttribute("href"):(el.getAttribute("href")||"#");
    const cover=el.querySelector("img")?.getAttribute("src")||el.querySelector("img")?.currentSrc||"";
    let title=el.getAttribute("data-title")
      || el.querySelector("[data-title]")?.getAttribute("data-title")
      || el.querySelector(".title,.card-title,h3,h4")?.textContent?.trim()
      || link?.getAttribute("title")
      || (el.querySelector("img")?.getAttribute("alt")||"").trim();
    if(!title){
      try{
        title=decodeURIComponent((new URL(url,location.href)).pathname.split("/").pop()||"")
            .replace(/\.[^.]+$/,"").replace(/[_-]/g," ");
      }catch{ title=url; }
    }
    const id=(el.getAttribute("data-story-id")||idFromUrl(url));
    return {id,title,url,coverSrc:cover,addedAt:Date.now()};
  }
  function ensureBadge(el,n){
    el.classList.add("sb-queued");
    let b=el.querySelector(":scope > .sb-queue-badge");
    if(!b){
      b=document.createElement("div");
      b.className="sb-queue-badge";
      el.style.position=el.style.position||"relative";
      el.insertAdjacentElement("afterbegin",b);
    }
    b.textContent=String(n);
  }
  function clearBadge(el){
    el.classList.remove("sb-queued");
    el.querySelector(":scope > .sb-queue-badge")?.remove();
  }
  function syncBadges(){
    const q=loadQ(); const map=new Map(q.map((it,i)=>[it.id,i+1]));
    const cards=discoverCards(); cards.forEach(c=>c.classList.add("sb-card-hit"));
    cards.forEach(el=>{
      const {id}=extractFromCard(el);
      const n=map.get(id);
      if(n) ensureBadge(el,n); else clearBadge(el);
    });
  }
  function addOrToggle(item){
    const q=loadQ(); const i=q.findIndex(x=>x.id===item.id);
    if(i>=0) q.splice(i,1); else { q.push(item); if(loadI()===-1) saveI(0); }
    saveQ(q); syncBadges(); renderQueueUI();
  }
  function clearQueue(){ saveQ([]); saveI(-1); syncBadges(); renderQueueUI(); }
  function exportJSON(){
    const data={savedAt:new Date().toISOString(),queue:loadQ()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`queue-${(new Date()).toISOString().replace(/[-:T.Z]/g,"").slice(0,12)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }
  function renderQueueUI(){
    const list=document.getElementById("sbQueueList"); if(!list) return;
    const q=loadQ(); list.innerHTML="";
    q.forEach((it,i)=>{
      const li=document.createElement("li"); li.className="sb-queue-item";
      li.innerHTML = `<div class="sb-qi-num">${i+1}</div>
        <div class="sb-qi-title">${(it.title||it.id)}</div>
        <button class="sb-qi-remove" data-id="${it.id}">Remove</button>`;
      li.querySelector(".sb-qi-remove").addEventListener("click",()=>addOrToggle(it));
      list.appendChild(li);
    });
    const has=q.length>0;
    const p=document.getElementById("sbPrev"), n=document.getElementById("sbNext");
    if(p) p.disabled=!has; if(n) n.disabled=!has;
  }
  function navigateTo(i){
    const q=loadQ(); if(!q.length) return;
    i=Math.max(0,Math.min(i,q.length-1)); saveI(i);
    const url=q[i].url||"#"; if(url&&url!=="#") location.href=url;
  }
  function step(d){
    const q=loadQ(); if(!q.length) return;
    const page=metaFromPage();
    const idx=page.id?q.findIndex(x=>x.id===page.id):-1;
    const cur=idx>=0?idx:loadI();
    const next=cur<0?0:(cur+d+q.length)%q.length;
    navigateTo(next);
  }
  function primeCurrentStory(){
    const q=loadQ(); if(!q.length) return;
    const page=metaFromPage(); if(!page.id) return;
    const idx=q.findIndex(x=>x.id===page.id||(page.title&&x.title===page.title));
    if(idx>=0) saveI(idx);
  }

  // Bind card clicks (toggle queue instead of navigating)
  function bindCardClicks(){
    discoverCards().forEach(el=>{
      if(el.dataset.sbqBound==="1") return;
      el.dataset.sbqBound="1";
      el.addEventListener("click",e=>{
        if(e.target.closest && e.target.closest("nav, header, footer, .sb-queue-panel")) return;
        const info=extractFromCard(el);
        addOrToggle(info);
        e.preventDefault(); e.stopPropagation();
      }, {capture:true});
    });
  }

  // Yellow pill
  let pill, pillTimer;
  function ensurePill(){
    if(pill) return pill;
    pill=document.createElement("div");
    pill.className="sb-queue-pill";
    pill.textContent="Queue mode ON — tap to turn off";
    pill.addEventListener("click",()=>{
      const panel=document.getElementById("sbQueuePanel");
      if(panel) panel.classList.remove("open");
      hideQueuePill(true);
    });
    document.body.appendChild(pill);
    return pill;
  }
  function showQueuePill(){ ensurePill(); clearTimeout(pillTimer); pill.classList.add("show"); pillTimer=setTimeout(()=>{ hideQueuePill(false); }, 4000); }
  function hideQueuePill(immediate){ if(!pill) return; clearTimeout(pillTimer); pill.classList.remove("show"); }

  window.addEventListener("storage",e=>{
    if(e.key===LS_KEY||e.key===LS_IDX){ renderQueueUI(); syncBadges(); primeCurrentStory(); }
  });

  function boot(){
    if(!document.querySelector('link[href*="queue.css"]')){
      const ln=document.createElement("link"); ln.rel="stylesheet";
      ln.href=(window.SB_ASSETS_PREFIX||"assets")+"/queue.css"; document.head.appendChild(ln);
    }
    ensureQueueUI(); bindCardClicks(); syncBadges(); primeCurrentStory();
    document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ syncBadges(); renderQueueUI(); }});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
