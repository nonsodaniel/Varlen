"""
Sivena social media image generator — uses the real app icon.png
Outputs:
  profile-picture.png   800×800    (Twitter/X, LinkedIn, etc.)
  twitter-header.png    1500×500   (Twitter/X profile header)
  twitter-ad.png        1200×628   (Twitter/X promoted card)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUT      = os.path.dirname(os.path.abspath(__file__))
ICON_SRC = os.path.join(OUT, '../../apps/mobile/assets/icon.png')

# Brand colours
BG1   = (6,   9,  20)
BG2   = (10,  13, 30)
BLUE  = (96, 165, 250)
INDIGO= (129, 140, 248)
PINK  = (244, 114, 182)
GREEN = (52,  211, 153)
AMBER = (251, 191,  36)
WHITE = (255, 255, 255)
TEXT2 = (180, 200, 240)
TEXT3 = (110, 135, 180)


def vgrad(img, top, bot):
    """In-place vertical gradient."""
    w, h = img.size
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(top[0]*(1-t) + bot[0]*t)
        g = int(top[1]*(1-t) + bot[1]*t)
        b = int(top[2]*(1-t) + bot[2]*t)
        d.line([(0,y),(w,y)], fill=(r,g,b))


def glow(canvas, cx, cy, radius, col, intensity=18):
    """Soft radial glow blended onto canvas (RGBA)."""
    ov = Image.new('RGBA', canvas.size, (0,0,0,0))
    d  = ImageDraw.Draw(ov)
    steps = 40
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        a = int(intensity * (1 - i/steps)**1.6)
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(col[0],col[1],col[2],a))
    return Image.alpha_composite(canvas, ov)


def stars(canvas, n=70, seed=7):
    import random; random.seed(seed)
    ov = Image.new('RGBA', canvas.size, (0,0,0,0))
    d  = ImageDraw.Draw(ov)
    w, h = canvas.size
    cols = [WHITE, BLUE, PINK, GREEN]
    for _ in range(n):
        x, y = random.randint(0,w), random.randint(0,h)
        sz   = 1 if random.random()<.65 else 2
        a    = int(random.uniform(30,110))
        c    = random.choice(cols)
        d.ellipse([x-sz,y-sz,x+sz,y+sz], fill=(c[0],c[1],c[2],a))
    return Image.alpha_composite(canvas, ov)


def paste_icon(canvas, icon_rgba, cx, cy, size):
    """Paste icon centred at (cx,cy) with given pixel size."""
    ico = icon_rgba.resize((size, size), Image.LANCZOS)
    canvas.paste(ico, (cx - size//2, cy - size//2), ico)


def hgrad_rect(img, x0, y0, x1, y1, col_l, col_r, radius=27):
    """Paste a horizontal-gradient rounded rectangle onto img (RGBA)."""
    w, h = x1-x0, y1-y0
    rect = Image.new('RGBA', (w,h), (0,0,0,0))
    dr   = ImageDraw.Draw(rect)
    for x in range(w):
        t = x / max(w-1, 1)
        c = tuple(int(col_l[i]*(1-t) + col_r[i]*t) for i in range(3))
        dr.line([(x,0),(x,h)], fill=(*c, 255))
    mask = Image.new('L', (w,h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0,0,w,h], radius=radius, fill=255)
    rect.putalpha(mask)
    img.paste(rect, (x0,y0), rect)


def dotgrid(canvas, spacing=44, alpha=7):
    """Subtle dot-grid texture."""
    ov = Image.new('RGBA', canvas.size, (0,0,0,0))
    d  = ImageDraw.Draw(ov)
    w, h = canvas.size
    for x in range(0, w, spacing):
        for y in range(0, h, spacing):
            d.ellipse([x-1,y-1,x+1,y+1], fill=(255,255,255,alpha))
    return Image.alpha_composite(canvas, ov)


def load_fonts():
    paths = [
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/SFNSDisplay.ttf',
        '/System/Library/Fonts/Arial.ttf',
    ]
    for path in paths:
        if os.path.exists(path):
            try:
                return {
                    'xl':  ImageFont.truetype(path, 72),
                    'big': ImageFont.truetype(path, 52),
                    'med': ImageFont.truetype(path, 30),
                    'sm':  ImageFont.truetype(path, 22),
                    'xs':  ImageFont.truetype(path, 17),
                }
            except Exception:
                continue
    f = ImageFont.load_default()
    return {k: f for k in ('xl','big','med','sm','xs')}


# ── 1. Profile Picture  800×800 ───────────────────────────
def make_profile(icon_rgba, fonts):
    W = H = 800
    img = Image.new('RGBA', (W,H))
    vgrad(img, BG1, BG2)
    img = glow(img, W//2, H//2, 340, BLUE, 14)
    img = stars(img, n=60)

    paste_icon(img, icon_rgba, W//2, H//2, 620)

    img = img.convert('RGB')
    p = os.path.join(OUT, 'profile-picture.png')
    img.save(p, 'PNG')
    print(f'  profile-picture.png  (800x800)')


# ── 2. Twitter Header  1500×500 ──────────────────────────
def make_header(icon_rgba, fonts):
    W, H = 1500, 500
    img = Image.new('RGBA', (W,H))
    vgrad(img, BG1, BG2)
    img = glow(img, 300, H//2, 280, BLUE, 12)
    img = glow(img, W-200, H//2, 200, (167,139,250), 8)
    img = stars(img, n=90, seed=3)

    paste_icon(img, icon_rgba, 300, H//2, 380)

    ov = Image.new('RGBA', (W,H), (0,0,0,0))
    d  = ImageDraw.Draw(ov)
    for dy in range(-130,131):
        a = max(0, 70 - abs(dy)//2)
        d.line([(570,H//2+dy),(571,H//2+dy)], fill=(255,255,255,a))
    img = Image.alpha_composite(img, ov)

    d = ImageDraw.Draw(img)
    tx = 610

    d.text((tx, 105), 'SIVENA', font=fonts['big'], fill=WHITE)
    d.text((tx, 172), 'One app for your whole life.', font=fonts['med'], fill=TEXT2)

    chips = [('Tasks & Calendar', BLUE), ('Expenses', GREEN), ('Meal Planning', PINK)]
    cx2 = tx
    for label, col in chips:
        bbox = d.textbbox((0,0), label, font=fonts['xs'])
        bw = bbox[2]-bbox[0] + 26
        d.rounded_rectangle([cx2,220,cx2+bw,246], radius=13, fill=(col[0],col[1],col[2],35))
        d.rounded_rectangle([cx2,220,cx2+bw,246], radius=13, outline=(col[0],col[1],col[2],120), width=1)
        d.text((cx2+bw//2, 233), label, font=fonts['xs'], fill=(col[0],col[1],col[2]), anchor='mm')
        cx2 += bw + 10

    d.rounded_rectangle([tx,280,tx+240,325], radius=22, fill=WHITE)
    d.text((tx+120,302), 'Download on iOS', font=fonts['sm'], fill=BG1, anchor='mm')

    d.text((tx, 342), 'Android coming soon  ·  sivena.app', font=fonts['xs'], fill=TEXT3)

    img = img.convert('RGB')
    p = os.path.join(OUT, 'twitter-header.png')
    img.save(p, 'PNG')
    print(f'  twitter-header.png   (1500x500)')


# ── 3. Twitter Ad  1200×628  ─────────────────────────────
def make_ad(icon_rgba, fonts):
    W, H = 1200, 628

    # ── Background: deep dark + mesh-gradient glows + dot grid ──
    img = Image.new('RGBA', (W,H))
    vgrad(img, (6,9,20), (9,12,28))

    # Overlapping large soft glows create a mesh-gradient feel
    img = glow(img, 215, 305, 320, (35, 85, 220),  24)   # blue — icon area
    img = glow(img, 660,  60, 230, (110, 45, 230),  12)  # purple — top center
    img = glow(img, W-140, H-110, 270, (20,130,210), 11) # teal — bottom right
    img = glow(img, W-260, 210, 190, (170, 45, 195),  7) # magenta hint — top right
    img = stars(img, n=75, seed=13)
    img = dotgrid(img)

    # ── Left panel: icon with decorative halo rings ───────────
    ICX, ICY, ICS = 215, 302, 330
    IR = ICS // 2  # 165

    ring_ov = Image.new('RGBA', (W,H), (0,0,0,0))
    rd = ImageDraw.Draw(ring_ov)
    # Three concentric rings fading outward
    for r_add, col, a, w in [
        ( 8,  (200,220,255),  55, 1),
        (20,  BLUE,           32, 1),
        (38,  BLUE,           14, 1),
    ]:
        r = IR + r_add
        rd.ellipse([ICX-r, ICY-r, ICX+r, ICY+r], outline=(*col, a), width=w)
    img = Image.alpha_composite(img, ring_ov)

    paste_icon(img, icon_rgba, ICX, ICY, ICS)

    # ── Soft vertical separator (faded, not a hard line) ──────
    sep_ov = Image.new('RGBA', (W,H), (0,0,0,0))
    sv = ImageDraw.Draw(sep_ov)
    sep_x = 415
    for dy in range(-260, 261):
        a = max(0, 32 - abs(dy)//8)
        sv.line([(sep_x, H//2+dy),(sep_x+1, H//2+dy)], fill=(255,255,255,a))
    img = Image.alpha_composite(img, sep_ov)
    d = ImageDraw.Draw(img)

    # ── Right panel ───────────────────────────────────────────
    rx = 450

    # "NOW ON APP STORE" badge
    BW = 204
    d.rounded_rectangle([rx, 42, rx+BW, 68], radius=13, fill=(96,165,250,18))
    d.rounded_rectangle([rx, 42, rx+BW, 68], radius=13,
                         outline=(96,165,250,85), width=1)
    d.text((rx+BW//2, 55), 'NOW ON THE APP STORE',
           font=fonts['xs'], fill=BLUE, anchor='mm')

    # Headline — 3 lines with alternating white/blue
    d.text((rx,  85), 'Everything your',  font=fonts['big'], fill=WHITE)
    d.text((rx, 148), 'family needs,',    font=fonts['big'], fill=BLUE)
    d.text((rx, 211), 'beautifully.',     font=fonts['big'], fill=WHITE)

    # Tagline
    d.text((rx, 283), 'Tasks, expenses, meals, habits & more —',
           font=fonts['xs'], fill=TEXT2)
    d.text((rx, 305), 'one shared space for your whole family.',
           font=fonts['xs'], fill=TEXT2)

    # Feature 2x2 grid — colored accent bar + label (no emojis)
    feats = [
        ('Tasks & Calendar', BLUE),
        ('Shared Expenses',  GREEN),
        ('Meal Planning',    PINK),
        ('Habits & Goals',   AMBER),
    ]
    col_gap = 335
    for i, (label, col) in enumerate(feats):
        row, ci = divmod(i, 2)
        fx = rx + ci * col_gap
        fy = 340 + row * 40
        # Colored left bar
        d.rounded_rectangle([fx, fy, fx+3, fy+26], radius=2, fill=col)
        # Label
        d.text((fx+14, fy+13), label, font=fonts['xs'], fill=TEXT2, anchor='lm')

    # Gradient CTA button: blue → indigo
    btn_x, btn_y, btn_w, btn_h = rx, 432, 320, 54
    hgrad_rect(img, btn_x, btn_y, btn_x+btn_w, btn_y+btn_h,
               BLUE, INDIGO, radius=btn_h//2)
    d = ImageDraw.Draw(img)
    d.text((btn_x + btn_w//2, btn_y + btn_h//2),
           'Download Free on iOS',
           font=fonts['sm'], fill=(8,11,24), anchor='mm')

    # Footer
    d.text((rx, 504),
           'Free to download  |  Android coming soon  |  sivena.app',
           font=fonts['xs'], fill=(155,180,235))
    d.text((rx, 526),
           '5.0 on the App Store  |  Trusted by families worldwide',
           font=fonts['xs'], fill=TEXT3)

    img = img.convert('RGB')
    p = os.path.join(OUT, 'twitter-ad.png')
    img.save(p, 'PNG')
    print(f'  twitter-ad.png       (1200x628)')


if __name__ == '__main__':
    icon = Image.open(ICON_SRC).convert('RGBA')
    fonts = load_fonts()
    make_profile(icon, fonts)
    make_header(icon, fonts)
    make_ad(icon, fonts)
    print('\nAll images saved to misc/social/')
