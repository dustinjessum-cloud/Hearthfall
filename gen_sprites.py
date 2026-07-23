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
ROWS = 10  # 6x10 = 60 slots (was 6x9=54, which the undead art filled exactly)

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
    rect(d, 0, 0, 31, 31, CREEP_GREY)
    # darker grey mottling
    for x, y, w, h in [(2,3,10,8), (17,13,11,9), (5,20,9,8), (21,2,8,7)]:
        d.ellipse([x, y, x+w, y+h], fill=CREEP_GREY_D)
    # discoloration throughout — a couple of sickly-green and grave-brown patches
    for x, y, w, h in [(11,9,11,8), (19,19,10,8)]:
        d.ellipse([x, y, x+w, y+h], fill=CREEP_GREEN_T)
    for x, y, w, h in [(0,16,9,9), (13,0,8,7)]:
        d.ellipse([x, y, x+w, y+h], fill=CREEP_BROWN_T)
    # sunken cracks
    for x, y, w, h in [(6,24,8,6), (23,9,7,7)]:
        d.ellipse([x, y, x+w, y+h], fill=CREEP_BLACK_T)
    d.line([3,15, 11,12, 19,17, 28,13], fill=CREEP_GREY_D, width=1)
    d.line([6,26, 14,22, 22,27], fill=CREEP_BLACK_T, width=1)

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
    # a skinny goblinoid spear-thrower: wiry yellow-green, big ears, ragged
    # scraps, one arm cocked back with a spear ready to hurl.
    SKN, SKN_D = (140, 132, 78), (106, 100, 56)
    RAG = (92, 72, 52)
    SHAFT, TIP = (120, 96, 60), (168, 168, 176)
    EYE = (200, 60, 40)
    # spear, cocked back over the shoulder, angled to throw
    d.line([9, 4, 24, 20], fill=SHAFT, width=1)
    d.polygon([(23, 18), (26, 22), (22, 22)], fill=TIP)   # spearhead, low-front
    # skinny ragged torso
    rect(d, 13, 12, 18, 22, RAG)
    rect(d, 13, 12, 13, 22, SKN_D)
    # thin limbs — left arm cocked back holding the spear, right forward
    rect(d, 10, 8, 13, 13, SKN)          # rear/throwing arm up-back
    rect(d, 18, 13, 21, 18, SKN)         # lead arm forward
    rect(d, 13, 22, 15, 30, SKN_D)       # legs
    rect(d, 16, 22, 18, 30, SKN_D)
    # big-eared head
    rect(d, 13, 5, 18, 11, SKN)
    d.polygon([(13, 6), (10, 4), (13, 9)], fill=SKN)   # left ear
    d.polygon([(18, 6), (21, 4), (18, 9)], fill=SKN)   # right ear
    rect(d, 14, 8, 15, 9, EYE); rect(d, 16, 8, 17, 9, EYE)

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
    for cx, cy in [(9,20),(21,19),(15,10)]:
        rect(d, cx-1, cy+4, cx+1, cy+8, TRUNK_C)
        d.polygon([(cx-7,cy+5),(cx+7,cy+5),(cx,cy-9)], fill=CANOPY_DARK)
        d.polygon([(cx-5,cy),(cx+5,cy),(cx,cy-9)], fill=CANOPY_LIGHT)
    for x,y in [(9,15),(21,13)]:
        d.ellipse([x,y,x+2,y+2], fill=(150,190,120))  # sickly fungal blooms

def draw_stone_deposit_corrupted(d):
    # same idea for stone: creep ground, rocks re-tinted and veined with
    # creep growth instead of being wiped off the map
    draw_creep(d)
    ROCK_C   = (104, 104, 100)      # ashen grey rock
    ROCK_C_D = (76, 76, 74)
    for x, y, w, h, c in [(6,14,10,10,ROCK_C),(14,16,12,12,ROCK_C_D),(9,10,8,8,ROCK_C)]:
        d.ellipse([x, y, x+w, y+h], fill=c, outline=(20,20,22))
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
