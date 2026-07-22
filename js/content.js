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
  creep_hand:49, headstone:50, crypt:51, ghoul:52, bone_spire:53, graveyard:54, corpse:55
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

// ---- corpses: the shared raise/bury resource ----
// Dead humans (raiders, skirmishers, and the human player's own villagers &
// soldiers) leave a corpse where they fall. The undead raise them as
// skeletons via the Necromancer; humans bury them for a morale boost.
// Rams and camps are machinery, heroes have their own revive, and the
// undead's units are already dead — none of those leave corpses, so a
// raised skeleton can never be re-raised.
const CORPSE = {
  rotMs: 60000,          // human game: unburied corpses fade away after this
  rotMsSwarm: 45000,     // undead game: then dissolve into carrion (SWARM.corpseBiomass)
  raiseCost: 10,         // carrion the Necromancer spends to raise a skeleton
  buryHappy: 4,          // happiness honor per burial...
  buryHappyCap: 12,      // ...stacking up to this cap...
  buryDecayPerTick: 0.15,// ...and fading this much per economy tick
};

function fmtCost(cost){
  const label = (k)=> k==='wildstone' ? 'Wild' : k[0].toUpperCase(); // "wood" and "wildstone" both start with W
  return Object.entries(cost).map(([k,v])=>`${v}${label(k)}`).join(' ');
}
