#!/usr/bin/env python3
"""Build the DC store product list from the images committed at assets/stores/dc/products/.

Parses each Zazzle-style filename into a clean display name, franchise and a fake price, and writes
assets/stores/dc/products.js (window.DC_PRODUCTS). It does NOT copy/rename the image files — it just
references them and gives them tidy display names. Re-run after adding/removing images:
    python3 tools/make_dc_products.py
"""
import os, glob, re, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR  = os.path.join(ROOT, "assets", "stores", "dc", "products")

# franchise detection (most specific first)
FR = [("Joker & Harley", ["joker", "harley"]), ("Batwheels", ["batwheels"]),
      ("DC Super-Pets", ["krypto", "superdog", "super_pets", "dc_league"]),
      ("Aquaman", ["aquaman"]), ("Batman", ["batman", "gotham", "robin"]),
      ("Superman", ["superman"]), ("Wonder Woman", ["wonder_woman"]),
      ("The Flash", ["the_flash", "flash"]), ("Green Lantern", ["green_lantern"]),
      ("Justice League", ["justice_league", "justice"])]
# product type -> fake OMR unit price
PRICE = [("t_shirt", 7.5), ("tshirt", 7.5), ("lunch_box", 8.9), ("tablecloth", 7.9), ("pillow", 6.9),
         ("apron", 5.9), ("binder", 5.4), ("poster", 4.5), ("playing_card", 3.2), ("mug", 3.9),
         ("wrapping_paper", 2.9), ("banner", 2.4), ("postcard", 2.2), ("paper_plate", 1.9),
         ("plates", 1.9), ("baby_shower", 1.8), ("invitation", 1.8), ("sticker", 1.5), ("button", 1.2)]

def franchise(s):
    for name, kws in FR:
        if any(k in s for k in kws): return name
    return "DC"

def price(s):
    for kw, p in PRICE:
        if kw in s: return p
    return 2.9

def nice(stem):
    base = stem.split("-r")[0]                 # drop the Zazzle "-r<hash>_<code>_324" tail
    base = base.replace("_s_", "'s ").replace("_", " ")
    base = base.title().replace("'S ", "'s ")
    base = re.sub(r"\bT Shirt\b", "T-Shirt", base)
    base = base.replace("Dc ", "DC ").replace(" Of ", " of ").replace(" And ", " & ")
    base = re.sub(r"\s+\d+$", "", base)         # trailing stray numbers
    return base.strip()

files = sorted(glob.glob(os.path.join(DIR, "*.jpg")) + glob.glob(os.path.join(DIR, "*.jpeg")) + glob.glob(os.path.join(DIR, "*.png")))
prods = []
for f in files:
    stem = os.path.splitext(os.path.basename(f))[0]; low = stem.lower()
    prods.append({"img": "assets/stores/dc/products/" + os.path.basename(f),
                  "name": nice(stem), "franchise": franchise(low), "price": "OMR %.3f" % price(low)})
out = os.path.join(ROOT, "assets", "stores", "dc", "products.js")
open(out, "w", encoding="utf-8").write("window.DC_PRODUCTS = " + json.dumps(prods, ensure_ascii=False, indent=0) + ";\n")
from collections import Counter
print("wrote", len(prods), "DC products -> assets/stores/dc/products.js")
print("by franchise:", dict(Counter(p["franchise"] for p in prods)))
