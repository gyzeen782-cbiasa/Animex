// ===== watch.js — KitsuneID (fixed) =====
const API = 'kitsuneid-api-production.up.railway.app';
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

async function loadAnime(slug) {
  try {
    const r = await fetch(`${API}/anime?slug=${encodeURIComponent(slug)}`);
    animeData = await r.json();

    // Handle both field name conventions
    const thumb = animeData.thumb || animeData.poster || '';
    const title = animeData.title || '';

    episodeList = animeData.episodes || [];

    const thumbEl = document.getElementById('watchThumb');
    const titleEl = document.getElementById('watchTitle');
    if (thumbEl) { thumbEl.src = thumb; thumbEl.onerror = () => thumbEl.src = 'https://placehold.co/44x60/12121f/7c5cfc?text=?'; }
    if (titleEl) titleEl.textContent = title;

    // Synopsis
    const synEl = document.getElementById('watchSynopsis');
    if (synEl) synEl.textContent = animeData.synopsis || 'Tidak ada sinopsis.';

    // Detail link
    const detailLink = document.getElementById('detailLink');
    if (detailLink) detailLink.href = `anime.html?slug=${encodeURIComponent(slug)}`;

    renderEpPills();
  } catch(e) {
    console.error('Load anime error:', e);
  }
}

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
      onclick="goToEp('${ep.slug || ep.episodeId || ''}','${num}')">${num}</div>`;
  }).join('');

  // Scroll ke active
  setTimeout(() => {
    const active = container.querySelector('.active-ep');
    if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, 300);
}

async function loadEpisode(animeSlug, epNum) {
  // Update UI
  const epMeta = document.getElementById('epMeta');
  if (epMeta) epMeta.textContent = `Episode ${epNum}`;

  const playerDiv = document.getElementById('playerArea');
  if (playerDiv) playerDiv.innerHTML = `
    <div class="video-placeholder">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z"/></svg>
      <p>Memuat player...</p>
    </div>`;

  // Cari episode di list
  const ep = episodeList.find(e =>
    String(e.episode) === String(epNum) ||
    e.title?.match(/\d+/)?.[0] === String(epNum)
  );

  if (!ep) {
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Episode ${epNum} tidak ditemukan</p></div>`;
    updateNavBtns(epNum);
    return;
  }

  const epSlug = ep.slug || ep.episodeId || '';
  if (!epSlug) {
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Episode tidak valid</p></div>`;
    return;
  }

  try {
    const r = await fetch(`${API}/episode?slug=${encodeURIComponent(epSlug)}`);
    const data = await r.json();

    saveWatchHistory(animeSlug, epNum);
    renderEpPills(); // Update watched state

    const servers = data.servers || [];
    renderServers(servers, epSlug);
    updateNavBtns(epNum);

    // Auto-load server pertama
    if (servers.length) {
      const first = servers[0];
      if (first.url) {
        loadPlayer(first.url);
      } else if (first.serverId && first.needsPost) {
        // Fetch URL dari server endpoint
        await loadServerById(first.serverId, 0);
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

function loadPlayer(url) {
  const playerDiv = document.getElementById('playerArea');
  if (!playerDiv) return;
  // Tambah cache buster kecil biar tidak blocked
  playerDiv.innerHTML = `<iframe
    src="${url}"
    allowfullscreen
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
    scrolling="no"
    frameborder="0"
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
    `<button class="server-btn ${i === 0 ? 'active' : ''}" onclick="selectServer(${i}, this)">${s.name || 'Server ' + (i + 1)}</button>`
  ).join('');
}

async function loadServerById(serverId, btnIdx) {
  const playerDiv = document.getElementById('playerArea');
  if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Memuat server...</p></div>`;
  try {
    const r = await fetch(`${API}/server?id=${encodeURIComponent(serverId)}`);
    const d = await r.json();
    if (d.url) {
      loadPlayer(d.url);
    } else {
      if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Server tidak merespons. Coba server lain.</p></div>`;
    }
  } catch(e) {
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Gagal memuat server.</p></div>`;
  }
}

window.selectServer = async function(idx, btn) {
  document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const servers = window._epServers || [];
  const server = servers[idx];
  if (!server) return;
  if (server.url) { loadPlayer(server.url); return; }
  if (server.serverId) { await loadServerById(server.serverId, idx); }
};

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
      prevBtn.onclick = () => goToEp(prev.slug || prev.episodeId || '', prevNum);
      prevBtn.innerHTML = `‹ Ep ${prevNum}`;
    } else {
      prevBtn.innerHTML = `‹ Sebelumnya`;
    }
  }

  if (nextBtn) {
    const hasNext = idx < episodeList.length - 1 && idx >= 0;
    nextBtn.classList.toggle('disabled', !hasNext);
    if (hasNext) {
      const next = episodeList[idx + 1];
      const nextNum = next.episode || next.title?.match(/\d+/)?.[0] || '?';
      nextBtn.onclick = () => goToEp(next.slug || next.episodeId || '', nextNum);
      nextBtn.innerHTML = `Ep ${nextNum} ›`;
    } else {
      nextBtn.innerHTML = `Selanjutnya ›`;
    }
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
    thumb: animeData?.thumb || animeData?.poster || '',
    lastEp: epNum, timestamp: Date.now()
  });
  saveLocal('recentWatch', recent.slice(0, 30));
}
