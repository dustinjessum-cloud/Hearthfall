// ---------------------------------------------------------------------
// The Grove — a living forest
//
// The other three factions build TOWNS: a cluster of independent buildings
// that each work on their own. The Grove builds a NETWORK. Nothing it grows
// functions in isolation; a structure is inert until a root reaches it, and
// everything it produces travels back along those roots to the Heartwood.
//
// The design, as settled:
//   - PLACE ANYWHERE, THEN LINK. A seed can be sown on any open ground. It
//     lies dormant while a root creeps toward it from the nearest connected
//     structure, and only wakes when the root arrives. So expansion is a
//     commitment made before it pays off, and the enemy can see it coming.
//   - CONNECTION IS BOTH LIFE AND LOGISTICS. A severed structure stops
//     producing entirely, and its yield has to flow home along an unbroken
//     chain. Cutting the trunk kills the canopy — an attacker who reads the
//     network can do far more damage than one who just razes the nearest
//     thing.
//   - NO GATHERERS. Structures yield simply by living and being connected,
//     so GROWING IS THE ECONOMY. A handful of Sprouts tend the forest, but
//     they are a small, capped crew, not a workforce to be scaled.
//   - IT MATURES. Every structure ages through visible stages, getting
//     tougher and more productive — but ordinary growth is CAPPED so an old
//     forest cannot snowball. Only the Heartwood keeps growing past that
//     ceiling, so the oldest tree is always the heart of the thing.
// ---------------------------------------------------------------------

const GROVE = {
  // The Heartwood is the tree the grove sprang FROM — it starts already
  // grown, not as a seed. Without this it defaulted to stage 0 and rendered
  // as a sapling-sized speck that had to mature through three stages before
  // looking like the heart of anything.
  heartwoodStartStage: 2,

  // --- growth stages ---
  // Every structure walks these in order. A seed is fragile and does nothing;
  // it is the window in which a raider can cheaply kill an expansion.
  stages: [
    { name:'Seed',    hpMult:0.25, yieldMult:0,    scale:0.45 },
    { name:'Sapling', hpMult:0.55, yieldMult:0.5,  scale:0.7  },
    { name:'Grown',   hpMult:1.0,  yieldMult:1.0,  scale:1.0  },
    { name:'Ancient', hpMult:1.4,  yieldMult:1.35, scale:1.15 },
  ],
  stageMs: 45000,          // time per stage
  maxStage: 3,             // ordinary structures stop at Ancient...
  heartwoodMaxStage: 5,    // ...the Heartwood keeps going, and stays the heart

  // --- roots ---
  rootGrowTilesPerSec: 1.6,  // how fast a root creeps toward a dormant seed
  rootMaxLen: 9,             // a seed further than this from the network is unreachable
  rootColor: 0x6b8f4a,

  // --- Ents: one at a time, and dear ---
  // An Ent is not a workforce, it is a caretaker. You begin with ONE and
  // every further one is a real decision, so tending is something you place
  // deliberately rather than something you scale.
  startingEnts: 1,
  entCost: { food: 60, wood: 40 },
  tendRadius: 3,
  tendBonus: 0.25,           // a tended structure yields this much more

  // --- yield ---
  // Structures pay out on the economy tick. Everything is per-tick and
  // multiplied by stage, so growth compounds naturally without a chain.
  tickYield: { food: 1.2, wood: 1.0 },
};

// ---- the network -----------------------------------------------------
// Membership is derived, never stored: a structure is connected if a chain
// of live roots reaches the Heartwood. Recomputing means a severed limb goes
// dormant the instant the trunk dies, with no bookkeeping to get wrong.
function groveHeartwood(){
  return state.buildings.find(b => b.isCore && isMine(b) && b.hp > 0) || null;
}

function groveStructures(){
  return myBuildings().filter(b => b.hp > 0);
}

// Flood out from the Heartwood along completed roots. Returns the set of
// connected building ids.
function groveConnectedIds(){
  const heart = groveHeartwood();
  const live = new Set();
  if(!heart) return live;
  live.add(heart.id);
  const links = (state.groveRoots || []).filter(r => r.done);
  let grew = true;
  while(grew){
    grew = false;
    for(const r of links){
      const a = live.has(r.fromId), b = live.has(r.toId);
      if(a !== b){ live.add(r.fromId); live.add(r.toId); grew = true; }
    }
  }
  return live;
}

