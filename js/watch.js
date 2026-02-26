// ===== watch.js — KitsuneID =====
const API = 'https://kitsuneid-api-production.up.railway.app';
// getJbBin() = '699c6ab843b1c97be996c684';
function getJbKey() { return localStorage.getItem('jb_api_key') || ''; }
function getJbBin() { return localStorage.getItem('jb_bin_id') || '699c6ab843b1c97be996c684'; }

let animeData = null, episodeList = [], currentSlug = '', currentEp = '1';

document.addEventListener('DOMContentLoaded', async () => {
  const animeSlug = getParam('slug');
  const ep = getParam('ep') || '1';
  if (!animeSlug) { location.href = 'index.html'; return; }
  currentSlug = animeSlug;
  currentEp = ep;
  await loadAnime(animeSlug);
  await loadEpisode(animeSlug, ep);
});

// ── Cek custom anime ─────────────────────────
function isCustomAnime(slug) {
  return slug && slug.startsWith('custom-');
}

async function getCustomAnime(slug) {
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${getJbBin()}/latest`, {
      headers: { 'X-Master-Key': getJbKey() }
    });
    const d = await r.json();
    const record = d.record ?? d; return (record.animes || []).find(a => a.slug === slug) || null;
  } catch(e) { return null; }
}

// ── Fetch with timeout helper ───────────────
async function fetchWithTimeout(url, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return r;
  } catch(e) {
    clearTimeout(timer);
    throw e;
  }
}

// ── Load anime info ──────────────────────────
async function loadAnime(slug) {
  const titleEl   = document.getElementById('watchTitle');
  const synEl     = document.getElementById('watchSynopsis');
  const epSection = document.getElementById('epPills');

  try {
    if (isCustomAnime(slug)) {
      animeData = await getCustomAnime(slug);
    } else {
      const r = await fetchWithTimeout(`${API}/anime?slug=${encodeURIComponent(slug)}`, 20000);
      animeData = await r.json();
    }

    if (!animeData || !animeData.title) {
      if (titleEl) titleEl.textContent = 'Anime tidak ditemukan';
      if (synEl) synEl.textContent = '';
      return;
    }

    episodeList = animeData.episodes || [];

    const thumbEl = document.getElementById('watchThumb');
    if (thumbEl) {
      thumbEl.src = animeData.thumb || '';
      thumbEl.onerror = () => thumbEl.src = 'https://placehold.co/44x60/12121f/7c5cfc?text=?';
    }
    if (titleEl) titleEl.textContent = animeData.title || '';
    if (synEl) synEl.textContent = animeData.synopsis || 'Tidak ada sinopsis.';

    const detailLink = document.getElementById('detailLink');
    if (detailLink) detailLink.href = `anime.html?slug=${encodeURIComponent(slug)}`;

    renderEpPills();
  } catch(e) {
    console.error('Load anime error:', e);
    if (titleEl) titleEl.textContent = 'Gagal memuat';
    if (synEl) synEl.textContent = 'Server lambat atau tidak tersedia. Coba refresh halaman.';
    if (epSection) epSection.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px">Gagal memuat episode. <a href="javascript:location.reload()" style="color:var(--accent)">Refresh</a></div>';
  }
}

// ── Render tombol episode ────────────────────
function renderEpPills() {
  const container = document.getElementById('epPills');
  if (!container) return;
  if (!episodeList.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px">Tidak ada episode</div>';
    return;
  }
  const hist = getLocal('watchHistory') || {};
  const watched = hist[currentSlug] || [];
  container.innerHTML = episodeList.map(ep => {
    const num = ep.episode || ep.title?.match(/\d+/)?.[0] || '?';
    const isActive = String(num) === String(currentEp);
    const isWatched = watched.includes(String(num)) && !isActive;
    return `<div class="ep-pill ${isActive ? 'active-ep' : ''} ${isWatched ? 'watched-ep' : ''}"
      onclick="goToEp('${ep.slug || ''}','${num}')">${num}</div>`;
  }).join('');
  setTimeout(() => {
    const active = container.querySelector('.active-ep');
    if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, 300);
}

// ── Load episode — format baru Jikan+Samehadaku ─
async function loadEpisode(animeSlug, epNum) {
  const epMeta = document.getElementById('epMeta');
  if (epMeta) epMeta.textContent = `Episode ${epNum}`;

  const playerDiv = document.getElementById('playerArea');
  if (playerDiv) playerDiv.innerHTML = `
    <div class="video-placeholder">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z"/>
      </svg>
      <p>Memuat player...</p>
    </div>`;

  const ep = episodeList.find(e =>
    String(e.episode) === String(epNum) ||
    e.title?.match(/\d+/)?.[0] === String(epNum)
  );

  if (!ep) {
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Episode ${epNum} tidak ditemukan</p></div>`;
    updateNavBtns(epNum);
    return;
  }

  // ── CUSTOM ANIME: punya URL langsung ────────
  if (isCustomAnime(animeSlug) && ep.url) {
    saveWatchHistory(animeSlug, epNum);
    renderEpPills();
    updateNavBtns(epNum);
    // Tampilkan server tunggal dengan URL langsung
    renderServers([{ name: 'Default', url: ep.url }], ep.slug || '');
    loadPlayer(ep.url);
    return;
  }

  // ── ANIME SCRAPE: ambil dari Railway ─────────
  const epSlug = ep.slug || '';
  if (!epSlug) {
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Episode tidak valid</p></div>`;
    return;
  }

  try {
    const r = await fetchWithTimeout(`${API}/episode?slug=${encodeURIComponent(epSlug)}`, 25000);
    const data = await r.json();

    saveWatchHistory(animeSlug, epNum);
    renderEpPills();

    // Format baru: { servers: [{name, url}] }
    const servers = data.servers || [];
    renderServers(servers, epSlug);
    updateNavBtns(epNum);

    if (servers.length) {
      const first = servers[0];
      if (first.url) {
        loadPlayer(first.url);
      } else {
        if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Server tidak tersedia</p></div>`;
      }
    } else {
      if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Tidak ada server tersedia</p></div>`;
    }
  } catch(e) {
    console.error('Load episode error:', e);
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Gagal memuat episode. Coba refresh.</p></div>`;
  }
}

