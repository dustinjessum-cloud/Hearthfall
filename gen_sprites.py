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
ROWS = 9

frames = {}
order = []

def new_canvas():
    return Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))

def rect(d, x0, y0, x1, y1, fill):
    d.rectangle([x0, y0, x1, y1], fill=fill)

# ---- palette ----
GRASS = (86, 160, 61)
GRASS_D = (70, 138, 48)
DIRT = (155, 118, 83)
DIRT_D = (128, 94, 63)
WATER = (58, 108, 173)
WATER_L = (84, 138, 201)
STONE = (140, 140, 148)
STONE_D = (105, 105, 113)
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
    rect(d, 0, 0, 31, 31, GRASS)
    for x, y in [(4,4),(14,9),(22,4),(6,20),(20,22),(27,14)]:
        rect(d, x, y, x+2, y+2, GRASS_D)

def draw_forest(d):
    draw_grass(d)
    for cx, cy in [(9,20),(21,19),(15,10)]:
        rect(d, cx-1, cy+4, cx+1, cy+8, WOOD_D)  # trunk
        d.polygon([(cx-7,cy+5),(cx+7,cy+5),(cx,cy-9)], fill=(46,110,40))
        d.polygon([(cx-5,cy),(cx+5,cy),(cx,cy-9)], fill=(58,132,50))

def draw_stone_deposit(d):
    draw_grass(d)
    for x, y, w, h, c in [(6,14,10,10,STONE),(14,16,12,12,STONE_D),(9,10,8,8,STONE)]:
        d.ellipse([x, y, x+w, y+h], fill=c, outline=BLACK)

def draw_water(d):
    rect(d, 0, 0, 31, 31, WATER)
    for y in (8, 16, 24):
        for x in range(0, 32, 8):
            rect(d, x+2, y, x+6, y+1, WATER_L)

def draw_dirt(d):
    rect(d, 0, 0, 31, 31, DIRT)
    for x, y in [(5,5),(19,8),(9,18),(24,22)]:
        rect(d, x, y, x+2, y+2, DIRT_D)

def draw_town_hall(d):
    # a proper keep: stone ground floor, half-timbered upper story, grand
    # roof, lit windows and a pennant — not just a big house.
    # Transparent background so it sits on whatever tile it was built on.
    # stone ground floor with mortar lines
    rect(d, 3, 16, 28, 29, STONE)
    rect(d, 3, 16, 28, 18, STONE_D)
    for y in range(21, 29, 4):
        rect(d, 3, y, 28, y, STONE_D)
    # half-timbered upper floor
    rect(d, 5, 9, 26, 16, TAN)
    rect(d, 5, 9, 26, 10, TAN_D)
    for x in (8, 15, 22):
        rect(d, x, 9, x+1, 16, WOOD_D)
    # grand roof
    d.polygon([(2,9),(29,9),(15,1)], fill=ROOF)
    d.polygon([(2,9),(29,9),(15,1)], outline=ROOF_D)
    # arched oak door
    rect(d, 13, 20, 18, 29, WOOD_D)
    rect(d, 13, 19, 18, 20, WOOD)
    # windows glowing gold
    rect(d, 7, 11, 10, 14, GOLD)
    rect(d, 21, 11, 24, 14, GOLD)
    rect(d, 6, 21, 9, 24, GOLD)
    rect(d, 22, 21, 25, 24, GOLD)
    # banner pole + red pennant at the peak
    rect(d, 15, 0, 16, 3, WOOD_D)
    d.polygon([(16,0),(24,1),(16,3)], fill=(190, 52, 45))

def draw_house(d):
    draw_dirt(d)
    rect(d, 6, 17, 26, 29, TAN)
    d.polygon([(4,17),(28,17),(16,6)], fill=ROOF)
    d.polygon([(4,17),(28,17),(16,6)], outline=ROOF_D)
    rect(d, 14, 21, 18, 29, WOOD_D)
    rect(d, 8, 20, 11, 23, WATER)

def draw_farm(d):
    rect(d, 0, 0, 31, 31, (109, 87, 58))
    for y in range(4, 28, 6):
        rect(d, 3, y, 28, y+2, (94, 74, 48))
        for x in range(4, 28, 6):
            rect(d, x, y-3, x+1, y, (196, 176, 60))
    rect(d, 0, 0, 31, 2, WOOD_D)
    rect(d, 0, 29, 31, 31, WOOD_D)

def draw_lumber_camp(d):
    draw_dirt(d)
    # log pile
    for i, y in enumerate([22, 18, 14]):
        off = i * 2
        for x in range(6+off, 24-off, 6):
            d.ellipse([x, y, x+7, y+5], fill=WOOD, outline=WOOD_D)
    rect(d, 20, 6, 29, 18, TAN_D)
    d.polygon([(18,6),(31,6),(24,-1+3)], fill=ROOF_D)

