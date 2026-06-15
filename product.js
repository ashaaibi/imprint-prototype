/* ═══════════════════════════════════════════════════════════
   IMPRINT — Product PDP renderer (product.js)
   Lean PDP: gallery · a prominent ORDER card up top (live estimate +
   Customise + Add to cart) · size · quantity · compact specs.
   Manufacturer choice + reviews + their work now live in CHECKOUT
   (the 4-step flow), not here — the PDP shows only an indicative
   estimate using the recommended maker.
═══════════════════════════════════════════════════════════ */
(function () {
  var SIZES = [
    { name: 'Small',  sub: 'Compact',   note: 'Made to order' },
    { name: 'Medium', sub: 'Standard',  note: 'Most popular' },
    { name: 'Large',  sub: 'Statement', note: 'Made to order' }
  ];
  var TIERS = [
    { qty: 200,  mul: 1.00, save: 0 },
    { qty: 500,  mul: 0.82, save: 18 },
    { qty: 1000, mul: 0.68, save: 32 },
    { qty: 2000, mul: 0.55, save: 45 }
  ];
  var p, makers, gal, sel = { size: 1, tier: 2 };

  function deliveryDate(days) { var d = new Date(); d.setDate(d.getDate() + (days || 9)); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }

  function render() {
    var m = makers[0], tier = TIERS[sel.tier];   // estimate uses the recommended maker; real choice is at checkout
    document.getElementById('pdp-size-dims').textContent = SIZES[sel.size].sub;
    document.getElementById('pdp-sizes').innerHTML = SIZES.map(function (s, i) {
      return '<button class="pdp-opt' + (i === sel.size ? ' on' : '') + '" onclick="__pdp.size(' + i + ')"><span class="o-name">' + s.name + '</span><span class="o-sub">' + s.sub + '</span><span class="o-sub">' + s.note + '</span></button>';
    }).join('');
    document.getElementById('pdp-qty').innerHTML = TIERS.map(function (t, i) {
      var pu = p.price * t.mul * m.priceMul;
      return '<div class="pdp-qrow' + (i === sel.tier ? ' on' : '') + '" onclick="__pdp.tier(' + i + ')"><span class="q-qty">' + t.qty.toLocaleString() + ' units' + (t.save ? '<span class="q-save">Save ' + t.save + '%</span>' : '') + '</span><span class="q-pu">' + IMP.price(pu) + ' / unit</span><span class="q-total">' + IMP.price(t.qty * pu) + '</span></div>';
    }).join('');
    var pu = p.price * tier.mul * m.priceMul, base = tier.qty * pu;
    var c = (typeof getCountry === 'function') ? getCountry() : { vat: 0.05, vatLabel: '5% VAT' };
    var vat = base * (c.vat || 0), total = base + vat;
    document.getElementById('pdp-base-lbl').textContent = tier.qty.toLocaleString() + ' units × ' + IMP.price(pu);
    document.getElementById('pdp-base-val').textContent = IMP.price(base);
    document.getElementById('pdp-vat-lbl').textContent = c.vatLabel || 'VAT';
    document.getElementById('pdp-vat-val').textContent = IMP.price(vat);
    document.getElementById('pdp-total-val').textContent = IMP.price(total);
    document.getElementById('pdp-deliv-date').textContent = deliveryDate(m.leadDays);
  }

  window.__pdp = {
    size: function (i) { sel.size = i; render(); },
    tier: function (i) { sel.tier = i; render(); },
    customise: function () {
      if (p.template) { location.href = (p.configurator || 'configurator.html') + '?template=' + encodeURIComponent(p.template); }
      else if (typeof imprintToast === 'function') { imprintToast('This design is a showcase preview — 3D customising isn’t available yet.'); }
    },
    addToCart: function () {
      var m = makers[0], tier = TIERS[sel.tier], pu = p.price * tier.mul * m.priceMul;
      try { setCart({ product: p.name, productId: p.id, size: SIZES[sel.size].name, qty: tier.qty, perUnit: pu, baseTotal: tier.qty * pu, manufacturer: m.name, leadDays: m.leadDays, hasArtwork: false }); } catch (e) {}
      location.href = 'checkout.html';
    }
  };

  function boot() {
    var root = document.getElementById('pdp-root'); if (!root) return;
    if (typeof IMP.initAppHeader === 'function') IMP.initAppHeader({ activePage: 'products' });
    p = IMP.product(root.getAttribute('data-product'));
    if (!p) { root.innerHTML = '<div class="imp-wrap"><div class="empty-state"><h2>Product not found</h2><p>This design may have moved. <a href="products.html">Browse all products →</a></p></div></div>'; return; }
    document.title = p.name + ' — IMPRINT®';
    makers = (p.makers || []).map(IMP.maker).filter(Boolean);
    if (!makers.length) { var im = IMP.maker('imprint-atelier'); makers = im ? [im] : (IMP.cat().makers || []).slice(0, 1); }
    var a = IMP.artist(p.artist), cat = IMP.category(p.category);
    gal = (p.gallery && p.gallery.length) ? p.gallery : [p.image];
    var thumbs = gal.map(function (g, i) { return '<div class="pdp-thumb' + (i === 0 ? ' on' : '') + '" data-i="' + i + '"><img src="' + IMP.src(g) + '" alt="" loading="lazy" decoding="async"></div>'; }).join('');
    var T = IMP.cat().tags || {};
    var tagPills = (p.tags || []).slice(0, 3).map(function (t) {
      var cls = (t === 'eco') ? 'eco' : (t === 'hot' || t === 'trending' || t === 'new' || t === 'foil') ? 'trend' : 'rated';
      return '<span class="pdp-tag ' + cls + '">' + IMP.esc((T[t] || {}).label || t) + '</span>';
    }).join('') + '<span class="pdp-tag rated">★ ' + p.rating + ' rated</span>';

    /* ── The ORDER card (top, above the fold): live estimate + the two CTAs ── */
    var orderCard =
      '<div class="pdp-order">' +
        '<div class="pdp-pricebox">' +
          '<div class="pdp-prow"><span id="pdp-base-lbl"></span><span id="pdp-base-val"></span></div>' +
          '<div class="pdp-prow"><span id="pdp-vat-lbl"></span><span id="pdp-vat-val"></span></div>' +
          '<div class="pdp-prow total"><span>Estimate</span><span id="pdp-total-val"></span></div>' +
          '<div class="pdp-est-note">Indicative — your final price is set at checkout when you choose a maker.</div>' +
          '<div class="pdp-deliv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg><span>Est. delivery <b id="pdp-deliv-date"></b> · ships across the GCC</span></div>' +
        '</div>' +
        '<div class="pdp-ctas"><button class="pdp-cta ' + (p.template ? 'primary' : 'soon') + '" onclick="__pdp.customise()">' + (p.template ? 'Customise in 3D' : 'Customise — soon') + '</button><button class="pdp-cta" onclick="__pdp.addToCart()">Add to cart</button></div>' +
        '<div class="pdp-reassure">' + (p.template ? 'Opens the 3D studio on the Design step. ' : 'This is a showcase template — 3D customising is coming soon. ') + 'No account needed · pick your maker &amp; pay at checkout.</div>' +
      '</div>';

    root.innerHTML =
      '<div class="pdp"><div class="pdp-grid">' +
        '<div class="pdp-gallery"><div class="pdp-stage" id="pdp-stage"><img id="pdp-main" src="' + IMP.src(gal[0]) + '" alt="' + IMP.esc(p.name) + '" decoding="async"><span class="pdp-stage-tag">' + (cat ? IMP.esc(cat.name) : 'Template') + '</span></div><div class="pdp-thumbs" id="pdp-thumbs">' + thumbs + '</div></div>' +
        '<div class="pdp-info">' +
          '<div class="pdp-tags">' + tagPills + '</div>' +
          '<h1 class="pdp-title">' + IMP.esc(p.name) + '</h1>' +
          '<div class="pdp-stars"><span class="stars">★★★★★</span> <span><b style="color:var(--imp-fg)">' + p.rating + '</b> · ' + p.reviews + ' reviews</span></div>' +
          (a ? '<a class="pdp-artist" href="artists.html?a=' + a.id + '"><img src="' + IMP.src(a.avatar) + '" alt="' + IMP.esc(a.name) + '" decoding="async"><div style="flex:1"><div class="pa-name">' + IMP.esc(a.name) + ' ' + (a.flag || '') + '</div><div class="pa-style">' + IMP.esc(a.style) + ' · view profile →</div></div><button class="follow-btn' + (IMP.isFollowing(a.id) ? ' following' : '') + '" data-follow="' + a.id + '" data-name="' + IMP.esc(a.name) + '" onclick="event.preventDefault()">' + (IMP.isFollowing(a.id) ? 'Following' : 'Follow') + '</button></a>' : '') +
          orderCard +
          '<div class="pdp-label"><span>Size</span><span class="pdp-label-note" id="pdp-size-dims"></span></div><div class="pdp-sizes" id="pdp-sizes"></div>' +
          '<div class="pdp-label"><span>Quantity</span><span class="pdp-label-note">More units · lower price</span></div><div class="pdp-qty" id="pdp-qty"></div>' +
        '</div>' +
      '</div>' +
      '<div class="pdp-details"><div><h2 class="pdp-sec-title">Specifications</h2><table class="pdp-specs-tbl">' +
        '<tr><td>Category</td><td>' + (cat ? IMP.esc(cat.name) : '—') + '</td></tr>' +
        '<tr><td>Designer</td><td>' + (a ? IMP.esc(a.name) + ' · ' + IMP.esc(a.studio) : 'Imprint') + '</td></tr>' +
        '<tr><td>Customisation</td><td>Locked designer template · text &amp; colours editable</td></tr>' +
        '<tr><td>Production</td><td>Choose your maker, finishes &amp; lead time at checkout</td></tr>' +
      '</table></div>' +
      '<div><h2 class="pdp-sec-title">Locked template</h2>' +
        '<div class="locknote" style="margin-top:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg><span>Layout locked by ' + (a ? IMP.esc(a.name) : 'the designer') + ' · swap text, colours &amp; social handles in 3D</span></div></div>' +
      '</div></div>';

    var thumbsEl = document.getElementById('pdp-thumbs');
    thumbsEl.addEventListener('click', function (e) {
      var t = e.target.closest('.pdp-thumb'); if (!t) return;
      thumbsEl.querySelectorAll('.pdp-thumb').forEach(function (x) { x.classList.remove('on'); }); t.classList.add('on');
      document.getElementById('pdp-main').src = IMP.src(gal[parseInt(t.getAttribute('data-i'), 10)]);
    });

    render();
    document.addEventListener('imprint:langchange', render);

    var rel = IMP.related(p, 4);
    if (rel.length) {
      var sec = document.createElement('section'); sec.className = 'imp-wrap sec';
      sec.innerHTML = '<div class="sec-head"><div><h2 class="sec-title">You may also like</h2></div><a class="sec-link" href="products.html">All products →</a></div><div class="pgrid">' + rel.map(IMP.productCard).join('') + '</div>';
      root.appendChild(sec);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
