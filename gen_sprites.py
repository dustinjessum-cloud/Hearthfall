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
ROWS = 17  # 6x17 = 102 slots (grew from 6x15 for the Grove roster)
           # headroom on purpose so the rest of the tribe needs no regrow)

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

def draw_sealed_pass(d):
    # The cliff rock that plugs both mountain passes — and by a wide margin
    # the most-repeated tile in the game: two bands ten wide by thirty-two
    # tall, ~640 copies sitting edge to edge with each other.
    #
    # So everything here is deliberately small, low-contrast and
    # NON-DIRECTIONAL. The grass-blade pass and the blight-crack pass both
    # proved the same lesson the hard way: at this density any bold mark, any
    # long line, any feature that shares an axis with its neighbours stops
    # reading as texture and starts reading as wallpaper. Facets are lit on
    # top and shadowed underneath so the surface still has form, but none of
    # them is big enough to become a recognisable motif.
    # Value range kept DELIBERATELY narrow. The first attempt spread these
    # over ~80 levels and the band read as woven fabric: at 640 repeats the
    # eye locks onto any facet it can actually distinguish. Compressing the
    # range is what turns a repeating motif into plain rock.
    ROCK    = (74, 79, 90)
    ROCK_D  = (66, 71, 81)
    ROCK_XD = (57, 61, 71)
    ROCK_L  = (84, 89, 100)
    ROCK_XL = (95, 100, 111)
    rect(d, 0, 0, 31, 31, ROCK)

    # blocky facets, positions drawn from the deterministic LCG so they never
    # line up on an axis the way hand-placed marks do
    g = _prng(9301)
    for _ in range(14):
        x = next(g) % 29
        y = next(g) % 29
        w = 2 + next(g) % 3
        h = 2 + next(g) % 3
        base = ROCK_D if (next(g) & 1) else ROCK_L
        x2, y2 = min(31, x+w), min(31, y+h)
        rect(d, x, y, x2, y2, base)
        rect(d, x, y, x2, y, shade(base, 1.09))    # lit top edge
        rect(d, x, y2, x2, y2, shade(base, 0.88))  # shadowed underside

    # fine grain over the top, several passes so no single speckle pattern
    # dominates
    # heavier fine grain than facets: noise is what the eye reads as stone,
    # and it masks whatever structure the facets leave behind
    scatter(d, 9311, 150, ROCK_XD)
    scatter(d, 9323, 140, ROCK_XL)
    scatter(d, 9337, 70, ROCK_D, 2)
    scatter(d, 9349, 60, ROCK_L, 2)

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
    # Slate-blue overalls, leather apron, hammer, gold hard hat. The BODY
    # already came from the rewritten humanoid() — shaded, booted, with a
    # face and a ground shadow — but the kit on top of it was four flat
    # rectangles with no lighting at all, so the one thing that identifies
    # him as a tradesman was the least finished part of the sprite.
    APRON, APRON_D, APRON_L = (150, 110, 60), (114, 82, 43), (176, 134, 80)
    HAFT, HAFT_L = WOOD_D, shade(WOOD_D, 1.3)
    HEAD_I, HEAD_L = (96, 100, 108), (150, 155, 164)
    HAT_D, HAT_L = shade(GOLD, 0.74), shade(GOLD, 1.2)
    STRAP = (92, 66, 38)

    humanoid(d, (90, 110, 150))

    # leather apron, hung from a neck strap, lit left and creased at the hem
    # A BIB, not a shoulder strap. The strap ran from y5, and humanoid()
    # puts the head ellipse at y3-12 — so it painted a brown smear straight
    # down his cheek.
    rect(d, 14, 12, 17, 13, APRON)             # bib, narrower than the skirt
    rect(d, 14, 12, 14, 13, APRON_L)
    rect(d, 13, 13, 19, 21, APRON)
    rect(d, 13, 13, 13, 21, APRON_L)           # lit edge
    rect(d, 19, 13, 19, 21, APRON_D)           # shadowed edge
    rect(d, 13, 21, 19, 21, APRON_D)           # hem
    rect(d, 15, 17, 17, 18, APRON_D)           # pocket

    # hammer: bound haft, iron head with a lit top face
    rect(d, 22, 9, 23, 20, HAFT)
    rect(d, 22, 9, 22, 20, HAFT_L)
    for wy in (13, 15):
        rect(d, 22, wy, 23, wy, STRAP)         # binding at the grip
    rect(d, 20, 6, 26, 9, HEAD_I)
    rect(d, 20, 6, 26, 6, HEAD_L)              # struck face catches the light
    rect(d, 20, 9, 26, 9, shade(HEAD_I, 0.72))
    rect(d, 25, 6, 26, 9, shade(HEAD_I, 0.8))

    # hard hat with a brim, so it reads as a hat rather than a gold bar
    rect(d, 12, 4, 19, 6, GOLD)
    rect(d, 12, 4, 19, 4, HAT_L)               # crown highlight
    rect(d, 11, 6, 20, 7, HAT_D)               # brim, wider than the crown

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
    # A hulking ogre-troll. The old one was a flat green cutout: solid slabs
    # of hide with no ground shadow (so it floated), a club that was a plain
    # brown bar, and eyes painted onto a smooth face. It renders at 1.35x
    # in-game — more pixels on screen than anything else in a wave — so it
    # can carry real detail: warty mottled hide, a brow ridge that actually
    # shadows the eyes, an underbite with tusks that jut from the LOWER jaw,
    # knuckles on the fists, and iron studs hammered into the club.
    HIDE, HIDE_D, HIDE_L = (104, 132, 86), (78, 102, 64), (128, 156, 106)
    HIDE_XD = (58, 78, 48)               # deepest creases
    WART = (88, 112, 70)
    LOIN, LOIN_D = (86, 64, 44), (62, 46, 32)
    ROPE = (140, 118, 80)
    TUSK, TUSK_D = (238, 234, 214), (190, 184, 160)
    CLUB, CLUB_D, CLUB_L = (112, 84, 54), (84, 62, 40), (140, 110, 74)
    IRON, IRON_L = (96, 100, 108), (152, 156, 164)
    EYE, EYE_L = (150, 40, 34), (214, 88, 66)
    SCAR = (152, 172, 130)

    ground_shadow(d, 4, 28, 28, 4)       # it used to float

    # Crude studded club, raised in the right fist. Kept NARROW and clear of
    # the body — a wide one merges with the shoulder into a single brown
    # slab that reads as a door, and swallows the right arm with it.
    rect(d, 26, 2, 30, 12, CLUB)         # head, tapering to the grip
    rect(d, 27, 12, 30, 14, CLUB)
    rect(d, 26, 2, 30, 2, CLUB_L)        # lit top
    rect(d, 26, 2, 26, 12, CLUB_L)       # lit left
    rect(d, 30, 2, 30, 14, CLUB_D)
    for sx, sy in ((27, 4), (29, 7), (27, 10)):
        rect(d, sx, sy, sx+1, sy+1, IRON)
        rect(d, sx, sy, sx, sy, IRON_L)  # each stud catches the light
    rect(d, 28, 14, 29, 23, CLUB_D)      # shaft, mostly hidden behind the arm
    rect(d, 28, 14, 28, 23, CLUB)
    for ry in (16, 18):
        rect(d, 28, ry, 30, ry, ROPE)    # cord wrapped round the grip

    # broad hunched torso: slab chest catching the light over a shadowed gut
    rect(d, 9, 12, 23, 25, HIDE)
    rect(d, 9, 12, 10, 25, HIDE_L)
    rect(d, 22, 12, 23, 25, HIDE_D)
    rect(d, 10, 12, 22, 12, HIDE_L)      # lit shoulder ridge
    rect(d, 11, 14, 20, 16, HIDE_L)
    rect(d, 15, 14, 15, 17, HIDE_D)      # split between the pectorals
    rect(d, 12, 19, 21, 23, HIDE_D)      # gut in shadow
    rect(d, 13, 23, 20, 23, HIDE_XD)
    for i in range(3):
        rect(d, 17+i, 15+i, 17+i, 15+i, SCAR)   # old scar raked over the ribs

    # huge arms, creased at the elbow
    rect(d, 4, 13, 9, 23, HIDE)
    rect(d, 4, 13, 5, 23, HIDE_L)
    rect(d, 9, 13, 9, 23, HIDE_D)
    rect(d, 4, 18, 9, 18, HIDE_D)
    rect(d, 23, 13, 27, 23, HIDE)
    rect(d, 26, 13, 27, 23, HIDE_D)
    rect(d, 23, 18, 27, 18, HIDE_D)
    # warts stippled over hide and arms
    for wx, wy in ((11, 21), (19, 20), (13, 24), (6, 15), (7, 20), (25, 16), (24, 21)):
        rect(d, wx, wy, wx, wy, WART)

    # fists — knuckles picked out so they read as gripping, not as mittens
    rect(d, 3, 21, 9, 27, HIDE_D)
    rect(d, 3, 21, 9, 21, HIDE)
    rect(d, 22, 21, 28, 27, HIDE_D)
    rect(d, 22, 21, 28, 21, HIDE)
    for kx in (4, 6, 8):
        rect(d, kx, 23, kx, 24, HIDE)
    for kx in (23, 25, 27):
        rect(d, kx, 23, kx, 24, HIDE)

    # loincloth slung on a rope belt
    rect(d, 10, 24, 22, 25, ROPE)
    rect(d, 11, 25, 21, 28, LOIN)
    rect(d, 11, 25, 11, 28, shade(LOIN, 1.28))
    rect(d, 21, 25, 21, 28, LOIN_D)
    rect(d, 15, 26, 17, 28, LOIN_D)      # fold
    # stumpy legs with splayed toes
    rect(d, 11, 28, 15, 31, HIDE_D)
    rect(d, 11, 28, 11, 31, HIDE)
    rect(d, 17, 28, 21, 31, HIDE_D)
    rect(d, 17, 28, 17, 31, HIDE)
    for tx in (12, 14, 18, 20):
        rect(d, tx, 31, tx, 31, HIDE_XD)

    # small head sunk between the shoulders, heavy brow over sunken eyes
    d.polygon([(11, 7), (7, 4), (11, 11)], fill=HIDE)     # ears
    d.polygon([(21, 7), (25, 4), (21, 11)], fill=HIDE_D)
    rect(d, 12, 5, 20, 12, HIDE)
    rect(d, 12, 5, 20, 5, HIDE_L)        # lit crown
    rect(d, 20, 5, 20, 12, HIDE_D)
    rect(d, 12, 7, 20, 8, HIDE_XD)       # brow ridge, throwing the eyes into shade
    rect(d, 13, 9, 14, 10, EYE); rect(d, 18, 9, 19, 10, EYE)
    rect(d, 13, 9, 13, 9, EYE_L); rect(d, 18, 9, 18, 9, EYE_L)
    rect(d, 16, 9, 17, 10, HIDE_D)       # flat snout
    rect(d, 16, 9, 16, 9, HIDE_XD); rect(d, 17, 9, 17, 9, HIDE_XD)
    # jaw shoved forward in an underbite, tusks growing UP out of it
    rect(d, 13, 11, 19, 12, HIDE_D)
    rect(d, 13, 12, 19, 12, HIDE_XD)
    rect(d, 13, 11, 14, 12, TUSK); rect(d, 13, 10, 13, 10, TUSK)
    rect(d, 18, 11, 19, 12, TUSK); rect(d, 19, 10, 19, 10, TUSK)
    rect(d, 14, 12, 14, 12, TUSK_D); rect(d, 18, 12, 18, 12, TUSK_D)

