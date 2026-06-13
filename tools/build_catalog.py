#!/usr/bin/env python3
"""
IMPRINT catalog builder — single source of truth for the marketplace.

Reads the curated asset zips (already extracted to SRC), copies/renames the
images into ./assets/, and emits:
  - catalog.js                 -> window.IMPRINT_CATALOG (read by every page)
  - <product-slug>/index.html  -> clean-URL product pages (shared lean PDP)

Honeyloom Gift Bag keeps its own hand-built rich PDP at /honeyloom-gift-bag/,
so this script does NOT overwrite that folder.

Re-run after changing assets or data:  python3 tools/build_catalog.py
"""
import os, re, json, shutil, hashlib, glob
try:
    from PIL import Image
    _HAVE_PIL = True
except Exception:
    _HAVE_PIL = False

# ── Responsive WebP pipeline ────────────────────────────────────────────────
# For each source image we emit two right-sized WebP variants (sm + lg, never
# upscaled) next to it, and rewrite the catalog image fields to {l,s,lw,sw,h}
# so the render helpers can build <img srcset/sizes/width/height/loading>.
WEBP_WIDTHS = (480, 1200)   # sm, lg
_IMGCACHE = {}
def _webp_set(rel):
    """rel = repo-relative source path (already copied). Returns image object or the raw path."""
    if rel in _IMGCACHE: return _IMGCACHE[rel]
    src = os.path.join(ROOT, rel)
    if not _HAVE_PIL or not os.path.exists(src):
        obj = {"l": rel, "s": rel, "lw": 1200, "sw": 480, "h": 0}; _IMGCACHE[rel]=obj; return obj
    try:
        im = Image.open(src)
        if im.mode in ("P", "LA", "PA"): im = im.convert("RGBA")
        elif im.mode == "CMYK": im = im.convert("RGB")
        nw, nh = im.size
        base, _ = os.path.splitext(rel)
        out = {}
        for tag, w in (("s", WEBP_WIDTHS[0]), ("l", WEBP_WIDTHS[1])):
            tw = min(w, nw); th = max(1, round(nh * tw / nw))
            dst = f"{base}-{tag}.webp"
            v = im.resize((tw, th), Image.LANCZOS) if tw != nw else im
            v.save(os.path.join(ROOT, dst), "WEBP", quality=80, method=4)
            out[tag] = dst; out[tag+"w_"] = tw; out["h_"+tag] = th
        obj = {"l": out["l"], "s": out["s"], "lw": out["lw_"], "sw": out["sw_"], "h": out["h_l"]}
    except Exception as e:
        print("webp fail", rel, e); obj = {"l": rel, "s": rel, "lw": 1200, "sw": 480, "h": 0}
    _IMGCACHE[rel] = obj; return obj

def prep_images(catalog):
    if not _HAVE_PIL:
        print("⚠ Pillow not available — skipping WebP generation (paths left as-is).")
    n0 = len(_IMGCACHE)
    for p in catalog["products"]:
        if isinstance(p.get("image"), str): p["image"] = _webp_set(p["image"])
        if p.get("gallery"): p["gallery"] = [_webp_set(g) if isinstance(g, str) else g for g in p["gallery"]]
    for c in catalog["collections"]:
        if isinstance(c.get("image"), str): c["image"] = _webp_set(c["image"])
    for a in catalog["artists"]:
        if isinstance(a.get("avatar"), str) and a["avatar"]: a["avatar"] = _webp_set(a["avatar"])
    catalog["bags"] = [_webp_set(b) if isinstance(b, str) else b for b in catalog.get("bags", [])]
    print(f"WebP variants generated for {len(_IMGCACHE)-n0} unique source images" + ("" if _HAVE_PIL else " (SKIPPED)"))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = "/tmp/imp_assets"                      # extracted zips
ASSETS = os.path.join(ROOT, "assets")
HONEYLOOM_SLUG = "honeyloom-gift-bag"          # hand-built rich PDP, never stubbed

