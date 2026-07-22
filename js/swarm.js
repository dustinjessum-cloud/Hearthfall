// =====================================================================
// THE SWARM — a second playable faction.
// Design: the hive plays the human game in reverse. One resource
// (biomass — internally aliased to the 'food' slot so eating, famine,
// storage caps, and training costs all reuse the human plumbing).
// Structures morph FROM drones and can only grow on creep. The existing
// raid system attacks unchanged — the raiders were human all along.
// =====================================================================
const SWARM = {
  creep: {
    hiveRadius: [5, 7, 9],     // creep reach at Hive level 1/2/3
    tumorGenRadius: [3, 2, 1],   // creep reach by generation: player-built,
                                  // then each auto-spread child — shrinking,
                                  // so the chain naturally peters out
    tumorSpreadGenerations: 2,   // a tumor may auto-spread up to this many
                                  // more generations beyond itself
    tumorSpreadDelayMs: 35000,   // how long a mature tumor waits before
                                  // attempting its one spread
    seedRadius: 4,              // instant creep at game start
    spreadMs: 900,              // one growth pulse this often
    tilesPerPulse: 3,           // frontier tiles claimed per pulse
    incomePerTilePerTick: 0.008,// passive biomass absorbed per creep tile
    tileTint: 0x82945a,         // the sickly grave-green of spreading blight
    roadTint: 0x5f6b45,         // bone paths read darker than raw blight
  },
  corpseBiomass: 6,             // a dead human dissolves into this much
  outpostLoot: 130,             // biomass windfall for razing a human outpost
  upkeepPerBuildingPerTick: 0.02, // the hive feeds its growths (biomass)
  zergling: { hp: 45, cost: {food:20}, pair: true, scale: 0.35 }, // weaker, cheaper, comes in twos — and small, swarmy things (0.35x body)
  drone: { cost: 10 }, // cheap and disposable — every structure consumes one on
                        // top of its own biomass cost, so drones must stay
                        // far cheaper than the human villager they're reskinned from
  spitter:  { cost: {food:25} },
  broodmother: { cost: 60, reviveCost: 75, burstCount: 2, burstLifeMs: 20000, burstCooldownMs: 9000 },
  unitTints: { villager: 0xa8b884, archer: 0x9fd07a, swordsman: 0xe2ddc4, captain: 0x9a8fb0 }, // ghoul (grey-green), plaguebearer (bilious), skeleton (bone-white), necromancer (deathly violet)
};

// Word-level re-theming: every banner and info-panel string passes through
// this map in swarm mode, so the human-flavored copy deep in the UI reads
// hive-flavored without rewriting fifty call sites. Longest entries first.
const SWARM_TEXT = [
  ['A Minotaur strides in, scythe in hand, to lead your soldiers!', 'The Necromancer rises from the Necropolis, staff wreathed in grave-light!'],
  ['The Minotaur returns to the field!', 'The Necromancer claws back from the grave!'],
  ['No one settles in a starving town — get food first!', 'The Necropolis cannot raise the dead while it starves — feed it carrion!'],
  ['No one apprentices in a starving town!', 'The starving Necropolis raises nothing!'],
  ['Starving men make poor soldiers — get food first!', 'The dead cannot be raised without carrion — feed the Necropolis!'],
  ['Famine! Your people are starving.', 'No carrion left — your dead are crumbling to dust!'],
  ['A new villager joins the town!', 'A Ghoul claws up from the grave!'],
  ['Population at cap — build more houses!', 'The dead are at their limit — raise more Grave Mounds!'],
  ['No wood for upkeep — your buildings are weathering!', 'No carrion to sustain your growths — they are rotting away!'],
  ['A villager reports for duty', 'A ghoul shambles from the pit'],
  ['Bandit camp destroyed!', 'Human outpost razed!'],
  ['Bandit camp', 'Human outpost'], ['bandit camp', 'human outpost'],
  ['The Minotaur', 'The Necromancer'], ['Minotaur', 'Necromancer'],
  ['Town Hall', 'Necropolis'], ['Town Center', 'Necropolis'],
  ['Villagers', 'Ghouls'], ['villagers', 'ghouls'], ['Villager', 'Ghoul'], ['villager', 'ghoul'],
  ['Swordsman', 'Skeleton'], ['swordsman', 'skeleton'], ['Archer', 'Plaguebearer'], ['archer', 'plaguebearer'],
  ['soldiers', 'risen'], ['Soldiers', 'Risen'],
  ['wood', 'carrion'], ['gold', 'carrion'], ['food', 'carrion'],
  ['town', 'necropolis'], ['Town', 'Necropolis'],
];

