"""
Generates a pixel-art style sprite sheet for the town-builder game.
Each frame is 32x32, laid out in a 6-column grid, drawn with blocky
geometric shapes (no anti-aliasing) so it reads as pixel art once
scaled with nearest-neighbor filtering in the browser.
"""
from PIL import Image, ImageDraw
import base64, json, os

TILE = 32
COLS = 6
ROWS = 12  # 6x12 = 72 slots (grew from 6x11 for the bandit camp + bandit)

frames = {}
order = []

def new_canvas():
    return Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))

def rect(d, x0, y0, x1, y1, fill):
    d.rectangle([x0, y0, x1, y1], fill=fill)

def shade(c, f):
    """Lighten (f>1) or darken (f<1) a colour, keeping it in range."""
    return tuple(max(0, min(255, int(v*f))) for v in c[:3])

def _prng(seed):
    """Tiny deterministic LCG — same sprite every build, no random import."""
    s = seed
    while True:
        s = (s*1103515245 + 12345) & 0x7fffffff
        yield s

def scatter(d, seed, n, color, size=1):
    """Deterministic speckle used to give flat terrain some grain. Kept
    low-contrast on purpose: ground tiles repeat across the whole map, so
    anything bold turns into obvious wallpaper."""
    g = _prng(seed)
    for _ in range(n):
        x = next(g) % (TILE - size + 1)
        y = next(g) % (TILE - size + 1)
        rect(d, x, y, x+size-1, y+size-1, color)

# ---- palette ----
GRASS = (86, 160, 61)
GRASS_D = (70, 138, 48)
GRASS_D2 = (58, 120, 40)
GRASS_L = (104, 178, 76)
DIRT = (155, 118, 83)
DIRT_D = (128, 94, 63)
DIRT_L = (178, 142, 106)
WATER = (58, 108, 173)
WATER_L = (84, 138, 201)
WATER_D = (44, 88, 148)
STONE = (140, 140, 148)
STONE_D = (105, 105, 113)
STONE_L = (178, 178, 186)
FOREST = (58, 132, 50)
FOREST_D = (40, 96, 36)
FOREST_L = (80, 156, 66)

# ---- shared structure helpers ----
# Everything below assumes ONE light source, top-left: lit top/left edges,
# shadowed right/bottom, plus a contact shadow so buildings sit on the
# ground instead of floating. Used across the whole human building set so
# they read as one coherent style (and match the undead structures).
def ground_shadow(d, x0, x1, y=27, h=4):
    d.ellipse([x0, y, x1, y+h], fill=(0, 0, 0, 55))

def shaded_box(d, x0, y0, x1, y1, base):
    rect(d, x0, y0, x1, y1, base)
    rect(d, x0, y0, x1, y0, shade(base, 1.16))   # lit top
    rect(d, x0, y0, x0, y1, shade(base, 1.08))   # lit left
    rect(d, x1, y0, x1, y1, shade(base, 0.76))   # shadowed right
    rect(d, x0, y1, x1, y1, shade(base, 0.66))   # shadowed bottom

def gable_roof(d, x0, x1, ybase, ypeak, base):
    """Front-facing gable: lit left slope, shadowed right, dark eave line."""
    mid = (x0 + x1)//2
    d.polygon([(x0,ybase),(x1,ybase),(mid,ypeak)], fill=shade(base, 0.74))
    d.polygon([(x0,ybase),(mid,ybase),(mid,ypeak)], fill=base)
    rect(d, x0, ybase, x1, ybase, shade(base, 0.50))

def stone_courses(d, x0, y0, x1, y1, base=STONE):
    """Masonry with staggered block joints instead of a flat grey slab."""
    rect(d, x0, y0, x1, y1, base)
    dk = shade(base, 0.76)
    for i, y in enumerate(range(y0+3, y1, 5)):
        rect(d, x0, y, x1, y, dk)
        off = 0 if i % 2 == 0 else 4
        for x in range(x0+off, x1+1, 8):
            rect(d, x, y, x, min(y+4, y1), dk)
    rect(d, x0, y0, x1, y0, shade(base, 1.16))
    rect(d, x0, y0, x0, y1, shade(base, 1.06))
    rect(d, x1, y0, x1, y1, dk)

def lit_window(d, x0, y0, x1, y1):
    """Glowing window with a dark frame so it reads as an opening."""
    rect(d, x0-1, y0-1, x1+1, y1+1, (56, 42, 28))
    rect(d, x0, y0, x1, y1, GOLD)
    rect(d, x0, y0, x1, y0, shade(GOLD, 1.18))

def plank_door(d, x0, y0, x1, y1):
    rect(d, x0, y0, x1, y1, WOOD_D)
    for x in range(x0+1, x1, 2):
        rect(d, x, y0+1, x, y1, WOOD)
    rect(d, x0, y0, x1, y0, (52, 36, 22))        # lintel
    rect(d, x0, y0, x0, y1, (52, 36, 22))
WOOD = (117, 79, 48)
WOOD_D = (92, 61, 36)
ROOF = (150, 55, 45)
ROOF_D = (120, 40, 32)
TAN = (214, 188, 140)
TAN_D = (184, 156, 110)
GOLD = (231, 190, 74)
SKIN = (224, 172, 132)
GREEN_TUNIC = (58, 122, 74)
BLUE_TUNIC = (55, 95, 150)
RED_TUNIC = (150, 40, 40)
BLACK = (30, 28, 26)
DARKGREY = (60, 60, 66)

def draw_grass(d):
    # Fine single-pixel grain in tones CLOSE to the base colour. Deliberately
    # no directional marks (blades) and no high-contrast specks: this tile
    # repeats across the entire map, and anything aligned or bold lines up
    # into visible stripes/lattice once tiled.
    rect(d, 0, 0, 31, 31, GRASS)
    scatter(d, 11, 46, GRASS_D)
    scatter(d, 29, 34, GRASS_L)
    scatter(d, 47, 6, GRASS_D2)

def draw_forest(d):
    draw_grass(d)
    for cx, cy in [(9,20),(21,19),(15,10)]:
        d.ellipse([cx-6, cy+6, cx+6, cy+10], fill=GRASS_D2)      # ground shadow
        rect(d, cx-1, cy+4, cx+1, cy+8, WOOD_D)                  # trunk
        rect(d, cx-1, cy+4, cx-1, cy+8, WOOD)                    # lit trunk edge
        d.polygon([(cx-7,cy+5),(cx+7,cy+5),(cx,cy-9)], fill=FOREST_D)
        d.polygon([(cx-6,cy+4),(cx+5,cy+4),(cx,cy-7)], fill=FOREST)
        d.polygon([(cx-5,cy+1),(cx+1,cy+1),(cx-1,cy-5)], fill=FOREST_L)  # lit side

