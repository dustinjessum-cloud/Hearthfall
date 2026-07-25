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
  sealed_pass:68,
  bone_pile:69, bone_yard:70, ritual_pit:71, flesh_golem:72
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
// Villagers defend themselves — badly. A pitchfork, not a sword: about a
// tenth of a swordsman's damage per second, and a reach barely past arm's
// length so they can never CHASE anything, only swing at what has already
// closed on them. The point is that a cornered worker is no longer free
// damage for a lone raider, not that massed villagers are an army.
const VILLAGER_ATTACK = { range:1.2, damage:2, cooldownMs:1400 };

// ---- undead: bone, the second resource ------------------------------
// The undead spent food on literally everything — six building types and
// upkeep, all {food:X} — while a human juggles seven resources. Bone is the
// second axis. It comes only from bone piles, which are deliberately rare
// and far apart, so reaching them means pushing blight outward: the undead
// cannot build off blight, so a distant pile is a territorial problem, not
// just a walk.
const BONE_CAP = 120;                  // its own cap, like wildstone
const BONE_PILE_QTY = [720, 1040];     // 4x a stone deposit (180-260)
const BONE_PILE_COUNT = 7;             // across the whole 142-wide map
const BONE_PILE_MIN_GAP = 9;           // never clustered

// ---- undead: the Ritual Pit and the Flesh Golem ----------------------
// Corpses are dragged here and BANKED. Banking is the whole trick: corpses
// rot in 45s, so twenty of them could never coexist on the map — the pit
// keeps a count that never decays, letting a golem accumulate across raids.
const RITUAL = {
  corpsesPerGolem: 20,
  dragSlow: 0.8,          // hauling a body costs 20% speed
};
// Tank/brawler that fights alongside the Necromancer: it soaks while she
// webs and bursts. Tanky first, but no slouch.
const FLESH_GOLEM = {
  hp: 220,
  attack: { range:1.4, damage:14, cooldownMs:1200 },
  speedMult: 0.75,        // slow and heavy
  scale: 1.45,            // reads as a monster next to a 1.0 skeleton
};

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
  bone_yard:   { key:'bone',  amt:5 },   // undead only — see BONE_CAP
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
