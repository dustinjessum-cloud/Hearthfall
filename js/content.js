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
  wildstone_deposit:45, icon_wildstone:46, wildstone_refinery:47, wildstone_deposit_corrupted:48,
  creep_hand:49, headstone:50, crypt:51, ghoul:52
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
const AUTO_ASSIGN_RADIUS = 4;           // how far pickWorkerFor() will look for an idle villager on its own — an explicit player order (right-click) always ignores this
const ORDER_QUEUE_MAX = 3;              // shift-click order queue depth — bump this alone to allow longer queues

function fmtCost(cost){
  const label = (k)=> k==='wildstone' ? 'Wild' : k[0].toUpperCase(); // "wood" and "wildstone" both start with W
  return Object.entries(cost).map(([k,v])=>`${v}${label(k)}`).join(' ');
}
