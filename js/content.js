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
  caravan:65, bandit:66, bandit_camp:67,
  // Placeholder art: the sealed pass reuses the stone-deposit frame, darkened
  // by TILE_TINT below, so this phase needs no spritesheet change. Worth a
  // dedicated cliff-face sprite later.
  sealed_pass:2
};

// Per-terrain tint applied at draw time. Lets a tile type re-use another's
// frame while still reading as its own thing.
const TILE_TINT = { sealed_pass: 0x5d6472 };

// ---------------------------------------------------------------------
// The enemy town
//
// A PRIVATE roster. applyFaction() destructively rewrites BUILD_DEFS — it
// reassigns entries, splices BUILD_CATEGORIES and deletes cost keys — for
// whichever faction YOU picked, so exactly one player roster can exist in
// memory at a time. The enemy is always the OPPOSITE race, so it cannot
// share that table; it needs its own.
//
// Field names deliberately mirror BUILD_DEFS: cost, hp, size, popCap,
// produces, trains, attack and blocksPath all mean precisely what they mean
// there. That is what makes this extensible — adding `popCap` to an entry
// changes AI behaviour with no AI code change, because the think-loop reads
// capabilities off these fields rather than switching on type. A building
// can also be promoted to player-buildable by copying the entry across.
//
// `frames` carries both skins so one entry serves either race. Costs are
// already here even though nothing spends them yet — Phase 3's economy
// reads them, and putting them in now means no schema change then.
const AI_BUILD_DEFS = {
  // isCore is what aiTownHall() looks for, and razing it is the win
  // condition — without the flag the lookup returns null and the victory
  // check fires on frame one, before you have seen the enemy town at all
  ai_core:     { name:'Enemy Town Hall',   hp:600, size:2, blocksPath:true, popCap:8,
                 isCore:true, cost:{}, trains:'ai_worker',
                 frames:{ human:'town_hall',   undead:'crypt' } },
  ai_house:    { name:'Enemy Dwelling',    hp:60,  popCap:4,
                 cost:{wood:20},
                 frames:{ human:'house',       undead:'headstone' } },
  ai_farm:     { name:'Enemy Farm',        hp:50,  produces:{food:4}, needsWorker:true,
                 cost:{wood:15},
                 frames:{ human:'farm',        undead:'lumber_camp' } },
  ai_lumber:   { name:'Enemy Lumber Camp', hp:50,  produces:{wood:4}, needsWorker:true, bonusNear:'forest',
                 cost:{wood:15},
                 frames:{ human:'lumber_camp', undead:'lumber_camp' } },
  ai_quarry:   { name:'Enemy Quarry',      hp:60,  produces:{stone:3}, needsWorker:true, bonusNear:'stone_deposit',
                 cost:{wood:20,stone:10},
                 frames:{ human:'quarry',      undead:'quarry' } },
  ai_barracks: { name:'Enemy Barracks',    hp:100, trains:'ai_soldier',
                 cost:{wood:35},
                 frames:{ human:'barracks',    undead:'graveyard' } },
  ai_tower:    { name:'Enemy Tower',       hp:150, blocksPath:true, garrison:true,
                 cost:{wood:10,stone:25},
                 attack:{ range:4.2, damage:7, cooldownMs:900 },
                 frames:{ human:'tower',       undead:'bone_spire' } },
  ai_wall:     { name:'Enemy Wall',        hp:120, blocksPath:true,
                 cost:{stone:5},
                 frames:{ human:'wall',        undead:'wall' } },
};

// The enemy town is always the opposite race. state.faction is the PLAYER's
// ('human' or 'swarm'); this is the skin the enemy wears.
function aiTownRace(){ return state.faction === 'swarm' ? 'human' : 'undead'; }

function aiDef(type){
  const d = AI_BUILD_DEFS[type];
  if(!d) return null;
  // resolve the per-race sprite into a plain `frame`, so the returned object
  // is shaped exactly like a BUILD_DEFS entry and createBuilding needs no
  // special case for AI structures
  return Object.assign({}, d, { frame: d.frames[aiTownRace()] || d.frames.human });
}

const TILE = 32;
// The world is five vertical bands. Your town and the enemy town are the
// same size; the neutral middle is the prize both sides expand into. The
// two passes are solid rock with a narrow gap carved through each, and the
// gaps stay plugged until you survive RAIDS_BEFORE_CORRIDOR raids — so the
// early game plays on the home band exactly as it always has.
const MAP_W = 142, MAP_H = 32;
const ZONES = {
  home:     { x0:0,   x1:43  },
  passWest: { x0:44,  x1:53  },
  neutral:  { x0:54,  x1:87  },
  passEast: { x0:88,  x1:97  },
  enemy:    { x0:98,  x1:141 },
};
const RAIDS_BEFORE_CORRIDOR = 5;
const PASS_GAP_HALF = 1;   // gap is 2*this+1 tiles tall — a real chokepoint

// Terrain nothing can walk through. Kept as one set so a new impassable
// type is added in ONE place; the twelve separate `t==='water'` tests this
// replaced were exactly how a new type leaks through half of them.
const IMPASSABLE_TILES = new Set(['water', 'sealed_pass']);

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
