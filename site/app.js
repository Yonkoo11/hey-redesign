/* HEY Research Lab redesign, Explore controller. Plain ES2020, no build, no libraries. Loaded with defer on explore.html only.
   The API (https://heyresearch.xyz/api/projects, CORS open) accepts: q, limit (caps at 48), offset, sort=activity|newest,
     status=SHIPPING|ACTIVE|QUIET|DORMANT|RESUMED|UNKNOWN, kind=UTILITY|MEME, tab=still-building|under-the-radar|new-builders, has=token,
     narrative=<slug> (ai, ai-agents, agentic-finance, analytics, animal-meme, culture-meme, dex, data, desci, devtools, gaming, infrastructure,
     launchpad, lending, meme, other, payments, perps, rwa, social, stockfi),
     launchpad=clanker|virtuals|pons|pairfund|hoodfun|easya-kickstart|bankr|hoodit|hooddev|flap|poolstrade|ponspad, maxMarketCap=<usd>.
   It ignores: level, researchLevel, deployed, launchpad=robinhood|pair|pools (absent from response.query).
   Accepted but returning no rows: narrative=rwa-yield, robinhood-chain-native. Those two, research level and launchpad=Robinhood are applied
     client-side over the returned page; "Deployed" has no field in the list payload and is not applied at all.
   Every response carries total, nextOffset (absent on the last page) and items[]. Totals drift between calls; the provenance line shows the response's own. */
