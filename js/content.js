// Embedded directly so this is a single, fully self-contained file that
// works offline and from a plain double-clicked file:// path. Loaded into
// Phaser via textures.addBase64() (see MainScene.create()) rather than
// this.load.spritesheet(), which rejects data URIs.
const SPRITESHEET_B64 = "data:image/png;base64,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";

// ---------------------------------------------------------------------
// Frame index map (matches gen_sprites.py DRAWERS order, 6 cols/row)
// ---------------------------------------------------------------------
const FRAME = {
  grass:0, forest:1, stone_deposit:2, water:3, dirt:4,
  town_hall:5, house:6, farm:7, lumber_camp:8, quarry:9,
  wall:10, wall_gate:11, tower:12, archer:13, villager:14,
  enemy_raider:15, enemy_swordsman:16, arrow:17,
  icon_food:18, icon_wood:19, icon_stone:20, icon_population:21,
  select:22, blocked:23, wall_v:24, enemy_ram:25, granary:26, warehouse:27,
  wall_corner:28, minotaur:29, repairman:30, mill:31, rally_flag:32,
  granary_2:33, granary_3:34, warehouse_2:35, warehouse_3:36, town_hall_2:37, town_hall_3:38,
  creep:39, broodmother:40, forest_corrupted:41, stone_deposit_corrupted:42, zergling_quad:43, spitter_naga:44,
  wildstone_deposit:45, icon_wildstone:46, wildstone_refinery:47, wildstone_deposit_corrupted:48
};

const TILE = 32;
const MAP_W = 44, MAP_H = 32;

const BUILD_DEFS = {
  house:      { name:'House',       cost:{wood:20},            hp:60,  frame:'house',      popCap:4 },
  farm:       { name:'Farm',        cost:{wood:15},             hp:50,  frame:'farm',       produces:{food:4},  needsWorker:true },
  lumber_camp:{ name:'Lumber Camp', cost:{wood:15},             hp:50,  frame:'lumber_camp',produces:{wood:4},  needsWorker:true, bonusNear:'forest' },
  quarry:     { name:'Quarry',      cost:{wood:20,stone:10},    hp:60,  frame:'quarry',     produces:{stone:3}, needsWorker:true, bonusNear:'stone_deposit' },
  // Never player-placed — generateMap() creates one of these automatically
  // sitting exactly on each Wildstone deposit tile, invisible (the crystal
  // outcrop IS the visual). It exists purely so the existing camp/gatherer
  // machinery (assignment, walk-out-harvest-walk-home, hauling, depletion)
  // works for Wildstone with zero new code and zero player construction.
  // Built directly ON a Wildstone deposit tile — like an oil pump on the
  // vein itself, not a camp built nearby. Gated behind Town Hall/Hive
  // level 3 (tcLevelReq), same as everything else that consumes the
  // resource it produces (evolutions). Once built, behaves exactly like a
  // Lumber Camp or Quarry — normal auto-staffing applies, no special
  // exclusion needed anymore now that it's a real, deliberate investment.
  wildstone_refinery: { name:'Wildstone Refinery', cost:{wood:30,stone:40}, hp:80, frame:'wildstone_refinery',
                         produces:{wildstone:1}, needsWorker:true, bonusNear:'wildstone_deposit', tcLevelReq:3 },
  granary:    { name:'Granary',     cost:{wood:25},             hp:80,  frame:'granary',    nearTC:true },
  warehouse:  { name:'Warehouse',   cost:{wood:30},             hp:80,  frame:'warehouse',  nearTC:true },
  mill:       { name:'Mill',        cost:{wood:35,stone:10},    hp:70,  frame:'mill',       isMill:true, needsWorker:true, staffed:true },
  bakery:     { name:'Bakery',      cost:{wood:30,stone:10},    hp:80,  frame:'house',      tint:0xd8a060, isBakery:true, needsWorker:true, staffed:true },
  market:     { name:'Market',      cost:{wood:40,stone:20},    hp:80,  frame:'warehouse',  tint:0xffd76b, isMarket:true },
  mason:      { name:'Mason',       cost:{wood:25,stone:20},    hp:70,  frame:'quarry',     tint:0xbfc4cc, isMason:true },
  apothecary: { name:'Apothecary',  cost:{wood:30,stone:15},    hp:70,  frame:'house',      tint:0x9fe8a0, heals:true },
  well:       { name:'Well',        cost:{wood:10,stone:15},    hp:60,  frame:'stone_deposit', tint:0x9fc4ff, happy:true },
  tavern:     { name:'Tavern',      cost:{wood:40,stone:10},    hp:80,  frame:'house',      tint:0xffb066, happy:true },
  road:       { name:'Road',        cost:{wood:2},              frame:'dirt',               isRoad:true },
  wall:       { name:'Wall',        cost:{stone:5},             hp:120, frame:'wall',       blocksPath:true },
  gate:       { name:'Gate',        cost:{stone:6, wood:4},     hp:120, frame:'wall_gate',  tint:0xb8c4d8, blocksPath:true, friendlyPassable:true },
  tower:      { name:'Tower',       cost:{wood:10,stone:25},    hp:150, frame:'tower',      blocksPath:true, garrison:true, attack:{range:4.2,damage:7,damageLow:4,cooldownMs:900} },
  barracks:   { name:'Barracks',    cost:{wood:30,stone:15},    hp:100, frame:'wall_gate',  trains:'archer' },
};

