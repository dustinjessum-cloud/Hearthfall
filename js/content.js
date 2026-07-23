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
  caravan:65, bandit:66, bandit_camp:67
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
