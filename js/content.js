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
