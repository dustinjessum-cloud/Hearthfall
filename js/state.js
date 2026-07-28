// ---------------------------------------------------------------------
// Building ownership
//
// state.buildings holds EVERY structure on the map, yours and the enemy
// town's alike, because occupancy and pathing have to see all of them —
// their wall blocks your villager exactly like your own does.
//
// Almost nothing else wants that. Your economy tick, storage caps,
// population, happiness and build bar must count only what you own, or
// the enemy's granary silently raises your food cap and their houses
// raise your population. So ownership is stamped at creation and every
// consumer goes through one of these helpers rather than touching
// state.buildings directly. Reaching for the raw array is the bug.
//
// Buildings default to 'player': every existing call site created a
// player building, so an un-migrated one keeps working rather than
// quietly becoming neutral.
const OWNER_PLAYER = 'player';
const OWNER_AI = 'ai';

function buildingsOf(owner){
  const list = [];
  for(const b of state.buildings) if((b.owner || OWNER_PLAYER) === owner) list.push(b);
  return list;
}
function myBuildings(){ return buildingsOf(OWNER_PLAYER); }
function aiBuildings(){ return buildingsOf(OWNER_AI); }
function isMine(b){ return !!b && (b.owner || OWNER_PLAYER) === OWNER_PLAYER; }
function isEnemyBuilding(b){ return !!b && b.owner === OWNER_AI; }

// The player's own Town Hall. The enemy core is found via aiTownHall() so
// the two can never be confused — losing yours ends the run, razing theirs
// wins it, and a mixed-up lookup would invert both.
function townHall(){ return state.buildings.find(b=>b.isCore && isMine(b)) || null; }
function aiTownHall(){ return state.buildings.find(b=>b.isCore && isEnemyBuilding(b)) || null; }
function tcLevel(){ const th = townHall(); return th ? (th.level||1) : 1; }


// ---------------------------------------------------------------------
// Game state (outside Phaser, plain JS)
// ---------------------------------------------------------------------
const state = {
  resources: { food:50, wood:80, stone:40, wheat:0, flour:0, gold:0, wildstone:0, bone:0 },
  evolutions: { swordsman:false, archer:false },   // completed evolutions — permanent, faction-wide
  evolutionInProgress: null,                        // { type, msRemaining } or null — only one at a time
  captainRecruited: false,
  hero: { level:1, xp:0 },   // persists across death & revival
  heroProjectiles: [],       // javelins in flight
  happiness: 70,
  roads: [],             // MAP_H x MAP_W booleans — road tiles speed up walkers
  nextCaravanInMs: 240000,
  caravanActiveMs: 0,
  caravan: null,         // the physical wagon rolling to/from the market
  population: { current:0, cap:5 },  // current is derived by syncPopulationCount() from real units, never hand-set
  grid: [],              // MAP_H x MAP_W of tile type strings ('grass','forest','stone_deposit','water')
  occupied: [],          // MAP_H x MAP_W -> building ref or null
  resourceQty: [],       // MAP_H x MAP_W -> remaining units for forest/stone_deposit tiles (null elsewhere)
  tileSprites: [],        // MAP_H x MAP_W -> the Phaser image for that tile, so depletion can re-skin it
  buildings: [],         // list of building objects
  units: [],             // list of unit objects (archers)
  enemies: [],
  wave: 0,
  waveTimerMs: 210000,   // 3.5 min before the first raid
  nextWaveInMs: 210000,
  sandbox: false,        // TESTING: keeps resources at cap (see toggleSandbox)
  corridorOpen: false,   // set once RAIDS_BEFORE_CORRIDOR raids are survived
  aiTownSpawned: false,  // guards the victory check before the town exists
  aiTownCenter: null,
  aiFaction: null,       // which of the four the enemy town plays — drawn per run, never yours
  gameOver: false,
  selected: null,        // {type:'building'|'unit', ref}
  selectedGroup: [],     // drag-box multi-selection of friendly units
  buildMode: null,       // building type key while placing
  castMode: null,        // { unitId } while aiming a targeted ability
  controlGroups: {},     // n -> [unitId] — see js/groups.js
  paused: false,
  manualRecall: false,   // player-toggled "Recall Workers"
  starving: false,       // true while food is at zero — units bleed HP
  nextSkirmishInMs: 180000, // small harassment raids between the big waves
  faction: 'human',      // 'human' | 'swarm' — set by the start screen
  creep: [],             // MAP_H x MAP_W booleans (swarm territory & build-space)
  _creepCount: 0,        // cached count for the passive biomass trickle
  saplings: [],          // tribe: planted trees still maturing into forest
  groveRoots: [],        // grove: root links, grown or growing, between structures
  // grove: the Redirect Nutrients channel. Declared here rather than left to
  // groveRedirect()'s lazy init so a cooldown cannot survive into a new game.
  groveRedirect: { targetId:null, msLeft:0, cooldownMs:0 },
  corpses: [],           // fallen humans awaiting raise (undead) / burial (humans) — see CORPSE
  burialBoost: 0,        // decaying happiness honor from recent burials (human faction)
  enemyProjectiles: [],  // spears/bolts/etc. loosed by ranged raiders (transient — not saved)
};


