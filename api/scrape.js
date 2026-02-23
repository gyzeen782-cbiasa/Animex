// ===== api/scrape.js — Vercel Serverless Function =====
// File ini adalah "inti" dari backend.
// Semua route /api/* akan memanggil fungsi ini via vercel.json routing.

const https = require('https');
const http = require('http');

const BASE_URL = 'https://otakudesu.best';

// ── Helper: Fetch HTML ───────────────────
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer': BASE_URL,
      }
    };

    lib.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── Helper: Extract between tags ─────────
function extractBetween(html, start, end) {
  const s = html.indexOf(start);
  if (s === -1) return null;
  const e = html.indexOf(end, s + start.length);
  if (e === -1) return null;
  return html.substring(s + start.length, e).trim();
}

// ── Helper: Extract all matches ──────────
function extractAll(html, regex) {
  const results = [];
  let match;
  const re = new RegExp(regex.source, 'gi');
  while ((match = re.exec(html)) !== null) {
    results.push(match);
  }
  return results;
}

// ── Helper: Strip HTML tags ──────────────
function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#[0-9]+;/g, '').replace(/\s+/g, ' ').trim();
}

// ── Helper: Extract slug from URL ────────
function urlToSlug(url) {
  return url.replace(BASE_URL, '').replace(/^\/anime\//, '').replace(/\/$/, '');
}

// ═══════════════════════════════════════════
// SCRAPERS
// ═══════════════════════════════════════════

// ── Scrape Ongoing Anime ─────────────────
async function scrapeOngoing() {
  const html = await fetchHTML(`${BASE_URL}/ongoing-anime/`);

  const animes = [];
  // Cari tiap card di ongoing
  const cardRegex = /<div class=".*?"><a href="(https?:\/\/[^"]+)"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)".*?<\/a>/gi;

  // Cara alternatif: cari semua link anime + gambar
  const matches = extractAll(html, /<a href="(https:\/\/otakudesu\.best\/anime\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<\/a>/i);

  // Fallback: parse lebih manual
  const blocks = html.split('<div class="');
  blocks.forEach(block => {
    const linkMatch = block.match(/href="(https:\/\/otakudesu\.best\/anime\/[^"]+)"/);
    const imgMatch = block.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    const titleMatch = block.match(/<h2[^>]*>([^<]+)<\/h2>/) || block.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i);
    const epMatch = block.match(/Episode\s*(\d+)/i);
    const ratingMatch = block.match(/(\d+\.\d+)/);

    if (linkMatch && imgMatch) {
      const url = linkMatch[1];
      const slug = urlToSlug(url);
      const title = titleMatch ? stripTags(titleMatch[1]) : slug.replace(/-sub-indo$/, '').replace(/-/g, ' ');

      if (slug && !animes.find(a => a.slug === slug)) {
        animes.push({
          title,
          slug,
          url,
          thumb: imgMatch[1],
          episode: epMatch ? epMatch[1] : null,
          rating: ratingMatch ? ratingMatch[1] : null,
          status: 'Ongoing',
          type: 'TV'
        });
      }
    }
  });

  return animes.slice(0, 24);
}

// ── Scrape Complete Anime ────────────────
async function scrapeComplete() {
  const html = await fetchHTML(`${BASE_URL}/complete-anime/`);
  const animes = [];

  const blocks = html.split('<div class="');
  blocks.forEach(block => {
    const linkMatch = block.match(/href="(https:\/\/otakudesu\.best\/anime\/[^"]+)"/);
    const imgMatch = block.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    const titleMatch = block.match(/<h2[^>]*>([^<]+)<\/h2>/);
    const epMatch = block.match(/(\d+)\s*Episode/i);
    const ratingMatch = block.match(/(\d+\.\d+)/);

    if (linkMatch && imgMatch) {
      const url = linkMatch[1];
      const slug = urlToSlug(url);
      const title = titleMatch ? stripTags(titleMatch[1]) : slug.replace(/-sub-indo$/, '').replace(/-/g, ' ');

      if (slug && !animes.find(a => a.slug === slug)) {
        animes.push({
          title,
          slug,
          url,
          thumb: imgMatch[1],
          episode: epMatch ? epMatch[1] : null,
          rating: ratingMatch ? ratingMatch[1] : null,
          status: 'Complete',
          type: 'TV'
        });
      }
    }
  });

  return animes.slice(0, 24);
}

