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
  creep_hand:49, headstone:50, crypt:51, ghoul:52, bone_spire:53
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
