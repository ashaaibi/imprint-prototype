/* ═══════════════════════════════════════════════════════════
   IMPRINT — Colour calibration (shared by configurator.html + configurator-cup.html)
   Print is CMYK, screens are RGB — so the master/spec is CMYK/Pantone and the viewers show a
   soft-proof. This module gives:
     • hex ↔ CMYK conversions, ΔE (Lab), out-of-gamut heuristic, nearest-Pantone (compact ref set)
     • a self-installing readout: a TRUE-COLOUR reference chip (exact sRGB, unlit DOM = ground truth)
       + CMYK% + ≈Pantone + a gamut warning, for the active region
     • a "True-colour proof" toggle that neutralises tone-mapping + post-FX so the lit 3D view
       reads like the flat 2D canvas / the picked code
     • IMP_COLOR.formatSpec() used by spec-pdf.js to print CMYK + Pantone callouts
   NOTE: CMYK math here is a device-independent approximation. For a contract proof, swap in an ICC
   profile (FOGRA39/GRACoL via lcms-wasm) — the API (hexToCmyk / softProof) is the drop-in point.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var C = {};
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  C.hexToRgb = function (hex) {
    hex = String(hex || '').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex || '0', 16) || 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  C.rgbToHex = function (r, g, b) {
    return '#' + [r, g, b].map(function (v) { return clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); }).join('').toUpperCase();
  };
  C.hexToCmyk = function (hex) {
    var c = C.hexToRgb(hex), r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var k = 1 - Math.max(r, g, b);
    if (k >= 0.9995) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: Math.round((1 - r - k) / (1 - k) * 100),
      m: Math.round((1 - g - k) / (1 - k) * 100),
      y: Math.round((1 - b - k) / (1 - k) * 100),
      k: Math.round(k * 100)
    };
  };
  C.cmykToHex = function (cm) {
    var c = cm.c / 100, m = cm.m / 100, y = cm.y / 100, k = cm.k / 100;
    return C.rgbToHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k));
  };

  /* sRGB → Lab + ΔE76 (good enough for nearest-swatch / proof validation) */
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lab(hex) {
    var c = C.hexToRgb(hex), r = lin(c.r), g = lin(c.g), b = lin(c.b);
    var x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722),
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    function f(t) { return t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116); }
    x = f(x); y = f(y); z = f(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  C.deltaE = function (h1, h2) {
    var a = lab(h1), b = lab(h2);
    return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]) + (a[2] - b[2]) * (a[2] - b[2]));
  };

  /* Heuristic CMYK-gamut check (coated process ink can't hit vivid, bright, saturated RGB). */
  C.outOfGamut = function (hex) {
    var c = C.hexToRgb(hex), mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
    var sat = mx === 0 ? 0 : (mx - mn) / mx, val = mx / 255;
    return sat > 0.78 && val > 0.7;
  };

  /* Compact Pantone-coated reference (approximate sRGB) — reports the CLOSEST match (≈). */
  var PMS = [
    ['Bright Red 032 C', '#EF3340'], ['186 C', '#C8102E'], ['Warm Red C', '#F9423A'], ['Rubine Red C', '#CE0058'],
    ['Rhodamine Red C', '#E10098'], ['Process Magenta C', '#D6006E'], ['Rose 197 C', '#E89CAE'], ['Pink 230 C', '#F57EB6'],
    ['Purple C', '#BB29BB'], ['Violet C', '#440099'], ['2745 C', '#1E0E62'], ['Reflex Blue C', '#001489'],
    ['286 C', '#0033A0'], ['Navy 533 C', '#1B2A4A'], ['Process Blue C', '#0085CA'], ['2995 C', '#00A3E0'],
    ['320 C', '#009CA6'], ['Teal 3262 C', '#00B2A9'], ['Green C', '#00AB84'], ['Emerald 341 C', '#00674B'],
    ['354 C', '#00B140'], ['368 C', '#69BE28'], ['396 C', '#E1E000'], ['Yellow C', '#FEDD00'],
    ['1235 C', '#FFB81C'], ['7548 C', '#FFC600'], ['1505 C', '#FF6900'], ['Orange 021 C', '#FE5000'],
    ['871 Gold C', '#84754E'], ['7503 C', '#A39161'], ['4625 C', '#3E1F00'], ['476 C', '#4E3629'],
    ['Burgundy 7421 C', '#5A1F2E'], ['Black C', '#2D2926'], ['Cool Gray 11 C', '#53565A'], ['Cool Gray 6 C', '#A7A8AA'],
    ['Cool Gray 3 C', '#C8C9C7'], ['Warm Gray 3 C', '#BFB8AF'], ['White', '#FFFFFF']
  ];
  C.nearestPantone = function (hex) {
    var best = PMS[0], bd = 1e9;
    for (var i = 0; i < PMS.length; i++) { var d = C.deltaE(hex, PMS[i][1]); if (d < bd) { bd = d; best = PMS[i]; } }
    return { code: best[0], hex: best[1], deltaE: bd };
  };

  /* ICC drop-in point. Identity for now (parity comes from the proof view + shared canvas pixels). */
  C.softProof = function (hex) { return hex; };

  C.formatSpec = function (hex) {
    hex = String(hex || '#FFFFFF').toUpperCase();
    var cm = C.hexToCmyk(hex), p = C.nearestPantone(hex);
    return {
      hex: hex, cmyk: cm, cmykStr: 'C' + cm.c + ' M' + cm.m + ' Y' + cm.y + ' K' + cm.k,
      pantone: p.code, pantoneExact: p.deltaE < 2.5, outOfGamut: C.outOfGamut(hex)
    };
  };

  window.IMP_COLOR = C;

  /* ───────────────────── self-installing UI + proof toggle (browser only) ───────────────────── */
  if (typeof document === 'undefined') return;

  var panel, chip, hexEl, cmykEl, pmsEl, warnEl, proofChk, last = { region: 'exterior', hex: '#FFFFFF' };

  function build() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'imp-cal';
    panel.innerHTML =
      '<button class="imp-cal-head" type="button" aria-expanded="false">' +
        '<span class="imp-cal-chip"></span><span class="imp-cal-mini"></span><span class="imp-cal-tog">CMYK ▴</span></button>' +
      '<div class="imp-cal-body" hidden>' +
        '<div class="imp-cal-row imp-cal-true"><span class="imp-cal-bigchip"></span><div><div class="imp-cal-k">True colour · print preview</div><div class="imp-cal-hex"></div></div></div>' +
        '<div class="imp-cal-line"><span>CMYK</span><b class="imp-cal-cmyk"></b></div>' +
        '<div class="imp-cal-line"><span>Pantone</span><b class="imp-cal-pms"></b></div>' +
        '<div class="imp-cal-warn" hidden>⚠ Outside CMYK gamut — will print duller; consider a Pantone spot.</div>' +
        '<label class="imp-cal-proof"><input type="checkbox"> True-colour proof (flatten 3D lighting)</label>' +
        '<div class="imp-cal-note">Screens are RGB; the chip is the soft-proofed print target. Spec sheet carries the CMYK/Pantone.</div>' +
      '</div>';
    var css = document.createElement('style');
    css.textContent =
      '#imp-cal{position:fixed;left:14px;bottom:14px;z-index:9000;width:max-content;max-width:300px;font-family:Inter,system-ui,sans-serif;background:rgba(20,20,22,.92);color:#f2f2f2;border:1px solid rgba(255,255,255,.14);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);backdrop-filter:blur(8px);overflow:hidden;}' +
      '#imp-cal .imp-cal-head{display:flex;align-items:center;gap:9px;width:100%;padding:8px 11px;background:none;border:none;color:inherit;cursor:pointer;font:inherit;}' +
      '#imp-cal .imp-cal-chip{width:22px;height:22px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);flex:0 0 auto;}' +
      '#imp-cal .imp-cal-mini{font-size:11.5px;font-weight:600;letter-spacing:.02em;white-space:nowrap;opacity:.92;}' +
      '#imp-cal .imp-cal-tog{margin-inline-start:auto;font-size:10px;font-weight:700;letter-spacing:.08em;opacity:.6;}' +
      '#imp-cal .imp-cal-body{padding:0 12px 12px;border-top:1px solid rgba(255,255,255,.1);}' +
      '#imp-cal .imp-cal-true{display:flex;gap:11px;align-items:center;margin:12px 0 10px;}' +
      '#imp-cal .imp-cal-bigchip{width:54px;height:54px;border-radius:9px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);flex:0 0 auto;}' +
      '#imp-cal .imp-cal-k{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.55;}' +
      '#imp-cal .imp-cal-hex{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px;}' +
      '#imp-cal .imp-cal-line{display:flex;justify-content:space-between;gap:16px;font-size:12px;padding:5px 0;border-top:1px solid rgba(255,255,255,.07);}' +
      '#imp-cal .imp-cal-line span{opacity:.6;}' +
      '#imp-cal .imp-cal-line b{font-variant-numeric:tabular-nums;font-weight:600;}' +
      '#imp-cal .imp-cal-warn{font-size:11px;line-height:1.4;color:#ffd27a;background:rgba(255,180,60,.12);border-radius:7px;padding:7px 9px;margin-top:8px;}' +
      '#imp-cal .imp-cal-proof{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:11px;cursor:pointer;}' +
      '#imp-cal .imp-cal-note{font-size:10px;line-height:1.45;opacity:.5;margin-top:9px;}' +
      '@media (max-width:760px){#imp-cal{left:8px;bottom:8px;max-width:220px;}}';
    document.head.appendChild(css);
    document.body.appendChild(panel);
    chip = panel.querySelector('.imp-cal-chip');
    var bigchip = panel.querySelector('.imp-cal-bigchip');
    hexEl = panel.querySelector('.imp-cal-hex');
    cmykEl = panel.querySelector('.imp-cal-cmyk');
    pmsEl = panel.querySelector('.imp-cal-pms');
    warnEl = panel.querySelector('.imp-cal-warn');
    var miniEl = panel.querySelector('.imp-cal-mini');
    proofChk = panel.querySelector('.imp-cal-proof input');
    var head = panel.querySelector('.imp-cal-head'), body = panel.querySelector('.imp-cal-body'), tog = panel.querySelector('.imp-cal-tog');
    head.addEventListener('click', function () {
      var open = body.hasAttribute('hidden');
      if (open) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      tog.textContent = 'CMYK ' + (open ? '▾' : '▴');
    });
    proofChk.addEventListener('change', function () { setProof(proofChk.checked); });
    panel._refs = { bigchip: bigchip, mini: miniEl };
  }

  function render() {
    if (!panel) return;
    var s = C.formatSpec(last.hex);
    chip.style.background = s.hex;
    panel._refs.bigchip.style.background = s.hex;
    panel._refs.mini.textContent = (last.region ? last.region.charAt(0).toUpperCase() + last.region.slice(1) : 'Colour') + ' · ' + s.cmykStr;
    hexEl.textContent = s.hex;
    cmykEl.textContent = s.cmykStr;
    pmsEl.textContent = (s.pantoneExact ? '' : '≈ ') + s.pantone;
    if (s.outOfGamut) warnEl.removeAttribute('hidden'); else warnEl.setAttribute('hidden', '');
  }

  /* proof view: neutralise tone-mapping + post-FX so the lit body ≈ the flat canvas colour */
  var saved = null;
  function setProof(on) {
    try {
      var T = window.T, THREE = window.THREE;
      if (!T || !T.renderer || !THREE) return;
      var r = T.renderer, R = window.REALISM;
      if (on && !saved) {
        saved = { tm: r.toneMapping, ex: r.toneMappingExposure,
                  bloom: R && R.bloom && R.bloom.on, ssao: R && R.ssao && R.ssao.on,
                  dof: R && R.dof && R.dof.on, grade: R && R.grade && R.grade.on,
                  vig: R && R.vignette && R.vignette.on };
        r.toneMapping = THREE.NoToneMapping; r.toneMappingExposure = 1;
        if (window.onBloomToggle) onBloomToggle(false);
        if (window.onSsaoToggle) onSsaoToggle(false);
        if (window.onDofToggle) onDofToggle(false);
        if (window.onGradeToggle) onGradeToggle(false);
        if (window.onVignetteToggle) onVignetteToggle(false);
      } else if (!on && saved) {
        r.toneMapping = saved.tm; r.toneMappingExposure = saved.ex;
        if (window.onBloomToggle) onBloomToggle(!!saved.bloom);
        if (window.onSsaoToggle) onSsaoToggle(!!saved.ssao);
        if (window.onDofToggle) onDofToggle(!!saved.dof);
        if (window.onGradeToggle) onGradeToggle(!!saved.grade);
        if (window.onVignetteToggle) onVignetteToggle(!!saved.vig);
        saved = null;
      }
      if (window.onExposureSlider) { /* keep exposure UI honest in beauty mode */ }
    } catch (e) {}
  }

  /* hook every region colour change (setRegionColor → updateBagColorDisplay(region,hex)) */
  function install() {
    if (typeof window.updateBagColorDisplay !== 'function' || typeof window.BAG === 'undefined') return false;
    build();
    var orig = window.updateBagColorDisplay;
    window.updateBagColorDisplay = function (region, hex) {
      try { orig.apply(this, arguments); } catch (e) {}
      if (hex) { last = { region: region, hex: hex }; render(); }
    };
    try { var ex = window.BAG.exterior; if (ex && ex.color) { last = { region: 'exterior', hex: ex.color }; } } catch (e) {}
    render();
    return true;
  }

  var tries = 0, iv = setInterval(function () { if (install() || ++tries > 80) clearInterval(iv); }, 150);
})();
