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
  creep_hand:49, headstone:50, crypt:51, ghoul:52, bone_spire:53, graveyard:54, corpse:55,
  troll:56, hobgoblin:57
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

// ---- raiding races ----
// Each raid wave is ONE race: usually the opposite of the player's faction
// (a human town is besieged by the undead; the undead are hunted by the
// living), sometimes a troll warband. Bandits (from camps) and battering
// rams sit outside this system and never change race. Every race fields a
// melee line and a ranged line; only HUMAN dead leave a corpse to
// raise/bury (undead are already dead, trolls aren't human).
const OPPOSITE_RACE_CHANCE = 0.65;   // vs 0.35 troll warband
const ENEMY_RANGED = { range: 4.2, cooldownMs: 1500, projectileSpeed: 8 }; // tiles; ranged units hold at range and loose
const ENEMY_RACES = {
  human: {
    label: 'knights', banner: 'Human knights ride to war!',
    melee: 'enemy_raider', meleeTough: 'enemy_swordsman', ranged: 'archer', rangedTint: 0xcc5544,
    hpMult: 1.0, dmgMult: 1.0, speedMult: 1.0, meleeSize: 1.0,
    leavesCorpse: true,
  },
  undead: {
    label: 'undead', banner: 'The undead claw out of the earth!',
    melee: 'ghoul', meleeTough: 'ghoul', ranged: 'spitter_naga', rangedTint: null,
    hpMult: 0.9, dmgMult: 1.0, speedMult: 1.05, meleeSize: 1.0,   // frailer, but relentless
    leavesCorpse: false,
  },
  troll: {
    label: 'trolls', banner: 'A troll warband crashes out of the wild!',
    melee: 'troll', meleeTough: 'troll', ranged: 'hobgoblin', rangedTint: null,
    hpMult: 1.5, dmgMult: 1.3, speedMult: 0.85, meleeSize: 1.35,  // hulking, hard-hitting, slow
    rangedSize: 0.95,
    leavesCorpse: false,
  },
};
const ENEMY_RANGED_HP_MULT = 0.7;    // ranged units of any race are frailer than their melee kin

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
