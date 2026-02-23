// ===== home.js — KitsuneID =====
const API = 'https://kitsuneid-api-production.up.railway.app';
const JSONBIN_ID = '699c6ab843b1c97be996c684';
const JSONBIN_KEY = '$2a$10$.CS42KGtrfBux7Lo2QU6YOsRDcm8iFdNXnVwzdTig2BDtGRSJJ7Wq';

let heroList = [], heroIdx = 0, heroTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  loadOngoing();
  loadComplete();
  initSearch();
});

// ── Ambil anime custom dari JSONBin ──────────
async function loadCustomAnimes() {
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const d = await r.json();
    const record = d.record ?? d;
    return record.animes || [];
  } catch(e) { return []; }
}

// ── Ongoing ──────────────────────────────────
async function loadOngoing() {
  try {
    const [r, customs] = await Promise.all([
      fetch(`${API}/ongoing`),
      loadCustomAnimes()
    ]);
    const d = await r.json();

    // Gabungkan: custom anime ongoing + scrape ongoing
    const customOngoing = customs.filter(a => a.status === 'Ongoing');
    const allAnimes = [...customOngoing, ...(d.animes || [])];

    if (!allAnimes.length) {
      document.getElementById('ongoingGrid').innerHTML =
        '<p style="color:var(--muted);font-size:13px;grid-column:1/-1">Tidak ada data.</p>';
      return;
    }

    heroList = allAnimes.slice(0, 6);
    renderHero(0); renderDots();
    heroTimer = setInterval(() => renderHero((heroIdx + 1) % heroList.length), 5000);
    document.getElementById('ongoingGrid').innerHTML =
      allAnimes.slice(0, 12).map(a => makeCard(a, true)).join('');
    loadSchedule(d.animes || []);
  } catch(e) {
    document.getElementById('ongoingGrid').innerHTML =
      '<p style="color:var(--muted);font-size:13px;grid-column:1/-1">Gagal memuat. Coba refresh.</p>';
  }
}

// ── Complete ─────────────────────────────────
async function loadComplete() {
  try {
    const [r, customs] = await Promise.all([
      fetch(`${API}/complete`),
      loadCustomAnimes()
    ]);
    const d = await r.json();

    const customComplete = customs.filter(a => a.status === 'Complete');
    const allAnimes = [...customComplete, ...(d.animes || [])];

    if (!allAnimes.length) return;
    document.getElementById('completeGrid').innerHTML =
      allAnimes.slice(0, 12).map(a => makeCard(a)).join('');
  } catch(e) {}
}

// ── Hero ─────────────────────────────────────
function renderHero(idx) {
  if (!heroList[idx]) return;
  heroIdx = idx;
  const a = heroList[idx];
  const body = document.getElementById('heroBody');
  body.style.cssText = 'opacity:0;transform:translateY(8px);transition:none';
  setTimeout(() => {
    document.getElementById('heroBg').style.backgroundImage = `url('${a.thumb}')`;
    document.getElementById('heroTitle').textContent = a.title || '';
    document.getElementById('heroDesc').textContent = a.synopsis || 'Tidak ada sinopsis.';
    document.getElementById('heroMeta').innerHTML = `
      ${a.rating ? `<span class="hero-mi" style="color:#fbbf24">★ <span style="color:var(--text2)">${a.rating}</span></span>` : ''}
      ${a.episode ? `<span class="hero-mi">Ep ${a.episode}</span>` : ''}
      ${a.type ? `<span style="background:var(--accent-s);padding:2px 8px;border-radius:20px;font-size:10px;color:var(--accent)">${a.type}</span>` : ''}
    `;
    const sl = encodeURIComponent(a.slug || '');
    document.getElementById('heroWatch').href = `watch.html?slug=${sl}&ep=1`;
    document.getElementById('heroDetail').href = `anime.html?slug=${sl}`;
    body.style.cssText = 'opacity:1;transform:translateY(0);transition:opacity .4s,transform .4s';
    document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  }, 180);
}

function renderDots() {
  document.getElementById('heroDots').innerHTML = heroList.map((_, i) =>
    `<div class="hero-dot${i === 0 ? ' active' : ''}" onclick="selectHero(${i})"></div>`
  ).join('');
}

window.selectHero = function(i) {
  clearInterval(heroTimer);
  renderHero(i);
  heroTimer = setInterval(() => renderHero((heroIdx + 1) % heroList.length), 5000);
};

function loadSchedule(animes) {
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const today = days[new Date().getDay()];
  const todayList = animes.filter(a => a.day && a.day.includes(today));
  const el = document.getElementById('scheduleGrid');
  if (!todayList.length) {
    el.innerHTML = `<p style="color:var(--muted);font-size:13px;grid-column:1/-1">Tidak ada anime hari ${today}.</p>`;
    return;
  }
  el.innerHTML = todayList.slice(0, 6).map(a => makeOC(a)).join('');
}

// ── Search ───────────────────────────────────
function initSearch() {
  const inputs = ['searchInput','mSearchInput'].map(id => document.getElementById(id)).filter(Boolean);
  let timer;
  inputs.forEach(inp => {
    inp.addEventListener('input', e => {
      clearTimeout(timer);
      const q = e.target.value.trim();
      if (q.length < 2) { closeSearch(); return; }
      timer = setTimeout(() => doSearch(q), 400);
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-search') && !e.target.closest('.m-search')) closeSearch();
  });
}

async function doSearch(q) {
  const ov = document.getElementById('searchOv');
  ov.classList.add('show');
  ov.innerHTML = '<p style="color:var(--muted);font-size:13px">Mencari...</p>';
  try {
    // Cari di Railway + custom bersamaan
    const [r, customs] = await Promise.all([
      fetch(`${API}/search?q=${encodeURIComponent(q)}`),
      loadCustomAnimes()
    ]);
    const d = await r.json();
    const ql = q.toLowerCase();
    const customResults = customs.filter(a => a.title?.toLowerCase().includes(ql));
    const allResults = [...customResults, ...(d.results || [])];

    if (!allResults.length) {
      ov.innerHTML = '<p style="color:var(--muted);font-size:13px">Tidak ditemukan.</p>';
      return;
    }
    ov.innerHTML = allResults.slice(0, 8).map(a => `
      <a href="anime.html?slug=${encodeURIComponent(a.slug || '')}" class="sr-item" onclick="closeSearch()">
        <img src="${a.thumb}" class="sr-thumb"
          onerror="this.src='https://placehold.co/38x52/12121f/7c5cfc?text=?'">
        <div>
          <div class="sr-title">${a.title}</div>
          <div class="sr-meta">${a.status || ''}</div>
        </div>
      </a>`).join('');
  } catch(e) {
    ov.innerHTML = '<p style="color:var(--muted);font-size:13px">Gagal mencari.</p>';
  }
}

function closeSearch() { document.getElementById('searchOv')?.classList.remove('show'); }
