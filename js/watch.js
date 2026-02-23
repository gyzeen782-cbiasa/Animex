// ===== watch.js — KitsuneID =====
const API = '/api';
let animeData = null, episodeList = [], currentSlug = '', currentEp = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const animeSlug = getParam('slug');
  const ep = parseInt(getParam('ep')) || 1;
  if (!animeSlug) { location.href='index.html'; return; }
  currentSlug = animeSlug; currentEp = ep;
  await loadAnime(animeSlug);
  await loadEpisode(animeSlug, ep);
});

async function loadAnime(slug) {
  try {
    const r = await fetch(`${API}/anime?slug=${encodeURIComponent(slug)}`);
    animeData = await r.json();
    episodeList = animeData.episodes || [];

    // Thumbnail & title
    const thumb = document.getElementById('watchThumb');
    const title = document.getElementById('watchTitle');
    if (thumb) { thumb.src = animeData.thumb||''; thumb.onerror = () => thumb.src='https://placehold.co/44x60/12121f/7c5cfc?text=?'; }
    if (title) title.textContent = animeData.title || '';

    // Synopsis
    const syn = document.getElementById('watchSynopsis');
    if (syn) syn.textContent = animeData.synopsis || 'Tidak ada sinopsis.';

    // Episode pills
    renderEpPills();
  } catch(e) {
    console.error('Gagal load anime:', e);
  }
}

function renderEpPills() {
  const container = document.getElementById('epPills');
  if (!container || !episodeList.length) return;
  const history = getLocal('watchHistory') || {};
  const watched = history[currentSlug] || [];
  container.innerHTML = episodeList.map(ep => {
    const num = ep.episode || ep.title?.match(/\d+/)?.[0] || '?';
    const isActive = String(num) === String(currentEp);
    const isWatched = watched.includes(String(num));
    return `<div class="ep-pill ${isActive?'active-ep':''} ${isWatched&&!isActive?'watched-ep':''}"
      onclick="goToEp('${ep.slug}', '${num}')">${num}</div>`;
  }).join('');
  // Scroll to active pill
  setTimeout(() => {
    const active = container.querySelector('.active-ep');
    if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }, 200);
}

async function loadEpisode(animeSlug, epNum) {
  // Update ep meta
  const epMeta = document.getElementById('epMeta');
  if (epMeta) epMeta.textContent = `Episode ${epNum}`;

  // Update nav buttons
  updateNavBtns(epNum);

  // Load iframe
  const playerDiv = document.getElementById('playerArea');
  if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z"/></svg><p>Memuat player...</p></div>`;

  // Cari slug episode dari list
  const ep = episodeList.find(e => String(e.episode) === String(epNum) || e.title?.includes(String(epNum)));
  if (!ep) { if(playerDiv) playerDiv.innerHTML=`<div class="video-placeholder"><p>Episode tidak ditemukan</p></div>`; return; }

  try {
    const r = await fetch(`${API}/episode?slug=${encodeURIComponent(ep.slug)}`);
    const data = await r.json();

    // Save to history
    saveWatchHistory(animeSlug, epNum);

    const servers = data.servers || [];
    renderServers(servers, ep.slug);

    if (servers.length && servers[0].url) {
      loadPlayer(servers[0].url);
    } else if (playerDiv) {
      playerDiv.innerHTML = `<div class="video-placeholder"><p>Sumber video tidak tersedia</p></div>`;
    }
  } catch(e) {
    if (playerDiv) playerDiv.innerHTML = `<div class="video-placeholder"><p>Gagal memuat episode</p></div>`;
  }
}

function loadPlayer(url) {
  const playerDiv = document.getElementById('playerArea');
  if (!playerDiv) return;
  playerDiv.innerHTML = `<iframe src="${url}" allowfullscreen allow="autoplay; fullscreen; encrypted-media" scrolling="no"></iframe>`;
}

function renderServers(servers, epSlug) {
  const container = document.getElementById('serverList');
  if (!container) return;
  if (!servers.length) { container.innerHTML='<span style="color:var(--muted);font-size:12px">Tidak ada server</span>'; return; }
  container.innerHTML = servers.map((s, i) =>
    `<button class="server-btn${i===0?' active':''}" onclick="selectServer(${i}, '${epSlug}', this)">${s.name||'Server '+(i+1)}</button>`
  ).join('');
  window._watchServers = servers;
}

window.selectServer = async function(idx, epSlug, btn) {
  document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const servers = window._watchServers || [];
  const server = servers[idx];
  if (!server) return;
  if (server.url) { loadPlayer(server.url); return; }
  if (server.needsNonce && server.serverId) {
    btn.textContent = 'Memuat...';
    try {
      const r = await fetch(`${API}/server?id=${encodeURIComponent(server.serverId)}&ref=${encodeURIComponent(server.referer||'')}`);
      const d = await r.json();
      if (d.url) loadPlayer(d.url);
      else throw new Error('no url');
    } catch(e) { btn.textContent = server.name || 'Error'; showToast('Gagal load server', 'error'); }
    btn.textContent = server.name || 'Server';
  }
};

function updateNavBtns(epNum) {
  const idx = episodeList.findIndex(e => String(e.episode) === String(epNum));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) {
    const hasPrev = idx > 0;
    prevBtn.classList.toggle('disabled', !hasPrev);
    if (hasPrev) {
      const prev = episodeList[idx-1];
      prevBtn.onclick = () => goToEp(prev.slug, prev.episode);
      prevBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Ep ${prev.episode||'Sebelumnya'}`;
    } else {
      prevBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Sebelumnya`;
    }
  }
  if (nextBtn) {
    const hasNext = idx < episodeList.length - 1;
    nextBtn.classList.toggle('disabled', !hasNext);
    if (hasNext) {
      const next = episodeList[idx+1];
      nextBtn.onclick = () => goToEp(next.slug, next.episode);
      nextBtn.innerHTML = `Ep ${next.episode||'Selanjutnya'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
    } else {
      nextBtn.innerHTML = `Selanjutnya <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
    }
  }
}

function goToEp(slug, num) {
  const url = `watch.html?slug=${encodeURIComponent(currentSlug)}&ep=${num}`;
  location.href = url;
}

function saveWatchHistory(slug, epNum) {
  const hist = getLocal('watchHistory') || {};
  if (!hist[slug]) hist[slug] = [];
  const epStr = String(epNum);
  if (!hist[slug].includes(epStr)) hist[slug].push(epStr);
  saveLocal('watchHistory', hist);

  // Recent watch
  const recent = (getLocal('recentWatch') || []).filter(a => a.slug !== slug);
  recent.unshift({
    slug, title: animeData?.title||'', thumb: animeData?.thumb||'',
    lastEp: epNum, timestamp: Date.now()
  });
  saveLocal('recentWatch', recent.slice(0, 30));
}