def draw_stone_deposit(d):
    draw_grass(d)
    d.ellipse([5, 22, 27, 29], fill=GRASS_D2)                    # ground shadow
    for x, y, w, h in [(6,13,11,11),(14,16,13,12),(9,9,9,9)]:
        d.ellipse([x, y, x+w, y+h], fill=STONE_D, outline=BLACK)
        d.ellipse([x+1, y+1, x+w-3, y+h-4], fill=STONE)
        # lit top-left cap, sized proportionally so small rocks stay valid
        d.ellipse([x+2, y+2, x+2+max(2, w//3), y+2+max(2, h//3)], fill=STONE_L)

def draw_water(d):
    # depth mottling + surface shimmer, then crests of VARYING length and
    # spacing — the old evenly-spaced rows read as banding once tiled
    rect(d, 0, 0, 31, 31, WATER)
    scatter(d, 101, 36, WATER_D)
    scatter(d, 113, 22, shade(WATER, 1.10))
    for wy, off, ln in [(3,2,4),(8,9,3),(13,4,5),(18,11,3),(23,1,4),(28,7,5)]:
        for x in range(off, 32, 13):
            rect(d, x, wy, x+ln, wy, WATER_L)
    for sx, sy in [(6,6),(20,15),(11,24),(26,27)]:      # sun sparkles
        rect(d, sx, sy, sx, sy, (198, 226, 248))

def draw_dirt(d):
    rect(d, 0, 0, 31, 31, DIRT)
    scatter(d, 71, 30, DIRT_D)
    scatter(d, 83, 20, DIRT_L)
    # small pebbles — warm greys, NOT the cool blue-grey stone tone, which
    # read as odd blue specks against the brown
    for px, py in [(7,9),(21,16),(13,25),(26,6)]:
        rect(d, px, py, px+1, py+1, (108, 92, 74))
        rect(d, px, py, px, py, (146, 128, 106))

def draw_town_hall(d):
    # a proper keep: masonry ground floor, half-timbered upper story, grand
    # shaded roof, framed lit windows and a pennant.
    # Transparent background so it sits on whatever tile it was built on.
    ground_shadow(d, 2, 29, 28, 3)
    stone_courses(d, 3, 16, 28, 29)
    # half-timbered upper floor with shaded beams
    shaded_box(d, 5, 9, 26, 16, TAN)
    for x in (8, 15, 22):
        rect(d, x, 9, x+1, 16, WOOD_D)
        rect(d, x, 9, x, 16, WOOD)          # lit beam edge
    gable_roof(d, 2, 29, 9, 1, ROOF)
    for sy in (4, 6, 8):                     # shingle courses
        rect(d, 2+(9-sy), sy, 29-(9-sy), sy, shade(ROOF, 0.62))
    plank_door(d, 13, 20, 18, 29)
    d.polygon([(13,20),(18,20),(15,17)], fill=WOOD)   # arch over the door
    lit_window(d, 7, 11, 10, 14)
    lit_window(d, 21, 11, 24, 14)
    lit_window(d, 6, 21, 9, 24)
    lit_window(d, 22, 21, 25, 24)
    rect(d, 15, 0, 16, 3, WOOD_D)            # banner pole
    d.polygon([(16,0),(24,1),(16,3)], fill=(190, 52, 45))

def draw_house(d):
    draw_dirt(d)
    ground_shadow(d, 5, 27, 28, 3)
    shaded_box(d, 6, 17, 26, 29, TAN)
    gable_roof(d, 4, 28, 17, 6, ROOF)
    for sy in (10, 13, 16):                  # shingle courses
        rect(d, 4+(17-sy), sy, 28-(17-sy), sy, shade(ROOF, 0.62))
    plank_door(d, 14, 21, 18, 29)
    lit_window(d, 8, 20, 11, 23)

def draw_farm(d):
    # ploughed field: furrows with a lit crest and shadowed trough, and
    # ripening crop tufts standing in the rows
    rect(d, 0, 0, 31, 31, (109, 87, 58))
    scatter(d, 137, 24, (96, 76, 50))
    for y in range(4, 28, 6):
        rect(d, 3, y, 28, y+2, (94, 74, 48))          # furrow trough
        rect(d, 3, y-1, 28, y-1, (126, 102, 68))      # lit crest above it
        for x in range(4, 28, 6):
            rect(d, x, y-3, x+1, y, (196, 176, 60))   # crop
            rect(d, x, y-3, x, y, (226, 208, 96))     # lit side of the crop
    shaded_box(d, 0, 0, 31, 2, WOOD_D)                # fence rails
    shaded_box(d, 0, 29, 31, 31, WOOD_D)

def draw_lumber_camp(d):
    draw_dirt(d)
    ground_shadow(d, 4, 27, 27, 3)
    # log pile — end-grain rings and a lit top so they read as cut timber
    for i, y in enumerate([22, 18, 14]):
        off = i * 2
        for x in range(6+off, 24-off, 6):
            d.ellipse([x, y, x+7, y+5], fill=WOOD, outline=WOOD_D)
            d.ellipse([x+2, y+1, x+5, y+4], fill=shade(WOOD, 1.2))   # cut face
            rect(d, x+3, y+2, x+4, y+3, WOOD_D)                      # heartwood
    shaded_box(d, 20, 6, 29, 18, TAN_D)               # sawyer's shed
    gable_roof(d, 18, 31, 6, 1, ROOF_D)

def draw_quarry(d):
    # an excavated pit with stepped walls, cut blocks, and a timber crane —
    # clearly industry, not just another rock pile. Each step is lit on its
    # top face and shadowed on the wall below so the pit reads as depth.
    draw_dirt(d)
    for x0, y0, x1, y1, c in [(4,14,27,29,(88,88,96)), (6,16,25,27,(70,70,78)), (8,18,23,25,(56,56,64))]:
        rect(d, x0, y0, x1, y1, c)
        rect(d, x0, y0, x1, y0, shade(c, 1.3))     # lit tread
        rect(d, x0, y0+1, x0, y1, shade(c, 1.12))  # lit left face
    # cut stone blocks stacked at the rim
    shaded_box(d, 3, 8, 9, 13, STONE)
    shaded_box(d, 10, 10, 15, 13, STONE_D)
    # timber crane with a hoisted block
    rect(d, 22, 2, 24, 14, WOOD)
    rect(d, 22, 2, 22, 14, shade(WOOD, 1.2))
    d.line([23, 3, 29, 8], fill=WOOD_D, width=2)
    d.line([29, 8, 29, 13], fill=BLACK, width=1)
    shaded_box(d, 27, 13, 31, 16, STONE)

def merlons(d, xs, y0, y1, w=5):
    """Crenellation teeth along the top of a wall, lit top-left."""
    for x in xs:
        rect(d, x, y0, x+w, y1, STONE)
        rect(d, x, y0, x+w, y0, shade(STONE, 1.18))
        rect(d, x+w, y0, x+w, y1, shade(STONE, 0.72))

def draw_wall(d):
    stone_courses(d, 0, 10, 31, 31)
    merlons(d, range(0, 32, 8), 4, 10)
    rect(d, 0, 10, 31, 10, shade(STONE, 0.6))     # shadow under the parapet

def draw_wall_v(d):
    # 90-degree rotated segment so vertical runs connect cleanly too
    stone_courses(d, 10, 0, 31, 31)
    for y in range(0, 32, 8):
        rect(d, 4, y, 10, y+5, STONE)
        rect(d, 4, y, 4, y+5, shade(STONE, 1.18))
        rect(d, 4, y+5, 10, y+5, shade(STONE, 0.72))
    rect(d, 10, 0, 10, 31, shade(STONE, 0.6))

def draw_tower(d):
    # a round-shouldered keep tower: curved shading across the barrel, a
    # crenellated crown, and a recessed arrow slit
    ground_shadow(d, 3, 28, 28, 3)
    stone_courses(d, 6, 9, 25, 31)
    rect(d, 6, 9, 8, 31, shade(STONE, 1.14))      # lit left curve
    rect(d, 23, 9, 25, 31, shade(STONE, 0.74))    # shadowed right curve
    # crown: a wider band with teeth on top
    shaded_box(d, 4, 5, 27, 9, STONE)
    merlons(d, (4, 12, 20), 1, 5, 4)
    # arrow slit, recessed
    rect(d, 14, 15, 17, 25, shade(STONE, 0.55))
    rect(d, 15, 16, 16, 24, BLACK)

def draw_wall_gate(d):
    # timber gate between two stone piers, with iron bands
    stone_courses(d, 0, 10, 9, 31)
    stone_courses(d, 22, 10, 31, 31)
    merlons(d, (0,), 4, 10); merlons(d, (22,), 4, 10)
    rect(d, 10, 13, 21, 31, WOOD_D)
    for x in range(11, 21, 3):
        rect(d, x, 14, x+1, 31, WOOD)             # planks
    rect(d, 10, 13, 21, 14, (52, 36, 22))         # lintel shadow
    for by in (18, 26):                            # iron bands
        rect(d, 10, by, 21, by+1, (66, 66, 72))
        rect(d, 10, by, 21, by, (96, 96, 104))

def humanoid(d, tunic, weapon=None, hair=(78, 54, 34)):
    # A proper little figure instead of stacked flat rectangles: shaded
    # torso and limbs (light from the top-left), boots, hair and a face,
    # and a ground shadow so it sits on the tile rather than floating.
    tunic_l, tunic_d = shade(tunic, 1.18), shade(tunic, 0.72)
    skin_d = shade(SKIN, 0.82)
    BOOT, BOOT_D = (62, 46, 32), (42, 31, 21)
    d.ellipse([10, 27, 22, 31], fill=(0, 0, 0, 70))          # ground shadow
    # legs + boots
    rect(d, 13, 21, 15, 27, tunic_d)
    rect(d, 17, 21, 19, 27, tunic_d)
    rect(d, 12, 27, 15, 30, BOOT); rect(d, 12, 29, 15, 30, BOOT_D)
    rect(d, 17, 27, 20, 30, BOOT); rect(d, 17, 29, 20, 30, BOOT_D)
    # torso, lit on the left and shadowed on the right
    rect(d, 11, 12, 21, 22, tunic)
    rect(d, 11, 12, 12, 22, tunic_l)
    rect(d, 20, 12, 21, 22, tunic_d)
    rect(d, 11, 20, 21, 21, tunic_d)                          # belt
    # arms
    rect(d, 8, 13, 10, 21, SKIN);  rect(d, 8, 13, 8, 21, skin_d)
    rect(d, 22, 13, 24, 21, SKIN); rect(d, 24, 13, 24, 21, skin_d)
    # head, hair and face
    d.ellipse([12, 3, 20, 12], fill=SKIN)
    rect(d, 19, 5, 20, 10, skin_d)                            # cheek shadow
    d.ellipse([12, 2, 20, 8], fill=hair)                      # hair cap
    rect(d, 12, 5, 13, 8, hair)                               # sideburn
    rect(d, 14, 8, 15, 9, BLACK); rect(d, 17, 8, 18, 9, BLACK)  # eyes
    if weapon == "bow":
        d.arc([20, 6, 30, 24], 250, 110, fill=WOOD_D, width=2)
        d.line([21, 9, 27, 21], fill=BLACK, width=1)
    if weapon == "axe":
        rect(d, 22, 4, 23, 18, WOOD_D)
        d.polygon([(23,4),(29,7),(23,11)], fill=STONE_D)
    if weapon == "sword":
        rect(d, 22, 5, 23, 19, STONE)
        rect(d, 20, 18, 25, 20, WOOD_D)

def draw_archer(d):
    humanoid(d, GREEN_TUNIC, "bow")

def draw_villager(d):
    humanoid(d, TAN_D, None)

def draw_enemy_raider(d):
    humanoid(d, RED_TUNIC, "axe")

def draw_enemy_swordsman(d):
    humanoid(d, DARKGREY, "sword")

def draw_enemy_ram(d):
    # battering ram: iron-headed log slung under a hide roof on a wheeled
    # frame, side view. Shaded and grounded like everything else now.
    ground_shadow(d, 3, 28, 28, 3)
    for wx in (6, 21):                                   # spoked wheels
        d.ellipse([wx, 24, wx+6, 30], fill=DARKGREY, outline=BLACK)
        d.ellipse([wx+2, 26, wx+4, 28], fill=shade(DARKGREY, 1.5))
        rect(d, wx, 27, wx+6, 27, BLACK)
        rect(d, wx+3, 24, wx+3, 30, BLACK)
    shaded_box(d, 4, 21, 27, 25, WOOD_D)                 # frame base
    rect(d, 7, 10, 10, 22, WOOD); rect(d, 7, 10, 7, 22, shade(WOOD, 1.2))   # posts
    rect(d, 21, 10, 24, 22, WOOD); rect(d, 23, 10, 24, 22, shade(WOOD, 0.75))
    gable_roof(d, 4, 27, 11, 6, ROOF_D)                  # hide canopy
    rect(d, 2, 14, 27, 19, WOOD)                         # the ram log
    rect(d, 2, 14, 27, 14, shade(WOOD, 1.22))            # lit top of the log
    rect(d, 2, 19, 27, 19, shade(WOOD, 0.68))
    for ry in (16, 17):                                  # binding ropes
        rect(d, 9, ry, 10, ry, WOOD_D); rect(d, 18, ry, 19, ry, WOOD_D)
    rect(d, 26, 12, 31, 21, STONE_D)                     # iron head
    rect(d, 26, 12, 31, 13, shade(STONE_D, 1.4))
    rect(d, 26, 20, 31, 21, shade(STONE_D, 0.7))

def draw_caravan(d):
    # merchant wagon — a canvas-topped cart piled with trade goods. It used to
    # borrow the battering ram sprite with a gold tint, so a friendly trader
    # and a siege engine were the same silhouette.
    CANVAS, CANVAS_D = (226, 214, 186), (188, 174, 146)
    ground_shadow(d, 3, 28, 28, 3)
    for wx in (6, 20):                                   # cart wheels
        d.ellipse([wx, 23, wx+7, 30], fill=WOOD_D, outline=BLACK)
        d.ellipse([wx+2, 25, wx+5, 28], fill=shade(WOOD, 1.25))
        rect(d, wx, 26, wx+7, 26, BLACK)
        rect(d, wx+3, 23, wx+3, 30, BLACK)
    shaded_box(d, 4, 18, 28, 24, WOOD)                   # wagon bed
    # arched canvas hood, lit on the left
    d.ellipse([5, 6, 27, 20], fill=CANVAS_D)
    d.ellipse([6, 7, 24, 19], fill=CANVAS)
    for hx in (10, 15, 20):                              # hoop ribs
        rect(d, hx, 7, hx, 18, CANVAS_D)
    rect(d, 5, 18, 27, 19, shade(CANVAS_D, 0.85))
    # goods poking out the back + a lantern on the draw-bar
    rect(d, 24, 14, 28, 18, GOLD); rect(d, 24, 14, 28, 14, shade(GOLD, 1.2))
    rect(d, 2, 20, 5, 21, WOOD_D)                        # draw-bar
    rect(d, 1, 17, 3, 20, GOLD)                          # lantern

def draw_granary(d):
    # round grain silo with a conical thatch roof and a grain sack out front —
    # the barrel is shaded across its curve so it reads as round
    ground_shadow(d, 7, 24, 28, 3)
    rect(d, 8, 12, 23, 29, TAN)
    rect(d, 8, 12, 10, 29, shade(TAN, 1.14))    # lit left curve
    rect(d, 21, 12, 23, 29, shade(TAN, 0.74))   # shadowed right curve
    for hy in (17, 22, 27):                      # barrel hoops
        rect(d, 8, hy, 23, hy, TAN_D)
    gable_roof(d, 5, 26, 13, 3, ROOF)            # conical thatch
    rect(d, 5, 13, 26, 13, shade(ROOF, 0.5))
    plank_door(d, 14, 21, 17, 29)
    rect(d, 24, 24, 29, 29, GOLD)                # grain sack
    rect(d, 24, 24, 29, 24, shade(GOLD, 1.18))
    rect(d, 29, 24, 29, 29, shade(GOLD, 0.72))

def draw_warehouse(d):
    # long shed stacked with crates
    ground_shadow(d, 2, 29, 28, 3)
    shaded_box(d, 3, 14, 28, 29, WOOD)
    shaded_box(d, 1, 10, 30, 15, STONE_D)        # flat stone roof
    for x0, y0, x1, y1 in [(6,20,12,26), (14,18,21,26)]:
        shaded_box(d, x0, y0, x1, y1, TAN)
        rect(d, x0, (y0+y1)//2, x1, (y0+y1)//2, TAN_D)   # crate slat
    shaded_box(d, 23, 21, 27, 26, STONE)         # stone block

def draw_arrow(d):
    d.line([4, 28, 27, 5], fill=WOOD_D, width=2)
    d.polygon([(27,5),(21,7),(25,11)], fill=STONE_D)
    d.polygon([(4,28),(9,25),(7,30)], fill=(220,220,220))

def draw_icon_food(d):
    d.polygon([(16,3),(24,26),(16,22),(8,26)], fill=GOLD, outline=WOOD_D)
    for y in range(6, 22, 3):
        d.line([16, y, 16, y+2], fill=WOOD_D)

def draw_icon_wood(d):
    d.ellipse([4, 10, 27, 22], fill=WOOD, outline=WOOD_D)
    d.ellipse([11, 13, 19, 19], fill=TAN_D, outline=WOOD_D)

def draw_icon_stone(d):
    d.polygon([(6,20),(10,8),(20,6),(27,14),(23,26),(10,25)], fill=STONE, outline=BLACK)
    d.polygon([(10,8),(20,6),(16,15),(10,8)], fill=STONE_D)

def draw_icon_population(d):
    d.ellipse([11, 4, 21, 14], fill=BLUE_TUNIC, outline=BLACK)
    d.polygon([(6,28),(26,28),(23,16),(9,16)], fill=BLUE_TUNIC, outline=BLACK)

def draw_select(d):
    d.rectangle([1,1,30,30], outline=(255, 230, 90), width=2)

def draw_blocked(d):
    d.rectangle([1,1,30,30], outline=(230, 70, 70), width=2)

def draw_grid(d):
    d.rectangle([0,0,31,31], outline=(255,255,255,60), width=1)

def draw_wall_corner(d):
    # junction piece: horizontal + vertical arms crossing, so L-corners,
    # T-junctions and 4-way crossings all read as one continuous wall
    stone_courses(d, 0, 10, 31, 31)      # horizontal arm
    stone_courses(d, 10, 0, 31, 31)      # vertical arm
    for x in range(0, 10, 8):            # crenellations, west arm
        rect(d, x, 4, x+5, 10, STONE)
        rect(d, x, 4, x+5, 4, shade(STONE, 1.18))
    for y in range(0, 10, 8):            # crenellations, north arm
        rect(d, 4, y, 10, y+5, STONE)
        rect(d, 4, y, 4, y+5, shade(STONE, 1.18))
    rect(d, 0, 10, 9, 10, shade(STONE, 0.6))   # parapet shadow, west
    rect(d, 10, 0, 10, 9, shade(STONE, 0.6))   # parapet shadow, north
    for x in range(14, 31, 6):
        rect(d, x, 0, x, 31, STONE_D)

def draw_minotaur(d):
    # hulking bull-headed hero with a scythe
    FUR = (110, 76, 48)
    FUR_D = (85, 58, 36)
    HORN = (232, 222, 200)
    # scythe first (behind the body): tall staff + curved blade
    rect(d, 25, 3, 26, 29, WOOD_D)                    # staff
    d.arc([13, 0, 31, 13], 170, 340, fill=(205, 205, 215), width=3)  # blade
    d.polygon([(14, 5), (18, 2), (16, 8)], fill=(205, 205, 215))     # blade tip
    d.ellipse([9, 27, 22, 31], fill=(0, 0, 0, 70))   # ground shadow — he has weight
    # legs
    rect(d, 11, 22, 14, 29, FUR_D)
    rect(d, 17, 22, 20, 29, FUR_D)
    rect(d, 11, 22, 11, 29, shade(FUR_D, 1.2))       # lit leg edges
    rect(d, 17, 22, 17, 29, shade(FUR_D, 1.2))
    rect(d, 11, 28, 14, 29, BLACK)   # hooves
    rect(d, 17, 28, 20, 29, BLACK)
    # broad body, lit from the top-left
    rect(d, 9, 12, 22, 22, FUR)
    rect(d, 9, 12, 22, 13, shade(FUR, 1.18))         # lit shoulders
    rect(d, 9, 12, 10, 22, shade(FUR, 1.10))         # lit flank
    rect(d, 21, 12, 22, 22, shade(FUR, 0.74))        # shadowed flank
    rect(d, 9, 21, 22, 22, FUR_D)
    rect(d, 13, 15, 18, 21, TAN_D)   # belly patch
    rect(d, 13, 15, 18, 15, shade(TAN_D, 1.15))
    # arms
    rect(d, 6, 13, 8, 21, FUR); rect(d, 6, 13, 6, 21, shade(FUR, 1.18))
    rect(d, 23, 13, 25, 21, FUR); rect(d, 25, 13, 25, 21, shade(FUR, 0.74))
    # bull head
    rect(d, 12, 4, 19, 11, FUR)
    rect(d, 12, 4, 19, 4, shade(FUR, 1.18))
    rect(d, 19, 4, 19, 11, shade(FUR, 0.76))
    rect(d, 13, 8, 18, 11, (166, 124, 90))  # muzzle
    rect(d, 13, 8, 18, 8, shade((166, 124, 90), 1.15))
    rect(d, 14, 9, 15, 10, BLACK)           # nostrils
    rect(d, 16, 9, 17, 10, BLACK)
    rect(d, 13, 5, 14, 6, (210, 50, 40))    # glowing eyes
    rect(d, 17, 5, 18, 6, (210, 50, 40))
    rect(d, 13, 5, 13, 5, (255, 140, 120))  # eye glint
    rect(d, 17, 5, 17, 5, (255, 140, 120))
    # horns curving out and up, lit along their upper edge
    for hx0, hx1, tx0, tx1 in [(9, 12, 8, 10), (19, 22, 21, 23)]:
        rect(d, hx0, 3, hx1, 5, HORN)
        rect(d, hx0, 3, hx1, 3, shade(HORN, 1.08))
        rect(d, tx0, 0, tx1, 4, HORN)
        rect(d, tx0, 0, tx0, 4, shade(HORN, 1.08))

def draw_repairman(d):
    # slate-blue overalls, leather apron, hammer, gold hard hat — reads as
    # a tradesman at a glance, not another villager
    humanoid(d, (90, 110, 150))
    rect(d, 13, 14, 18, 20, (150, 110, 60))   # apron
    rect(d, 22, 8, 23, 19, WOOD_D)            # hammer handle
    rect(d, 20, 6, 26, 9, STONE_D)            # hammer head
    rect(d, 13, 4, 18, 6, GOLD)               # hard hat

def draw_mill(d):
    # a proper windmill tower with four sails
    draw_dirt(d)
    ground_shadow(d, 9, 23, 28, 3)
    rect(d, 11, 12, 21, 29, TAN)
    rect(d, 11, 12, 12, 29, shade(TAN, 1.14))  # lit left curve
    rect(d, 20, 12, 21, 29, shade(TAN, 0.74))  # shadowed right curve
    gable_roof(d, 9, 23, 12, 4, ROOF)
    plank_door(d, 14, 22, 18, 29)              # door
    d.line([16, 9, 27, 2], fill=WOOD_D, width=2)
    d.line([16, 9, 5, 2], fill=WOOD_D, width=2)
    d.line([16, 9, 27, 16], fill=WOOD_D, width=2)
    d.line([16, 9, 5, 16], fill=WOOD_D, width=2)
    rect(d, 23, 1, 28, 5, TAN_D)              # sails
    rect(d, 4, 1, 9, 5, TAN_D)
    rect(d, 23, 13, 28, 17, TAN_D)
    rect(d, 4, 13, 9, 17, TAN_D)

def draw_rally_flag(d):
    # a planted banner: dark pole, gold pennant, small ground spike
    rect(d, 14, 3, 15, 29, WOOD_D)
    d.polygon([(16,3),(29,7),(16,12)], fill=GOLD)
    d.polygon([(16,3),(29,7),(16,12)], outline=(150,110,30))
    rect(d, 11, 28, 18, 30, DARKGREY)

# ---- upgrade evolution stages: each level tier adds visible structure ----
def draw_granary_2(d):
    draw_granary(d)
    rect(d, 24, 17, 29, 22, GOLD)     # second grain sack stacked
    rect(d, 24, 17, 29, 18, TAN_D)
    rect(d, 6, 8, 25, 9, GOLD)        # gilt roof band

def draw_granary_3(d):
    draw_granary_2(d)
    rect(d, 1, 23, 6, 29, GOLD)       # third sack, other side
    rect(d, 1, 23, 6, 24, TAN_D)
    rect(d, 14, 1, 17, 4, GOLD)       # gold roof finial

def draw_warehouse_2(d):
    draw_warehouse(d)
    rect(d, 6, 14, 12, 19, TAN)       # crates stacked higher
    rect(d, 6, 14, 12, 15, TAN_D)
    rect(d, 1, 8, 30, 10, WOOD_D)     # loading awning beam

def draw_warehouse_3(d):
    draw_warehouse_2(d)
    rect(d, 14, 11, 21, 17, TAN_D)    # third crate tier
    rect(d, 14, 11, 21, 12, TAN)
    rect(d, 1, 8, 30, 9, GOLD)        # gilt trim
    rect(d, 23, 14, 27, 20, STONE_D)  # stone reserve block

def draw_town_hall_2(d):
    draw_town_hall(d)
    # a stone watchtower rises on the west wing — same masonry as the keep
    stone_courses(d, 0, 6, 5, 29)
    gable_roof(d, 0, 6, 6, 1, ROOF_D)
    lit_window(d, 1, 12, 3, 15)

def draw_town_hall_3(d):
    draw_town_hall_2(d)
    # twin tower on the east wing — full keep
    stone_courses(d, 26, 6, 31, 29)
    gable_roof(d, 25, 31, 6, 1, ROOF_D)
    lit_window(d, 28, 12, 30, 15)

# ---- the Undead (blighted ground, risen dead, grave markers) ----
CREEP_GREY    = (92, 92, 88, 255)    # opaque grey base — dead, ashen ground
CREEP_GREY_D  = (70, 70, 68, 255)    # darker grey mottling
CREEP_GREEN_T = (78, 96, 70, 150)    # sickly green rot patches (discoloration)
CREEP_BROWN_T = (86, 74, 58, 140)    # dried-blood / grave-dirt discoloration
CREEP_BLACK_T = (10, 10, 12, 130)    # semi-transparent black — the game's dark
                                      # canvas bleeds through, reading "sunken"
BONE   = (226, 224, 206)             # bone white
BONE_D = (176, 172, 150)             # bone shadow
BONE_L = (244, 242, 228)             # bone highlight

def draw_creep(d):
    # Dead, cracked, discoloured earth. Built the same way the grass tile is:
    # broad soft patches for variation, then FINE low-contrast grain on top so
    # it reads as parched ground rather than flat grey paint — and so the tile
    # repeat doesn't turn into wallpaper across a big blighted map.
    rect(d, 0, 0, 31, 31, CREEP_GREY)
    # FINE GRAIN ONLY. The old version used big dark ellipse blobs (plus, in
    # one draft, crack lines) at fixed positions — across a large blighted map
    # those repeat into obvious wallpaper, the same trap the grass tile's
    # "blades" fell into. Speckle at low contrast tiles invisibly.
    # 2px clumps give the mottled, cracked-earth feel the old blobs had;
    # being small and pseudo-randomly placed they don't line up into a grid
    scatter(d, 305, 30, CREEP_GREY_D[:3], 2)
    scatter(d, 317, 18, shade(CREEP_GREY[:3], 1.16), 2)
    scatter(d, 329, 12, (74, 84, 66), 2)                     # rot patches
    scatter(d, 211, 120, CREEP_GREY_D[:3])                   # ashen grain
    scatter(d, 223, 80, shade(CREEP_GREY[:3], 1.20))
    scatter(d, 241, 46, shade(CREEP_GREY[:3], 0.70))
    scatter(d, 257, 30, (88, 102, 78))                       # rot-green flecks
    scatter(d, 269, 22, (94, 82, 64))                        # grave-dirt flecks
    scatter(d, 281, 14, (52, 52, 50))                        # little sunken pits

def draw_creep_hand(d):
    # blighted ground with a single skeletal hand clawing up out of it — the
    # game picks this variant only sparingly (see frameForGroundTile), so most
    # tiles stay plain and the hands read as a rare, unsettling detail.
    draw_creep(d)
    # a dug-open grave-hole with a rim of upthrust dirt
    d.ellipse([8, 17, 23, 29], fill=(48, 44, 38, 200))
    d.ellipse([10, 19, 21, 28], fill=(8, 8, 10, 220))
    # forearm (radius/ulna) rising out of the hole
    rect(d, 15, 23, 17, 28, BONE_D)
    rect(d, 15, 23, 15, 28, BONE)
    # back of the hand / metacarpals, shaded
    rect(d, 12, 19, 19, 23, BONE_D)
    rect(d, 12, 19, 18, 21, BONE)
    rect(d, 13, 19, 17, 20, BONE_L)
    # knuckle ridge
    for kx in (12, 14, 16, 18):
        rect(d, kx, 18, kx, 19, BONE)
    # four fingers, each in TWO bone segments with a joint gap, splayed
    for bx, tipdx in [(12, -2), (14, -1), (16, 1), (18, 2)]:
        rect(d, bx, 15, bx, 18, BONE)                 # lower segment
        rect(d, bx, 14, bx, 14, BONE_D)               # knuckle joint (gap)
        d.line([bx, 13, bx + tipdx, 9], fill=BONE, width=1)  # upper segment, splayed
        rect(d, bx + tipdx, 8, bx + tipdx, 9, BONE_L)        # fingertip
    # a thumb jutting off to the side, lower
    d.line([12, 21, 9, 18], fill=BONE, width=1)
    rect(d, 8, 17, 9, 18, BONE_L)

def draw_headstone(d):
    # a stone cross on a small grave mound — the undead's Grave Mound (raises
    # the undead cap and spreads the blight). Baked grey stone (the building
    # def carries no tint), so it reads as weathered rock, not tinted flesh.
    ST    = (150, 150, 156)   # stone
    ST_D  = (112, 112, 120)   # stone shadow
    ST_L  = (180, 180, 186)   # stone highlight
    MOUND   = (84, 80, 72)    # turned grave dirt
    MOUND_D = (64, 60, 54)
    # mound of dirt at the base
    d.ellipse([4, 24, 28, 31], fill=MOUND, outline=MOUND_D)
    d.ellipse([9, 26, 23, 30], fill=MOUND_D)
    # cross — vertical bar
    rect(d, 13, 3, 18, 27, ST)
    rect(d, 13, 3, 13, 27, ST_L)
    rect(d, 18, 3, 18, 27, ST_D)
    # cross — horizontal bar
    rect(d, 7, 10, 24, 15, ST)
    rect(d, 7, 10, 24, 10, ST_L)
    rect(d, 7, 15, 24, 15, ST_D)
    # weathering cracks + a patch of sickly moss
    d.line([15, 6, 16, 12], fill=ST_D, width=1)
    d.line([9, 12, 12, 14], fill=ST_D, width=1)
    rect(d, 19, 20, 21, 22, (86, 104, 74))

def draw_crypt(d):
    # the undead core (Necropolis): a squat stone mausoleum with a heavy
    # slab door slid PARTLY OPEN, a sickly soul-glow leaking from the dark
    # within, a cross-topped pediment and a carved skull over the door.
    # One 32x32 frame shown at 2x2 in game, baked grey stone (no tint).
    ST   = (150, 150, 156)
    ST_D = (112, 112, 120)
    ST_L = (182, 182, 188)
    DARK = (16, 14, 18)
    GLOW = (96, 152, 92)
    GLOW_L = (150, 240, 150)
    MOSS = (86, 104, 74)
    # base step
    rect(d, 2, 27, 30, 30, ST_D)
    rect(d, 3, 27, 29, 27, ST)
    # main tomb body
    rect(d, 4, 9, 28, 28, ST)
    rect(d, 4, 9, 5, 28, ST_L)          # left highlight
    rect(d, 27, 9, 28, 28, ST_D)        # right shadow
    for y in (14, 19, 24):              # mortar courses
        rect(d, 4, y, 28, y, ST_D)
    for x in (10, 22):                  # block verticals (kept clear of the door)
        rect(d, x, 9, x, 14, ST_D)
        rect(d, x, 19, x, 24, ST_D)
    # stone pediment / gable
    d.polygon([(2, 10), (30, 10), (16, 1)], fill=ST_D)
    d.polygon([(4, 10), (28, 10), (16, 3)], fill=ST)
    # cross at the apex
    rect(d, 15, 0, 16, 5, ST_L)
    rect(d, 13, 1, 18, 2, ST_L)
    # doorway opening (dark), with soul-light leaking from deep inside
    rect(d, 11, 15, 21, 28, DARK)
    rect(d, 12, 23, 16, 27, GLOW)
    rect(d, 13, 25, 15, 27, GLOW_L)
    # the heavy slab door, slid to the RIGHT and left ajar — covers only the
    # right half, so the left half stays a dark, glowing gap
    rect(d, 16, 15, 21, 28, ST)
    rect(d, 16, 15, 16, 28, DARK)       # the ajar shadow-gap edge
    rect(d, 20, 15, 21, 28, ST_L)
    rect(d, 18, 20, 18, 23, ST_D)       # a groove on the slab
    # carved skull keystone over the door
    d.ellipse([12, 9, 20, 15], fill=BONE, outline=BONE_D)
    rect(d, 14, 11, 15, 12, DARK)
    rect(d, 17, 11, 18, 12, DARK)
    rect(d, 15, 13, 16, 14, BONE_D)
    # weathering + moss
    rect(d, 6, 21, 8, 23, MOSS)
    rect(d, 24, 16, 26, 18, MOSS)

def draw_ghoul(d):
    # a gaunt, hunched GHOUL — the undead harvester (drone). Sickly grey-green
    # flesh, deep-sunken glowing eyes and a gaping maw, visible ribs, and long
    # bony clawed arms hanging low. Baked colors so it needs no runtime tint.
    FLESH   = (138, 156, 116)
    FLESH_D = (102, 118, 84)
    FLESH_L = (168, 182, 140)
    RAG     = (68, 60, 50)
    SOCK    = (24, 30, 20)
    EYE     = (196, 246, 150)
    # hunched head, jutting low and forward
    d.ellipse([11, 5, 21, 14], fill=FLESH, outline=FLESH_D)
    rect(d, 12, 6, 14, 8, FLESH_L)                 # brow highlight
    # deep-sunken sockets with a cold glow
    rect(d, 13, 9, 15, 11, SOCK); rect(d, 17, 9, 19, 11, SOCK)
    rect(d, 14, 10, 14, 10, EYE); rect(d, 18, 10, 18, 10, EYE)
    # gaping maw with jagged teeth
    rect(d, 14, 12, 18, 14, SOCK)
    for tx in (14, 16, 18):
        rect(d, tx, 12, tx, 12, FLESH_L)
    # hunched, emaciated torso
    d.polygon([(11,14),(21,14),(19,23),(13,23)], fill=FLESH)
    rect(d, 15, 15, 16, 22, FLESH_D)               # sternum shadow
    for ry in (16, 18, 20):                        # exposed ribs
        rect(d, 12, ry, 14, ry, FLESH_L)
        rect(d, 18, ry, 20, ry, FLESH_L)
    # tattered loincloth
    rect(d, 12, 22, 20, 25, RAG)
    d.polygon([(12,25),(14,25),(13,28)], fill=RAG)
    d.polygon([(17,25),(19,25),(18,28)], fill=RAG)
    # long bony arms hanging low, ending in claws
    d.line([11, 15, 8, 25], fill=FLESH, width=2)
    d.line([21, 15, 24, 25], fill=FLESH, width=2)
    for cx in (7, 8, 9):
        d.line([cx, 25, cx-1, 29], fill=BONE, width=1)
    for cx in (23, 24, 25):
        d.line([cx, 25, cx+1, 29], fill=BONE, width=1)
    # thin bent legs + feet
    d.line([14, 25, 13, 30], fill=FLESH, width=2)
    d.line([18, 25, 19, 30], fill=FLESH, width=2)
    rect(d, 11, 29, 14, 30, FLESH_D)
    rect(d, 18, 29, 21, 30, FLESH_D)

def draw_bone_spire(d):
    # the undead defensive tower (Bone Spire): a tall tapering column of
    # stacked bone on a stone footing, a skull crown with a spiked bone tip,
    # small barbs hugging the shaft, and a green soul-glow burning up its
    # core (its attack). Baked colors -> the tower def carries no tint.
    STF, STF_D = (120, 120, 126), (90, 90, 96)
    GLOW, GLOW_L = (118, 196, 108), (170, 245, 150)
    DARK = (22, 20, 18)
    # stone footing
    rect(d, 10, 26, 22, 31, STF)
    rect(d, 10, 26, 22, 27, STF_D)
    rect(d, 9, 30, 23, 31, STF_D)
    # tapering stacked-bone shaft (base wide -> crown narrow)
    for (x0, y0, x1, y1) in [(11,22,21,26), (12,18,20,22), (12,14,20,18), (13,10,19,14)]:
        rect(d, x0, y0, x1, y1, BONE)
        rect(d, x0, y0, x0, y1, BONE_L)     # left highlight
        rect(d, x1, y0, x1, y1, BONE_D)     # right shadow
        rect(d, x0, y1, x1, y1, BONE_D)     # stacking seam
    # small bone barbs hugging the shaft (jut up-and-out, not long arms)
    d.line([11, 22, 9, 20], fill=BONE, width=1)
    d.line([21, 22, 23, 20], fill=BONE, width=1)
    d.line([12, 18, 10, 16], fill=BONE, width=1)
    d.line([20, 18, 22, 16], fill=BONE, width=1)
    # green soul-glow burning up the core
    rect(d, 15, 19, 16, 25, GLOW)
    rect(d, 15, 21, 16, 23, GLOW_L)
    rect(d, 15, 15, 16, 17, GLOW)
    # skull at the crown
    d.ellipse([13, 6, 19, 13], fill=BONE, outline=BONE_D)
    rect(d, 14, 8, 15, 9, DARK); rect(d, 17, 8, 18, 9, DARK)
    rect(d, 15, 11, 16, 12, BONE_D)
    # spiked bone tip
    d.polygon([(14, 6), (18, 6), (16, 0)], fill=BONE_L)
    d.polygon([(15, 6), (17, 6), (16, 2)], fill=BONE)

def draw_graveyard(d):
    # the undead's Mass Grave (where the dead are raised): a fenced plot of
    # grave dirt with a few leaning headstones, and an open grave pit with a
    # green soul-glow that the risen claw up out of. Baked colors, no tint.
    DIRT, DIRT_D = (74, 68, 58), (52, 48, 40)
    ST, ST_D, ST_L = (150, 150, 156), (112, 112, 120), (182, 182, 188)
    IRON = (48, 50, 54)
    GLOW, GLOW_L = (96, 152, 92), (150, 240, 150)
    DARK = (16, 14, 18)
    # grave-dirt plot with a couple of low mounds
    rect(d, 2, 21, 29, 31, DIRT)
    rect(d, 2, 21, 29, 22, DIRT_D)
    d.ellipse([3, 25, 13, 31], fill=DIRT_D)
    d.ellipse([20, 26, 30, 31], fill=DIRT_D)
    # a low iron railing across the back
    rect(d, 2, 15, 3, 22, IRON)
    rect(d, 28, 15, 29, 22, IRON)
    rect(d, 2, 15, 29, 16, IRON)
    for fx in range(6, 28, 4):
        rect(d, fx, 16, fx, 21, IRON)
    # headstone 1 — a rounded stone, leaning slightly (left)
    rect(d, 5, 13, 10, 23, ST)
    d.ellipse([5, 11, 10, 15], fill=ST)
    rect(d, 5, 13, 5, 23, ST_L); rect(d, 10, 13, 10, 23, ST_D)
    d.line([7, 16, 8, 20], fill=ST_D, width=1)
    # headstone 2 — a stone cross, taller (right-back)
    rect(d, 21, 9, 24, 23, ST)
    rect(d, 19, 12, 26, 15, ST)
    rect(d, 21, 9, 21, 23, ST_L); rect(d, 24, 9, 24, 23, ST_D)
    # open grave pit, front-centre, with the raising glow
    rect(d, 11, 22, 20, 30, DARK)
    rect(d, 12, 23, 19, 24, DIRT_D)          # dug rim
    rect(d, 13, 25, 18, 29, GLOW)
    rect(d, 14, 26, 17, 29, GLOW_L)
    # a skull resting on the dirt
    d.ellipse([24, 25, 28, 29], fill=BONE)
    rect(d, 25, 26, 25, 27, DARK); rect(d, 27, 26, 27, 27, DARK)

def draw_corpse(d):
    # a fallen human lying where they died — the shared raise/bury resource.
    # Neutral grey-brown garb so it reads for any dead human (raider,
    # skirmisher, villager or soldier alike).
    GARB, GARB_D = (104, 92, 76), (78, 68, 56)
    # ground shadow / disturbed earth beneath the body
    d.ellipse([4, 19, 28, 29], fill=(40, 36, 30, 150))
    # legs, crumpled sideways
    rect(d, 6, 23, 13, 25, GARB_D)
    rect(d, 7, 25, 12, 26, (58, 50, 42))
    # torso lying prone
    rect(d, 12, 20, 22, 25, GARB)
    rect(d, 12, 24, 22, 25, GARB_D)
    # an arm flopped out above the head
    rect(d, 22, 18, 27, 19, SKIN)
    # head, tilted
    d.ellipse([22, 20, 27, 25], fill=SKIN)
    rect(d, 24, 22, 24, 22, (60, 46, 38))   # closed eye
    # a dropped weapon beside them
    d.line([8, 18, 14, 15], fill=(120, 120, 128), width=1)
    rect(d, 8, 18, 9, 19, WOOD_D)

def draw_troll(d):
    # a hulking ogre-troll: broad hunched body of sickly green hide, small
    # tusked head sunk into the shoulders, huge fists and a crude club.
    # Drawn big to fill the frame (it's scaled up further in-game).
    HIDE, HIDE_D, HIDE_L = (104, 132, 86), (78, 102, 64), (128, 156, 106)
    LOIN = (86, 64, 44)
    TUSK = (232, 228, 206)
    CLUB, CLUB_D = (112, 84, 54), (84, 62, 40)
    EYE = (150, 40, 34)
    # a crude club raised in the right fist (drawn first, behind the arm)
    rect(d, 25, 3, 29, 14, CLUB); rect(d, 25, 3, 29, 4, CLUB_D)
    rect(d, 26, 12, 28, 22, CLUB_D)
    # broad hunched torso
    rect(d, 9, 12, 23, 25, HIDE)
    rect(d, 9, 12, 10, 25, HIDE_L)
    rect(d, 22, 12, 23, 25, HIDE_D)
    rect(d, 12, 15, 20, 20, HIDE_D)      # belly shadow
    # small head sunk between the shoulders
    rect(d, 13, 6, 19, 12, HIDE)
    rect(d, 13, 6, 19, 7, HIDE_D)
    rect(d, 14, 9, 15, 10, EYE); rect(d, 17, 9, 18, 10, EYE)
    rect(d, 14, 11, 15, 12, TUSK); rect(d, 17, 11, 18, 12, TUSK)  # jutting tusks
    # huge arms
    rect(d, 5, 13, 9, 23, HIDE); rect(d, 5, 13, 6, 23, HIDE_L)
    rect(d, 23, 13, 27, 23, HIDE); rect(d, 26, 13, 27, 23, HIDE_D)
    rect(d, 4, 21, 9, 26, HIDE_D)        # left fist
    rect(d, 23, 21, 28, 26, HIDE_D)      # right fist (gripping the club)
    # loincloth + stumpy legs
    rect(d, 11, 24, 21, 28, LOIN)
    rect(d, 11, 27, 15, 31, HIDE_D)
    rect(d, 17, 27, 21, 31, HIDE_D)

def draw_hobgoblin(d):
    # Wiry goblinoid spear-thrower, snarling, spear cocked back to HURL —
    # the old one angled the spear down-forward so it read as if it were
    # stabbing the dirt, and was flat-shaded with no ground shadow.
    SKN, SKN_D, SKN_L = (140, 132, 78), (104, 98, 54), (168, 160, 102)
    RAG, RAG_D = (98, 78, 56), (72, 56, 40)
    SHAFT, TIP = (122, 96, 60), (178, 178, 186)
    EYE = (222, 72, 44)
    d.ellipse([10, 27, 22, 31], fill=(0, 0, 0, 70))          # ground shadow
    # spear drawn back over the shoulder, head angled UP and forward
    d.line([5, 21, 27, 6], fill=SHAFT, width=1)
    d.polygon([(28, 3), (24, 8), (29, 8)], fill=TIP)
    # bent legs
    rect(d, 12, 22, 14, 29, SKN_D); rect(d, 12, 22, 12, 29, SKN)
    rect(d, 17, 22, 19, 29, SKN_D); rect(d, 17, 22, 17, 29, SKN)
    rect(d, 11, 29, 15, 30, RAG_D); rect(d, 16, 29, 20, 30, RAG_D)   # feet
    # hunched ragged torso
    rect(d, 12, 12, 19, 23, RAG)
    rect(d, 12, 12, 13, 23, shade(RAG, 1.28))
    rect(d, 18, 12, 19, 23, RAG_D)
    for ry in (15, 19):
        rect(d, 12, ry, 19, ry, RAG_D)                       # rag ties
    # rear arm cocked back on the spear, lead arm thrown forward
    rect(d, 7, 17, 12, 19, SKN); rect(d, 7, 17, 12, 17, SKN_L)
    rect(d, 19, 13, 23, 15, SKN); rect(d, 19, 13, 23, 13, SKN_L)
    # big-eared snarling head
    d.ellipse([12, 4, 20, 12], fill=SKN)
    rect(d, 12, 4, 16, 5, SKN_L)                             # lit brow
    d.polygon([(12, 6), (7, 2), (12, 10)], fill=SKN)         # left ear
    d.polygon([(20, 6), (25, 2), (20, 10)], fill=SKN)        # right ear
    d.polygon([(12, 7), (9, 4), (12, 9)], fill=SKN_D)        # inner-ear shadow
    rect(d, 13, 7, 14, 8, EYE); rect(d, 17, 7, 18, 8, EYE)
    rect(d, 14, 10, 18, 11, SKN_D)                           # snarl
    for tx in (15, 17):
        rect(d, tx, 10, tx, 10, (232, 228, 206))             # teeth

def draw_bandit(d):
    # a scruffy hooded outlaw with a knife — the drilled-soldier silhouette
    # of a regular raider read wrong for camp skirmishers
    HOOD, HOOD_D = (98, 78, 60), (68, 52, 40)
    TUNIC = (122, 98, 70)
    SASH = (150, 60, 50)
    d.ellipse([10, 27, 22, 31], fill=(0, 0, 0, 70))
    rect(d, 13, 21, 15, 27, shade(TUNIC, 0.70))
    rect(d, 17, 21, 19, 27, shade(TUNIC, 0.70))
    rect(d, 12, 27, 15, 30, (58, 44, 32)); rect(d, 17, 27, 20, 30, (58, 44, 32))
    rect(d, 11, 12, 21, 22, TUNIC)
    rect(d, 11, 12, 12, 22, shade(TUNIC, 1.18))
    rect(d, 20, 12, 21, 22, shade(TUNIC, 0.74))
    d.line([12, 13, 20, 21], fill=SASH, width=2)             # bandolier
    rect(d, 8, 13, 10, 21, TUNIC); rect(d, 22, 13, 24, 21, TUNIC)
    # deep hood with the face in shadow, just eyes glinting
    d.ellipse([11, 3, 21, 13], fill=HOOD)
    d.polygon([(11, 9), (21, 9), (16, 1)], fill=HOOD)
    d.ellipse([13, 7, 19, 12], fill=HOOD_D)
    rect(d, 14, 9, 15, 10, (226, 204, 124)); rect(d, 17, 9, 18, 10, (226, 204, 124))
    rect(d, 24, 16, 25, 21, WOOD_D)                          # knife
    d.polygon([(24, 16), (26, 16), (25, 9)], fill=(198, 198, 206))

def draw_bandit_camp(d):
    # an outlaw camp: sharpened palisade stakes, a hide tent, a campfire and
    # a skull on a pike. Was a red-tinted wall GATE, of all things.
    draw_dirt(d)
    ground_shadow(d, 3, 29, 29, 2)
    for sx in range(2, 30, 5):                               # palisade
        rect(d, sx, 7, sx+2, 19, WOOD)
        rect(d, sx, 7, sx, 19, shade(WOOD, 1.22))
        d.polygon([(sx, 7), (sx+2, 7), (sx+1, 3)], fill=shade(WOOD, 1.1))
    d.polygon([(3, 29), (17, 29), (10, 13)], fill=(146, 126, 98))   # hide tent
    d.polygon([(10, 29), (17, 29), (10, 13)], fill=(112, 96, 74))
    rect(d, 9, 22, 11, 29, (56, 44, 34))                     # tent mouth
    rect(d, 18, 26, 26, 28, WOOD_D)                          # campfire logs
    d.polygon([(19, 26), (25, 26), (22, 19)], fill=(232, 142, 52))
    d.polygon([(20, 26), (24, 26), (22, 21)], fill=(250, 212, 92))
    rect(d, 28, 9, 29, 24, WOOD_D)                           # skull on a pike
    d.ellipse([26, 4, 31, 9], fill=BONE, outline=BONE_D)
    rect(d, 27, 6, 27, 7, BLACK); rect(d, 29, 6, 29, 7, BLACK)

def draw_broodmother(d):
    # a robed LICH: hooded dark robe, a bone skull face with cold soul-light
    # eyes, and a staff topped with a green flame. Front-facing, matching the
    # other standing units. (Frame name stays 'broodmother' so the sprite
    # lookup in the code is untouched.)
    ROBE   = (54, 52, 66)      # deathly charcoal-violet robe
    ROBE_D = (36, 34, 48)      # robe shadow
    ROBE_L = (72, 70, 86)      # robe highlight
    HOOD   = (40, 38, 52)
    EYE    = (150, 240, 150)   # cold necrotic soul-light
    STAFF  = (120, 96, 66)     # aged wood
    # staff down the left with a soul-flame orb on top
    rect(d, 5, 9, 6, 30, STAFF)
    d.ellipse([2, 2, 9, 9], fill=(38, 58, 36))          # orb aura
    d.ellipse([3, 3, 8, 8], fill=EYE)                    # glowing orb
    rect(d, 4, 4, 5, 5, (215, 255, 215))                 # hotspot
    # robe body: a bell widening to the ground
    d.polygon([(12,15),(21,15),(26,30),(8,30)], fill=ROBE)
    d.polygon([(15,16),(18,16),(20,30),(13,30)], fill=ROBE_D)   # centre fold shadow
    d.polygon([(12,15),(14,15),(10,30),(8,30)], fill=ROBE_L)    # left highlight fold
    # shoulders / hood drape
    d.polygon([(10,13),(23,13),(25,19),(8,19)], fill=HOOD)
    # hood around the head
    d.polygon([(11,4),(22,4),(24,15),(9,15)], fill=HOOD)
    # bone skull inside the hood
    d.ellipse([12,6,21,16], fill=BONE, outline=BONE_D)
    rect(d, 14, 14, 19, 16, BONE_D)                      # jaw shadow
    # eye sockets + soul-light
    rect(d, 13, 9, 15, 11, (18, 20, 18))
    rect(d, 18, 9, 20, 11, (18, 20, 18))
    rect(d, 14, 10, 14, 10, EYE)
    rect(d, 19, 10, 19, 10, EYE)
    # nasal cavity + teeth
    rect(d, 16, 11, 16, 12, (18, 20, 18))
    for tx in (14, 16, 18):
        rect(d, tx, 15, tx, 16, BONE_D)
    # a skeletal hand clasped at the robe front
    rect(d, 19, 20, 22, 22, BONE)
    for fx in (19, 20, 21, 22):
        rect(d, fx, 20, fx, 20, BONE_D)

def draw_forest_corrupted(d):
    # a forest tile the creep has spread into: creep ground underneath,
    # the trees themselves re-themed sick purple/black rather than erased —
    # the resource stays visible and harvestable, just visibly infected
    draw_creep(d)
    TRUNK_C = (46, 40, 34)          # dead grey-brown bark
    CANOPY_DARK = (48, 58, 42)      # withered grey-green
    CANOPY_LIGHT = (66, 78, 56)
    # same lit-side + ground-shadow treatment the healthy forest got, so the
    # blighted map doesn't look cruder than the living one
    for cx, cy in [(9,20),(21,19),(15,10)]:
        d.ellipse([cx-6, cy+6, cx+6, cy+10], fill=CREEP_BLACK_T)     # ground shadow
        rect(d, cx-1, cy+4, cx+1, cy+8, TRUNK_C)
        rect(d, cx-1, cy+4, cx-1, cy+8, shade(TRUNK_C, 1.35))        # lit bark edge
        d.polygon([(cx-7,cy+5),(cx+7,cy+5),(cx,cy-9)], fill=shade(CANOPY_DARK, 0.8))
        d.polygon([(cx-6,cy+4),(cx+5,cy+4),(cx,cy-7)], fill=CANOPY_DARK)
        d.polygon([(cx-5,cy+1),(cx+1,cy+1),(cx-1,cy-5)], fill=CANOPY_LIGHT)  # lit side
    for x,y in [(9,15),(21,13),(15,6)]:
        d.ellipse([x,y,x+2,y+2], fill=(150,190,120))  # sickly fungal blooms

def draw_stone_deposit_corrupted(d):
    # same idea for stone: creep ground, rocks re-tinted and veined with
    # creep growth instead of being wiped off the map
    draw_creep(d)
    ROCK_C   = (104, 104, 100)      # ashen grey rock
    ROCK_C_D = (76, 76, 74)
    d.ellipse([5, 22, 27, 29], fill=CREEP_BLACK_T)             # ground shadow
    for x, y, w, h in [(6,13,11,11),(14,16,13,12),(9,9,9,9)]:  # lit, like living rock
        d.ellipse([x, y, x+w, y+h], fill=ROCK_C_D, outline=(20,20,22))
        d.ellipse([x+1, y+1, x+w-3, y+h-4], fill=ROCK_C)
        d.ellipse([x+2, y+2, x+2+max(2, w//3), y+2+max(2, h//3)], fill=shade(ROCK_C, 1.3))
    d.line([8,18, 14,22, 20,19], fill=(120,160,110), width=1)  # sickly vein

def draw_zergling_quad(d):
    # a standing SKELETON, front-facing and bone-white so the runtime bone
    # tint keeps it pale. Bold shapes so it still reads at the small in-game
    # scale. (Frame name stays 'zergling_quad' — the code lookup is untouched.)
    SOCK = (28, 26, 24)
    # skull
    d.ellipse([10, 2, 21, 12], fill=BONE, outline=BONE_D)
    rect(d, 12, 11, 19, 13, BONE)          # jaw
    rect(d, 12, 5, 14, 8, SOCK)            # left socket
    rect(d, 17, 5, 19, 8, SOCK)            # right socket
    rect(d, 15, 8, 16, 10, SOCK)           # nasal
    for tx in (12, 14, 16, 18):            # teeth
        rect(d, tx, 12, tx, 13, SOCK)
    # spine
    rect(d, 15, 13, 16, 23, BONE_D)
    # ribcage — pairs of ribs off the spine
    for ry in (14, 16, 18):
        d.line([15, ry, 10, ry + 1], fill=BONE, width=1)
        d.line([16, ry, 21, ry + 1], fill=BONE, width=1)
    # collarbone + arms down the sides
    rect(d, 9, 13, 22, 14, BONE)
    d.line([9, 14, 8, 22], fill=BONE, width=2)
    d.line([22, 14, 23, 22], fill=BONE, width=2)
    rect(d, 7, 21, 9, 23, BONE)            # left hand
    rect(d, 22, 21, 24, 23, BONE)          # right hand
    # pelvis
    rect(d, 12, 22, 19, 24, BONE)
    rect(d, 15, 23, 16, 24, SOCK)
    # legs + feet
    d.line([13, 24, 12, 30], fill=BONE, width=2)
    d.line([18, 24, 19, 30], fill=BONE, width=2)
    rect(d, 10, 29, 13, 30, BONE)
    rect(d, 18, 29, 21, 30, BONE)

def draw_spitter_naga(d):
    # Naga/cobra/alien hybrid, front-facing to match the other "standing"
    # units (villager, archer) rather than the side-view/spider conventions
    # used elsewhere. Coiled serpent base instead of legs, a flared cobra
    # hood, and an elongated alien head with glowing eyes. Neutral tones so
    # the runtime green tint still applies the same way it always has.
    BODY_D = (42, 42, 48)
    HOOD   = (72, 72, 80)
    EYE    = (20, 220, 160)   # acid-green glow — ties to the spit theme
    SAC    = (60, 190, 120)   # the acid sac she "spits" from
    # coiled tail — overlapping tapered ellipses suggesting a coil
    d.ellipse([4, 22, 27, 31], fill=BODY_D)
    d.ellipse([8, 17, 23, 27], fill=DARKGREY)
    d.ellipse([12, 13, 19, 22], fill=BODY_D)
    # slender torso rising from the coil
    d.polygon([(13,20),(19,20),(18,10),(14,10)], fill=DARKGREY)
    # thin arms holding a small acid sac out front
    d.line([13,14, 9,18, 8,22], fill=DARKGREY, width=2)
    d.line([19,14, 23,18, 24,22], fill=DARKGREY, width=2)
    d.ellipse([6,20,11,25], fill=SAC, outline=BODY_D)
    # flared cobra hood behind/around the neck
    d.polygon([(7,13),(16,6),(25,13),(21,15),(16,11),(11,15)], fill=HOOD, outline=BODY_D)
    # elongated alien head
    d.ellipse([12,3,20,13], fill=DARKGREY, outline=BODY_D)
    d.ellipse([13,6,15,9], fill=EYE)
    d.ellipse([17,6,19,9], fill=EYE)

def draw_wildstone_deposit(d):
    # grass base like other resource tiles, with a small outcrop bearing a
    # cluster of glowing pink crystal shards — visually distinct from
    # both the forest (green canopy) and stone_deposit (grey boulders)
    draw_grass(d)
    CRYSTAL_D = (196, 84, 140)
    CRYSTAL   = (230, 128, 178)
    CRYSTAL_L = (255, 190, 220)
    GLOW      = (255, 220, 235)
    d.ellipse([7,20,25,29], fill=(90,86,84))  # small rock outcrop base
    for x,y,h,w in [(10,22,13,8),(15,24,10,5),(19,21,14,10),(23,25,9,13)]:
        d.polygon([(x-w//2,y),(x+w//2,y),(x,y-h)], fill=CRYSTAL_D)
    for x,y,h,w in [(10,20,10,5),(15,21,7,3),(19,18,11,6),(23,22,7,8)]:
        d.polygon([(x-w//2,y),(x+w//2,y),(x,y-h)], fill=CRYSTAL)
    for x,y in [(10,15),(15,14),(19,12),(23,15)]:
        d.ellipse([x-2,y-2,x+2,y+2], fill=GLOW)
        d.ellipse([x-1,y-1,x+1,y+1], fill=CRYSTAL_L)

def draw_icon_wildstone(d):
    CRYSTAL_D = (196, 84, 140)
    CRYSTAL   = (230, 128, 178)
    CRYSTAL_L = (255, 190, 220)
    d.polygon([(8,26),(24,26),(16,4)], fill=CRYSTAL_D)
    d.polygon([(11,26),(21,26),(16,9)], fill=CRYSTAL)
    d.polygon([(13,20),(19,20),(16,9)], fill=CRYSTAL_L)

def draw_wildstone_refinery(d):
    # built directly ON the deposit — smaller crystal shards still peek out
    # from beneath the rig, oil-pump style: a central pump over the vein,
    # piped out to a small collection tank
    draw_grass(d)
    CRYSTAL_D = (196, 84, 140)
    CRYSTAL   = (230, 128, 178)
    CRYSTAL_L = (255, 190, 220)
    GLOW      = (255, 220, 235)
    PIPE, PIPE_D, PIPE_L, TANK = (110,108,112), (74,72,76), (150,148,152), (96,100,108)
    d.ellipse([7,21,25,30], fill=(90,86,84))
    for x,y,h,w in [(10,23,9,6),(23,24,7,10)]:
        d.polygon([(x-w//2,y),(x+w//2,y),(x,y-h)], fill=CRYSTAL_D)
    for x,y in [(10,16),(23,18)]:
        d.ellipse([x-2,y-2,x+2,y+2], fill=GLOW)
        d.ellipse([x-1,y-1,x+1,y+1], fill=CRYSTAL_L)
    rect(d, 12, 17, 20, 24, TANK)
    rect(d, 12, 17, 20, 19, PIPE_L)
    d.ellipse([13,10,19,18], fill=PIPE)
    d.ellipse([14,11,18,15], fill=PIPE_L)
    d.line([20,20, 27,20, 27,26], fill=PIPE_D, width=3)
    rect(d, 24, 22, 29, 29, TANK)
    rect(d, 25, 23, 28, 24, PIPE_L)
    d.line([12,21, 6,21, 6,27], fill=PIPE_D, width=2)
    d.ellipse([4,25,8,29], fill=CRYSTAL, outline=PIPE_D)

def draw_wildstone_deposit_corrupted(d):
    # creep ground, crystal still visible but visibly infected — dimmer,
    # dirtier pink with a dark creep vein cutting through it, matching the
    # same "corrupted, not erased" language as forest_corrupted and
    # stone_deposit_corrupted
    draw_creep(d)
    CRYSTAL_D = (140, 68, 108)   # dirtier, darker than the clean deposit
    CRYSTAL   = (176, 96, 138)
    CRYSTAL_L = (210, 140, 172)
    VEIN      = (40, 18, 58)
    d.ellipse([7,20,25,29], fill=(70,60,66))
    for x,y,h,w in [(10,22,13,8),(15,24,10,5),(19,21,14,10),(23,25,9,13)]:
        d.polygon([(x-w//2,y),(x+w//2,y),(x,y-h)], fill=CRYSTAL_D)
    for x,y,h,w in [(10,20,10,5),(15,21,7,3),(19,18,11,6),(23,22,7,8)]:
        d.polygon([(x-w//2,y),(x+w//2,y),(x,y-h)], fill=CRYSTAL)
    for x,y in [(10,15),(15,14),(19,12),(23,15)]:
        d.ellipse([x-1,y-1,x+1,y+1], fill=CRYSTAL_L)
    d.line([9,24, 15,19, 21,23], fill=VEIN, width=1)

# ---- civic buildings ----
# These seven all used to be recoloured clones of house/warehouse/quarry/
# stone_deposit/wall_gate — three of them shared the SAME house sprite, so
# a tavern, a bakery and an apothecary were told apart only by tint. Each
# now gets a deliberately distinct SILHOUETTE (roofline, chimney, awning,
# hanging sign) so they're identifiable at a glance, not just by colour.

def draw_well(d):
    draw_dirt(d)
    ground_shadow(d, 7, 24, 27, 3)
    d.ellipse([8, 20, 23, 29], fill=STONE_D)          # stone rim
    d.ellipse([9, 19, 22, 27], fill=STONE)
    d.ellipse([12, 21, 19, 25], fill=(24, 30, 44))    # dark water
    rect(d, 9, 19, 22, 19, shade(STONE, 1.2))
    rect(d, 10, 6, 11, 20, WOOD_D); rect(d, 10, 6, 10, 20, WOOD)   # posts
    rect(d, 20, 6, 21, 20, WOOD_D)
    gable_roof(d, 7, 24, 8, 2, ROOF)
    rect(d, 11, 10, 20, 11, WOOD)                     # winch bar
    rect(d, 14, 12, 17, 15, WOOD_D)                   # bucket
    rect(d, 14, 12, 17, 12, WOOD)

def draw_tavern(d):
    draw_dirt(d)
    ground_shadow(d, 4, 27, 28, 3)
    shaded_box(d, 5, 15, 26, 29, TAN_D)
    gable_roof(d, 3, 28, 15, 5, (122, 72, 44))
    plank_door(d, 13, 21, 18, 29)
    lit_window(d, 7, 18, 10, 21); lit_window(d, 21, 18, 24, 21)
    rect(d, 26, 12, 31, 13, WOOD_D)                   # sign bracket
    rect(d, 29, 13, 30, 16, WOOD_D)
    shaded_box(d, 26, 16, 31, 21, (150, 96, 48))      # hanging sign
    rect(d, 28, 18, 29, 19, GOLD)                     # mug painted on it
    for bx in (1, 5):                                  # barrels out front
        rect(d, bx, 24, bx+3, 29, WOOD)
        rect(d, bx, 25, bx+3, 25, WOOD_D)
        rect(d, bx, 28, bx+3, 28, WOOD_D)

def draw_bakery(d):
    draw_dirt(d)
    ground_shadow(d, 4, 27, 28, 3)
    shaded_box(d, 5, 16, 26, 29, TAN)
    gable_roof(d, 3, 28, 16, 7, ROOF)
    stone_courses(d, 20, 2, 27, 16, (150, 96, 76))    # big brick chimney
    for sx, sy in [(22, 1), (25, -1)]:                # smoke
        d.ellipse([sx, sy, sx+4, sy+4], fill=(196, 196, 200, 140))
    rect(d, 8, 21, 14, 27, (58, 40, 28))              # oven mouth
    d.ellipse([9, 22, 13, 26], fill=(240, 150, 60))   # fire glow
    for bx in (16, 20):                               # loaves cooling
        d.ellipse([bx, 23, bx+3, 26], fill=(196, 150, 92))
        rect(d, bx+1, 23, bx+2, 23, (222, 184, 128))

def draw_apothecary(d):
    draw_dirt(d)
    ground_shadow(d, 4, 27, 28, 3)
    shaded_box(d, 5, 14, 26, 29, (206, 196, 168))
    gable_roof(d, 3, 28, 14, 5, (74, 110, 66))        # herb-green roof
    plank_door(d, 13, 22, 18, 29)
    lit_window(d, 7, 17, 10, 20)
    for hx in (7, 11, 21, 25):                        # herb bundles hung to dry
        rect(d, hx, 14, hx, 17, (92, 74, 44))
        d.polygon([(hx-2,17),(hx+2,17),(hx,21)], fill=(86, 140, 70))
    for bx, c in [(20,(120,190,120)), (23,(180,140,200))]:   # tinctures
        rect(d, bx, 23, bx+1, 27, c)
        rect(d, bx, 22, bx+1, 22, WOOD_D)

def draw_market(d):
    draw_dirt(d)
    ground_shadow(d, 2, 29, 28, 3)
    for px in (4, 15, 26):                            # stall posts
        rect(d, px, 12, px+1, 28, WOOD_D)
    for i, ax in enumerate(range(2, 30, 4)):          # striped awning
        rect(d, ax, 8, ax+3, 12, (196, 70, 60) if i % 2 == 0 else (232, 226, 208))
    rect(d, 2, 8, 29, 8, (226, 120, 104))
    rect(d, 2, 12, 29, 13, WOOD_D)
    rect(d, 5, 20, 14, 22, WOOD); rect(d, 17, 20, 27, 22, WOOD)   # tables
    for gx, c in [(6,(200,80,60)),(9,(230,190,70)),(12,(120,170,90)),
                  (19,(190,140,90)),(23,(200,80,60))]:            # produce
        d.ellipse([gx, 17, gx+2, 20], fill=c)

def draw_mason(d):
    draw_dirt(d)
    ground_shadow(d, 3, 28, 28, 3)
    stone_courses(d, 6, 8, 12, 29, STONE)             # half-carved column
    d.ellipse([5, 4, 13, 10], fill=STONE)
    rect(d, 5, 4, 13, 5, shade(STONE, 1.2))
    shaded_box(d, 16, 20, 23, 25, STONE)              # squared blocks
    shaded_box(d, 24, 22, 30, 27, STONE_D)
    shaded_box(d, 17, 26, 24, 30, STONE_D)
    rect(d, 15, 15, 29, 17, WOOD)                     # workbench
    rect(d, 15, 17, 29, 17, WOOD_D)
    rect(d, 19, 11, 20, 15, WOOD_D)                   # chisel
    shaded_box(d, 24, 11, 27, 15, WOOD)               # mallet

def draw_barracks(d):
    draw_dirt(d)
    ground_shadow(d, 3, 28, 28, 3)
    shaded_box(d, 4, 14, 27, 29, WOOD_D)
    gable_roof(d, 2, 29, 14, 6, (96, 70, 46))
    plank_door(d, 13, 21, 18, 29)
    for sx in (6, 9, 22, 25):                         # spear rack
        rect(d, sx, 16, sx, 27, WOOD)
        d.polygon([(sx-1,16),(sx+1,16),(sx,12)], fill=STONE)
    rect(d, 15, 5, 16, 14, WOOD_D)                    # banner pole
    d.polygon([(16,5),(25,7),(16,12)], fill=(160, 44, 40))

DRAWERS = [
    ("grass", draw_grass),
    ("forest", draw_forest),
    ("stone_deposit", draw_stone_deposit),
    ("water", draw_water),
    ("dirt", draw_dirt),
    ("town_hall", draw_town_hall),
    ("house", draw_house),
    ("farm", draw_farm),
    ("lumber_camp", draw_lumber_camp),
    ("quarry", draw_quarry),
    ("wall", draw_wall),
    ("wall_gate", draw_wall_gate),
    ("tower", draw_tower),
    ("archer", draw_archer),
    ("villager", draw_villager),
    ("enemy_raider", draw_enemy_raider),
    ("enemy_swordsman", draw_enemy_swordsman),
    ("arrow", draw_arrow),
    ("icon_food", draw_icon_food),
    ("icon_wood", draw_icon_wood),
    ("icon_stone", draw_icon_stone),
    ("icon_population", draw_icon_population),
    ("select", draw_select),
    ("blocked", draw_blocked),
    ("wall_v", draw_wall_v),
    ("enemy_ram", draw_enemy_ram),
    ("granary", draw_granary),
    ("warehouse", draw_warehouse),
    ("wall_corner", draw_wall_corner),
    ("minotaur", draw_minotaur),
    ("repairman", draw_repairman),
    ("mill", draw_mill),
    ("rally_flag", draw_rally_flag),
    ("granary_2", draw_granary_2),
    ("granary_3", draw_granary_3),
    ("warehouse_2", draw_warehouse_2),
    ("warehouse_3", draw_warehouse_3),
    ("town_hall_2", draw_town_hall_2),
    ("town_hall_3", draw_town_hall_3),
    ("creep", draw_creep),
    ("broodmother", draw_broodmother),
    ("forest_corrupted", draw_forest_corrupted),
    ("stone_deposit_corrupted", draw_stone_deposit_corrupted),
    ("zergling_quad", draw_zergling_quad),
    ("spitter_naga", draw_spitter_naga),
    ("wildstone_deposit", draw_wildstone_deposit),
    ("icon_wildstone", draw_icon_wildstone),
    ("wildstone_refinery", draw_wildstone_refinery),
    ("wildstone_deposit_corrupted", draw_wildstone_deposit_corrupted),
    ("creep_hand", draw_creep_hand),
    ("headstone", draw_headstone),
    ("crypt", draw_crypt),
    ("ghoul", draw_ghoul),
    ("bone_spire", draw_bone_spire),
    ("graveyard", draw_graveyard),
    ("corpse", draw_corpse),
    ("troll", draw_troll),
    ("hobgoblin", draw_hobgoblin),
    ("well", draw_well),
    ("tavern", draw_tavern),
    ("bakery", draw_bakery),
    ("apothecary", draw_apothecary),
    ("market", draw_market),
    ("mason", draw_mason),
    ("barracks", draw_barracks),
    ("caravan", draw_caravan),
    ("bandit", draw_bandit),
    ("bandit_camp", draw_bandit_camp),
]

sheet = Image.new("RGBA", (TILE*COLS, TILE*ROWS), (0,0,0,0))
atlas = {"frames": {}, "meta": {"size": {"w": TILE*COLS, "h": TILE*ROWS}}}

for i, (name, fn) in enumerate(DRAWERS):
    col = i % COLS
    row = i // COLS
    canvas = new_canvas()
    d = ImageDraw.Draw(canvas)
    fn(d)
    sheet.paste(canvas, (col*TILE, row*TILE), canvas)
    atlas["frames"][name] = {
        "frame": {"x": col*TILE, "y": row*TILE, "w": TILE, "h": TILE},
        "sourceSize": {"w": TILE, "h": TILE},
        "spriteSourceSize": {"x": 0, "y": 0, "w": TILE, "h": TILE}
    }

out_dir = "/tmp/gamebuild"
os.makedirs(out_dir, exist_ok=True)
sheet.save(f"{out_dir}/spritesheet.png")

with open(f"{out_dir}/atlas.json", "w") as f:
    json.dump(atlas, f)

with open(f"{out_dir}/spritesheet.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

with open(f"{out_dir}/spritesheet_b64.txt", "w") as f:
    f.write(b64)

print("Frames:", len(DRAWERS))
print("Sheet size:", sheet.size)
print("Base64 length:", len(b64))
