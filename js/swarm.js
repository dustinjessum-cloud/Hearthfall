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
    spreadsFromCore: 1,          // the Necropolis seeds ONCE — see blightSpreadBudget
    spreadsFromMound: 2,         // mounds carry the chain outward from there
                                  // more generations beyond itself
    tumorSpreadDelayMs: 35000,   // how long a mature tumor waits before
    spreadGrowMs: 10000,         // a seeded mound is INERT for this long: it
                                 // is placed at once, but anchors no blight and
                                 // charges no spread of its own until it rises
                                  // attempting its one spread
    seedRadius: 4,              // instant creep at game start
    spreadMs: 900,              // one growth pulse this often
    tilesPerPulse: 3,           // frontier tiles claimed per pulse
    incomePerTilePerTick: 0.008,// passive biomass absorbed per creep tile
    tileTint: 0x82945a,         // the sickly grave-green of spreading blight
    roadTint: 0x5f6b45,         // bone paths read darker than raw blight
  },
  // Off their own blight the dead are sluggish and weak — they are animated
  // by it, not merely standing on it. On blight they are normal. This is what
  // makes spreading blight an OFFENSIVE act rather than only an economic one:
  // to fight well somewhere, you must first grow your ground to it.
  offBlight: { speedMult: 0.6, damageMult: 0.7 },
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

// Which substitution table (if any) the current faction speaks through.
// Humans are the base copy, so they have none. Looked up rather than
// hardcoded to 'swarm', or the tribe would silently speak human.
function skinTable(){
  if(state.faction === 'swarm') return SWARM_TEXT;
  if(state.faction === 'tribe') return (typeof TRIBE_TEXT !== 'undefined') ? TRIBE_TEXT : null;
  if(state.faction === 'grove') return (typeof GROVE_TEXT !== 'undefined') ? GROVE_TEXT : null;
  return null;
}

function applySkinText(msg){
  const table = skinTable();
  if(!table || !msg) return msg;
  for(const [from, to] of table) msg = msg.split(from).join(to);
  return msg;
}