function applySkinText(msg){
  if(state.faction !== 'swarm' || !msg) return msg;
  for(const [from, to] of SWARM_TEXT) msg = msg.split(from).join(to);
  return msg;
}

// Re-theme rendered DOM without nuking event listeners: walk text nodes only.
function skinDomText(rootEl){
  if(state.faction !== 'swarm' || !rootEl) return;
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  let node;
  while((node = walker.nextNode())){
    const skinned = applySkinText(node.nodeValue);
    if(skinned !== node.nodeValue) node.nodeValue = skinned;
  }
}

// ---- creep: the swarm's territory, build-space, and passive economy ----
function initCreep(){
  state.creep = [];
  for(let y=0;y<MAP_H;y++){ state.creep.push(new Array(MAP_W).fill(false)); }
  state._creepCount = 0;
}

function isCreeped(gx, gy){
  return !!(state.creep && state.creep[gy] && state.creep[gy][gx]);
}

// The one place that decides what a ground tile should actually look like,
// given its resource type + creep status + road status together. Used
// anywhere a tile's frame gets (re)computed, so creep and resources never
// silently overwrite each other again.
function frameForGroundTile(gx, gy){
  if(state.roads[gy] && state.roads[gy][gx]) return FRAME.dirt; // slime trail / road always wins visually
  const t = state.grid[gy][gx];
  if(isCreeped(gx, gy)){
    if(t === 'forest') return FRAME.forest_corrupted;
    if(t === 'stone_deposit') return FRAME.stone_deposit_corrupted;
    if(t === 'wildstone_deposit') return FRAME.wildstone_deposit_corrupted;
    // bare blighted ground — a rare skeletal hand claws up on some tiles.
    // Deterministic per-tile (hashed coords) so it stays put across re-skins
    // and save/load, and sparse (~1 in 19) so it reads as an occasional detail.
    const h = ((gx*73856093) ^ (gy*19349663)) >>> 0;
    return (h % 19 === 0) ? FRAME.creep_hand : FRAME.creep;
  }
  return FRAME[t];
}

function claimCreepTile(gx, gy){
  if(!inBounds(gx,gy) || isCreeped(gx,gy)) return false;
  if(tileAt(gx,gy) === 'water') return false; // creep won't cross open water
  state.creep[gy][gx] = true;
  state._creepCount++;
  const spr = state.tileSprites[gy] && state.tileSprites[gy][gx];
  // resources aren't erased by creep — a forest/stone tile in the zone
  // shows its CORRUPTED variant (still visible, still fully harvestable);
  // frameForGroundTile is the single place that decides which
  if(spr && spr.setFrame){
    spr.setFrame(frameForGroundTile(gx, gy));
    if(spr.clearTint) spr.clearTint();
  }
  return true;
}

function creepSources(){
  const out = [];
  const th = townHall();
  if(th && th.hp > 0) out.push({ gx: th.gx, gy: th.gy, r: SWARM.creep.hiveRadius[(th.level||1)-1] });
  for(const b of state.buildings){
    if(b.type === 'creep_tumor' && b.hp > 0 && !underConstruction(b)) out.push({ gx: b.gx, gy: b.gy, r: SWARM.creep.tumorGenRadius[b.creepGen||0] });
  }
  return out;
}

