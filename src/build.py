"""Assemble ../index.html from the source parts in this folder.

Run from anywhere:  python3 src/build.py
"""
from pathlib import Path

src = Path(__file__).resolve().parent
t = (src / 'b_template.html').read_text()
t = t.replace('/*CSS*/', (src / 'px_css.txt').read_text())
js = '\n'.join((src / f).read_text() for f in ['b_core.js', 'b_build.js', 'b_ops.js', 'b_main.js'])
t = t.replace('/*JS*/', js)
i = t.index('<div class="app">')
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n')
(src.parent / 'index.html').write_text(head + t[:i] + '</head>\n<body>\n' + t[i:] + '\n</body>\n</html>\n')
print('wrote', src.parent / 'index.html')