// Storage buildings: 5 levels each. Granaries hold food; warehouses hold
// wood AND stone. They must sit close to the Town Center (NEAR_TC_RADIUS).
// Levels 4 and 5 are gated behind Town Hall level 2 and 3 respectively —
// a grander town can organize grander stockpiles.
const STORAGE_LEVELS = {
  granary:   { bonus:[120,250,450,750,1200], upCost:[{wood:40,stone:20},{wood:80,stone:50},{wood:150,stone:100},{wood:260,stone:180}],
               upMs:[12000,18000,24000,30000] },
  warehouse: { bonus:[120,250,450,750,1200], upCost:[{wood:40,stone:20},{wood:80,stone:50},{wood:150,stone:100},{wood:260,stone:180}],
               upMs:[12000,18000,24000,30000] },
};
// storage level -> minimum Town Hall level required to buy it
const STORAGE_TC_REQ = { 4: 2, 5: 3 };
const NEAR_TC_RADIUS = 6;

// ---- Town Hall upgrades: a mix of everything ----
// Each level: +HP, +base storage for every resource, +pop cap, faster
// villager training. At level 3 the Town Hall mans its own battlements
// and shoots back.
const TC_LEVELS = {
  maxLevel: 3,
  upCost:       [ {wood:150,stone:100}, {wood:300,stone:250} ], // 1->2, 2->3
  upMs:         [ 25000, 35000 ], // the central building's upgrades take longer
  hpBonus:      [ 250, 250 ],
  storageBonus: [ 50, 100 ],   // added to the base cap per level gained
  popBonus:     [ 2, 3 ],
  trainMs:      [ 20000, 15000, 12000 ], // villager train time at TC level 1/2/3
  attack: { range:4.5, damage:8, cooldownMs:900 }, // active at max level
};

// ---- roads & logistics ----
// Cheap dirt roads speed up anyone walking on them (haulers AND raiders —
// good infrastructure cuts both ways). Chain-place like walls.
const ROAD_SPEED = 1.5;

// ---- wheat -> flour -> bread production chain ----
// Farms grow WHEAT. Staffed Mills grind wheat into FLOUR. Staffed Bakeries
// bake flour into food at a 1.5x premium — bread is worth more than grain.
// The Town Hall can hand-process a weak trickle of wheat straight to food
// (0.6x) so the early game works before the chain is built.
const MILLING = {
  handCapacity: 4,   // wheat/tick the TC can hand-process
  handRate: 0.6,     // food per wheat, hand-processed (wasteful)
  millCapacity: 10,  // wheat/tick per staffed Mill -> flour 1:1
  bakeCapacity: 8,   // flour/tick per staffed Bakery
  bakeRate: 1.5,     // food per flour — the chain's payoff
};

// ---- upkeep economy ----
// Nothing runs for free: soldiers eat double rations (see economyTick),
// and every standing building draws a trickle of maintenance wood. If the
// wood runs dry, buildings weather — slowly losing HP until you restock.
const UPKEEP = {
  soldierFoodPerTick: 1.0,   // vs 0.5 for villagers
  woodPerBuildingPerTick: 0.03,
  decayHpPerTick: 1,         // damage per tick while maintenance is unpaid
};

// ---- bandit camps ----
// Camps squat at the map fringes and send the skirmishers. Burn one down
// with your soldiers to stop the raids from that flank and take its loot.
const BANDIT_CAMP = { count:[2,3], hp:220, minDistFromTC:12, loot:{wood:80, stone:40, gold:40} };

// ---- the Captain (hero unit) ----
// One per town. Strong in melee, charges like a swordsman, and nearby
// soldiers fight 25% harder under his banner. If he falls, the Town Hall
// can revive him — heroes are expensive, not disposable.
const CAPTAIN = {
  cost: 60, reviveCost: 75, // gold
  hp: 120,
  attack: { range:1.4, damage:16, cooldownMs:700 },
  aggro: 7,
  auraRange: 3, auraMult: 1.25,
};