def draw_hobgoblin(d):
    # Wiry goblinoid spear-thrower. The last pass fixed the POSE (spear
    # cocked back to hurl, rather than angled down as if stabbing dirt) but
    # left the body plain: bare limbs, a smooth rag tunic, a spear that was
    # one drawn line, and a single spear for a unit whose whole job is
    # throwing them. Now it reads as a raider who throws for a living — a
    # bundle of spare javelins strapped across its back, cord lashing the
    # spearhead on, hide wraps on the throwing arm and shins, warpaint, and
    # a string of teeth at its throat.
    SKN, SKN_D, SKN_L = (140, 132, 78), (104, 98, 54), (168, 160, 102)
    SKN_XD = (74, 70, 38)
    RAG, RAG_D = (98, 78, 56), (72, 56, 40)
    RAG_L = shade(RAG, 1.28)
    WRAP, WRAP_D = (132, 106, 74), (94, 74, 52)
    SHAFT, SHAFT_D = (122, 96, 60), (92, 72, 44)
    TIP, TIP_L = (178, 178, 186), (224, 224, 232)
    CORD = (206, 194, 148)
    BONE = (232, 228, 206)
    EYE, PUPIL = (222, 72, 44), (54, 18, 10)
    PAINT = (170, 54, 40)

    d.ellipse([10, 27, 22, 31], fill=(0, 0, 0, 70))          # ground shadow

    # spare javelins bundled across its back — drawn first so the torso and
    # head cover them where they pass behind
    for ox in (0, 2):
        d.line([3 + ox, 24, 9 + ox, 4], fill=SHAFT, width=1)
        rect(d, 9 + ox, 3, 9 + ox, 4, TIP)                   # tips over the shoulder
        rect(d, 3 + ox, 24, 3 + ox, 25, SHAFT_D)             # butt ends below the hip

    # main spear: shaft, cord-lashed head, iron tip
    d.line([5, 21, 27, 6], fill=SHAFT, width=1)
    d.line([5, 22, 26, 7], fill=SHAFT_D, width=1)            # shaded underside
    d.polygon([(28, 3), (24, 8), (29, 8)], fill=TIP)
    d.line([28, 3, 25, 7], fill=TIP_L)                       # lit edge of the blade
    for cx, cy in ((22, 9), (23, 9)):
        rect(d, cx, cy, cx, cy+1, CORD)                      # lashing binding it on

    # bent legs, bound with hide strips below the knee
    rect(d, 12, 22, 14, 29, SKN_D); rect(d, 12, 22, 12, 29, SKN)
    rect(d, 17, 22, 19, 29, SKN_D); rect(d, 17, 22, 17, 29, SKN)
    for ly in (25, 27):
        rect(d, 12, ly, 14, ly, WRAP_D)
        rect(d, 17, ly, 19, ly, WRAP_D)
    rect(d, 11, 29, 15, 30, RAG_D); rect(d, 16, 29, 20, 30, RAG_D)   # feet

    # hunched ragged torso
    rect(d, 12, 12, 19, 23, RAG)
    rect(d, 12, 12, 13, 23, RAG_L)
    rect(d, 18, 12, 19, 23, RAG_D)
    for ry in (15, 19):
        rect(d, 12, ry, 19, ry, RAG_D)                       # rag ties
    rect(d, 13, 22, 13, 23, SKN_XD)                          # hem torn into points
    rect(d, 16, 22, 16, 23, SKN_XD)
    # strap holding the javelin bundle on, cutting across the chest
    d.line([12, 18, 19, 13], fill=WRAP, width=1)
    # string of teeth at the throat
    rect(d, 13, 12, 18, 12, SKN_XD)
    for bx in (14, 16, 18):
        rect(d, bx, 13, bx, 13, BONE)

    # rear arm hauling the spear back, lead arm flung forward for balance
    rect(d, 6, 17, 12, 19, SKN); rect(d, 6, 17, 12, 17, SKN_L)
    rect(d, 8, 17, 9, 19, WRAP)                              # wrap on the throwing arm
    rect(d, 8, 17, 9, 17, shade(WRAP, 1.22))
    rect(d, 5, 18, 6, 20, SKN_D)                             # fist round the shaft
    rect(d, 5, 20, 5, 20, SKN_XD)
    rect(d, 19, 13, 23, 15, SKN); rect(d, 19, 13, 23, 13, SKN_L)
    rect(d, 21, 13, 22, 15, WRAP)
    rect(d, 23, 14, 23, 15, SKN_D)                           # splayed fingers

    # big-eared snarling head
    d.ellipse([12, 4, 20, 12], fill=SKN)
    rect(d, 12, 4, 16, 5, SKN_L)                             # lit brow
    d.polygon([(12, 6), (7, 2), (12, 10)], fill=SKN)         # left ear
    d.polygon([(20, 6), (25, 2), (20, 10)], fill=SKN)        # right ear
    d.polygon([(12, 7), (9, 4), (12, 9)], fill=SKN_D)        # inner-ear shadow
    d.polygon([(20, 7), (23, 4), (20, 9)], fill=SKN_D)
    rect(d, 23, 3, 23, 4, BONE)                              # bone ring through the ear
    rect(d, 13, 6, 19, 6, SKN_XD)                            # brow shadow
    rect(d, 13, 7, 14, 8, EYE); rect(d, 17, 7, 18, 8, EYE)
    rect(d, 13, 8, 13, 8, PUPIL); rect(d, 17, 8, 17, 8, PUPIL)
    rect(d, 14, 10, 18, 11, SKN_D)                           # snarl
    for tx in (15, 17):
        rect(d, tx, 10, tx, 10, BONE)                        # teeth
    rect(d, 12, 9, 12, 9, PAINT); rect(d, 19, 9, 19, 9, PAINT)   # warpaint daubed on the cheeks

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

# ---- the Tribe -------------------------------------------------------
# Deliberately NOT medieval. Where the human set is squared masonry, tidy
# gables and plank doors, everything here is lashed poles, stretched hide and
# bone. Nothing is straight and nothing is symmetrical — that contrast is the
# whole read at a glance on a shared map.
HIDE_T, HIDE_TD, HIDE_TL = (166, 132, 92), (126, 98, 66), (196, 164, 120)
POLE_T, POLE_TD = (104, 78, 50), (74, 54, 34)
TUSK_T = (232, 226, 202)
WARPAINT = (168, 52, 40)


def draw_tribe_hunt(d):
    # Hunting Camp: a drying rack hung with meat and hides beside a fire pit.
    # It was reusing the Hide Hut sprite, so food and housing looked identical.
    MEAT, MEAT_D = (146, 74, 62), (110, 52, 44)
    FIRE, FIRE_C = (232, 146, 48), (255, 226, 170)
    draw_grass(d)
    ground_shadow(d, 3, 29, 29, 3)
    rect(d, 5, 8, 6, 26, POLE_T);  rect(d, 5, 8, 5, 26, shade(POLE_T, 1.25))
    rect(d, 24, 8, 25, 26, POLE_T); rect(d, 25, 8, 25, 26, POLE_TD)
    d.polygon([(4, 8), (6, 5), (7, 8)], fill=POLE_TD)
    d.polygon([(23, 8), (25, 5), (26, 8)], fill=POLE_TD)
    rect(d, 4, 8, 26, 9, POLE_TD)
    for hx in (8, 12, 20):
        rect(d, hx, 10, hx+1, 17, MEAT); rect(d, hx, 10, hx, 17, shade(MEAT, 1.25))
        rect(d, hx, 17, hx+1, 17, MEAT_D)
    rect(d, 15, 10, 18, 18, HIDE_T); rect(d, 15, 10, 15, 18, HIDE_TL)
    rect(d, 15, 18, 18, 18, HIDE_TD)
    d.ellipse([11, 22, 21, 28], fill=(62, 54, 44))
    for sx, sy in ((10,24),(13,22),(18,22),(21,24),(12,27),(19,27)):
        rect(d, sx, sy, sx+1, sy+1, (108, 104, 98))
    d.polygon([(14, 27), (16, 22), (18, 27)], fill=FIRE)
    d.polygon([(15, 27), (16, 24), (17, 27)], fill=FIRE_C)

def draw_tribe_timber(d):
    # Timber Fell: felled trunks and a stump with an axe in it. The human
    # lumber camp is a tidy sawhouse; this is a work site.
    BARK, BARK_D = (98, 74, 46), (70, 52, 32)
    RING, RING_L = (168, 132, 84), (198, 166, 116)
    AXE, AXE_L = (108, 104, 98), (156, 152, 146)
    draw_grass(d)
    ground_shadow(d, 2, 30, 28, 4)
    for lx, ly in [(3,20),(11,20),(19,20),(7,13),(15,13)]:
        d.ellipse([lx, ly, lx+7, ly+7], fill=BARK)
        d.ellipse([lx+1, ly+1, lx+6, ly+6], fill=RING)
        d.ellipse([lx+3, ly+3, lx+4, ly+4], fill=RING_L)
    d.ellipse([21, 6, 29, 13], fill=BARK)
    d.ellipse([22, 7, 28, 12], fill=RING)
    d.line([20, 2, 25, 8], fill=POLE_T, width=1)
    d.polygon([(18, 1), (22, 4), (19, 5)], fill=AXE)
    d.line([18, 1, 19, 5], fill=AXE_L)
    scatter(d, 7717, 12, (128, 104, 68))

