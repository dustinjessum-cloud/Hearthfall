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
  creep_hand:49, headstone:50
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