// One growth pulse: find frontier tiles (uncreeped, adjacent to creep, in
// range of a source) and claim a few at random — organic, uneven spread.
// A tumor's one autonomous act: reach out to the edge of its OWN territory
// and grow a smaller child there — no drone, no player action. This is
// what lets a single placed tumor become a chain of up to
// SWARM.creep.tumorSpreadGenerations extra generations, each with reduced
// reach, so the chain naturally peters out instead of spreading forever.
function findTumorSpreadSpot(px, py, reach){
  const candidates = [];
  for(let dy=-reach; dy<=reach; dy++){
    for(let dx=-reach; dx<=reach; dx++){
      if(dx===0 && dy===0) continue;
      const dist = Math.hypot(dx, dy);
      // bias toward the OUTER half of the reach — a child hugging its
      // parent would mostly overlap creep that already exists
      if(dist > reach || dist < reach*0.5) continue;
      const gx = px+dx, gy = py+dy;
      if(!inBounds(gx,gy)) continue;
      const t = tileAt(gx,gy);
      if(t==='water' || t==='forest' || t==='stone_deposit') continue; // same rules as normal placement
      if(state.occupied[gy][gx]) continue;
      candidates.push({gx, gy});
    }
  }
  if(!candidates.length) return null;
  return candidates[Math.floor(Math.random()*candidates.length)];
}

function trySpreadTumor(parent){
  parent.spreadDone = true; // only ever attempted once, success or fail — a
                             // dead end (no valid spot) just stops the chain
  const nextGen = (parent.creepGen||0) + 1;
  if(nextGen > SWARM.creep.tumorSpreadGenerations) return;
  const reach = SWARM.creep.tumorGenRadius[parent.creepGen||0]; // the PARENT's
                             // own (already-shrunk) radius bounds how far
                             // its child can land — this is what makes
                             // distance shrink alongside creep spread
  const spot = findTumorSpreadSpot(parent.gx, parent.gy, reach);
  if(!spot) return;
  claimCreepTile(spot.gx, spot.gy); // the swarm claims its own ground —
                                    // no isPlacementValid gate needed here
  const child = createBuilding('creep_tumor', spot.gx, spot.gy, BUILD_DEFS.creep_tumor);
  child.creepGen = nextGen;
  if(child.sprite && child.sprite.setScale) child.sprite.setScale(1 - nextGen*0.15); // visibly smaller each generation
  if(scene && scene.add) floatResourceText(spot.gx, spot.gy, 'the blight spreads...', '#b6c98a');
}

function updateTumorSpread(delta){
  // snapshot first: a spread created THIS pass shouldn't also be eligible
  // to spread again in the same pass, which could otherwise cascade an
  // entire generation chain in one large tick (e.g. after a backgrounded
  // tab resumes with a big delta) instead of one generation per tick
  for(const b of [...state.buildings]){
    if(b.type!=='creep_tumor' || b.hp<=0 || underConstruction(b) || b.spreadDone) continue;
    b.spreadAgeMs = (b.spreadAgeMs||0) + delta;
    if(b.spreadAgeMs >= SWARM.creep.tumorSpreadDelayMs) trySpreadTumor(b);
  }
}

