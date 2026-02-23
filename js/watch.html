// ===== WATCH.JS — Streaming page logic =====

const slug = getParam('slug');
let currentEp = parseInt(getParam('ep')) || 1;
let animeData = null;
let allEpisodes = [];
let currentServers = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!slug) { window.location.href = 'index.html'; return; }
  loadWatchPage();
});

async function loadWatchPage() {
  try {
    // Load detail anime + episode list
    const res = await fetch(`/api/anime?slug=${encodeURIComponent(slug)}`);
    animeData = await res.json();

    if (!animeData || !animeData.title) throw new Error('Data tidak ditemukan');

    document.title = `${animeData.title} Ep ${currentEp} — AnimeKu`;
    allEpisodes = animeData.episodes || [];

    // Update sidebar info
    document.getElementById('sidebarTitle').textContent = animeData.title;
    document.getElementById('sidebarThumb').src = animeData.thumb;
    document.getElementById('sidebarAnimeLink').href = `anime.html?slug=${encodeURIComponent(slug)}`;
    document.getElementById('sidebarEpLabel').textContent = `${allEpisodes.length} Episode`;
    document.getElementById('playerTitle').textContent = animeData.title;

    renderSidebarEps();
    loadEpisode(currentEp);

    // Ep search
    document.getElementById('epSearch').addEventListener('input', (e) => {
      const num = parseInt(e.target.value);
      if (num && num > 0 && num <= allEpisodes.length) {
        scrollToEp(num);
      }
    });

  } catch (err) {
    console.error(err);
    document.getElementById('playerWrapper').innerHTML =
      '<div class="player-placeholder"><p style="color:var(--text-muted)">Gagal memuat. Coba refresh.</p></div>';
  }
}

async function loadEpisode(epNum) {
  currentEp = epNum;
  document.getElementById('playerEpInfo').textContent = `Episode ${epNum}`;

  // Update active ep di sidebar
  document.querySelectorAll('.sidebar-ep-item').forEach(item => {
    item.classList.toggle('active-ep', parseInt(item.dataset.ep) === epNum);
  });

  // Update nav buttons
  const prevBtn = document.getElementById('prevEpBtn');
  const nextBtn = document.getElementById('nextEpBtn');

  if (epNum <= 1) {
    prevBtn.style.opacity = '0.4';
    prevBtn.style.pointerEvents = 'none';
  } else {
    prevBtn.style.opacity = '1';
    prevBtn.style.pointerEvents = 'auto';
    prevBtn.onclick = (e) => { e.preventDefault(); loadEpisode(epNum - 1); };
  }

  if (epNum >= allEpisodes.length) {
    nextBtn.style.opacity = '0.4';
    nextBtn.style.pointerEvents = 'none';
  } else {
    nextBtn.style.opacity = '1';
    nextBtn.style.pointerEvents = 'auto';
    nextBtn.onclick = (e) => { e.preventDefault(); loadEpisode(epNum + 1); };
  }

  // Update URL tanpa reload
  const newUrl = `watch.html?slug=${encodeURIComponent(slug)}&ep=${epNum}`;
  history.replaceState(null, '', newUrl);

  // Tambahkan ke history
  saveWatchHistory(epNum);

  // Load streaming links
  try {
    const ep = allEpisodes.find(e => parseInt(e.episode) === epNum) || allEpisodes[epNum - 1];
    if (!ep) throw new Error('Episode tidak ditemukan');

    const res = await fetch(`/api/episode?slug=${encodeURIComponent(ep.slug || slug)}&ep=${epNum}`);
    const data = await res.json();

    currentServers = data.servers || [];
    renderServers(currentServers);

    if (currentServers.length > 0) {
      loadServer(currentServers[0]);
    } else {
      document.getElementById('playerWrapper').innerHTML =
        '<div class="player-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:0.3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><p>Link streaming tidak tersedia untuk episode ini.</p></div>';
    }

  } catch (err) {
    console.error('Episode error:', err);
  }
}

function renderServers(servers) {
  const container = document.getElementById('serverSelect');
  if (!servers || servers.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = servers.map((s, i) => `
    <button class="server-btn ${i === 0 ? 'active' : ''}"
            onclick="selectServer(${i})" data-idx="${i}">
      ${s.name || `Server ${i + 1}`}
    </button>
  `).join('');
}

function selectServer(idx) {
  document.querySelectorAll('.server-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
  loadServer(currentServers[idx]);
}

function loadServer(server) {
  if (!server || !server.url) return;

  document.getElementById('playerWrapper').innerHTML = `
    <iframe src="${server.url}"
            allowfullscreen
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups">
    </iframe>
  `;
}

function renderSidebarEps() {
  const list = document.getElementById('sidebarEpList');
  list.innerHTML = allEpisodes.map((ep, i) => {
    const epNum = parseInt(ep.episode) || (i + 1);
    const history = getFromLocal('watchHistory') || {};
    const watched = (history[slug] || []).includes(String(epNum));

    return `
      <div class="sidebar-ep-item ${epNum === currentEp ? 'active-ep' : ''}"
           data-ep="${epNum}"
           onclick="loadEpisode(${epNum})">
        <span class="sidebar-ep-num">${epNum}</span>
        <span class="sidebar-ep-title">${ep.title || `Episode ${epNum}`}</span>
        <div class="sidebar-ep-watched ${watched ? 'done' : ''}"></div>
      </div>
    `;
  }).join('');

  // Scroll ke episode aktif
  setTimeout(() => scrollToEp(currentEp), 100);
}

function scrollToEp(epNum) {
  const item = document.querySelector(`.sidebar-ep-item[data-ep="${epNum}"]`);
  if (item) {
    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function saveWatchHistory(epNum) {
  let history = getFromLocal('watchHistory') || {};
  if (!history[slug]) history[slug] = [];
  const epStr = String(epNum);
  if (!history[slug].includes(epStr)) {
    history[slug].push(epStr);
  }

  // Simpan juga info anime ke recent
  if (animeData) {
    let recent = getFromLocal('recentWatch') || [];
    recent = recent.filter(a => a.slug !== slug);
    recent.unshift({ slug, title: animeData.title, thumb: animeData.thumb, lastEp: epNum, timestamp: Date.now() });
    if (recent.length > 20) recent = recent.slice(0, 20);
    saveToLocal('recentWatch', recent);
  }

  saveToLocal('watchHistory', history);
}