def draw_quarry(d):
    # an excavated pit with stepped walls, cut blocks, and a timber crane —
    # clearly industry, not just another rock pile
    draw_dirt(d)
    rect(d, 4, 14, 27, 29, (88, 88, 96))
    rect(d, 6, 16, 25, 27, (70, 70, 78))
    rect(d, 8, 18, 23, 25, (56, 56, 64))
    # cut stone blocks stacked at the rim
    rect(d, 3, 8, 9, 13, STONE)
    rect(d, 3, 8, 9, 9, STONE_D)
    rect(d, 10, 10, 15, 13, STONE_D)
    # timber crane with a hoisted block
    rect(d, 22, 2, 24, 14, WOOD)
    d.line([23, 3, 29, 8], fill=WOOD_D, width=2)
    d.line([29, 8, 29, 13], fill=BLACK, width=1)
    rect(d, 27, 13, 31, 16, STONE)

def draw_wall(d):
    rect(d, 0, 10, 31, 31, STONE)
    rect(d, 0, 10, 31, 13, STONE_D)
    for x in range(0, 32, 8):
        rect(d, x, 4, x+5, 10, STONE)
    for y in range(14, 31, 6):
        rect(d, 0, y, 31, y, STONE_D)

def draw_wall_v(d):
    # 90-degree rotated wall segment so vertical runs connect cleanly too
    rect(d, 10, 0, 31, 31, STONE)
    rect(d, 10, 0, 13, 31, STONE_D)
    for y in range(0, 32, 8):
        rect(d, 4, y, 10, y+5, STONE)
    for x in range(14, 31, 6):
        rect(d, x, 0, x, 31, STONE_D)

def draw_tower(d):
    rect(d, 5, 8, 26, 31, STONE)
    for x in range(5, 27, 5):
        rect(d, x, 8, x+1, 31, STONE_D)
    for x in range(4, 27, 6):
        rect(d, x, 2, x+3, 8, STONE)
    rect(d, 12, 16, 13, 24, BLACK)

def draw_wall_gate(d):
    rect(d, 0, 10, 9, 31, STONE)
    rect(d, 22, 10, 31, 31, STONE)
    for x in range(0, 10, 8):
        rect(d, x, 4, x+5, 10, STONE)
    for x in range(22, 32, 8):
        rect(d, x, 4, x+5, 10, STONE)
    rect(d, 10, 14, 21, 31, WOOD_D)
    for x in range(11, 21, 3):
        rect(d, x, 14, x+1, 31, WOOD)

def humanoid(d, tunic, weapon=None):
    rect(d, 14, 6, 17, 9, SKIN)  # head
    rect(d, 12, 10, 19, 20, tunic)  # body
    rect(d, 12, 20, 14, 27, (60,50,40))  # leg
    rect(d, 17, 20, 19, 27, (60,50,40))  # leg
    rect(d, 9, 11, 11, 18, SKIN)  # arm
    rect(d, 20, 11, 22, 18, SKIN)  # arm
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
    # battering ram: log on a wheeled frame, side view
    rect(d, 4, 22, 27, 26, WOOD_D)      # frame base
    rect(d, 6, 26, 9, 29, DARKGREY)     # wheel L
    rect(d, 22, 26, 25, 29, DARKGREY)   # wheel R
    rect(d, 7, 10, 10, 22, WOOD)        # post L
    rect(d, 21, 10, 24, 22, WOOD)       # post R
    rect(d, 5, 8, 26, 11, ROOF_D)       # roof beam
    rect(d, 2, 14, 29, 19, WOOD)        # the ram log itself
    rect(d, 2, 14, 29, 15, WOOD_D)
    rect(d, 26, 13, 31, 20, STONE_D)    # iron head

def draw_granary(d):
    # round grain silo with a conical thatch roof and a grain sack out front
    rect(d, 8, 12, 23, 29, TAN)
    rect(d, 8, 12, 11, 29, TAN_D)       # shading
    rect(d, 6, 8, 25, 13, ROOF)         # roof band
    rect(d, 10, 4, 21, 9, ROOF)         # roof top
    rect(d, 10, 4, 21, 5, ROOF_D)
    rect(d, 14, 20, 17, 29, WOOD_D)     # door
    rect(d, 24, 24, 29, 29, GOLD)       # grain sack
    rect(d, 24, 24, 29, 25, TAN_D)

