// ===== api/scrape.js — Gynimex Backend =====
const https = require('https');
const http = require('http');
const BASE_URL = 'https://otakudesu.best';

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHTML(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

let parse;
try { parse = require('node-html-parser').parse; }
catch(e) { parse = () => ({ querySelector:()=>null, querySelectorAll:()=>[] }); }

const txt = el => el ? el.text.trim() : '';
const attr = (el, at) => el ? (el.getAttribute(at)||'') : '';
const getSrc = el => el ? (el.getAttribute('src')||el.getAttribute('data-src')||'') : '';
const getHref = el => el ? (el.getAttribute('href')||'') : '';
const toSlug = url => url.replace(BASE_URL,'').replace(/^\/(anime|episode)\//,'').replace(/\/$/,'');

// ── Ongoing ──────────────────────────────
async function scrapeOngoing(page) {
  const url = page > 1
    ? `${BASE_URL}/ongoing-anime/page/${page}/`
    : `${BASE_URL}/ongoing-anime/`;
  const doc = parse(await fetchHTML(url));
  const animes = [];
  doc.querySelectorAll('.venz ul li').forEach(li => {
    const link = li.querySelector('a');
    const img = li.querySelector('img');
    const title = txt(li.querySelector('.jdlflm') || li.querySelector('h2') || link);
    const ep = txt(li.querySelector('.epz') || li.querySelector('.episode')).replace(/\D/g,'');
    const rating = txt(li.querySelector('.epztipe') || li.querySelector('.rattingflm')).replace(/[^0-9.]/g,'');
    const day = txt(li.querySelector('.epzdesc') || li.querySelector('.epsdate'));
    const animeUrl = getHref(link);
    if (!animeUrl.includes('/anime/')) return;
    const sl = toSlug(animeUrl);
    if (!sl || animes.find(x => x.slug === sl)) return;
    animes.push({ title, slug:sl, url:animeUrl, thumb:getSrc(img), episode:ep||null, rating:rating||null, day:day||null, status:'Ongoing', type:'TV' });
  });
  return animes;
}

// ── Complete ─────────────────────────────
async function scrapeComplete(page) {
  const url = page > 1
    ? `${BASE_URL}/complete-anime/page/${page}/`
    : `${BASE_URL}/complete-anime/`;
  const doc = parse(await fetchHTML(url));
  const animes = [];
  doc.querySelectorAll('.venz ul li').forEach(li => {
    const link = li.querySelector('a');
    const img = li.querySelector('img');
    const title = txt(li.querySelector('.jdlflm') || li.querySelector('h2') || link);
    const ep = txt(li.querySelector('.epz') || li.querySelector('.episode')).replace(/\D/g,'');
    const rating = txt(li.querySelector('.epztipe') || li.querySelector('.rattingflm')).replace(/[^0-9.]/g,'');
    const animeUrl = getHref(link);
    if (!animeUrl.includes('/anime/')) return;
    const sl = toSlug(animeUrl);
    if (!sl || animes.find(x => x.slug === sl)) return;
    animes.push({ title, slug:sl, url:animeUrl, thumb:getSrc(img), episode:ep||null, rating:rating||null, status:'Complete', type:'TV' });
  });
  return animes;
}

// ── Jadwal ───────────────────────────────
async function scrapeSchedule() {
  const doc = parse(await fetchHTML(`${BASE_URL}/jadwal-rilis/`));
  const schedules = [];
  doc.querySelectorAll('.kglist321').forEach(block => {
    const day = txt(block.querySelector('h2'));
    const animeList = block.querySelectorAll('ul li a').map(a2 => ({
      title: txt(a2), slug: toSlug(getHref(a2)), url: getHref(a2)
    }));
    if (day) schedules.push({ day, animeList });
  });
  return schedules;
}

// ── Search ───────────────────────────────
async function scrapeSearch(query) {
  const doc = parse(await fetchHTML(`${BASE_URL}/?s=${encodeURIComponent(query)}`));
  const results = [];
  doc.querySelectorAll('ul.chivsrc li').forEach(li => {
    const link = li.querySelector('a');
    const img = li.querySelector('img');
    const title = txt(li.querySelector('h2')) || txt(link);
    const animeUrl = getHref(link);
    if (!animeUrl) return;
    results.push({ title, slug:toSlug(animeUrl), url:animeUrl, thumb:getSrc(img) });
  });
  return results;
}

// ── Anime Detail ─────────────────────────
async function scrapeAnimeDetail(sl) {
  const doc = parse(await fetchHTML(`${BASE_URL}/anime/${sl}/`));
  const title = txt(doc.querySelector('h1.entry-title')) || txt(doc.querySelector('h1'));
  const thumb = getSrc(doc.querySelector('.fotoanime img')) || attr(doc.querySelector('meta[property="og:image"]'),'content');
  const synParas = doc.querySelectorAll('.sinopc p');
  const synopsis = synParas.map(p => txt(p)).filter(Boolean).join(' ') || txt(doc.querySelector('.sinopc'));
  const infoBolds = doc.querySelectorAll('.infozingle b');
  const getInfo = idx => {
    const b = infoBolds[idx];
    return b ? b.parentNode.text.replace(b.text,'').replace(':','').trim() : null;
  };
  const genreEls = doc.querySelector('.infozingle')?.lastElementChild?.querySelectorAll('a') || [];
  const genres = genreEls.map(x => txt(x)).filter(Boolean);
  const episodes = [];
  for (const block of doc.querySelectorAll('.smokelister')) {
    const bt = block.text.toLowerCase();
    if (bt.includes('episode') && !bt.includes('batch')) {
      const epLinks = block.nextElementSibling?.querySelectorAll('li a') || [];
      epLinks.forEach((link, i) => {
        const epUrl = getHref(link);
        const epTitle = txt(link);
        const num = epTitle.match(/(\d+)/);
        episodes.push({ title:epTitle, slug:toSlug(epUrl), url:epUrl, episode:num?num[1]:String(i+1) });
      });
      if (episodes.length > 0) break;
    }
  }
  episodes.reverse();
  return {
    title, thumb, synopsis,
    rating: getInfo(2), status: getInfo(5), type: getInfo(4),
    episode: getInfo(6) || episodes.length || '?',
    duration: getInfo(7), aired: getInfo(8), studio: getInfo(9),
    genres, episodes, slug: sl
  };
}

// ── Episode / Streaming ──────────────────
async function scrapeEpisode(epSlug) {
  const url = `${BASE_URL}/episode/${epSlug}/`;
  const doc = parse(await fetchHTML(url));
  const servers = [];
  const defaultIframe = doc.querySelector('.player-embed iframe') || doc.querySelector('iframe');
  if (defaultIframe) { const iSrc = getSrc(defaultIframe); if(iSrc) servers.push({ name:'Default', url:iSrc }); }
  doc.querySelectorAll('.mirrorstream > ul').forEach(ul => {
    const quality = txt(ul.previousElementSibling) || 'HD';
    ul.querySelectorAll('li a[data-content]').forEach(link => {
      servers.push({ name:`${quality} - ${txt(link)}`, serverId:attr(link,'data-content'), referer:url, needsNonce:true });
    });
  });
  const navEls = doc.querySelectorAll('.flir a');
  let prevEp = null, nextEp = null;
  navEls.forEach(link => {
    const t2 = txt(link).toLowerCase();
    if (t2.includes('prev') || t2.includes('sebelum')) prevEp = { slug:toSlug(getHref(link)), url:getHref(link) };
    else if (t2.includes('next') || t2.includes('selanjut')) nextEp = { slug:toSlug(getHref(link)), url:getHref(link) };
  });
  return { servers, prevEp, nextEp };
}

function fetchPost(postUrl, body, referer) {
  return new Promise((resolve, reject) => {
    const u = new URL(postUrl);
    const req = https.request({
      hostname:u.hostname, path:u.pathname, method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8', 'Content-Length':Buffer.byteLength(body), 'Referer':referer, 'Origin':BASE_URL, 'User-Agent':'Mozilla/5.0', 'X-Requested-With':'XMLHttpRequest' }
    }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); });
    req.on('error',reject); req.write(body); req.end();
  });
}