function isGroveConnected(b){
  if(!b) return false;
  if(b.isCore) return true;
  return groveConnectedIds().has(b.id);
}

// ---- growth ----------------------------------------------------------
function groveStage(b){ return Math.min(b.groveStage || 0, GROVE.stages.length - 1); }
function groveStageDef(b){ return GROVE.stages[groveStage(b)]; }
function groveMaxStage(b){
  return b.isCore ? Math.min(GROVE.heartwoodMaxStage, GROVE.stages.length-1) : GROVE.maxStage;
}

// A structure only ages while it is CONNECTED. A cut-off limb does not just
// stop producing, it stops growing — so severing is a real setback, not a
// pause.
function updateGroveGrowth(delta){
  if(state.faction !== 'grove') return;
  const connected = groveConnectedIds();
  for(const b of groveStructures()){
    if(underConstruction(b)) continue;
    if(!b.isCore && !connected.has(b.id)) continue;
    if(groveStage(b) >= groveMaxStage(b)) continue;
    b.groveAgeMs = (b.groveAgeMs || 0) + delta;
    if(b.groveAgeMs >= GROVE.stageMs){
      b.groveAgeMs = 0;
      b.groveStage = groveStage(b) + 1;
      applyGroveStage(b);
      if(scene && scene.add) floatResourceText(b.gx, b.gy, groveStageDef(b).name, '#9fe08a');
    }
  }
}

// Push a structure's stage onto its actual stats and sprite.
function applyGroveStage(b){
  const st = groveStageDef(b);
  const base = b.baseMaxHp || (b.baseMaxHp = b.maxHp);
  b.maxHp = Math.round(base * st.hpMult);
  b.hp = Math.min(b.hp <= 0 ? 0 : Math.max(b.hp, 1), b.maxHp);
  if(b.sprite && b.sprite.setScale){
    const size = b.size || 1;
    b.sprite.setScale(st.scale * size);
  }
}

// ---- roots -----------------------------------------------------------
// A root is a growing line from an already-connected structure to a dormant
// seed. It is an entity, not a rule: it takes time, it is visible, and the
// seed stays inert until it lands.
function nearestConnectedTo(gx, gy){
  const connected = groveConnectedIds();
  let best = null, bd = Infinity;
  for(const b of groveStructures()){
    if(!connected.has(b.id)) continue;
    const d = Phaser.Math.Distance.Between(b.gx, b.gy, gx, gy);
    if(d < bd){ bd = d; best = b; }
  }
  return best ? { building: best, dist: bd } : null;
}

function startRootTo(b){
  const src = nearestConnectedTo(b.gx, b.gy);
  if(!src) return false;
  if(src.dist > GROVE.rootMaxLen) return false;   // too far to reach
  const r = {
    fromId: src.building.id, toId: b.id,
    x0: src.building.gx, y0: src.building.gy,
    x1: b.gx, y1: b.gy,
    progress: 0, done: false, gfx: null,
  };
  (state.groveRoots = state.groveRoots || []).push(r);
  return true;
}

function updateGroveRoots(delta){
  if(state.faction !== 'grove') return;
  const roots = state.groveRoots || [];
  for(const r of roots){
    if(r.done) continue;
    const from = buildingById(r.fromId), to = buildingById(r.toId);
    // a root whose either end died is dead itself
    if(!from || from.hp<=0 || !to || to.hp<=0){ r.dead = true; continue; }
    const len = Math.hypot(r.x1-r.x0, r.y1-r.y0) || 1;
    r.progress = Math.min(1, r.progress + (GROVE.rootGrowTilesPerSec * (delta/1000)) / len);
    if(r.progress >= 1){
      r.done = true;
      if(scene && scene.add) floatResourceText(to.gx, to.gy, 'rooted', '#9fe08a');
    }
  }
  state.groveRoots = roots.filter(r => !r.dead);
  drawGroveRoots();
}