def draw_warehouse(d):
    # long shed stacked with crates
    rect(d, 3, 14, 28, 29, WOOD)
    rect(d, 3, 14, 6, 29, WOOD_D)
    rect(d, 1, 10, 30, 15, STONE_D)     # flat stone roof
    rect(d, 6, 20, 12, 26, TAN)         # crate 1
    rect(d, 6, 20, 12, 21, TAN_D)
    rect(d, 14, 18, 21, 26, TAN_D)      # crate 2
    rect(d, 14, 18, 21, 19, TAN)
    rect(d, 23, 21, 27, 26, STONE)      # stone block

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
    # junction piece: horizontal + vertical bands crossing, so L-corners,
    # T-junctions and 4-way crossings all read as one continuous wall
    rect(d, 0, 10, 31, 31, STONE)        # horizontal body
    rect(d, 10, 0, 31, 31, STONE)        # vertical body
    rect(d, 0, 10, 9, 13, STONE_D)       # horiz top shading (left of joint)
    rect(d, 10, 0, 13, 9, STONE_D)       # vert left shading (above joint)
    rect(d, 10, 10, 13, 13, STONE_D)     # joint shading
    for x in range(0, 10, 8):            # crenellations, west arm
        rect(d, x, 4, x+5, 10, STONE)
    for y in range(0, 10, 8):            # crenellations, north arm
        rect(d, 4, y, 10, y+5, STONE)
    for y in range(14, 31, 6):           # mortar lines
        rect(d, 0, y, 31, y, STONE_D)
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
    # legs
    rect(d, 11, 22, 14, 29, FUR_D)
    rect(d, 17, 22, 20, 29, FUR_D)
    rect(d, 11, 28, 14, 29, BLACK)   # hooves
    rect(d, 17, 28, 20, 29, BLACK)
    # broad body
    rect(d, 9, 12, 22, 22, FUR)
    rect(d, 9, 12, 22, 14, FUR_D)
    rect(d, 13, 15, 18, 21, TAN_D)   # belly patch
    # arms
    rect(d, 6, 13, 8, 21, FUR)
    rect(d, 23, 13, 25, 21, FUR)     # grips the staff
    # bull head
    rect(d, 12, 4, 19, 11, FUR)
    rect(d, 13, 8, 18, 11, (166, 124, 90))  # muzzle
    rect(d, 14, 9, 15, 10, BLACK)           # nostrils
    rect(d, 16, 9, 17, 10, BLACK)
    rect(d, 13, 5, 14, 6, (210, 50, 40))    # glowing eyes
    rect(d, 17, 5, 18, 6, (210, 50, 40))
    # horns curving out and up
    rect(d, 9, 3, 12, 5, HORN)
    rect(d, 8, 0, 10, 4, HORN)
    rect(d, 19, 3, 22, 5, HORN)
    rect(d, 21, 0, 23, 4, HORN)

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
    rect(d, 11, 12, 21, 29, TAN)
    rect(d, 11, 12, 13, 29, TAN_D)
    d.polygon([(9,12),(23,12),(16,4)], fill=ROOF)
    rect(d, 14, 22, 18, 29, WOOD_D)           # door
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
    # a stone watchtower rises on the west wing
    rect(d, 0, 6, 5, 29, STONE)
    rect(d, 0, 6, 5, 8, STONE_D)
    d.polygon([(0,6),(6,6),(3,1)], fill=ROOF_D)
    rect(d, 1, 12, 3, 15, GOLD)

def draw_town_hall_3(d):
    draw_town_hall_2(d)
    # twin tower on the east wing — full keep
    rect(d, 26, 6, 31, 29, STONE)
    rect(d, 26, 6, 31, 8, STONE_D)
    d.polygon([(25,6),(31,6),(28,1)], fill=ROOF_D)
    rect(d, 28, 12, 30, 15, GOLD)

# ---- the Swarm ----
CREEP_PURPLE   = (60, 26, 88, 255)   # opaque dark purple base — deliberately
                                      # darker than the old runtime tint
CREEP_PURPLE_D = (42, 16, 64, 255)   # opaque, darker mottling
CREEP_BLACK_T  = (10, 6, 16, 145)    # semi-transparent black — the game's
                                      # dark canvas bleeds through these
                                      # patches, which is what makes them
                                      # read as "more see-through"

def draw_creep(d):
    rect(d, 0, 0, 31, 31, CREEP_PURPLE)
    for x, y, w, h in [(2,3,10,8), (17,13,11,9), (5,20,9,8), (21,2,8,7)]:
        d.ellipse([x, y, x+w, y+h], fill=CREEP_PURPLE_D)
    for x, y, w, h in [(11,9,12,10), (0,16,9,10), (19,19,11,9), (13,0,8,7)]:
        d.ellipse([x, y, x+w, y+h], fill=CREEP_BLACK_T)
    d.line([3,15, 11,11, 19,17, 28,13], fill=CREEP_PURPLE_D, width=1)
    d.line([6,25, 14,21, 22,26], fill=CREEP_BLACK_T, width=1)

