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

# --- and the OTHER half of that number, over in main.js ---
#
# ROWS here and `rows` in setupFrames() are one value stored in two files.
# Nothing used to compare them, and a mismatch does not throw: Phaser happily
# slices frames past the end of the texture and the game renders the WRONG
# SPRITE for everything after the old boundary. That is a bug you chase in the
# art before you think to look at a constant. Fail the build instead.
main_js = open(os.path.join(GAME, "js", "main.js"), encoding="utf-8").read()
m = re.search(r"const\s+cols\s*=\s*(\d+)\s*,\s*rows\s*=\s*(\d+)\s*,\s*size\s*=\s*(\d+)", main_js)
assert m, "could not find `const cols=..., rows=..., size=...` in setupFrames() in js/main.js"
js_cols, js_rows, js_size = m.group(1), m.group(2), m.group(3)
assert (js_rows, js_cols) == (rows, cols), (
    f"SHEET MISMATCH: gen_sprites.py has ROWS={rows} COLS={cols}, but "
    f"setupFrames() in js/main.js has rows={js_rows} cols={js_cols}. "
    f"They are two halves of one number - fix both, then re-run."
)
assert js_size == "32", f"setupFrames() expects {js_size}px frames; gen_sprites.py draws 32px"

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
