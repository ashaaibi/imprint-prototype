PRESETS — how to add designs
============================
This folder powers the "Presets" picker for GRAPHIC layers.
(Sibling folders: ../text  = font presets,  ../background = background/pattern presets.)

Structure:
  graphic/
    Essentials/        <- a collection (shown as "System Presets")
    Artists_Collection_1/  <- a collection (shown as "Artists Collection 1")
    Artists_Collection_2/  <- add as many as you like
    index.json             <- manifest (REQUIRED on GitHub Pages — regenerate after edits)

Rules:
  * Each sub-folder is one collection. Its UI name = folder name with "_" -> " ".
    Use underscores only (no spaces, no apostrophes) in folder names.
  * Drop design files directly inside a collection folder.
    - graphic / background: .svg .png .jpg .jpeg .webp .gif  (keep them small for fast loading)
    - text (fonts):         .ttf .otf .woff .woff2
  * Collection order in the picker: Essentials first, then the rest A->Z.

After adding/renaming/removing ANY file or collection, REGENERATE the manifests
(GitHub Pages has no directory listing, so the picker reads index.json):

  python3 - <<'PY'
  import json, os
  TYPES = {'text':('.ttf','.otf','.woff','.woff2'),
           'graphic':('.svg','.png','.jpg','.jpeg','.webp','.gif'),
           'background':('.svg','.png','.jpg','.jpeg','.webp','.gif')}
  key = lambda n: (0,'') if n=='Essentials' else (1,n.lower())
  for typ,exts in TYPES.items():
      if not os.path.isdir(typ): continue
      cols=[]
      for col in sorted([d for d in os.listdir(typ) if os.path.isdir(typ+'/'+d) and not d.startswith('.')], key=key):
          files=sorted(f for f in os.listdir(typ+'/'+col) if f.lower().endswith(exts) and not f.startswith('.'))
          if files: cols.append({'name':col,'files':files})
      json.dump(cols, open(typ+'/index.json','w',encoding='utf-8'), ensure_ascii=False, indent=0)
      print(typ, [(c['name'],len(c['files'])) for c in cols])
  PY

------------------------------------------------------------------------
TEXT-SPECIFIC NOTES
------------------------------------------------------------------------
* Essentials here holds BASIC, general-purpose fonts (Inter, Roboto,
  Montserrat, Lora, Playfair Display, Oswald, Poppins, Merriweather,
  Dancing Script). Display / artist fonts live in Artists_Collection_1.
* "Social Media" is a BUILT-IN, synthetic collection injected by the
  configurator (it is NOT a folder here). Its icons + platform list live in
  the SOCIAL_ICONS map in configurator.html. To change platforms or swap in
  exact brand SVGs, edit SOCIAL_ICONS — do not add a Social_Media folder.