function updateCreep(){
  const sources = creepSources();
  if(!sources.length) return;
  const candidates = [];
  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      if(state.creep[y][x]) continue;
      if(tileAt(x,y) === 'water') continue;
      const touching = isCreeped(x-1,y) || isCreeped(x+1,y) || isCreeped(x,y-1) || isCreeped(x,y+1);
      if(!touching) continue;
      // Euclidean distance to the NEAREST in-range source — a circular
      // reach, not the old square (Chebyshev) one — and we remember how
      // close, so the fill order below can grow outward in rings.
      let best = Infinity;
      for(const s of sources){
        const d = Math.hypot(x-s.gx, y-s.gy);
        if(d <= s.r && d < best) best = d;
      }
      if(best < Infinity) candidates.push({x, y, d: best});
    }
  }
  // claim the nearest frontier tiles first (with a little organic jitter,
  // so the edge isn't a perfect compass-drawn circle) — this is what
  // actually makes the growth read as an expanding disk from each tumor
  // instead of random tendrils reaching unevenly in one direction
  candidates.sort((a,b)=> (a.d + Math.random()*0.6) - (b.d + Math.random()*0.6));
  for(let i=0; i<SWARM.creep.tilesPerPulse && i<candidates.length; i++){
    claimCreepTile(candidates[i].x, candidates[i].y);
  }
}