def draw_tribe_pit(d):
    # Stone Pit: an open dig with terraced steps and a spoil heap. Reads as a
    # HOLE, where the human quarry reads as a building.
    ROCK, ROCK_D, ROCK_L = (120, 116, 110), (86, 83, 78), (156, 152, 146)
    EARTH, EARTH_D = (112, 92, 68), (82, 66, 48)
    draw_grass(d)
    ground_shadow(d, 2, 30, 29, 3)
    d.ellipse([3, 12, 27, 29], fill=EARTH_D)
    d.ellipse([5, 14, 25, 27], fill=EARTH)
    for sx, sy, sw in [(7,22,12),(9,19,8),(11,16,5)]:
        rect(d, sx, sy, sx+sw, sy+1, shade(EARTH, 0.86))
    for rx, ry, rw in ((9,23,5),(16,22,6),(13,19,4)):
        d.ellipse([rx, ry, rx+rw, ry+rw-1], fill=ROCK)
        d.ellipse([rx, ry, rx+rw-2, ry+rw-3], fill=ROCK_L)
    d.ellipse([20, 8, 30, 15], fill=ROCK_D)
    d.ellipse([21, 8, 28, 13], fill=ROCK)
    d.line([4, 4, 9, 13], fill=POLE_T, width=1)
    d.polygon([(2, 3), (7, 3), (4, 6)], fill=(96, 92, 88))

def draw_tribe_cache(d):
    # Cache: baskets on a raised platform, lifted off the ground so it reads
    # as a store rather than a dwelling.
    BASK, BASK_D, BASK_L = (176, 142, 88), (134, 106, 62), (204, 174, 118)
    draw_grass(d)
    ground_shadow(d, 4, 28, 29, 3)
    for lx in (7, 22):
        rect(d, lx, 20, lx+2, 28, POLE_T); rect(d, lx, 20, lx, 28, shade(POLE_T,1.25))
    rect(d, 4, 17, 27, 20, POLE_TD)
    rect(d, 4, 17, 27, 17, POLE_T)
    for bx, by, bw in ((6,9,7),(14,10,7),(21,8,7)):
        d.ellipse([bx, by, bx+bw, by+8], fill=BASK)
        d.ellipse([bx, by, bx+bw, by+3], fill=BASK_L)
        for wy in range(by+3, by+8, 2):
            rect(d, bx, wy, bx+bw, wy, BASK_D)
    d.ellipse([12, 20, 20, 26], fill=HIDE_T)
    rect(d, 12, 22, 20, 22, POLE_TD)

def draw_tribe_stock(d):
    # Stockpile: logs and rough blocks under a pegged hide sheet.
    ROCK, ROCK_L = (120, 116, 110), (152, 148, 142)
    BARK, RING = (98, 74, 46), (168, 132, 84)
    draw_grass(d)
    ground_shadow(d, 2, 30, 29, 3)
    for bx, by in ((3,17),(9,17),(3,22),(9,22),(6,12)):
        rect(d, bx, by, bx+5, by+4, ROCK)
        rect(d, bx, by, bx+5, by, ROCK_L)
        rect(d, bx+5, by, bx+5, by+4, shade(ROCK,0.75))
    for lx, ly in ((17,18),(24,18),(20,12)):
        d.ellipse([lx, ly, lx+6, ly+6], fill=BARK)
        d.ellipse([lx+1, ly+1, lx+5, ly+5], fill=RING)
    d.polygon([(2, 12), (16, 6), (30, 12), (30, 14), (2, 14)], fill=HIDE_TD)
    d.polygon([(3, 12), (16, 7), (29, 12)], fill=HIDE_T)
    for px in (4, 15, 28):
        rect(d, px, 13, px, 15, POLE_TD)

def draw_tribe_gate(d):
    # Stake Gate: the palisade with a gap, framed by heavy posts and a lintel,
    # with a hide flap across the opening and a skull nailed above it.
    LOG, LOG_D, LOG_L = (122, 92, 58), (92, 68, 42), (152, 118, 78)
    ROPE = (168, 146, 104)
    draw_grass(d)
    ground_shadow(d, 1, 30, 28, 4)
    for x0 in (1, 24):
        for i in range(2):
            x = x0 + i*4
            rect(d, x, 8, x+2, 29, LOG); rect(d, x, 8, x, 29, LOG_L)
            rect(d, x+2, 8, x+2, 29, LOG_D)
            d.polygon([(x, 8), (x+1, 5), (x+2, 8)], fill=LOG_L)
    rect(d, 9, 4, 12, 29, LOG_D); rect(d, 9, 4, 9, 29, LOG)
    rect(d, 20, 4, 23, 29, LOG_D); rect(d, 23, 4, 23, 29, shade(LOG,0.8))
    rect(d, 9, 4, 23, 7, LOG); rect(d, 9, 4, 23, 4, LOG_L)
    rect(d, 13, 8, 19, 26, HIDE_TD)
    rect(d, 13, 8, 14, 26, HIDE_T)
    for ry in (12, 19):
        rect(d, 13, ry, 19, ry, ROPE)
    d.ellipse([14, 0, 19, 4], fill=TUSK_T)
    rect(d, 15, 2, 15, 3, (40,34,28)); rect(d, 18, 2, 18, 3, (40,34,28))

def draw_tribe_warlodge(d):
    # War Lodge: squatter than the Great Lodge, hung with crossed spears and
    # a war drum. It was reusing the core sprite, so the two were identical.
    SPEAR, BLADE = (122, 96, 60), (178, 178, 186)
    DRUM, DRUM_L = (150, 110, 66), (188, 152, 100)
    draw_grass(d)
    ground_shadow(d, 3, 29, 28, 4)
    d.polygon([(2, 18), (16, 7), (30, 18)], fill=HIDE_TD)
    d.polygon([(4, 18), (16, 10), (28, 18)], fill=HIDE_T)
    d.polygon([(5, 17), (15, 11), (15, 17)], fill=HIDE_TL)
    d.line([1, 19, 31, 19], fill=POLE_T, width=2)
    rect(d, 5, 19, 26, 29, POLE_T)
    for sx in range(6, 27, 3): rect(d, sx, 19, sx, 29, POLE_TD)
    rect(d, 13, 21, 18, 29, (38, 28, 20))
    d.line([8, 26, 20, 12], fill=SPEAR); d.line([23, 26, 11, 12], fill=SPEAR)
    d.polygon([(20, 10), (18, 14), (22, 13)], fill=BLADE)
    d.polygon([(11, 10), (9, 13), (13, 14)], fill=BLADE)
    d.ellipse([22, 22, 29, 29], fill=DRUM)
    d.ellipse([23, 23, 28, 27], fill=DRUM_L)
    rect(d, 22, 25, 29, 25, POLE_TD)

def draw_stake_wall(d):
    # A palisade of lashed timber. The tribe was using the human masonry wall
    # with a brown tint, which still read as tinted STONE — coursed blocks and
    # merlons. This is sharpened logs bound with rope: vertical grain, pointed
    # tops, uneven heights, no straight courses anywhere.
    LOG, LOG_D, LOG_L = (122, 92, 58), (92, 68, 42), (152, 118, 78)
    LOG_XD = (66, 48, 30)
    ROPE = (168, 146, 104)
    draw_grass(d)
    ground_shadow(d, 1, 30, 28, 4)
    # six stakes across the tile, each a slightly different height so the
    # top edge is ragged rather than a machined line
    tops = [6, 3, 7, 4, 8, 5]
    for i, ty in enumerate(tops):
        x = i*5 + 1
        rect(d, x, ty+2, x+3, 29, LOG)
        rect(d, x, ty+2, x, 29, LOG_L)          # lit left edge of each log
        rect(d, x+3, ty+2, x+3, 29, LOG_D)      # shaded right edge
        # sharpened point
        d.polygon([(x, ty+2), (x+1, ty), (x+3, ty+2)], fill=LOG_L)
        rect(d, x+2, ty+1, x+3, ty+2, LOG_D)
        # a knot or two of grain
        rect(d, x+1, ty+7, x+1, ty+8, LOG_XD)
        rect(d, x+2, ty+13, x+2, ty+13, LOG_XD)
    # two binding ropes running the width, sagging slightly between stakes
    for ry in (13, 22):
        for i in range(6):
            x = i*5 + 1
            rect(d, x, ry, x+3, ry, ROPE)
            if i < 5: rect(d, x+4, ry+1, x+4, ry+1, ROPE)   # sag between logs

def draw_tribe_lodge(d):
    # The Great Lodge: a long hide-roofed hall on a heavy timber frame, with
    # tusks flanking the door and trophy skulls on the gable. Renders at 2x2,
    # so it carries the most detail of the set.
    draw_grass(d)
    ground_shadow(d, 2, 30, 28, 4)
    # sagging hide roof — a shallow curve, never a clean gable
    d.polygon([(2, 20), (16, 5), (30, 20)], fill=HIDE_TD)
    d.polygon([(4, 20), (16, 8), (28, 20)], fill=HIDE_T)
    d.polygon([(5, 19), (15, 9), (15, 19)], fill=HIDE_TL)      # lit left slope
    # lashings holding the hide down over the ribs
    for lx in (9, 16, 23):
        d.line([lx, 20, 16, 7], fill=POLE_TD)
    # ridge pole jutting past both ends, the giveaway that it is lashed
    d.line([1, 21, 31, 21], fill=POLE_T, width=2)
    rect(d, 0, 20, 2, 22, POLE_TD); rect(d, 29, 20, 31, 22, POLE_TD)
    # wall of upright stakes
    rect(d, 4, 21, 27, 30, POLE_T)
    for sx in range(5, 28, 3):
        rect(d, sx, 21, sx, 30, POLE_TD)                        # stake gaps
    rect(d, 4, 21, 4, 30, shade(POLE_T, 1.3))                   # lit corner
    # dark doorway with a hide flap
    rect(d, 13, 23, 18, 30, (38, 28, 20))
    rect(d, 13, 23, 18, 25, HIDE_TD)
    # tusks flanking the entrance
    d.polygon([(11, 30), (12, 23), (13, 30)], fill=TUSK_T)
    d.polygon([(18, 30), (19, 23), (20, 30)], fill=TUSK_T)
    # trophy skull at the peak + warpaint daubs
    d.ellipse([13, 4, 19, 10], fill=TUSK_T)
    rect(d, 14, 7, 15, 8, (40, 34, 28)); rect(d, 17, 7, 18, 8, (40, 34, 28))
    rect(d, 7, 24, 8, 25, WARPAINT); rect(d, 24, 24, 25, 25, WARPAINT)

