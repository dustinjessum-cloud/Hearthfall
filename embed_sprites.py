"""Re-embed the generated spritesheet into js/content.js.

Two things have to move together after any art change:
  - SPRITESHEET_B64, the base64 PNG
  - FRAME, the name -> index map, which is GENERATED from gen_sprites.py's
    DRAWERS order and must never be hand-edited

Run `python gen_sprites.py` first, then this, then `python stamp_assets.py`.
"""
import re, os

GAME = os.path.dirname(os.path.abspath(__file__))
BUILD = "/tmp/gamebuild"          # where gen_sprites.py writes its output

# --- the authoritative frame order: DRAWERS in gen_sprites.py ---
gen = open(os.path.join(GAME, "gen_sprites.py"), encoding="utf-8").read()
block = gen.split("DRAWERS = [", 1)[1].split("\n]", 1)[0]
names = re.findall(r'\(\s*"([a-z0-9_]+)"\s*,', block)
assert names, "could not parse DRAWERS"

rows = re.search(r"^ROWS\s*=\s*(\d+)", gen, re.M).group(1)
cols = re.search(r"^COLS\s*=\s*(\d+)", gen, re.M).group(1)
assert len(names) <= int(rows) * int(cols), (
    f"{len(names)} sprites will not fit in {rows}x{cols}={int(rows)*int(cols)} slots"
)

# --- rebuild the FRAME literal, 5 per line to match the existing shape ---
entries = [f"{n}:{i}" for i, n in enumerate(names)]
lines = []
for i in range(0, len(entries), 5):
    chunk = ", ".join(entries[i:i+5])
    lines.append("  " + chunk + ("," if i + 5 < len(entries) else ""))
frame_literal = "const FRAME = {\n" + "\n".join(lines) + "\n};"

HEADER = """// ---------------------------------------------------------------------
// Frame index map - GENERATED from gen_sprites.py DRAWERS order.
// ---------------------------------------------------------------------
// Do not hand-edit, and never insert a sprite mid-list: that shifts every
// index after it, and a stale entry here renders the WRONG sprite rather
// than failing. Inserting bone_pile_corrupted mid-list once moved 15 frames
// at once, which is what prompted the rule. Append to the END of DRAWERS
// and regenerate."""

path = os.path.join(GAME, "js", "content.js")
src = open(path, encoding="utf-8").read()

# --- swap the base64 ---
b64 = open(f"{BUILD}/spritesheet_b64.txt").read().strip()
src, n = re.subn(r'const SPRITESHEET_B64 = "data:image/png;base64,[A-Za-z0-9+/=]+";',
                 'const SPRITESHEET_B64 = "data:image/png;base64,' + b64 + '";',
                 src, count=1)
assert n == 1, "SPRITESHEET_B64 not found"

# --- swap the header + FRAME literal in one go, collapsing the four
#     duplicate comment blocks that past regenerations left stacked up ---
start = src.index("// ---------------------------------------------------------------------\n// Frame index map")
end = src.index("};", src.index("const FRAME = {")) + 2
src = src[:start] + HEADER + "\n" + frame_literal + src[end:]

open(path, "w", encoding="utf-8").write(src)
print(f"embedded {len(names)} frames ({rows}x{cols} sheet), base64 {len(b64)} chars")
