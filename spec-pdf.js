/* ─────────────────────────────────────────────────────────────────────────────
   IMPRINT — Spec-sheet PDF generator
   Builds a branded multi-page tech-pack: cover (hero 3/4), specs + colours
   (per-face hex), artwork layers, 3D angle screenshots and the 2D dielines.
   Each page is drawn to a canvas (so Arabic shapes natively) and packed into a
   PDF via jsPDF (vendor/jspdf). Language follows the site language.
   ──────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var AR = function () { return (typeof getLang === 'function' && getLang() === 'ar'); };
  function L(en, ar) { return AR() ? ar : en; }
  function _font(stack) { return stack || (AR() ? 'Cairo, Inter, Arial, sans-serif' : 'Inter, Helvetica, Arial, sans-serif'); }

  /* A4 portrait @ ~150dpi */
  var PW = 1240, PH = 1754, M = 96;
  var INK = '#1c1c1c', SUB = '#6b6b68', GOLD = '#c8a96e', LINE = '#e6e4df', CREAM = '#faf9f7', FAINT = '#f3f1ec';

  function newPage() {
    var cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
    var c = cv.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, PW, PH);
    return { cv: cv, c: c };
  }
  function TX(c, s, x, y, o) {
    o = o || {}; s = (s == null ? '' : '' + s);
    var size = o.size || 26, wt = o.weight || 400, col = o.color || INK, al = o.align || 'left';
    c.save();
    c.font = wt + ' ' + size + 'px ' + _font(o.font);
    c.fillStyle = col; c.textBaseline = o.baseline || 'alphabetic'; c.textAlign = al;
    if (o.rtl || (AR() && o.autoRtl !== false)) c.direction = 'rtl';
    c.fillText(s, x, y, o.maxw || undefined);
    c.restore();
  }
  function rule(c, x1, y, x2, col, w) { c.save(); c.strokeStyle = col || LINE; c.lineWidth = w || 1.5; c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke(); c.restore(); }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function swatch(c, x, y, hex, sz) { sz = sz || 26; c.save(); roundRect(c, x, y, sz, sz, 6); c.fillStyle = hex || '#fff'; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1.5; c.stroke(); c.restore(); }

  function header(c, title) {
    /* wordmark */
    TX(c, 'IMPRINT', M, 96, { size: 40, weight: 800, color: INK, rtl: false });
    c.save(); c.fillStyle = GOLD; c.beginPath(); c.arc(M + 232, 70, 5, 0, 6.3); c.fill(); c.restore();
    TX(c, L('CUSTOM PAPER-BAG SPEC SHEET', 'ورقة مواصفات الكيس الورقي'), PW - M, 92, { size: 19, weight: 600, color: SUB, align: 'right' });
    rule(c, M, 120, PW - M, GOLD, 2);
    if (title) TX(c, title, M, 178, { size: 34, weight: 800, color: INK });
  }
  function footer(c, ref, pageNo, pageTot) {
    rule(c, M, PH - 80, PW - M, LINE, 1.5);
    TX(c, 'IMPRINT® · ' + ref, M, PH - 50, { size: 18, color: SUB, rtl: false });
    TX(c, L('Page ', 'صفحة ') + pageNo + ' / ' + pageTot, PW - M, PH - 50, { size: 18, color: SUB, align: 'right' });
  }

  /* section label */
  function section(c, y, label) {
    c.save(); c.fillStyle = GOLD; c.fillRect(M, y - 16, 5, 22); c.restore();
    TX(c, label, M + 16, y, { size: 24, weight: 700, color: INK });
    return y + 22;
  }
  /* key/value row; optional swatch hex */
  function kv(c, x, y, w, label, value, hex) {
    TX(c, label, x, y, { size: 21, color: SUB });
    var vx = x + w;
    if (hex) { swatch(c, vx - 30, y - 19, hex, 26); vx -= 42; }
    TX(c, value, vx, y, { size: 21, weight: 600, color: INK, align: 'right' });
    rule(c, x, y + 16, x + w, FAINT, 1.2);
  }

  function _hexUp(h) { return (h || '').toUpperCase(); }
  function _capFinish(s) { s = (s || ''); return s.charAt(0).toUpperCase() + s.slice(1).replace('softtouch', 'Soft Touch').replace('foil', 'Foil Stamp'); }
  function _faceName(f) { return AR() ? ({ front: 'أمامي', back: 'خلفي', left: 'يسار', right: 'يمين', base: 'قاعدة' }[f] || f) : (f.charAt(0).toUpperCase() + f.slice(1)); }

  /* ── capture helpers ─────────────────────────────────────────────────── */
  function _raf() { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }
  /* Clean isolated bag render: no floor/shadow/sky/post-fx, framed to fit. */
  function _capture3D(theta, phi) {
    try {
      if (!T || !T.renderer || !T.scene || !orbit || typeof bagGroup === 'undefined' || !bagGroup) return null;
      var box = new THREE.Box3().setFromObject(bagGroup), sph = box.getBoundingSphere(new THREE.Sphere());
      var fov = (T.camera.fov || 31) * Math.PI / 180, d = sph.radius / Math.sin(fov / 2) * 1.12;
      /* hide everything except the bag + lights, drop the sky background */
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
      T.renderer.render(T.scene, T.camera);   /* plain render → no bloom / SSAO / vignette */
      var url = T.renderer.domElement.toDataURL('image/png');
      hidden.forEach(function (ch) { ch.visible = true; }); T.scene.background = bg;
      orbit.target.set(tgt.x, tgt.y, tgt.z);
      return url;
    } catch (e) { console.warn('3D capture failed', e); return null; }
  }

  /* Parse a dims string like "28 × 20 × 14 cm" → [W,H,D] (numbers) or null. */
  function _dieDims(s) { var m = ('' + (s || '')).match(/\d+(?:\.\d+)?/g); return (m && m.length >= 2) ? m.map(parseFloat) : null; }
  /* A dimension bracket: a thin line + end ticks + a centred "<n> cm" label.
     vertical → runs along Y at screen-x `a`, between b0..b1 (label rotated, to the left);
     horizontal → runs along X at screen-y `a`, between b0..b1 (label below). */
  function _dimBracket(c, vertical, a, b0, b1, txt) {
    var T = 9;
    c.save(); c.strokeStyle = '#a99a7d'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath();
    if (vertical) { c.moveTo(a, b0); c.lineTo(a, b1); c.moveTo(a - T, b0); c.lineTo(a + T, b0); c.moveTo(a - T, b1); c.lineTo(a + T, b1); }
    else { c.moveTo(b0, a); c.lineTo(b1, a); c.moveTo(b0, a - T); c.lineTo(b0, a + T); c.moveTo(b1, a - T); c.lineTo(b1, a + T); }
    c.stroke(); c.restore();
    var mid = (b0 + b1) / 2;
    if (vertical) { c.save(); c.translate(a - 14, mid); c.rotate(-Math.PI / 2); TX(c, txt, 0, 0, { size: 19, weight: 700, color: SUB, align: 'center', autoRtl: false }); c.restore(); }
    else TX(c, txt, mid, a + 28, { size: 19, weight: 700, color: SUB, align: 'center', autoRtl: false });
  }

  /* Flat dieline of a region (exterior | interior | handles): the clean artwork CLIPPED to the
     island (off-island UVs → transparent, so the grayish card colour shows through), the UV-guide
     outline, and optional W×H×D measurement brackets. No per-face sub-labels. */
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
      var padR = uv.w * 0.07, padBot = uv.h * 0.07;
      var mL = measuring ? uv.w * 0.15 : padR;     /* left margin for the height bracket */
      var mT = measuring ? uv.h * 0.15 : padBot;   /* top margin for the width / depth brackets */
      var ox = uv.x - mL, oy = uv.y - mT, ow = uv.w + mL + padR, oh = uv.h + mT + padBot;
      var cw = Math.round(ow), ch = Math.round(oh);
      var cn = document.createElement('canvas'); cn.width = cw; cn.height = ch; var x = cn.getContext('2d');
      x.fillStyle = FAINT; x.fillRect(0, 0, cw, ch);   /* off-island = the layout card colour (grayish), not white */
      var sx = cw / ow, sy = ch / oh;
      var atlasW = (typeof bagTexCanvas !== 'undefined' && bagTexCanvas) ? bagTexCanvas.width : 2048;
      x.save();
      x.translate(0, ch); x.scale(1, -1); x.scale(sx, sy); x.translate(-ox, -oy);   /* flip to editor orientation + atlas→crop */
      if (region === 'handles') {
        /* the clean canvas erases handles/rivets by default → paint the island in the handle colour */
        if (clip && clip.path) { x.fillStyle = (typeof BAG !== 'undefined' && BAG.ribbon && BAG.ribbon.color) || '#cccccc'; x.fill(clip.path); x.lineWidth = 3 / sx; x.strokeStyle = 'rgba(0,0,0,0.22)'; x.stroke(clip.path); }
      } else {
        x.save(); if (clip && clip.path) { x.beginPath(); x.clip(clip.path); }   /* OFF-ISLAND UVs → opacity 0 */
        x.drawImage(bagCleanCanvas, 0, 0); x.restore();
        if (typeof bagUVGuideCanvas !== 'undefined' && bagUVGuideCanvas) x.drawImage(bagUVGuideCanvas, 0, 0, bagUVGuideCanvas.width, bagUVGuideCanvas.height, 0, 0, atlasW, atlasW);
      }
      x.restore();
      /* measurement brackets (un-flipped): front → W (above) + H (left of a side); a side → D (above). */
      if (measuring) {
        var dd = _dieDims(opts.dims), faces = (typeof BAG_FACES !== 'undefined' && BAG_FACES[region]) || {};
        var disp = function (bb) { var x0 = (bb.x - ox) * sx, x1 = (bb.x + bb.w - ox) * sx, y0 = ch - (bb.y - oy) * sy, y1 = ch - (bb.y + bb.h - oy) * sy; return { l: Math.min(x0, x1), r: Math.max(x0, x1), t: Math.min(y0, y1), b: Math.max(y0, y1) }; };
        var side = faces.left || faces.right, hface = side || faces.front;
        if (faces.front) { var fr = disp(faces.front); _dimBracket(x, false, 44, fr.l, fr.r, dd[0] + ' cm'); }
        if (hface) { var hr = disp(hface); _dimBracket(x, true, 44, hr.t, hr.b, dd[1] + ' cm'); }
        if (side && dd[2] != null) { var sr = disp(side); _dimBracket(x, false, 44, sr.l, sr.r, dd[2] + ' cm'); }
      }
      return cn.toDataURL('image/jpeg', 0.92);
    } catch (e) { console.warn('2D capture failed', e); return null; }
  }

  /* draw an image (data url) into a box, contained, centered, on a faint card */
  function placeImg(c, url, x, y, w, h, label) {
    roundRect(c, x, y, w, h, 12); c.save(); c.fillStyle = FAINT; c.fill();
    c.strokeStyle = LINE; c.lineWidth = 1.5; c.stroke(); c.restore();
    if (label) TX(c, label, x + 14, y + 30, { size: 18, weight: 600, color: SUB });
    if (!url) { TX(c, '—', x + w / 2, y + h / 2, { size: 30, color: SUB, align: 'center', baseline: 'middle' }); return; }
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        var pad = 18, top = label ? 38 : pad;
        var bw = w - pad * 2, bh = h - top - pad;
        var s = Math.min(bw / im.width, bh / im.height);
        var dw = im.width * s, dh = im.height * s;
        c.drawImage(im, x + (w - dw) / 2, y + top + (bh - dh) / 2, dw, dh);
        res();
      };
      im.onerror = function () { res(); };
      im.src = url;
    });
  }

  function _ref() { return 'IMP-' + (Date.now().toString(36).toUpperCase().slice(-7)); }
  function _today() { try { return new Date().toLocaleDateString(AR() ? 'ar' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return new Date().toDateString(); } }

  /* ── main ───────────────────────────────────────────────────────────── */
  window.generateSpecPDF = async function (btn) {
    var jspdf = window.jspdf || window.jsPDF; var JsPDF = jspdf && (jspdf.jsPDF || jspdf);
    if (!JsPDF) { alert('PDF library not loaded.'); return; }
    var label = btn ? btn.querySelector('span') : null, oldTxt = label ? label.textContent : '';
    if (label) label.textContent = L('Generating…', 'جارٍ الإنشاء…'); if (btn) btn.disabled = true;
    try {
      /* gather data */
      var model = (typeof BAG_MODELS !== 'undefined' && BAG_MODELS[currentBagModel]) ? BAG_MODELS[currentBagModel] : { label: 'Paper bag', dims: '' };
      var dims = (typeof S !== 'undefined' && S.dims) ? S.dims : (model.dims || '');
      var qty = (typeof S !== 'undefined' && S.qty) ? S.qty : 0;
      var unit = (typeof S !== 'undefined' && S.pu) ? S.pu : 0;
      var ctry = (typeof getCountry === 'function') ? getCountry() : { currency: 'AED', vat: 0, vatLabel: '' };
      var cur = AR() ? (ctry.currencyAr || ctry.currency) : ctry.currency;
      var sub = qty * unit, vat = sub * (ctry.vat || 0), total = sub + vat;
      var fmt = function (n) { return cur + ' ' + (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
      var ref = _ref(), date = _today();

      /* capture screenshots — force 3D mode + full size */
      var prevMode = (typeof viewMode !== 'undefined') ? viewMode : '3d';
      if (prevMode === '2d' && typeof setViewMode === 'function') { setViewMode('3d'); await _raf(); await _raf(); }
      var sv = orbit ? { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius, autoSpin: orbit.autoSpin } : null;
      var ft = (typeof frontTheta === 'function') ? frontTheta() : 0.6;
      var VP = (typeof VIEW_PHI !== 'undefined') ? VIEW_PHI : 1.2;
      var shots = {};   /* distance is auto-fit per shot inside _capture3D */
      shots.hero = _capture3D(ft + 0.55, 1.12);
      shots.front = _capture3D(ft, VP);
      shots.back = _capture3D(ft + Math.PI, VP);
      shots.right = _capture3D(ft - Math.PI / 2, VP);
      shots.left = _capture3D(ft + Math.PI / 2, VP);
      shots.top = _capture3D(ft, 0.18);
      shots.bottom = _capture3D(ft, Math.PI - 0.18);
      if (sv && orbit) { orbit.theta = sv.theta; orbit.phi = sv.phi; orbit.radius = sv.radius; orbit.autoSpin = sv.autoSpin; if (typeof sphericalToCamera === 'function') sphericalToCamera(); if (typeof realismRender === 'function') realismRender(); }
      var dieExt = _capture2D('exterior', { measure: true, dims: dims }), dieInt = _capture2D('interior', { measure: true, dims: dims }), dieHandles = _capture2D('handles', {});
      if (prevMode === '2d' && typeof setViewMode === 'function') setViewMode('2d');

      var pages = [], jobs = [];

      /* ── PAGE 1 — cover ── */
      var p1 = newPage(), c = p1.c;
      header(c, L('Product spec sheet', 'ورقة مواصفات المنتج'));
      TX(c, model.label, M, 250, { size: 30, weight: 700, color: INK });
      TX(c, L('Quote ', 'عرض سعر ') + ref + '  ·  ' + date, M, 288, { size: 20, color: SUB });
      jobs.push(placeImg(c, shots.hero, M, 320, PW - 2 * M, 620, L('3D preview', 'معاينة ثلاثية الأبعاد')));
      var ky = 1010;
      ky = section(c, ky, L('At a glance', 'نظرة سريعة')) + 36;
      var col1 = M, col2 = PW / 2 + 10, cw = (PW / 2 - M) - 20;
      kv(c, col1, ky, cw, L('Size (W×H×D)', 'المقاس (ع×ا×ع)'), dims);
      kv(c, col2, ky, cw, L('Quantity', 'الكمية'), qty.toLocaleString() + ' ' + L('units', 'وحدة'));
      ky += 60;
      kv(c, col1, ky, cw, L('Unit price', 'سعر الوحدة'), fmt(unit));
      kv(c, col2, ky, cw, L('Total', 'الإجمالي'), fmt(total));
      ky += 60;
      kv(c, col1, ky, cw, L('Exterior', 'الخارج'), _capFinish(BAG.exterior.finish), BAG.exterior.color);
      kv(c, col2, ky, cw, L('Interior', 'الداخل'), _capFinish(BAG.interior.finish), BAG.interior.color);
      footer(c, ref, 1, 4); pages.push(p1);

      /* ── PAGE 2 — materials & colours ── */
      var p2 = newPage(); c = p2.c; header(c, L('Materials & colours', 'الخامات والألوان'));
      var y = 250;
      y = section(c, y, L('Pricing', 'التسعير')) + 36;
      kv(c, M, y, cw, L('Quantity', 'الكمية'), qty.toLocaleString()); kv(c, col2, y, cw, L('Unit price', 'سعر الوحدة'), fmt(unit)); y += 60;
      kv(c, M, y, cw, L('Subtotal', 'المجموع الفرعي'), fmt(sub)); kv(c, col2, y, cw, (ctry.vatLabel || L('VAT', 'الضريبة')), fmt(vat)); y += 60;
      kv(c, M, y, cw, L('Grand total', 'الإجمالي الكلي'), fmt(total)); y += 80;

      function colorBlock(title, region) {
        y = section(c, y, title) + 34;
        kv(c, M, y, PW - 2 * M, L('Base colour / finish', 'اللون الأساسي / التشطيب'), _hexUp(BAG[region].color) + '   ·   ' + _capFinish(BAG[region].finish), BAG[region].color); y += 56;
        if (window.IMP_COLOR) { var _sp = IMP_COLOR.formatSpec(BAG[region].color);
          TX(c, _sp.cmykStr + '   ·   ' + (_sp.pantoneExact ? 'Pantone ' : '≈ Pantone ') + _sp.pantone + (_sp.outOfGamut ? '   ⚠ ' + L('outside CMYK gamut', 'خارج نطاق CMYK') : ''),
             M, y, { size: 18, color: _sp.outOfGamut ? '#b8860b' : SUB }); y += 42; }
        var fc = BAG[region].faceColors || {}, faces = (typeof BAG_FACES !== 'undefined' && BAG_FACES[region]) ? Object.keys(BAG_FACES[region]) : ['front', 'back', 'left', 'right', 'base'];
        faces.forEach(function (f) {
          var hex = fc[f] || BAG[region].color, over = !!fc[f];
          kv(c, M, y, PW - 2 * M, _faceName(f) + (over ? '  •' : ''), _hexUp(hex) + (over ? '' : '  ' + L('(base)', '(أساسي)')), hex); y += 46;
        });
        y += 18;
      }
      colorBlock(L('Exterior faces', 'أوجه الخارج'), 'exterior');
      colorBlock(L('Interior faces', 'أوجه الداخل'), 'interior');
      y = section(c, y, L('Hardware', 'الإكسسوارات')) + 34;
      if (BAG.ribbon) { kv(c, M, y, cw, L('Handles', 'المقابض'), _hexUp(BAG.ribbon.color) + '  ' + _capFinish(BAG.ribbon.finish || ''), BAG.ribbon.color); }
      if (BAG.rivet) { kv(c, col2, y, cw, L('Rivets', 'البرشام'), _hexUp(BAG.rivet.color), BAG.rivet.color); }
      if (window.IMP_COLOR) { y += 40;
        if (BAG.ribbon) { var _sh = IMP_COLOR.formatSpec(BAG.ribbon.color); TX(c, _sh.cmykStr + '  ·  ' + (_sh.pantoneExact ? '' : '≈ ') + _sh.pantone + (_sh.outOfGamut ? '  ⚠' : ''), M, y, { size: 18, color: _sh.outOfGamut ? '#b8860b' : SUB }); }
        if (BAG.rivet) { var _sr = IMP_COLOR.formatSpec(BAG.rivet.color); TX(c, _sr.cmykStr + '  ·  ' + (_sr.pantoneExact ? '' : '≈ ') + _sr.pantone + (_sr.outOfGamut ? '  ⚠' : ''), col2, y, { size: 18, color: _sr.outOfGamut ? '#b8860b' : SUB }); } }
      footer(c, ref, 2, 4); pages.push(p2);

      /* ── PAGE 3 — 2D dieline layout (ordered BEFORE the 3D views) ── */
      var p3 = newPage(); c = p3.c; header(c, L('2D dieline layout', 'مخطط القص المسطّح'));
      jobs.push(placeImg(c, dieExt, M, 240, PW - 2 * M, 556, L('Exterior layout', 'مخطط الخارج')));
      jobs.push(placeImg(c, dieInt, M, 812, PW - 2 * M, 556, L('Interior layout', 'مخطط الداخل')));
      if (dieHandles) jobs.push(placeImg(c, dieHandles, M, 1384, PW - 2 * M, 214, L('Handles', 'المقابض')));
      footer(c, ref, 3, 4); pages.push(p3);

      /* ── PAGE 4 — 3D views ── */
      var p4 = newPage(); c = p4.c; header(c, L('3D views', 'مناظر ثلاثية الأبعاد'));
      var gx = M, gw = (PW - 2 * M - 2 * 24) / 3, gh = 420, gy = 260;
      var grid = [['front', L('Front', 'أمامي')], ['back', L('Back', 'خلفي')], ['left', L('Left', 'يسار')], ['right', L('Right', 'يمين')], ['top', L('Top', 'أعلى')], ['bottom', L('Bottom', 'أسفل')]];
      grid.forEach(function (g, i) {
        var col = i % 3, row = (i / 3) | 0;
        jobs.push(placeImg(c, shots[g[0]], gx + col * (gw + 24), gy + row * (gh + 36), gw, gh, g[1]));
      });
      footer(c, ref, 4, 4); pages.push(p4);

      await Promise.all(jobs);

      /* ── assemble PDF ── */
      var doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pages.forEach(function (pg, i) {
        if (i > 0) doc.addPage();
        doc.addImage(pg.cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      });
      doc.save('IMPRINT_' + (model.key || 'PaperBag') + '_' + ref + '.pdf');
    } catch (e) {
      console.error('spec PDF failed', e);
      alert(L('Sorry — the PDF could not be generated.', 'تعذّر إنشاء ملف PDF.'));
    } finally {
      if (label) label.textContent = oldTxt; if (btn) btn.disabled = false;
    }
  };
})();
