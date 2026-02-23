// ===== main.js — KitsuneID =====

const LOGO_HTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6 2 2 7 2 12c0 2 .8 4 2 5.5L12 22l8-4.5C21.2 16 22 14 22 12c0-5-4-10-10-10z" stroke="#7c5cfc" stroke-width="1.5"/><path d="M8 9c0-1 .5-2 2-2s3 1 2 3c-1 1.5-2 2-2 3M16 9c0-1-.5-2-2-2s-3 1-2 3c1 1.5 2 2 2 3" stroke="#7c5cfc" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="13" r="1" fill="#7c5cfc"/><circle cx="15" cy="13" r="1" fill="#7c5cfc"/></svg>Kitsune<span>ID</span>`;

function showToast(msg, type='info') {
  let c = document.getElementById('toasts');
  if (!c) { c = document.createElement('div'); c.id='toasts'; c.className='toasts'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast${type==='success'?' ok':''}`;
  t.innerHTML = `<span>${type==='success'?'✓':'ℹ'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation='toastIn .3s ease reverse'; setTimeout(()=>t.remove(),300); }, 2800);
}

function getParam(name) { return new URLSearchParams(window.location.search).get(name); }

function saveLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function getLocal(k) { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } }

function makeCard(anime, isNew=false) {
  const sl = encodeURIComponent(anime.slug||'');
  const img = anime.thumb||'';
  return `<a href="anime.html?slug=${sl}" class="card">
    <div class="card-thumb">
      <img src="${img}" alt="${anime.title}" loading="lazy" onerror="this.src='https://placehold.co/200x280/12121f/7c5cfc?text=No+Image'">
      <div class="card-overlay"><div class="play-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>
      ${isNew?'<span class="badge-new">Baru</span>':''}
      ${anime.episode?`<span class="badge-ep">Ep ${anime.episode}</span>`:''}
    </div>
    <div class="card-info">
      <div class="card-title">${anime.title||''}</div>
      <div class="card-meta">${anime.rating?`<span class="star">★</span><span>${anime.rating}</span>`:''}</div>
    </div>
  </a>`;
}

function makeOC(anime) {
  const sl = encodeURIComponent(anime.slug||'');
  return `<a href="anime.html?slug=${sl}" class="oc">
    <div class="oc-thumb"><img src="${anime.thumb||''}" alt="${anime.title}" loading="lazy" onerror="this.src='https://placehold.co/56x76/12121f/7c5cfc?text=?'"></div>
    <div class="oc-info">
      <div class="oc-title">${anime.title||''}</div>
      <div class="oc-ep">Episode ${anime.episode||'?'}</div>
      <div class="oc-day">${anime.day||''}</div>
    </div>
  </a>`;
}

// Inject logo ke semua elemen .logo
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.logo').forEach(el => {
    if (!el.dataset.logoSet) { el.innerHTML = LOGO_HTML; el.dataset.logoSet = '1'; }
  });
});
