/* ═══════════════════════════════════════════════════════════
   IMPRINT — Lean product PDP renderer (product.js)
   Renders #pdp-root[data-product] from the catalog. The flagship
   Honeyloom Gift Bag has its own hand-built rich PDP and does NOT
   use this file.
═══════════════════════════════════════════════════════════ */
(function () {
  function lockSVG() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>'; }

  function render() {
    var root = document.getElementById('pdp-root');
    if (!root) return;
    var id = root.getAttribute('data-product');
    var p = IMP.product(id);
    if (typeof IMP.initAppHeader === 'function') IMP.initAppHeader({ activePage: 'products' });

    if (!p) {
      root.innerHTML = '<div class="imp-wrap"><div class="empty-state"><h2>Product not found</h2><p>This design may have moved. <a href="products.html">Browse all products →</a></p></div></div>';
      return;
    }
    document.title = p.name + ' — IMPRINT®';

    var a = IMP.artist(p.artist);
    var cat = IMP.category(p.category);
    var makers = (p.makers || []).map(IMP.maker).filter(Boolean);
    var primary = makers[0];

    // Gallery
    var gal = (p.gallery && p.gallery.length) ? p.gallery : [p.image];
    var thumbs = gal.map(function (g, i) {
      return '<div class="pdp-thumb' + (i === 0 ? ' on' : '') + '" data-i="' + i + '"><img src="' + IMP.src(g) + '" alt="" loading="lazy" decoding="async"></div>';
    }).join('');

    // Sizes — locked placeholder templates expose a single fixed size; others show the
    // standard range with the rest visibly locked (mirrors the configurator lock).
    var SIZES = [['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['XL', 'X-Large']];
    var fixedSize = p.size || 'M';
    var sizeChips = SIZES.map(function (s) {
      var locked = (s[0] !== fixedSize);
      return '<span class="size-chip' + (locked ? ' locked' : ' sel') + '" title="' + (locked ? 'Locked by the designer' : 'Set by this template') + '">' +
        s[1] + (locked ? ' ' + lockSVG() : '') + '</span>';
    }).join('');

    var ctaHref = p.template ? ((p.configurator || 'configurator.html') + '?template=' + encodeURIComponent(p.template)) : 'configurator.html';

    root.innerHTML =
      '<div class="imp-wrap pdp">' +
        '<div class="pdp-bc"><a href="index.html">Home</a><span class="sep">/</span><a href="products.html">Products</a>' +
          (cat ? '<span class="sep">/</span><a href="products.html#' + cat.id + '">' + IMP.esc(cat.name) + '</a>' : '') +
          '<span class="sep">/</span>' + IMP.esc(p.name) + '</div>' +
        '<div class="pdp-grid">' +
          '<div class="pdp-gallery">' +
            '<div class="pdp-stage" id="pdp-stage"><img id="pdp-main" src="' + IMP.src(gal[0]) + '" alt="' + IMP.esc(p.name) + '" decoding="async"></div>' +
            (gal.length > 1 ? '<div class="pdp-thumbs" id="pdp-thumbs">' + thumbs + '</div>' : '') +
          '</div>' +
          '<div class="pdp-info">' +
            IMP.tagRow(p.tags, 4) +
            '<h1 class="pdp-title">' + IMP.esc(p.name) + '</h1>' +
            '<div style="display:flex;align-items:center;gap:12px;color:var(--imp-fg-2);font-size:13.5px">' +
              '<span class="pcard-rate"><span class="s">★</span> ' + p.rating + ' <span style="color:var(--imp-fg-3)">(' + p.reviews + ' reviews)</span></span>' +
              (cat ? '<span>·</span><span>' + IMP.esc(cat.name) + '</span>' : '') +
            '</div>' +
            '<div class="pdp-price">' + IMP.price(p.price) + ' <span>/ unit · from</span></div>' +
            (a ? '<a class="pdp-artist" href="artists.html?a=' + a.id + '">' +
                '<img src="' + IMP.src(a.avatar) + '" alt="' + IMP.esc(a.name) + '" decoding="async">' +
                '<div style="flex:1"><div class="pa-name">' + IMP.esc(a.name) + ' ' + (a.flag || '') + '</div><div class="pa-style">' + IMP.esc(a.style) + ' · view profile →</div></div>' +
                '<button class="follow-btn' + (IMP.isFollowing(a.id) ? ' following' : '') + '" data-follow="' + a.id + '" data-name="' + IMP.esc(a.name) + '" onclick="event.preventDefault()">' + (IMP.isFollowing(a.id) ? 'Following' : 'Follow') + '</button>' +
              '</a>' : '') +
            '<p class="pdp-blurb">' + IMP.esc(p.blurb) + '</p>' +
            '<div style="margin-top:16px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--imp-fg-3);margin-bottom:2px">Size</div><div class="size-chips">' + sizeChips + '</div></div>' +
            '<div class="pdp-cta">' +
              '<a class="btn btn-primary" href="' + ctaHref + '">' + (p.template ? 'Customise in 3D' : 'Open in 3D studio') + '</a>' +
              '<button class="btn btn-icon' + (IMP.isFav(p.id) ? ' on-fav' : '') + '" data-fav="' + p.id + '" aria-label="Favourite" title="Save">' +
                '<svg viewBox="0 0 24 24" fill="' + (IMP.isFav(p.id) ? '#e0556b' : 'none') + '" stroke="' + (IMP.isFav(p.id) ? '#e0556b' : 'currentColor') + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg></button>' +
              '<button class="btn btn-icon" data-share="' + IMP.esc((p.href || (p.id + '/'))) + '" data-share-title="' + IMP.esc(p.name) + '" aria-label="Share" title="Share">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg></button>' +
            '</div>' +
            '<div class="locknote">' + lockSVG() + '<span>This is a <b>locked designer template</b> — the layout, finish and size are set by ' + (a ? IMP.esc(a.name) : 'the designer') + '. Open it in the studio to swap text, colours and social handles, then add to cart.</span></div>' +
            '<table class="spectable">' +
              '<tr><td>Category</td><td>' + (cat ? IMP.esc(cat.name) : '—') + '</td></tr>' +
              '<tr><td>Designer</td><td>' + (a ? IMP.esc(a.name) + ' · ' + IMP.esc(a.studio) : 'Imprint') + '</td></tr>' +
              '<tr><td>Material & finish</td><td>Premium board · ' + (primary ? primary.finishes.slice(0, 3).join(' · ') : 'gloss · matte · foil') + '</td></tr>' +
              '<tr><td>Min. order</td><td>' + (primary ? primary.moq : 250) + ' units</td></tr>' +
              '<tr><td>Lead time</td><td>from ' + (primary ? primary.leadDays : 9) + ' days</td></tr>' +
            '</table>' +
            (makers.length ? '<div style="margin-top:18px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--imp-fg-3);margin-bottom:6px">Produced by</div><div class="makers-row">' +
              makers.map(function (m) { return '<a class="maker-chip" href="manufacturers.html?m=' + m.id + '"><span class="ml" style="background:' + m.color + '">' + IMP.initials(m.name) + '</span>' + IMP.esc(m.name) + '</a>'; }).join('') + '</div></div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';

    // gallery thumb switching
    var thumbsEl = document.getElementById('pdp-thumbs');
    if (thumbsEl) {
      thumbsEl.querySelectorAll('.pdp-thumb').forEach(function (t) {
        t.addEventListener('click', function () {
          document.getElementById('pdp-main').src = IMP.src(gal[parseInt(t.getAttribute('data-i'), 10)]);
          thumbsEl.querySelectorAll('.pdp-thumb').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on');
        });
      });
    }

    // related
    var rel = IMP.related(p, 4);
    if (rel.length) {
      var sec = document.createElement('div');
      sec.className = 'imp-wrap sec';
      sec.innerHTML = '<div class="sec-head"><div><h2 class="sec-title">You may also like</h2></div><a class="sec-link" href="products.html">All products →</a></div>' +
        '<div class="pgrid">' + rel.map(IMP.productCard).join('') + '</div>';
      root.appendChild(sec);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