// ---- faction switch: mutate the shared definitions into hive form ----
// Runs once, before the Phaser game boots. A page load only ever hosts one
// faction, so rewriting the tables in place is safe and keeps every
// existing type-check ('barracks', 'granary', 'tower'...) working untouched.
function applyFaction(faction){
  state.faction = faction;
  if(faction !== 'swarm') return;

  // -- building roster: rename/re-cost the types the undead keep --
  BUILD_DEFS.lumber_camp = { name:'Charnel Pit', cost:{food:15}, hp:50, frame:'lumber_camp', tint:0x9aae78, produces:{food:4}, needsWorker:true, bonusNear:'forest' };
  BUILD_DEFS.granary     = { name:'Ossuary', cost:{food:25}, hp:80, frame:'granary', tint:0x9aae78, nearTC:true };
  BUILD_DEFS.barracks    = { name:'Mass Grave', cost:{food:35}, hp:100, frame:'graveyard', trains:'archer' }; // dedicated graveyard sprite, baked colors — no tint
  BUILD_DEFS.tower       = { name:'Bone Spire', cost:{food:30}, hp:150, frame:'bone_spire', blocksPath:true, garrison:true, attack:{range:4.2,damage:7,damageLow:4,cooldownMs:900} }; // dedicated bone-spire sprite, baked colors — no tint
  BUILD_DEFS.road        = { name:'Bone Path', cost:{food:2}, frame:'dirt', tint:SWARM.creep.roadTint, isRoad:true };
  BUILD_DEFS.creep_tumor = { name:'Grave Mound', cost:{food:18}, hp:40, frame:'headstone', popCap:2 }; // grey stone cross, baked colors — no tint
  BUILD_TIME.creep_tumor = 5000;
  CARRY.lumber_camp = { key:'food', amt:6 }; // charnel pits haul carrion home

  // -- build bar shows only the undead roster --
  BUILD_CATEGORIES.splice(0, BUILD_CATEGORIES.length,
    { key:'economy', label:'Blight',   types:['lumber_camp','creep_tumor','road','wildstone_refinery'] },
    { key:'trade',   label:'Storage',  types:['granary'] },
    { key:'defense', label:'Undead',   types:['tower','barracks'] },
  );

  // -- unit costs collapse to pure biomass --
  delete SWORDSMAN_COST.wood; delete SWORDSMAN_COST.stone;
  SWORDSMAN_COST.food = SWARM.zergling.cost.food;
  delete ARCHER_COST.wood;
  ARCHER_COST.food = SWARM.spitter.cost.food;
  VILLAGER_COST.food = SWARM.drone.cost; // drones are consumed by every
                                          // structure they morph into, so
                                          // they must be far cheaper than
                                          // the (never-consumed) human villager
  CAPTAIN.cost = SWARM.broodmother.cost;
  CAPTAIN.reviveCost = SWARM.broodmother.reviveCost;
  HERO.slash.cooldownMs = SWARM.broodmother.burstCooldownMs; // K births broodlings — slower than a slash

  // -- evolutions: different bonus shapes for the swarm, biomass-only cost --
  EVOLUTIONS.swordsman.name = 'Bonewrought Armor';
  EVOLUTIONS.swordsman.hpBonus = 10; EVOLUTIONS.swordsman.dmgBonus = 0;
  EVOLUTIONS.swordsman.cost = { wildstone:15, food:35 };
  EVOLUTIONS.archer.name = 'Necrotic Bile';
  EVOLUTIONS.archer.hpBonus = 0; EVOLUTIONS.archer.dmgBonus = 4; EVOLUTIONS.archer.rangeBonus = 0;
  EVOLUTIONS.archer.cost = { wildstone:15, food:30 };

  // -- Wildstone Refinery: same building, biomass-only cost (the swarm
  // never earns wood/stone at all, so leaving those in would make it
  // read as "affordable" purely because those trackers sit untouched) --
  BUILD_DEFS.wildstone_refinery.cost = { food:50 };

  // -- Hive upgrades & storage upgrades cost biomass, not timber+stone --
  TC_LEVELS.upCost = [ {food:180}, {food:400} ];
  STORAGE_LEVELS.granary.upCost = [ {food:50}, {food:100}, {food:180}, {food:300} ];

  // -- HUD: one hunger. Hide the human ledger, relabel food as biomass --
  for(const id of ['resWheat','resFlour','resWood','resStone','resGold','resHappy']){
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  }
  const foodEl = document.getElementById('resFood');
  if(foodEl) foodEl.title = 'Carrion — the one hunger. Sustains every risen thing, raises every unit, grows every structure. At zero, the dead crumble to dust.';
  const workersEl = document.getElementById('resWorkers');
  if(workersEl) workersEl.title = 'Idle/harvesting ghouls';
  const soldiersEl = document.getElementById('resSoldiers');
  if(soldiersEl) soldiersEl.title = 'The risen dead — skeletons & plaguebearers';

  // -- swap the tutorial hint for a hive-flavored one --
  const hint = document.getElementById('hint');
  if(hint){
    hint.innerHTML = '<button id="hintClose" title="Dismiss">✕</button>' +
      'THE UNDEAD: Blight (sickly green ground) spreads from your Necropolis and Grave Mounds — structures can only rise ON blighted ground, and each one consumes a Ghoul to raise (the ghoul WALKS to the site first, then is consumed into the growth on arrival — placing a structure just reserves the spot). ' +
      'Ghouls harvest forests into CARRION via Charnel Pits — carrion is your only resource: it sustains every risen thing each tick, raises new units, and pays for everything. Every blighted tile also drinks a slow trickle of carrion from the land, so territory IS economy. ' +
      'Dead humans rot into carrion where they fall — defense feeds you. Grave Mounds raise your undead cap (+2 each), and each one eventually spreads a smaller mound of its own, extending the blight on its own — the chain shrinks and stops after a couple of generations. ' +
      'Raise Skeletons (cheap melee, clawing up in PAIRS) and Plaguebearers (ranged bile) at the Mass Grave — each consumes a ghoul. Bone Spires auto-attack; ghouls can crew them for extra damage. ' +
      'Human knights raid on a timer, and fortified human OUTPOSTS on the frontier send constant patrols — raze one for a carrion windfall. ' +
      'Raise the NECROMANCER at the Necropolis: J hurls a hex toward the mouse, slowing whatever it hits by 20% for a few seconds. K raises short-lived risen around the Necromancer. Gains power from kills nearby and keeps it through rebirth. Your Necropolis must not fall. NEW: a few remote WILDSTONE deposits dot the map (pale crystal) — once your Necropolis reaches level 3, raise a REFINERY directly onto one to start extracting it. Funds permanent EVOLUTIONS at the Mass Grave: Bonewrought Armor and Necrotic Bile upgrade every Skeleton/Plaguebearer you have, forever.';
    const hc = document.getElementById('hintClose');
    if(hc) hc.addEventListener('click', ()=>{ hint.style.display='none'; });
  }
}

