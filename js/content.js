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
  sealed_pass:68
};

// Per-terrain tint applied at draw time, letting a tile type re-use another's
// frame while still reading as its own thing. Empty now that the sealed pass
// has its own baked-colour cliff frame — kept because the mechanism is how a
// new terrain type gets a look without spending one of the 72 frame slots.
const TILE_TINT = {};

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
// If the last raid somehow can't be finished off (a raider stuck behind
// terrain), open the pass anyway after this long rather than stranding the
// player in an endgame that never starts.
const CORRIDOR_GRACE_MS = 120000;
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