// One graphics object for every root, redrawn per frame. Cheap, and it means
// a severed root vanishes the moment its building dies.
// Roots, drawn as roots rather than as a line. A straight segment read as a
// wire between two boxes; real roots taper, wander, and throw off side
// shoots. The wander is derived from the root's own endpoints so it is
// identical every frame — no per-frame randomness, no crawling.
function drawGroveRoots(){
  if(!scene || !scene.add) return;
  if(!scene._rootGfx) scene._rootGfx = scene.add.graphics().setDepth(1);
  const g = scene._rootGfx;
  g.clear();

  const ROOT_D = 0x4a6b32, ROOT = 0x6b8f4a, ROOT_L = 0x8fb46a;
  for(const r of (state.groveRoots || [])){
    const ax = r.x0*TILE + TILE/2, ay = r.y0*TILE + TILE/2;
    const bx = r.x1*TILE + TILE/2, by = r.y1*TILE + TILE/2;
    const dx = bx-ax, dy = by-ay;
    const len = Math.hypot(dx,dy) || 1;
    const nx = -dy/len, ny = dx/len;              // perpendicular, for the wander
    // deterministic wobble seeded from the endpoints
    const seed = (r.x0*73856093) ^ (r.y0*19349663) ^ (r.x1*83492791) ^ (r.y1*2971215073);
    const amp = Math.min(10, len*0.16);
    const pts = [];
    const STEPS = 14;
    for(let i=0;i<=STEPS;i++){
      const t = i/STEPS;
      if(t > r.progress + 0.0001) break;
      // two offset sine waves so the curve is organic rather than a neat arc
      const w = Math.sin(t*Math.PI) * (Math.sin(t*5.1 + (seed%7)) * 0.6 + Math.sin(t*2.3 + (seed%5)) * 0.4);
      pts.push([ax + dx*t + nx*w*amp, ay + dy*t + ny*w*amp]);
    }
    if(pts.length < 2) continue;

    // draw thick-to-thin in three passes: dark underside, body, lit top. The
    // taper is what makes it read as a root instead of a cable.
    for(const [col, wid, off] of [[ROOT_D, 5, 1], [ROOT, 3.5, 0], [ROOT_L, 1.5, -1]]){
      for(let i=1;i<pts.length;i++){
        const t = i/STEPS;
        g.lineStyle(Math.max(1, wid*(1 - t*0.55)), col, r.done ? 0.95 : 0.65);
        g.beginPath();
        g.moveTo(pts[i-1][0], pts[i-1][1] + off);
        g.lineTo(pts[i][0],   pts[i][1] + off);
        g.strokePath();
      }
    }
    // side shoots, so it branches the way a root does
    for(let i=3;i<pts.length-1;i+=4){
      const t=i/STEPS, sl = 5*(1-t*0.6), dir = (i%8===3)?1:-1;
      g.lineStyle(Math.max(1, 2*(1-t*0.5)), ROOT_D, r.done ? 0.8 : 0.5);
      g.beginPath();
      g.moveTo(pts[i][0], pts[i][1]);
      g.lineTo(pts[i][0] + nx*sl*dir + dx/len*sl*0.4,
               pts[i][1] + ny*sl*dir + dy/len*sl*0.4);
      g.strokePath();
    }
    // a bud at the growing tip while it is still travelling
    if(!r.done){
      const tip = pts[pts.length-1];
      g.fillStyle(ROOT_L, 0.9);
      g.fillCircle(tip[0], tip[1], 2.5);
    }
  }
}

// ---- yield -----------------------------------------------------------
// Called from the economy tick. No gatherers: a connected, grown structure
// simply pays out, scaled by its stage and by whether a Sprout is tending it.
function groveEconomyTick(){
  if(state.faction !== 'grove') return;
  const connected = groveConnectedIds();
  // Grove workers are created through createVillager, so their type is
  // 'villager' — this filtered on 'sprout', a type that never existed, so the
  // tend bonus had NEVER applied to anything.
  const tenders = state.units.filter(u => u.type === 'villager' && u.hp > 0 && !u.inTC);
  for(const b of groveStructures()){
    if(underConstruction(b)) continue;
    if(!connected.has(b.id)) continue;             // severed: yields nothing
    const def = BUILD_DEFS[b.type];
    if(!def || !def.groveYield) continue;
    const st = groveStageDef(b);
    if(st.yieldMult <= 0) continue;                // a seed pays nothing
    const tended = tenders.some(s =>
      Phaser.Math.Distance.Between(s.gx, s.gy, b.gx, b.gy) <= GROVE.tendRadius);
    const mult = st.yieldMult * (tended ? 1 + GROVE.tendBonus : 1);
    for(const k in def.groveYield){
      addResource(k, def.groveYield[k] * mult);
    }
  }
}

