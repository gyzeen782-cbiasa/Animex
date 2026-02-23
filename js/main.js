// ===== main.js — Gynimex global utils =====

function showToast(msg, type='info') {
  const c = document.getElementById('toasts');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type==='success'?'ok':''}`;
  t.innerHTML = `<span>${type==='success'?'✓':'ℹ'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation='toastIn .3s ease reverse'; setTimeout(()=>t.remove(),300); }, 2800);
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function saveLocal(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){}
}

function getLocal(k) {
  try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; }
}

function makeCard(anime, isNew=false) {
  const sl = encodeURIComponent(anime.slug||'');
  return `<a href="anime.html?slug=${sl}" class="card">
    <div class="card-thumb">
      <img src="${anime.thumb}" alt="${anime.title}" loading="lazy" onerror="this.src='https://placehold.co/200x280/12121f/7c5cfc?text=No+Image'">
      <div class="card-overlay"><div class="play-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>
      ${isNew?'<span class="badge-new">New</span>':''}
      ${anime.episode?`<span class="badge-ep">Ep ${anime.episode}</span>`:''}
    </div>
    <div class="card-info">
      <div class="card-title">${anime.title}</div>
      <div class="card-meta">${anime.rating?`<span class="star">★</span><span>${anime.rating}</span>`:''}</div>
    </div>
  </a>`;
}

function makeOC(anime) {
  const sl = encodeURIComponent(anime.slug||'');
  return `<a href="anime.html?slug=${sl}" class="oc">
    <div class="oc-thumb"><img src="${anime.thumb||''}" alt="${anime.title}" loading="lazy" onerror="this.src='https://placehold.co/56x76/12121f/7c5cfc?text=?'"></div>
    <div class="oc-info">
      <div class="oc-title">${anime.title}</div>
      <div class="oc-ep">Episode ${anime.episode||'?'}</div>
      <div class="oc-day"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${anime.day||''}</div>
    </div>
  </a>`;
}

// Bottom nav active highlight
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bnav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    const match = page === href || (page === '' && href === 'index.html') || (page === 'index.html' && href === 'index.html');
    item.classList.toggle('active', match);
  });
});

// Shared nav HTML (injected by each page)
function getNavHTML(activePage) {
  const items = [
    { href:'index.html', label:'Home', icon:'<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/>' },
    { href:'jadwal.html', label:'Jadwal', icon:'<rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2"/>' },
    { href:'random.html', label:'Random', icon:'<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
    { href:'history.html', label:'Riwayat', icon:'<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>' },
    { href:'saved.html', label:'Simpan', icon:'<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2"/>' },
    { href:'profile.html', label:'Akun', icon:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' },
  ];
  return `<nav class="bnav"><div class="bnav-items">${items.map(i=>`<a href="${i.href}" class="bnav-item${i.href===activePage?' active':''}"><svg viewBox="0 0 24 24">${i.icon}</svg><span>${i.label}</span></a>`).join('')}</div></nav>`;
}
