/* ─────────────────────────────────────────────────────────────────────────────
   IMPRINT — Spec-sheet PDF generator  (manufacturer tech-pack)
   LANDSCAPE A3 pages, high resolution. Cover (hero 3/4) · materials + per-face
   CMYK/Pantone · 2D dielines (before the 3D views) · 3D angle screenshots.
   Each page is drawn to a canvas (so Arabic shapes natively) and packed into a
   PDF via jsPDF (vendor/jspdf). NO pricing — this file is for the factory.
   ──────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var AR = function () { return (typeof getLang === 'function' && getLang() === 'ar'); };
  function L(en, ar) { return AR() ? ar : en; }
  function _font(stack) { return stack || (AR() ? 'Cairo, Inter, Arial, sans-serif' : 'Inter, Helvetica, Arial, sans-serif'); }

  /* A3 LANDSCAPE @ ~200 dpi (bigger sheet + high resolution for the factory) */
  var PW = 3300, PH = 2333, M = 184;
  var INK = '#1c1c1c', SUB = '#6b6b68', GOLD = '#c8a96e', LINE = '#e6e4df', CREAM = '#faf9f7', FAINT = '#f3f1ec';

  function newPage() {
    var cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
    var c = cv.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, PW, PH);
    return { cv: cv, c: c };
  }
  function TX(c, s, x, y, o) {
    o = o || {}; s = (s == null ? '' : '' + s);
    var size = o.size || 36, wt = o.weight || 400, col = o.color || INK, al = o.align || 'left';
    c.save();
    c.font = wt + ' ' + size + 'px ' + _font(o.font);
    c.fillStyle = col; c.textBaseline = o.baseline || 'alphabetic'; c.textAlign = al;
    if (o.rtl || (AR() && o.autoRtl !== false)) c.direction = 'rtl';
    c.fillText(s, x, y, o.maxw || undefined);
    c.restore();
  }
  function rule(c, x1, y, x2, col, w) { c.save(); c.strokeStyle = col || LINE; c.lineWidth = w || 2; c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke(); c.restore(); }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function swatch(c, x, y, hex, sz) { sz = sz || 38; c.save(); roundRect(c, x, y, sz, sz, 8); c.fillStyle = hex || '#fff'; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; c.stroke(); c.restore(); }

  function header(c, title) {
    TX(c, 'IMPRINT', M, 150, { size: 58, weight: 800, color: INK, rtl: false });
    c.save(); c.fillStyle = GOLD; c.beginPath(); c.arc(M + 322, 118, 7, 0, 6.3); c.fill(); c.restore();
    TX(c, L('CUSTOM PAPER-BAG SPEC SHEET — FACTORY', 'ورقة مواصفات الكيس الورقي — للمصنع'), PW - M, 144, { size: 26, weight: 600, color: SUB, align: 'right' });
    rule(c, M, 182, PW - M, GOLD, 3);
    if (title) TX(c, title, M, 274, { size: 50, weight: 800, color: INK });
  }
  function footer(c, ref, pageNo, pageTot) {
    rule(c, M, PH - 122, PW - M, LINE, 2);
    TX(c, 'IMPRINT® · ' + ref, M, PH - 74, { size: 25, color: SUB, rtl: false });
    TX(c, L('Page ', 'صفحة ') + pageNo + ' / ' + pageTot, PW - M, PH - 74, { size: 25, color: SUB, align: 'right' });
  }

  /* section label (optional x for column layouts) */
  function section(c, y, label, x) {
    x = x || M;
    c.save(); c.fillStyle = GOLD; c.fillRect(x, y - 24, 7, 32); c.restore();
    TX(c, label, x + 22, y, { size: 33, weight: 700, color: INK });
    return y + 30;
  }
  /* key/value row; optional swatch hex */
  function kv(c, x, y, w, label, value, hex) {
    TX(c, label, x, y, { size: 28, color: SUB });
    var vx = x + w;
    if (hex) { swatch(c, vx - 42, y - 30, hex, 40); vx -= 58; }
    TX(c, value, vx, y, { size: 28, weight: 600, color: INK, align: 'right' });
    rule(c, x, y + 22, x + w, FAINT, 1.6);
  }

  function _hexUp(h) { return (h || '').toUpperCase(); }
  function _capFinish(s) { s = (s || ''); return s.charAt(0).toUpperCase() + s.slice(1).replace('softtouch', 'Soft Touch').replace('foil', 'Foil Stamp'); }
  function _faceName(f) { return AR() ? ({ front: 'أمامي', back: 'خلفي', left: 'يسار', right: 'يمين', base: 'قاعدة' }[f] || f) : (f.charAt(0).toUpperCase() + f.slice(1)); }
  /* CMYK + ≈Pantone one-liner for a hex (factory print spec). */
  function _cmykLine(c, hex, x, y, size) {
    if (!window.IMP_COLOR) return;
    var sp = IMP_COLOR.formatSpec(hex);
    TX(c, sp.cmykStr + '   ·   ' + (sp.pantoneExact ? 'Pantone ' : '≈ Pantone ') + sp.pantone + (sp.outOfGamut ? '   ⚠ ' + L('outside CMYK gamut', 'خارج نطاق CMYK') : ''),
       x, y, { size: size || 23, color: sp.outOfGamut ? '#b8860b' : SUB });
  }

  /* ── capture helpers ─────────────────────────────────────────────────── */
  function _raf() { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }
  function _sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* Clean isolated bag render: no floor/shadow/sky/post-fx, framed to fit. */
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
      T.renderer.render(T.scene, T.camera);   /* plain render → no bloom / SSAO / vignette */
      var url = T.renderer.domElement.toDataURL('image/png');
      hidden.forEach(function (ch) { ch.visible = true; }); T.scene.background = bg;
      orbit.target.set(tgt.x, tgt.y, tgt.z);
      return url;
    } catch (e) { console.warn('3D capture failed', e); return null; }
  }

  /* A dimension bracket: a thin line + end ticks + a centred "<axis>/<n> cm" label.
     vertical → runs along Y at screen-x `a`, between b0..b1 (label rotated, to the left);
     horizontal → runs along X at screen-y `a`, between b0..b1 (label ABOVE the line). */
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

  /* Flat dieline of a region (exterior | interior | handles): the clean artwork CLIPPED to the
     island (off-island UVs → transparent, so the grayish card colour shows through), the UV-guide
     outline, and optional L×H×W measurement brackets. No per-face sub-labels. */
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
      /* one GAP value (face edge → measurement line) shared by W/H/L; same look on every line */
      var GAP = Math.round(Math.min(uv.w, uv.h) * 0.06);
      var FS = Math.round(uv.h * 0.030);
      var padR = uv.w * 0.06, padBot = uv.h * 0.06;
      var mL = measuring ? (GAP + FS * 2.6) : padR;   /* left room for the height bracket + rotated label */
      var mT = measuring ? (GAP + FS * 2.2) : padBot; /* top room for the width / length brackets + label above */
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
      /* measurement brackets (un-flipped): front → L (above) · a side → W (above) · height → H (left).
         L = length (front-panel width), H = height, W = width (side gusset) — manufacturer convention. */
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
  /* Parse a dims string like "28 × 20 × 14 cm" → [L,H,W] (numbers) or null. */
  function _dieDims(s) { var m = ('' + (s || '')).match(/\d+(?:\.\d+)?/g); return (m && m.length >= 2) ? m.map(parseFloat) : null; }

  /* draw an image (data url) into a box, contained, centered, on a faint card */
  function placeImg(c, url, x, y, w, h, label) {
    roundRect(c, x, y, w, h, 16); c.save(); c.fillStyle = FAINT; c.fill();
    c.strokeStyle = LINE; c.lineWidth = 2; c.stroke(); c.restore();
    if (label) TX(c, label, x + 22, y + 44, { size: 25, weight: 600, color: SUB });
    if (!url) { TX(c, '—', x + w / 2, y + h / 2, { size: 40, color: SUB, align: 'center', baseline: 'middle' }); return; }
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        var pad = 26, top = label ? 58 : pad;
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
    var _q = {};   /* saved quality settings to restore after export */
    try {
      /* gather data — NO pricing (factory sheet) */
      var model = (typeof BAG_MODELS !== 'undefined' && BAG_MODELS[currentBagModel]) ? BAG_MODELS[currentBagModel] : { label: 'Paper bag', dims: '' };
      var dims = (typeof S !== 'undefined' && S.dims) ? S.dims : (model.dims || '');
      var qty = (typeof S !== 'undefined' && S.qty) ? S.qty : 0;
      var ref = _ref(), date = _today();

      /* force 3D mode for the screenshots */
      var prevMode = (typeof viewMode !== 'undefined') ? viewMode : '3d';
      if (prevMode === '2d' && typeof setViewMode === 'function') { setViewMode('3d'); await _raf(); await _raf(); }

      /* ── MAX-RESOLUTION boost for the export (restored afterwards) ──
         outline/UV-guide → 4096, finish & emboss maps → 4096, renderer pixel-ratio → max.
         (The colour atlas is fixed at 2048² in the engine, so artwork is baked at 2048.) */
      try { _q.guide = (typeof A2D !== 'undefined') ? A2D.guideRes : null; if (typeof A2D !== 'undefined') { A2D.guideRes = 4096; if (typeof buildUVGuide === 'function') buildUVGuide(); } } catch (e) {}
      try { if (T && T.renderer) { _q.pr = T.renderer.getPixelRatio(); T.renderer.setPixelRatio(3); } } catch (e) {}
      try { _q.pbrExp = (typeof PBR_SIZE !== 'undefined') ? Math.round(Math.log(PBR_SIZE) / Math.LN2) : null; if (typeof onFinishQuality === 'function') onFinishQuality(12); } catch (e) {}
      await _sleep(380);   /* let the debounced 4096 finish re-bake settle before capturing */

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

      /* restore the quality settings */
      try { if (_q.pbrExp != null && typeof onFinishQuality === 'function') onFinishQuality(_q.pbrExp); } catch (e) {}
      try { if (_q.guide != null && typeof A2D !== 'undefined') { A2D.guideRes = _q.guide; if (typeof buildUVGuide === 'function') buildUVGuide(); } } catch (e) {}
      try { if (_q.pr != null && T && T.renderer) T.renderer.setPixelRatio(_q.pr); } catch (e) {}

      var pages = [], jobs = [], c;

      /* ── PAGE 1 — cover (hero left · at-a-glance right) ── */
      var p1 = newPage(); c = p1.c;
      header(c, L('Product spec sheet', 'ورقة مواصفات المنتج'));
      TX(c, model.label, M, 380, { size: 42, weight: 700, color: INK });
      TX(c, L('Ref ', 'مرجع ') + ref + '  ·  ' + date, M, 436, { size: 28, color: SUB });
      var heroW = PW / 2 - M - 30, heroH = PH - 500 - 170;
      jobs.push(placeImg(c, shots.hero, M, 490, heroW, heroH, L('3D preview', 'معاينة ثلاثية الأبعاد')));
      var rx = PW / 2 + 24, rw = PW - M - rx;
      var ry = section(c, 540, L('At a glance', 'نظرة سريعة'), rx) + 56;
      kv(c, rx, ry, rw, L('Size (L×H×W)', 'المقاس (طول×ارتفاع×عرض)'), dims); ry += 90;
      kv(c, rx, ry, rw, L('Quantity', 'الكمية'), qty.toLocaleString() + ' ' + L('units', 'وحدة')); ry += 90;
      kv(c, rx, ry, rw, L('Exterior finish', 'تشطيب الخارج'), _capFinish(BAG.exterior.finish), BAG.exterior.color); ry += 90;
      kv(c, rx, ry, rw, L('Interior finish', 'تشطيب الداخل'), _capFinish(BAG.interior.finish), BAG.interior.color);
      footer(c, ref, 1, 4); pages.push(p1);

      /* ── PAGE 2 — materials & colours (exterior left · interior right, per-face CMYK/Pantone) ── */
      var p2 = newPage(); c = p2.c; header(c, L('Materials & colours', 'الخامات والألوان'));
      var colW = (PW - 2 * M - 64) / 2, leftX = M, rightX = M + colW + 64, startY = 380;
      function colorBlock(title, region, bx, bw, by) {
        var yy = section(c, by, title, bx) + 40;
        kv(c, bx, yy, bw, L('Base colour / finish', 'اللون الأساسي / التشطيب'), _hexUp(BAG[region].color) + '   ·   ' + _capFinish(BAG[region].finish), BAG[region].color); yy += 50;
        _cmykLine(c, BAG[region].color, bx, yy, 23); yy += 50;
        var fc = BAG[region].faceColors || {}, faces = (typeof BAG_FACES !== 'undefined' && BAG_FACES[region]) ? Object.keys(BAG_FACES[region]) : ['front', 'back', 'left', 'right', 'base'];
        faces.forEach(function (f) {
          var hex = fc[f] || BAG[region].color, over = !!fc[f];
          kv(c, bx, yy, bw, _faceName(f) + (over ? '  •' : ''), _hexUp(hex) + (over ? '' : '  ' + L('(base)', '(أساسي)')), hex); yy += 44;
          _cmykLine(c, hex, bx, yy, 21); yy += 44;   /* CMYK + ≈Pantone for EVERY face */
        });
        return yy + 18;
      }
      var yE = colorBlock(L('Exterior faces', 'أوجه الخارج'), 'exterior', leftX, colW, startY);
      var yI = colorBlock(L('Interior faces', 'أوجه الداخل'), 'interior', rightX, colW, startY);
      var hy = Math.max(yE, yI) + 14;
      hy = section(c, hy, L('Hardware', 'الإكسسوارات')) + 40;
      if (BAG.ribbon) { kv(c, leftX, hy, colW, L('Handles', 'المقابض'), _hexUp(BAG.ribbon.color) + '  ' + _capFinish(BAG.ribbon.finish || ''), BAG.ribbon.color); _cmykLine(c, BAG.ribbon.color, leftX, hy + 46, 21); }
      if (BAG.rivet) { kv(c, rightX, hy, colW, L('Rivets', 'البرشام'), _hexUp(BAG.rivet.color), BAG.rivet.color); _cmykLine(c, BAG.rivet.color, rightX, hy + 46, 21); }
      footer(c, ref, 2, 4); pages.push(p2);

      /* ── PAGE 3 — 2D dieline layout (BEFORE the 3D views) ── */
      var p3 = newPage(); c = p3.c; header(c, L('2D dieline layout', 'مخطط القص المسطّح'));
      /* a separate Handles box ONLY when the handles are NOT shown in the 2D editor */
      var showHandlesBox = !!dieHandles && !(typeof A2D !== 'undefined' && A2D.showHandles2D);
      var dY = 330, dH = showHandlesBox ? 740 : 870, dW = PW - 2 * M;
      jobs.push(placeImg(c, dieExt, M, dY, dW, dH, L('Exterior layout', 'مخطط الخارج')));
      jobs.push(placeImg(c, dieInt, M, dY + dH + 34, dW, dH, L('Interior layout', 'مخطط الداخل')));
      if (showHandlesBox) jobs.push(placeImg(c, dieHandles, M, dY + 2 * (dH + 34), dW, 200, L('Handles', 'المقابض')));
      footer(c, ref, 3, 4); pages.push(p3);

      /* ── PAGE 4 — 3D views ── */
      var p4 = newPage(); c = p4.c; header(c, L('3D views', 'مناظر ثلاثية الأبعاد'));
      var gap = 44, cols = 3, gw = (PW - 2 * M - (cols - 1) * gap) / cols, gh = (PH - 360 - 170 - gap) / 2, gy = 360;
      var grid = [['front', L('Front', 'أمامي')], ['back', L('Back', 'خلفي')], ['left', L('Left', 'يسار')], ['right', L('Right', 'يمين')], ['top', L('Top', 'أعلى')], ['bottom', L('Bottom', 'أسفل')]];
      grid.forEach(function (g, i) {
        var col = i % cols, row = (i / cols) | 0;
        jobs.push(placeImg(c, shots[g[0]], M + col * (gw + gap), gy + row * (gh + gap), gw, gh, g[1]));
      });
      footer(c, ref, 4, 4); pages.push(p4);

      await Promise.all(jobs);

      /* ── assemble PDF — A3 landscape, PNG pages (lossless, high-res for the factory) ── */
      var doc = new JsPDF({ unit: 'mm', format: 'a3', orientation: 'landscape' });
      pages.forEach(function (pg, i) {
        if (i > 0) doc.addPage();
        doc.addImage(pg.cv.toDataURL('image/png'), 'PNG', 0, 0, 420, 297, undefined, 'FAST');
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