async function getServerUrl(serverId, referer) {
  try {
    const decoded = JSON.parse(Buffer.from(serverId,'base64').toString());
    const nonceBody = new URLSearchParams({ action: decoded.action2||'' });
    const nonce = JSON.parse(await fetchPost(`${BASE_URL}/wp-admin/admin-ajax.php`, nonceBody.toString(), referer));
    const serverBody = new URLSearchParams({ ...decoded, nonce:nonce.data||'' });
    const serverData = JSON.parse(await fetchPost(`${BASE_URL}/wp-admin/admin-ajax.php`, serverBody.toString(), referer));
    const iframeHtml = Buffer.from(serverData.data||'','base64').toString();
    const m = iframeHtml.match(/src="([^"]+)"/);
    return m ? m[1] : null;
  } catch(e) { return null; }
}

// ── Main Handler ─────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Content-Type','application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const url = req.url || '';
  const params = new URLSearchParams(url.split('?')[1] || '');
  try {
    if (url.startsWith('/api/ongoing')) return res.status(200).json({ animes: await scrapeOngoing(parseInt(params.get('page'))||1) });
    if (url.startsWith('/api/complete')) return res.status(200).json({ animes: await scrapeComplete(parseInt(params.get('page'))||1) });
    if (url.startsWith('/api/schedule')) return res.status(200).json({ schedules: await scrapeSchedule() });
    if (url.startsWith('/api/search')) {
      const q = params.get('q');
      if (!q) return res.status(400).json({ error:'query diperlukan' });
      return res.status(200).json({ results: await scrapeSearch(q) });
    }
    if (url.startsWith('/api/anime')) {
      const sl = params.get('slug');
      if (!sl) return res.status(400).json({ error:'slug diperlukan' });
      return res.status(200).json(await scrapeAnimeDetail(sl));
    }
    if (url.startsWith('/api/episode')) {
      const sl = params.get('slug');
      if (!sl) return res.status(400).json({ error:'slug diperlukan' });
      return res.status(200).json(await scrapeEpisode(sl));
    }
    if (url.startsWith('/api/server')) {
      const id = params.get('id'), ref = params.get('ref');
      if (!id) return res.status(400).json({ error:'id diperlukan' });
      return res.status(200).json({ url: await getServerUrl(id, ref||BASE_URL) });
    }
    return res.status(404).json({ error:'Endpoint tidak ditemukan' });
  } catch(err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
