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
  well:58, tavern:59, bakery:60, apothecary:61, market:62, mason:63, barracks:64,
  caravan:65
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