// ---- hero combat & growth ----
// The Minotaur fights ONLY on command: J hurls a javelin toward the mouse,
// K slashes everything adjacent. He starts weak and grows with XP earned
// from enemies that die near him (his own killing blows count double).
// Level (and XP) persist through death — revival brings back the same beast.
// (The Broodmother, in swarm mode, branches inside these same two
// functions: J becomes a ranged web shot with a slow debuff instead of the
// javelin's raw damage, K
// stays a summon rather than a slash — see heroThrowJavelin/heroSlash.)
const HERO = {
  baseHp: 70, hpPerLevel: 12, maxLevel: 10,
  xpToNext: (lvl)=> 20 + lvl*15,
  xpValue: { raider:6, pillager:7, swordsman:8, ram:12, camp:30 },
  xpRadius: 5,
  javelin: { baseDmg: 10, dmgPerLevel: 3, range: 7, speed: 12, hitRadius: 0.9, cooldownMs: 4000 },
  slash:   { baseDmg: 8,  dmgPerLevel: 3, radius: 1.8, cooldownMs: 2500 },
  // Broodmother's J — a melee claw swipe replacing the human's ranged
  // javelin. Short reach, faster cooldown: this is her only direct-damage
  // ability now (K is the birth burst, which is pure utility), so it hits
  // a bit harder than the human's slash to compensate for having no ranged option.
  // Broodmother's J — a ranged web shot replacing the melee claw. Lower
  // damage than the human's javelin (it's primarily a control tool), but
  // it applies a temporary movement slow on hit — a mechanic the human
  // side doesn't have at all.
  web: { baseDmg: 6, dmgPerLevel: 2, range: 6, speed: 11, hitRadius: 0.9, cooldownMs: 4000,
         slowFactor: 0.8, slowDurationMs: 3500 }, // 20% slower for 3.5s
};
const ARCHER_COST = { food:30, wood:25 };
const ARCHER_TRAIN_MS = 60000;   // a soldier takes a full minute to equip & drill
let ARCHER_HP = 30;            // lightly armored — keep them behind walls
const VILLAGER_COST = { food:30 };
const VILLAGER_TRAIN_MS = 20000; // settlers take 20s to arrive
const ARCHER_ATTACK = { range:3.5, damage:6, cooldownMs:1100 };
// Swordsmen: tough melee line troops. They auto-charge the nearest enemy
// within 6 tiles, so they hold ground where archers would get overrun.
const SWORDSMAN_COST = { food:30, wood:10, stone:5 };
const SWORDSMAN_TRAIN_MS = 45000;
let SWORDSMAN_HP = 70;
const SWORDSMAN_ATTACK = { range:1.3, damage:12, cooldownMs:800 };

// ---- unit evolutions: permanent, faction-wide upgrades funded by Wildstone ----
// Applies to every unit of that type — existing AND future — the moment it
// completes. Damage/range bonuses just bump the shared ATTACK constants
// (soldiers/zerglings and archers/spitters both read those unconditionally,
// no per-unit patching needed); HP bonuses do need per-unit patching since
// each unit's hp/maxHp is baked in at creation time.
const EVOLUTIONS = {
  swordsman: { name:'Veteran Training',  hpBonus:8, dmgBonus:2, rangeBonus:0,
               cost:{wildstone:15, wood:40, stone:20}, ms:35000 },
  archer:    { name:'Masterwork Bows',   hpBonus:0, dmgBonus:3, rangeBonus:0.5,
               cost:{wildstone:15, wood:30, stone:10}, ms:35000 },
};
const SWORDSMAN_AGGRO = 6;
const RESOURCE_COLOR = { food:'#f0c96b', wood:'#c98f52', stone:'#d4d4dc', wheat:'#e8d48a', flour:'#f5f0e0', gold:'#ffd700' };

// ---- economy difficulty knobs ----
const STORAGE_BASE = 100;               // per-resource cap with just the Town Hall — build granaries/warehouses to grow it
const WILDSTONE_CAP = 60;               // deliberately small and fixed — see storageCapFor
const HARVEST_MS = 1600;                // time spent chopping/mining at the resource tile
const CARRY = {                         // what one villager hauls home per trip
  lumber_camp: { key:'wood',  amt:6 },
  quarry:      { key:'stone', amt:5 },
  wildstone_refinery: { key:'wildstone', amt:2 }, // rare — a trickle, not a flood
};
const FARM_SOIL_WEAR = 0.008;           // fertility lost per harvest tick
const FARM_MIN_FERTILITY = 0.25;

function fmtCost(cost){
  const label = (k)=> k==='wildstone' ? 'Wild' : k[0].toUpperCase(); // "wood" and "wildstone" both start with W
  return Object.entries(cost).map(([k,v])=>`${v}${label(k)}`).join(' ');
}