// Raids NO LONGER auto-pause gathering — sheltering workers is the
// player's call. Toggle Recall Workers to pull everyone near the TC, or
// garrison individual villagers INSIDE the Town Hall (right-click it).
// "Is a raid happening TO YOU right now." Deliberately narrow.
//
// state.enemies holds more than raiders: bandit camps, the enemy town's
// standing garrison, and its workers all live here so they can be rendered,
// targeted and killed by code that already works. Counting those meant this
// returned true from the moment the enemy town existed and never went false
// again — which permanently blocked the corridor from opening, left the HUD
// insisting you "clear the last of them" about defenders behind a sealed
// pass you cannot cross, and disabled Ready for Raid for the rest of the run.
//
// A Phase 4 attack party is neither a homeGuard nor a worker, so it will
// still count here — which is exactly what we want.
function isRaidActive(){
  return state.enemies.some(e =>
    e.hp > 0 && e.kind !== 'camp' && e.kind !== 'ai_worker' && !e.homeGuard);
}
function isRecalled(){ return state.manualRecall; }

// ---- zones ----------------------------------------------------------
// Which band a column falls in. Used to keep raid spawns, bandit camps and
// resource density inside the right part of the world — on a 142-wide map
// an edge spawn picked from the full width would drop raiders 120 tiles
// away inside the enemy town.
function zoneOf(gx){
  for(const name in ZONES){ const z = ZONES[name]; if(gx >= z.x0 && gx <= z.x1) return name; }
  return null;
}
function inZone(gx, name){ const z = ZONES[name]; return !!z && gx >= z.x0 && gx <= z.x1; }
function zoneWidth(name){ const z = ZONES[name]; return z ? z.x1 - z.x0 + 1 : 0; }
function zoneCenter(name){
  const z = ZONES[name];
  return z ? { gx: Math.floor((z.x0 + z.x1)/2), gy: Math.floor(MAP_H/2) } : null;
}
function isImpassableTile(t){ return IMPASSABLE_TILES.has(t); }
// True while the passes are still plugged — the whole pre-corridor game.
function corridorSealed(){ return !state.corridorOpen; }

function inBounds(gx,gy){ return gx>=0 && gy>=0 && gx<MAP_W && gy<MAP_H; }
function tileAt(gx,gy){ return inBounds(gx,gy) ? state.grid[gy][gx] : null; }
function occAt(gx,gy){ return inBounds(gx,gy) ? state.occupied[gy][gx] : null; }

const RESOURCE_QTY_RANGE = { forest: [90, 140], stone_deposit: [180, 260], wildstone_deposit: [40, 70], bone_pile: BONE_PILE_QTY };