def h(s, mod):
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % mod

def slugify(s):
    s = re.sub(r'\.[a-z0-9]+$', '', s, flags=re.I)
    s = re.sub(r'^\d+[-_ ]*', '', s)            # strip leading index
    s = s.lower().replace('_', '-').replace(' ', '-')
    s = re.sub(r'[^a-z0-9-]', '', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s

ABBR = {'ab':'AB','la':'La','co':'Co','and':'&'}
def titleize(slug):
    words = []
    for w in slug.split('-'):
        if w in ABBR: words.append(ABBR[w])
        elif len(w) <= 2 and w not in ('of','to','in'): words.append(w.upper())
        else: words.append(w.capitalize())
    name = ' '.join(words)
    name = name.replace('Petite', 'Petite').replace(' And ', ' & ')
    return name

# ── CATEGORIES ───────────────────────────────────────────────────────────────
CATEGORIES = [
    ("bags",       "Bags & Totes",         "Luxury shopping, gift & garment bags with foil, emboss and ribbon handles."),
    ("boxes",      "Rigid & Gift Boxes",   "Magnetic, rigid lid, book and folding boxes for premium unboxing."),
    ("mailer",     "Mailer & Shipping",    "Self-locking e-commerce mailers and branded shipping cartons."),
    ("food",       "Food & Gourmet",       "Bakery, chocolate, coffee and confectionery packaging."),
    ("beauty",     "Beauty & Fragrance",   "Perfume, cosmetic and candle packaging with a jewel-like finish."),
    ("jewellery",  "Jewellery & Keepsake", "Ring, velvet and keepsake boxes that protect and impress."),
    ("tubes",      "Tubes & Cylinders",    "Round rigid tubes for spirits, cosmetics, posters and gifting."),
    ("floral",     "Floral & Bouquet",     "Bouquet wraps and flower boxes for florists and events."),
    ("stationery", "Stationery & Cards",   "Branded stationery sets, cards and enclosures."),
]
CAT_IDS = [c[0] for c in CATEGORIES]

def category_for(slug):
    s = slug
    rules = [
        ("mailer", "mailer"),
        ("floral", "bouquet|flower|petal|bloom|wrap"),
        ("jewellery", "ring|jewel|jewelry|keepsake|velvet"),
        ("tubes", "tube|cylinder"),
        ("beauty", "perfume|cosmetic|candle|beauty|fragrance"),
        ("food", "chocolate|truffle|cake|bakery|coffee|cup|tin|sugar|spice|candy|gourmet"),
        ("stationery", "stationery|card|note"),
        ("bags", "bag|tote|garment|abaya|shopping"),
        ("boxes", "box|carton|favor|favour|book"),
    ]
    for cid, pat in rules:
        if re.search(pat, s): return cid
    return "boxes"

# ── TAGS ─────────────────────────────────────────────────────────────────────
TAGS = {
    "hot":        {"label": "Hot",          "tone": "hot"},
    "trending":   {"label": "Trending",     "tone": "trend"},
    "new":        {"label": "New",          "tone": "new"},
    "bestseller": {"label": "Bestseller",   "tone": "best"},
    "editors":    {"label": "Editor's pick","tone": "editor"},
    "eco":        {"label": "Eco",          "tone": "eco"},
    "foil":       {"label": "Foil",         "tone": "foil"},
    "limited":    {"label": "Limited",      "tone": "limited"},
}

# ── ARTISTS (13) ─────────────────────────────────────────────────────────────
# avatar index = position; styleTags drive product/collection matching.
ARTISTS = [
 ("aminata-diallo",   "Aminata Diallo",   "Atelier Sahel",      "SN","🇸🇳","Heritage Textile", ["kraft","natural","neutral","taupe","woodland","botanical","earth"],
    "Aminata translates West-African textile heritage — mudcloth geometry, indigo and warm earth tones — into modern, tactile packaging."),
 ("kenji-sato",       "Kenji Sato",       "Studio Sumi",        "JP","🇯🇵","Quiet Line Work",  ["minimal","white","silver","clean","illustrated","line","fox"],
    "Kenji draws in fine ink lines and negative space — restrained, botanical-leaning illustration with a calm Japanese sensibility."),
 ("priya-nair",       "Priya Nair",       "Marigold Studio",    "IN","🇮🇳","Vibrant Floral",   ["floral","blush","pink","sage","soft","vibrant","botanical","wildflower"],
    "Priya bursts with colour — marigolds, paisley and joyful florals from South-Indian craft, tuned for celebration and gifting."),
 ("mateo-herrera",    "Mateo Herrera",    "Taller Herrera",     "MX","🇲🇽","Folk Maximalist",  ["abstract","multicolor","vibrant","playful","bold","colorful"],
    "Mateo is loud and proud — saturated folk-art colour blocks and papel-picado energy that leap off the shelf."),
 ("yasmin-al-najjar", "Yasmin Al-Najjar", "Najma Studio",       "AE","🇦🇪","Arabesque",        ["moroccan","arabesque","navy","copper","tin","ornate","gold","geometric"],
    "Yasmin builds tessellating Khaleeji geometry — zellige stars, gold lattices and arabesque borders that wrap seamlessly."),
 ("henrik-sorensen",  "Henrik Sørensen",  "Linea Nord",         "DK","🇩🇰","Scandinavian Minimal", ["minimal","white","silver","clean","kraft","neutral","gray"],
    "Henrik designs in a whisper — bone, brushed silver and uncoated kraft with one deliberate mark. Packaging that lets the product speak."),
 ("amina-yusuf",      "Amina Yusuf",      "Lagos Colour Lab",   "NG","🇳🇬","Bold Abstract",    ["abstract","multicolor","vibrant","bold","colorful","playful"],
    "Amina channels Lagos energy — bold abstract colour and pattern with fearless contrast, made to be seen across a room."),
 ("hana-lee",         "Hana Lee",         "Seoul Atelier",      "KR","🇰🇷","Emerald Deco",     ["deco","geometric","diamond","copper","emerald","gold","teal","chocolate"],
    "Hana pairs jewel-toned emerald and teal with warm gold foil — crisp deco geometry for confectionery and fine fragrance."),
 ("kwame-mensah",     "Kwame Mensah",     "Accra Geometric",    "GH","🇬🇭","Geometric Luxe",   ["geometric","charcoal","diamond","burgundy"],
    "Kwame fuses kente-inspired geometry with deep luxe palettes — charcoal, burgundy and gold for jewellery, spirits and couture."),
]

# Explicit collection -> artist (by filename stem keyword), curated for coherence.
COLLECTION_ARTIST = {
 "01-playful-abstract-multicolor":"mateo-herrera",
 "02-ivory-gold-lotus-luxury":"kwame-mensah",
 "03-floral-fox-woodland":"kenji-sato",
 "04-teal-gold-geometric":"hana-lee",
 "05-emerald-gold-deco-chocolate":"hana-lee",
 "06-cream-kraft-minimal":"henrik-sorensen",
 "07-blush-kraft-natural":"priya-nair",
 "08-emerald-copper-deco":"hana-lee",
 "09-neutral-taupe-botanical":"aminata-diallo",
 "10-white-gold-minimal":"henrik-sorensen",
 "11-woodland-botanical-cream":"aminata-diallo",
 "12-charcoal-copper-geometric":"kwame-mensah",
 "13-bold-abstract-colorful":"mateo-herrera",
 "14-white-silver-minimal":"kenji-sato",
 "15-sage-wildflower-illustrated":"kenji-sato",
 "16-charcoal-copper-diamond":"kwame-mensah",
 "17-vibrant-multicolor-abstract":"amina-yusuf",
 "18-burgundy-gold-ornate":"kwame-mensah",
 "19-blush-pink-floral":"priya-nair",
 "20-navy-copper-moroccan":"yasmin-al-najjar",
 "21-gray-kraft-mailer":"henrik-sorensen",
 "22-black-burgundy-gold-luxury":"kwame-mensah",
 "23-sage-blush-floral":"priya-nair",
 "24-navy-copper-moroccan-tin":"yasmin-al-najjar",
 "25-kraft-gray-natural":"aminata-diallo",
}

PALETTE = {  # collection stem -> accent for card gradients
 "abstract":"#e0556b","multicolor":"#e0556b","gold":"#c79a63","luxury":"#b8924f","floral":"#cf7a92",
 "woodland":"#8a6b4a","teal":"#1f8a7a","emerald":"#1f7a5a","kraft":"#b9996a","minimal":"#9a958c",
 "charcoal":"#4a4a52","copper":"#b87333","burgundy":"#7a2738","navy":"#2a3a5a","blush":"#d99fab",
 "sage":"#8a9a7a","white":"#cfcabf","silver":"#b4b8bc","moroccan":"#2a4a6a","botanical":"#7a8a6a",
}
def palette_for(stem):
    for k,v in PALETTE.items():
        if k in stem: return v
    return "#c79a63"

def artist_for_product(slug):
    """Score product slug words against artist styleTags; fallback round-robin."""
    best, bestscore = None, 0
    words = set(slug.split('-'))
    for (aid,_n,_st,_c,_f,_sn,tags,_b) in ARTISTS:
        score = sum(1 for tg in tags for w in words if tg in w or w in tg)
        if score > bestscore:
            bestscore, best = score, aid
    return best, bestscore

# Which artists plausibly suit each product category (every artist appears >=1x),
# used to keep zero-keyword products on-style while balancing the load.
CATEGORY_ARTISTS = {
    "bags":       ["yasmin-al-najjar","mateo-herrera","amina-yusuf","aminata-diallo"],
    "boxes":      ["hana-lee","kwame-mensah","henrik-sorensen","kenji-sato"],
    "mailer":     ["henrik-sorensen","aminata-diallo"],
    "food":       ["hana-lee","aminata-diallo","kenji-sato","priya-nair"],
    "beauty":     ["yasmin-al-najjar","hana-lee","priya-nair"],
    "jewellery":  ["kwame-mensah","hana-lee","yasmin-al-najjar"],
    "tubes":      ["yasmin-al-najjar","mateo-herrera","aminata-diallo"],
    "floral":     ["priya-nair","aminata-diallo","kenji-sato"],
    "stationery": ["henrik-sorensen","kenji-sato","priya-nair"],
}

def assign_artists(prods):
    """Balanced, style-aware artist assignment across all products."""
    counts = {a[0]:0 for a in ARTISTS}
    for p in prods:
        words = set(p['_stem'].split('-'))
        scored = []
        for (aid,_n,_st,_c,_f,_sn,tags,_b) in ARTISTS:
            s = sum(1 for tg in tags for w in words if tg in w or w in tg)
            scored.append((aid,s))
        kw = [aid for aid,s in scored if s>0]
        cat = CATEGORY_ARTISTS.get(p['category'], [])
        # candidate pool: keyword matches, else category artists, else everyone
        pool = kw or cat or [a[0] for a in ARTISTS]
        smap = dict(scored)
        # pick on-style candidate that is currently least loaded
        chosen = sorted(pool, key=lambda a:(counts[a], -smap.get(a,0), h(p['id']+a,97)))[0]
        p['artist'] = chosen
        counts[chosen] += 1
    # rescue any still-empty artist by reassigning from the most-loaded, on-category if possible
    for aid in counts:
        if counts[aid] > 0:
            continue
        # prefer a product whose category lists this artist
        donor = None
        for p in prods:
            if aid in CATEGORY_ARTISTS.get(p['category'], []) and counts[p['artist']] > 2:
                donor = p; break
        if not donor:
            donor = max(prods, key=lambda p: counts[p['artist']])
        counts[donor['artist']] -= 1; donor['artist'] = aid; counts[aid] += 1
    return counts

# ── MANUFACTURERS (6) ────────────────────────────────────────────────────────
MAKERS = [
 ("imprint-atelier","Imprint Atelier","AE","🇦🇪","#1a1a1a",4.9,7,1.00,250,2017,412,
   ["Offset + digital","Foil & emboss","Rigid box assembly","Eco inks"],
   ["Gloss","Matte","Soft-touch","Foil","Emboss","Deboss"],
   ["FSC®","ISO 9001","G7 Master"],
   "Imprint's flagship atelier in Dubai — the house standard for foil, emboss and rigid-box finishing, and the default for featured templates."),
 ("gulf-print","Gulf Print Works","AE","🇦🇪","#0f6e63",4.6,9,0.92,500,2009,318,
   ["High-volume offset","Litho-lam","Window patching"],
   ["Gloss","Matte","Soft-touch","Foil"],
   ["FSC®","ISO 9001"],
   "A Sharjah high-volume house — sharp pricing at scale for retail rollouts and seasonal campaigns."),
 ("najm-packaging","Najm Packaging","SA","🇸🇦","#1f7a5a",4.7,8,1.04,300,2014,276,
   ["Rigid & magnetic boxes","Velvet lining","Soft-touch lam"],
   ["Matte","Soft-touch","Foil","Emboss","Deboss"],
   ["ISO 9001","ISO 14001"],
   "Riyadh specialists in rigid and jewellery boxes — magnetic closures, velvet inserts and flawless wraps."),
 ("levant-press","Levant Press","LB","🇱🇧","#b87333",4.5,12,0.97,200,2005,201,
   ["Artisan letterpress","Hand assembly","Specialty papers"],
   ["Matte","Soft-touch","Foil","Emboss","Deboss"],
   ["FSC®"],
   "A Beirut craft press — letterpress, hand-assembly and specialty stock for small, beautiful runs."),
 ("crescent-press","Crescent Press","SA","🇸🇦","#7a2738",4.8,10,1.08,150,2019,164,
   ["Luxury rigid","UV spot","Multi-level emboss","Edge painting"],
   ["Gloss","Matte","Soft-touch","Foil","Emboss","Deboss"],
   ["FSC®","ISO 9001","Sedex"],
   "Jeddah's luxury-only line — UV spot, sculpted multi-level emboss and painted edges for couture and fragrance."),
 ("marina-pack","Marina Pack","QA","🇶🇦","#2a3a5a",4.4,11,0.95,400,2012,148,
   ["Corrugated & mailers","Flexo print","Recycled board","Mono-material"],
   ["Matte","Kraft","Foil"],
   ["FSC®","ISO 14001"],
   "Doha's sustainability-forward mailer house — recycled, mono-material and plastic-free e-commerce packaging."),
]
MAKER_IDS = [m[0] for m in MAKERS]

def makers_for(cid, slug):
    base = ["imprint-atelier"]
    if cid in ("jewellery","beauty"): base += ["najm-packaging","crescent-press"]
    elif cid in ("mailer",): base += ["marina-pack","gulf-print"]
    elif cid in ("food",): base += ["levant-press","gulf-print"]
    elif cid in ("boxes",): base += ["najm-packaging","levant-press"]
    elif cid in ("bags","floral"): base += ["gulf-print","levant-press"]
    else: base += ["gulf-print"]
    # de-dup preserve order
    out=[]; [out.append(m) for m in base if m not in out]
    return out[:3]

PRICE_RANGE = {"bags":(6,15),"boxes":(12,42),"mailer":(7,18),"food":(5,22),"beauty":(14,46),
               "jewellery":(18,58),"tubes":(9,21),"floral":(15,40),"stationery":(9,28)}
def price_for(cid, slug):
    lo,hi = PRICE_RANGE.get(cid,(10,30))
    return round(lo + (hi-lo) * (h(slug,1000)/1000.0), 1)

def tags_for(slug, idx, cid):
    out=[]
    if 'gold' in slug or 'foil' in slug or 'ornate' in slug or 'mandala' in slug: out.append('foil')
    if 'kraft' in slug or 'natural' in slug or 'recycl' in slug: out.append('eco')
    pick = h(slug,100)
    if pick < 16: out.append('hot')
    elif pick < 34: out.append('trending')
    elif pick < 48: out.append('new')
    elif pick < 60: out.append('bestseller')
    if h(slug+'x',100) < 14: out.append('editors')
    # de-dup, cap 3
    seen=[]; [seen.append(t) for t in out if t not in seen]
    return seen[:3]

# ── COPY ASSETS ──────────────────────────────────────────────────────────────
def find_imgs(subdir, exts=('png','jpg','jpeg')):
    out=[]
    for ext in exts:
        out += glob.glob(os.path.join(SRC, subdir, '**', '*.'+ext), recursive=True)
    return sorted([p for p in out if '__MACOSX' not in p])

def ensure(d):
    os.makedirs(d, exist_ok=True)

def main():
    ensure(os.path.join(ASSETS,'products'))
    ensure(os.path.join(ASSETS,'collections'))
    ensure(os.path.join(ASSETS,'artists'))
    ensure(os.path.join(ASSETS,'bags'))

    # Artists images
    art_imgs = find_imgs('Artists')
    art_avatar = {}
    for i,(aid,*_rest) in enumerate(ARTISTS):
        if i < len(art_imgs):
            dst = f"assets/artists/{aid}.png"
            shutil.copyfile(art_imgs[i], os.path.join(ROOT,dst))
            art_avatar[aid]=dst

    # Bag placeholders -> assets/bags/bag-N.jpg (used for lifestyle / extra gallery)
    bag_imgs = find_imgs('bags')
    bag_assets=[]
    for i,src in enumerate(bag_imgs,1):
        dst=f"assets/bags/bag-{i}.jpg"; shutil.copyfile(src, os.path.join(ROOT,dst)); bag_assets.append(dst)
    # coffee-cup renders (hero -> lifestyle order), staged from the Cup zip if present;
    # otherwise keep the already-committed coffee-cup-1..5.jpg.
    _cuporder = ['32e13640-df45-4385-8e0e-51be3478c00c','cf3dbc9d-7ccd-4049-9283-e601cd4c801e',
                 'b09a8450-e424-4274-9eaf-8282c1bde720','b5d4eb1e-b567-47a6-ba38-6ac474b0ac50',
                 '174ac45e-88b4-4d9b-a0b3-395216259f3f']
    for i,h_ in enumerate(_cuporder,1):
        s_=f'/tmp/cupz/Cup/{h_}.jpeg'
        if os.path.exists(s_): shutil.copyfile(s_, os.path.join(ROOT,f'assets/products/coffee-cup-{i}.jpg'))

    # Collections
    col_imgs = find_imgs('Collections')
    collections=[]
    for src in col_imgs:
        stem = os.path.splitext(os.path.basename(src))[0]
        cid = slugify(stem)
        dst = f"assets/collections/{cid}.png"
        shutil.copyfile(src, os.path.join(ROOT,dst))
        aid = COLLECTION_ARTIST.get(stem)
        nm = titleize(slugify(re.sub(r'^\d+-','',stem)))
        collections.append({
            "id":cid, "name":nm, "image":dst, "artist":aid,
            "accent":palette_for(stem),
            "items": 6 + h(cid,10), "tags": (["trending"] if h(cid,100)<22 else [])
        })

    # Products (grids 1-4). placeholders kept as bag lifestyle only.
    prod_imgs = []
    for g in ('grid-1-jewel-tone-luxury','grid-2-light-elegant','grid-3-branded','grid-4-labeled'):
        prod_imgs += find_imgs(os.path.join('Products',g))
    products=[]
    used_slugs=set([HONEYLOOM_SLUG])
    for idx,src in enumerate(prod_imgs):
        stem = os.path.splitext(os.path.basename(src))[0]
        slug = slugify(stem)
        # ensure unique
        base=slug; n=2
        while slug in used_slugs:
            slug=f"{base}-{n}"; n+=1
        used_slugs.add(slug)
        dst=f"assets/products/{slug}.png"
        shutil.copyfile(src, os.path.join(ROOT,dst))
        cid=category_for(stem)
        name=titleize(slug)
        # tidy a few names
        name=name.replace('Ab ','AB ').replace('La Petite','La Petite').replace(' Co ',' Co. ')
        rating=round(4.3 + (h(slug,7)/10.0),1)
        rating=min(rating,5.0)
        gallery=[dst]+[bag_assets[h(slug+str(k),len(bag_assets))] for k in range(2)] if bag_assets else [dst]
        products.append({
            "id":slug,"name":name,"category":cid,"image":dst,"_stem":stem,
            "artist":None,"makers":makers_for(cid,stem),
            "price":price_for(cid,stem),"tags":tags_for(stem,idx,cid),
            "rating":rating,"reviews":12+h(slug,180),
            "gallery":gallery,
            "featured":False,
        })

    # balanced, style-aware artist assignment, then build artist-aware blurbs
    assign_artists(products)
    art_name = {a[0]:a[1] for a in ARTISTS}
    for p in products:
        p["blurb"] = (f"{p['name']} — a designer template by {art_name.get(p['artist'],'Imprint')}. "
                      "Locked layout; swap text, colours and social handles to make it yours.")
        p.pop("_stem", None)

    # ── Honeyloom (featured, real template, hand-built rich PDP) ──
    honey = {
        "id":HONEYLOOM_SLUG,"name":"Honeyloom Gift Bag","category":"bags",
        "image":"templates/renders/honey-gift-bag-1.jpg",
        "gallery":["templates/renders/honey-gift-bag-1.jpg","templates/renders/honey-gift-bag-2.jpg","templates/renders/honey-gift-bag-3.jpg"],
        "artist":"yasmin-al-najjar","makers":["imprint-atelier","crescent-press","najm-packaging"],
        "price":12.5,"tags":["foil","hot","editors"],"rating":5.0,"reviews":63,
        "blurb":"A foil honeycomb bottle bag with editable wordmark — the flagship Imprint template. Fully customisable in 3D.",
        "featured":True,"template":"honey-gift-bag","href":f"{HONEYLOOM_SLUG}/","rich":True,
    }
    coffee = {
        "id":"coffee-cup","name":"Artisan Coffee Cup","category":"food",
        "image":"assets/products/coffee-cup-1.jpg",
        "gallery":["assets/products/coffee-cup-1.jpg","assets/products/coffee-cup-2.jpg","assets/products/coffee-cup-3.jpg","assets/products/coffee-cup-4.jpg","assets/products/coffee-cup-5.jpg"],
        "artist":"henrik-sorensen","makers":["imprint-atelier","marina-pack","gulf-print"],
        "price":1.8,"tags":["new","hot","eco"],"rating":4.9,"reviews":21,
        "blurb":"A double-wall paper coffee cup you can brand across the body, sleeve and base in real-time 3D — the lid stays clean. A ready Imprint template with its own cup studio.",
        "featured":True,"template":"coffee-cup","configurator":"configurator-cup.html","href":"coffee-cup/","size":"M",
    }

    # Curate a handful of featured products for the landing
    feat_pool=[p for p in products if p['tags']]
    for p in sorted(products, key=lambda x:-x['rating'])[:6]:
        p['featured']=True

    all_products=[honey, coffee]+products
    # attach product href (clean folder URL)
    for p in all_products:
        p.setdefault("href", f"{p['id']}/")

    # link artists -> their products/collections
    artists=[]
    for (aid,nm,studio,cc,flag,styleName,tags,bio) in ARTISTS:
        pids=[p['id'] for p in all_products if p.get('artist')==aid]
        cids=[c['id'] for c in collections if c.get('artist')==aid]
        artists.append({
            "id":aid,"name":nm,"studio":studio,"country":cc,"flag":flag,
            "style":styleName,"styleTags":tags,"bio":bio,
            "avatar":art_avatar.get(aid,""),
            "since":2015+h(aid,9),"followers":800+h(aid,9200),
            "products":pids,"collections":cids,
            "rating":round(4.5+h(aid,5)/10.0,1),
        })

    makers=[]
    for (mid,nm,cc,flag,color,rating,lead,mul,moq,since,reviews,caps,fin,certs,bio) in MAKERS:
        pids=[p['id'] for p in all_products if mid in p.get('makers',[])]
        makers.append({"id":mid,"name":nm,"country":cc,"flag":flag,"color":color,
            "rating":rating,"leadDays":lead,"priceMul":mul,"moq":moq,"since":since,
            "reviews":reviews,"capabilities":caps,"finishes":fin,"certs":certs,"bio":bio,
            "products":pids})

    catalog={
        "categories":[{"id":c[0],"name":c[1],"desc":c[2]} for c in CATEGORIES],
        "tags":TAGS,
        "products":all_products,
        "artists":artists,
        "makers":makers,
        "collections":collections,
        "bags":bag_assets,
    }

    # ── responsive WebP variants + rewrite image fields ──
    prep_images(catalog)

    # ── emit catalog.js ──
    js = "/* AUTO-GENERATED by tools/build_catalog.py — do not edit by hand. */\n"
    js += "window.IMPRINT_CATALOG = " + json.dumps(catalog, ensure_ascii=False, indent=1) + ";\n"
    with open(os.path.join(ROOT,"catalog.js"),"w",encoding="utf-8") as f:
        f.write(js)

    # ── emit product folder stubs (except Honeyloom) ──
    stub = ('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
            '<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">'
            '<link rel="apple-touch-icon" href="apple-touch-icon.png">'
            "<script>(function(){{var p=location.pathname;if(!/\\/$/.test(p))p=p.replace(/[^/]*$/,'');"
            "p=p.replace(/[^/]+\\/$/,'');document.write('<base href=\"'+p+'\">');}})();</script>"
            '<title>{title} — IMPRINT®</title>'
            '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">'
            '<link rel="stylesheet" href="shared.css"><link rel="stylesheet" href="catalog.css"><link rel="stylesheet" href="pdp.css"></head>'
            '<body><div id="site-header"></div><div id="site-nav"></div>'
            '<main id="pdp-root" data-product="{slug}"></main><div id="site-footer"></div>'
            '<script src="shared.js"></script><script src="catalog.js"></script>'
            '<script src="app.js"></script><script src="product.js"></script></body></html>')
    n_stub=0
    for p in products:
        d=os.path.join(ROOT,p['id']); ensure(d)
        with open(os.path.join(d,"index.html"),"w",encoding="utf-8") as f:
            f.write(stub.format(title=p['name'], slug=p['id']))
        n_stub+=1
    for p in [coffee]:                       # cup uses the lean PDP + its own cup studio
        d=os.path.join(ROOT,p['id']); ensure(d)
        with open(os.path.join(d,"index.html"),"w",encoding="utf-8") as f:
            f.write(stub.format(title=p['name'], slug=p['id']))
        n_stub+=1

    print(f"catalog.js: {len(all_products)} products, {len(artists)} artists, {len(makers)} makers, {len(collections)} collections")
    print(f"product stubs written: {n_stub} (+ hand-built {HONEYLOOM_SLUG})")
    print("categories:", {c['id']:sum(1 for p in all_products if p['category']==c['id']) for c in catalog['categories']})
    print("per-artist products:", {a['id']:len(a['products']) for a in artists})

if __name__ == "__main__":
    main()
