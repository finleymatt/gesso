/* Gesso room studio: see a piece (or a wallpaper) in a room, to scale, or on a photo of your own wall.
   Scenes are drawn on a canvas in inches. "Your walls" finds the wall in your photo with an
   on-device segmentation model (SegFormer, ADE20K) loaded on demand; if the model can't load it
   falls back to a texture heuristic. Photos never leave the device. */
(function () {
  'use strict';
  const G = window.G;

  const SCENES = {
    living: { name: 'Living room', wall: '#EEEDE8', floor: 'oak', w: 150, furn: 'sofa', note: 'Sofa is 84 in wide' },
    bedroom: { name: 'Bedroom', wall: '#B4C0AA', floor: 'oak', w: 140, furn: 'bed', note: 'Queen bed is 64 in wide' },
    office: { name: 'Office', wall: '#D9D2C5', floor: 'walnut', w: 132, furn: 'desk', note: 'Desk is 60 in wide' },
    dining: { name: 'Dining room', wall: '#E6CCC2', floor: 'walnut', w: 150, furn: 'sideboard', note: 'Sideboard is 72 in wide' },
    loft: { name: 'Brick loft', wall: 'brick', floor: 'concrete', w: 170, furn: 'leather', note: 'Sofa is 84 in wide' },
    gallery: { name: 'Gallery', wall: '#F4F4F1', floor: 'concrete', w: 180, furn: 'bench', spot: true, note: 'Bench is 48 in wide' }
  };
  const PAINT = [['Gesso white', '#EEEDE8'], ['Greige', '#D9D2C5'], ['Sage', '#B4C0AA'], ['Plaster pink', '#E6CCC2'], ['Terracotta', '#C47C5C'], ['Midnight', '#2B3240']];
  const FRAMES = [['none', 'No frame'], ['black', 'Black'], ['oak', 'Oak'], ['float', 'White mat']];
  const WALLS_KEY = 'walls';

  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const shade = (hex, amt) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  function floorShadow(ctx, cx, cy, rx, ry, a = 0.28) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, 7); ctx.fill(); ctx.restore();
  }

  /* ---------- furniture, sized in inches (k = pixels per inch), standing on y = yb ---------- */
  const FURN = {
    sofa(ctx, x, yb, k, ev, color = '#66788C') {
      floorShadow(ctx, x, yb, 50 * k, 4 * k);
      ctx.fillStyle = shade(color, -0.12); rr(ctx, x - 38 * k, yb - 33 * k, 76 * k, 18 * k, 4 * k); ctx.fill();
      ctx.fillStyle = color; [-1, 0, 1].forEach((i) => { rr(ctx, x - 12.5 * k + i * 25.5 * k, yb - 31 * k, 24.5 * k, 15 * k, 3 * k); ctx.fill(); });
      ctx.fillStyle = shade(color, 0.08); [-1, 0, 1].forEach((i) => { rr(ctx, x - 12.5 * k + i * 25.5 * k, yb - 19 * k, 24.5 * k, 9 * k, 2.5 * k); ctx.fill(); });
      ctx.fillStyle = shade(color, -0.05); rr(ctx, x - 42 * k, yb - 25 * k, 8 * k, 18 * k, 3.5 * k); ctx.fill(); rr(ctx, x + 34 * k, yb - 25 * k, 8 * k, 18 * k, 3.5 * k); ctx.fill();
      ctx.fillStyle = shade(color, -0.25); ctx.fillRect(x - 41 * k, yb - 10 * k, 82 * k, 4 * k);
      ctx.fillStyle = '#2A2420'; ctx.fillRect(x - 38 * k, yb - 6 * k, 1.6 * k, 6 * k); ctx.fillRect(x + 36.4 * k, yb - 6 * k, 1.6 * k, 6 * k);
      ctx.fillStyle = '#E9C46A'; rr(ctx, x + 18 * k, yb - 26 * k, 12 * k, 10 * k, 2 * k); ctx.fill();
    },
    leather(ctx, x, yb, k, ev) { FURN.sofa(ctx, x, yb, k, ev, '#7A4B30'); },
    bed(ctx, x, yb, k, ev) {
      floorShadow(ctx, x, yb, 46 * k, 4 * k);
      [-1, 1].forEach((s) => {
        const nx = x + s * 45 * k; ctx.fillStyle = '#8A6A4E'; ctx.fillRect(nx - 10 * k, yb - 24 * k, 20 * k, 22 * k); ctx.fillStyle = '#6E523B'; ctx.fillRect(nx - 10 * k, yb - 15 * k, 20 * k, 1 * k);
        ctx.fillStyle = '#1F1E22'; ctx.fillRect(nx - 9 * k, yb - 2 * k, 1.4 * k, 2 * k); ctx.fillRect(nx + 7.6 * k, yb - 2 * k, 1.4 * k, 2 * k);
        ctx.fillStyle = '#D9CFC0'; ctx.fillRect(nx - 1 * k, yb - 34 * k, 2 * k, 10 * k);
        if (ev) { const g = ctx.createRadialGradient(nx, yb - 38 * k, 0, nx, yb - 38 * k, 26 * k); g.addColorStop(0, 'rgba(255,200,120,.55)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(nx - 30 * k, yb - 70 * k, 60 * k, 60 * k); }
        ctx.fillStyle = ev ? '#FFE3B0' : '#F2EDE3'; ctx.beginPath(); ctx.moveTo(nx - 7 * k, yb - 34 * k); ctx.lineTo(nx + 7 * k, yb - 34 * k); ctx.lineTo(nx + 5 * k, yb - 42 * k); ctx.lineTo(nx - 5 * k, yb - 42 * k); ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = '#C8B79F'; rr(ctx, x - 32 * k, yb - 50 * k, 64 * k, 30 * k, 3 * k); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = k * 0.5; for (let i = -24; i <= 24; i += 12) { ctx.beginPath(); ctx.moveTo(x + i * k, yb - 48 * k); ctx.lineTo(x + i * k, yb - 22 * k); ctx.stroke(); }
      ctx.fillStyle = '#FFFFFF'; rr(ctx, x - 28 * k, yb - 30 * k, 25 * k, 9 * k, 4 * k); ctx.fill(); rr(ctx, x + 3 * k, yb - 30 * k, 25 * k, 9 * k, 4 * k); ctx.fill();
      ctx.fillStyle = '#E4E1DA'; ctx.fillRect(x - 33 * k, yb - 23 * k, 66 * k, 13 * k); ctx.fillStyle = '#C46A4A'; ctx.fillRect(x - 33 * k, yb - 16 * k, 66 * k, 6 * k);
      ctx.fillStyle = '#7B5B40'; ctx.fillRect(x - 33 * k, yb - 10 * k, 66 * k, 7 * k);
    },
    desk(ctx, x, yb, k, ev) {
      floorShadow(ctx, x, yb, 38 * k, 3 * k);
      ctx.fillStyle = '#B98B5D'; ctx.fillRect(x - 30 * k, yb - 30 * k, 60 * k, 1.8 * k); ctx.fillStyle = '#9C7249'; ctx.fillRect(x - 30 * k, yb - 28.2 * k, 60 * k, 1 * k);
      ctx.fillStyle = '#1D1C20'; ctx.fillRect(x - 28 * k, yb - 27 * k, 1.4 * k, 27 * k); ctx.fillRect(x + 26.6 * k, yb - 27 * k, 1.4 * k, 27 * k);
      ctx.strokeStyle = '#1D1C20'; ctx.lineWidth = 0.9 * k; ctx.beginPath(); ctx.moveTo(x - 22 * k, yb - 30 * k); ctx.lineTo(x - 18 * k, yb - 44 * k); ctx.lineTo(x - 11 * k, yb - 40 * k); ctx.stroke();
      ctx.fillStyle = '#1D1C20'; ctx.beginPath(); ctx.moveTo(x - 13 * k, yb - 42 * k); ctx.lineTo(x - 7 * k, yb - 39 * k); ctx.lineTo(x - 9 * k, yb - 36 * k); ctx.lineTo(x - 14 * k, yb - 38 * k); ctx.fill();
      if (ev) { const g = ctx.createRadialGradient(x - 9 * k, yb - 33 * k, 0, x - 9 * k, yb - 33 * k, 20 * k); g.addColorStop(0, 'rgba(255,205,130,.6)'); g.addColorStop(1, 'rgba(255,205,130,0)'); ctx.fillStyle = g; ctx.fillRect(x - 30 * k, yb - 55 * k, 42 * k, 30 * k); }
      ctx.fillStyle = '#3A3F4A'; rr(ctx, x + 6 * k, yb - 37 * k, 13 * k, 7 * k, 0.8 * k); ctx.fill();
      ctx.fillStyle = '#2B2B30'; rr(ctx, x - 9 * k, yb - 42 * k, 18 * k, 17 * k, 3 * k); ctx.fill(); rr(ctx, x - 10 * k, yb - 23 * k, 20 * k, 4 * k, 2 * k); ctx.fill();
      ctx.fillRect(x - 0.8 * k, yb - 19 * k, 1.6 * k, 15 * k); ctx.fillRect(x - 9 * k, yb - 4 * k, 18 * k, 1.4 * k);
    },
    sideboard(ctx, x, yb, k, ev) {
      floorShadow(ctx, x, yb, 44 * k, 3.5 * k);
      ctx.fillStyle = '#6F5038'; ctx.fillRect(x - 36 * k, yb - 31 * k, 72 * k, 25 * k);
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.4 * k; [-12, 12].forEach((d) => { ctx.beginPath(); ctx.moveTo(x + d * k, yb - 29 * k); ctx.lineTo(x + d * k, yb - 8 * k); ctx.stroke(); });
      ctx.fillStyle = '#C8A15C'; [-24, 0, 24].forEach((d) => ctx.fillRect(x + d * k - 2 * k, yb - 20 * k, 4 * k, 0.8 * k));
      ctx.fillStyle = '#1D1C20'; ctx.fillRect(x - 33 * k, yb - 6 * k, 1.4 * k, 6 * k); ctx.fillRect(x + 31.6 * k, yb - 6 * k, 1.4 * k, 6 * k);
      ctx.fillStyle = '#EDE9E0'; ctx.beginPath(); ctx.ellipse(x - 22 * k, yb - 37 * k, 4 * k, 6 * k, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#4C6B47'; ctx.lineWidth = 0.6 * k; [[-9, -20], [-2, -24], [6, -18]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(x - 22 * k, yb - 42 * k); ctx.quadraticCurveTo(x + (-22 + dx / 2) * k, yb + (-42 + dy / 2) * k, x + (-22 + dx) * k, yb + (-42 + dy) * k); ctx.stroke(); });
      ctx.fillStyle = '#2F3C52'; ctx.beginPath(); ctx.ellipse(x + 20 * k, yb - 32 * k, 7 * k, 2 * k, 0, 0, 7); ctx.fill();
    },
    bench(ctx, x, yb, k) {
      floorShadow(ctx, x, yb, 30 * k, 2.5 * k, 0.2);
      ctx.fillStyle = '#C7A479'; ctx.fillRect(x - 24 * k, yb - 18 * k, 48 * k, 3 * k);
      ctx.fillStyle = '#1D1C20'; ctx.fillRect(x - 21 * k, yb - 15 * k, 1.6 * k, 15 * k); ctx.fillRect(x + 19.4 * k, yb - 15 * k, 1.6 * k, 15 * k);
    },
    plant(ctx, x, yb, k) {
      floorShadow(ctx, x, yb, 10 * k, 1.6 * k);
      ctx.fillStyle = '#C9B9A0'; ctx.beginPath(); ctx.moveTo(x - 6 * k, yb - 14 * k); ctx.lineTo(x + 6 * k, yb - 14 * k); ctx.lineTo(x + 4.5 * k, yb); ctx.lineTo(x - 4.5 * k, yb); ctx.fill();
      const r = G.rng(7);
      for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, L = (14 + r() * 22) * k; ctx.save(); ctx.translate(x, yb - 14 * k); ctx.rotate(a); ctx.fillStyle = i % 2 ? '#3F6B44' : '#557F4F'; ctx.beginPath(); ctx.ellipse(L * 0.55, 0, L * 0.55, 2.4 * k, 0, 0, 7); ctx.fill(); ctx.restore(); }
    },
    lamp(ctx, x, yb, k, ev) {
      ctx.fillStyle = '#1D1C20'; ctx.fillRect(x - 0.5 * k, yb - 58 * k, 1 * k, 58 * k); ctx.fillRect(x - 5 * k, yb - 1 * k, 10 * k, 1 * k);
      if (ev) { const g = ctx.createRadialGradient(x, yb - 60 * k, 0, x, yb - 60 * k, 34 * k); g.addColorStop(0, 'rgba(255,205,130,.6)'); g.addColorStop(1, 'rgba(255,205,130,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40 * k, yb - 100 * k, 80 * k, 80 * k); }
      ctx.fillStyle = ev ? '#FFE1A8' : '#EDE6D8'; ctx.beginPath(); ctx.moveTo(x - 7.5 * k, yb - 58 * k); ctx.lineTo(x + 7.5 * k, yb - 58 * k); ctx.lineTo(x + 5 * k, yb - 67 * k); ctx.lineTo(x - 5 * k, yb - 67 * k); ctx.fill();
    }
  };
  const FURN_SIZE = { sofa: [84, 33], leather: [84, 33], bed: [112, 50], desk: [60, 44], sideboard: [72, 32], bench: [48, 18] };

  /* ---------- the wall, floor and light ---------- */
  function drawRoom(ctx, W, H, st, k, wy) {
    const sc = SCENES[st.scene], ev = st.light === 'evening';
    if (st.wallpaper) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, wy); ctx.clip(); G.tileImg(ctx, st.wallpaper, 0, 0, W, wy, 27 * k); ctx.restore();
    } else if (sc.wall === 'brick' && !st.paint) {
      ctx.fillStyle = '#C9B8A6'; ctx.fillRect(0, 0, W, wy);
      const r = G.rng(11), bh = 2.7 * k, bw = 7.8 * k, cols = ['#9A4B37', '#8C412F', '#A55A43', '#7F3B2A', '#B0644B', '#94503A'];
      for (let y = wy - bh, row = 0; y > -bh; y -= bh, row++) for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) { ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.fillRect(x + 0.25 * k, y + 0.22 * k, bw - 0.5 * k, bh - 0.44 * k); }
    } else {
      ctx.fillStyle = st.paint || sc.wall; ctx.fillRect(0, 0, W, wy);
    }
    // daylight from a window on the left, or evening dim
    let g = ctx.createLinearGradient(0, 0, W, 0);
    if (ev) { g.addColorStop(0, 'rgba(25,15,5,.38)'); g.addColorStop(0.5, 'rgba(25,15,5,.22)'); g.addColorStop(1, 'rgba(25,15,5,.4)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, wy);
    g = ctx.createLinearGradient(0, wy - 30 * k, 0, wy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = g; ctx.fillRect(0, wy - 30 * k, W, 30 * k);
    // baseboard
    const base = st.paint || (sc.wall.startsWith('#') ? sc.wall : '#E8E2D8');
    ctx.fillStyle = lum(base) < 0.35 ? shade(base, 0.08) : '#F7F6F2'; ctx.fillRect(0, wy - 4.5 * k, W, 4.5 * k);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, wy - 4.5 * k, W, 0.25 * k);
    // floor in light perspective
    const fh = H - wy, vx = W / 2, vy = wy - H * 0.9;
    if (sc.floor === 'concrete') {
      g = ctx.createLinearGradient(0, wy, 0, H); g.addColorStop(0, '#8D8B86'); g.addColorStop(1, '#A7A59F'); ctx.fillStyle = g; ctx.fillRect(0, wy, W, fh);
      const r = G.rng(5); ctx.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.ellipse(r() * W, wy + r() * fh, 20 + r() * 60, 3 + r() * 8, 0, 0, 7); ctx.fill(); }
    } else {
      ctx.fillStyle = sc.floor === 'walnut' ? '#7A563A' : '#B48A5F'; ctx.fillRect(0, wy, W, fh);
      ctx.strokeStyle = 'rgba(40,22,10,.28)'; ctx.lineWidth = Math.max(1, 0.18 * k);
      for (let i = -30; i <= 30; i++) { const xb = vx + i * 6.5 * k * 2.2; ctx.beginPath(); ctx.moveTo(vx + (xb - vx) * ((wy - vy) / (H - vy)), wy); ctx.lineTo(xb, H); ctx.stroke(); }
      const r = G.rng(9); ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 30; i++) ctx.fillRect(r() * W, wy + r() * fh, 30 + r() * 80, 1.5);
    }
    g = ctx.createLinearGradient(0, wy, 0, wy + fh * 0.5); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, wy, W, fh * 0.5);
    if (ev) { ctx.fillStyle = 'rgba(25,15,5,.32)'; ctx.fillRect(0, wy, W, fh); }
  }

  /* artwork with its frame and a cast shadow; x,y is the top-left of the image itself */
  function drawArt(ctx, img, x, y, w, h, k, frame, ev, tint) {
    const f = frame === 'none' ? 0 : frame === 'float' ? 3.2 * k : 1.3 * k, X = x - f, Y = y - f, Wf = w + f * 2, Hf = h + f * 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = 2.8 * k; ctx.shadowOffsetX = ev ? 0 : 0.9 * k; ctx.shadowOffsetY = ev ? 2 * k : 1.4 * k;
    ctx.fillStyle = frame === 'oak' ? '#B98A57' : frame === 'black' ? '#151418' : frame === 'float' ? '#151418' : '#222';
    ctx.fillRect(X, Y, Wf, Hf); ctx.restore();
    if (frame === 'oak') { const g = ctx.createLinearGradient(X, Y, X + Wf, Y + Hf); g.addColorStop(0, '#C99A66'); g.addColorStop(0.5, '#A97B4B'); g.addColorStop(1, '#C49260'); ctx.fillStyle = g; ctx.fillRect(X, Y, Wf, Hf); }
    if (frame === 'float') { ctx.fillStyle = '#F7F6F2'; ctx.fillRect(X + 0.8 * k, Y + 0.8 * k, Wf - 1.6 * k, Hf - 1.6 * k); }
    ctx.drawImage(img, x, y, w, h);
    if (tint) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.28; ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); ctx.restore(); }
    if (frame === 'none') { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + w - 0.25 * k, y, 0.25 * k, h); }
    if (ev) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,214,160,.35)'; ctx.fillRect(X, Y, Wf, Hf); ctx.restore(); }
  }

  function renderScene(ctx, W, H, st) {
    const sc = SCENES[st.scene], ev = st.light === 'evening';
    const fhFrac = 0.22, wy = H * (1 - fhFrac), yb = wy + H * fhFrac * 0.48;
    const [fw, fhIn] = FURN_SIZE[sc.furn];
    const art = st.dims; // {w,h} in inches, or null for wallpaper
    let k = W / sc.w;
    if (art) {
      for (let i = 0; i < 4; i++) {
        const furnTop = yb - fhIn * k, artH = art.h * k;
        let cy = wy - 57 * k; if (cy + artH / 2 > furnTop - 8 * k) cy = furnTop - 8 * k - artH / 2;
        const top = cy - artH / 2 - (st.frame === 'float' ? 3.2 : 1.3) * k;
        if (top >= H * 0.05) break;
        k *= (yb - H * 0.05) / (yb - top);
      }
    }
    drawRoom(ctx, W, H, st, k, wy);
    const cx = W / 2;
    if (art) {
      const artW = art.w * k, artH = art.h * k, furnTop = yb - fhIn * k;
      let cy = wy - 57 * k; if (cy + artH / 2 > furnTop - 8 * k) cy = furnTop - 8 * k - artH / 2;
      if (sc.spot || ev) { const g = ctx.createRadialGradient(cx, cy - artH * 0.2, 0, cx, cy, Math.max(artW, artH) * 1.1); g.addColorStop(0, sc.spot && !ev ? 'rgba(255,255,255,.35)' : 'rgba(255,215,160,.32)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, wy); }
      drawArt(ctx, st.img, cx - artW / 2, cy - artH / 2, artW, artH, k, st.frame, ev);
    }
    if (sc.furn === 'sofa') { FURN.lamp(ctx, cx - 62 * k, yb, k, ev); FURN.plant(ctx, cx + 60 * k, yb, k); }
    if (sc.furn === 'leather') FURN.plant(ctx, cx - 58 * k, yb, k);
    if (sc.furn === 'desk') FURN.plant(ctx, cx + 48 * k, yb, k);
    FURN[sc.furn](ctx, cx, yb, k, ev);
    return k;
  }

  /* ---------- finding the wall in a photo ---------- */
  // largest axis-aligned rectangle of true cells in a boolean grid (histogram method)
  function largestRect(grid, cols, rows) {
    const h = new Array(cols).fill(0); let best = { area: 0 };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) h[x] = grid[y * cols + x] ? h[x] + 1 : 0;
      const st = [];
      for (let x = 0; x <= cols; x++) {
        const cur = x < cols ? h[x] : 0;
        while (st.length && h[st[st.length - 1]] >= cur) {
          const top = st.pop(), height = h[top], left = st.length ? st[st.length - 1] + 1 : 0, width = x - left;
          // prefer wall above eye level and away from the floor
          const area = height * width * (1 - Math.max(0, (y - rows * 0.8) / rows));
          if (area > best.area) best = { area, x0: left, x1: x, y0: y - height + 1, y1: y + 1 };
        }
        st.push(x);
      }
    }
    return best.area ? { x0: best.x0 / cols, x1: best.x1 / cols, y0: best.y0 / rows, y1: best.y1 / rows } : null;
  }
  // quick guess without AI: smooth, evenly lit areas in the upper part of the photo
  function heuristicWall(cv) {
    const cols = 48, rows = Math.round(48 * cv.height / cv.width), c = document.createElement('canvas'); c.width = cols; c.height = rows;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(cv, 0, 0, cols, rows);
    const d = x.getImageData(0, 0, cols, rows).data, L = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) L[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    const grid = new Uint8Array(cols * rows);
    for (let y = 1; y < rows - 1; y++) for (let xx = 1; xx < cols - 1; xx++) {
      const i = y * cols + xx, gx = Math.abs(L[i + 1] - L[i - 1]), gy = Math.abs(L[i + cols] - L[i - cols]);
      grid[i] = gx + gy < 14 && y < rows * 0.85 ? 1 : 0;
    }
    return { rect: largestRect(grid, cols, rows), mask: null, by: 'auto' };
  }
  let segP = null;
  async function aiWall(cv) {
    const T = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
    T.env.allowLocalModels = false;
    segP = segP || T.pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512');
    const seg = await segP;
    const out = await seg(cv.toDataURL('image/jpeg', 0.9));
    const walls = out.filter((o) => /^wall$/.test(o.label));
    if (!walls.length) return null;
    const m = walls[0].mask, cols = 64, rows = Math.max(8, Math.round(64 * m.height / m.width));
    const grid = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const sx = Math.floor((x + 0.5) * m.width / cols), sy = Math.floor((y + 0.5) * m.height / rows);
      grid[y * cols + x] = m.data[(sy * m.width + sx) * m.channels] > 127 ? 1 : 0;
    }
    // keep the mask itself for wallpaper
    const mc = document.createElement('canvas'); mc.width = m.width; mc.height = m.height;
    const mx = mc.getContext('2d'), id = mx.createImageData(m.width, m.height);
    for (let i = 0; i < m.width * m.height; i++) { id.data[i * 4 + 3] = m.data[i * m.channels]; }
    mx.putImageData(id, 0, 0);
    return { rect: largestRect(grid, cols, rows), mask: mc, by: 'ai' };
  }

  /* ---------- saved photos of your walls (this device only) ---------- */
  const loadWalls = () => G.store.get(WALLS_KEY, []) || [];
  const saveWalls = (w) => { try { G.store.set(WALLS_KEY, w.slice(0, 4)); } catch (e) { /* storage full: keep in memory */ } };
  async function fileToWall(file) {
    const url = URL.createObjectURL(file), img = await G.loadImg(url); URL.revokeObjectURL(url);
    const s = Math.min(1, 1100 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { id: 'w' + Date.now().toString(36), src: c.toDataURL('image/jpeg', 0.82), name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'My wall', wallIn: 120 };
  }

  /* ---------- the studio UI ---------- */
  G.roomStudio = (host, opts) => {
    // opts: { img: url, dims: {w,h} } for a piece, or { wallpaper: url } for wallpaper
    const st = { scene: 'living', paint: null, frame: 'none', light: 'day', dims: opts.dims || null, img: null, wallpaper: null, wall: null, place: null, find: null, size: 1 };
    host.innerHTML = `<div class="rs">
      <div class="rs-stage" data-stage><canvas class="rs-canvas" aria-label="Preview of the piece in a room"></canvas><div class="rs-status" hidden></div></div>
      <div class="rs-row rs-scenes" role="group" aria-label="Room">${Object.entries(SCENES).map(([k, s]) => `<button type="button" class="pill" data-scene="${k}">${s.name}</button>`).join('')}</div>
      <div class="rs-row rs-yours" aria-label="Your walls">
        <span class="lbl">Your walls</span><div class="rs-thumbs" data-thumbs></div>
        <label class="pill rs-up"><input type="file" accept="image/*" data-file hidden>+ Photo of your wall</label>
        <button type="button" class="pill rs-glasses" data-glasses><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 11h20M4 11c0 3 1.5 5 4 5s4-2 4-5m0 0c0 3 1.5 5 4 5s4-2 4-5"/></svg>Meta glasses</button>
      </div>
      <div class="rs-row rs-ctrls">
        <div class="rs-group" data-only="scene"><span class="lbl">Wall</span><div class="rs-paint">${PAINT.map(([n, c]) => `<button type="button" class="swatchbtn" data-paint="${c}" style="--c:${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div></div>
        ${opts.dims ? `<div class="rs-group"><span class="lbl">Frame</span><div class="seg">${FRAMES.map(([k, n]) => `<button type="button" data-frame="${k}">${n}</button>`).join('')}</div></div>` : ''}
        <div class="rs-group" data-only="scene"><span class="lbl">Light</span><div class="seg"><button type="button" data-light="day">Day</button><button type="button" data-light="evening">Evening</button></div></div>
        ${opts.dims ? `<div class="rs-group" data-only="photo"><label class="lbl" for="rs-wallin">Wall width</label><div style="display:flex;align-items:center;gap:6px"><input class="input" id="rs-wallin" type="number" min="24" max="600" step="1" style="width:90px;min-height:36px"><span class="muted" style="font-size:var(--t-s)">in</span></div></div>` : ''}
        <div class="rs-group" data-only="photo"><button type="button" class="pill" data-refind>Find the wall again</button></div>
      </div>
      <p class="rs-cap" data-cap></p>
    </div>`;
    const $ = (s) => host.querySelector(s), $$ = (s) => host.querySelectorAll(s);
    const canvas = $('canvas'), stage = $('[data-stage]'), status = $('.rs-status');
    let photo = null;

    const setStatus = (t, busy) => { status.hidden = !t; status.innerHTML = t ? `${busy ? '<i class="spin"></i>' : ''}${t}` : ''; };

    function sizeCanvas(ar) {
      stage.style.aspectRatio = ar;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = stage.clientWidth || 600, [a, b] = ar.split('/').map(Number);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round((w * b / a) * dpr);
    }

    function draw() {
      $$('[data-scene]').forEach((b) => b.setAttribute('aria-pressed', String(!st.wall && b.dataset.scene === st.scene)));
      $$('[data-wall]').forEach((b) => b.setAttribute('aria-pressed', String(st.wall && b.dataset.wall === st.wall.id)));
      $$('[data-paint]').forEach((b) => b.setAttribute('aria-pressed', String((st.paint || SCENES[st.scene].wall) === b.dataset.paint)));
      $$('[data-frame]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.frame === st.frame)));
      $$('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === st.light)));
      $$('[data-only="scene"]').forEach((e) => (e.hidden = !!st.wall || (!!st.wallpaper && !!e.querySelector('[data-paint]'))));
      $$('[data-only="photo"]').forEach((e) => (e.hidden = !st.wall));
      const ctx = canvas.getContext('2d');
      if (!st.wall) {
        sizeCanvas('5/4');
        renderScene(ctx, canvas.width, canvas.height, st);
        $('[data-cap]').textContent = `${SCENES[st.scene].name}, shown to scale. ${SCENES[st.scene].note}.${opts.dims ? ` This piece is ${opts.dims.w} × ${opts.dims.h} in.` : ' Pattern repeats every 27 in.'}`;
        return;
      }
      sizeCanvas(`${photo.width}/${photo.height}`);
      const W = canvas.width, H = canvas.height;
      ctx.drawImage(photo, 0, 0, W, H);
      const f = st.find, rect = f && f.rect;
      if (st.wallpaper) {
        const pc = document.createElement('canvas'); pc.width = W; pc.height = H; const px = pc.getContext('2d');
        const wallPx = rect ? (rect.x1 - rect.x0) * W : W * 0.6, tile = wallPx / ((st.wall.wallIn || 120) / 27);
        G.tileImg(px, st.wallpaper, 0, 0, W, H, Math.max(40, tile));
        px.globalCompositeOperation = 'destination-in';
        if (f && f.mask) px.drawImage(f.mask, 0, 0, W, H); else if (rect) { px.fillStyle = '#000'; px.fillRect(rect.x0 * W, rect.y0 * H, (rect.x1 - rect.x0) * W, (rect.y1 - rect.y0) * H); }
        ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(pc, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35; ctx.drawImage(photo, 0, 0, W, H); ctx.restore();
        // keep the shading of the room on top of the new paper
        $('[data-cap]').textContent = f && f.by === 'ai' ? 'The AI found your wall and papered it. Shading from your photo is kept.' : 'Papered the area that looks like wall. Results are rough without the AI model.';
        return;
      }
      if (!st.place) {
        const r = rect || { x0: 0.25, x1: 0.75, y0: 0.15, y1: 0.6 };
        st.place = { cx: (r.x0 + r.x1) / 2, cy: r.y0 + (r.y1 - r.y0) * 0.45 };
        st.wall.wallIn = st.wall.wallIn || 120; st.wallPx = (r.x1 - r.x0);
      }
      // true scale: wall width in inches spans the wall rectangle
      const k = (st.wallPx * W) / st.wall.wallIn, aw = opts.dims.w * k, ah = opts.dims.h * k;
      const ax = st.place.cx * W - aw / 2, ay = st.place.cy * H - ah / 2;
      const tint = sampleTint(ctx, rect, W, H);
      drawArt(ctx, st.img, ax, ay, aw, ah, k, st.frame, false, tint);
      st.hit = { x: ax, y: ay, w: aw, h: ah };
      $('[data-cap]').textContent = (f && f.by === 'ai' ? 'Hung by on-device AI on the wall it found. ' : 'Hung on the clearest part of the wall. ') + 'Drag to move it, and set your wall width for true scale. Your photo stays on this device.';
    }
    function sampleTint(ctx, rect, W, H) {
      if (!rect) return null;
      const d = ctx.getImageData(Math.round(rect.x0 * W), Math.round(rect.y0 * H), Math.max(1, Math.round((rect.x1 - rect.x0) * W)), Math.max(1, Math.round((rect.y1 - rect.y0) * H))).data;
      let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 64) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      r /= n; g /= n; b /= n; const m = Math.max(r, g, b) || 1;
      return `rgb(${Math.round((r / m) * 255)},${Math.round((g / m) * 255)},${Math.round((b / m) * 255)})`;
    }

    async function useWall(w) {
      st.wall = w; st.place = null; st.find = null;
      photo = await G.loadImg(w.src);
      const wi = $('#rs-wallin'); if (wi) wi.value = w.wallIn || 120;
      const quick = document.createElement('canvas'); quick.width = photo.width; quick.height = photo.height; quick.getContext('2d').drawImage(photo, 0, 0);
      st.find = heuristicWall(quick); draw();
      setStatus('Finding your wall with on-device AI…', true);
      try {
        const res = await aiWall(quick);
        if (st.wall !== w) return;
        if (res && res.rect) { st.find = res; st.place = null; draw(); setStatus(''); }
        else setStatus('The AI couldn\'t see a wall here, so it\'s placed on the clearest area. Drag to adjust.');
      } catch (e) {
        if (st.wall === w) setStatus('Placed automatically. The AI model couldn\'t load here, so drag to adjust.');
      }
      setTimeout(() => { if (status.textContent && !status.querySelector('.spin')) setStatus(''); }, 5000);
    }

    function renderThumbs() {
      const walls = loadWalls();
      $('[data-thumbs]').innerHTML = walls.map((w) => `<button type="button" class="rs-thumb" data-wall="${w.id}" style="background-image:url(${w.src})" aria-label="Use ${G.esc(w.name)}"><span data-delwall="${w.id}" aria-label="Remove">×</span></button>`).join('');
    }

    host.addEventListener('click', (e) => {
      const t = e.target.closest('button,[data-delwall]'); if (!t) return;
      if (t.dataset.delwall) { e.stopPropagation(); const ws = loadWalls().filter((w) => w.id !== t.dataset.delwall); saveWalls(ws); renderThumbs(); if (st.wall && st.wall.id === t.dataset.delwall) { st.wall = null; setStatus(''); draw(); } return; }
      if (t.dataset.scene) { st.scene = t.dataset.scene; st.paint = null; st.wall = null; setStatus(''); draw(); }
      if (t.dataset.paint) { st.paint = t.dataset.paint; draw(); }
      if (t.dataset.frame) { st.frame = t.dataset.frame; draw(); }
      if (t.dataset.light) { st.light = t.dataset.light; draw(); }
      if (t.dataset.wall) { const w = loadWalls().find((x) => x.id === t.dataset.wall); if (w) useWall(w); }
      if (t.hasAttribute('data-refind') && st.wall) useWall(st.wall);
      if (t.hasAttribute('data-glasses')) glasses();
    });
    $('[data-file]').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const w = await fileToWall(f); const ws = [w, ...loadWalls()]; saveWalls(ws); renderThumbs(); e.target.value = '';
      useWall(w);
    });
    const wi = $('#rs-wallin');
    if (wi) wi.addEventListener('change', () => { if (!st.wall) return; st.wall.wallIn = Math.max(24, Math.min(600, +wi.value || 120)); saveWalls(loadWalls().map((w) => (w.id === st.wall.id ? Object.assign(w, { wallIn: st.wall.wallIn }) : w))); draw(); });

    // drag the piece around your photo
    let drag = null;
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
    canvas.addEventListener('pointerdown', (e) => {
      if (!st.wall || !st.hit || st.wallpaper) return; const p = pt(e), h = st.hit;
      if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) { drag = { dx: p.x - (h.x + h.w / 2), dy: p.y - (h.y + h.h / 2) }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) { if (st.hit && st.wall) { const p = pt(e), h = st.hit; canvas.style.cursor = p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h ? 'grab' : ''; } return; }
      const p = pt(e); st.place = { cx: (p.x - drag.dx) / canvas.width, cy: (p.y - drag.dy) / canvas.height }; draw();
    });
    const end = () => { drag = null; canvas.style.cursor = ''; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

    function glasses() {
      const body = G.sheet(`<p class="eyebrow">Coming in the Gesso app</p>
        <h2 style="font-size:2rem;margin:8px 0 10px">See it on your wall with Meta glasses</h2>
        <ol class="gsteps">
          <li><b>Pair your Ray-Ban Meta glasses</b> with the Gesso iPhone app.</li>
          <li><b>Look at the wall</b> you're thinking about and tap capture on the glasses.</li>
          <li><b>Gesso finds the wall</b> in what your glasses saw and hangs this piece on it, to scale.</li>
          <li><b>Swap pieces hands-free</b> and save the ones you like to your collection.</li>
        </ol>
        <p class="muted" style="font-size:var(--t-s)">Until then, the same wall-finding works with any photo. Take one of your wall and add it here.</p>
        <div class="cta-row" style="margin-top:18px"><button class="btn primary" type="button" data-try>Use a photo instead</button><button class="btn" type="button" data-notify>Tell me when it's ready</button></div>`);
      body.querySelector('[data-try]').addEventListener('click', () => { G.closeSheet(); $('[data-file]').click(); });
      body.querySelector('[data-notify]').addEventListener('click', (e) => { e.target.textContent = "You're on the list (preview)"; e.target.disabled = true; });
    }

    (async () => {
      if (opts.img) st.img = await G.loadImg(opts.img);
      if (opts.wallpaper) { st.wallpaper = await G.loadImg(opts.wallpaper); st.scene = 'living'; }
      renderThumbs(); draw();
    })();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (photo || !st.wall) draw(); }, 120); });
    return { redraw: draw };
  };
})();