// Re-theme rendered DOM without nuking event listeners: walk text nodes only.
function skinDomText(rootEl){
  if(!skinTable() || !rootEl) return;
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
    // Bone piles had no corrupted variant, so blight fell through to the
    // generic creep frame below and ERASED the pile visually while leaving
    // resourceQty untouched — a deposit you could still mine but could not
    // see. Every resource under blight must keep showing what it is.
    if(t === 'bone_pile') return FRAME.bone_pile_corrupted;
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
  if(isImpassableTile(tileAt(gx,gy))) return false; // creep won't cross open water or solid rock
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
  for(const b of myBuildings()){
    // growMs: a freshly seeded mound anchors NOTHING until it has risen, which
    // is what makes Spread Blight a commitment rather than an instant claim
    if(b.type === 'creep_tumor' && b.hp > 0 && !underConstruction(b) && !(b.growMs > 0)) out.push({ gx: b.gx, gy: b.gy, r: SWARM.creep.tumorGenRadius[b.creepGen||0] });
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
      if(isImpassableTile(t) || t==='forest' || t==='stone_deposit') continue; // same rules as normal placement
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

// Blight no longer creeps outward on its own. Each blight structure charges
// up, and the PLAYER chooses where the next one goes — spreading is the
// undead's central decision rather than a background process they watch.
//
// The shrink is unchanged: a child is one generation further out, its reach
// comes from tumorGenRadius (3 -> 2 -> 1), and the chain stops after
// tumorSpreadGenerations. All that moved is who picks the direction.
function updateTumorSpread(delta){
  updateBlightGrowth(delta);
  for(const b of blightSources()){
    if(b.hp<=0 || underConstruction(b)) continue;
    if(b.growMs > 0) continue;          // still rising: it charges nothing yet
    if(!blightCanEverSpread(b)) continue;
    b.spreadAgeMs = (b.spreadAgeMs||0) + delta;
  }
  // blight abandoned by a dead mound recedes — see fadeOrphanedCreep
  fadeOrphanedCreep(delta, creepSources());
  // Readiness is a TIMER, so the gloom cannot be refreshed from updateHUD the
  // way the tower badge is — a mound would sit charged and unmarked until the
  // next economy tick. This runs every frame; it is a loop over a handful of
  // structures that exits immediately for anything already lit.
  updateGloomMarkers();
  // same per-frame reasoning: the pall turns on the moment the last
  // upgrade lands, not three seconds later
  updateNecropolisPall();
}

// Everything that anchors blight: the Necropolis and every Grave Mound.
function blightSources(){
  return myBuildings().filter(b => b.isCore || b.type === 'creep_tumor');
}

// A structure whose children would already be past the last generation has
// nothing left to give, and should never offer the button.
function blightGenOf(b){ return b.isCore ? 0 : ((b.creepGen||0) + 1); }

// How many times a structure may ever seed. The Necropolis gets exactly ONE:
// it is the seat of the faction, not a nursery, and giving it a single push
// makes the opening a real decision — that one placement decides which
// direction the whole blight grows. Grave Mounds carry the chain from there.
function blightSpreadBudget(b){
  return b.isCore ? SWARM.creep.spreadsFromCore : SWARM.creep.spreadsFromMound;
}
function blightSpreadsLeft(b){
  return Math.max(0, blightSpreadBudget(b) - (b.spreadsUsed || 0));
}
function blightCanEverSpread(b){
  if(blightSpreadsLeft(b) <= 0) return false;             // budget spent
  return blightGenOf(b) < SWARM.creep.tumorGenRadius.length
      && blightGenOf(b) <= SWARM.creep.tumorSpreadGenerations;
}
function blightSpreadReady(b){
  return blightCanEverSpread(b) && (b.spreadAgeMs||0) >= SWARM.creep.tumorSpreadDelayMs;
}
function blightSpreadRemainingMs(b){
  return Math.max(0, SWARM.creep.tumorSpreadDelayMs - (b.spreadAgeMs||0));
}

// ---- the gloom -------------------------------------------------------
// An on-map sign that a Grave Mound is charged and waiting to be pointed
// somewhere. Readiness used to live ONLY in the info panel — a button label
// and a countdown — so the player had to select each mound in turn to find
// out which ones could seed again.
//
// GRAVE MOUNDS ONLY. The Necropolis shares the readiness predicate and was
// marked too at first, but it seeds exactly once in a run and the player is
// already looking straight at it; wreathing the town centre spent the effect
// on the one structure that never needed finding.
//
// Drawn from primitives rather than a sprite on purpose: the sheet has two
// free slots left, and spending one on a glow that a tinted circle renders
// perfectly would be a poor trade.
// Spirit-purple mist gathered at the FOOT of the structure — subtle, and
// deliberately not a ring: an outlined circle read as a UI overlay rather than
// as something in the world.
//
// Three stacked ellipses, flattened and increasingly bright toward the middle,
// stand in for a gradient (Phaser primitives have none). Purple because the
// blight itself is already green — a green glow on green ground says nothing,
// and 0xc9a0ff is the spirit-light this faction already uses when a broodling
// dissolves. Drawn ABOVE the structure so nothing hides it, which is safe at
// these alphas: it reads as mist in front of the base, not as paint.
const GLOOM = {
  haze:       0x6b3fa0,   // the outer wash
  core:       0xc9a0ff,   // pale spirit-light at its heart
  hazeAlpha:  0.20,
  midAlpha:   0.26,
  coreAlpha:  0.30,
  widthMult:  0.95,       // of the footprint
  heightMult: 0.34,       // flattened: mist lying at the foot, not a bubble
  pulseMs:    1900,
};

function updateGloomMarkers(){
  if(!scene || !scene.add) return;
  for(const b of state.buildings){
    // isMine: the enemy town seeds blight by its own rules, and how charged
    // ITS mounds are is not something to hand the player for free.
    const lit = isMine(b) && b.hp > 0 && !underConstruction(b)
             && b.type === 'creep_tumor'   // mounds only — never the Necropolis
             && blightSpreadReady(b);
    if(!lit){
      if(b.gloom){
        scene.tweens.killTweensOf(b.gloom);   // a tween outliving its target throws
        b.gloom.destroy();
        b.gloom = null;
      }
      continue;
    }
    if(b.gloom) continue;   // already lit — the tween keeps it breathing
    const size = b.size || 1;
    const w = size*TILE*GLOOM.widthMult, h = size*TILE*GLOOM.heightMult;
    const haze = scene.add.ellipse(0, 0, w*1.35, h*1.55, GLOOM.haze, GLOOM.hazeAlpha);
    const mid  = scene.add.ellipse(0, 0, w,      h,      GLOOM.haze, GLOOM.midAlpha);
    const core = scene.add.ellipse(0, 0, w*0.55, h*0.60, GLOOM.core, GLOOM.coreAlpha);
    // anchored to the BASE of the footprint, not its centre
    const baseY = b.gy*TILE + size*TILE - 5;
    b.gloom = scene.add
      .container(b.gx*TILE + size*TILE/2, baseY, [haze, mid, core])
      .setDepth(7);
    scene.tweens.add({
      targets: b.gloom,
      alpha: { from: 0.62, to: 1 },
      scale: { from: 0.94, to: 1.06 },
      y:     { from: baseY, to: baseY - 1.5 },   // a slow hover, barely there
      duration: GLOOM.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }
}

// How far from the parent a new mound may be planted: its own blight reach.
// Combined with the must-be-on-blight rule below, that means growth always
// advances the frontier one step rather than teleporting to a target.
function blightSpreadRange(b){
  const gen = b.isCore ? null : (b.creepGen||0);
  return b.isCore
    ? SWARM.creep.hiveRadius[(b.level||1)-1]
    : SWARM.creep.tumorGenRadius[gen] || 1;
}

// Valid target: on existing blight, inside the parent's reach, buildable.
function canSpreadBlightAt(parent, gx, gy){
  if(!blightSpreadReady(parent)) return false;
  if(!inBounds(gx,gy) || !isCreeped(gx,gy)) return false;   // your own ground only
  if(occAt(gx,gy)) return false;
  if(isImpassableTile(tileAt(gx,gy))) return false;
  const t = tileAt(gx,gy);
  if(t==='forest' || t==='stone_deposit') return false;
  return Phaser.Math.Distance.Between(parent.gx, parent.gy, gx, gy) <= blightSpreadRange(parent);
}

function spreadBlightTo(parent, gx, gy){
  if(!canSpreadBlightAt(parent, gx, gy)){
    flashWaveBanner('Must be placed on your own blight, within reach.');
    return false;
  }
  const gen = blightGenOf(parent);
  const b = createBuilding('creep_tumor', gx, gy, Object.assign({}, BUILD_DEFS.creep_tumor));
  if(!b) return false;
  b.creepGen = gen;
  b.construction = null; b.underConstruction = false; b.awaitingBuilder = false; b.buildMs = 0;
  // It RISES rather than appearing. buildMs is not the mechanism: construction
  // only ticks down while a builder physically stands there, and nobody builds
  // a grave mound — so this is its own timer, cleared by updateBlightGrowth.
  b.growMs = SWARM.creep.spreadGrowMs;
  if(b.sprite && b.sprite.setAlpha) b.sprite.setAlpha(0.45);
  // Each generation is visibly smaller, matching its smaller reach — so the
  // map shows at a glance how much further a chain can still go.
  // Every spread mound is smaller than the structure that made it, and each
  // generation smaller again — so the map shows at a glance how much further
  // a chain can still reach. gen+1 rather than gen, or the first spread would
  // render the same size as a hand-built Grave Mound.
  const scale = Math.max(0.4, 1 - (gen + 1) * 0.18);
  if(b.sprite && b.sprite.setScale) b.sprite.setScale(scale);
  parent.spreadsUsed = (parent.spreadsUsed || 0) + 1;
  parent.spreadAgeMs = 0;              // parent must charge again
  // The button is built into the panel's static markup, which is only
  // rebuilt when the SELECTION changes — so clear the binding to force a
  // rebuild, or a spent structure keeps showing a button it can no longer use.
  const panel = document.getElementById('infoPanel');
  if(panel) panel._boundRef = null;
  // No immediate bloom any more — the ground does not turn until the mound has
  // risen. The spread is SPENT at the moment of casting either way, so a mound
  // killed while it is still rising wastes the seeding.
  flashWaveBanner(gen >= SWARM.creep.tumorSpreadGenerations
    ? 'A Grave Mound stirs — the blight reaches its limit here.'
    : `A Grave Mound stirs — it will rise in ${Math.round(SWARM.creep.spreadGrowMs/1000)}s.`);
  refreshInfoPanel();
  markMinimapDirty();
  return true;
}

// `sources` is optional: the enemy town passes its own list so the undead AI
// can spread blight through exactly this code rather than a parallel copy.
function updateCreep(sources){
  sources = sources || creepSources();
  if(!sources.length) return;
  const candidates = [];
  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      if(state.creep[y][x]) continue;
      if(isImpassableTile(tileAt(x,y))) continue;
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
  if(faction === 'tribe'){ applyTribeFaction(); return; }
  if(faction === 'grove'){ applyGroveFaction(); return; }
  if(faction !== 'swarm') return;

  // -- building roster: rename/re-cost the types the undead keep --
  // Its own art now, not a green-tinted human lumber camp. The charnel rack
  // IS a rack of stacked bone, which is what a Charnel Pit is — so the tint
  // hack goes with it (a tint over timber never stopped reading as timber).
  BUILD_DEFS.lumber_camp = { name:'Charnel Pit', cost:{food:15}, hp:50, frame:'charnel_rack', produces:{food:4}, needsWorker:true, bonusNear:'forest' };
  BUILD_DEFS.granary     = { name:'Ossuary', cost:{food:25}, hp:80, frame:'granary', tint:0x9aae78, nearTC:true };
  BUILD_DEFS.barracks    = { name:'Mass Grave', cost:{food:35}, hp:100, frame:'graveyard', trains:'archer' }; // dedicated graveyard sprite, baked colors — no tint
  BUILD_DEFS.tower       = { name:'Bone Spire', cost:{food:30}, hp:150, frame:'bone_spire', blocksPath:true, garrison:true, attack:{range:4.2,damage:7,damageLow:4,cooldownMs:900} }; // dedicated bone-spire sprite, baked colors — no tint
  BUILD_DEFS.road        = { name:'Bone Path', cost:{food:2}, frame:'dirt', tint:SWARM.creep.roadTint, isRoad:true };
  BUILD_DEFS.creep_tumor = { name:'Grave Mound', cost:{food:18}, hp:40, frame:'headstone', popCap:2 }; // grey stone cross, baked colors — no tint
  // Bone Yard: the ONLY source of bone. Piles are rare and far apart, and the
  // undead can only build on blight — so reaching a second pile is a
  // territorial push, not a walk. That is the whole point of the resource.
  BUILD_DEFS.bone_yard   = { name:'Bone Yard', cost:{food:30}, hp:60, frame:'bone_yard',
                             produces:{bone:3}, needsWorker:true, bonusNear:'bone_pile' };
  // Ritual Pit: corpses are dragged here and BANKED (they rot in 45s, so a
  // running count is the only way twenty can ever be assembled). Must sit
  // near the Necropolis — this is the heart of the necropolis, not a
  // forward camp you sneak next to a battlefield.
  BUILD_DEFS.ritual_pit  = { name:'Ritual Pit', cost:{food:40, bone:25}, hp:90,
                             frame:'ritual_pit', nearTC:true };
  // -- walls, in two tiers --
  // The undead had NO wall at all before this: their defense tab was tower,
  // barracks, ritual pit. The Bone Fence is a cheap lashed-femur palisade they
  // can throw up early on carrion alone; it is deliberately flimsy, because
  // the point of it is to be upgraded. One frame serves all three variants —
  // a scrappy palisade has no courses to line up.
  BUILD_DEFS.wall = { name:'Bone Fence', cost:{food:8}, hp:70, frame:'bone_fence',
                      variants:{ straight:'bone_fence', vert:'bone_fence', corner:'bone_fence' },
                      blocksPath:true };
  // ...and the tier it becomes. Paid PER SEGMENT in bone, so a long screen can
  // be part fence and part crypt and the bone goes where you expect the blow.
  // Bone is their scarcest resource (one Bone Yard, on a rare pile, reachable
  // only by pushing blight), which is what makes a fully-crypted wall a
  // statement rather than a default.
  WALL_UPGRADE = { name:'Crypt Wall', cost:{bone:12}, ms:9000, hp:180,
                   variants:{ straight:'crypt_wall', vert:'crypt_wall_v', corner:'crypt_wall_corner' } };

  BUILD_TIME.bone_yard  = 9000;
  BUILD_TIME.ritual_pit = 14000;
  BUILD_TIME.creep_tumor = 5000;
  CARRY.lumber_camp = { key:'food', amt:6 }; // charnel pits haul carrion home

  // -- build bar shows only the undead roster --
  BUILD_CATEGORIES.splice(0, BUILD_CATEGORIES.length,
    { key:'economy', label:'Blight',   types:['lumber_camp','creep_tumor','road','wildstone_refinery','bone_yard'] },
    { key:'trade',   label:'Storage',  types:['granary'] },
    { key:'defense', label:'Undead',   types:['wall','tower','barracks','ritual_pit'] },
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
      'Dead humans leave CORPSES where they fall: send the Necromancer to one (right-click it) to RAISE it as a Skeleton for a little carrion, or leave it to rot into carrion on its own. The risen leave no corpse of their own — the dead cannot be raised twice. ' +
      'Raise the NECROMANCER at the Necropolis: J hurls a hex toward the mouse, slowing whatever it hits by 20% for a few seconds. K raises short-lived risen around the Necromancer. Gains power from kills nearby and keeps it through rebirth. Your Necropolis must not fall. NEW: a few remote WILDSTONE deposits dot the map (pale crystal) — once your Necropolis reaches level 3, raise a REFINERY directly onto one to start extracting it. Funds permanent EVOLUTIONS at the Mass Grave: Bonewrought Armor and Necrotic Bile upgrade every Skeleton/Plaguebearer you have, forever.';
    const hc = document.getElementById('hintClose');
    if(hc) hc.addEventListener('click', ()=>{ hint.style.display='none'; });
  }
}


// ---- targeting: same pattern as Seed Grove and building placement --------
function beginBlightTargeting(b){
  if(!blightSpreadReady(b)) return;
  state.castMode = { kind:'blight', buildingId: b.id };
  flashWaveBanner('Choose where the blight spreads — Esc or right-click to cancel.');
}

function blightCastParent(){
  if(!state.castMode || state.castMode.kind !== 'blight') return null;
  const b = buildingById(state.castMode.buildingId);
  return (b && blightSpreadReady(b)) ? b : null;
}

// Ghost: the parent's reach as a ring, and a marker under the cursor that
// turns red on invalid ground — so a refusal is visible BEFORE the click.
function updateBlightGhost(gx, gy){
  const p = blightCastParent();
  if(!p){ cancelBlightTargeting(); return; }
  if(!scene._blightRange){
    scene._blightRange = scene.add.circle(0,0,10,0x9aae78,0).setStrokeStyle(1,0x9aae78,0.55).setDepth(9);
  }
  scene._blightRange.setPosition(p.gx*TILE+TILE/2, p.gy*TILE+TILE/2);
  scene._blightRange.setRadius(blightSpreadRange(p)*TILE);

  const ok = canSpreadBlightAt(p, gx, gy);
  const col = ok ? 0x9aae78 : 0xd85a3a;
  if(!scene._blightSpot){
    scene._blightSpot = scene.add.rectangle(0,0,TILE,TILE,0x9aae78,0.3).setStrokeStyle(2,0x9aae78,0.9).setDepth(10);
  }
  scene._blightSpot.setPosition(gx*TILE+TILE/2, gy*TILE+TILE/2);
  scene._blightSpot.setFillStyle(col, 0.3);
  scene._blightSpot.setStrokeStyle(2, col, 0.9);
}

function cancelBlightTargeting(){
  state.castMode = null;
  if(scene){
    if(scene._blightRange){ scene._blightRange.destroy(); scene._blightRange = null; }
    if(scene._blightSpot){ scene._blightSpot.destroy(); scene._blightSpot = null; }
  }
}

// Is this unit standing on friendly blight? Only meaningful for the undead
// player; every other faction is unaffected and returns true so callers need
// no faction check of their own.
function onFriendlyBlight(u){
  if(!u || state.faction !== 'swarm') return true;
  return isCreeped(Math.round(u.gx), Math.round(u.gy));
}
function blightSpeedMult(u){
  return onFriendlyBlight(u) ? 1 : SWARM.offBlight.speedMult;
}
function blightDamageMult(u){
  return onFriendlyBlight(u) ? 1 : SWARM.offBlight.damageMult;
}

// ---- the Necropolis pall ---------------------------------------------
// A haunting green fog pooled at the foot of a FULLY UPGRADED Necropolis.
// Same three-stacked-ellipse technique as the mounds' purple gloom — flattened
// and brightening toward the middle, standing in for a gradient Phaser
// primitives do not offer — but grave-green, wider (the core is 2x2) and
// slower, because this one broods rather than pulses.
//
// It is NOT a readiness signal like the gloom. It is what finishing the
// upgrade ladder looks like, so once earned it stays.
const PALL = {
  haze:       0x3f7a3a,   // the outer wash
  core:       0x9fe08a,   // grave-light at its heart
  hazeAlpha:  0.18,
  midAlpha:   0.24,
  coreAlpha:  0.28,
  widthMult:  0.92,
  heightMult: 0.30,
  pulseMs:    2600,
};

function updateNecropolisPall(){
  if(!scene || !scene.add) return;
  for(const b of state.buildings){
    const lit = isMine(b) && b.isCore && b.hp > 0 && !underConstruction(b)
             && (b.level || 1) >= TC_LEVELS.maxLevel;
    if(!lit){
      if(b.pall){
        scene.tweens.killTweensOf(b.pall);   // a tween outliving its target throws
        b.pall.destroy();
        b.pall = null;
      }
      continue;
    }
    if(b.pall) continue;   // already wreathed — the tween keeps it breathing
    const size = b.size || 1;
    const w = size*TILE*PALL.widthMult, h = size*TILE*PALL.heightMult;
    const haze = scene.add.ellipse(0, 0, w*1.40, h*1.60, PALL.haze, PALL.hazeAlpha);
    const mid  = scene.add.ellipse(0, 0, w,      h,      PALL.haze, PALL.midAlpha);
    const core = scene.add.ellipse(0, 0, w*0.50, h*0.55, PALL.core, PALL.coreAlpha);
    const baseY = b.gy*TILE + size*TILE - 6;
    b.pall = scene.add
      .container(b.gx*TILE + size*TILE/2, baseY, [haze, mid, core])
      .setDepth(7);
    scene.tweens.add({
      targets: b.pall,
      alpha: { from: 0.60, to: 1 },
      scale: { from: 0.95, to: 1.05 },
      y:     { from: baseY, to: baseY - 2 },
      duration: PALL.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }
}

// ---- a seeded mound rises ---------------------------------------------
// Spread Blight used to claim ground the instant you clicked. Now the mound is
// placed at once but lies inert for SWARM.creep.spreadGrowMs: no blight of its
// own, no charge toward its own spread, and drawn faint so the map shows it is
// not finished. This is what gives an opponent a window to answer a seeding.
function updateBlightGrowth(delta){
  for(const b of myBuildings()){
    if(!(b.growMs > 0)) continue;
    b.growMs -= delta;
    if(b.growMs > 0){
      // fade up as it comes: 0.45 -> 1.0 across the wait
      if(b.sprite && b.sprite.setAlpha){
        const t = 1 - Math.max(0, b.growMs) / SWARM.creep.spreadGrowMs;
        b.sprite.setAlpha(0.45 + 0.55 * t);
      }
      continue;
    }
    b.growMs = 0;
    if(b.sprite && b.sprite.setAlpha) b.sprite.setAlpha(1);
    if(scene && scene.add) floatResourceText(b.gx, b.gy, 'risen!', '#b6c98a');
    updateCreep();                  // NOW the ground turns
    markMinimapDirty();
  }
}

// ---- blight recedes from the dead --------------------------------------
// Kill a Grave Mound and the ground it anchored lets go. A tile survives if it
// is still within reach of ANY living source, so overlapping territory simply
// stays — which is the rule without needing to remember who claimed what.
//
// Recomputed rather than attributed per tile: the creep grid is a plain
// boolean and giving every tile an owner would mean a second grid to keep,
// serialize and restore, plus a tie-break for tiles two mounds both reached.
//
// Deliberately SLOW. It recedes a few tiles per pulse from the outside in, so
// losing a mound reads as territory bleeding away rather than a hole appearing.
const CREEP_FADE = {
  pulseMs:       700,
  tilesPerPulse: 4,
};

function unclaimCreepTile(gx, gy){
  if(!isCreeped(gx, gy)) return false;
  state.creep[gy][gx] = false;
  state._creepCount = Math.max(0, state._creepCount - 1);
  const spr = state.tileSprites[gy] && state.tileSprites[gy][gx];
  if(spr && spr.setFrame) spr.setFrame(frameForGroundTile(gx, gy));
  return true;
}

function fadeOrphanedCreep(delta, sources){
  if(!state.creep || !state._creepCount) return;
  state._creepFadeMs = (state._creepFadeMs || 0) + delta;
  if(state._creepFadeMs < CREEP_FADE.pulseMs) return;
  state._creepFadeMs = 0;
  // No living source at all means the faction is gone; leave the ground be
  // rather than erasing the map out from under a lost game.
  if(!sources || !sources.length) return;
  const orphans = [];
  for(let y = 0; y < MAP_H; y++){
    for(let x = 0; x < MAP_W; x++){
      if(!state.creep[y][x]) continue;
      let held = false, near = Infinity;
      for(const s of sources){
        const d = Math.hypot(x - s.gx, y - s.gy);
        if(d <= s.r){ held = true; break; }
        if(d < near) near = d;
      }
      if(!held) orphans.push({ x, y, d: near });
    }
  }
  if(!orphans.length) return;
  // furthest from any surviving source goes first, so the edge recedes inward
  orphans.sort((a, b) => b.d - a.d);
  for(let i = 0; i < Math.min(CREEP_FADE.tilesPerPulse, orphans.length); i++){
    unclaimCreepTile(orphans[i].x, orphans[i].y);
  }
  markMinimapDirty();
}
