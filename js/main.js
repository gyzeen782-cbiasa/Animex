// ===== MAIN.JS — Global utilities =====

// ── Toast Notification ──────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Slug dari URL ────────────────────────
function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ── Format angka ─────────────────────────
function formatNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

// ── Buat HTML card anime ─────────────────
function createAnimeCard(anime, isNew = false) {
  const slug = encodeURIComponent(anime.slug || anime.url || '');
  return `
    <a href="anime.html?slug=${slug}" class="anime-card">
      <div class="anime-card-thumb">
        <img src="${anime.thumb}" alt="${anime.title}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/200x280/12121f/7c5cfc?text=No+Image'">
        <div class="anime-card-thumb-overlay">
          <div class="play-btn-card">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        ${isNew ? '<span class="badge-new">New</span>' : ''}
        ${anime.episode ? `<span class="badge-ep">Ep ${anime.episode}</span>` : ''}
      </div>
      <div class="anime-card-info">
        <div class="anime-card-title">${anime.title}</div>
        <div class="anime-card-meta">
          ${anime.rating ? `<span class="rating-star">★</span> <span>${anime.rating}</span>` : ''}
          ${anime.status ? `<span>· ${anime.status}</span>` : ''}
        </div>
      </div>
    </a>
  `;
}

// ── Buat HTML ongoing card ────────────────
function createOngoingCard(anime) {
  const slug = encodeURIComponent(anime.slug || '');
  return `
    <a href="anime.html?slug=${slug}" class="ongoing-card">
      <div class="ongoing-thumb">
        <img src="${anime.thumb}" alt="${anime.title}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/60x80/12121f/7c5cfc?text=?'">
      </div>
      <div class="ongoing-info">
        <div class="ongoing-title">${anime.title}</div>
        <div class="ongoing-ep">Episode ${anime.episode || '?'}</div>
        <div class="ongoing-day">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          ${anime.day || 'Setiap Minggu'}
        </div>
      </div>
    </a>
  `;
}

// ── Simpan & ambil dari localStorage ────
function saveToLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

function getFromLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (e) {
    return null;
  }
}

// ── Highlight bottom nav aktif ─────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes(path.replace('.html', ''))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
});
