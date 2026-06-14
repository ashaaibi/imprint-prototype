/* ═══════════════════════════════════════════════════════════
   IMPRINT — Marketplace runtime (app.js)
   App nav + footer, favourites/follow/share state (localStorage),
   and shared HTML render helpers used by every marketplace page.
   Loads AFTER shared.js + catalog.js.
═══════════════════════════════════════════════════════════ */
(function () {
  var IMP = window.IMP || {};

  /* ── Catalog accessors ─────────────────────────────────── */
  IMP.cat = function () { return window.IMPRINT_CATALOG || { products: [], artists: [], makers: [], collections: [], categories: [], tags: {} }; };
  function find(list, id) { var a = IMP.cat()[list] || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  IMP.product    = function (id) { return find('products', id); };
  IMP.artist     = function (id) { return find('artists', id); };
  IMP.maker      = function (id) { return find('makers', id); };
  IMP.collection = function (id) { return find('collections', id); };
  IMP.category   = function (id) { return find('categories', id); };
  IMP.artistName = function (id) { var a = IMP.artist(id); return a ? a.name : 'Imprint'; };
  IMP.productsBy = function (key, val) { return (IMP.cat().products || []).filter(function (p) { return Array.isArray(p[key]) ? p[key].indexOf(val) >= 0 : p[key] === val; }); };
  IMP.related = function (p, n) {
    n = n || 4;
    var pool = (IMP.cat().products || []).filter(function (x) { return x.id !== p.id && (x.category === p.category || x.artist === p.artist); });
    if (pool.length < n) pool = pool.concat((IMP.cat().products || []).filter(function (x) { return x.id !== p.id && pool.indexOf(x) < 0; }));
    return pool.slice(0, n);
  };

  /* ── Money ─────────────────────────────────────────────── */
  IMP.price = function (aed) { return (typeof formatPrice === 'function') ? formatPrice(aed) : ('AED ' + Number(aed).toFixed(2)); };

  /* ── Favourites (hearts) ───────────────────────────────── */
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  IMP.favs = function () { return lsGet('imprint_favs'); };
  IMP.isFav = function (id) { return IMP.favs().indexOf(id) >= 0; };
  IMP.toggleFav = function (id) {
    var f = IMP.favs(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    lsSet('imprint_favs', f); updateBadges();
    return i < 0;
  };
  /* ── Follows (artists) ─────────────────────────────────── */
  IMP.follows = function () { return lsGet('imprint_follows'); };
  IMP.isFollowing = function (id) { return IMP.follows().indexOf(id) >= 0; };
  IMP.toggleFollow = function (id) {
    var f = IMP.follows(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    lsSet('imprint_follows', f);
    return i < 0;
  };

  /* ── Share ─────────────────────────────────────────────── */
  IMP.share = function (title, url) {
    url = url || location.href;
    if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
    if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { toast('Link copied to clipboard'); }); }
    else { toast(url); }
  };
  function toast(m) { if (typeof imprintToast === 'function') imprintToast(m); }

  /* ── HTML render helpers ───────────────────────────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  IMP.esc = esc;

  /* Image objects from catalog.js: { l, s, lw, sw, h }. IMP.src → a usable URL;
     IMP.img → a responsive <img> (srcset + sizes + width/height + lazy/priority). */
  IMP.src = function (o) { return o ? (typeof o === 'string' ? o : o.l) : ''; };
  IMP.img = function (o, sizes, opts) {
    opts = opts || {};
    if (!o) return '';
    if (typeof o === 'string') o = { l: o, s: o, lw: 1200, sw: 480, h: 0 };
    var srcset = (o.s && o.s !== o.l) ? (' srcset="' + o.s + ' ' + o.sw + 'w, ' + o.l + ' ' + o.lw + 'w"') : '';
    var dims = o.h ? (' width="' + o.lw + '" height="' + o.h + '"') : '';
    var load = opts.eager ? ' fetchpriority="high"' : ' loading="lazy"';
    return '<img src="' + o.l + '"' + srcset + ' sizes="' + (sizes || '240px') + '"' + dims +
      ' alt="' + esc(opts.alt || '') + '"' + load + ' decoding="async"' + (opts.cls ? ' class="' + opts.cls + '"' : '') + '>';
  };

  IMP.stars = function (r) {
    var full = Math.round(r || 0), s = '<span class="s">';
    for (var i = 0; i < 5; i++) s += i < full ? '★' : '<span style="opacity:.3">★</span>';
    return s + '</span>';
  };

  var TAGS = function () { return IMP.cat().tags || {}; };
  IMP.tagRow = function (tags, max) {
    if (!tags || !tags.length) return '';
    var T = TAGS();
    return '<div class="tagrow">' + tags.slice(0, max || 3).map(function (t) {
      var d = T[t] || { label: t, tone: '' };
      return '<span class="tag tag-' + (d.tone || '') + '">' + esc(d.label) + '</span>';
    }).join('') + '</div>';
  };

  function heartSVG() { return '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>'; }
  IMP.favBtn = function (id) { return '<button class="fav-btn' + (IMP.isFav(id) ? ' on' : '') + '" data-fav="' + esc(id) + '" aria-label="Save to favourites" onclick="event.preventDefault();event.stopPropagation();">' + heartSVG() + '</button>'; };

  IMP.productCard = function (p) {
    if (!p) return '';
    var a = IMP.artist(p.artist);
    var topTag = (p.tags && p.tags.length) ? p.tags[0] : null;
    var T = TAGS();
    var topPill = topTag ? '<span class="tag tag-' + ((T[topTag] || {}).tone || '') + ' tag-pill-media">' + esc((T[topTag] || {}).label || topTag) + '</span>' : '';
    return '<a class="pcard" href="' + esc(p.href || (p.id + '/')) + '">' +
      '<div class="pcard-media">' + topPill + IMP.favBtn(p.id) +
        IMP.img(p.image, '(max-width:640px) 46vw, 240px', { alt: p.name }) + '</div>' +
      '<div class="pcard-body">' +
        '<div class="pcard-name">' + esc(p.name) + '</div>' +
        (a ? '<div class="pcard-by">by <b>' + esc(a.name) + '</b></div>' : '') +
        '<div class="pcard-foot">' +
          '<span class="pcard-price">' + IMP.price(p.price) + ' <span>/ unit</span></span>' +
          '<span class="pcard-rate"><span class="s">★</span>' + (p.rating || '') + '</span>' +
        '</div>' +
      '</div></a>';
  };

  IMP.artistCard = function (a) {
    if (!a) return '';
    return '<a class="acard" href="artists.html?a=' + esc(a.id) + '">' +
      '<div class="acard-cover">' + IMP.img(a.avatar, '(max-width:640px) 46vw, 240px', { alt: a.name }) + '</div>' +
      '<div class="acard-body">' +
        '<div class="acard-name">' + esc(a.name) + ' <span>' + (a.flag || '') + '</span></div>' +
        '<div class="acard-style">' + esc(a.style) + '</div>' +
        '<div class="acard-meta">' + (a.products ? a.products.length : 0) + ' designs · ' + (a.collections ? a.collections.length : 0) + ' collections · ' + fmtK(a.followers) + ' followers</div>' +
      '</div></a>';
  };

  IMP.collectionCard = function (c) {
    if (!c) return '';
    var a = IMP.artist(c.artist);
    return '<a class="colcard" href="search.html?collection=' + esc(c.id) + '" style="background:' + esc(c.accent || '#c79a63') + '">' +
      IMP.img(c.image, '(max-width:640px) 46vw, 220px', { alt: c.name }) + '<div class="col-grad"></div>' +
      '<div class="col-body"><div class="col-name">' + esc(c.name) + '</div>' +
      (a ? '<div class="col-by">by ' + esc(a.name) + '</div>' : '') + '</div></a>';
  };

  IMP.makerCard = function (m) {
    if (!m) return '';
    return '<a class="mcard" href="manufacturers.html?m=' + esc(m.id) + '">' +
      '<div class="mcard-top"><div class="m-logo" style="background:' + esc(m.color) + '">' + initials(m.name) + '</div>' +
        '<div><div class="mcard-name">' + esc(m.name) + '</div><div class="mcard-loc">' + (m.flag || '') + ' ' + esc(m.country) + ' · since ' + m.since + '</div></div></div>' +
      '<div class="mcard-stats">' +
        '<div><div class="v">★ ' + m.rating + '</div><div class="l">Rating</div></div>' +
        '<div><div class="v">' + m.leadDays + 'd</div><div class="l">Lead time</div></div>' +
        '<div><div class="v">' + m.moq + '</div><div class="l">MOQ</div></div>' +
      '</div>' +
      '<div class="chips-sm">' + (m.finishes || []).slice(0, 4).map(function (f) { return '<span class="chip-sm">' + esc(f) + '</span>'; }).join('') + '</div>' +
    '</a>';
  };

  function initials(n) { return (n || '').split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function fmtK(n) { n = n || 0; return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : '' + n; }
  IMP.fmtK = fmtK; IMP.initials = initials;

  /* ── App header (secondary nav) + footer ───────────────── */
  var NAV = [
    ['products', 'Products', 'products.html'],
    ['artists', 'Artists', 'artists.html'],
    ['makers', 'Manufacturers', 'manufacturers.html'],
    ['collections', 'Collections', 'collections.html'],
    ['how', 'How it works', 'index.html#how']
  ];
  function ico(name) {
    var p = {
      search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
      heart: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>',
      bag: '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'
    }[name];
    return '<svg viewBox="0 0 24 24" fill="' + (name === 'heart' ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }
  IMP.initAppHeader = function (opts) {
    opts = opts || {};
    if (typeof initSiteHeader === 'function') initSiteHeader({ activePage: opts.activePage, showCart: opts.showCart !== false });
    var mount = document.getElementById('site-nav');
    if (!mount) return;
    var active = opts.activePage || '';
    var links = NAV.map(function (n) { return '<a href="' + n[2] + '"' + (n[0] === active ? ' class="active"' : '') + '>' + n[1] + '</a>'; }).join('');
    var q = '';
    try { q = new URLSearchParams(location.search).get('q') || ''; } catch (e) {}
    mount.innerHTML =
      '<div class="app-nav"><div class="an-inner">' +
        '<nav class="an-links">' + links + '</nav>' +
        '<form class="an-search" onsubmit="return IMP._search(this)">' + ico('search') +
          '<input type="search" name="q" placeholder="Search products, artists, styles…" value="' + IMP.esc(q) + '" aria-label="Search">' +
        '</form>' +
        '<div class="an-icons">' +
          '<a class="an-ico" href="favourites.html" aria-label="Favourites" title="Favourites">' + ico('heart') + '<span class="an-badge" id="fav-badge" style="display:none">0</span></a>' +
          '<a class="an-ico" href="orders.html" aria-label="Orders" title="Orders">' + ico('bag') + '</a>' +
          '<a class="an-ico" href="account.html" aria-label="Account" title="Account">' + ico('user') + '</a>' +
        '</div>' +
      '</div></div>';
    updateBadges();
  };
  IMP._search = function (form) { var v = (form.q.value || '').trim(); location.href = 'search.html' + (v ? '?q=' + encodeURIComponent(v) : ''); return false; };

  IMP.initFooter = function () {
    var mount = document.getElementById('site-footer');
    if (!mount) return;
    mount.innerHTML =
      '<footer class="app-footer"><div class="af-inner">' +
        '<div class="af-brand"><div class="l">IMPRINT<span style="color:var(--imp-gold)">®</span></div>' +
          '<p>The marketplace that connects independent artists, brands, and vetted manufacturers — design, customise, and produce premium packaging in one seamless, automated flow.</p></div>' +
        '<div class="af-col"><h5>Shop</h5><a href="products.html">Products</a><a href="collections.html">Collections</a><a href="search.html">Search</a><a href="favourites.html">Favourites</a></div>' +
        '<div class="af-col"><h5>Network</h5><a href="artists.html">Artists</a><a href="manufacturers.html">Manufacturers</a><a href="index.html#how">How it works</a><a href="designer/index.html">For designers</a></div>' +
        '<div class="af-col"><h5>Account</h5><a href="account.html">My account</a><a href="orders.html">Orders</a><a href="checkout.html">Cart</a><a href="#">Help centre</a></div>' +
      '</div><div class="af-bottom">© 2026 IMPRINT®. A three-sided packaging marketplace · artists · brands · manufacturers. All rights reserved.</div></footer>';
  };

  function updateBadges() {
    var b = document.getElementById('fav-badge');
    if (b) { var n = IMP.favs().length; b.textContent = n; b.style.display = n ? 'flex' : 'none'; }
  }
  IMP.updateBadges = updateBadges;

  /* ── Global delegation: hearts, follows, share ─────────── */
  document.addEventListener('click', function (e) {
    var fav = e.target.closest && e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      var on = IMP.toggleFav(fav.getAttribute('data-fav'));
      fav.classList.toggle('on', on);
      toast(on ? 'Saved to favourites' : 'Removed from favourites');
      document.dispatchEvent(new CustomEvent('imprint:favchange'));
      return;
    }
    var fol = e.target.closest && e.target.closest('[data-follow]');
    if (fol) {
      e.preventDefault();
      var f = IMP.toggleFollow(fol.getAttribute('data-follow'));
      fol.classList.toggle('following', f);
      fol.textContent = f ? 'Following' : 'Follow';
      toast(f ? 'Following ' + (fol.getAttribute('data-name') || 'artist') : 'Unfollowed');
      return;
    }
    var sh = e.target.closest && e.target.closest('[data-share]');
    if (sh) { e.preventDefault(); IMP.share(sh.getAttribute('data-share-title') || document.title, sh.getAttribute('data-share') || location.href); }
  });

  /* ══ Motion: scroll reveals · stat count-up · page transitions ══════════
     Progressive enhancement + reduced-motion aware. Every effect degrades to
     the final visible state, so nothing here can hide content if it fails. */
  function prefersReduce() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  IMP.initMotion = function () {
    var reduce = prefersReduce();
    var hasIO = ('IntersectionObserver' in window);

    /* ── Scroll reveals ── (only hide content when we can reliably reveal it) */
    if (!reduce && hasIO) {
      var sel = '.sec-head, .statstrip, .three-sided > *, .join-grid > *, ' +
                '.pgrid > *, .agrid > *, .colgrid > *, .mgrid > *, .catrow > *, ' +
                '.trio > *, .pdp-related .pcard, .pdp-specs, .reviews';
      var nodes = [];
      try { nodes = Array.prototype.slice.call(document.querySelectorAll(sel)); } catch (e) { nodes = []; }
      if (nodes.length) {
        var ioR = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ioR.unobserve(en.target); } });
        }, { rootMargin: '0px 0px -7% 0px', threshold: 0.03 });
        nodes.forEach(function (n, i) {
          if (n.closest && n.closest('.lhero')) return;   /* never hide the above-the-fold hero (LCP) */
          n.classList.add('reveal');
          var d = (i % 6) * 45; if (d) n.style.setProperty('--reveal-d', d + 'ms');
          ioR.observe(n);
        });
        /* Failsafe: if anything is still hidden after 2.4s (e.g. observer never fired), show it. */
        setTimeout(function () { nodes.forEach(function (n) { if (!n.classList.contains('in')) { var r = n.getBoundingClientRect(); if (r.top < (window.innerHeight || 0)) n.classList.add('in'); } }); }, 2400);
      }
    }

    /* ── Stat count-up ── */
    var counters = [];
    try { counters = Array.prototype.slice.call(document.querySelectorAll('.statstrip .v, [data-count]')); } catch (e) { counters = []; }
    function runCount(el) {
      var raw = (el.getAttribute('data-count') || el.textContent || '').trim();
      var m = raw.match(/^([^\d]*)(\d[\d,]*)(.*)$/);
      if (!m) return;
      var pre = m[1], suf = m[3], target = parseInt(m[2].replace(/,/g, ''), 10);
      if (!isFinite(target)) return;
      if (reduce) { el.textContent = pre + target.toLocaleString() + suf; return; }
      var t0 = null, dur = 1100;
      (function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + Math.round(target * e).toLocaleString() + suf;
        if (p < 1) requestAnimationFrame(frame);
      });
    }
    if (counters.length) {
      if (reduce || !hasIO) { counters.forEach(runCount); }
      else {
        var ioC = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { requestAnimationFrame(function(){ runCount(en.target); }); ioC.unobserve(en.target); } });
        }, { threshold: 0.6 });
        counters.forEach(function (el) { ioC.observe(el); });
      }
    }

    /* ── Page transitions: fade out + gold shimmer when leaving to an internal page ── */
    if (!reduce) {
      var bar = null;
      document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a'); if (!a) return;
        var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download')) return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
        if (a.hasAttribute('data-no-transition') || a.hasAttribute('data-fav') || a.hasAttribute('data-follow') || a.hasAttribute('data-share')) return;
        var url; try { url = new URL(a.href, location.href); } catch (_) { return; }
        if (url.origin !== location.origin) return;                                  /* external link */
        if (url.pathname === location.pathname && (url.hash || url.search === location.search)) return; /* same page */
        e.preventDefault();
        if (!bar) { bar = document.createElement('div'); bar.className = 'route-shimmer'; }
        if (!bar.parentNode) document.body.appendChild(bar);
        document.documentElement.classList.add('is-leaving');
        var dest = a.href, done = false;
        function go() { if (done) return; done = true; location.href = dest; }
        setTimeout(go, 210);   /* navigate just after the fade */
        setTimeout(go, 650);   /* safety fallback */
      }, false);
      /* bfcache restore → clear the leaving state so the page isn't stuck faded out */
      window.addEventListener('pageshow', function () { document.documentElement.classList.remove('is-leaving'); if (bar && bar.parentNode) bar.parentNode.removeChild(bar); });
    }
  };

  document.addEventListener('DOMContentLoaded', function () { IMP.initFooter(); updateBadges(); try { IMP.initMotion(); } catch (e) {} });
  document.addEventListener('imprint:langchange', updateBadges);

  window.IMP = IMP;
})();
