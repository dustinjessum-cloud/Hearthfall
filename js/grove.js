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
  // (root colours live in ROOT_PALETTE, below — a rootColor here was never
  //  read by anything, so a change to it silently did nothing)

  // --- Ents: one at a time, and dear ---
  // An Ent is not a workforce, it is a caretaker. You begin with ONE and
  // every further one is a real decision, so tending is something you place
  // deliberately rather than something you scale.
  startingEnts: 1,
  entCost: { food: 60, wood: 40 },
  tendRadius: 3,
  tendBonus: 0.25,           // a tended structure yields this much more

  // --- an Ent CAN gather, it is just bad at it ---
  // The Grove still earns most of what it earns by being connected and alive.
  // Gathering is a way to convert an Ent's TIME into resources when you need a
  // push, and it costs something real: an Ent out chopping is an Ent that is
  // not standing next to a structure adding its tendBonus. That trade is the
  // point, so these numbers are deliberately unflattering — a tree is slow,
  // and it does not have hands.
  //
  // Hauling is unchanged from every other faction: the Ent walks to the
  // resource, works it, and carries the load back to the camp it is assigned
  // to (Heartroot for timber, Stonebark for stone), which is what makes
  // WHERE you put those two structures matter for the first time.
  entGather: {
    harvestMult: 1.8,   // 1.8x as long at the tile as a villager
    carryMult:   0.6,   // and comes home with less
    speedMult:   0.75,  // and walks slower carrying it
  },

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

// Membership is computed in groveConnectedIds(), below the root section —
// it has to walk parentRootId chains, so it needs the roots defined first.
// An earlier copy of it lived here and flooded over r.fromId/r.toId, a shape
// roots never had (they hang off a parent ROOT, not a parent building). It
// was dead because the later definition of the same name won; it is deleted
// rather than left as a trap for whoever reorders this file.

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
// The network is a BRANCHING TREE, not a bundle of separate lines. Every
// root ultimately traces back to the Heartwood, and a new structure forks
// off the nearest point on the existing network — which may be partway along
// another root rather than at a building. Roots therefore share their trunk
// and only diverge where they must, which is both how roots actually grow
// and far tidier than five separate lines fanning out of one tree.

// Measured, not guessed: the Grove sprites put their trunk base at rows
// 28-31 of a 32px tile. At the old 0.42 the collar landed at y=18.6 — twelve
// pixels UP the trunk — so it read as a brown patch stuck to the middle of
// the tree instead of a root swell at its foot.
const ROOT_COLLAR_DROP = 0.09;   // tiles above the sprite's bottom edge

function rootCollarPoint(gx, gy, size){
  const s = size || 1;
  return { x: gx*TILE + s*TILE/2, y: gy*TILE + s*TILE - TILE*ROOT_COLLAR_DROP };
}
function buildingCollar(b){ return rootCollarPoint(b.gx, b.gy, b.size); }

let groveRootIdSeq = 1;

// Sample a root's drawn path so a new branch can attach anywhere along it.
function rootSamplePoints(r){
  const out = [];
  const STEPS = 10;
  for(let i=1;i<=STEPS;i++){
    const t=i/STEPS;
    if(t > r.progress) break;
    out.push(rootPointAt(r, t));
  }
  return out;
}

// Nearest attachment on the whole live network: the Heartwood's own collar,
// or any point along a completed root.
function nearestNetworkPoint(px, py){
  const heart = groveHeartwood();
  if(!heart) return null;
  const hc = buildingCollar(heart);
  let best = { x: hc.x, y: hc.y, parentRootId: null,
               d: Math.hypot(hc.x-px, hc.y-py) };
  for(const r of (state.groveRoots || [])){
    if(!r.done) continue;
    for(const pt of rootSamplePoints(r)){
      const d = Math.hypot(pt[0]-px, pt[1]-py);
      if(d < best.d) best = { x: pt[0], y: pt[1], parentRootId: r.id, d };
    }
  }
  return best;
}

// A root is connected if it has finished AND everything it hangs off has too,
// back to the Heartwood. Derived, never stored.
function rootChainLive(r, seen){
  if(!r || !r.done) return false;
  if(r.parentRootId == null) return true;               // hangs off the Heartwood
  seen = seen || new Set();
  if(seen.has(r.id)) return false;                      // cycle guard
  seen.add(r.id);
  const p = (state.groveRoots || []).find(x => x.id === r.parentRootId);
  return rootChainLive(p, seen);
}

function groveConnectedIds(){
  const heart = groveHeartwood();
  const live = new Set();
  if(!heart) return live;
  live.add(heart.id);
  for(const r of (state.groveRoots || [])){
    if(rootChainLive(r)) live.add(r.toId);
  }
  return live;
}

