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

  function _capture2D(region) {
    try {
      if (typeof bagCleanCanvas === 'undefined' || !bagCleanCanvas) return null;
      var uv = (typeof BAG_UV !== 'undefined') ? BAG_UV[region] : null; if (!uv) return null;
      var cw = Math.round(uv.w), ch = Math.round(uv.h);
      var cn = document.createElement('canvas'); cn.width = cw; cn.height = ch; var x = cn.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, cw, ch);
      /* flipped vertically to match the 2D editor orientation, + the UV guide (silhouette/outlines) */
      x.save(); x.translate(0, ch); x.scale(1, -1);
      x.drawImage(bagCleanCanvas, uv.x, uv.y, uv.w, uv.h, 0, 0, cw, ch);
      if (typeof bagUVGuideCanvas !== 'undefined' && bagUVGuideCanvas && typeof bagTexCanvas !== 'undefined') {
        var k = bagUVGuideCanvas.width / bagTexCanvas.width;
        x.drawImage(bagUVGuideCanvas, uv.x * k, uv.y * k, uv.w * k, uv.h * k, 0, 0, cw, ch);
      }
      x.restore();
      /* labels (un-flipped) at the centre-BOTTOM of each face */
      var faces = (typeof BAG_FACES !== 'undefined' && BAG_FACES[region]) || {};
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 ' + Math.round(ch * 0.05) + 'px ' + _font(); x.lineJoin = 'round';
      Object.keys(faces).forEach(function (f) {
        var bb = faces[f]; if (!bb) return;
        var lx = (bb.x + bb.w / 2) - uv.x, ly = ch - ((bb.y + bb.h * 0.14) - uv.y);
        x.lineWidth = Math.round(ch * 0.014); x.strokeStyle = '#ffffff'; x.strokeText(_faceName(f), lx, ly);
        x.fillStyle = '#111'; x.fillText(_faceName(f), lx, ly);
      });
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
      var dieExt = _capture2D('exterior'), dieInt = _capture2D('interior');
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
      footer(c, ref, 1, 5); pages.push(p1);

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
      footer(c, ref, 2, 5); pages.push(p2);

      /* ── PAGE 3 — artwork layers ── */
      var p3 = newPage(); c = p3.c; header(c, L('Artwork layers', 'طبقات التصميم'));
      y = 250; y = section(c, y, L('Layers', 'الطبقات')) + 40;
      var layers = (BAG.artwork && BAG.artwork.layers) ? BAG.artwork.layers.filter(function (Lr) { return Lr && Lr.visible && (Lr.kind === 'logo' || Lr.kind === 'sticker' || Lr.kind === 'text'); }) : [];
      if (!layers.length) { TX(c, L('No artwork added.', 'لا يوجد تصميم مضاف.'), M, y, { size: 21, color: SUB }); }
      else {
        layers.forEach(function (Lr, i) {
          if (y > PH - 160) return;
          var kind = Lr.kind === 'text' ? L('Text', 'نص') : (Lr.tiled ? L('Pattern', 'نمط') : L('Graphic', 'رسمة'));
          var name = Lr.kind === 'text' ? ('“' + (Lr.content || '').slice(0, 24) + '”') : (Lr.fileName || Lr.name || kind);
          c.save(); roundRect(c, M, y - 26, PW - 2 * M, 96, 10); c.fillStyle = FAINT; c.fill(); c.restore();
          TX(c, (i + 1) + '. ' + name, M + 20, y + 4, { size: 21, weight: 600, color: INK });
          TX(c, kind, PW - M - 20, y + 4, { size: 19, color: GOLD, align: 'right' });
          var det = L('pos ', 'موضع ') + Math.round(Lr.posU || 0) + ',' + Math.round(Lr.posV || 0) +
            '   ·  ' + L('scale ', 'حجم ') + Math.round((Lr.scale || 0)) + '%' +
            '   ·  ' + L('rotation ', 'دوران ') + Math.round(Lr.rotation || 0) + '°' +
            (Lr.color ? ('   ·  ' + _hexUp(Lr.color)) : '');
          TX(c, det, M + 20, y + 44, { size: 17, color: SUB });
          y += 110;
        });
      }
      footer(c, ref, 3, 5); pages.push(p3);

      /* ── PAGE 4 — 3D views ── */
      var p4 = newPage(); c = p4.c; header(c, L('3D views', 'مناظر ثلاثية الأبعاد'));
      var gx = M, gw = (PW - 2 * M - 2 * 24) / 3, gh = 420, gy = 260;
      var grid = [['front', L('Front', 'أمامي')], ['back', L('Back', 'خلفي')], ['left', L('Left', 'يسار')], ['right', L('Right', 'يمين')], ['top', L('Top', 'أعلى')], ['bottom', L('Bottom', 'أسفل')]];
      grid.forEach(function (g, i) {
        var col = i % 3, row = (i / 3) | 0;
        jobs.push(placeImg(c, shots[g[0]], gx + col * (gw + 24), gy + row * (gh + 36), gw, gh, g[1]));
      });
      footer(c, ref, 4, 5); pages.push(p4);

      /* ── PAGE 5 — dielines ── */
      var p5 = newPage(); c = p5.c; header(c, L('2D dieline layout', 'مخطط القص المسطّح'));
      jobs.push(placeImg(c, dieExt, M, 250, PW - 2 * M, 640, L('Exterior layout', 'مخطط الخارج')));
      jobs.push(placeImg(c, dieInt, M, 920, PW - 2 * M, 640, L('Interior layout', 'مخطط الداخل')));
      footer(c, ref, 5, 5); pages.push(p5);

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
