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
  creep_hand:49, headstone:50, crypt:51
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