function isGroveConnected(b){
  if(!b) return false;
  if(b.isCore) return true;
  return groveConnectedIds().has(b.id);
}

function startRootTo(b){
  const dst = buildingCollar(b);
  const src = nearestNetworkPoint(dst.x, dst.y);
  if(!src) return false;
  if(src.d > GROVE.rootMaxLen * TILE) return false;     // beyond reach
  (state.groveRoots = state.groveRoots || []).push({
    id: groveRootIdSeq++,
    parentRootId: src.parentRootId,   // null = straight off the Heartwood
    x0: src.x, y0: src.y,             // world px: the fork point
    toId: b.id,
    progress: 0, done: false,
  });
  return true;
}

// Where a root is at fraction t. Roots reaching a structure ABOVE their fork
// swing wide and come up underneath, so they never cross over the building
// they are trying to reach.
function rootPointAt(r, t){
  const to = buildingById(r.toId);
  if(!to) return [r.x0, r.y0];
  const b = buildingCollar(to);
  const a = { x: r.x0, y: r.y0 };
  const around = (b.y < a.y - TILE*0.6);
  let px, py;
  if(around){
    const side = (b.x >= a.x) ? 1 : -1;
    const via = { x: b.x + side*((to.size||1)*TILE*0.55 + TILE*0.5), y: b.y + TILE*0.30 };
    const u = 1-t;
    px = u*u*a.x + 2*u*t*via.x + t*t*b.x;
    py = u*u*a.y + 2*u*t*via.y + t*t*b.y;
  } else {
    px = a.x + (b.x-a.x)*t;
    py = a.y + (b.y-a.y)*t;
  }
  // gentle deterministic wander, seeded from the endpoints
  const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
  const nx=-dy/len, ny=dx/len;
  const seed=(r.id*2654435761)>>>0;
  const w = Math.sin(t*Math.PI) * (Math.sin(t*4.7 + (seed%7))*0.6 + Math.sin(t*2.1 + (seed%5))*0.4);
  const amp = Math.min(8, len*0.08);
  return [px + nx*w*amp, py + ny*w*amp];
}

function updateGroveRoots(delta){
  if(state.faction !== 'grove') return;
  const roots = state.groveRoots || [];
  for(const r of roots){
    const to = buildingById(r.toId);
    if(!to || to.hp <= 0){ r.dead = true; continue; }
    if(r.done) continue;
    const b = buildingCollar(to);
    const len = Math.hypot(b.x - r.x0, b.y - r.y0) / TILE || 1;
    r.progress = Math.min(1, r.progress + (GROVE.rootGrowTilesPerSec * (delta/1000)) / len);
    if(r.progress >= 1){
      r.done = true;
      if(scene && scene.add) floatResourceText(to.gx, to.gy, 'rooted', '#9fe08a');
    }
  }
  // a dead root orphans everything hanging off it
  if(roots.some(r => r.dead)){
    const gone = new Set(roots.filter(r=>r.dead).map(r=>r.id));
    let changed = true;
    while(changed){
      changed = false;
      for(const r of roots){
        if(!r.dead && r.parentRootId != null && gone.has(r.parentRootId)){
          r.dead = true; gone.add(r.id); changed = true;
        }
      }
    }
    state.groveRoots = roots.filter(r => !r.dead);
  }
  drawGroveRoots();
}

// Roots are WOOD, not foliage. These were greens sampled from the canopy, so
// a root read as a vine lying on the grass rather than a limb pushing through
// it — and against grass there was barely any contrast to read the network by.
// Browned, and kept a shade deeper than the collar below so the collar still
// reads as a lit swell sitting on top of the root rather than part of it.
//
// Hoisted out of drawGroveRoots so the palette is one named thing to tune
// rather than six magic numbers buried in a draw loop.
const ROOT_PALETTE = {
  dark:  0x3b2a19,   // shadow side / outermost stroke
  mid:   0x5c4327,   // the body of the root
  light: 0x8a6842,   // lit top edge
  // A live growing tip is pale and soft, not the colour of old bark — this is
  // the only cue that a root is still creeping, so it wants to stand out.
  tip:   0xc2a878,
};
const COLLAR_PALETTE = { dark: 0x54402a, mid: 0x74583a, light: 0x967650 };