def draw_tribe_hut(d):
    # A hide dome on a bent-pole frame — the tribe's dwelling. Small, round
    # and lopsided, so a row of them never reads as a tidy street.
    draw_grass(d)
    ground_shadow(d, 6, 26, 28, 3)
    d.ellipse([6, 11, 26, 30], fill=HIDE_TD)
    d.ellipse([8, 13, 24, 29], fill=HIDE_T)
    d.ellipse([9, 14, 17, 22], fill=HIDE_TL)                    # lit shoulder
    # bent poles showing through the hide
    for px in (11, 16, 21):
        d.line([px, 13, px, 29], fill=POLE_TD)
    d.line([8, 20, 24, 20], fill=POLE_TD)                       # binding hoop
    # smoke hole at the crown, poles poking out
    d.ellipse([13, 9, 19, 13], fill=(46, 36, 26))
    d.line([13, 11, 11, 6], fill=POLE_T); d.line([19, 11, 21, 6], fill=POLE_T)
    # low door flap
    rect(d, 13, 24, 18, 30, (40, 30, 22))
    d.polygon([(13, 24), (16, 21), (19, 24)], fill=HIDE_TD)

def draw_tribe_totem(d):
    # A carved pole: stacked faces, a skull, tusks and feathers. Tall and
    # vertical on purpose — nothing else in the tribe set has this silhouette,
    # so it reads instantly as a landmark rather than a building.
    draw_grass(d)
    ground_shadow(d, 10, 22, 29, 3)
    rect(d, 12, 4, 19, 29, POLE_T)
    rect(d, 12, 4, 13, 29, shade(POLE_T, 1.28))                 # lit left face
    rect(d, 18, 4, 19, 29, POLE_TD)                             # shaded right
    # stacked carved faces, each a band with eyes and a mouth
    for fy, col in ((22, POLE_TD), (15, POLE_T)):
        rect(d, 11, fy, 20, fy+5, col)
        rect(d, 11, fy, 20, fy, shade(col, 1.3))
        rect(d, 13, fy+1, 14, fy+2, (34, 26, 18))
        rect(d, 17, fy+1, 18, fy+2, (34, 26, 18))
        rect(d, 13, fy+4, 18, fy+4, (34, 26, 18))               # slit mouth
        rect(d, 12, fy+1, 12, fy+3, WARPAINT)
    # skull crowning the pole
    d.ellipse([12, 3, 19, 10], fill=TUSK_T)
    rect(d, 13, 6, 14, 7, (36, 30, 24)); rect(d, 17, 6, 18, 7, (36, 30, 24))
    rect(d, 15, 8, 16, 9, (36, 30, 24))
    # tusks and a feather binding
    d.polygon([(11, 11), (7, 8), (11, 14)], fill=TUSK_T)
    d.polygon([(20, 11), (24, 8), (20, 14)], fill=TUSK_T)
    for fy2 in (12, 13):
        rect(d, 10, fy2, 21, fy2, (92, 70, 44))

def draw_tribe_worker(d):
    # A hobgoblin labourer: same wiry build as the spear-thrower, but hunched
    # under a bundle with a mattock instead of a javelin, so the two read
    # apart instantly on the field.
    SKN, SKN_D, SKN_L = (140, 132, 78), (104, 98, 54), (168, 160, 102)
    RAG, RAG_D = (98, 78, 56), (72, 56, 40)
    HAFT = (122, 96, 60)
    STONE_H, STONE_HL = (108, 104, 98), (150, 146, 140)
    d.ellipse([10, 27, 22, 31], fill=(0, 0, 0, 70))
    # bundle of hides strapped to the back, the silhouette that says "worker"
    d.ellipse([17, 10, 27, 21], fill=HIDE_TD)
    d.ellipse([18, 11, 25, 18], fill=HIDE_T)
    for by in (13, 16):
        rect(d, 17, by, 27, by, POLE_TD)                        # cords
    # bent legs
    rect(d, 12, 22, 14, 29, SKN_D); rect(d, 12, 22, 12, 29, SKN)
    rect(d, 17, 22, 19, 29, SKN_D); rect(d, 17, 22, 17, 29, SKN)
    rect(d, 11, 29, 15, 30, RAG_D); rect(d, 16, 29, 20, 30, RAG_D)
    # hunched torso, leaning under the load
    rect(d, 12, 13, 19, 23, RAG)
    rect(d, 12, 13, 13, 23, shade(RAG, 1.28))
    rect(d, 18, 13, 19, 23, RAG_D)
    rect(d, 12, 17, 19, 17, RAG_D)
    # mattock held low across the body
    d.line([6, 24, 16, 18], fill=HAFT, width=1)
    d.polygon([(4, 25), (9, 21), (5, 20)], fill=STONE_H)
    d.line([4, 25, 5, 20], fill=STONE_HL)
    rect(d, 13, 19, 15, 21, SKN)                                # gripping hand
    # big-eared head, tipped forward under the weight
    d.ellipse([11, 5, 19, 13], fill=SKN)
    rect(d, 11, 5, 15, 6, SKN_L)
    d.polygon([(11, 7), (6, 3), (11, 11)], fill=SKN)
    d.polygon([(19, 7), (24, 3), (19, 11)], fill=SKN_D)
    rect(d, 12, 8, 13, 9, (60, 40, 24)); rect(d, 16, 8, 17, 9, (60, 40, 24))
    rect(d, 13, 11, 17, 12, SKN_D)                              # set jaw

def draw_bone_pile(d):
    # A bone HAYSTACK — the first pass was a low heap and read as a blob on
    # the ground. The fix is silhouette: this is tall and conical, wide at
    # the base and tapering to a point, exactly like a stook of hay, with the
    # long bones playing the part of the straw. A skull near the base tells
    # you what the straw is made of; a femur juts from the top like the pole.
    BONE, BONE_D, BONE_L = (226, 220, 198), (168, 162, 140), (246, 242, 226)
    BONE_XD = (128, 122, 104)
    EARTH = (96, 84, 68)
    # grass base, not dirt: this sprite IS the tile, so a dirt fill painted a
    # brown square onto green terrain. Matches how stone deposits blend.
    draw_grass(d)
    d.ellipse([4, 24, 28, 31], fill=EARTH)                  # trampled ground
    ground_shadow(d, 5, 27, 28, 3)

    # solid conical body first, so the stack has real mass behind the detail
    d.polygon([(16, 3), (27, 28), (5, 28)], fill=BONE_D)
    d.polygon([(16, 5), (24, 28), (9, 28)], fill=BONE)
    d.polygon([(15, 6), (12, 28), (9, 28)], fill=BONE_L)    # lit left flank

    # long bones laid up the cone like thatch, fanning out from the peak
    for x1, y1 in [(6,27), (9,28), (13,28), (19,28), (23,28), (26,27)]:
        d.line([16, 6, x1, y1], fill=BONE_XD)
        d.line([15, 6, x1-1, y1], fill=BONE_L)
    # knobbed ends poking out along the bottom edge, so it reads as bones
    for bx in (6, 10, 14, 18, 22, 26):
        rect(d, bx-1, 27, bx+1, 28, BONE)
        rect(d, bx-1, 28, bx+1, 28, BONE_XD)

    # a femur jutting from the peak, the haystack's pole
    d.line([16, 6, 19, 1], fill=BONE)
    rect(d, 18, 0, 20, 2, BONE_L)
    rect(d, 15, 5, 17, 7, BONE_L)

    # Bones jutting OUT past the cone's edge. Without these the silhouette is
    # a clean triangle and the whole thing reads as a tent or a snowdrift —
    # breaking the outline is what says "made of loose parts".
    for x0, y0, x1, y1 in [(11,14, 3,11), (21,13, 29,10), (10,20, 2,20),
                           (22,19, 30,21), (13,9, 7,4), (19,10, 25,5)]:
        d.line([x0, y0, x1, y1], fill=BONE_XD, width=2)
        d.line([x0, y0-1, x1, y1-1], fill=BONE, width=1)
        rect(d, x1-1, y1-1, x1+1, y1+1, BONE_L)             # knobbed end

    # one skull at the foot, on a DARK socket so it separates from the bone
    # cone behind it — first pass drew bone-on-bone and it disappeared
    d.ellipse([11, 20, 20, 28], fill=BONE_XD)
    d.ellipse([12, 21, 19, 27], fill=BONE)
    d.ellipse([12, 21, 15, 24], fill=BONE_L)                # lit dome
    rect(d, 14, 24, 15, 25, (34, 30, 26))                   # eye sockets
    rect(d, 17, 24, 18, 25, (34, 30, 26))
    rect(d, 15, 26, 17, 26, (34, 30, 26))                   # nasal gap
    rect(d, 14, 27, 18, 27, BONE_L)                         # jaw

    scatter(d, 4441, 10, BONE_L)
    scatter(d, 4457, 8, BONE_XD)