def draw_broodmother(d):
    # a genuinely spider-shaped hero: bulbous abdomen, jointed legs,
    # mandibles and glowing eyes — no longer a re-tinted Minotaur.
    BM_PURPLE   = (58, 26, 84)
    BM_PURPLE_D = (38, 14, 58)
    BM_BLACK    = (16, 11, 22)
    BM_EYE      = (232, 130, 255)
    # legs first (drawn behind the body) — 4 jointed pairs, splayed wide
    left_hips  = [(12,15),(11,17),(11,19),(12,21)]
    right_hips = [(20,15),(21,17),(21,19),(20,21)]
    for i,(hx,hy) in enumerate(left_hips):
        kx,ky = hx-7, hy+1+i
        fx,fy = hx-11, hy+6+i*2
        d.line([hx,hy, kx,ky, fx,fy], fill=BM_BLACK, width=2)
    for i,(hx,hy) in enumerate(right_hips):
        kx,ky = hx+7, hy+1+i
        fx,fy = hx+11, hy+6+i*2
        d.line([hx,hy, kx,ky, fx,fy], fill=BM_BLACK, width=2)
    # abdomen — large, plump, lower body
    d.ellipse([8,15,23,29], fill=BM_PURPLE, outline=BM_PURPLE_D)
    d.ellipse([11,19,20,27], fill=BM_PURPLE_D)
    # thorax / head — smaller, upper-front
    d.ellipse([10,5,21,17], fill=BM_PURPLE, outline=BM_PURPLE_D)
    # mandibles / claws
    d.polygon([(11,13),(7,18),(12,17)], fill=BM_BLACK)
    d.polygon([(20,13),(24,18),(19,17)], fill=BM_BLACK)
    # glowing eyes
    rect(d, 13,9,14,10, BM_EYE)
    rect(d, 17,9,18,10, BM_EYE)

def draw_forest_corrupted(d):
    # a forest tile the creep has spread into: creep ground underneath,
    # the trees themselves re-themed sick purple/black rather than erased —
    # the resource stays visible and harvestable, just visibly infected
    draw_creep(d)
    TRUNK_C = (35, 20, 45)
    CANOPY_DARK = (52, 22, 68)
    CANOPY_LIGHT = (78, 36, 98)
    for cx, cy in [(9,20),(21,19),(15,10)]:
        rect(d, cx-1, cy+4, cx+1, cy+8, TRUNK_C)
        d.polygon([(cx-7,cy+5),(cx+7,cy+5),(cx,cy-9)], fill=CANOPY_DARK)
        d.polygon([(cx-5,cy),(cx+5,cy),(cx,cy-9)], fill=CANOPY_LIGHT)
    for x,y in [(9,15),(21,13)]:
        d.ellipse([x,y,x+2,y+2], fill=(220,110,230))  # sickly pustules

def draw_stone_deposit_corrupted(d):
    # same idea for stone: creep ground, rocks re-tinted and veined with
    # creep growth instead of being wiped off the map
    draw_creep(d)
    ROCK_C   = (92, 66, 108)
    ROCK_C_D = (62, 42, 78)
    for x, y, w, h, c in [(6,14,10,10,ROCK_C),(14,16,12,12,ROCK_C_D),(9,10,8,8,ROCK_C)]:
        d.ellipse([x, y, x+w, y+h], fill=c, outline=(18,10,24))
    d.line([8,18, 14,22, 20,19], fill=(200,110,230), width=1)

def draw_zergling_quad(d):
    # side-view quadruped (the ram sprite already establishes side-view as
    # fair game in this art style) — low body, four jointed legs, a tail,
    # spine ridges, and a fanged head. Neutral tones matching the existing
    # enemy_swordsman palette so the runtime pink tint still applies the
    # same way it always has.
    BODY_D = (40, 40, 46)
    d.polygon([(2,17),(8,14),(8,20)], fill=BODY_D)  # tail
    d.line([9,20, 8,25, 6,29], fill=BODY_D, width=3)    # rear leg 1
    d.line([12,20, 13,25, 15,29], fill=BODY_D, width=3) # rear leg 2
    d.line([20,20, 21,25, 19,29], fill=BODY_D, width=3) # front leg 1
    d.line([23,19, 25,25, 27,29], fill=BODY_D, width=3) # front leg 2
    d.ellipse([6,11,26,23], fill=DARKGREY, outline=BODY_D)  # body
    for x in (11,16,21):
        d.polygon([(x-2,11),(x+2,11),(x,7)], fill=BODY_D)   # spine ridges
    d.ellipse([21,8,31,18], fill=DARKGREY, outline=BODY_D)   # head
    d.polygon([(27,15),(31,17),(26,18)], fill=SKIN)  # lower fang
    d.polygon([(27,10),(31,9),(27,13)], fill=SKIN)   # upper fang
    rect(d, 26,11,27,12, (255,80,90))  # feral eye

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