// ---- roster ----------------------------------------------------------
function applyGroveFaction(){
  // Yields are per-tick and flow home along the roots; there is no gathering
  // building because there is no gathering.
  BUILD_DEFS.house       = { name:'Bower', cost:{wood:16}, hp:60, frame:'grove_bower', popCap:3 };
  BUILD_DEFS.farm        = { name:'Fruiting Bough', cost:{wood:14}, hp:55, frame:'grove_bough',
                             groveYield:{ food: GROVE.tickYield.food } };
  BUILD_DEFS.lumber_camp = { name:'Heartroot', cost:{wood:16}, hp:55, frame:'tribe_timber',
                             groveYield:{ wood: GROVE.tickYield.wood } };
  BUILD_DEFS.quarry      = { name:'Stonebark', cost:{wood:24}, hp:65, frame:'tribe_pit',
                             groveYield:{ stone: 0.7 } };
  BUILD_DEFS.barracks    = { name:'Thornhall', cost:{wood:34}, hp:100, frame:'tribe_warlodge',
                             trains:'archer' };
  BUILD_DEFS.tower       = { name:'Bramble Spire', cost:{wood:26}, hp:130, frame:'grove_spire',
                             blocksPath:true, garrison:true,
                             attack:{ range:4.0, damage:6, damageLow:4, cooldownMs:950 } };
  BUILD_DEFS.granary     = { name:'Hollow', cost:{wood:22}, hp:80, frame:'tribe_cache', nearTC:true };
  BUILD_DEFS.warehouse   = { name:'Deep Hollow', cost:{wood:28}, hp:80, frame:'tribe_stock', nearTC:true };
  BUILD_DEFS.wall        = { name:'Thicket', cost:{wood:5}, hp:90, frame:'grove_thicket',
                             variants:{ straight:'grove_thicket', vert:'grove_thicket', corner:'grove_thicket' },
                             blocksPath:true };
  BUILD_DEFS.gate        = { name:'Thornway', cost:{wood:7}, hp:90, frame:'tribe_gate',
                             blocksPath:true, friendlyPassable:true };
  BUILD_DEFS.road        = { name:'Deer Path', cost:{wood:2}, frame:'dirt', tint:0x8fae6a, isRoad:true };

  BUILD_CATEGORIES.splice(0, BUILD_CATEGORIES.length,
    { key:'economy', label:'Grow',    types:['house','farm','lumber_camp','quarry','road'] },
    { key:'trade',   label:'Hollows', types:['granary','warehouse'] },
    { key:'defense', label:'Thorns',  types:['wall','gate','tower','barracks'] },
  );

  delete SWORDSMAN_COST.stone;
  SWORDSMAN_COST.food = 30; SWORDSMAN_COST.wood = 20;
  ARCHER_COST.food = 20; ARCHER_COST.wood = 14;

  // An Ent is a caretaker, not a workforce. Deliberately expensive so that
  // a second one is a genuine decision rather than the obvious next click.
  VILLAGER_COST.food = GROVE.entCost.food;
  VILLAGER_COST.wood = GROVE.entCost.wood;
}

const GROVE_TEXT = [
  ['A Minotaur strides in, scythe in hand, to lead your soldiers!', 'The Elder Bough stirs, and the forest wakes to war!'],
  ['The Minotaur returns to the field!', 'The Elder Bough puts out new leaves!'],
  ['Population at cap — build more houses!', 'The grove is crowded — grow more Bowers!'],
  ['A new villager joins the town!', 'An Ent stirs and takes a step.'],
  ['A villager reports for duty', 'An Ent turns toward the light'],
  ['The Minotaur', 'The Elder Bough'], ['Minotaur', 'Elder Bough'],
  ['Town Hall', 'Heartwood'], ['Town Center', 'Heartwood'],
  ['Villagers', 'Ents'], ['villagers', 'ents'],
  ['Villager', 'Ent'], ['villager', 'ent'],
  ['Swordsman', 'Bramblekin'], ['swordsman', 'bramblekin'],
  ['Archer', 'Thornshot'], ['archer', 'thornshot'],
  ['soldiers', 'wardens'], ['Soldiers', 'Wardens'],
  ['town', 'grove'], ['Town', 'Grove'],
];

// Called once when a Grove world is created: the Heartwood begins mature.
function initGroveHeartwood(){
  if(state.faction !== 'grove') return;
  const h = groveHeartwood();
  if(!h) return;
  h.groveStage = GROVE.heartwoodStartStage;
  h.groveAgeMs = 0;
  applyGroveStage(h);
}