def draw_bone_pile_corrupted(d):
    # The blighted twin of the bone pile. Under creep, forest and stone both
    # switch to a corrupted variant so the RESOURCE stays readable; the bone
    # pile had none, so blight erased it visually while it remained fully
    # mineable — a deposit you could work but not see.
    BONE, BONE_D, BONE_L = (198, 200, 176), (146, 148, 128), (222, 224, 200)
    BONE_XD = (104, 106, 92)
    draw_creep(d)
    d.ellipse([5, 24, 27, 31], fill=CREEP_BLACK_T)
    d.polygon([(16, 3), (27, 28), (5, 28)], fill=BONE_D)
    d.polygon([(16, 5), (24, 28), (9, 28)], fill=BONE)
    d.polygon([(15, 6), (12, 28), (9, 28)], fill=BONE_L)
    for x1, y1 in [(6,27), (9,28), (13,28), (19,28), (23,28), (26,27)]:
        d.line([16, 6, x1, y1], fill=BONE_XD)
        d.line([15, 6, x1-1, y1], fill=BONE_L)
    for bx in (6, 10, 14, 18, 22, 26):
        rect(d, bx-1, 27, bx+1, 28, BONE)
        rect(d, bx-1, 28, bx+1, 28, BONE_XD)
    for x0, y0, x1, y1 in [(11,14, 3,11), (21,13, 29,10), (10,20, 2,20),
                           (22,19, 30,21), (13,9, 7,4), (19,10, 25,5)]:
        d.line([x0, y0, x1, y1], fill=BONE_XD, width=2)
        d.line([x0, y0-1, x1, y1-1], fill=BONE, width=1)
        rect(d, x1-1, y1-1, x1+1, y1+1, BONE_L)
    d.line([16, 6, 19, 1], fill=BONE)
    rect(d, 18, 0, 20, 2, BONE_L)
    d.ellipse([11, 20, 20, 28], fill=BONE_XD)
    d.ellipse([12, 21, 19, 27], fill=BONE)
    d.ellipse([12, 21, 15, 24], fill=BONE_L)
    rect(d, 14, 24, 15, 25, (30, 26, 24)); rect(d, 17, 24, 18, 25, (30, 26, 24))
    rect(d, 15, 26, 17, 26, (30, 26, 24))
    # creep veins climbing the stack, same tell the corrupted stone uses
    d.line([9, 24, 14, 18, 17, 12], fill=(120, 160, 110), width=1)
    scatter(d, 4463, 10, (120, 160, 110))

def draw_bone_yard(d):
    # A rack-and-cauldron works: bones are hauled in, boiled down and stacked.
    # Undead structure, so it sits on blight and reads bone-white on green.
    BONE, BONE_D = (222, 216, 194), (168, 162, 140)
    WOOD_R, WOOD_RD = (108, 86, 60), (78, 62, 42)
    IRON, IRON_L = (86, 90, 98), (132, 136, 146)
    draw_creep(d)
    ground_shadow(d, 5, 27, 27, 4)
    # drying rack: two posts and a crossbar hung with bones
    rect(d, 6, 10, 7, 27, WOOD_R); rect(d, 6, 10, 6, 27, shade(WOOD_R, 1.25))
    rect(d, 24, 10, 25, 27, WOOD_R); rect(d, 25, 10, 25, 27, WOOD_RD)
    rect(d, 6, 9, 25, 10, WOOD_RD)
    for hx in (10, 14, 18, 22):
        rect(d, hx, 11, hx, 17, BONE)
        rect(d, hx-1, 17, hx+1, 18, BONE_D)                # knobbed end
    # cauldron below, where the marrow is rendered
    d.ellipse([11, 20, 23, 28], fill=IRON)
    d.ellipse([11, 20, 23, 24], fill=IRON_L)               # lit rim
    d.ellipse([13, 21, 21, 24], fill=(58, 70, 52))         # green brew
    rect(d, 12, 28, 22, 29, shade(IRON, 0.7))              # base
    # stacked bones at the foot
    for bx in (8, 26):
        rect(d, bx-1, 25, bx+1, 26, BONE_D)
        rect(d, bx-1, 25, bx+1, 25, BONE)

def draw_ritual_pit(d):
    # A dug pit ringed by FOUR burning pillars. Positions come straight off a
    # circle at 30/150/210/330 degrees, so the ring is symmetrical about both
    # axes and no pillar sits dead-centre hiding the hole. The two rear
    # pillars are drawn BEFORE the pit and the two front ones after, so the
    # rim overlaps their feet and the whole thing sits in depth rather than
    # looking pasted on.
    STONE_R, STONE_RD, STONE_RL = (104, 100, 110), (72, 69, 78), (140, 136, 148)
    PIT, PIT_D = (58, 40, 44), (30, 20, 24)
    GORE = (122, 44, 46)
    # was bone-white; a lighter red instead, so the marks in the pit read as
    # clots in the blood rather than as bones sitting in it
    CLOT = (178, 70, 62)
    # orange flame on purpose: on green blight a green witch-fire would sink
    # into the background, and the pit needs to read at a glance
    F_CORE, F_MID, F_OUT, F_GLOW = (255, 242, 190), (255, 186, 62), (226, 104, 30), (150, 58, 20)

    draw_creep(d)
    ground_shadow(d, 3, 29, 29, 3)

    import math
    # Those four angles put the rear and front pillars on IDENTICAL x
    # (cos 30 = cos 330), so at one radius they stack into two vertical bars
    # instead of reading as a ring of four. The rear pair therefore sits on a
    # narrower radius — which is also what perspective actually does to the
    # far side of a circle seen at an angle.
    CX, CY, RY = 16.0, 19.0, 7.5
    RX_FRONT, RX_BACK = 9.5, 6.0
    def pillar_base(deg, rx):
        r = math.radians(deg)
        return int(round(CX + rx*math.cos(r))), int(round(CY - RY*math.sin(r)))

    def draw_pillar(bx, by, h):
        rect(d, bx-1, by-h, bx+1, by, STONE_R)
        rect(d, bx-1, by-h, bx+1, by-h, STONE_RL)      # lit cap
        rect(d, bx-1, by-h, bx-1, by, STONE_RL)        # lit left face
        rect(d, bx+1, by-h, bx+1, by, STONE_RD)        # shaded right face
        rect(d, bx-1, by, bx+1, by, STONE_RD)          # contact shadow

    def draw_flame(bx, ty):
        # ty is the pillar's cap row; the flame sits on top of it
        rect(d, bx-1, ty-1, bx+1, ty-1, F_GLOW)        # heat wash on the stone
        rect(d, bx-1, ty-3, bx+1, ty-2, F_OUT)
        rect(d, bx-1, ty-4, bx+1, ty-3, F_MID)
        rect(d, bx,   ty-6, bx,   ty-4, F_MID)         # tapering tongue
        rect(d, bx,   ty-5, bx,   ty-4, F_CORE)        # white-hot core
        rect(d, bx-1, ty-3, bx-1, ty-3, F_CORE)

    back  = [pillar_base(150, RX_BACK),  pillar_base(30,  RX_BACK)]
    front = [pillar_base(210, RX_FRONT), pillar_base(330, RX_FRONT)]

    H_BACK, H_FRONT = 7, 9
    for bx, by in back:
        draw_pillar(bx, by, H_BACK)

    # the hole itself
    d.ellipse([5, 12, 27, 28], fill=PIT_D)
    d.ellipse([7, 14, 25, 26], fill=PIT)
    d.ellipse([10, 17, 22, 24], fill=GORE)
    for bx, by in ((12, 20), (18, 19), (15, 23)):
        rect(d, bx, by, bx+1, by, CLOT)                # thicker clots in the blood

    for bx, by in front:
        draw_pillar(bx, by, H_FRONT)

    # flames last, so nothing overlaps them
    for bx, by in back:
        draw_flame(bx, by - H_BACK)
    for bx, by in front:
        draw_flame(bx, by - H_FRONT)

def draw_flesh_golem(d):
    # Twenty corpses stitched into one body. Deliberately LUMPY and
    # asymmetric — mismatched limbs, visible sutures, exposed ribs — so it
    # never reads as a big skeleton. Renders at 1.45x, the largest thing the
    # undead field, so it can carry this much detail.
    FLESH, FLESH_D, FLESH_L = (146, 130, 118), (112, 98, 90), (172, 156, 142)
    FLESH_XD = (82, 70, 66)
    SUTURE = (58, 44, 42)
    GORE = (128, 52, 52)
    BONE = (218, 212, 192)
    EYE = (196, 214, 120)
    ground_shadow(d, 5, 27, 28, 4)
    # hunched, uneven torso — wider on its right
    rect(d, 9, 11, 23, 24, FLESH)
    rect(d, 9, 11, 10, 24, FLESH_L)
    rect(d, 22, 11, 23, 24, FLESH_D)
    rect(d, 11, 18, 21, 23, FLESH_D)                       # sagging gut
    # sutures holding the pieces together
    for sy in (14, 19):
        d.line([10, sy, 22, sy], fill=SUTURE)
        for sx in range(11, 22, 3):
            rect(d, sx, sy-1, sx, sy+1, SUTURE)
    # ribs pushing through on one side
    for ry in (13, 15, 17):
        rect(d, 17, ry, 21, ry, BONE)
    # MISMATCHED arms: one huge, one withered
    rect(d, 3, 12, 8, 26, FLESH); rect(d, 3, 12, 4, 26, FLESH_L)
    rect(d, 3, 24, 9, 29, FLESH_D)                         # great fist
    rect(d, 24, 14, 27, 22, FLESH_D)                       # shrivelled arm
    rect(d, 24, 22, 28, 25, FLESH_XD)
    # stubby legs
    rect(d, 11, 24, 15, 30, FLESH_D); rect(d, 11, 24, 11, 30, FLESH)
    rect(d, 17, 24, 21, 30, FLESH_D); rect(d, 17, 24, 17, 30, FLESH)
    # lolling head, sunk between the shoulders and set off-centre
    d.ellipse([12, 3, 21, 12], fill=FLESH)
    rect(d, 12, 3, 16, 4, FLESH_L)
    d.line([13, 7, 20, 7], fill=SUTURE)                    # stitched across the skull
    rect(d, 14, 8, 15, 9, EYE); rect(d, 18, 8, 19, 9, EYE) # cold green lights
    rect(d, 14, 11, 19, 12, GORE)                          # slack red mouth
    for tx in (15, 17):
        rect(d, tx, 11, tx, 11, BONE)

def draw_bandit_camp(d):
    # an outlaw camp: sharpened palisade stakes, a hide tent, a campfire and
    # a skull on a pike. Was a red-tinted wall GATE, of all things.
    # NO ground fill: this is an entity drawn over the terrain, so a dirt
    # base painted an opaque square around it. Transparency lets the real
    # ground show through, same as every other unit sprite.
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


