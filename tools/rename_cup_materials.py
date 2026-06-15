#!/usr/bin/env python3
"""
Rename the paper-cup GLB's materials to the paper-bag's atlas convention so the configurator's
material-name-driven loader treats each part as its own independent region/step:

    M_cup  -> M_ext_cup      (exterior region)
    M_base -> M_handle_base  (handles/ribbon region)
    M_sleeve -> M_int_sleeve (interior region)
    M_lid  -> M_rivet_lid    (rivet region)

Geometry (the BIN chunk) is left byte-for-byte untouched — only material .name strings change.
Re-run this whenever paper_cup/paper_cup.glb is replaced:

    python3 tools/rename_cup_materials.py

Output: paper_cup/paper_cup_imprint.glb  (the file configurator-cup.html actually loads).
"""
import struct, json, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "paper_cup", "paper_cup.glb")
DST = os.path.join(HERE, "paper_cup", "paper_cup_imprint.glb")
RENAME = {"M_cup": "M_ext_cup", "M_sleeve": "M_int_sleeve", "M_base": "M_handle_base", "M_lid": "M_rivet_lid"}

GLB_MAGIC, JSON_TYPE = 0x46546C67, 0x4E4F534A

data = open(SRC, "rb").read()
magic, ver, total = struct.unpack("<III", data[:12])
assert magic == GLB_MAGIC and ver == 2, "not a glTF 2.0 binary"

off, chunks = 12, []
while off < len(data):
    clen, ctype = struct.unpack("<II", data[off:off + 8]); off += 8
    chunks.append([ctype, bytearray(data[off:off + clen])]); off += clen

assert chunks[0][0] == JSON_TYPE, "first chunk is not JSON"
js = json.loads(bytes(chunks[0][1]))

changed = []
for m in js.get("materials", []):
    if m.get("name") in RENAME:
        changed.append((m["name"], RENAME[m["name"]]))
        m["name"] = RENAME[m["name"]]
missing = [k for k in RENAME if k not in [c[0] for c in changed]]
if missing:
    raise SystemExit("ERROR: expected materials not found in GLB: %s (found %s)" %
                     (missing, [m.get("name") for m in js.get("materials", [])]))

new_json = json.dumps(js, separators=(",", ":")).encode("utf-8")
while len(new_json) % 4:           # JSON chunk padded with spaces
    new_json += b" "
chunks[0][1] = bytearray(new_json)
for c in chunks[1:]:               # BIN chunk(s) padded with zeros (already aligned, but be safe)
    while len(c[1]) % 4:
        c[1] += b"\x00"

body = b"".join(struct.pack("<II", len(d), t) + bytes(d) for t, d in chunks)
out = struct.pack("<III", GLB_MAGIC, 2, 12 + len(body)) + body
open(DST, "wb").write(out)
print("renamed:", changed)
print("wrote", DST, len(out), "bytes")
