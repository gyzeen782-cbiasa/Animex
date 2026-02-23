// ===== ANIME.JS — Detail page logic =====
const API = 'https://kitsuneid-api-production.up.railway.app';

const slug = getParam('slug');
let isSynopsisExpanded = false;
let isSaved = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!slug) {
    window.location.href = 'index.html';
    return;
  }
  loadAnimeDetail(slug);
  checkSaved();
});

async function loadAnimeDetail(slug) {
  try {
    const res = await fetch(`${API}/anime?slug=${encodeURIComponent(slug)}`);
    const data = await res.json();

    if (!data || !data.title) {
      document.getElementById('detailContent').innerHTML =
        '<p style="color:var(--text-muted);padding:20px">Anime tidak ditemukan.</p>';
      return;
    }

    renderDetail(data);
    renderEpisodes(data.episodes || []);

  } catch (err) {
    console.error('Error:', err);
    document.getElementById('detailContent').innerHTML =
      '<p style="color:var(--text-muted);padding:20px">Gagal memuat detail anime.</p>';
  }
}

function renderDetail(anime) {
  document.getElementById('detailBg').style.backgroundImage = `url('${anime.thumb}')`;
  document.title = `${anime.title} — KitsuneID`;

  const statusClass = anime.status === 'Ongoing' ? 'badge-ongoing' : 'badge-complete';

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-poster">
      <img src="${anime.thumb}" alt="${anime.title}"
           onerror="this.src='https://placehold.co/180x240/12121f/7c5cfc?text=No+Image'">
    </div>
    <div class="detail-info">
      <div class="detail-badges">
        <span class="badge ${statusClass}">${anime.status || 'Unknown'}</span>
        ${anime.type ? `<span class="badge badge-type">${anime.type}</span>` : ''}
        ${anime.rating ? `<span class="badge badge-type">★ ${anime.rating}</span>` : ''}
      </div>

      <h1 class="detail-title">${anime.title}</h1>
      ${anime.altTitle ? `<p class="detail-alt-title">${anime.altTitle}</p>` : ''}

      <div class="detail-stats">
        ${anime.episode ? `<div class="stat-item"><span class="stat-label">Episode</span><span class="stat-value">${anime.episode}</span></div>` : ''}
        ${anime.rating ? `<div class="stat-item"><span class="stat-label">Rating</span><span class="stat-value rating">★ ${anime.rating}</span></div>` : ''}
        ${anime.duration ? `<div class="stat-item"><span class="stat-label">Durasi</span><span class="stat-value">${anime.duration}</span></div>` : ''}
        ${anime.aired ? `<div class="stat-item"><span class="stat-label">Tayang</span><span class="stat-value">${anime.aired}</span></div>` : ''}
        ${anime.studio ? `<div class="stat-item"><span class="stat-label">Studio</span><span class="stat-value">${anime.studio}</span></div>` : ''}
      </div>

      <div class="detail-actions">
        <a href="watch.html?slug=${encodeURIComponent(slug)}&ep=1" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Mulai Nonton
        </a>
        <button class="btn-save" id="saveBtn" onclick="toggleSave(${JSON.stringify(anime).replace(/"/g, '&quot;')})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <span id="saveBtnText">Simpan</span>
        </button>
      </div>

      ${anime.genres && anime.genres.length ? `
        <div class="detail-genres">
          ${anime.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;

  if (anime.synopsis) {
    document.getElementById('synopsisSection').style.display = 'block';
    document.getElementById('synopsisText').textContent = anime.synopsis;
  }

  if (isSaved) {
    const btn = document.getElementById('saveBtn');
    if (btn) {
      btn.classList.add('saved');
      document.getElementById('saveBtnText').textContent = 'Tersimpan';
    }
  }
}

function renderEpisodes(episodes) {
  const section = document.getElementById('episodeSection');
  if (!episodes || episodes.length === 0) return;

  section.style.display = 'block';
  document.getElementById('epCount').textContent = `${episodes.length} Episode`;

  const history = getLocal('watchHistory') || {};  // FIX: getLocal bukan getFromLocal
  const watchedEps = history[slug] || [];

  const batches = [];
  for (let i = 0; i < episodes.length; i += 50) {
    batches.push(`${i + 1}–${Math.min(i + 50, episodes.length)}`);
  }

  const filterEl = document.getElementById('episodeFilter');
  if (batches.length > 1) {
    filterEl.innerHTML = batches.map((b, i) => `
      <button class="filter-btn ${i === 0 ? 'active' : ''}" onclick="showBatch(${i})">${b}</button>
    `).join('');
  }

  window._episodes = episodes;
  window._watchedEps = watchedEps;
  window.showBatch = (batchIndex) => {
    document.querySelectorAll('.filter-btn').forEach((b, i) => b.classList.toggle('active', i === batchIndex));
    renderEpisodeBatch(batchIndex);
  };

  renderEpisodeBatch(0);
}

function renderEpisodeBatch(batchIndex) {
  const episodes = window._episodes || [];
  const watchedEps = window._watchedEps || [];
  const start = batchIndex * 50;
  const batch = episodes.slice(start, start + 50);

  const list = document.getElementById('episodeList');
  list.innerHTML = batch.map((ep, i) => {
    const epNum = ep.episode || (start + i + 1);
    const isWatched = watchedEps.includes(String(epNum));
    // FIX: slug episode yang benar → pakai ep.slug, bukan slug anime
    const animeSlug = encodeURIComponent(slug);

    return `
      <a href="watch.html?slug=${animeSlug}&ep=${epNum}" class="episode-item ${isWatched ? 'watched' : ''}">
        <span class="ep-num">${epNum}</span>
        <div class="ep-info">
          <div class="ep-title">${ep.title || `Episode ${epNum}`}</div>
          ${ep.date ? `<div class="ep-date">${ep.date}</div>` : ''}
        </div>
        <div class="${isWatched ? 'ep-watched-icon done' : 'ep-play'}">
          ${isWatched
            ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20 6L9 17l-5-5"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
          }
        </div>
      </a>
    `;
  }).join('');
}

function toggleSynopsis() {
  const text = document.getElementById('synopsisText');
  const toggle = document.getElementById('synopsisToggle');
  isSynopsisExpanded = !isSynopsisExpanded;
  text.classList.toggle('collapsed', !isSynopsisExpanded);
  toggle.textContent = isSynopsisExpanded ? 'Sembunyikan ▴' : 'Baca Selengkapnya ▾';
}

function checkSaved() {
  const saved = getLocal('savedAnimes') || [];  // FIX: getLocal
  isSaved = saved.some(a => a.slug === slug);
}

function toggleSave(anime) {
  let saved = getLocal('savedAnimes') || [];  // FIX: getLocal
  const idx = saved.findIndex(a => a.slug === slug);
  const btn = document.getElementById('saveBtn');
  const text = document.getElementById('saveBtnText');

  if (idx === -1) {
    saved.push({ ...anime, slug, savedAt: Date.now() });
    isSaved = true;
    btn.classList.add('saved');
    text.textContent = 'Tersimpan';
    showToast('Anime disimpan!', 'success');
  } else {
    saved.splice(idx, 1);
    isSaved = false;
    btn.classList.remove('saved');
    text.textContent = 'Simpan';
    showToast('Dihapus dari simpan.', 'info');
  }

  saveLocal('savedAnimes', saved);  // FIX: saveLocal
}