# ---- The Grove: living structures -------------------------------------
# One palette for the whole faction so the network reads as one organism:
# bark browns for structure, three greens for foliage, and a warm fruit red
# reserved for the things that actually feed you.
GV_BARK, GV_BARK_D, GV_BARK_L = (108, 82, 54), (78, 58, 38), (140, 110, 76)
GV_LEAF, GV_LEAF_D, GV_LEAF_L = (76, 138, 58), (52, 102, 40), (108, 170, 82)
GV_LEAF_XL = (144, 198, 112)
GV_FRUIT, GV_FRUIT_D = (198, 74, 52), (150, 48, 34)

def _gv_canopy(d, cx, cy, rx, ry):
    """Layered blob canopy: dark base, mid body, lit top-left. Drawn as three
    offset ellipses rather than one, so the edge is lumpy like foliage
    instead of a clean geometric arc."""
    d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=GV_LEAF_D)
    d.ellipse([cx-rx+1, cy-ry+1, cx+rx-1, cy+ry-1], fill=GV_LEAF)
    d.ellipse([cx-rx+2, cy-ry+1, cx+rx-5, cy+ry-5], fill=GV_LEAF_L)
    d.ellipse([cx-rx+3, cy-ry+2, cx-rx+7, cy-ry+6], fill=GV_LEAF_XL)

def draw_grove_heart(d):
    # The Heartwood: the oldest tree, and the only structure that keeps
    # growing. Rendered at 2x2 in game, so it can carry real detail — a
    # buttressed trunk, exposed roots gripping the ground, a canopy in
    # layers, and a hollow at the base where the grove's life is kept.
    # no ground fill: this is drawn OVER the terrain, so a grass base
    # painted an opaque square and buried the roots running under it
    ground_shadow(d, 3, 29, 29, 3)
    # roots spreading from the base
    for x0, y0, x1, y1 in [(15,27, 5,30), (17,27, 27,30), (14,28, 9,31), (18,28, 23,31)]:
        d.line([x0,y0,x1,y1], fill=GV_BARK_D, width=2)
        d.line([x0,y0-1,x1,y1-1], fill=GV_BARK, width=1)
    # buttressed trunk, wider at the foot
    rect(d, 12, 12, 19, 28, GV_BARK)
    rect(d, 11, 24, 20, 28, GV_BARK)
    rect(d, 12, 12, 13, 28, GV_BARK_L)
    rect(d, 18, 12, 19, 28, GV_BARK_D)
    for gy in (16, 20, 24):
        rect(d, 14, gy, 17, gy, GV_BARK_D)      # bark grain
    # hollow at the base — where the grove keeps its life
    d.ellipse([14, 21, 18, 27], fill=(38, 30, 22))
    d.ellipse([15, 22, 17, 25], fill=(64, 50, 36))
    # canopy in three overlapping masses
    _gv_canopy(d, 16, 8, 14, 9)
    _gv_canopy(d, 7, 12, 7, 5)
    _gv_canopy(d, 25, 12, 7, 5)
    scatter(d, 7717, 14, GV_LEAF_XL)
    scatter(d, 7723, 10, GV_LEAF_D)

def draw_grove_bower(d):
    # A dwelling woven INTO a tree rather than built beside one — the Grove
    # does not put up walls, it makes room inside what already grows.
    # no ground fill: this is drawn OVER the terrain, so a grass base
    # painted an opaque square and buried the roots running under it
    ground_shadow(d, 8, 24, 28, 3)
    rect(d, 14, 16, 18, 28, GV_BARK)
    rect(d, 14, 16, 14, 28, GV_BARK_L)
    rect(d, 18, 16, 18, 28, GV_BARK_D)
    _gv_canopy(d, 16, 12, 11, 8)
    # a woven opening, the "door"
    d.ellipse([13, 17, 19, 24], fill=(46, 36, 26))
    d.ellipse([14, 18, 18, 23], fill=(70, 56, 40))
    for wy in (19, 21):
        rect(d, 14, wy, 18, wy, GV_BARK_D)      # woven withies across it
    scatter(d, 7731, 8, GV_LEAF_XL)

def draw_grove_bough(d):
    # Fruiting Bough: a low tree heavy with fruit. Red is used ONLY here and
    # on the Hollow, so anything feeding you is findable at a glance.
    # no ground fill: this is drawn OVER the terrain, so a grass base
    # painted an opaque square and buried the roots running under it
    ground_shadow(d, 7, 25, 28, 3)
    rect(d, 15, 18, 17, 28, GV_BARK)
    rect(d, 15, 18, 15, 28, GV_BARK_L)
    d.line([16,20, 10,16], fill=GV_BARK, width=2)
    d.line([16,20, 22,16], fill=GV_BARK, width=2)
    _gv_canopy(d, 16, 13, 12, 8)
    for fx, fy in [(9,14), (14,9), (20,12), (23,16), (12,17), (18,17)]:
        d.ellipse([fx, fy, fx+3, fy+3], fill=GV_FRUIT_D)
        d.ellipse([fx, fy, fx+2, fy+2], fill=GV_FRUIT)
        rect(d, fx, fy, fx, fy, (240, 170, 150))     # specular dot
    scatter(d, 7741, 8, GV_LEAF_XL)

def draw_grove_spire(d):
    # Bramble Spire: the Grove's tower. The first pass gave it small, low
    # contrast thorns and it read as just another tree — wrong, since this is
    # the one thing in the faction meant to look hostile. Now the thorns are
    # long, dark, and break the silhouette on both sides, and the whole plant
    # is pushed darker so it separates from the friendly greens around it.
    THORN, THORN_D, THORN_XD = (74, 88, 48), (50, 60, 32), (32, 40, 22)
    THORN_L = (126, 142, 84)
    SPIKE = (196, 202, 160)
    # no ground fill: this is drawn OVER the terrain, so a grass base
    # painted an opaque square and buried the roots running under it
    ground_shadow(d, 9, 23, 29, 3)
    # dark central shaft, narrow so the thorns dominate the read
    d.polygon([(16,2), (21,29), (11,29)], fill=THORN_XD)
    d.polygon([(16,4), (19,29), (13,29)], fill=THORN_D)
    d.polygon([(15,5), (14,29), (12,29)], fill=THORN)
    # long thorns, alternating, deliberately overshooting the trunk's width
    for i, ty in enumerate(range(5, 29, 3)):
        L = 7 + (i % 3) * 2
        if i % 2 == 0:
            d.polygon([(13,ty), (13-L,ty-3), (13,ty+2)], fill=THORN_D)
            d.line([13,ty-1, 13-L,ty-3], fill=THORN_L)
            rect(d, 13-L, ty-3, 13-L+1, ty-2, SPIKE)      # pale hard tip
        else:
            d.polygon([(19,ty), (19+L,ty-3), (19,ty+2)], fill=THORN_XD)
            d.line([19,ty-1, 19+L,ty-3], fill=THORN)
            rect(d, 19+L-1, ty-3, 19+L, ty-2, SPIKE)
    rect(d, 15, 0, 17, 4, SPIKE)                          # hardened crown
    rect(d, 15, 0, 15, 4, (240, 244, 210))
    scatter(d, 7753, 10, THORN_XD)

def draw_grove_thicket(d):
    # Thicket: the Grove's wall. A dense bramble hedge — no coursing, no
    # merlons, nothing quarried. Drawn to tile cleanly left-to-right so a run
    # of them reads as one continuous hedge.
    draw_grass(d)
    rect(d, 0, 10, 31, 27, GV_LEAF_D)
    for i in range(0, 32, 4):
        d.ellipse([i-2, 8, i+6, 18], fill=GV_LEAF)
        d.ellipse([i-1, 9, i+3, 14], fill=GV_LEAF_L)
    rect(d, 0, 25, 31, 27, GV_LEAF_D)
    # thorns along the crest, so it reads as hostile rather than ornamental
    # crest thorns: tall and DARK against the pale canopy, or a hedge run
    # reads as a soft green band rather than something you would not push into
    for tx in range(1, 32, 4):
        d.line([tx, 12, tx+2, 3], fill=(46, 58, 30))
        d.line([tx+1, 12, tx+3, 4], fill=(86, 102, 56))
        rect(d, tx+2, 3, tx+2, 4, (196, 202, 160))
    scatter(d, 7761, 22, GV_LEAF_XL)
    scatter(d, 7767, 16, GV_LEAF_D)

def draw_grove_ent(d):
    # An Ent: a tree that walks. Deliberately NOT the old sprout — you get one
    # of these, it is expensive, and it should look like something that has
    # stood a long time. Broad bark body, a mossy canopy for a head, gnarled
    # root feet, and long limbs that read as branches rather than arms.
    BARK, BARK_D, BARK_L = (104, 78, 52), (74, 55, 36), (136, 106, 72)
    MOSS, MOSS_D, MOSS_L = (76, 138, 58), (52, 102, 40), (112, 174, 86)
    EYE = (226, 214, 120)
    d.ellipse([8, 27, 24, 31], fill=(0, 0, 0, 75))          # ground shadow

    # root feet, splayed and gripping
    for fx in (11, 19):
        rect(d, fx, 25, fx+2, 30, BARK_D)
        rect(d, fx, 25, fx, 30, BARK)
        d.line([fx+1, 30, fx-2, 31], fill=BARK_D)
        d.line([fx+1, 30, fx+4, 31], fill=BARK_D)

    # trunk body, wider at the base, with bark grain
    rect(d, 12, 12, 19, 27, BARK)
    rect(d, 11, 22, 20, 27, BARK)
    rect(d, 12, 12, 13, 27, BARK_L)                          # lit left
    rect(d, 18, 12, 19, 27, BARK_D)                          # shaded right
    for gy in (15, 18, 21, 24):
        rect(d, 14, gy, 17, gy, BARK_D)
    # a knot-hollow in the trunk
    d.ellipse([14, 18, 17, 22], fill=(46, 34, 24))

    # branch arms, long and jointed — they hang like limbs, not like fists
    d.line([12, 14, 5, 11], fill=BARK, width=3)
    d.line([5, 11, 3, 18], fill=BARK_D, width=2)
    d.line([12, 14, 6, 12], fill=BARK_L, width=1)
    d.line([19, 14, 26, 11], fill=BARK, width=3)
    d.line([26, 11, 28, 18], fill=BARK_D, width=2)
    for tx, ty in ((2,19), (4,20), (27,19), (29,20)):        # twig fingers
        rect(d, tx, ty, tx, ty+1, BARK_D)

    # mossy canopy head
    d.ellipse([8, 2, 24, 14], fill=MOSS_D)
    d.ellipse([9, 3, 22, 12], fill=MOSS)
    d.ellipse([10, 4, 17, 9], fill=MOSS_L)
    for lx, ly in ((7,7), (24,8), (12,1), (19,2)):           # leafy fringe
        d.ellipse([lx, ly, lx+3, ly+3], fill=MOSS)
    # deep-set glowing eyes under the canopy
    rect(d, 13, 10, 14, 11, (34, 30, 22))
    rect(d, 17, 10, 18, 11, (34, 30, 22))
    rect(d, 13, 10, 13, 10, EYE)
    rect(d, 18, 10, 18, 10, EYE)
    scatter(d, 7771, 10, MOSS_L)
    scatter(d, 7777, 6, MOSS_D)

