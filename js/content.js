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
  creep_hand:49, headstone:50, crypt:51, ghoul:52, bone_spire:53, graveyard:54
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
