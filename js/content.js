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
  troll:56, hobgoblin:57,
  well:58, tavern:59, bakery:60, apothecary:61, market:62, mason:63, barracks:64
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
  // these seven used to be recoloured clones (three shared the house
  // sprite) — each now has its own drawn sprite, so no tint
  bakery:     { name:'Bakery',      cost:{wood:30,stone:10},    hp:80,  frame:'bakery',     isBakery:true, needsWorker:true, staffed:true },
  market:     { name:'Market',      cost:{wood:40,stone:20},    hp:80,  frame:'market',     isMarket:true },
  mason:      { name:'Mason',       cost:{wood:25,stone:20},    hp:70,  frame:'mason',      isMason:true },
  apothecary: { name:'Apothecary',  cost:{wood:30,stone:15},    hp:70,  frame:'apothecary', heals:true },
  well:       { name:'Well',        cost:{wood:10,stone:15},    hp:60,  frame:'well',       happy:true },
  tavern:     { name:'Tavern',      cost:{wood:40,stone:10},    hp:80,  frame:'tavern',     happy:true },
  road:       { name:'Road',        cost:{wood:2},              frame:'dirt',               isRoad:true },
  wall:       { name:'Wall',        cost:{stone:5},             hp:120, frame:'wall',       blocksPath:true },
  gate:       { name:'Gate',        cost:{stone:6, wood:4},     hp:120, frame:'wall_gate',  tint:0xb8c4d8, blocksPath:true, friendlyPassable:true },
  tower:      { name:'Tower',       cost:{wood:10,stone:25},    hp:150, frame:'tower',      blocksPath:true, garrison:true, attack:{range:4.2,damage:7,damageLow:4,cooldownMs:900} },
  barracks:   { name:'Barracks',    cost:{wood:30,stone:15},    hp:100, frame:'barracks',   trains:'archer' },
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