// ── Player ───────────────────────────────────
function loadPlayer(url) {
  const playerDiv = document.getElementById('playerArea');
  if (!playerDiv) return;
  playerDiv.innerHTML = `<iframe
    src="${url}"
    allowfullscreen
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
    scrolling="no" frameborder="0"
    style="width:100%;aspect-ratio:16/9;border:none;display:block;background:#000"
  ></iframe>`;
}

function renderServers(servers, epSlug) {
  const container = document.getElementById('serverList');
  if (!container) return;
  window._epServers = servers;
  window._epSlug = epSlug;
  if (!servers.length) {
    container.innerHTML = '<span style="color:var(--muted);font-size:12px">Tidak ada server</span>';
    return;
  }
  container.innerHTML = servers.map((s, i) =>
    `<button class="server-btn ${i === 0 ? 'active' : ''}" onclick="selectServer(${i}, this)">
      ${s.name || 'Server ' + (i + 1)}
    </button>`
  ).join('');
}

async function loadServerById(serverId, btnIdx) {
  const playerDiv = document.getElementById('playerArea');
  if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Memuat server...</p></div>`;
  try {
    const r = await fetchWithTimeout(`${API}/server?id=${encodeURIComponent(serverId)}`, 15000);
    const d = await r.json();
    if (d.url) loadPlayer(d.url);
    else if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Server tidak merespons. Coba server lain.</p></div>`;
  } catch(e) {
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Gagal memuat server.</p></div>`;
  }
}

window.selectServer = async function(idx, btn) {
  document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const server = (window._epServers || [])[idx];
  if (!server) return;
  if (server.url) { loadPlayer(server.url); return; }
  if (server.serverId) await loadServerById(server.serverId, idx);
};

// ── Navigasi episode ─────────────────────────
function updateNavBtns(epNum) {
  const idx = episodeList.findIndex(e =>
    String(e.episode) === String(epNum) ||
    e.title?.match(/\d+/)?.[0] === String(epNum)
  );
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) {
    const hasPrev = idx > 0;
    prevBtn.classList.toggle('disabled', !hasPrev);
    if (hasPrev) {
      const prev = episodeList[idx - 1];
      const prevNum = prev.episode || prev.title?.match(/\d+/)?.[0] || '?';
      prevBtn.onclick = () => goToEp(prev.slug || '', prevNum);
      prevBtn.innerHTML = `‹ Ep ${prevNum}`;
    } else { prevBtn.innerHTML = `‹ Sebelumnya`; }
  }
  if (nextBtn) {
    const hasNext = idx < episodeList.length - 1 && idx >= 0;
    nextBtn.classList.toggle('disabled', !hasNext);
    if (hasNext) {
      const next = episodeList[idx + 1];
      const nextNum = next.episode || next.title?.match(/\d+/)?.[0] || '?';
      nextBtn.onclick = () => goToEp(next.slug || '', nextNum);
      nextBtn.innerHTML = `Ep ${nextNum} ›`;
    } else { nextBtn.innerHTML = `Selanjutnya ›`; }
  }
}

function goToEp(epSlug, num) {
  location.href = `watch.html?slug=${encodeURIComponent(currentSlug)}&ep=${num}`;
}

function saveWatchHistory(slug, epNum) {
  const hist = getLocal('watchHistory') || {};
  if (!hist[slug]) hist[slug] = [];
  const s = String(epNum);
  if (!hist[slug].includes(s)) hist[slug].push(s);
  saveLocal('watchHistory', hist);

  const recent = (getLocal('recentWatch') || []).filter(a => a.slug !== slug);
  recent.unshift({
    slug, title: animeData?.title || '',
    thumb: animeData?.thumb || '',
    lastEp: epNum, timestamp: Date.now()
  });
  saveLocal('recentWatch', recent.slice(0, 30));
}