(function () {
  'use strict';
  const API = 'https://heyresearch.xyz/api/projects';
  const SNAPSHOT = 'data/projects.json';
  const PAGE = 48;
  const STATUS = { SHIPPING: ['●', 'Shipping', 'shipping'], ACTIVE: ['◐', 'Active', 'active'], RESUMED: ['◐', 'Resumed', 'resumed'],
    QUIET: ['○', 'Quiet', 'quiet'], DORMANT: ['—', 'Dormant', 'dormant'], UNKNOWN: ['?', 'Unknown', 'unknown'] };
  const CLIENT_LABEL = { level: 'Research level', narrativeName: 'Narrative', launchpadName: 'Launchpad' };

  /* ---- formatting ---- */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function shortAddr(a) { return typeof a === 'string' && a.length > 10 ? a.slice(0, 6) + '…' + a.slice(-4) : ''; }
  function fmtCap(usd) {
    if (typeof usd !== 'number' || !isFinite(usd) || usd <= 0) return '—';
    if (usd >= 1e6) return '$' + (usd < 1e7 ? (usd / 1e6).toFixed(1) : Math.round(usd / 1e6)) + 'M';
    if (usd >= 1e3) return '$' + (usd < 1e4 ? (usd / 1e3).toFixed(1) : Math.round(usd / 1e3)) + 'K';
    return '$' + Math.round(usd);
  }
  function relTime(iso) {
    const t = Date.parse(iso || ''); if (isNaN(t)) return '—';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 30 * 86400) return Math.floor(s / 86400) + 'd ago';
    if (s < 365 * 86400) return Math.floor(s / (30 * 86400)) + 'mo ago';
    return Math.floor(s / (365 * 86400)) + 'y ago';
  }
  function sentence(s) { s = String(s || '').replace(/_/g, ' ').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
  function cleanLine(s) { return String(s || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); } /* some descriptions are a raw markdown image */

  /* ---- logo: 28px image with an initials fallback; initials directly when there is no URL ---- */
  function initials(name) { return String(name || '?').replace(/[^0-9A-Za-z$]/g, '').slice(0, 2).toUpperCase() || '?'; }
  function renderLogo(p) {
    const cell = el('div', 'cell-logo'); cell.setAttribute('role', 'cell');
    const fallback = el('span', 'ledger__logo ledger__logo--initials', initials(p.name)); fallback.setAttribute('aria-hidden', 'true');
    if (typeof p.logoUrl === 'string' && /^https?:\/\//.test(p.logoUrl)) {
      const img = el('img', 'ledger__logo'); img.alt = ''; img.width = 28; img.height = 28;
      img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = p.logoUrl;
      img.addEventListener('error', function () { img.replaceWith(fallback); });
      cell.appendChild(img);
    } else cell.appendChild(fallback);
    return cell;
  }

  /* ---- one ledger row: the same markup as the static rows in index.html ---- */
  function renderRow(p) {
    const row = el('div', 'ledger-row'); row.setAttribute('role', 'row');
    row.appendChild(renderLogo(p));
    const proj = el('div', 'cell-project'); proj.setAttribute('role', 'cell');
    const name = el('a', 'ledger__name', p.name || p.slug || 'Untitled');
    name.href = p.slug === 'chit' ? 'project.html' : 'https://heyresearch.xyz/project/' + encodeURIComponent(p.slug || '');
    proj.appendChild(name);
    const narrative = p.primaryNarrative && p.primaryNarrative.name;
    proj.appendChild(el('span', 'ledger__meta', (p.symbol ? '$' + p.symbol : '') + (p.symbol && narrative ? ' · ' : '') + (narrative || '')));
    const desc = cleanLine(p.shortDescription);
    if (desc) { const line = el('span', 'ledger__line', truncate(desc, 160)); if (desc.length > 160) line.title = desc; proj.appendChild(line); }
    row.appendChild(proj);
    const src = [];
    src.push('via ' + ((p.launchedVia && p.launchedVia.name) || 'Unknown'));
    const addr = shortAddr(p.token && p.token.contractAddress); if (addr) src.push(addr);
    if (p.officialX && p.officialX.handle) src.push('@' + p.officialX.handle);
    const source = el('div', 'cell-source source-line', src.join(' · ')); source.setAttribute('role', 'cell'); row.appendChild(source);
    const st = STATUS[p.activityStatus] || STATUS.UNKNOWN;
    const statusCell = el('div', 'cell-status'); statusCell.setAttribute('role', 'cell');
    const status = el('span', 'status status--' + st[2]); const glyph = el('span', 'status__glyph', st[0]); glyph.setAttribute('aria-hidden', 'true');
    status.appendChild(glyph); status.appendChild(document.createTextNode(st[1])); statusCell.appendChild(status); row.appendChild(statusCell);
    const ship = el('div', 'cell-ship', relTime(p.lastShippedAt)); ship.setAttribute('role', 'cell'); row.appendChild(ship);
    const capText = fmtCap(p.marketCap && p.marketCap.usd); const cap = el('div', 'cell-cap cell-num', capText); cap.setAttribute('role', 'cell');
    cap.title = capText === '—' ? 'no tracked token' : 'context, never ranks'; if (capText === '—') cap.setAttribute('aria-label', 'no tracked token'); row.appendChild(cap);
    const ev = el('div', 'cell-evidence'); ev.setAttribute('role', 'cell');
    ev.appendChild(el('span', 'link-label', p.researchLevel === 'VERIFIED_BUILDER' ? 'Verified builder' : sentence(p.researchLevel || 'unknown'))); row.appendChild(ev);
    return row;
  }

  /* ---- data: live API with a 6s timeout, snapshot on any failure ---- */
  let snapshotCache = null;
  async function loadSnapshot() {
    if (!snapshotCache) { const r = await fetch(SNAPSHOT); if (!r.ok) throw new Error('snapshot ' + r.status); snapshotCache = await r.json(); }
    return snapshotCache;
  }
  function snapshotFilter(items, params) {
    const q = (params.q || '').toLowerCase();
    return items.filter(function (p) {
      if (q && !((p.name || '') + ' ' + (p.symbol || '') + ' ' + (p.shortDescription || '')).toLowerCase().includes(q)) return false;
      if (params.status && p.activityStatus !== params.status) return false;
      if (params.kind && p.projectKind !== params.kind) return false;
      if (params.has === 'token' && !(p.token && p.token.contractAddress)) return false;
      if (params.tab === 'still-building' && !p.stillBuilding) return false;
      if (params.narrative && !(p.primaryNarrative && p.primaryNarrative.slug === params.narrative)) return false;
      if (params.launchpad && (p.launchedVia && p.launchedVia.name || '').toLowerCase().replace(/[^a-z]/g, '') !== params.launchpad.replace(/[^a-z]/g, '')) return false;
      if (params.maxMarketCap && !(p.marketCap && p.marketCap.usd <= Number(params.maxMarketCap))) return false;
      return true;
    });
  }
  async function fetchProjects(params) {
    const ctl = new AbortController(); const timer = setTimeout(function () { ctl.abort(); }, 6000);
    try {
      const r = await fetch(API + '?' + new URLSearchParams(params).toString(), { signal: ctl.signal, headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('api ' + r.status);
      const d = await r.json(); if (!Array.isArray(d.items)) throw new Error('api shape');
      return { items: d.items, total: d.total, nextOffset: d.nextOffset, query: d.query || {}, source: 'live' };
    } catch (e) {
      const snap = await loadSnapshot();
      const all = snapshotFilter(snap.items || [], params); const off = Number(params.offset) || 0; const lim = Number(params.limit) || PAGE;
      const items = all.slice(off, off + lim);
      return { items: items, total: all.length, nextOffset: off + lim < all.length ? off + lim : undefined, query: params, source: 'snapshot', capturedAt: snap.capturedAt };
    } finally { clearTimeout(timer); }
  }

  /* ---- controller ---- */
  const ledger = document.querySelector('[data-ledger]'); if (!ledger) return;
  const head = ledger.querySelector('.ledger-head');
  const search = document.getElementById('q'); const form = search && search.closest('form');
  const provenance = document.querySelector('[data-provenance]'); const clientNote = document.querySelector('[data-client-note]');
  const more = document.querySelector('[data-more]'); const errorLine = document.querySelector('[data-error]'); const empty = document.querySelector('[data-empty]');
  const chips = Array.from(document.querySelectorAll('.chip[data-group]'));
  const state = { offset: 0, nextOffset: undefined, rows: 0, seq: 0 };

  function press(chip) { chips.forEach(function (c) { if (c.dataset.group === chip.dataset.group) c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); }); }
  function readParams() {
    const api = { limit: PAGE, offset: 0, sort: 'activity' }; const client = {}; const unsupported = [];
    chips.forEach(function (c) {
      if (c.getAttribute('aria-pressed') !== 'true' || !c.dataset.param || c.dataset.value === '') return;
      const kind = c.dataset.param.split(':');
      if (kind[0] === 'client') client[kind[1]] = c.dataset.value;
      else if (kind[0] === 'none') unsupported.push(c.closest('.filter-group').querySelector('.field__label').textContent);
      else api[c.dataset.param] = c.dataset.value;
    });
    const q = search ? search.value.trim() : ''; if (q.length >= 2) api.q = q;
    return { api: api, client: client, unsupported: unsupported };
  }
  function applyClient(items, client) {
    return items.filter(function (p) {
      if (client.level && p.researchLevel !== client.level) return false;
      if (client.narrativeName && !(p.primaryNarrative && p.primaryNarrative.name === client.narrativeName)) return false;
      if (client.launchpadName && !(p.launchedVia && p.launchedVia.name === client.launchpadName)) return false;
      return true;
    });
  }
  /* URL keys: the API's own names where one exists; client-side chips share the group's name, `level` for research level; none:* chips are not written */
  const URL_KEY = { 'client:level': 'level', 'client:narrativeName': 'narrative', 'client:launchpadName': 'launchpad' };
  function urlKey(chip) { const p = chip.dataset.param || ''; return URL_KEY[p] || (p.indexOf(':') === -1 ? p : ''); }
  function syncUrl(api) {
    const u = new URL(location.href); u.searchParams.delete('q'); chips.forEach(function (c) { if (urlKey(c)) u.searchParams.delete(urlKey(c)); });
    if (api.q) u.searchParams.set('q', api.q);
    chips.forEach(function (c) { if (c.getAttribute('aria-pressed') === 'true' && c.dataset.value !== '' && urlKey(c)) u.searchParams.set(urlKey(c), c.dataset.value); });
    history.replaceState(null, '', u.pathname + u.search);
  }
  function clearRows() { Array.from(ledger.children).forEach(function (n) { if (n !== head) n.remove(); }); state.rows = 0; }
  function skeletonRow() {
    const row = el('div', 'ledger-row skeleton-row'); row.setAttribute('aria-hidden', 'true');
    [['cell-logo', 'skeleton skeleton--logo'], ['cell-project', 'skeleton skeleton--line'], ['cell-source', 'skeleton skeleton--line-sm'], ['cell-status', 'skeleton skeleton--label'],
      ['cell-ship', 'skeleton skeleton--label'], ['cell-cap', 'skeleton skeleton--num'], ['cell-evidence', 'skeleton skeleton--label']].forEach(function (c) {
      const cell = el('div', c[0]); cell.appendChild(el('span', c[1])); row.appendChild(cell); });
    return row;
  }
  function showSkeleton(n) { ledger.setAttribute('aria-busy', 'true'); for (let i = 0; i < n; i++) ledger.appendChild(skeletonRow()); }
  function hideSkeleton() { ledger.removeAttribute('aria-busy'); ledger.querySelectorAll('.skeleton-row').forEach(function (r) { r.remove(); }); }
  function setHidden(node, hidden) { if (node) node.hidden = hidden; }

  function describe(res, api, client, unsupported) {
    const n = state.rows; const total = typeof res.total === 'number' ? res.total.toLocaleString('en-US') : '?';
    provenance.textContent = res.source === 'live'
      ? 'Live from heyresearch.xyz/api · showing ' + n + ' of ' + total + ' · sorted by ' + (api.sort === 'newest' ? 'newest' : 'activity')
      : 'Snapshot from ' + String(res.capturedAt || '2026-09-16').slice(0, 10) + ' · ' + n + ' projects · the live API did not answer';
    const notes = Object.keys(client).map(function (k) { return CLIENT_LABEL[k] + ' applied on this page only'; });
    unsupported.forEach(function (label) { notes.push(label + ' is not in the public API and was not applied'); });
    if (res.source === 'snapshot' && api.sort === 'newest') notes.push('Newest is not in the snapshot; activity order kept');
    clientNote.textContent = notes.join(' · '); setHidden(clientNote, notes.length === 0);
  }
  async function load(append) {
    const seq = ++state.seq; const read = readParams(); const api = read.api;
    if (!append) { state.offset = 0; clearRows(); syncUrl(api); }
    api.offset = state.offset;
    setHidden(errorLine, true); setHidden(empty, true); setHidden(more, true); more.disabled = true;
    provenance.textContent = 'Reading heyresearch.xyz/api…'; setHidden(clientNote, true);
    showSkeleton(append ? 3 : 6);
    let res;
    try { res = await fetchProjects(api); }
    catch (e) { res = null; }
    if (seq !== state.seq) return; /* a slower, earlier response never touches rows, provenance, the empty state or the error line */
    hideSkeleton();
    if (!res) { setHidden(errorLine, false); provenance.textContent = 'Could not reach heyresearch.xyz/api.'; return; } /* live and snapshot both failed */
    const items = applyClient(res.items, read.client); items.forEach(function (p) { ledger.appendChild(renderRow(p)); });
    state.rows += items.length; state.nextOffset = res.nextOffset;
    describe(res, api, read.client, read.unsupported);
    setHidden(empty, state.rows !== 0);
    more.disabled = false; setHidden(more, typeof state.nextOffset !== 'number');
  }

  /* ---- events: chips, search (debounced 250ms), clear, retry, load more, URL on load ---- */
  const TWIN = { view: 'status', status: 'view' }; /* the top row and "Activity status" both set status; pressing one resets the other */
  chips.forEach(function (c) { c.addEventListener('click', function () {
    press(c); const twin = TWIN[c.dataset.group];
    if (twin) chips.forEach(function (o) { if (o.dataset.group === twin) o.setAttribute('aria-pressed', o.dataset.value === '' ? 'true' : 'false'); });
    load(false); }); });
  let timer = null;
  if (search) search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { load(false); }, 250); });
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(timer); load(false); });
  if (more) more.addEventListener('click', function () { if (typeof state.nextOffset === 'number') { state.offset = state.nextOffset; load(true); } });
  if (errorLine) errorLine.querySelector('button').addEventListener('click', function () { load(false); });
  function reset() { chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.value === '' ? 'true' : 'false'); }); if (search) search.value = ''; load(false); }
  if (empty) empty.querySelector('button').addEventListener('click', reset);
  (function fromUrl() {
    const u = new URLSearchParams(location.search);
    if (search && u.get('q')) search.value = u.get('q');
    chips.forEach(function (c) { if (c.dataset.value !== '' && urlKey(c) && u.get(urlKey(c)) === c.dataset.value) press(c); });
  })();
  load(false);
})();