function generateMap(){
  for(let y=0;y<MAP_H;y++){
    const row=[]; const orow=[]; const qrow=[]; const srow=[];
    const rrow=[];
    for(let x=0;x<MAP_W;x++){ row.push('grass'); orow.push(null); qrow.push(null); srow.push(null); rrow.push(false); }
    state.grid.push(row); state.occupied.push(orow); state.resourceQty.push(qrow); state.tileSprites.push(srow); state.roads.push(rrow);
  }
  // Your town sits at the middle of the HOME band, not the middle of the
  // world — the world's midpoint is now the neutral zone.
  const home = zoneCenter('home');
  const cx = home.gx, cy = home.gy;
  function nearCenter(x,y,d){ return Math.abs(x-cx)<=d && Math.abs(y-cy)<=d; }

  // Resource blobs, confined to one band. Everything is generated per-zone
  // now so the neutral middle can be made genuinely richer than home
  // without also fattening the ground you start on.
  function blob(zone, type, count, minD){
    const z = ZONES[zone];
    const lo0 = z.x0 + 1, hi0 = z.x1 - 1;
    let x = Phaser.Math.Between(lo0, hi0);
    let y = Phaser.Math.Between(2, MAP_H-3);
    let tries=0;
    while(nearCenter(x,y,minD) && tries<50){ x=Phaser.Math.Between(lo0,hi0); y=Phaser.Math.Between(2,MAP_H-3); tries++; }
    for(let i=0;i<count;i++){
      if(inBounds(x,y) && !nearCenter(x,y,5) && state.grid[y][x]==='grass'){
        state.grid[y][x]=type;
        const [lo,hi] = RESOURCE_QTY_RANGE[type];
        state.resourceQty[y][x] = Phaser.Math.Between(lo,hi);
      }
      const dir = Phaser.Math.Between(0,3);
      if(dir===0) x++; else if(dir===1) x--; else if(dir===2) y++; else y--;
      x = Phaser.Math.Clamp(x, lo0, hi0); y = Phaser.Math.Clamp(y,1,MAP_H-2);
    }
  }

  function scatterWildstone(zone, n, minD){
    const z = ZONES[zone];
    let placed = 0, attempts = 0;
    while(placed < n && attempts < 400){
      attempts++;
      const x = Phaser.Math.Between(z.x0+1, z.x1-1), y = Phaser.Math.Between(2, MAP_H-3);
      if(nearCenter(x,y,minD)) continue;
      if(state.grid[y][x] !== 'grass') continue;
      state.grid[y][x] = 'wildstone_deposit';
      const [lo,hi] = RESOURCE_QTY_RANGE.wildstone_deposit;
      state.resourceQty[y][x] = Phaser.Math.Between(lo,hi);
      state._wildstoneSites.push({gx:x, gy:y});
      placed++;
    }
  }

  state._wildstoneSites = [];

  // Bone piles: rare, huge, and spread across ALL THREE playable bands so an
  // undead player has to push blight outward to reach more than the first
  // one. Placed before the resource blobs so they get first pick of open
  // ground rather than landing on a forest.
  state._bonePiles = [];
  {
    let tries = 0;
    while(state._bonePiles.length < BONE_PILE_COUNT && tries < 900){
      tries++;
      const zoneName = ['home','neutral','enemy'][tries % 3];
      const z = ZONES[zoneName];
      const x = Phaser.Math.Between(z.x0+2, z.x1-2), y = Phaser.Math.Between(2, MAP_H-3);
      if(nearCenter(x,y,8)) continue;                       // never on your doorstep
      if(state.grid[y][x] !== 'grass') continue;
      let tooClose = false;
      for(const b of state._bonePiles){
        if(Math.hypot(x-b.gx, y-b.gy) < BONE_PILE_MIN_GAP){ tooClose = true; break; }
      }
      if(tooClose) continue;
      state.grid[y][x] = 'bone_pile';
      const [lo,hi] = RESOURCE_QTY_RANGE.bone_pile;
      state.resourceQty[y][x] = Phaser.Math.Between(lo,hi);
      state._bonePiles.push({gx:x, gy:y});
    }
  }

  // -- home band: unchanged from the pre-corridor game, so the opening plays
  //    exactly as it always has --
  for(let i=0;i<9;i++) blob('home', 'forest', Phaser.Math.Between(9,15), 5);
  for(let i=0;i<7;i++) blob('home', 'stone_deposit', Phaser.Math.Between(10,16), 5);
  scatterWildstone('home', 5, 7);

  // -- enemy band: mirrors home, so their start is as good as yours --
  for(let i=0;i<9;i++) blob('enemy', 'forest', Phaser.Math.Between(9,15), 0);
  for(let i=0;i<7;i++) blob('enemy', 'stone_deposit', Phaser.Math.Between(10,16), 0);
  scatterWildstone('enemy', 5, 0);

  // -- neutral middle: the prize. Denser blobs AND more of them, plus the
  //    lion's share of the wildstone, so holding it is worth the exposure --
  for(let i=0;i<11;i++) blob('neutral', 'forest', Phaser.Math.Between(14,22), 0);
  for(let i=0;i<10;i++) blob('neutral', 'stone_deposit', Phaser.Math.Between(15,24), 0);
  scatterWildstone('neutral', 9, 0);

  // -- the two passes: solid rock with a narrow gap carved through the
  //    middle. The gap starts plugged; surviving the raids clears it. The
  //    surrounding rock is permanent, which is what makes the opened pass a
  //    chokepoint rather than just more open ground. --
  for(const passName of ['passWest','passEast']){
    const z = ZONES[passName];
    for(let y=0;y<MAP_H;y++){
      for(let x=z.x0;x<=z.x1;x++) state.grid[y][x] = 'sealed_pass';
    }
  }

  // small lake, home band only
  const hz = ZONES.home;
  const lx = Phaser.Math.Between(hz.x0+3, hz.x1-7), ly = Phaser.Math.Between(3, MAP_H-8);
  if(!nearCenter(lx,ly,7)){
    for(let y=ly;y<ly+3;y++) for(let x=lx;x<lx+4;x++) if(inBounds(x,y) && !nearCenter(x,y,5)) state.grid[y][x]='water';
  }
  return {cx, cy};
}

// Clear the gap through both passes. Called when the raids are survived;
// only the gap rows become walkable, the rest of the rock stays forever.
function openCorridor(){
  if(state.corridorOpen) return [];
  state.corridorOpen = true;
  const midY = Math.floor(MAP_H/2);
  const cleared = [];
  for(const passName of ['passWest','passEast']){
    const z = ZONES[passName];
    for(let y=midY-PASS_GAP_HALF; y<=midY+PASS_GAP_HALF; y++){
      for(let x=z.x0; x<=z.x1; x++){
        if(!inBounds(x,y)) continue;
        state.grid[y][x] = 'grass';
        cleared.push({gx:x, gy:y});
      }
    }
  }
  return cleared;
}

