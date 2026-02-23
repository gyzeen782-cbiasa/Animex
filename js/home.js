// ===== HOME.JS — Homepage logic =====

const API_BASE = '/api';

// Data hero carousel
let heroAnimes = [];
let currentHero = 0;
let heroTimer = null;

// ── Init ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadOngoing();
  loadComplete();
  initSearch();
});

// ── Load Ongoing Anime ───────────────────
async function loadOngoing() {
  try {
    const res = await fetch(`${API_BASE}/ongoing`);
    const data = await res.json();

    if (!data.animes || data.animes.length === 0) {
      document.getElementById('ongoingGrid').innerHTML =
        '<p style="color:var(--text-muted);font-size:13px;grid-column:1/-1">Tidak ada data.</p>';
      return;
    }

    // Set hero dari 5 anime pertama
    heroAnimes = data.animes.slice(0, 5);
    renderHero(0);
    renderHeroDots();

    // Render grid
    const grid = document.getElementById('ongoingGrid');
    grid.innerHTML = data.animes.slice(0, 12).map(a => createAnimeCard(a, true)).join('');

    // Auto slide hero
    heroTimer = setInterval(() => {
      currentHero = (currentHero + 1) % heroAnimes.length;
      renderHero(currentHero);
    }, 5000);

    // Load jadwal
    loadSchedule(data.animes);

  } catch (err) {
    console.error('Gagal load ongoing:', err);
    document.getElementById('ongoingGrid').innerHTML =
      '<p style="color:var(--text-muted);font-size:13px;grid-column:1/-1">Gagal memuat data. Coba refresh.</p>';
  }
}

// ── Load Complete Anime ──────────────────
async function loadComplete() {
  try {
    const res = await fetch(`${API_BASE}/complete`);
    const data = await res.json();

    if (!data.animes || data.animes.length === 0) return;

    const grid = document.getElementById('completeGrid');
    grid.innerHTML = data.animes.slice(0, 12).map(a => createAnimeCard(a)).join('');

  } catch (err) {
    document.getElementById('completeGrid').innerHTML =
      '<p style="color:var(--text-muted);font-size:13px;grid-column:1/-1">Gagal memuat data.</p>';
  }
}

// ── Render Hero ──────────────────────────
function renderHero(index) {
  const anime = heroAnimes[index];
  if (!anime) return;

  const bg = document.getElementById('heroBg');
  const title = document.getElementById('heroTitle');
  const meta = document.getElementById('heroMeta');
  const desc = document.getElementById('heroDesc');
  const watchBtn = document.getElementById('heroWatchBtn');
  const detailBtn = document.getElementById('heroDetailBtn');

  // Transition effect
  const heroContent = document.getElementById('heroContent');
  heroContent.style.opacity = '0';
  heroContent.style.transform = 'translateY(8px)';

  setTimeout(() => {
    bg.style.backgroundImage = `url('${anime.thumb}')`;
    title.textContent = anime.title;
    desc.textContent = anime.synopsis || 'Tidak ada sinopsis.';

    meta.innerHTML = `
      ${anime.rating ? `<span class="hero-meta-item rating-star">★ <span style="color:var(--text-secondary)">${anime.rating}</span></span>` : ''}
      ${anime.episode ? `<span class="hero-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2l-5 5-5-5"/></svg> Ep ${anime.episode}</span>` : ''}
      ${anime.type ? `<span class="hero-meta-item" style="background:var(--accent-soft);padding:2px 8px;border-radius:20px;font-size:11px;color:var(--accent)">${anime.type}</span>` : ''}
    `;

    const slug = encodeURIComponent(anime.slug || '');
    watchBtn.href = `watch.html?slug=${slug}&ep=1`;
    detailBtn.href = `anime.html?slug=${slug}`;

    heroContent.style.opacity = '1';
    heroContent.style.transition = 'opacity 0.4s, transform 0.4s';
    heroContent.style.transform = 'translateY(0)';

    // Update dots
    document.querySelectorAll('.hero-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentHero = index;
  }, 200);
}

// ── Hero Dots ───────────────────────────
function renderHeroDots() {
  const dots = document.getElementById('heroDots');
  dots.innerHTML = heroAnimes.map((_, i) => `
    <div class="hero-dot ${i === 0 ? 'active' : ''}" onclick="selectHero(${i})"></div>
  `).join('');
}

function selectHero(index) {
  clearInterval(heroTimer);
  renderHero(index);
  heroTimer = setInterval(() => {
    currentHero = (currentHero + 1) % heroAnimes.length;
    renderHero(currentHero);
  }, 5000);
}

// ── Jadwal hari ini ──────────────────────
function loadSchedule(animes) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = days[new Date().getDay()];

  const todayAnimes = animes.filter(a => a.day && a.day.includes(today));
  const grid = document.getElementById('scheduleGrid');

  if (todayAnimes.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);font-size:13px;grid-column:1/-1">Tidak ada anime hari ini (${today}).</p>`;
    return;
  }

  grid.innerHTML = todayAnimes.slice(0, 6).map(a => createOngoingCard(a)).join('');
}

// ── Search ───────────────────────────────
function initSearch() {
  const inputs = [
    document.getElementById('searchInput'),
    document.getElementById('mobileSearchInput')
  ].filter(Boolean);

  let searchTimeout;

  inputs.forEach(input => {
    input.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const q = e.target.value.trim();
      if (q.length < 2) {
        closeSearch();
        return;
      }
      searchTimeout = setTimeout(() => doSearch(q), 400);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-search') && !e.target.closest('.mobile-search')) {
      closeSearch();
    }
  });
}

async function doSearch(query) {
  const overlay = document.getElementById('searchOverlay');
  overlay.classList.add('active');
  overlay.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Mencari...</p>';

  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      overlay.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Tidak ditemukan.</p>';
      return;
    }

    overlay.innerHTML = data.results.slice(0, 8).map(a => `
      <a href="anime.html?slug=${encodeURIComponent(a.slug || '')}" class="search-result-item" onclick="closeSearch()">
        <img src="${a.thumb}" class="search-result-thumb"
             onerror="this.src='https://via.placeholder.com/40x54/12121f/7c5cfc?text=?'">
        <div class="search-result-info">
          <div class="search-result-title">${a.title}</div>
          <div class="search-result-meta">${a.status || ''} ${a.episode ? '· Ep ' + a.episode : ''}</div>
        </div>
      </a>
    `).join('');

  } catch (err) {
    overlay.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Gagal mencari.</p>';
  }
}

function closeSearch() {
  const overlay = document.getElementById('searchOverlay');
  overlay.classList.remove('active');
}
