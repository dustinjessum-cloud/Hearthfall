// ---------------------------------------------------------------------
// The enemy town
//
// Phase 2: static infrastructure. The town is laid out at world creation,
// defends itself with towers and a standing garrison, and razing its core
// wins the run. It has no economy and never attacks you — its workers,
// build orders and armies arrive in Phases 3 and 4, and this file is where
// they will live.
// ---------------------------------------------------------------------

// How the town is arranged, relative to its core. Kept as data so the
// layout can be reshaped without touching placement code.
const AI_TOWN_PLAN = {
  // ring of towers facing the pass you will arrive through, plus a couple
  // covering the flanks — an undefended base is a demolition job, not a fight
  towers:   [ [-6,-5], [-6,5], [-6,0], [2,-7], [2,7] ],
  barracks: [ [3,-2], [3,3] ],
  houses:   [ [-3,-4], [-1,-5], [1,-4], [-3,4], [-1,5], [1,4], [4,0] ],
  farms:    [ [5,-4], [6,-2], [5,3], [6,1] ],
  lumber:   [ [-4,-2], [-4,2] ],
  quarry:   [ [4,-6], [4,6] ],
  // a partial wall screening the western approach, with gaps — a solid
  // shell would just stall your army on a wall it has to chew through
  walls:    [ [-8,-4], [-8,-3], [-8,-2], [-8,2], [-8,3], [-8,4] ],
  // standing defenders, as offsets from the core
  garrison: { melee: [ [-5,-2], [-5,2], [-2,0] ], ranged: [ [-4,-4], [-4,4], [0,-3], [0,3] ] },
};

function aiTownCenter(){
  const z = zoneCenter('enemy');
  return z || { gx: Math.floor(MAP_W*0.85), gy: Math.floor(MAP_H/2) };
}

// Can an AI structure of this size stand here? Trees and rock do NOT block:
// a town clears its own ground, and clearGroundFor below does exactly that.
// Refusing on terrain meant a forest blob rolled over the town centre could
// stop the CORE from placing at all — and a town with no core hands you
// instant victory on frame one, before you have even seen it.
function aiCanPlace(gx, gy, size){
  for(let dy=0; dy<size; dy++){
    for(let dx=0; dx<size; dx++){
      const x = gx+dx, y = gy+dy;
      if(!inBounds(x,y)) return false;
      if(!inZone(x, 'enemy')) return false;   // never spill into the pass
      if(isImpassableTile(tileAt(x,y))) return false;  // water/rock stays
      if(occAt(x,y)) return false;
    }
  }
  return true;
}

// Fell the trees and clear the rubble under a footprint, re-skinning the
// tiles so the map matches what the grid now says.
function clearGroundFor(gx, gy, size){
  for(let dy=0; dy<size; dy++){
    for(let dx=0; dx<size; dx++){
      const x = gx+dx, y = gy+dy;
      if(!inBounds(x,y)) continue;
      if(state.grid[y][x] === 'grass') continue;
      state.grid[y][x] = 'grass';
      state.resourceQty[y][x] = null;
      const spr = state.tileSprites[y] && state.tileSprites[y][x];
      if(spr && spr.setFrame){ spr.setFrame(FRAME.grass); if(spr.clearTint) spr.clearTint(); }
    }
  }
}

function placeAiBuilding(type, gx, gy){
  const def = aiDef(type);
  if(!def) return null;
  const size = def.size || 1;
  if(!aiCanPlace(gx, gy, size)) return null;
  clearGroundFor(gx, gy, size);
  const b = createBuilding(type, gx, gy, def, OWNER_AI);
  b.aiType = type;
  if(def.isCore) b.isCore = true;
  return b;
}

// Lay the town out around its core. Anything that will not fit is simply
// skipped — a blocked slot costs the enemy one building, it does not throw.
function generateAiTown(){
  const c = aiTownCenter();
  const built = [];

  // The core must exist — the whole win condition hangs off it. If the exact
  // centre is somehow unusable (map edge, water), spiral outward rather than
  // give up: a town without a core would hand the player instant victory.
  let core = placeAiBuilding('ai_core', c.gx, c.gy);
  for(let r=1; !core && r<=6; r++){
    for(let dy=-r; dy<=r && !core; dy++){
      for(let dx=-r; dx<=r && !core; dx++){
        if(Math.abs(dx)!==r && Math.abs(dy)!==r) continue;   // ring only
        core = placeAiBuilding('ai_core', c.gx+dx, c.gy+dy);
      }
    }
  }
  if(core){ built.push(core); c.gx = core.gx; c.gy = core.gy; }
  else console.error('Enemy town could not place its core — victory check stays disarmed.');

  const groups = [
    ['ai_tower',    AI_TOWN_PLAN.towers],
    ['ai_barracks', AI_TOWN_PLAN.barracks],
    ['ai_house',    AI_TOWN_PLAN.houses],
    ['ai_farm',     AI_TOWN_PLAN.farms],
    ['ai_lumber',   AI_TOWN_PLAN.lumber],
    ['ai_quarry',   AI_TOWN_PLAN.quarry],
    ['ai_wall',     AI_TOWN_PLAN.walls],
  ];
  for(const [type, offsets] of groups){
    for(const [dx,dy] of offsets){
      const b = placeAiBuilding(type, c.gx+dx, c.gy+dy);
      if(b) built.push(b);
    }
  }

  state.aiTownCenter = { gx:c.gx, gy:c.gy };
  return built;
}

// The standing garrison. These are ordinary enemies — the same entities the
// raids use — so they render, take damage and die through code that already
// works. They are spawned homeGuard:true, which pins them to the town
// instead of marching on you.
function spawnAiGarrison(){
  // the RECORDED centre, not the zone midpoint — the core spirals outward if
  // its ideal spot is unusable, and guards posted around the old midpoint
  // would be defending an empty field next to the town
  const c = state.aiTownCenter || aiTownCenter();
  const race = aiTownRace() === 'undead' ? 'undead' : 'human';
  const hp = 34, dmg = 6;
  const out = [];
  for(const [dx,dy] of AI_TOWN_PLAN.garrison.melee){
    const e = spawnEnemy(hp, dmg, 3, 'swordsman', {gx:c.gx+dx, gy:c.gy+dy}, {race});
    if(e) out.push(e);
  }
  for(const [dx,dy] of AI_TOWN_PLAN.garrison.ranged){
    const e = spawnEnemy(hp, dmg, 3, 'raider', {gx:c.gx+dx, gy:c.gy+dy}, {race, ranged:true});
    if(e) out.push(e);
  }
  // Homebodies: they defend what is theirs and never walk to your town.
  // Without this they would path straight through the sealed passes toward
  // your Town Hall the moment the world loaded.
  for(const e of out){
    e.homeGuard = true;
    e.homeGx = e.gx; e.homeGy = e.gy;
  }
  return out;
}

// Razing the core ends the run. Checked once per frame rather than hooked
// into removeBuilding so it cannot be missed by a future death path.
function checkAiDefeated(){
  if(state.gameOver || !state.aiTownSpawned) return;
  if(aiTownHall()) return;
  endGame(true);
}