// ── Scrape Anime Detail ──────────────────
async function scrapeAnimeDetail(slug) {
  const url = `${BASE_URL}/anime/${slug}/`;
  const html = await fetchHTML(url);

  // Title
  const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i)
    || html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const title = titleMatch ? stripTags(titleMatch[1]) : slug.replace(/-/g, ' ');

  // Thumb
  const thumbMatch = html.match(/property="og:image"\s+content="([^"]+)"/)
    || html.match(/<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i);
  const thumb = thumbMatch ? thumbMatch[1] : '';

  // Synopsis
  const synopsisMatch = html.match(/<div[^>]*class="[^"]*synopsiseries[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const synopsis = synopsisMatch ? stripTags(synopsisMatch[1]) : '';

  // Rating
  const ratingMatch = html.match(/(\d+\.\d+)\s*<\/span>/);
  const rating = ratingMatch ? ratingMatch[1] : null;

  // Info blocks
  const statusMatch = html.match(/Status.*?<\/b>\s*([^<]+)/i);
  const episodeMatch = html.match(/Jumlah Episode.*?(\d+)/i) || html.match(/(\d+)\s*Episode/i);
  const typeMatch = html.match(/Tipe.*?<\/b>\s*([^<]+)/i) || html.match(/Type.*?<\/b>\s*([^<]+)/i);
  const studioMatch = html.match(/Studio.*?<\/b>\s*<a[^>]*>([^<]+)<\/a>/i);
  const yearMatch = html.match(/(\d{4})/);

  // Genres
  const genreMatches = extractAll(html, /<a[^>]+href="[^"]*genre[^"]*"[^>]*>([^<]+)<\/a>/i);
  const genres = genreMatches.map(m => m[1].trim()).filter(Boolean);

  // Episodes
  const episodes = [];
  const epBlocks = html.split('class="episodelist"');

  if (epBlocks.length > 1) {
    const epListHtml = epBlocks[1];
    const epMatches = extractAll(epListHtml, /<a href="(https:\/\/otakudesu\.best\/episode\/[^"]+)"[^>]*>([^<]+)<\/a>/i);

    epMatches.forEach((match, i) => {
      const epUrl = match[1];
      const epTitle = match[2].trim();
      const epSlug = epUrl.replace(BASE_URL, '').replace(/^\/episode\//, '').replace(/\/$/, '');
      const epNumMatch = epTitle.match(/(\d+)/);

      episodes.push({
        title: epTitle,
        slug: epSlug,
        url: epUrl,
        episode: epNumMatch ? epNumMatch[1] : String(i + 1),
      });
    });

    // Balik urutan (biasanya terbalik di HTML)
    episodes.reverse();
  }

  return {
    title,
    thumb,
    synopsis,
    rating,
    status: statusMatch ? stripTags(statusMatch[1]) : 'Unknown',
    type: typeMatch ? stripTags(typeMatch[1]) : 'TV',
    episode: episodeMatch ? episodeMatch[1] : episodes.length || '?',
    studio: studioMatch ? studioMatch[1].trim() : null,
    year: yearMatch ? yearMatch[1] : null,
    genres,
    episodes,
    slug,
  };
}

// ── Scrape Episode (streaming links) ─────
async function scrapeEpisode(epSlug) {
  const url = `${BASE_URL}/episode/${epSlug}/`;
  const html = await fetchHTML(url);

  const servers = [];

  // Cari iframe embed
  const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"[^>]*>/gi);
  if (iframeMatch) {
    iframeMatch.forEach((iframe, i) => {
      const srcMatch = iframe.match(/src="([^"]+)"/);
      if (srcMatch) {
        servers.push({
          name: `Server ${i + 1}`,
          url: srcMatch[1],
        });
      }
    });
  }

  // Cari link streaming alternatif
  const streamMatches = extractAll(html, /data-src="(https?:\/\/[^"]+)"/i);
  streamMatches.forEach((m, i) => {
    if (!servers.find(s => s.url === m[1])) {
      servers.push({ name: `Mirror ${i + 1}`, url: m[1] });
    }
  });

  return { servers };
}

// ── Scrape Search ────────────────────────
async function scrapeSearch(query) {
  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const html = await fetchHTML(url);
  const results = [];

  const blocks = html.split('<div class="');
  blocks.forEach(block => {
    const linkMatch = block.match(/href="(https:\/\/otakudesu\.best\/anime\/[^"]+)"/);
    const imgMatch = block.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    const titleMatch = block.match(/<h2[^>]*>([^<]+)<\/h2>/) || block.match(/<span[^>]*>([^<]+)<\/span>/);

    if (linkMatch && titleMatch) {
      const url = linkMatch[1];
      const slug = urlToSlug(url);
      const title = stripTags(titleMatch[1]);

      if (slug && title && !results.find(r => r.slug === slug)) {
        results.push({
          title,
          slug,
          url,
          thumb: imgMatch ? imgMatch[1] : '',
          status: 'Unknown',
        });
      }
    }
  });

  return results.slice(0, 10);
}

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url || '';
  const params = new URLSearchParams(url.split('?')[1] || '');

  try {
    // GET /api/ongoing
    if (url.startsWith('/api/ongoing')) {
      const animes = await scrapeOngoing();
      return res.status(200).json({ animes });
    }

    // GET /api/complete
    if (url.startsWith('/api/complete')) {
      const animes = await scrapeComplete();
      return res.status(200).json({ animes });
    }

    // GET /api/anime?slug=...
    if (url.startsWith('/api/anime')) {
      const slug = params.get('slug');
      if (!slug) return res.status(400).json({ error: 'slug diperlukan' });
      const data = await scrapeAnimeDetail(slug);
      return res.status(200).json(data);
    }

    // GET /api/episode?slug=...&ep=...
    if (url.startsWith('/api/episode')) {
      const slug = params.get('slug');
      if (!slug) return res.status(400).json({ error: 'slug diperlukan' });
      const data = await scrapeEpisode(slug);
      return res.status(200).json(data);
    }

    // GET /api/search?q=...
    if (url.startsWith('/api/search')) {
      const q = params.get('q');
      if (!q) return res.status(400).json({ error: 'query diperlukan' });
      const results = await scrapeSearch(q);
      return res.status(200).json({ results });
    }

    return res.status(404).json({ error: 'Endpoint tidak ditemukan' });

  } catch (err) {
    console.error('Scraper error:', err.message);
    return res.status(500).json({ error: 'Scraping gagal: ' + err.message });
  }
};
