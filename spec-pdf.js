/* ─────────────────────────────────────────────────────────────────────────────
   IMPRINT — Spec-sheet PDF generator  (manufacturer tech-pack)
   PORTRAIT A3 pages, high resolution.
   Page 1: manufacturing spec TABLE + Materials & colours (per-face CMYK, gamut-clamped)
   Page 2: 2D dielines (exterior + interior, cropped tight & scaled to fit)
   Page 3: 3D angle screenshots.
   No pricing — this file is for the factory.
   ──────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var AR = function () { return (typeof getLang === 'function' && getLang() === 'ar'); };
  function L(en, ar) { return AR() ? ar : en; }
  function _font(stack) { return stack || (AR() ? 'Cairo, Inter, Arial, sans-serif' : 'Inter, Helvetica, Arial, sans-serif'); }

  /* A3 PORTRAIT @ ~200 dpi (high-res, vertical) */
  var PW = 2339, PH = 3308, M = 150;
  var INK = '#1c1c1c', SUB = '#6b6b68', GOLD = '#c8a96e', LINE = '#e6e4df', CREAM = '#faf9f7', FAINT = '#f3f1ec';

  function newPage() {
    var cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
    var c = cv.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, PW, PH);
    return { cv: cv, c: c };
  }
  function TX(c, s, x, y, o) {
    o = o || {}; s = (s == null ? '' : '' + s);
    var size = o.size || 30, wt = o.weight || 400, col = o.color || INK, al = o.align || 'left';
    c.save();
    c.font = wt + ' ' + size + 'px ' + _font(o.font);
    c.fillStyle = col; c.textBaseline = o.baseline || 'alphabetic'; c.textAlign = al;
    if (o.rtl || (AR() && o.autoRtl !== false)) c.direction = 'rtl';
    c.fillText(s, x, y, o.maxw || undefined);
    c.restore();
  }
  function rule(c, x1, y, x2, col, w) { c.save(); c.strokeStyle = col || LINE; c.lineWidth = w || 2; c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke(); c.restore(); }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function swatch(c, x, y, hex, sz) { sz = sz || 34; c.save(); roundRect(c, x, y, sz, sz, 6); c.fillStyle = hex || '#fff'; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; c.stroke(); c.restore(); }

  function header(c, title) {
    TX(c, 'IMPRINT', M, 132, { size: 48, weight: 800, color: INK, rtl: false });
    c.save(); c.fillStyle = GOLD; c.beginPath(); c.arc(M + 272, 104, 6, 0, 6.3); c.fill(); c.restore();
    TX(c, L('CUSTOM PAPER-BAG SPEC SHEET — FACTORY', 'ورقة مواصفات الكيس — للمصنع'), PW - M, 126, { size: 21, weight: 600, color: SUB, align: 'right' });
    rule(c, M, 160, PW - M, GOLD, 3);
    if (title) TX(c, title, M, 240, { size: 42, weight: 800, color: INK });
  }
  function footer(c, ref, pageNo, pageTot) {
    rule(c, M, PH - 108, PW - M, LINE, 2);
    TX(c, 'IMPRINT® · ' + ref, M, PH - 64, { size: 21, color: SUB, rtl: false });
    TX(c, L('Page ', 'صفحة ') + pageNo + ' / ' + pageTot, PW - M, PH - 64, { size: 21, color: SUB, align: 'right' });
  }
  function section(c, y, label, x) {
    x = x || M;
    c.save(); c.fillStyle = GOLD; c.fillRect(x, y - 22, 6, 28); c.restore();
    TX(c, label, x + 20, y, { size: 28, weight: 700, color: INK });
    return y + 28;
  }

  function _hexUp(h) { return (h || '').toUpperCase(); }
  function _capFinish(s) { s = (s || ''); return s.charAt(0).toUpperCase() + s.slice(1).replace('softtouch', 'Soft Touch').replace('foil', 'Foil Stamp'); }
  function _faceName(f) { return AR() ? ({ front: 'أمامي', back: 'خلفي', left: 'يسار', right: 'يمين', base: 'قاعدة' }[f] || f) : (f.charAt(0).toUpperCase() + f.slice(1)); }

  /* ── colour helpers (CMYK gamut clamp) ── */
  function _hexToRgb(h) { h = ('' + (h || '')).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); if (h.length < 6) return null; var n = parseInt(h.slice(0, 6), 16); return isNaN(n) ? null : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
  function _hue(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return h; }
  /* closest in-gamut hex = round-trip the colour through CMYK (the printable space) */
  function _gamutHex(hex) { try { if (window.IMP_COLOR && IMP_COLOR.cmykToHex && IMP_COLOR.hexToCmyk) return IMP_COLOR.cmykToHex(IMP_COLOR.hexToCmyk(hex)); } catch (_) {} return hex; }
  function _foilClass(hex) { var c = _hexToRgb(hex); if (!c) return null; var mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); if ((mx + mn) / 510 > 0.82) return 'silver'; var h = _hue(c.r, c.g, c.b); if (h >= 150 && h <= 210) return 'silver'; if (h >= 18 && h <= 75) return 'gold'; return null; }
  function _layerHex(L) { if (!L) return null; if (L.color) return L.color; try { if (L.recolor && L.recolor.extracted && L.recolor.extracted.length) { var e = L.recolor.extracted[0]; return e.to || e.hex || (typeof e === 'string' ? e : null); } } catch (_) {} return null; }
  function _specData() {
    var ext = (typeof BAG !== 'undefined' && BAG.exterior && BAG.exterior.finish) || 'matte';
    var layers = (typeof BAG !== 'undefined' && BAG.artwork && BAG.artwork.layers) ? BAG.artwork.layers.filter(function (L) { return L && L.visible; }) : [];
    var silver = false, gold = false;
    layers.forEach(function (L) { if (L.finish === 'foil') { if (_foilClass(_layerHex(L)) === 'gold') gold = true; else silver = true; } });
    if (ext === 'foil') { if (_foilClass(BAG.exterior.color) === 'gold') gold = true; else silver = true; }
    var mdl = (typeof currentBagModel !== 'undefined') ? currentBagModel : 'wide';
    return {
      type: (ext === 'kraft') ? 'texture' : (ext === 'gloss' || ext === 'foil') ? 'glossy' : 'matt',
      spotUV: ext === 'gloss' || layers.some(function (L) { return L.finish === 'gloss'; }),
      emboss: layers.some(function (L) { return L.extrude > 0; }),
      deboss: layers.some(function (L) { return L.extrude < 0; }),
      silver: silver, gold: gold,
      horiz: (mdl === 'wide' || mdl === 'gift')
    };
  }

  /* ── spec TABLE (bordered grid, dark headers) ── */
  function _chkbox(c, x, y, sz, on) {
    c.save(); roundRect(c, x, y, sz, sz, 5); c.fillStyle = on ? GOLD : '#ffffff'; c.fill();
    c.strokeStyle = on ? GOLD : '#c2bdb2'; c.lineWidth = 2; c.stroke();
    if (on) { c.strokeStyle = '#fff'; c.lineWidth = Math.max(2.5, sz * 0.13); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x + sz * 0.23, y + sz * 0.53); c.lineTo(x + sz * 0.42, y + sz * 0.72); c.lineTo(x + sz * 0.78, y + sz * 0.28); c.stroke(); }
    c.restore();
  }
  function _measure(c, s, size, wt) { c.save(); c.font = (wt || 400) + ' ' + size + 'px ' + _font(); var w = c.measureText('' + s).width; c.restore(); return w; }
  var TBL_HDR = 50, TBL_OPT_FS = 21, TBL_OPT_SZ = 26, TBL_LINE = 42, TBL_PADX = 16;
  function _cellHeight(c, cell, colW) {
    var bodyH;
    if (cell.kind === 'val') { bodyH = cell.cmykTxt ? 96 : 56; }
    else {
      var lines = 1, ox = TBL_PADX;
      cell.opts.forEach(function (o) { var tw = _measure(c, o.t, TBL_OPT_FS, 600); if (ox > TBL_PADX && ox + TBL_OPT_SZ + 9 + tw > colW - TBL_PADX) { lines++; ox = TBL_PADX; } ox += TBL_OPT_SZ + 9 + tw + 22; });
      bodyH = lines * TBL_LINE + 18;
    }
    return TBL_HDR + bodyH + 14;
  }
  function _drawCell(c, x, y, w, h, cell) {
    c.save(); c.strokeStyle = '#cbc6bb'; c.lineWidth = 2.5; c.strokeRect(x, y, w, h); c.restore();   /* bold cell border */
    c.save(); c.fillStyle = INK; c.fillRect(x, y, w, TBL_HDR); c.restore();                            /* dark header bar */
    TX(c, cell.title, x + TBL_PADX, y + 33, { size: 21, weight: 700, color: '#fff' });
    var by = y + TBL_HDR + 38;
    if (cell.kind === 'val') {
      var vx = x + TBL_PADX;
      if (cell.hex) { swatch(c, vx, by - 28, cell.hex, 32); vx += 44; }
      TX(c, cell.value, vx, by, { size: 23, weight: 600, color: INK, autoRtl: false });
      if (cell.cmykTxt) TX(c, cell.cmykTxt, x + TBL_PADX, by + 40, { size: 18, color: cell.adj ? '#b8860b' : SUB, autoRtl: false });
    } else {
      var ox = x + TBL_PADX, lineY = by;
      cell.opts.forEach(function (o) {
        var tw = _measure(c, o.t, TBL_OPT_FS, o.on ? 600 : 400);
        if (ox > x + TBL_PADX && ox + TBL_OPT_SZ + 9 + tw > x + w - TBL_PADX) { ox = x + TBL_PADX; lineY += TBL_LINE; }
        _chkbox(c, ox, lineY - TBL_OPT_SZ + 4, TBL_OPT_SZ, o.on);
        TX(c, o.t, ox + TBL_OPT_SZ + 9, lineY, { size: TBL_OPT_FS, weight: o.on ? 600 : 400, color: o.on ? INK : SUB, autoRtl: false });
        ox += TBL_OPT_SZ + 9 + tw + 22;
      });
    }
  }
  function _specTable(c, x, y, totalW, cells, cols) {
    var colW = totalW / cols, i, r;
    for (r = 0; r < cells.length; r += cols) {
      var row = cells.slice(r, r + cols), rowH = 0;
      row.forEach(function (cell) { rowH = Math.max(rowH, _cellHeight(c, cell, colW)); });
      for (i = 0; i < row.length; i++) _drawCell(c, x + i * colW, y, colW, rowH, row[i]);
      y += rowH;
    }
    return y;
  }

  /* per-face colour row (materials) — gamut-clamped swatch + CMYK + ≈Pantone */
  function _faceColorRow(c, x, y, w, label, hex) {
    var sp = window.IMP_COLOR ? IMP_COLOR.formatSpec(hex) : null;
    var oog = !!(sp && sp.outOfGamut), disp = oog ? _gamutHex(hex) : hex;
    TX(c, label, x, y, { size: 22, color: SUB });
    swatch(c, x + w - 36, y - 26, disp, 32);
    TX(c, _hexUp(disp), x + w - 52, y, { size: 22, weight: 600, color: INK, align: 'right', autoRtl: false });
    if (sp) {
      var line = sp.cmykStr + '  ·  ' + (sp.pantoneExact ? 'PMS ' : '≈ PMS ') + sp.pantone + (oog ? ('  · ' + L('CMYK-adjusted', 'مُعدَّل لنطاق CMYK')) : '');
      TX(c, line, x, y + 32, { size: 18, color: oog ? '#b8860b' : SUB, autoRtl: false });
    }
    rule(c, x, y + 48, x + w, FAINT, 1.4);
    return y + 76;
  }

  /* ── capture helpers ── */
  function _raf() { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }
  function _sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function _capture3D(theta, phi) {
    try {
      if (!T || !T.renderer || !T.scene || !orbit || typeof bagGroup === 'undefined' || !bagGroup) return null;
      var box = new THREE.Box3().setFromObject(bagGroup), sph = box.getBoundingSphere(new THREE.Sphere());
      var fov = (T.camera.fov || 31) * Math.PI / 180, d = sph.radius / Math.sin(fov / 2) * 1.12;
      var bg = T.scene.background; T.scene.background = null;
      var hidden = [];
      T.scene.children.forEach(function (ch) {
        var isLight = ch.isLight || /Light/.test(ch.type) || ch === T.lightRig;
        if (ch !== bagGroup && !isLight && ch.visible) { hidden.push(ch); ch.visible = false; }
      });
      var tgt = { x: orbit.target.x, y: orbit.target.y, z: orbit.target.z };
      orbit.target.set(sph.center.x, sph.center.y, sph.center.z);
      orbit.theta = theta; orbit.phi = Math.max(0.08, Math.min(Math.PI - 0.08, phi)); orbit.radius = d; orbit.autoSpin = false;
      if (typeof sphericalToCamera === 'function') sphericalToCamera();
      T.renderer.render(T.scene, T.camera);
      var url = T.renderer.domElement.toDataURL('image/png');
      hidden.forEach(function (ch) { ch.visible = true; }); T.scene.background = bg;
      orbit.target.set(tgt.x, tgt.y, tgt.z);
      return url;
    } catch (e) { console.warn('3D capture failed', e); return null; }
  }
  function _dimBracket(c, vertical, a, b0, b1, txt, fs) {
    fs = fs || 26; var T = Math.max(9, fs * 0.55);
    c.save(); c.strokeStyle = '#a99a7d'; c.lineWidth = Math.max(2, fs * 0.10); c.lineCap = 'round'; c.beginPath();
    if (vertical) { c.moveTo(a, b0); c.lineTo(a, b1); c.moveTo(a - T, b0); c.lineTo(a + T, b0); c.moveTo(a - T, b1); c.lineTo(a + T, b1); }
    else { c.moveTo(b0, a); c.lineTo(b1, a); c.moveTo(b0, a - T); c.lineTo(b0, a + T); c.moveTo(b1, a - T); c.lineTo(b1, a + T); }
    c.stroke(); c.restore();
    var mid = (b0 + b1) / 2;
    if (vertical) { c.save(); c.translate(a - fs * 0.7, mid); c.rotate(-Math.PI / 2); TX(c, txt, 0, 0, { size: fs, weight: 700, color: '#5a5446', align: 'center', autoRtl: false }); c.restore(); }
    else TX(c, txt, mid, a - fs * 0.5, { size: fs, weight: 700, color: '#5a5446', align: 'center', baseline: 'alphabetic', autoRtl: false });   /* number ABOVE the line */
  }
  function _dieDims(s) { var m = ('' + (s || '')).match(/\d+(?:\.\d+)?/g); return (m && m.length >= 2) ? m.map(parseFloat) : null; }

  /* Flat dieline of a region — cropped TIGHT to its own island (no neighbour leak), off-island
     grayish, artwork clipped to the island, optional L×H×W brackets. */
  function _capture2D(region, opts) {
    try {
      opts = opts || {};
      if (typeof bagCleanCanvas === 'undefined' || !bagCleanCanvas) return null;
      var clip = (region === 'handles') ? (typeof bagHandleClip !== 'undefined' ? bagHandleClip : null)
               : (region === 'interior') ? (typeof bagIntClip !== 'undefined' ? bagIntClip : null)
               : (typeof bagExtClip !== 'undefined' ? bagExtClip : null);
      var uv = (clip && clip.bbox) ? clip.bbox : ((typeof BAG_UV !== 'undefined') ? BAG_UV[region] : null);
      if (!uv) return null;
      var measuring = !!(opts.measure && _dieDims(opts.dims));
      var FS = Math.round(Math.min(uv.w, uv.h) * 0.045);
      var GAP = Math.round(FS * 1.4);
      var MARG = Math.round(measuring ? (GAP + FS * 2.8) : Math.min(uv.w, uv.h) * 0.06);   /* uniform, flip-safe */
      var ox = uv.x - MARG, oy = uv.y - MARG, ow = uv.w + 2 * MARG, oh = uv.h + 2 * MARG;
      var cw = Math.round(ow), ch = Math.round(oh);
      var cn = document.createElement('canvas'); cn.width = cw; cn.height = ch; var x = cn.getContext('2d');
      x.fillStyle = FAINT; x.fillRect(0, 0, cw, ch);
      var sx = cw / ow, sy = ch / oh;
      var atlasW = (typeof bagTexCanvas !== 'undefined' && bagTexCanvas) ? bagTexCanvas.width : 2048;
      x.save();
      x.translate(0, ch); x.scale(1, -1); x.scale(sx, sy); x.translate(-ox, -oy);
      /* clip EVERYTHING (artwork + guide) to this region's island → no neighbour outlines leak in */
      if (clip && clip.path) { x.beginPath(); x.clip(clip.path); }
      if (region === 'handles') {
        if (clip && clip.path) { x.fillStyle = (typeof BAG !== 'undefined' && BAG.ribbon && BAG.ribbon.color) || '#cccccc'; x.fill(clip.path); }
      } else {
        x.drawImage(bagCleanCanvas, 0, 0);
        if (typeof bagUVGuideCanvas !== 'undefined' && bagUVGuideCanvas) x.drawImage(bagUVGuideCanvas, 0, 0, bagUVGuideCanvas.width, bagUVGuideCanvas.height, 0, 0, atlasW, atlasW);
      }
      x.restore();
      if (measuring) {
        var dd = _dieDims(opts.dims), faces = (typeof BAG_FACES !== 'undefined' && BAG_FACES[region]) || {};
        var disp = function (bb) { var x0 = (bb.x - ox) * sx, x1 = (bb.x + bb.w - ox) * sx, y0 = ch - (bb.y - oy) * sy, y1 = ch - (bb.y + bb.h - oy) * sy; return { l: Math.min(x0, x1), r: Math.max(x0, x1), t: Math.min(y0, y1), b: Math.max(y0, y1) }; };
        var side = faces.left || faces.right, hface = side || faces.front;
        if (faces.front) { var fr = disp(faces.front); _dimBracket(x, false, fr.t - GAP, fr.l, fr.r, 'L/' + dd[0] + ' cm', FS); }
        if (hface) { var hr = disp(hface); _dimBracket(x, true, hr.l - GAP, hr.t, hr.b, 'H/' + dd[1] + ' cm', FS); }
        if (side && dd[2] != null) { var sr = disp(side); _dimBracket(x, false, sr.t - GAP, sr.l, sr.r, 'W/' + dd[2] + ' cm', FS); }
      }
      return cn.toDataURL('image/png');
    } catch (e) { console.warn('2D capture failed', e); return null; }
  }

  /* draw an image into a box, contained + CLIPPED to the box so it can never leak out */
  function placeImg(c, url, x, y, w, h, label) {
    roundRect(c, x, y, w, h, 14); c.save(); c.fillStyle = FAINT; c.fill(); c.strokeStyle = LINE; c.lineWidth = 2; c.stroke(); c.restore();
    if (label) TX(c, label, x + 20, y + 40, { size: 23, weight: 600, color: SUB });
    if (!url) { TX(c, '—', x + w / 2, y + h / 2, { size: 36, color: SUB, align: 'center', baseline: 'middle' }); return; }
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        var pad = 24, top = label ? 56 : pad;
        var bw = w - pad * 2, bh = h - top - pad;
        var s = Math.min(bw / im.width, bh / im.height);
        var dw = im.width * s, dh = im.height * s;
        c.save(); roundRect(c, x, y, w, h, 14); c.clip();   /* never overflow / leak past the card */
        c.drawImage(im, x + (w - dw) / 2, y + top + (bh - dh) / 2, dw, dh);
        c.restore();
        res();
      };
      im.onerror = function () { res(); };
      im.src = url;
    });
  }

  function _ref() { return 'IMP-' + (Date.now().toString(36).toUpperCase().slice(-7)); }
  function _today() { try { return new Date().toLocaleDateString(AR() ? 'ar' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return new Date().toDateString(); } }

  /* ── main ── */
  window.generateSpecPDF = async function (btn) {
    var jspdf = window.jspdf || window.jsPDF; var JsPDF = jspdf && (jspdf.jsPDF || jspdf);
    if (!JsPDF) { alert('PDF library not loaded.'); return; }
    var label = btn ? btn.querySelector('span') : null, oldTxt = label ? label.textContent : '';
    if (label) label.textContent = L('Generating…', 'جارٍ الإنشاء…'); if (btn) btn.disabled = true;
    var _q = {};
    try {
      var model = (typeof BAG_MODELS !== 'undefined' && BAG_MODELS[currentBagModel]) ? BAG_MODELS[currentBagModel] : { label: 'Paper bag', dims: '' };
      var dims = (typeof S !== 'undefined' && S.dims) ? S.dims : (model.dims || '');
      var qty = (typeof S !== 'undefined' && S.qty) ? S.qty : 0;
      var ref = _ref(), date = _today();

      var prevMode = (typeof viewMode !== 'undefined') ? viewMode : '3d';
      if (prevMode === '2d' && typeof setViewMode === 'function') { setViewMode('3d'); await _raf(); await _raf(); }

      /* MAX-RES boost for export (restored after) */
      try { _q.guide = (typeof A2D !== 'undefined') ? A2D.guideRes : null; if (typeof A2D !== 'undefined') { A2D.guideRes = 4096; if (typeof buildUVGuide === 'function') buildUVGuide(); } } catch (e) {}
      try { if (T && T.renderer) { _q.pr = T.renderer.getPixelRatio(); T.renderer.setPixelRatio(3); } } catch (e) {}
      try { _q.pbrExp = (typeof PBR_SIZE !== 'undefined') ? Math.round(Math.log(PBR_SIZE) / Math.LN2) : null; if (typeof onFinishQuality === 'function') onFinishQuality(12); } catch (e) {}
      await _sleep(380);

      var sv = orbit ? { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius, autoSpin: orbit.autoSpin } : null;
      var ft = (typeof frontTheta === 'function') ? frontTheta() : 0.6;
      var VP = (typeof VIEW_PHI !== 'undefined') ? VIEW_PHI : 1.2;
      var shots = {};
      shots.front = _capture3D(ft, VP);
      shots.back = _capture3D(ft + Math.PI, VP);
      shots.right = _capture3D(ft - Math.PI / 2, VP);
      shots.left = _capture3D(ft + Math.PI / 2, VP);
      shots.top = _capture3D(ft, 0.18);
      shots.bottom = _capture3D(ft, Math.PI - 0.18);
      if (sv && orbit) { orbit.theta = sv.theta; orbit.phi = sv.phi; orbit.radius = sv.radius; orbit.autoSpin = sv.autoSpin; if (typeof sphericalToCamera === 'function') sphericalToCamera(); if (typeof realismRender === 'function') realismRender(); }
      /* TIGHT per-region crop so exterior & interior never leak into each other */
      var dieExt = _capture2D('exterior', { measure: true, dims: dims }), dieInt = _capture2D('interior', { measure: true, dims: dims });
      if (prevMode === '2d' && typeof setViewMode === 'function') setViewMode('2d');

      try { if (_q.pbrExp != null && typeof onFinishQuality === 'function') onFinishQuality(_q.pbrExp); } catch (e) {}
      try { if (_q.guide != null && typeof A2D !== 'undefined') { A2D.guideRes = _q.guide; if (typeof buildUVGuide === 'function') buildUVGuide(); } } catch (e) {}
      try { if (_q.pr != null && T && T.renderer) T.renderer.setPixelRatio(_q.pr); } catch (e) {}

      var pages = [], jobs = [], c;

      /* ── PAGE 1 — spec table + materials & colours ── */
      var sd = _specData();
      var hc = (typeof BAG !== 'undefined' && BAG.ribbon) ? BAG.ribbon.color : null;
      var hcSp = (hc && window.IMP_COLOR) ? IMP_COLOR.formatSpec(hc) : null;
      var hcOog = !!(hcSp && hcSp.outOfGamut), hcHex = hc ? (hcOog ? _gamutHex(hc) : hc) : null;
      var hcCmyk = hcSp ? (hcSp.cmykStr + '  ·  ' + (hcSp.pantoneExact ? 'PMS ' : '≈ PMS ') + hcSp.pantone + (hcOog ? '  · ' + L('CMYK-adj', 'مُعدَّل') : '')) : '';
      var cells = [
        { title: L('Size (L×H×W)', 'المقاس'), kind: 'val', value: dims || '—' },
        { title: L('Type', 'النوع'), kind: 'opts', opts: [{ t: L('Matt lamination', 'لامينيت مطفي'), on: sd.type === 'matt' }, { t: L('Gloss lamination', 'لامينيت لامع'), on: sd.type === 'glossy' }, { t: L('Texture paper', 'ورق محبب'), on: sd.type === 'texture' }] },
        { title: L('Thickness', 'السماكة'), kind: 'opts', opts: [{ t: '250 gsm', on: true }, { t: '300 gsm', on: false }, { t: '350 gsm', on: false }] },
        { title: L('Direction', 'الاتجاه'), kind: 'opts', opts: [{ t: L('Horizontal', 'أفقي'), on: sd.horiz }, { t: L('Vertical', 'عمودي'), on: !sd.horiz }] },
        { title: L('Quantity (MOQ)', 'الكمية'), kind: 'val', value: qty.toLocaleString() + ' ' + L('pcs', 'قطعة') },
        { title: L('Handle type', 'نوع المقبض'), kind: 'opts', opts: [{ t: L('Satin ribbon', 'شريط ساتان'), on: true }, { t: L('Grosgrain', 'غروغرين'), on: false }, { t: L('Cotton rope', 'حبل قطني'), on: false }] },
        { title: L('Handle method', 'تركيب المقبض'), kind: 'opts', opts: [{ t: L('Shoe buckle', 'إبزيم'), on: false }, { t: L('Tie knot', 'عقدة'), on: false }, { t: L('Eyelet', 'عيون'), on: false }, { t: L('Embedded', 'مدمج'), on: true }] },
        { title: L('Handle size', 'مقاس المقبض'), kind: 'opts', opts: [{ t: L('Normal', 'عادي'), on: true }, { t: L('Long', 'طويل'), on: false }] },
        { title: L('Surface treatment', 'المعالجة السطحية'), kind: 'opts', opts: [{ t: L('Gold foil', 'ختم ذهبي'), on: sd.gold }, { t: L('Silver foil', 'ختم فضي'), on: sd.silver }, { t: L('Spot UV', 'يو في موضعي'), on: sd.spotUV }, { t: L('Embossing', 'نقش بارز'), on: sd.emboss }, { t: L('Debossing', 'نقش غائر'), on: sd.deboss }] },
        { title: L('Bottom', 'القاعدة'), kind: 'opts', opts: [{ t: L('Full paste', 'لصق كامل'), on: true }, { t: L('Normal paste', 'لصق عادي'), on: false }] },
        { title: L('Paper inside', 'الورق الداخلي'), kind: 'opts', opts: [{ t: L('Brand new', 'أبيض جديد'), on: true }, { t: L('Normal grey', 'رمادي'), on: false }] },
        { title: L('Handle colour', 'لون المقبض'), kind: 'val', value: hcHex ? _hexUp(hcHex) : '—', hex: hcHex, cmykTxt: hcCmyk, adj: hcOog },
        { title: L('Ribbon bow', 'فيونكة'), kind: 'opts', opts: [{ t: L('Yes', 'نعم'), on: false }, { t: L('No', 'لا'), on: true }] },
        { title: L('Ribbon method', 'طريقة الشريط'), kind: 'opts', opts: [{ t: L('Hole & ribbon', 'ثقب وشريط'), on: true }, { t: L('Sticker', 'ملصق'), on: false }, { t: L('Embedded', 'مدمج'), on: false }] }
      ];
      var p1 = newPage(); c = p1.c;
      header(c, L('Product spec sheet', 'ورقة مواصفات المنتج'));
      TX(c, model.label, M, 320, { size: 36, weight: 700, color: INK });
      TX(c, L('Ref ', 'مرجع ') + ref + '  ·  ' + date, M, 366, { size: 24, color: SUB });
      var tEnd = _specTable(c, M, 420, PW - 2 * M, cells, 4);
      /* Materials & colours — exterior left, interior right (gamut-clamped) */
      var my = section(c, tEnd + 70, L('Materials & colours (print)', 'الخامات والألوان (طباعة)')) + 44;
      var mcolW = (PW - 2 * M - 60) / 2, mLX = M, mRX = M + mcolW + 60;
      function colorBlock(title, region, bx, bw, by) {
        var yy = section(c, by, title, bx) + 38;
        yy = _faceColorRow(c, bx, yy, bw, L('Base · ', 'أساسي · ') + _capFinish(BAG[region].finish), BAG[region].color);
        var fc = BAG[region].faceColors || {}, faces = (typeof BAG_FACES !== 'undefined' && BAG_FACES[region]) ? Object.keys(BAG_FACES[region]) : ['front', 'back', 'left', 'right', 'base'];
        faces.forEach(function (f) { var hex = fc[f] || BAG[region].color; yy = _faceColorRow(c, bx, yy, bw, _faceName(f) + (fc[f] ? '' : '  ' + L('(base)', '(أساسي)')), hex); });
        return yy;
      }
      colorBlock(L('Exterior faces', 'أوجه الخارج'), 'exterior', mLX, mcolW, my);
      colorBlock(L('Interior faces', 'أوجه الداخل'), 'interior', mRX, mcolW, my);
      footer(c, ref, 1, 3); pages.push(p1);

      /* ── PAGE 2 — 2D dieline layout ── */
      var p2 = newPage(); c = p2.c; header(c, L('2D dieline layout', 'مخطط القص المسطّح'));
      var dW = PW - 2 * M, dH = 1180, dY = 320;
      jobs.push(placeImg(c, dieExt, M, dY, dW, dH, L('Exterior layout', 'مخطط الخارج')));
      jobs.push(placeImg(c, dieInt, M, dY + dH + 40, dW, dH, L('Interior layout', 'مخطط الداخل')));
      footer(c, ref, 2, 3); pages.push(p2);

      /* ── PAGE 3 — 3D views (2 cols × 3 rows) ── */
      var p3 = newPage(); c = p3.c; header(c, L('3D views', 'مناظر ثلاثية الأبعاد'));
      var gap = 40, cols = 2, gw = (PW - 2 * M - (cols - 1) * gap) / cols, gh = (PH - 320 - 150 - 2 * gap) / 3, gy = 320;
      var grid = [['front', L('Front', 'أمامي')], ['back', L('Back', 'خلفي')], ['left', L('Left', 'يسار')], ['right', L('Right', 'يمين')], ['top', L('Top', 'أعلى')], ['bottom', L('Bottom', 'أسفل')]];
      grid.forEach(function (g, i) { var col = i % cols, row = (i / cols) | 0; jobs.push(placeImg(c, shots[g[0]], M + col * (gw + gap), gy + row * (gh + gap), gw, gh, g[1])); });
      footer(c, ref, 3, 3); pages.push(p3);

      await Promise.all(jobs);

      /* ── assemble PDF — A3 portrait, PNG pages (high-res for the factory) ── */
      var doc = new JsPDF({ unit: 'mm', format: 'a3', orientation: 'portrait' });
      pages.forEach(function (pg, i) {
        if (i > 0) doc.addPage();
        doc.addImage(pg.cv.toDataURL('image/png'), 'PNG', 0, 0, 297, 420, undefined, 'FAST');
      });
      doc.save('IMPRINT_' + (model.key || 'PaperBag') + '_' + ref + '.pdf');
    } catch (e) {
      console.error('spec PDF failed', e);
      try { if (_q.pbrExp != null && typeof onFinishQuality === 'function') onFinishQuality(_q.pbrExp); } catch (e2) {}
      try { if (_q.guide != null && typeof A2D !== 'undefined') { A2D.guideRes = _q.guide; if (typeof buildUVGuide === 'function') buildUVGuide(); } } catch (e2) {}
      try { if (_q.pr != null && T && T.renderer) T.renderer.setPixelRatio(_q.pr); } catch (e2) {}
      alert(L('Sorry — the PDF could not be generated.', 'تعذّر إنشاء ملف PDF.'));
    } finally {
      if (label) label.textContent = oldTxt; if (btn) btn.disabled = false;
    }
  };
})();