function drawGroveRoots(){
  if(!scene || !scene.add) return;
  if(!scene._rootGfx) scene._rootGfx = scene.add.graphics().setDepth(1);
  const g = scene._rootGfx;
  g.clear();
  const ROOT_D = ROOT_PALETTE.dark, ROOT = ROOT_PALETTE.mid, ROOT_L = ROOT_PALETTE.light;
  const COL_D = COLLAR_PALETTE.dark, COL = COLLAR_PALETTE.mid, COL_L = COLLAR_PALETTE.light;

  for(const r of (state.groveRoots || [])){
    const STEPS = 16;
    const pts = [];
    for(let i=0;i<=STEPS;i++){
      const t=i/STEPS;
      if(t > r.progress + 0.0001) break;
      pts.push(rootPointAt(r, t));
    }
    if(pts.length < 2) continue;
    for(const [col, wid, off] of [[ROOT_D,5,1],[ROOT,3.5,0],[ROOT_L,1.5,-1]]){
      for(let i=1;i<pts.length;i++){
        const t=i/STEPS;
        g.lineStyle(Math.max(1, wid*(1 - t*0.45)), col, r.done ? 0.95 : 0.65);
        g.beginPath();
        g.moveTo(pts[i-1][0], pts[i-1][1]+off);
        g.lineTo(pts[i][0], pts[i][1]+off);
        g.strokePath();
      }
    }
    if(!r.done){
      const tip = pts[pts.length-1];
      g.fillStyle(ROOT_PALETTE.tip, 0.95);
      g.fillCircle(tip[0], tip[1], 2.5);
    }
  }

  // collars last so roots tuck under them
  const drawn = new Set();
  const collarFor = (bb)=>{
    if(!bb || bb.hp<=0 || drawn.has(bb.id)) return;
    drawn.add(bb.id);
    const c = buildingCollar(bb);
    // Flatter than it was: a wide shallow swell reads as roots gathering,
    // where a tall oval read as a dirt patch the tree was planted in.
    const w = Math.max(5, ((bb.size||1)*TILE) * 0.19);
    g.fillStyle(COL_D, 0.9); g.fillEllipse(c.x, c.y+1, w*2.0, w*0.62);
    g.fillStyle(COL, 0.95);  g.fillEllipse(c.x, c.y,   w*1.6,  w*0.46);
    g.fillStyle(COL_L, 0.9); g.fillEllipse(c.x - w*0.3, c.y - w*0.1, w*0.66, w*0.22);
    g.lineStyle(2, COL_D, 1);
    for(let k=-1;k<=1;k++){
      g.beginPath();
      g.moveTo(c.x + k*(w*0.5), c.y + w*0.3);
      g.lineTo(c.x + k*(w*0.62), c.y + w*0.8);
      g.strokePath();
    }
  };
  const heart = groveHeartwood();
  if(heart && (state.groveRoots||[]).length) collarFor(heart);
  for(const r of (state.groveRoots || [])) collarFor(buildingById(r.toId));
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

// How much worse than a villager this unit is at gathering, or null if it is
// an ordinary gatherer. Consulted defensively (typeof) from economy.js and
// units.js so those files stay faction-agnostic, matching how isHuntCamp() is
// reached from the shared economy tick.
function groveGatherMods(u){
  if(state.faction !== 'grove') return null;
  if(!u || u.type !== 'villager') return null;   // Ents are villagers under the hood
  return GROVE.entGather;
}

// ---- roster ----------------------------------------------------------
function applyGroveFaction(){
  // Yields are per-tick and flow home along the roots; there is no gathering
  // building because there is no gathering.
  BUILD_DEFS.house       = { name:'Bower', cost:{wood:16}, hp:60, frame:'grove_bower', popCap:3 };
  BUILD_DEFS.farm        = { name:'Fruiting Bough', cost:{wood:14}, hp:55, frame:'grove_bough',
                             groveYield:{ food: GROVE.tickYield.food } };
  // These two are BOTH a passive yield and a place to work. Connected, they
  // pay out on their own like every other Grove structure; staffed by an Ent,
  // they also run the ordinary walk-harvest-haul loop against the forest or
  // rock nearby. needsWorker + bonusNear is all it takes — the gatherer,
  // hauling, depletion, dry-camp and crew-migration code is shared with every
  // other faction and needs no Grove special case.
  BUILD_DEFS.lumber_camp = { name:'Heartroot', cost:{wood:16}, hp:55, frame:'tribe_timber',
                             groveYield:{ wood: GROVE.tickYield.wood },
                             needsWorker:true, bonusNear:'forest' };
  BUILD_DEFS.quarry      = { name:'Stonebark', cost:{wood:24}, hp:65, frame:'tribe_pit',
                             groveYield:{ stone: 0.7 },
                             needsWorker:true, bonusNear:'stone_deposit' };
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
