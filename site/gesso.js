/* Gesso — shared data, chip math, generative stand-in art, and site chrome. */
(function () {
  'use strict';
  const G = (window.G = {});

  /* ================= storage (per-viewer conveniences; page works without it) ================= */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('gesso:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('gesso:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('gesso:' + k); } catch (e) {} }
  };
  G.store = store;

  /* ================= chip economics =================
     price per chip = $1 × √(1 + collectors ÷ 10)
     buyers earn 10% of what they spend, in that artist's chips, at today's price
     the first 25 collectors of every artist earn double
     chips can cover up to half of any piece on Gesso */
  G.EARN = 0.10;
  G.FOUNDING = 25;
  G.SPEND_CAP = 0.5;
  G.SPLIT = { artist: 0.80, reserve: 0.12, gesso: 0.08 };
  G.price = (n) => Math.sqrt(1 + n / 10);
  G.isFounding = (n) => n < G.FOUNDING;
  G.chipsFor = (usd, n) => (usd * G.EARN / G.price(n)) * (G.isFounding(n) ? 2 : 1);

  /* ================= artists =================
     HAMEL is the real founding artist; everyone else is a sample creator for the preview. */
  const ARTISTS = [
    {
      slug: 'hamel', name: 'HAMEL', ticker: 'HAMEL', color: '#E3156B', on: '#FFFFFF', style: 'hamel',
      handle: '@justintime7189', ig: 'https://www.instagram.com/justintime7189/', city: '',
      collectors: 312, joined: 'Founding artist since 2026', sold: 41, real: true,
      quote: 'KEEP GOING.',
      short: 'Loud color, thick black line, and eyes in everything.',
      bio: 'HAMEL paints the way a city sounds: packed, overlapping, and wide awake. Black contour holds neon fields together, faces hide in the patterns, and every surface (canvas, panel, brick) gets the same treatment. HAMEL was the first artist on Gesso and the reason it exists.'
    },
    {
      slug: 'odalys', name: 'Odalys Fuente', ticker: 'ODLY', color: '#2A2930', on: '#F4F4F0', style: 'mono',
      city: 'Oaxaca, MX', collectors: 128, joined: 'Joined March 2026', sold: 17,
      quote: 'One line, until it runs out.',
      short: 'Ink contour drawings, one unbroken line at a time.',
      bio: 'Odalys draws in sumi ink and acrylic, building rippling contour fields from a single continuous line. The pieces read like topographic maps of breathing.'
    },
    {
      slug: 'teo', name: 'Teo Marchetti', ticker: 'TEO', color: '#D4931C', on: '#1D1608', style: 'field',
      city: 'Turin, IT', collectors: 76, joined: 'Joined April 2026', sold: 9,
      quote: 'Color is a room you can stand in.',
      short: 'Soft-edged color fields in oil and cold wax.',
      bio: 'Teo layers oil and cold wax into hovering fields of color. Each painting takes months and carries the light of the studio on Via Nizza where it was made.'
    },
    {
      slug: 'ama', name: 'Ama Korsah', ticker: 'AMA', color: '#2140E3', on: '#FFFFFF', style: 'bauhaus',
      city: 'Accra, GH', collectors: 210, joined: 'Joined February 2026', sold: 33,
      quote: 'Pattern is memory you can count.',
      short: 'Geometric painting drawn from kente and market signage.',
      bio: 'Ama builds hard-edged geometric paintings from the grids of kente cloth and hand-painted market signs. Every color in a piece is mixed to match something she saw that week.'
    },
    {
      slug: 'june', name: 'June Watanabe', ticker: 'JUNE', color: '#FF4FA0', on: '#24061A', style: 'riso',
      city: 'Osaka, JP', collectors: 95, joined: 'Joined May 2026', sold: 58,
      quote: 'Misregistration is the good part.',
      short: 'Risograph prints in fluorescent pink and teal.',
      bio: 'June runs a two-drum risograph out of a former noodle shop. Small editions, loud inks, and botanical shapes that never quite line up, on purpose.'
    },
    {
      slug: 'ruben', name: 'Ruben Castillo', ticker: 'RUBN', color: '#16865A', on: '#FFFFFF', style: 'topo',
      city: 'Albuquerque, NM', collectors: 40, joined: 'Joined July 2026', sold: 6,
      quote: 'The desert is drawn in contour.',
      short: 'Contour paintings of the high desert.',
      bio: 'Ruben paints survey-map contours of arroyos and mesas from field sketches he makes on foot. He grinds some of his own pigments from the places he paints.'
    },
    {
      slug: 'mika', name: 'Mika Laine', ticker: 'MIKA', color: '#F2621E', on: '#200A00', style: 'photo',
      city: 'Helsinki, FI', collectors: 23, joined: 'Joined September 2026', sold: 4,
      quote: 'In June the sun just leans.',
      short: 'Photographs of the midnight sun over the Baltic.',
      bio: 'Mika photographs the Baltic coast between midnight and 3am in summer, when the sun never fully sets. Archival pigment prints in small, numbered editions.'
    }
  ];

  /* ================= works =================
     [id, title, year, medium, wIn, hIn, price, kind, extra] */
  const W = (artist, rows) => rows.map(([n, title, year, medium, w, h, price, edition, opt]) =>
    Object.assign({ id: artist + '-' + n, artist, title, year, medium, w, h, price, edition: edition || 'Original', sold: false }, opt || {}));
  const WORKS = [].concat(
    W('hamel', [
      ['01', "Everybody's Watching", 2026, 'Acrylic and spray paint on canvas', 36, 48, 1850],
      ['02', 'Loud Weather', 2026, 'Acrylic and paint marker on canvas', 24, 30, 960],
      ['03', 'Third Eye Traffic', 2025, 'Acrylic on panel', 18, 24, 620],
      ['04', 'Gray Matter', 2026, 'Acrylic and ink on canvas', 30, 40, 1400, null, { variant: 'gray' }],
      ['05', 'All the Little Faces', 2025, 'Spray paint and acrylic on canvas', 48, 60, 3200, null, { sold: true, by: 128 }],
      ['06', 'Keep Going', 2026, 'Giclée on cotton rag', 18, 24, 140, 'Edition of 40'],
      ['07', 'Sunday Congee', 2026, 'Acrylic on paper', 14, 11, 280],
      ['08', 'Neighborhood Static', 2026, 'Acrylic on canvas, mural study', 20, 20, 540]
    ]),
    W('odalys', [
      ['01', 'Contour for a Sleeping River', 2026, 'Sumi ink and acrylic on canvas', 24, 36, 1100],
      ['02', 'Ink Weather II', 2026, 'Sumi ink on paper', 16, 20, 480],
      ['03', 'The Long Listening', 2025, 'Sumi ink and acrylic on linen', 30, 30, 1350, null, { sold: true, by: 74 }],
      ['04', 'Map of a Breath', 2026, 'Risograph on Munken', 12, 16, 90, 'Edition of 30']
    ]),
    W('teo', [
      ['01', 'Ochre Hour', 2026, 'Oil and cold wax on canvas', 40, 50, 2400],
      ['02', 'Two Rooms, One Light', 2026, 'Oil and cold wax on canvas', 30, 40, 1750],
      ['03', 'Low Sun Study', 2026, 'Oil on panel', 16, 12, 380],
      ['04', 'Brick and Breath', 2025, 'Oil and cold wax on linen', 36, 36, 1900, null, { sold: true, by: 51 }]
    ]),
    W('ama', [
      ['01', 'Kente Arithmetic', 2026, 'Acrylic on canvas', 30, 30, 1200],
      ['02', 'Market Day Grid', 2026, 'Acrylic on panel', 24, 32, 880],
      ['03', 'Indigo Sum', 2026, 'Acrylic and indigo on canvas', 20, 20, 560],
      ['04', 'Small Geometry No. 9', 2026, 'Screenprint on Somerset', 12, 12, 75, 'Edition of 50']
    ]),
    W('june', [
      ['01', 'Night Garden, Pink Plate', 2026, 'Two-color risograph', 11, 17, 65, 'Edition of 60'],
      ['02', 'Two Persimmons', 2026, 'Two-color risograph', 14, 11, 55, 'Edition of 40'],
      ['03', 'Ferry Morning', 2026, 'Three-color risograph', 17, 22, 110, 'Edition of 30'],
      ['04', 'Ghost Fern', 2025, 'Two-color risograph', 11, 17, 65, 'Edition of 60', { sold: true, by: 88 }]
    ]),
    W('ruben', [
      ['01', 'Sandia Contours', 2026, 'Acrylic and earth pigment on canvas', 24, 30, 780],
      ['02', 'Arroyo Memory', 2026, 'Acrylic on panel', 18, 24, 520],
      ['03', 'High Desert Survey', 2026, 'Acrylic and earth pigment on canvas', 48, 36, 1650],
      ['04', 'Dry Wash', 2026, 'Acrylic on panel', 12, 12, 240]
    ]),
    W('mika', [
      ['01', 'Midsummer, 01:12', 2026, 'Archival pigment print', 30, 20, 420, 'Edition of 15'],
      ['02', 'Kaivopuisto Blue', 2026, 'Archival pigment print', 24, 16, 340, 'Edition of 15'],
      ['03', 'The Sun Never Quite Left', 2026, 'Archival pigment print', 36, 24, 680, 'Edition of 10'],
      ['04', 'Baltic, Late', 2026, 'Archival pigment print', 18, 12, 180, 'Edition of 25']
    ])
  );

  G.artists = ARTISTS;
  G.works = WORKS;
  G.artist = (slug) => ARTISTS.find((a) => a.slug === slug);
  G.work = (id) => WORKS.find((w) => w.id === id);
  G.worksBy = (slug) => WORKS.filter((w) => w.artist === slug);

  /* ================= live state (sample wallet, purchases made in this preview) ================= */
  const SAMPLE_WALLET = {
    sample: true,
    chips: { hamel: 9.12, june: 14.6, ruben: 4.8 },
    basis: { hamel: 43.15, june: 37.9, ruben: 7.1 },
    owned: ['hamel-06', 'june-01', 'june-04'],
    collectorNo: { hamel: 214, june: 61, ruben: 12 },
    log: [
      { t: '2026-09-28', text: 'Collected Night Garden, Pink Plate', chips: 5.2, a: 'june' },
      { t: '2026-08-14', text: 'Collected a HAMEL print (Keep Going, 12/40)', chips: 9.12, a: 'hamel' },
      { t: '2026-07-30', text: 'Founding collector #12 of Ruben Castillo', chips: 4.8, a: 'ruben' },
      { t: '2026-06-02', text: 'Collected Ghost Fern, 31/60', chips: 9.4, a: 'june' }
    ]
  };
  G.wallet = () => store.get('wallet', null) || JSON.parse(JSON.stringify(SAMPLE_WALLET));
  G.saveWallet = (w) => store.set('wallet', w);
  G.resetPreview = () => { ['wallet', 'delta', 'sold', 'bag', 'follows'].forEach(store.del); };

  G.collectors = (slug) => (G.artist(slug).collectors + ((store.get('delta', {}) || {})[slug] || 0));
  G.addCollector = (slug) => { const d = store.get('delta', {}) || {}; d[slug] = (d[slug] || 0) + 1; store.set('delta', d); };
  G.priceOf = (slug) => G.price(G.collectors(slug));
  G.isSold = (w) => w.sold || (store.get('sold', []) || []).includes(w.id);
  G.markSold = (id) => { const s = store.get('sold', []) || []; if (!s.includes(id)) s.push(id); store.set('sold', s); };
  G.walletValue = (w) => Object.entries((w || G.wallet()).chips).reduce((s, [k, v]) => s + v * G.priceOf(k), 0);

  G.bag = () => (store.get('bag', []) || []).filter((id) => G.work(id));
  G.setBag = (b) => { store.set('bag', b); G.refreshBadges(); };
  G.addToBag = (id) => {
    const b = G.bag();
    if (!b.includes(id)) b.push(id);
    G.setBag(b);
    const w = G.work(id);
    G.toast(`<span>Added <b>${esc(w.title)}</b> to your bag</span><a href="checkout.html">Check out</a>`);
  };

  /* collector-count history for charts: 120 daily points ending today, monotonic */
  G.history = (slug, days = 120) => {
    const a = G.artist(slug), r = rng(hash('hist' + slug)), now = G.collectors(slug);
    const start = Math.max(0, Math.round(a.collectors * (0.32 + r() * 0.2)));
    const pts = []; let acc = 0; const steps = [];
    for (let i = 0; i < days; i++) { const s = Math.pow(r(), 2.2) * (1 + Math.sin(i / 9 + r()) * 0.6); steps.push(s); acc += s; }
    let n = start; const span = a.collectors - start;
    for (let i = 0; i < days; i++) { n += (steps[i] / acc) * span; pts.push(Math.round(n)); }
    pts[pts.length - 1] = now;
    return pts;
  };
  G.change = (slug, back = 30) => { const h = G.history(slug); const a = G.price(h[h.length - 1 - back]), b = G.price(h[h.length - 1]); return (b - a) / a; };

  /* ================= formatting ================= */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  G.esc = esc;
  G.usd = (x, cents) => {
    const c = cents === undefined ? Math.round(x) !== x || x < 100 : cents;
    return '$' + x.toLocaleString('en-US', { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 });
  };
  G.chips = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  G.pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1) + '%';
  G.dims = (w) => `${w.w} × ${w.h} in · ${(w.w * 2.54).toFixed(1)} × ${(w.h * 2.54).toFixed(1)} cm`;
  G.ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  /* sparkline as an SVG string, scaled to its own min/max, endpoint emphasized */
  G.spark = (vals, { w = 160, h = 34, stroke = 'currentColor', fill = true } = {}) => {
    const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1, pad = 3;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (w - pad * 2) + pad, h - pad - ((v - min) / span) * (h - pad * 2)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    const id = 'sg' + Math.random().toString(36).slice(2, 8);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      ${fill ? `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${stroke}" stop-opacity=".22"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs>
      <path d="${d} L ${last[0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z" fill="url(#${id})"/>` : ''}
      <path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${stroke}"/></svg>`;
  };

  /* paint-chip card markup */
  G.chipCard = (slug, opts = {}) => {
    const a = G.artist(slug), n = G.collectors(slug), p = G.price(n), ch = G.change(slug);
    const hist = G.history(slug).slice(-60).map(G.price);
    const seats = Math.max(0, G.FOUNDING - n);
    const tag = opts.tag || 'a';
    return `<${tag} class="chip" ${tag === 'a' ? `href="artist.html#${slug}"` : ''} style="--c:${a.color};--on:${a.on}" data-chip="${slug}">
      <div class="swatch"><span class="notch"></span>
        <div class="tick">$${a.ticker}</div>
        <div class="row"><span>${esc(a.name)}</span><span>${seats ? seats + ' founding left' : 'No. ' + String(ARTISTS.indexOf(a) + 1).padStart(3, '0')}</span></div>
      </div>
      <div class="strip">
        <div class="px"><span class="usd" data-px>${G.usd(p, true)}</span><span class="chg ${ch >= 0 ? 'up' : 'down'}">${G.pct(ch)} 30d</span></div>
        <div style="color:var(--up)">${G.spark(hist)}</div>
        <div class="meta"><span data-n>${n.toLocaleString()} collectors</span><span>per chip</span></div>
      </div></${tag}>`;
  };

  /* artwork card with a wall label */
  G.workCard = (w, opts = {}) => {
    const a = G.artist(w.artist), sold = G.isSold(w), n = G.collectors(w.artist);
    const earn = G.chipsFor(w.price, n);
    return `<a class="work" href="piece.html#${w.id}">
      <div class="frame">${G.artImg(w, opts.size || 520, 'art hung')}
        ${sold ? '<span class="red-dot" title="Collected"></span>' : `<button class="quick-add" type="button" data-add="${w.id}">+ Add to bag</button>`}
      </div>
      <div class="walllabel">
        <span class="who"><i class="dot" style="--c:${a.color}"></i>${esc(a.name)}</span>
        <span class="title"><b>${esc(w.title)}</b>, ${w.year}</span>
        <span class="meta">${esc(w.medium)} · ${w.w} × ${w.h} in${w.edition !== 'Original' ? ' · ' + esc(w.edition) : ''}</span>
        <span class="price">${sold ? '<span class="sold-tag">Collected</span>' : `<span class="usd">${G.usd(w.price)}</span>`}
          <span class="earn">${sold ? `by collector #${w.by || n}` : `earns ${G.chips(earn)} $${a.ticker}`}</span></span>
      </div></a>`;
  };

  /* ================= generative stand-in artwork =================
     Each artist's pieces are drawn on a canvas from a seed so the preview has real-feeling art.
     Swap in photographs later by giving a work an `img` URL. */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  G.rng = rng; G.hash = hash;
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const blobP = (r, wob = 1) => ({
    a1: (0.06 + r() * 0.16) * wob, k1: 2 + Math.floor(r() * 3), p1: r() * 6.283,
    a2: r() * 0.08 * wob, k2: 3 + Math.floor(r() * 4), p2: r() * 6.283,
    a3: r() * 0.035 * wob, k3: 6 + Math.floor(r() * 5), p3: r() * 6.283,
    sx: 0.72 + r() * 0.56, sy: 0.72 + r() * 0.56, rot: r() * 6.283
  });
  function blob(ctx, cx, cy, rad, P, k) {
    ctx.beginPath();
    const N = 84, c = Math.cos(P.rot), s = Math.sin(P.rot);
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const rr = rad * k * (1 + P.a1 * Math.sin(P.k1 * t + P.p1) + P.a2 * Math.sin(P.k2 * t + P.p2) + P.a3 * Math.sin(P.k3 * t + P.p3));
      const x = Math.cos(t) * rr * P.sx, y = Math.sin(t) * rr * P.sy;
      const X = cx + x * c - y * s, Y = cy + x * s + y * c;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  }
  function grain(ctx, w, h, amt, r) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const g = (r() - 0.5) * amt; d[i] += g; d[i + 1] += g; d[i + 2] += g; }
    ctx.putImageData(img, 0, 0);
  }
  function eye(ctx, x, y, s, rot, iris, lw, ink) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.95, s, 0); ctx.quadraticCurveTo(0, s * 0.95, -s, 0); ctx.closePath();
    ctx.fillStyle = '#FFFDF6'; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, 7); ctx.fillStyle = iris; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, 7); ctx.fillStyle = ink; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.12, s * 0.07, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }

  const PAL = {
    hamel: ['#FF2E88', '#FFD400', '#00A8FF', '#18C964', '#FF6A00', '#7B3BFF', '#00D1BE', '#FF3B30', '#FFF6E0', '#C6F000'],
    gray: ['#F4F4F2', '#D9D9D6', '#B4B4B0', '#8A8A86', '#5E5E5B', '#3A3A38', '#FFFFFF'],
    ama: ['#1B2A6B', '#E9B12E', '#C2352B', '#2A7F62', '#16151B', '#2140E3', '#F0E3C8'],
    riso: ['#FF48B0', '#00A99D', '#FFE800', '#0078BF', '#FF6C2F'],
    topo: [['#183A2D', '#E9D9AE'], ['#E7D3A8', '#7A3B1E'], ['#B9532F', '#F6E6C8'], ['#22394F', '#D7E6E4'], ['#EADFCB', '#16865A']],
    field: [['#E8B23A', '#B5401F', '#6E1E14'], ['#1F3557', '#C9772B', '#E9D6A8'], ['#7C1F2A', '#E06A3A', '#F0C27A'], ['#2E4A3A', '#D7C38C', '#A4472C']],
    photo: [['#0E1838', '#5B3A79', '#E1708A', '#FFC07A'], ['#0B2440', '#2E6E9E', '#8FC3D9', '#F7E4B5'], ['#1A1030', '#7A2E5C', '#F2621E', '#FFD58A'], ['#14222E', '#3C5A73', '#D99E7C', '#FFE6C4']]
  };

  const PAINTERS = {
    hamel(ctx, w, h, r, opt) {
      const pal = opt.variant === 'gray' ? PAL.gray : PAL.hamel, ink = '#121116', S = Math.min(w, h), lw = S * 0.0105;
      ctx.fillStyle = pick(r, pal); ctx.fillRect(0, 0, w, h);
      const n = Math.round(30 * (w * h) / (S * S) ** 1 * 0.8 + 10);
      for (let i = 0; i < n; i++) {
        const cx = r() * w * 1.1 - w * 0.05, cy = r() * h * 1.1 - h * 0.05;
        const rad = S * (0.1 + r() * 0.2) * (1 - (i / n) * 0.45);
        const P = blobP(r, 1.3), bands = 2 + Math.floor(r() * 4);
        for (let j = 0; j <= bands; j++) {
          const k = 1 - j * (0.82 / (bands + 1));
          blob(ctx, cx, cy, rad, P, k);
          ctx.fillStyle = pick(r, pal); ctx.fill();
          ctx.lineWidth = j === 0 ? lw * 1.5 : lw * (0.55 + r() * 0.5); ctx.strokeStyle = ink; ctx.stroke();
        }
        if (r() < 0.38) eye(ctx, cx, cy, rad * (0.28 + r() * 0.14), (r() - 0.5) * 0.8, pick(r, pal), lw * 0.9, ink);
        else if (r() < 0.4) {
          ctx.beginPath(); for (let d = 0; d < 7; d++) { const a = r() * 6.28, rr = rad * 0.35 * r(); ctx.moveTo(cx + Math.cos(a) * rr + lw * 0.6, cy + Math.sin(a) * rr); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, lw * 0.6, 0, 7); }
          ctx.fillStyle = ink; ctx.fill();
        }
      }
      // marker scribbles and zig-zags
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) {
        let x = r() * w, y = r() * h; const len = 4 + Math.floor(r() * 7), st = S * 0.025;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < len; k++) { x += st; y += (k % 2 ? -1 : 1) * st * 0.9; ctx.lineTo(x, y); }
        ctx.strokeStyle = r() < 0.5 ? ink : '#FFFDF6'; ctx.lineWidth = lw * 0.8; ctx.stroke();
      }
      // drips
      for (let i = 0; i < 6; i++) {
        const x = r() * w, y = r() * h * 0.7, L = S * (0.05 + r() * 0.14), c = pick(r, pal);
        ctx.strokeStyle = c; ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + L); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y + L, lw * 0.95, 0, 7); ctx.fillStyle = c; ctx.fill();
      }
      grain(ctx, w, h, 14, r);
    },
    mono(ctx, w, h, r) {
      const S = Math.min(w, h), ink = '#141318';
      ctx.fillStyle = '#F3F1EA'; ctx.fillRect(0, 0, w, h);
      const n = 6 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const cx = r() * w, cy = r() * h, rad = S * (0.28 + r() * 0.34), P = blobP(r, 1.6);
        blob(ctx, cx, cy, rad, P, 1); ctx.fillStyle = '#F3F1EA'; ctx.fill();
        const rings = 14 + Math.floor(r() * 12);
        for (let j = 0; j < rings; j++) {
          blob(ctx, cx, cy, rad, P, 1 - j / rings);
          ctx.lineWidth = S * (r() < 0.22 ? 0.009 : 0.0035); ctx.strokeStyle = ink; ctx.stroke();
        }
        if (r() < 0.5) { blob(ctx, cx, cy, rad, P, 0.12); ctx.fillStyle = ink; ctx.fill(); }
      }
      grain(ctx, w, h, 18, r);
    },
    field(ctx, w, h, r) {
      const p = pick(r, PAL.field);
      ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
      const m = Math.min(w, h) * 0.08, blocks = r() < 0.5 ? 2 : 3;
      let y = m * 1.1; const gap = m * 0.6, bh = (h - m * 2.2 - gap * (blocks - 1));
      const hs = Array.from({ length: blocks }, () => 0.6 + r()); const tot = hs.reduce((a, b) => a + b, 0);
      for (let i = 0; i < blocks; i++) {
        const hh = (bh * hs[i]) / tot, col = p[(i + 1) % p.length];
        for (let k = 14; k >= 0; k--) {
          ctx.globalAlpha = k === 0 ? 0.82 : 0.05; const e = k * m * 0.06;
          ctx.fillStyle = col; ctx.fillRect(m - e, y - e, w - m * 2 + e * 2, hh + e * 2);
        }
        y += hh + gap;
      }
      ctx.globalAlpha = 1; grain(ctx, w, h, 22, r);
    },
    bauhaus(ctx, w, h, r) {
      const pal = PAL.ama, cols = 3 + Math.floor(r() * 2), cell = w / cols, rows = Math.ceil(h / cell);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const X = x * cell, Y = y * cell, bg = pick(r, pal); let fg = pick(r, pal); if (fg === bg) fg = pal[(pal.indexOf(bg) + 2) % pal.length];
        ctx.fillStyle = bg; ctx.fillRect(X, Y, cell + 1, cell + 1); ctx.fillStyle = fg;
        const t = Math.floor(r() * 6);
        ctx.beginPath();
        if (t === 0) { const cx = X + (r() < 0.5 ? 0 : cell), cy = Y + (r() < 0.5 ? 0 : cell); ctx.moveTo(cx, cy); ctx.arc(cx, cy, cell, 0, 7); ctx.save(); ctx.clip(); ctx.fillRect(X, Y, cell, cell); ctx.restore(); continue; }
        if (t === 1) { ctx.arc(X + cell / 2, Y + cell / 2, cell * 0.38, 0, 7); ctx.fill(); }
        if (t === 2) { ctx.arc(X + cell / 2, Y + cell, cell / 2, Math.PI, 0); ctx.fill(); }
        if (t === 3) { for (let i = 0; i < 5; i++) if (i % 2 === 0) ctx.rect(X, Y + (i * cell) / 5, cell, cell / 5); ctx.fill(); }
        if (t === 4) { ctx.moveTo(X, Y + cell); ctx.lineTo(X + cell / 2, Y); ctx.lineTo(X + cell, Y + cell); ctx.fill(); }
        if (t === 5) { for (let i = 3; i > 0; i--) { ctx.beginPath(); ctx.arc(X + cell / 2, Y + cell / 2, (cell * 0.45 * i) / 3, 0, 7); ctx.fillStyle = i % 2 ? fg : bg; ctx.fill(); } }
      }
      grain(ctx, w, h, 16, r);
    },
    riso(ctx, w, h, r) {
      const S = Math.min(w, h);
      ctx.fillStyle = '#F5F0E6'; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'multiply';
      const inks = PAL.riso.slice().sort(() => r() - 0.5).slice(0, 2 + (r() < 0.4 ? 1 : 0));
      for (let i = 0; i < 6; i++) {
        const c = inks[i % inks.length], cx = w * (0.2 + r() * 0.6), cy = h * (0.15 + r() * 0.7), rad = S * (0.16 + r() * 0.22), P = blobP(r, 0.9);
        ctx.globalAlpha = 0.9; blob(ctx, cx, cy, rad, P, 1); ctx.fillStyle = c; ctx.fill();
        // leaf veins
        ctx.globalAlpha = 1; ctx.strokeStyle = '#F5F0E6'; ctx.lineWidth = S * 0.006; ctx.globalCompositeOperation = 'source-over';
        if (r() < 0.6) { ctx.beginPath(); ctx.moveTo(cx - rad * 0.7, cy + rad * 0.5); ctx.quadraticCurveTo(cx, cy, cx + rad * 0.6, cy - rad * 0.6); ctx.stroke(); }
        ctx.globalCompositeOperation = 'multiply';
      }
      // halftone sun
      const c = inks[0], hx = w * (0.15 + r() * 0.7), hy = h * (0.1 + r() * 0.3), hr = S * 0.22, step = S / 46;
      ctx.fillStyle = c; ctx.globalAlpha = 0.95;
      for (let y = hy - hr; y < hy + hr; y += step) for (let x = hx - hr; x < hx + hr; x += step) {
        const d = Math.hypot(x - hx, y - hy) / hr; if (d > 1) continue;
        ctx.beginPath(); ctx.arc(x, y, step * 0.48 * (1 - d * 0.8), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      grain(ctx, w, h, 26, r);
    },
    topo(ctx, w, h, r) {
      const [bg, ln] = pick(r, PAL.topo), S = Math.min(w, h);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const cx = r() * w, cy = r() * h, rad = S * (0.4 + r() * 0.5), P = blobP(r, 2), rings = 26 + Math.floor(r() * 14);
        blob(ctx, cx, cy, rad, P, 1); ctx.fillStyle = bg; ctx.fill();
        for (let j = 0; j < rings; j++) {
          blob(ctx, cx, cy, rad, P, 1 - j / rings);
          ctx.lineWidth = S * (j % 5 === 0 ? 0.0045 : 0.0018); ctx.strokeStyle = ln; ctx.globalAlpha = j % 5 === 0 ? 0.95 : 0.7; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      grain(ctx, w, h, 18, r);
    },
    photo(ctx, w, h, r) {
      const p = pick(r, PAL.photo), hz = h * (0.52 + r() * 0.14);
      let g = ctx.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, p[0]); g.addColorStop(0.45, p[1]); g.addColorStop(0.82, p[2]); g.addColorStop(1, p[3]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz);
      const sx = w * (0.25 + r() * 0.5), sy = hz - h * (0.02 + r() * 0.08), sr = Math.min(w, h) * 0.06;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 7); glow.addColorStop(0, 'rgba(255,236,190,.85)'); glow.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, hz);
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fillStyle = '#FFF2D6'; ctx.fill();
      g = ctx.createLinearGradient(0, hz, 0, h); g.addColorStop(0, p[2]); g.addColorStop(0.3, p[1]); g.addColorStop(1, p[0]);
      ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
      for (let y = hz; y < h; y += 2 + r() * 3) {
        const spread = (y - hz) / (h - hz), half = sr * (1.2 + spread * 4) * (0.5 + r());
        ctx.fillStyle = `rgba(255,236,200,${0.55 * (1 - spread)})`; ctx.fillRect(sx - half + (r() - 0.5) * sr, y, half * 2, 1.2);
      }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, hz - 1, w, 1.5);
      grain(ctx, w, h, 30, r);
    }
  };

  const cache = new Map();
  G.renderArt = (key, style, w, h, opt = {}) => {
    const ck = key + '|' + w + 'x' + h;
    if (cache.has(ck)) return cache.get(ck);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    PAINTERS[style](ctx, w, h, rng(hash(key)), opt);
    const url = c.toDataURL('image/jpeg', 0.86);
    cache.set(ck, url);
    return url;
  };
  G.workArt = (w, px = 520) => {
    if (w.img) return w.img;
    const a = G.artist(w.artist), ar = w.w / w.h;
    const W = ar >= 1 ? px : Math.round(px * ar), H = ar >= 1 ? Math.round(px / ar) : px;
    return G.renderArt(w.id, a.style, W, H, { variant: w.variant });
  };
  /* placeholder <img> that hydrates after first paint; aspect-ratio reserves its space */
  G.artImg = (w, px = 520, cls = 'art', alt) =>
    `<img class="${cls}" data-art="${w.id}" data-px="${px}" style="--ar:${w.w}/${w.h}" width="${w.w * 10}" height="${w.h * 10}" alt="${esc(alt || `${w.title} by ${G.artist(w.artist).name}`)}" decoding="async">`;
  G.artistArt = (slug, key, w, h) => G.renderArt(slug + ':' + key, G.artist(slug).style, w, h);
  G.hydrate = (root = document) => {
    const els = [...root.querySelectorAll('img[data-art]:not([src]), [data-artist-art]:not([data-done])')];
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < els.length && performance.now() - t0 < 24) {
        const el = els[i++];
        if (el.dataset.art) el.src = G.workArt(G.work(el.dataset.art), +el.dataset.px || 520);
        else {
          const [slug, key, w, h] = el.dataset.artistArt.split(',');
          const url = G.artistArt(slug, key, +w, +h);
          if (el.tagName === 'IMG') el.src = url; else el.style.backgroundImage = `url(${url})`;
          el.dataset.done = '1';
        }
      }
      if (i < els.length) requestAnimationFrame(step);
    };
    step();
  };

  /* ================= chrome: top bar, tab bar, footer, toast ================= */
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    wall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="8" height="10"/><rect x="13" y="3" width="8" height="6"/><rect x="13" y="11" width="8" height="10"/><rect x="3" y="15" width="8" height="6"/></svg>',
    chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="1"/><path d="M5 14.5h14"/><circle cx="15.5" cy="6" r="1.2"/></svg>',
    coll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M7 7V4h10v3M3 12h18"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12c-2 0-3 2-3 4s-1 3-1 4c2 0 6 0 7-2 1-1 0-3-1-4"/></svg>'
  };
  G.icons = I;

  G.chrome = (page) => {
    const nav = [['discover.html', 'Discover', 'discover'], ['how-it-works.html', 'How chips work', 'how'], ['for-artists.html', 'For artists', 'artists'], ['collection.html', 'Collection', 'collection']];
    const top = document.getElementById('chrome-top');
    if (top) top.outerHTML = `
      <header class="topbar"><div class="wrap">
        <a class="wordmark" href="index.html" aria-label="Gesso home">gesso<span class="drip" aria-hidden="true"></span></a>
        <nav class="nav" aria-label="Main">${nav.map(([h, l, k]) => `<a href="${h}" ${k === page ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
        <div class="tools">
          <a class="wallet-pill" href="collection.html" title="Your chips"><span class="stack" data-wallet-stack></span><span class="num" data-wallet-val></span><span class="label muted">in chips</span></a>
          <a class="icon-btn" href="checkout.html" aria-label="Bag">${I.bag}<span class="badge" data-bag-count></span></a>
        </div>
      </div></header>`;
    const bottom = document.getElementById('chrome-bottom');
    if (bottom) bottom.outerHTML = `
      <nav class="tabbar" aria-label="Tabs">
        <a href="index.html" ${page === 'home' ? 'aria-current="page"' : ''}>${I.home}Home</a>
        <a href="discover.html" ${page === 'discover' ? 'aria-current="page"' : ''}>${I.wall}Discover</a>
        <a href="how-it-works.html" ${page === 'how' ? 'aria-current="page"' : ''}>${I.chip}Chips</a>
        <a href="collection.html" ${page === 'collection' ? 'aria-current="page"' : ''}>${I.coll}Collection</a>
        <a href="checkout.html" ${page === 'checkout' ? 'aria-current="page"' : ''}>${I.bag}Bag<span class="badge" data-bag-count></span></a>
      </nav>
      <footer class="footer"><div class="wrap">
        <div style="display:grid;gap:14px;align-content:start;max-width:30em">
          <a class="wordmark" href="index.html" style="font-size:2.4rem">gesso<span class="drip" aria-hidden="true"></span></a>
          <p class="muted">An art market owned by the people who collect it. Buy the art, earn the artist's chips, spend them on more art.</p>
          <div class="theme-toggle" role="group" aria-label="Theme"><button type="button" data-theme-set="system">Auto</button><button type="button" data-theme-set="light">Light</button><button type="button" data-theme-set="dark">Dark</button></div>
        </div>
        <div><h4>Collect</h4><ul><li><a href="discover.html">Discover</a></li><li><a href="artist.html#hamel">Featured: HAMEL</a></li><li><a href="index.html#board">Chip board</a></li><li><a href="collection.html">Your collection</a></li></ul></div>
        <div><h4>Learn</h4><ul><li><a href="how-it-works.html">How chips work</a></li><li><a href="how-it-works.html#curve">The price curve</a></li><li><a href="how-it-works.html#faq">Questions</a></li></ul></div>
        <div><h4>Create</h4><ul><li><a href="for-artists.html">Sell on Gesso</a></li><li><a href="for-artists.html#compare">Fees compared</a></li><li><a href="for-artists.html#apply">Apply</a></li></ul></div>
        <div class="fine"><span>Design preview. HAMEL is real; other artists are sample creators, and all artwork shown is generated stand-in imagery. No payments are taken.</span><button type="button" class="link" style="background:none;border:0;padding:0;cursor:pointer;font-size:inherit" data-reset>Reset preview</button></div>
      </div></footer>`;
    document.body.insertAdjacentHTML('beforeend', '<div class="toast" role="status" aria-live="polite" id="toast"></div>');

    // theme
    const applyTheme = (t) => {
      if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
      document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    };
    applyTheme(store.get('theme', 'system'));
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-theme-set]');
      if (t) { store.set('theme', t.dataset.themeSet); applyTheme(t.dataset.themeSet); }
      const add = e.target.closest('[data-add]');
      if (add) { e.preventDefault(); e.stopPropagation(); G.addToBag(add.dataset.add); }
      if (e.target.closest('[data-reset]')) { G.resetPreview(); location.reload(); }
    });
    G.refreshBadges();
  };

  G.refreshBadges = () => {
    const n = G.bag().length;
    document.querySelectorAll('[data-bag-count]').forEach((b) => (b.textContent = n ? n : ''));
    const w = G.wallet();
    document.querySelectorAll('[data-wallet-val]').forEach((el) => (el.textContent = G.usd(G.walletValue(w), true)));
    document.querySelectorAll('[data-wallet-stack]').forEach((el) => (el.innerHTML = Object.keys(w.chips).slice(0, 3).map((k) => `<i style="--c:${G.artist(k).color}"></i>`).join('')));
  };

  let toastT;
  G.toast = (html) => {
    const t = document.getElementById('toast'); if (!t) return;
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3600);
  };

  /* sample community activity for tickers */
  const FIRST = ['Priya', 'Marcus', 'Lena', 'Dante', 'Sol', 'Imani', 'Theo', 'Rosa', 'Kenji', 'Aisha', 'Wes', 'Noor', 'Calla', 'Rafa', 'Bea', 'Omar'];
  G.activity = (count = 16, seed = 'act') => {
    const r = rng(hash(seed)), out = [];
    for (let i = 0; i < count; i++) {
      const w = pick(r, WORKS.filter((x) => !x.sold)), a = G.artist(w.artist);
      const who = pick(r, FIRST) + ' ' + String.fromCharCode(65 + Math.floor(r() * 26)) + '.';
      const kind = r();
      out.push(kind < 0.6
        ? { a, text: `${who} collected ${w.title}`, delta: `$${a.ticker} +${(r() * 0.9 + 0.1).toFixed(1)}%` }
        : kind < 0.85
          ? { a, text: `${who} spent ${(r() * 30 + 4).toFixed(1)} chips on ${a.name}`, delta: `saved ${G.usd(Math.round(r() * 160 + 20))}` }
          : { a, text: `${who} became a founding collector`, delta: `$${a.ticker} 2× chips` });
    }
    return out;
  };
})();
