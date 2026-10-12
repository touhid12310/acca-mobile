import json, sys
def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def hx(h):
    h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def over(fg, a, bg):
    return '#' + ''.join('%02x' % round(a * f + (1 - a) * b) for f, b in zip(hx(fg), hx(bg)))
def L(h):
    r, g, b = map(lin, hx(h)); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def cr(a, b):
    x, y = sorted([L(a), L(b)], reverse=True); return (x + 0.05) / (y + 0.05)
CAPBG = over('#0b1220', 0.82, '#ffffff')   # caption box over the brightest possible frame
P = [
 ('All', 'Burned-in caption', '#ffffff', CAPBG, 'normal'),
 ('All', 'End card tagline', '#0b1220', '#f7f9ff', 'large'),
 ('All', 'End card pill', '#102a83', '#e3eaff', 'normal'),
 ('All', 'End card URL', '#0204f5', '#f7f9ff', 'normal'),
 ('01', 'White type on brand blue', '#ffffff', '#0204F5', 'large'),
 ('01', 'Ink type on white', '#0B1220', '#ffffff', 'large'),
 ('01', 'Brand-blue type on white', '#0204F5', '#ffffff', 'large'),
 ('01', '"$38" emerald on white (fixed)', '#047857', '#ffffff', 'large'),
 ('04', 'Emerald merchant tag, bold 28px', '#059669', '#ffffff', 'large'),
 ('05', '"Saved." emerald callout (fixed)', '#047857', '#F3F6FB', 'large'),
 ('05', 'White on emerald toast (fixed)', '#ffffff', '#047857', 'large'),
 ('05', 'White on indigo scan toast', '#ffffff', '#6366F1', 'large'),
 ('06', '"+$1,284" emerald (fixed)', '#047857', '#ffffff', 'large'),
 ('06', 'Calendar day numbers (fixed)', '#64748B', '#ffffff', 'normal'),
 ('06', 'Indigo eyebrow, bold 26px', '#6366F1', '#ffffff', 'large'),
 ('08', 'Mint accent on dark', '#6EE7B7', '#0B1220', 'normal'),
 ('08', 'Blue-grey support on dark', '#AFC4E8', '#0B1220', 'normal'),
 ('02', 'Ink on pale blue background', '#0B1220', '#EAF1FF', 'large'),
 ('02', 'Brand blue on pale blue', '#0204F5', '#EAF1FF', 'large'),
 ('03', 'White on navy', '#ffffff', '#0B1830', 'large'),
 ('04', 'Ink on iso floor', '#0B1220', '#EEF2FF', 'large'),
 ('05', 'App UI text on white', '#0F172A', '#ffffff', 'normal'),
 ('05', 'App UI secondary text', '#64748B', '#ffffff', 'normal'),
 ('06', 'Chart labels (muted)', '#64748B', '#ffffff', 'normal'),
 ('06', 'Headline ink', '#0F172A', '#ffffff', 'large'),
 ('07', 'Body text on near-black', '#E2E8F0', '#050816', 'normal'),
 ('07', 'Dim mono labels', '#7C8DB5', '#050816', 'normal'),
 ('07', 'Neon accent', '#2F7BFF', '#050816', 'large'),
 ('07', 'Cyan accent', '#22D3EE', '#050816', 'normal'),
 ('08', 'White on dark glass scrim', '#ffffff', '#1F2937', 'normal'),
 ('09', 'Ink on cream', '#1B1B1F', '#F6EFE3', 'large'),
 ('09', 'Ink on mint paper', '#1B1B1F', '#7FD1AE', 'large'),
 ('09', 'Ink on coral paper', '#1B1B1F', '#F28B82', 'large'),
 ('09', 'Ink on sky paper', '#1B1B1F', '#8FB8FF', 'large'),
 ('09', 'Ink on mustard paper', '#1B1B1F', '#F2C14E', 'large'),
 ('09', 'Ink on kraft envelope', '#1B1B1F', '#D9B98C', 'normal'),
 ('09', 'Amber label on sticky note (fixed)', '#92400E', '#FFF3A8', 'normal'),
 ('09', 'Blue "AccountE" on white paper', '#2F5BEA', '#FFFFFF', 'large'),
 ('10', 'Ink on ivory', '#0B0B0F', '#FAFAF7', 'large'),
 ('10', 'Grey support text on ivory', '#5F6672', '#FAFAF7', 'normal'),
 ('10', 'Brand blue on ivory', '#0204F5', '#FAFAF7', 'normal'),
]
rows = []
for v, what, fg, bg, size in P:
    r = cr(fg, bg); need = 4.5 if size == 'normal' else 3.0
    rows.append(dict(video=v, pair=what, fg=fg, bg=bg, size=size, ratio=round(r, 2), need=need, ok=r >= need))
if '--json' in sys.argv: print(json.dumps(rows, indent=1))
else:
    for r in rows: print(f"{r['video']:4} {r['pair']:34} {r['fg']} on {r['bg']}  {r['ratio']:5.2f}:1  need {r['need']}  {'PASS' if r['ok'] else 'FAIL'}")
