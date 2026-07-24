"""Re-stamp index.html's <script> URLs with a content hash of each file.

WHY THIS EXISTS
---------------
The game runs from file://, where browsers cache subresources hard. The HTML
is the navigated document so it gets revalidated, but js/*.js often do not —
so you can end up with current markup driving stale code. That produced a
genuinely nasty bug: the Sandbox and Skip buttons rendered perfectly and did
nothing, because the cached ui.js predated the functions they called and
`addEventListener('click', undefined)` fails silently.

Appending ?v=<md5 of the file> means a script's URL changes exactly when its
contents change, so the browser is forced to re-fetch it and can never serve
a stale one. Nothing to remember to bump.

RUN THIS AFTER EDITING ANY FILE IN js/:
    python stamp_assets.py
"""
import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "index.html")


def main():
    src = open(PAGE, encoding="utf-8").read()
    changed = []

    def stamp(m):
        url = m.group(1)
        path = url.split("?")[0]
        if not path.startswith("js/"):
            return m.group(0)          # leave the CDN (Phaser) alone
        full = os.path.join(HERE, path)
        if not os.path.exists(full):
            print(f"  !! {path} referenced but missing")
            return m.group(0)
        h = hashlib.md5(open(full, "rb").read()).hexdigest()[:8]
        new = f'<script src="{path}?v={h}"></script>'
        if new != m.group(0):
            changed.append(path)
        return new

    out = re.sub(r'<script src="([^"]+)"></script>', stamp, src)
    if out != src:
        open(PAGE, "w", encoding="utf-8", newline="").write(out)
    print(f"stamped {len(changed)} changed script(s)" if changed else "already up to date")
    for c in changed:
        print("  ", c)
    return 0


if __name__ == "__main__":
    sys.exit(main())