def draw_grove_elder(d):
    # The Elder Bough — the Grove's hero, built on the Ent's silhouette so
    # they read as the same kind of being, then raised to something worth
    # following. Everything added is a sign of AGE and AUTHORITY rather than
    # armour: a crown of blossom, a lichen beard, a heartwood scar down the
    # trunk, one arm grown into a staff, and eyes lit like coals under the
    # canopy. He is wider and heavier than an Ent and stands on gripping
    # roots rather than feet.
    BARK, BARK_D, BARK_L = (112, 84, 56), (78, 58, 38), (148, 116, 78)
    BARK_XD = (54, 40, 26)
    MOSS, MOSS_D, MOSS_L = (72, 132, 54), (48, 96, 38), (110, 172, 84)
    BLOOM, BLOOM_L = (214, 160, 74), (244, 208, 128)
    LICHEN = (168, 190, 150)
    EYE, EYE_HOT = (255, 196, 84), (255, 240, 190)
    HEART = (196, 118, 62)

    d.ellipse([5, 27, 27, 31], fill=(0, 0, 0, 85))

    # gripping roots — wider stance than the Ent's, so he plants
    for fx in (9, 16, 22):
        rect(d, fx, 25, fx+2, 30, BARK_D)
        rect(d, fx, 25, fx, 30, BARK)
        d.line([fx+1, 30, fx-3, 31], fill=BARK_XD)
        d.line([fx+1, 30, fx+4, 31], fill=BARK_XD)

    # broad trunk
    rect(d, 10, 11, 21, 27, BARK)
    rect(d,  9, 21, 22, 27, BARK)
    rect(d, 10, 11, 11, 27, BARK_L)
    rect(d, 20, 11, 21, 27, BARK_D)
    for gy in (14, 17, 20, 23):
        rect(d, 12, gy, 19, gy, BARK_D)
    # trunk left as plain bark — a coloured heartwood stripe read as a glowing
    # wound and fought the canopy for attention
    rect(d, 14, 16, 14, 21, BARK_XD)
    rect(d, 17, 15, 17, 22, BARK_XD)

    # left arm grown long into a staff — the hero read at a glance
    d.line([10, 13, 3, 9], fill=BARK, width=3)
    d.line([3, 9, 2, 2], fill=BARK_D, width=3)
    d.line([2, 2, 5, 1], fill=BARK, width=2)
    d.ellipse([0, 0, 5, 5], fill=BLOOM)                 # a bloom at its head
    d.ellipse([1, 1, 3, 3], fill=BLOOM_L)
    # right arm, heavy and knotted
    d.line([21, 13, 28, 16], fill=BARK, width=3)
    d.line([28, 16, 29, 22], fill=BARK_D, width=2)
    for tx, ty in ((28, 23), (30, 23)):
        rect(d, tx, ty, tx, ty+1, BARK_D)

    # canopy crown, larger and layered
    d.ellipse([5, 1, 27, 14], fill=MOSS_D)
    d.ellipse([6, 2, 25, 12], fill=MOSS)
    d.ellipse([8, 3, 18, 9], fill=MOSS_L)
    for lx, ly in ((4, 6), (26, 7), (10, 0), (19, 0), (22, 3)):
        d.ellipse([lx, ly, lx+4, ly+4], fill=MOSS)
    # blossom crown — the mark of the elder
    for bx, by in ((8, 2), (13, 0), (18, 0), (23, 3), (5, 8), (26, 10)):
        d.ellipse([bx, by, bx+2, by+2], fill=BLOOM)
        rect(d, bx, by, bx, by, BLOOM_L)

    # burning eyes set deep under the canopy
    rect(d, 12, 10, 14, 12, (28, 22, 16))
    rect(d, 18, 10, 20, 12, (28, 22, 16))
    rect(d, 12, 10, 13, 11, EYE)
    rect(d, 19, 10, 20, 11, EYE)
    rect(d, 13, 10, 13, 10, EYE_HOT)
    rect(d, 19, 10, 19, 10, EYE_HOT)

    # A dark hollow for a mouth, like the Ent's knot. Teeth were tried and
    # cut: at 32px the gaps between them close up and the whole thing reads as
    # a pale slab, so the shape has to carry it rather than the detail.
    d.ellipse([13, 14, 19, 20], fill=(26, 19, 14))
    d.ellipse([14, 15, 18, 18], fill=(46, 34, 24))
    rect(d, 13, 13, 19, 13, BARK_XD)                 # heavy brow above it
    for bx in (9, 10, 22, 23):
        d.line([bx, 13, bx-1, 13 + 3 + (bx % 3)], fill=LICHEN)
    scatter(d, 7781, 12, MOSS_L)
    scatter(d, 7787, 5, BLOOM)

# ---------------------------------------------------------------------
# The enemy town's UNDEAD skin.
#
# AI_BUILD_DEFS carries a frame per race, and four of its undead entries used
# to point straight at the player's own human sprites — the wall, the quarry,
# the lumber camp, and (worse) the human lumber camp standing in for a farm.
# That was 14 of the enemy town's 29 buildings wearing human masonry, with the
# six walls being the first thing you meet coming through the pass.
#
# These four fill that gap. They deliberately echo the LAYOUT of their human
# counterparts — a wall still reads as a wall, a pit still reads as a pit — so
# the enemy town stays legible at a glance; only the material changes, from
# cut stone and timber to bone and grave dirt.
# ---------------------------------------------------------------------

GRAVE_DIRT   = (74, 68, 58)
GRAVE_DIRT_D = (52, 48, 40)
GRAVE_DIRT_L = (96, 88, 74)
SOUL         = (110, 176, 104)
SOUL_L       = (162, 236, 146)
VOID         = (18, 16, 20)


def bone_courses(d, x0, y0, x1, y1):
    """Bone masonry: the same staggered-joint idea as stone_courses, in bone."""
    rect(d, x0, y0, x1, y1, BONE)
    dk = BONE_D
    for i, y in enumerate(range(y0 + 3, y1, 5)):
        rect(d, x0, y, x1, y, dk)
        off = 0 if i % 2 == 0 else 4
        for x in range(x0 + off, x1 + 1, 8):
            rect(d, x, y, x, min(y + 4, y1), dk)
    rect(d, x0, y0, x1, y0, BONE_L)
    rect(d, x0, y0, x0, y1, BONE_L)
    rect(d, x1, y0, x1, y1, dk)


def draw_crypt_wall(d):
    # The undead answer to a stone wall: courses of packed bone on a dark
    # grave-dirt footing, topped with skulls where a human wall has merlons.
    # Tiles horizontally exactly like draw_wall — same 10/31 course band and
    # same 4..10 tooth band — so a mixed run of the two still lines up.
    rect(d, 0, 26, 31, 31, GRAVE_DIRT_D)          # footing it is rammed into
    bone_courses(d, 0, 10, 31, 29)
    rect(d, 0, 10, 31, 10, BONE_D)                # shadow under the crown
    # skull teeth along the top, on the same 8px pitch as the human merlons
    for x in range(0, 32, 8):
        d.ellipse([x, 3, x + 5, 9], fill=BONE, outline=BONE_D)
        rect(d, x + 1, 5, x + 1, 6, VOID)         # eye
        rect(d, x + 4, 5, x + 4, 6, VOID)         # eye
        rect(d, x + 2, 8, x + 3, 8, BONE_D)       # jaw line
    # a few ribs jutting from the courses, and rot in the joints
    for rx, ry in ((3, 15), (14, 20), (25, 16)):
        d.line([rx, ry, rx + 3, ry - 2], fill=BONE_L, width=1)
    rect(d, 7, 22, 9, 23, (86, 104, 74))
    rect(d, 20, 13, 22, 14, (86, 104, 74))


def draw_bone_fence(d):
    # The undead's BASE wall, and the thing a Crypt Wall is upgraded from: a
    # cheap palisade of femurs lashed into grave dirt. Deliberately low and
    # gappy so it reads as a fence rather than a fortification — the whole
    # point of the bone upgrade is that this is not good enough.
    #
    # ONE frame serving straight/vert/corner, the way the Grove's thicket
    # does: a scrappy palisade has no grain to line up, so it tiles in any
    # direction without needing three sprites.
    rect(d, 0, 22, 31, 31, GRAVE_DIRT)            # turned earth it is set into
    rect(d, 0, 22, 31, 23, GRAVE_DIRT_D)
    scatter(d, 5501, 14, GRAVE_DIRT_D)
    # staves of bone at irregular heights, leaning slightly
    for i, x in enumerate((1, 6, 11, 16, 21, 26)):
        top = 8 + (i % 3) * 3
        lean = -1 if i % 2 else 1
        rect(d, x, top, x + 2, 26, BONE)
        rect(d, x, top, x, 26, BONE_L)            # lit edge
        rect(d, x + 2, top, x + 2, 26, BONE_D)    # shadow edge
        d.ellipse([x - 1, top - 2, x + 3, top + 2], fill=BONE, outline=BONE_D)  # knuckle top
        rect(d, x + lean, 24, x + 1 + lean, 25, BONE_D)
    # a sagging cross-lash holding them together
    d.line([0, 17, 31, 19], fill=(96, 82, 62), width=2)
    d.line([0, 18, 31, 20], fill=(70, 58, 44), width=1)


