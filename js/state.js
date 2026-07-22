function townHall(){ return state.buildings.find(b=>b.isCore) || null; }
function tcLevel(){ const th = townHall(); return th ? (th.level||1) : 1; }


// ---------------------------------------------------------------------
// Game state (outside Phaser, plain JS)
// ---------------------------------------------------------------------
const state = {
  resources: { food:50, wood:80, stone:40, wheat:0, flour:0, gold:0, wildstone:0 },
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
  gameOver: false,
  selected: null,        // {type:'building'|'unit', ref}
  selectedGroup: [],     // drag-box multi-selection of friendly units
  buildMode: null,       // building type key while placing
  paused: false,
  manualRecall: false,   // player-toggled "Recall Workers"
  starving: false,       // true while food is at zero — units bleed HP
  nextSkirmishInMs: 180000, // small harassment raids between the big waves
  faction: 'human',      // 'human' | 'swarm' — set by the start screen
  creep: [],             // MAP_H x MAP_W booleans (swarm territory & build-space)
  _creepCount: 0,        // cached count for the passive biomass trickle
  corpses: [],           // fallen humans awaiting raise (undead) / burial (humans) — see CORPSE
  burialBoost: 0,        // decaying happiness honor from recent burials (human faction)
};


// Raids NO LONGER auto-pause gathering — sheltering workers is the
// player's call. Toggle Recall Workers to pull everyone near the TC, or
// garrison individual villagers INSIDE the Town Hall (right-click it).
function isRaidActive(){ return state.enemies.some(e=>e.hp>0 && e.kind!=='camp'); }
function isRecalled(){ return state.manualRecall; }

function inBounds(gx,gy){ return gx>=0 && gy>=0 && gx<MAP_W && gy<MAP_H; }
function tileAt(gx,gy){ return inBounds(gx,gy) ? state.grid[gy][gx] : null; }
function occAt(gx,gy){ return inBounds(gx,gy) ? state.occupied[gy][gx] : null; }

const RESOURCE_QTY_RANGE = { forest: [90, 140], stone_deposit: [180, 260], wildstone_deposit: [40, 70] };

function generateMap(){
  for(let y=0;y<MAP_H;y++){
    const row=[]; const orow=[]; const qrow=[]; const srow=[];
    const rrow=[];
    for(let x=0;x<MAP_W;x++){ row.push('grass'); orow.push(null); qrow.push(null); srow.push(null); rrow.push(false); }
    state.grid.push(row); state.occupied.push(orow); state.resourceQty.push(qrow); state.tileSprites.push(srow); state.roads.push(rrow);
  }
  const cx = Math.floor(MAP_W/2), cy = Math.floor(MAP_H/2);
  function nearCenter(x,y,d){ return Math.abs(x-cx)<=d && Math.abs(y-cy)<=d; }

  function blob(type, count, minD){
    let x = Phaser.Math.Between(2, MAP_W-3);
    let y = Phaser.Math.Between(2, MAP_H-3);
    let tries=0;
    while(nearCenter(x,y,minD) && tries<50){ x=Phaser.Math.Between(2,MAP_W-3); y=Phaser.Math.Between(2,MAP_H-3); tries++; }
    for(let i=0;i<count;i++){
      if(inBounds(x,y) && !nearCenter(x,y,5) && state.grid[y][x]==='grass'){
        state.grid[y][x]=type;
        const [lo,hi] = RESOURCE_QTY_RANGE[type];
        state.resourceQty[y][x] = Phaser.Math.Between(lo,hi);
      }
      const dir = Phaser.Math.Between(0,3);
      if(dir===0) x++; else if(dir===1) x--; else if(dir===2) y++; else y--;
      x = Phaser.Math.Clamp(x,1,MAP_W-2); y = Phaser.Math.Clamp(y,1,MAP_H-2);
    }
  }
  // map area is ~2.1x the old size, and stone gets an extra boost per the
  // ask for more of it — more blobs, and each blob runs longer.
  for(let i=0;i<9;i++) blob('forest', Phaser.Math.Between(9,15), 5);
  for(let i=0;i<7;i++) blob('stone_deposit', Phaser.Math.Between(10,16), 5);

  // Wildstone: rare, single-tile deposits — not blobs, by design. Pushed a
  // little further out than forest/stone (radius 7 vs 5) since the whole
  // point is that reaching it costs real exposure, not just a walk to the
  // treeline. Each one gets its own auto-generated gathering site in
  // startWorld — no player construction needed.
  state._wildstoneSites = [];
  let wsAttempts = 0;
  while(state._wildstoneSites.length < 5 && wsAttempts < 300){
    wsAttempts++;
    const x = Phaser.Math.Between(2, MAP_W-3), y = Phaser.Math.Between(2, MAP_H-3);
    if(nearCenter(x,y,7)) continue;
    if(state.grid[y][x] !== 'grass') continue;
    state.grid[y][x] = 'wildstone_deposit';
    const [lo,hi] = RESOURCE_QTY_RANGE.wildstone_deposit;
    state.resourceQty[y][x] = Phaser.Math.Between(lo,hi);
    state._wildstoneSites.push({gx:x, gy:y});
  }

  // small lake
  const lx = Phaser.Math.Between(3, MAP_W-8), ly = Phaser.Math.Between(3, MAP_H-8);
  if(!nearCenter(lx,ly,7)){
    for(let y=ly;y<ly+3;y++) for(let x=lx;x<lx+4;x++) if(inBounds(x,y) && !nearCenter(x,y,5)) state.grid[y][x]='water';
  }
  return {cx, cy};
}