def _skull_tooth(d, x, y):
    """One skull in a crenellation run, drawn from its top-left corner."""
    d.ellipse([x, y, x + 5, y + 6], fill=BONE, outline=BONE_D)
    rect(d, x + 1, y + 2, x + 1, y + 3, VOID)
    rect(d, x + 4, y + 2, x + 4, y + 3, VOID)
    rect(d, x + 2, y + 5, x + 3, y + 5, BONE_D)


def draw_crypt_wall_v(d):
    # 90-degree rotated crypt wall, so VERTICAL runs connect cleanly. Without
    # this a north-south wall was six copies of the horizontal segment stacked
    # on top of each other — the courses ran the wrong way and the skull crown
    # repeated down the middle of the run instead of facing outward. Mirrors
    # draw_wall_v's geometry exactly (shaft at x=10..31, teeth at x=4..10) so
    # bone and stone walls can share a line and still meet correctly.
    # NO ground footing on this one. The horizontal segment has grave dirt
    # along its bottom edge because that is where it meets the ground; a
    # north-south segment has no base in view, and adding one put a dark
    # grave-dirt stripe down the right of every tile, which read as a seam
    # between segments instead of a continuous wall. Fills 10..31 like the
    # human wall_v so consecutive tiles butt together invisibly.
    bone_courses(d, 10, 0, 31, 31)
    for y in range(0, 32, 8):
        _skull_tooth(d, 4, y)
    rect(d, 10, 0, 10, 31, BONE_D)                # shadow under the crown
    for ry, rx in ((6, 14), (17, 22), (26, 16)):
        d.line([rx, ry, rx - 2, ry + 3], fill=BONE_L, width=1)
    rect(d, 20, 9, 21, 11, (86, 104, 74))
    rect(d, 14, 24, 16, 25, (86, 104, 74))


def draw_crypt_wall_corner(d):
    # Junction piece: both arms crossing, so L-corners, T-junctions and 4-way
    # crossings read as one continuous bone wall. Same arm geometry as
    # draw_wall_corner.
    bone_courses(d, 0, 10, 31, 31)      # horizontal arm
    bone_courses(d, 10, 0, 31, 31)      # vertical arm
    for x in range(0, 10, 8):
        _skull_tooth(d, x, 4)
    for y in range(0, 10, 8):
        _skull_tooth(d, 4, y)
    rect(d, 0, 10, 9, 10, BONE_D)       # parapet shadow, west arm
    rect(d, 10, 0, 10, 9, BONE_D)       # parapet shadow, north arm
    rect(d, 14, 18, 16, 19, (86, 104, 74))


def draw_corpse_field(d):
    # The undead "farm": not a crop at all, but a worked burial field. Keeps
    # draw_farm's furrow rhythm so it still reads as cultivated ground from
    # across the map — the rows are grave mounds and what stands in them is
    # bone rather than wheat.
    rect(d, 0, 0, 31, 31, GRAVE_DIRT)
    scatter(d, 4211, 26, GRAVE_DIRT_D)
    for y in range(4, 28, 6):
        rect(d, 3, y, 28, y + 2, GRAVE_DIRT_D)        # trough between mounds
        rect(d, 3, y - 1, 28, y - 1, GRAVE_DIRT_L)    # lit crest of the mound
        for x in range(4, 28, 6):
            # a bone standing where a crop tuft would be
            rect(d, x, y - 3, x + 1, y, BONE_D)
            rect(d, x, y - 3, x, y, BONE)
    # two half-buried skulls and a wisp of soul-light rising off the field
    d.ellipse([6, 17, 11, 22], fill=BONE, outline=BONE_D)
    rect(d, 7, 19, 7, 20, VOID); rect(d, 10, 19, 10, 20, VOID)
    d.ellipse([21, 8, 25, 12], fill=BONE, outline=BONE_D)
    rect(d, 22, 9, 22, 10, VOID); rect(d, 24, 9, 24, 10, VOID)
    rect(d, 16, 12, 16, 16, SOUL)
    rect(d, 16, 13, 16, 14, SOUL_L)
    # bone posts instead of the human field's timber rails
    rect(d, 0, 0, 31, 2, BONE_D)
    rect(d, 0, 0, 31, 0, BONE)
    rect(d, 0, 29, 31, 31, BONE_D)
    rect(d, 0, 29, 31, 29, BONE)


def draw_bone_quarry(d):
    # The undead quarry: the same stepped excavation as the human one, but
    # they are digging bone out of the ground, not rock — pale strata, bone
    # slabs stacked at the rim, and a gibbet where the timber crane goes.
    rect(d, 0, 0, 31, 31, GRAVE_DIRT)
    scatter(d, 991, 20, GRAVE_DIRT_D)
    # The steps must get DARKER as they descend or the pit reads as a flat
    # pale slab — the depth is carried entirely by that gradient, exactly as
    # in the human quarry. Only the thin lit tread on each step is bone-pale;
    # a first pass made whole steps bone-coloured and the hole vanished.
    for x0, y0, x1, y1, c in [(4, 14, 27, 29, (96, 92, 80)),
                              (6, 16, 25, 27, (68, 65, 56)),
                              (8, 18, 23, 25, (42, 40, 34))]:
        rect(d, x0, y0, x1, y1, c)
        rect(d, x0, y0, x1, y0, BONE_D)               # bone stratum in the cut
        rect(d, x0, y0 + 1, x0, y1, shade(c, 1.25))   # lit left face
    # ribs breaking out of the lowest cut face — this is a seam of bodies
    for rx in (11, 15, 19):
        d.line([rx, 19, rx + 2, 23], fill=BONE, width=1)
        rect(d, rx, 19, rx, 19, BONE_L)
    # cut bone slabs stacked at the rim
    shaded_box(d, 3, 8, 9, 13, BONE)
    shaded_box(d, 10, 10, 15, 13, BONE_D)
    # gibbet: a bone post and arm with a skull swinging from it
    rect(d, 22, 2, 24, 14, BONE_D)
    rect(d, 22, 2, 22, 14, BONE)
    d.line([23, 3, 29, 5], fill=BONE, width=2)
    d.line([29, 5, 29, 9], fill=VOID, width=1)
    d.ellipse([27, 9, 31, 13], fill=BONE, outline=BONE_D)
    rect(d, 28, 10, 28, 11, VOID); rect(d, 30, 10, 30, 11, VOID)


def draw_charnel_rack(d):
    # The undead lumber camp: they are not cutting timber, they are stripping
    # and stacking the dead. Keeps draw_lumber_camp's stacked-pile silhouette
    # and lean-to shed so the building type is still readable, in bone and
    # grave dirt rather than fresh-cut wood.
    rect(d, 0, 0, 31, 31, GRAVE_DIRT)
    scatter(d, 3307, 22, GRAVE_DIRT_D)
    ground_shadow(d, 4, 27, 27, 3)
    # Stacked long-bones seen SIDE-ON, in the same three receding rows as the
    # logs. Drawn end-on first (a ring with a lit centre, mirroring the log
    # pile's end grain) and it read as a heap of eyeballs at 32px — the pale
    # ring around a paler middle is just too close to a pupil. Side-on with
    # knuckled ends reads unmistakably as bone and keeps the woodpile mass.
    for i, y in enumerate([22, 18, 14]):
        off = i * 2
        for x in range(5 + off, 25 - off, 7):
            rect(d, x + 1, y + 1, x + 5, y + 3, BONE)          # shaft
            rect(d, x + 1, y + 1, x + 5, y + 1, BONE_L)        # lit top
            rect(d, x + 1, y + 3, x + 5, y + 3, BONE_D)        # underside
            d.ellipse([x, y, x + 2, y + 4], fill=BONE, outline=BONE_D)      # knuckle
            d.ellipse([x + 4, y, x + 6, y + 4], fill=BONE, outline=BONE_D)  # knuckle
    # a drying rack where the sawyer's shed stands on the human version
    shaded_box(d, 20, 6, 29, 18, GRAVE_DIRT)
    rect(d, 20, 6, 29, 6, BONE_D)
    for px in (21, 24, 27):
        rect(d, px, 6, px, 18, BONE_D)
    d.polygon([(18, 6), (31, 6), (31, 1)], fill=BONE_D)
    d.polygon([(19, 6), (30, 6), (30, 3)], fill=BONE)
    # a skull hung on the rack
    d.ellipse([23, 8, 27, 12], fill=BONE, outline=BONE_D)
    rect(d, 24, 9, 24, 10, VOID); rect(d, 26, 9, 26, 10, VOID)


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
    ("grove_heart", draw_grove_heart),
    ("grove_bower", draw_grove_bower),
    ("grove_bough", draw_grove_bough),
    ("grove_spire", draw_grove_spire),
    ("grove_thicket", draw_grove_thicket),
    ("grove_ent", draw_grove_ent),
    ("grove_elder", draw_grove_elder),
    ("sealed_pass", draw_sealed_pass),
    ("bone_pile", draw_bone_pile),
    ("bone_pile_corrupted", draw_bone_pile_corrupted),
    ("bone_yard", draw_bone_yard),
    ("ritual_pit", draw_ritual_pit),
    ("flesh_golem", draw_flesh_golem),
    ("stake_wall", draw_stake_wall),
    ("tribe_hunt", draw_tribe_hunt),
    ("tribe_timber", draw_tribe_timber),
    ("tribe_pit", draw_tribe_pit),
    ("tribe_cache", draw_tribe_cache),
    ("tribe_stock", draw_tribe_stock),
    ("tribe_gate", draw_tribe_gate),
    ("tribe_warlodge", draw_tribe_warlodge),
    ("tribe_lodge", draw_tribe_lodge),
    ("tribe_hut", draw_tribe_hut),
    ("tribe_totem", draw_tribe_totem),
    ("tribe_worker", draw_tribe_worker),
    ("crypt_wall", draw_crypt_wall),
    ("corpse_field", draw_corpse_field),
    ("bone_quarry", draw_bone_quarry),
    ("charnel_rack", draw_charnel_rack),
    ("crypt_wall_v", draw_crypt_wall_v),
    ("crypt_wall_corner", draw_crypt_wall_corner),
    ("bone_fence", draw_bone_fence),
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
