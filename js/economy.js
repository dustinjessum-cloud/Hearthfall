// ---- Town Hall garrison ----
// Villagers tucked inside the TC are safe from harm and man the windows:
// each one adds damage to the TC's defense, at ANY Town Hall level.
// Everyone fits inside the keep, but only so many can fight from the
// windows: damage contribution caps at attackCap so a recalled workforce
// makes the TC scrappy, never a fortress.
const TC_GARRISON = { attackCap: 6, baseDamage: 2, dmgPerVillager: 1, range: 4.0, cooldownMs: 1000 };

function isWorker(u){ return u.type==='villager' || u.type==='repairman'; }
function tcGarrisonCount(){
  return state.units.filter(u=> isWorker(u) && u.hp>0 && u.inTC).length;
}

function setUnitHidden(u, hidden){
  if(u.sprite && u.sprite.setVisible) u.sprite.setVisible(!hidden);
  if(u.marker && u.marker.setVisible) u.marker.setVisible(!hidden);
  if(hidden && u.hpBarBg){ u.hpBarBg.setVisible(false); u.hpBarFg.setVisible(false); }
}

function garrisonVillagerInTC(u, quiet){
  if(u.inTC || u.enteringTC) return false;
  // NOTE: the worker KEEPS their job assignment — on release they simply
  // walk back to whatever they were doing before the recall
  u.enteringTC = true;
  u.gatherWorking = false;
  const th = scene.townHallPos;
  const spot = findFreeSpotNear(th.gx, th.gy, 4) || {gx:th.gx+2, gy:th.gy};
  u.tx = spot.gx; u.ty = spot.gy; u.moving = true; u.playerOrder = true;
  if(!quiet) flashWaveBanner('Worker heads for the safety of the Town Hall.');
  return true;
}

// the Recall Workers button: one press shelters EVERY worker inside the
// TC; the next press releases them back to their previous tasks
function anyWorkersSheltering(){
  return state.units.some(u=> isWorker(u) && u.hp>0 && (u.inTC || u.enteringTC));
}
function recallAllWorkers(){
  let n = 0;
  for(const u of state.units){
    if(!isWorker(u) || u.hp<=0 || u.inTC || u.enteringTC) continue;
    if(garrisonVillagerInTC(u, true)) n++;
  }
  if(n) flashWaveBanner(`${n} worker${n>1?'s':''} run for the Town Hall!`);
  refreshHud2Buttons();
}
function toggleRecallGarrison(){
  if(anyWorkersSheltering()) releaseTCGarrison();
  else recallAllWorkers();
}

function enterTC(u){
  u.enteringTC = false; u.inTC = true; u.moving = false; u.playerOrder = false;
  setUnitHidden(u, true);
  if(state.selected && state.selected.ref===u) selectEntity(null,null);
  updateHUD();
  refreshHud2Buttons();
}

function releaseTCGarrison(){
  const th = scene.townHallPos;
  let released = 0;
  for(const u of state.units){
    if(!isWorker(u) || u.hp<=0) continue;
    if(u.enteringTC){ u.enteringTC = false; u.moving = false; u.playerOrder = false; released++; continue; }
    if(!u.inTC) continue;
    const spot = findFreeSpotNear(th.gx, th.gy, 5) || {gx:th.gx, gy:th.gy+2};
    u.inTC = false;
    u.gx = spot.gx; u.gy = spot.gy; u.tx = spot.gx; u.ty = spot.gy; u.moving = false; u.playerOrder = false;
    setUnitHidden(u, false);
    positionUnitVisuals(u, u.gx*TILE+TILE/2, u.gy*TILE+TILE/2);
    released++;
  }
  // no reassignment needed: they kept their jobs, so gatherers walk back
  // to their camps and repairmen resume their work orders on their own
  if(released) flashWaveBanner(`${released} worker${released>1?'s':''} return to their tasks.`);
  updateHUD();
  refreshHud2Buttons();
}

// ---- wall repair crews ----
// Assign a villager to a damaged wall (right-click it) and they'll walk
// over and patch it up, burning wood as they go.
const WALL_REPAIR = { hpPerSec: 10, woodPerHp: 0.1 };

// ---- construction time ----
// New structures rise over time (shown as translucent scaffolding) and do
// nothing until complete. Roads are instant; the starting TC is pre-built.
const BUILD_TIME = {
  house:8000, farm:6000, lumber_camp:8000, quarry:8000,
  granary:10000, warehouse:10000, mill:12000, bakery:12000, market:12000,
  mason:10000, apothecary:10000, well:5000, tavern:10000,
  wall:3000, tower:15000, barracks:15000,
};
function underConstruction(b){ return (b.buildMs||0) > 0; }

// ---- the Repairman ----
// A specialist trained at the Mason. He (not villagers) patches walls and
// towers, works faster than the old crews, and auto-seeks nearby damage
// when idle.
const REPAIRMAN = {
  cost: { food:25, wood:15 }, trainMs: 20000,
  hp: 30, hpPerSec: 15, woodPerHp: 0.1, autoSeekRadius: 8,
};

function updateConstruction(delta){
  for(const b of state.buildings){
    if(underConstruction(b) && !b.awaitingBuilder){
      b.buildMs -= delta;
      if(b.buildMs <= 0){
        b.buildMs = 0;
        if(b.sprite && b.sprite.setAlpha) b.sprite.setAlpha(1);
        const def = BUILD_DEFS[b.type];
        if(def && def.popCap) state.population.cap += def.popCap;
        if(def && def.needsWorker) autoAssignIdleVillagers();
        if(scene && scene.add) floatResourceText(b.gx, b.gy, 'complete!', '#a8e6a1');
        updateHUD();
      }
    }
    if(b.upgradeMs > 0){
      b.upgradeMs -= delta;
      if(b.upgradeMs <= 0){
        if(STORAGE_LEVELS[b.type]) completeStorageUpgrade(b);
        else if(b.isCore) completeTownCenterUpgrade(b);
      }
    }
  }
}

// ---- salvage ----
// Tear a building down for scraps: costs 3 gold in labor, returns 15% of
// the original build cost.
const SALVAGE = { goldCost: 3, refund: 0.15 };
function salvageBuilding(b){
  if(!b || b.isCore || b.hp<=0) return false;
  if(state.faction!=='swarm'){ // the swarm reabsorbs its growths free of charge
    if(state.resources.gold < SALVAGE.goldCost) return false;
    state.resources.gold -= SALVAGE.goldCost;
  }
  const def = BUILD_DEFS[b.type];
  const parts = [];
  if(def && def.cost){
    for(const k in def.cost){
      const r = Math.floor(def.cost[k] * SALVAGE.refund);
      if(r > 0){ addResource(k, r); parts.push(r + ' ' + k); }
    }
  }
  removeBuilding(b);
  flashWaveBanner('Salvaged' + (parts.length ? ' — recovered ' + parts.join(', ') : ' — nothing worth keeping') + '.');
  updateHUD();
  return true;
}

// ---- apothecary ----
// Units resting within its herb garden slowly mend between fights.
const APOTHECARY = { range: 4, healPerTick: 2 };

// ---- market & trade ----
// Swap resources at the market at a lossy rate, or spend tax gold to buy
// them outright. A traveling caravan visits periodically with better deals.
const TRADE_GIVE = 5;
function tradeGetAmt(){ return caravanActive() ? 3 : 2; }
function goldBuyCost(){ return caravanActive() ? 15 : 20; }
const GOLD_BUY_AMT = 10;
const CARAVAN_EVERY_MS = [240000, 360000]; // 4-6 min between visits
const CARAVAN_STAY_MS = 45000;
function caravanActive(){ return state.caravanActiveMs > 0; }
function hasBuilding(type){ return state.buildings.some(b=>b.type===type && b.hp>0 && !(b.buildMs>0)); }

// The caravan is a real wagon on the map: it rolls in from the map edge,
// parks beside the market while the deals last, then rolls away again.
function spawnCaravanVisual(){
  if(!scene || !scene.add) return;
  const market = state.buildings.find(b=>b.type==='market' && b.hp>0);
  if(!market) return;
  if(state.caravan && state.caravan.sprite) state.caravan.sprite.destroy();
  const {gx, gy} = edgeSpawnPoint();
  const c = { gx, gy, tx:market.gx, ty:market.gy, phase:'arriving', market };
  c.sprite = scene.add.image(gx*TILE+TILE/2, gy*TILE+TILE/2, 'tiles', FRAME.enemy_ram)
    .setDepth(4).setTint(0xffd76b);
  state.caravan = c;
}

function updateCaravan(delta){
  const c = state.caravan;
  if(!c) return;
  const step = 2.0 * (delta/1000); // tiles/sec — a laden wagon, not a sprinter
  const marketAlive = c.market && c.market.hp > 0;
  const leaveNow = ()=>{
    c.phase = 'leaving';
    const e = edgeSpawnPoint();
    c.tx = e.gx; c.ty = e.gy;
  };
  if(c.phase==='arriving'){
    if(!marketAlive || !caravanActive()){ leaveNow(); }
    else {
      const dx = c.tx-c.gx, dy = c.ty-c.gy, dist = Math.hypot(dx,dy);
      if(dist < 1.2) c.phase = 'staying'; // parked beside the market
      else { c.gx += dx/dist*step; c.gy += dy/dist*step; }
    }
  } else if(c.phase==='staying'){
    if(!caravanActive() || !marketAlive) leaveNow();
  } else { // leaving
    const dx = c.tx-c.gx, dy = c.ty-c.gy, dist = Math.hypot(dx,dy);
    if(dist < 0.3){
      if(c.sprite) c.sprite.destroy();
      state.caravan = null;
      return;
    }
    c.gx += dx/dist*step; c.gy += dy/dist*step;
  }
  if(c.sprite) c.sprite.setPosition(c.gx*TILE+TILE/2, c.gy*TILE+TILE/2);
}

function tradeAtMarket(give, get){
  if(state.resources[give] < TRADE_GIVE) return false;
  state.resources[give] -= TRADE_GIVE;
  addResource(get, tradeGetAmt());
  updateHUD();
  return true;
}

function buyWithGold(res){
  const cost = goldBuyCost();
  if(state.resources.gold < cost) return false;
  state.resources.gold -= cost;
  addResource(res, GOLD_BUY_AMT);
  updateHUD();
  return true;
}

// ---- happiness & taxes ----
// Wells and taverns cheer people up; overcrowding and famine sour them.
// Happiness scales farm output and tax income.
const TAX_GOLD_PER_HOUSE = 0.25; // per economy tick, scaled by happiness
function computeHappiness(){
  let h = 70;
  const wells = state.buildings.filter(b=>b.type==='well' && b.hp>0 && !underConstruction(b)).length;
  const taverns = state.buildings.filter(b=>b.type==='tavern' && b.hp>0 && !underConstruction(b)).length;
  h += Math.min(wells, 3) * 5;    // up to +15
  h += Math.min(taverns, 2) * 10; // up to +20
  if(state.population.current >= state.population.cap) h -= 15; // overcrowded
  if(state.starving) h -= 40;
  return Phaser.Math.Clamp(h, 10, 105);
}

// ---- mason: cut stone discount ----
// A Mason pre-cuts stone for skilled construction: 25% less stone on
// towers, Town Hall upgrades, and storage upgrades.
const MASON_ADVANCED = { tower:true };
function masonAdjust(cost){
  if(!cost || !cost.stone || !hasBuilding('mason')) return cost;
  const c = Object.assign({}, cost);
  c.stone = Math.ceil(cost.stone * 0.75);
  return c;
}
function effectiveBuildCost(type){
  const def = BUILD_DEFS[type];
  return MASON_ADVANCED[type] ? masonAdjust(def.cost) : def.cost;
}

// Hoarding has a limit: food storage grows with granaries, wood/stone
// storage grows with warehouses (upgraded levels store more). Anything
// gathered past the cap is simply wasted.
function storageCapFor(key){
  if(key==='wildstone') return WILDSTONE_CAP; // small and fixed — this resource stays precious no matter how big everything else grows
  let cap = STORAGE_BASE;
  // Town Hall levels raise the base cap for every resource
  const lvl = tcLevel();
  for(let i=0; i<lvl-1; i++) cap += TC_LEVELS.storageBonus[i];
  for(const b of state.buildings){
    if(b.hp<=0 || underConstruction(b)) continue;
    const lvl = (b.level||1) - 1;
    if(b.type==='granary' && (key==='food'||key==='wheat'||key==='flour')) cap += STORAGE_LEVELS.granary.bonus[lvl];
    else if(b.type==='warehouse' && (key==='wood'||key==='stone')) cap += STORAGE_LEVELS.warehouse.bonus[lvl];
  }
  return cap;
}

// All resource income funnels through here so the cap can't be bypassed.
// Returns how much was actually banked (may be less than requested).
function addResource(key, amt){
  const cap = storageCapFor(key);
  const before = state.resources[key];
  // never clip existing stock below what's already there (e.g. if a
  // warehouse burns down and the cap drops, you keep the surplus — you
  // just can't add to it)
  const room = Math.max(0, cap - before);
  const added = Math.min(amt, room);
  state.resources[key] = before + added;
  return added;
}

// three-stage building evolution: upgrades physically change the sprite,
// like a pokemon line — new sacks and gilt on storage, towers on the keep
function evolutionFrameFor(b){
  const lvl = b.level || 1;
  if(b.isCore) return lvl >= 3 ? 'town_hall_3' : (lvl === 2 ? 'town_hall_2' : 'town_hall');
  if(b.type==='granary') return lvl >= 4 ? 'granary_3' : (lvl >= 2 ? 'granary_2' : 'granary');
  if(b.type==='warehouse') return lvl >= 4 ? 'warehouse_3' : (lvl >= 2 ? 'warehouse_2' : 'warehouse');
  return null;
}
function refreshEvolution(b){
  const f = evolutionFrameFor(b);
  if(f && b.sprite && b.sprite.setFrame) b.sprite.setFrame(FRAME[f]);
}

function upgradeStorageBuilding(b){
  const conf = STORAGE_LEVELS[b.type];
  if(!conf) return false;
  if(underConstruction(b)) return false; // can't add a second story before the first is finished
  if(b.upgradeMs > 0) return false; // already upgrading — one at a time
  const lvl = b.level || 1;
  if(lvl >= conf.bonus.length) return false;
  const reqTC = STORAGE_TC_REQ[lvl+1];
  if(reqTC && tcLevel() < reqTC){
    flashWaveBanner(`Storage level ${lvl+1} requires Town Hall level ${reqTC}!`);
    return false;
  }
  const cost = masonAdjust(conf.upCost[lvl-1]);
  for(const k in cost) if(state.resources[k] < cost[k]) return false;
  for(const k in cost) state.resources[k] -= cost[k];
  b.upgradeMs = conf.upMs[lvl-1];
  b.upgradeTargetLevel = lvl + 1;
  flashWaveBanner(`${BUILD_DEFS[b.type].name} upgrade underway...`);
  updateHUD();
  return true;
}

// called once a storage building's upgradeMs timer actually reaches zero —
// this is where the level/HP/bonus actually land, not at the click
function completeStorageUpgrade(b){
  b.level = b.upgradeTargetLevel;
  b.upgradeMs = 0; b.upgradeTargetLevel = null;
  b.maxHp += 40; b.hp += 40; // sturdier with each expansion
  refreshEvolution(b);
  flashWaveBanner(`${BUILD_DEFS[b.type].name} upgraded to level ${b.level}!`);
  updateHUD();
}

// ---- unit evolutions (permanent, faction-wide — NOT the same thing as
// refreshEvolution() above, which is building sprite tiers) ----
function canStartUnitEvolution(type){
  return EVOLUTIONS[type] && !state.evolutions[type] && !state.evolutionInProgress;
}

function startUnitEvolution(type){
  if(!canStartUnitEvolution(type)) return false;
  const conf = EVOLUTIONS[type];
  for(const k in conf.cost) if((state.resources[k]||0) < conf.cost[k]) return false;
  for(const k in conf.cost) state.resources[k] -= conf.cost[k];
  state.evolutionInProgress = { type, msRemaining: conf.ms };
  flashWaveBanner(`${conf.name} underway...`);
  updateHUD();
  return true;
}

function completeUnitEvolution(){
  const { type } = state.evolutionInProgress;
  const conf = EVOLUTIONS[type];
  state.evolutions[type] = true;
  state.evolutionInProgress = null;
  // bump the shared constants so every FUTURE unit gets the bonus for free
  if(type==='swordsman'){
    if(state.faction==='swarm') SWARM.zergling.hp += conf.hpBonus;
    else SWORDSMAN_HP += conf.hpBonus;
    SWORDSMAN_ATTACK.damage += conf.dmgBonus;
    SWORDSMAN_ATTACK.range += conf.rangeBonus;
  } else if(type==='archer'){
    if(state.faction!=='swarm') ARCHER_HP += conf.hpBonus; // spitters have no separate HP track — hpBonus is 0 for them anyway
    ARCHER_ATTACK.damage += conf.dmgBonus;
    ARCHER_ATTACK.range += conf.rangeBonus;
  }
  // existing units: patch hp/maxHp directly (damage/range are read from the
  // shared constants above at attack-time, so those need no per-unit work)
  if(conf.hpBonus){
    for(const u of state.units){
      if(u.type===type && u.hp>0){ u.maxHp += conf.hpBonus; u.hp += conf.hpBonus; }
    }
  }
  flashWaveBanner(`${conf.name} complete — every one of them is stronger now.`);
  updateHUD();
}

function updateUnitEvolution(delta){
  if(!state.evolutionInProgress) return;
  state.evolutionInProgress.msRemaining -= delta;
  if(state.evolutionInProgress.msRemaining <= 0) completeUnitEvolution();
}

function upgradeTownCenter(th){
  if(!th || !th.isCore) return false;
  if(underConstruction(th)) return false;
  if(th.upgradeMs > 0) return false; // already upgrading
  const lvl = th.level || 1;
  if(lvl >= TC_LEVELS.maxLevel) return false;
  const cost = masonAdjust(TC_LEVELS.upCost[lvl-1]);
  for(const k in cost) if(state.resources[k] < cost[k]) return false;
  for(const k in cost) state.resources[k] -= cost[k];
  th.upgradeMs = TC_LEVELS.upMs[lvl-1];
  th.upgradeTargetLevel = lvl + 1;
  flashWaveBanner('Town Hall upgrade underway...');
  updateHUD();
  return true;
}

// called once the Town Hall/Hive's upgradeMs timer reaches zero — this is
// where the level, HP, and pop-cap bonus actually land
function completeTownCenterUpgrade(th){
  const lvl = th.level; // the OLD level — bonus arrays are indexed by it
  th.level = th.upgradeTargetLevel;
  th.upgradeMs = 0; th.upgradeTargetLevel = null;
  refreshEvolution(th);
  th.maxHp += TC_LEVELS.hpBonus[lvl-1];
  th.hp += TC_LEVELS.hpBonus[lvl-1];
  state.population.cap += TC_LEVELS.popBonus[lvl-1];
  const armed = th.level >= TC_LEVELS.maxLevel;
  flashWaveBanner(`Town Hall upgraded to level ${th.level}!` + (armed ? ' Its battlements are now manned.' : ''));
  updateHUD();
}
// ---------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------
let buildingIdCounter = 1;
function createBuilding(type, gx, gy, override){
  const def = override || BUILD_DEFS[type];
  const size = def.size || 1; // the Town Center is 2x2; everything else 1x1
  const b = {
    id: buildingIdCounter++,
    type, gx, gy, size, hp: def.hp, maxHp: def.hp,
    frame: def.frame, isCore: false,
    lastAttackAt: 0,
  };
  if(STORAGE_LEVELS[type]) b.level = 1;
  if(type === 'creep_tumor' && b.creepGen === undefined) b.creepGen = 0; // auto-spread children override this after creation
  for(let dy=0; dy<size; dy++) for(let dx=0; dx<size; dx++){
    if(inBounds(gx+dx, gy+dy)) state.occupied[gy+dy][gx+dx] = b;
  }
  state.buildings.push(b);
  const px = gx*TILE + size*TILE/2, py = gy*TILE + size*TILE/2;
  b.sprite = scene.add.image(px, py, 'tiles', FRAME[def.frame]);
  if(def.tint && b.sprite.setTint) b.sprite.setTint(def.tint); // reused frames get a signature tint
  if(size>1 && b.sprite.setDisplaySize) b.sprite.setDisplaySize(size*TILE, size*TILE);
  b.hpBarBg = scene.add.rectangle(px, gy*TILE+2, size*TILE-6, 4, 0x2a1c10).setDepth(5);
  b.hpBarFg = scene.add.rectangle(gx*TILE+4, gy*TILE+2, size*TILE-6, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6);
  b.hpBarBg.setVisible(false); b.hpBarFg.setVisible(false);
  scene.buildingLayerGroup.add(b.sprite);
  // new builds start as scaffolding (override = pre-built, e.g. the TC)
  if(!override && BUILD_TIME[type]){
    b.buildMs = BUILD_TIME[type];
    if(b.sprite.setAlpha) b.sprite.setAlpha(0.55);
  }
  if(def.popCap && !underConstruction(b)) state.population.cap += def.popCap;
  if(type==='wall') refreshWallNeighborhood(gx, gy);
  if(def.needsWorker && !underConstruction(b)) autoAssignIdleVillagers();
  updateHUD();
  return b;
}

// Walls are drawn as a horizontal stone segment by default. When a wall
// tile's only wall neighbors are above/below it (not left/right), switch
// to the vertical-facing sprite so vertical runs connect visually too.
function refreshWallSprite(b){
  if(!b || b.type!=='wall' || !b.sprite) return;
  const left = occAt(b.gx-1, b.gy), right = occAt(b.gx+1, b.gy);
  const up = occAt(b.gx, b.gy-1), down = occAt(b.gx, b.gy+1);
  const horiz = (left && left.type==='wall') || (right && right.type==='wall');
  const vert = (up && up.type==='wall') || (down && down.type==='wall');
  // corners, T-junctions and crossings use the junction sprite so
  // perpendicular wall runs read as one continuous wall
  const frame = (vert && horiz) ? 'wall_corner' : ((vert && !horiz) ? 'wall_v' : 'wall');
  b.sprite.setFrame(FRAME[frame]);
}

function refreshWallNeighborhood(gx, gy){
  const spots = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of spots){
    const nb = occAt(gx+dx, gy+dy);
    if(nb && nb.type==='wall') refreshWallSprite(nb);
  }
}

function isPlacementValid(type, gx, gy){
  if(!inBounds(gx,gy)) return false;
  const t = tileAt(gx,gy);
  if(t==='water') return false;
  // can't build on standing forest or solid stone — log/mine it out first
  // (depleted tiles revert to grass/dirt and become buildable land)
  if(t==='forest' || t==='stone_deposit') return false;
  // Wildstone works like an oil pump ON the vein: the Refinery is the ONLY
  // thing that can go on a deposit tile, and it can ONLY go there
  if(t==='wildstone_deposit' && type!=='wildstone_refinery') return false;
  if(type==='wildstone_refinery' && t!=='wildstone_deposit') return false;
  const defGate = BUILD_DEFS[type];
  if(defGate && defGate.tcLevelReq && tcLevel() < defGate.tcLevelReq) return false;
  if(occAt(gx,gy)) return false;
  const def = BUILD_DEFS[type];
  // roads: one per tile
  if(def && def.isRoad && state.roads[gy] && state.roads[gy][gx]) return false;
  // can't build on top of a bandit camp — raze it first
  if(state.enemies.some(e=>e.kind==='camp' && e.hp>0 && e.gx===gx && e.gy===gy)) return false;
  // the swarm only grows on its own creep — spread first, build second
  if(state.faction === 'swarm' && !isCreeped(gx, gy)) return false;
  // storage buildings must huddle close to the Town Center
  if(def && def.nearTC && scene && scene.townHallPos){
    const th = scene.townHallPos;
    if(Math.max(Math.abs(gx-th.gx), Math.abs(gy-th.gy)) > NEAR_TC_RADIUS) return false;
  }
  const cost = effectiveBuildCost(type);
  for(const k in cost) if(state.resources[k] < cost[k]) return false;
  return true;
}

function tryPlaceBuilding(type, gx, gy){
  const defPre = BUILD_DEFS[type];
  // give a specific reason when a granary/warehouse is just too far out
  if(defPre && defPre.nearTC && scene && scene.townHallPos){
    const th = scene.townHallPos;
    if(Math.max(Math.abs(gx-th.gx), Math.abs(gy-th.gy)) > NEAR_TC_RADIUS){
      flashWaveBanner(`${defPre.name} must be within ${NEAR_TC_RADIUS} tiles of the Town Center!`);
      return;
    }
  }
  if(!isPlacementValid(type, gx, gy)) return;
  const def = BUILD_DEFS[type];
  // swarm structures MORPH from a drone — the drone dissolves into the growth
  let morphDrone = null;
  if(state.faction === 'swarm' && !def.isRoad){
    morphDrone = pickWorkerFor({gx, gy});
    if(!morphDrone){
      flashWaveBanner('No drone free to morph — birth more at the Hive!');
      return;
    }
  }
  const cost = effectiveBuildCost(type);
  for(const k in cost) state.resources[k] -= cost[k];
  if(def.isRoad){
    // roads aren't buildings — just a speed layer painted onto the tile
    state.roads[gy][gx] = true;
    const spr = state.tileSprites[gy] && state.tileSprites[gy][gx];
    if(spr){ spr.setFrame(FRAME.dirt); spr.setTint(def.tint || 0xe0c898); }
    updateHUD();
    refreshBuildBar();
    return; // stay in build mode to chain-place road tiles
  }
  // swarm: the drone WALKS to the site now — it dissolves into the growth
  // on arrival (handled in updateUnits), not instantly at placement
  const newBuilding = createBuilding(type, gx, gy);
  newBuilding.awaitingBuilder = true; // nothing happens until a builder arrives
  if(newBuilding.sprite && newBuilding.sprite.setAlpha) newBuilding.sprite.setAlpha(0.3); // fainter than the "actively building" 0.55 — a bare foundation
  if(morphDrone){
    morphDrone.buildTaskId = newBuilding.id;
    morphDrone.tx = gx; morphDrone.ty = gy; morphDrone.moving = true;
    morphDrone.assignedBuildingId = null; morphDrone.gatherWorking = false; morphDrone.gatherPhase = null;
  } else {
    autoAssignIdleVillagers(); // humans: dispatch an idle villager right now if one's free
  }
  updateHUD();
  refreshBuildBar();
  // keep build mode active for walls/towers so player can chain-place; others exit
  if(type !== 'wall'){
    state.buildMode = null;
    if(scene.ghost){ scene.ghost.destroy(); scene.ghost=null; }
  }
}

function removeBuilding(b){
  clearRallyPoint(b);
  // whoever was working here is now unemployed — they'll get auto-reassigned
  // to another vacancy on the next building placement, or can be manually
  // reassigned by the player in the meantime.
  for(const worker of state.units.filter(u=> u.type==='villager' && u.assignedBuildingId===b.id)){
    unassignVillager(worker);
  }
  const bSize = b.size || 1;
  for(let dy=0; dy<bSize; dy++) for(let dx=0; dx<bSize; dx++){
    if(inBounds(b.gx+dx, b.gy+dy) && state.occupied[b.gy+dy][b.gx+dx]===b) state.occupied[b.gy+dy][b.gx+dx] = null;
  }
  state.buildings = state.buildings.filter(x=>x!==b);
  b.sprite.destroy(); b.hpBarBg.destroy(); b.hpBarFg.destroy();
  const def = BUILD_DEFS[b.type];
  if(def && def.popCap) state.population.cap = Math.max(3, state.population.cap - def.popCap);
  if(state.selected && state.selected.ref===b) selectEntity(null,null);
  if(b.type==='wall') refreshWallNeighborhood(b.gx, b.gy);
  if(b.isCore){
    endGame(false);
  }
  updateHUD();
}

function damageBuilding(b, dmg){
  b.hp -= dmg;
  b.hpBarBg.setVisible(true); b.hpBarFg.setVisible(true);
  const pct = Math.max(0, b.hp/b.maxHp);
  b.hpBarFg.width = ((b.size||1)*TILE-6)*pct;
  b.hpBarFg.fillColor = pct>0.5 ? 0x6bbf59 : (pct>0.25?0xd8b23a:0xd85a3a);
  if(b.hp<=0) removeBuilding(b);
}

// ---------------------------------------------------------------------
// Delivery-based gathering: nothing enters your stockpile until a villager
// physically hauls it home. Camps/quarries run a walk-out -> harvest ->
// walk-home loop; distance to the resource (and depletion pushing tiles
// further away) directly costs you income now.
// ---------------------------------------------------------------------
function bankCarry(u, b){
  const wanted = u.carrying.amt;
  const gained = addResource(u.carrying.key, wanted);
  if(scene && scene.add){
    floatResourceText(b.gx, b.gy, '+'+gained, RESOURCE_COLOR[u.carrying.key] || '#ffffff');
    if(gained < wanted) floatResourceText(b.gx, b.gy-1, 'storage full!', '#ff8a6b');
  }
  u.carrying = null;
  updateHUD();
}

function updateGatherer(u, delta){
  const b = buildingById(u.assignedBuildingId);
  if(!b || b.hp<=0){ unassignVillager(u); return; }
  const def = BUILD_DEFS[b.type];
  if(!def){ unassignVillager(u); return; } // never gather at a non-standard building
  const atHome = Math.round(u.gx)===b.gx && Math.round(u.gy)===b.gy;

  // Garrison duty: a villager assigned to a tower just mans it (the tower
  // shoots at full strength while they're up there — see updateCombat).
  // Garrisons do NOT retreat during raids — holding the tower IS their job.
  if(b.type==='tower'){
    if(!u.moving && !atHome){ u.tx=b.gx; u.ty=b.gy; u.moving=true; }
    u.gatherWorking = false;
    return;
  }

  // Recalled (raid or manual): everyone else runs for the safety of the
  // Town Center, banking any load they're carrying when they get there.
  if(isRecalled()){
    const th = scene.townHallPos;
    if(!u.recallSpot){
      u.recallSpot = findFreeSpotNear(th.gx, th.gy, 5) || {gx:th.gx, gy:th.gy};
    }
    const atTC = Math.round(u.gx)===u.recallSpot.gx && Math.round(u.gy)===u.recallSpot.gy;
    if(!atTC && !u.moving){ u.tx=u.recallSpot.gx; u.ty=u.recallSpot.gy; u.moving=true; }
    u.gatherWorking = false;
    u.gatherPhase = null;
    if(atTC && !u.moving && u.carrying) bankCarry(u, u.recallSpot);
    return;
  }
  if(u.recallSpot) u.recallSpot = null; // recall over — resume the day job

  // Repair crew: stand next to the damaged wall and patch it up, burning
  // wood per HP restored. Auto-unassigns when the wall is whole again.
  if(b.type==='wall'){
    if(b.hp >= b.maxHp){
      unassignVillager(u);
      return;
    }
    const d = Phaser.Math.Distance.Between(u.gx, u.gy, b.gx, b.gy);
    if(d <= 1.9 && !u.moving){
      u.gatherWorking = true; // reuse the "busy" bob animation
      u.repairMs = (u.repairMs||0) + delta;
      if(u.repairMs >= 1000){
        u.repairMs -= 1000;
        const hpChunk = Math.min(WALL_REPAIR.hpPerSec, b.maxHp - b.hp);
        const woodCost = hpChunk * WALL_REPAIR.woodPerHp;
        if(state.resources.wood < woodCost){
          if(!u._noWoodWarned){ flashWaveBanner('Not enough wood to keep repairing the wall!'); u._noWoodWarned = true; }
          u.gatherWorking = false;
          return;
        }
        u._noWoodWarned = false;
        state.resources.wood -= woodCost;
        b.hp = Math.min(b.maxHp, b.hp + hpChunk);
        const pct = Math.max(0, b.hp/b.maxHp);
        b.hpBarFg.width = ((b.size||1)*TILE-6)*pct;
        b.hpBarFg.fillColor = pct>0.5 ? 0x6bbf59 : (pct>0.25?0xd8b23a:0xd85a3a);
        if(b.hp >= b.maxHp){
          b.hpBarBg.setVisible(false); b.hpBarFg.setVisible(false);
          if(scene && scene.add) floatResourceText(b.gx, b.gy, 'repaired!', '#a8e6a1');
          unassignVillager(u);
        }
        updateHUD();
      }
    } else if(!u.moving){
      const spot = findFreeSpotNear(b.gx, b.gy, 1);
      if(spot){ u.tx = spot.gx; u.ty = spot.gy; u.moving = true; }
    }
    return;
  }

  if(b.type==='farm' || def.staffed){
    // farms, mills and bakeries don't commute — but they only produce (in
    // economyTick) while the worker is physically standing on the tile.
    if(!u.moving && !atHome){ u.tx=b.gx; u.ty=b.gy; u.moving=true; }
    u.gatherWorking = atHome && !u.moving;
    return;
  }

  const carry = CARRY[b.type];
  if(!carry) return;

  switch(u.gatherPhase){
    case 'toResource': {
      if(u.moving) return;
      const t = u.gatherTarget;
      if(!t || (state.resourceQty[t.gy] && state.resourceQty[t.gy][t.gx] || 0) <= 0){
        u.gatherPhase = null; // tile vanished while we walked — re-pick
        return;
      }
      if(Math.round(u.gx)===t.gx && Math.round(u.gy)===t.gy){
        u.gatherPhase = 'harvesting'; u.harvestMs = 0; u.gatherWorking = true;
      } else {
        u.tx = t.gx; u.ty = t.gy; u.moving = true;
      }
      return;
    }
    case 'harvesting': {
      u.harvestMs += delta;
      if(u.harvestMs >= HARVEST_MS){
        const t = u.gatherTarget;
        const avail = (t && state.resourceQty[t.gy] && state.resourceQty[t.gy][t.gx]) || 0;
        const amt = Math.min(carry.amt, avail);
        if(t && amt>0) depleteResourceTile(t.gx, t.gy, amt);
        u.carrying = amt>0 ? { key:carry.key, amt } : null;
        u.gatherWorking = false;
        u.gatherPhase = 'toHome';
        u.tx = b.gx; u.ty = b.gy; u.moving = true;
      }
      return;
    }
    case 'toHome': {
      if(u.moving) return;
      if(atHome){
        if(u.carrying) bankCarry(u, b);
        u.gatherPhase = null; // next frame picks the next trip
      } else {
        u.tx = b.gx; u.ty = b.gy; u.moving = true;
      }
      return;
    }
    default: {
      const t = gatherTargetFor(b);
      if(!t){
        if(!b._depletedWarned){
          flashWaveBanner(`${def.name} has no ${def.bonusNear==='forest'?'trees':def.bonusNear==='stone_deposit'?'stone':'wildstone'} left nearby!`);
          b._depletedWarned = true;
        }
        if(!atHome && !u.moving){ u.tx=b.gx; u.ty=b.gy; u.moving=true; }
        return;
      }
      b._depletedWarned = false;
      u.gatherTarget = t;
      u.gatherPhase = 'toResource';
      return;
    }
  }
}

// ---------------------------------------------------------------------
// Villager work assignment
// ---------------------------------------------------------------------
function findProductionBuildingFor(gx, gy){
  const b = occAt(gx, gy);
  if(b && BUILD_DEFS[b.type] && (BUILD_DEFS[b.type].needsWorker || BUILD_DEFS[b.type].garrison)) return b;
  // (wall repair is the Repairman's job now — villagers don't take it)
  return null;
}

// How many defenders are physically standing on the tower right now
// (assigned villagers + garrisoning archers, capped at 3). The first
// mans the murder holes properly; the second and third just add a little.
const TOWER_EXTRA_DMG = [2, 1]; // 2nd defender +2, 3rd only +1
function towerGarrisonCount(tower){
  let n = 0;
  for(const u of state.units){
    if(u.hp<=0) continue;
    const onIt = Math.round(u.gx)===tower.gx && Math.round(u.gy)===tower.gy;
    if(!onIt) continue;
    if(u.type==='villager' && u.assignedBuildingId===tower.id) n++;
    else if(u.type==='archer' && u.garrisonId===tower.id) n++;
  }
  return Math.min(n, 3);
}
function isGarrisoned(tower){ return towerGarrisonCount(tower) > 0; }

function assignedWorkerOf(building){
  return state.units.find(u=> u.type==='villager' && u.hp>0 && u.assignedBuildingId===building.id) || null;
}

// How many villagers a building can employ. Camps and quarries run crews;
// a farm plot only has room for one pair of hands.
const WORKER_CAP = { lumber_camp: 3, quarry: 3, tower: 3 };
function workerCapOf(building){ return WORKER_CAP[building.type] || 1; }
function workersOf(building){
  return state.units.filter(u=> u.type==='villager' && u.hp>0 && u.assignedBuildingId===building.id);
}

function assignVillagerToBuilding(v, building){
  // join the crew if there's room; if the building is fully crewed, bump
  // the longest-serving worker (keeps the old replace behavior for farms)
  const crew = workersOf(building).filter(w=>w!==v);
  if(crew.length >= workerCapOf(building)){
    crew[0].assignedBuildingId = null;
  }
  v.assignedBuildingId = building.id;
  v.gatherWorking = false;
  v.gatherPhase = null; v.gatherTarget = null; // restart the haul loop fresh
  v.moving = false; // updateGatherer takes over from here
}

function unassignVillager(v){
  v.assignedBuildingId = null;
  v.gatherWorking = false;
  v.gatherPhase = null; v.gatherTarget = null; v.carrying = null;
  v.repairMs = 0; v._noWoodWarned = false;
}

// The ONE place that decides "which villager/drone goes to do this job" —
// used by every automatic dispatch path (build-site assignment, worker
// staffing, swarm's morph-drone pickup). Replaces three separate
// `array.find()`/`.shift()` calls that each picked whoever happened to be
// first in the unit list, with no regard for distance OR for what the
// player had selected — which is exactly what sent a villager walking
// across the map to build something while a much closer one sat selected
// and idle.
//
// Priority, per the approved design:
//   1. A selected, free villager/drone is ALWAYS the answer — explicit
//      (or even just passive) selection reserves a unit outright.
//   2. Otherwise: nearest free unit to the job site wins. Not array order.
// Deselecting needs no extra bookkeeping — this reads state.selected LIVE
// on every call, so a unit becomes eligible again the instant it's no
// longer selected.
function pickWorkerFor(location){
  const sel = (state.selected && state.selected.type==='unit') ? state.selected.ref : null;
  const selectedIsFree = sel && sel.type==='villager' && sel.hp>0 && !sel.assignedBuildingId && !sel.buildTaskId && !sel.inTC && !sel.enteringTC;
  if(selectedIsFree) return sel;

  let best = null, bestD = Infinity;
  for(const u of state.units){
    if(u.type!=='villager' || u.hp<=0 || u.assignedBuildingId || u.buildTaskId || u.inTC || u.enteringTC || u===sel) continue;
    const d = Phaser.Math.Distance.Between(u.gx, u.gy, location.gx, location.gy);
    if(d < bestD){ bestD = d; best = u; }
  }
  return best;
}

function autoAssignIdleVillagers(){
  // priority 1: unstarted foundations need a builder before anything else
  // can happen there. "Already en route" is checked by a LIVING unit's own
  // buildTaskId, not a flag on the building — so if that builder dies
  // mid-walk, the foundation naturally becomes dispatchable again next call.
  const unbuilt = state.buildings.filter(b=> b.awaitingBuilder && b.hp>0);
  for(const b of unbuilt){
    const alreadyEnRoute = state.units.some(u=> u.buildTaskId===b.id && u.hp>0);
    if(alreadyEnRoute) continue;
    const builder = pickWorkerFor(b);
    if(!builder) continue; // no one free right now — try again next call
    builder.buildTaskId = b.id;
    builder.tx = b.gx; builder.ty = b.gy; builder.moving = true;
  }

  const needy = state.buildings.filter(b=> BUILD_DEFS[b.type] && BUILD_DEFS[b.type].needsWorker
    && !(b.buildMs>0) && workersOf(b).length < workerCapOf(b));
  for(const b of needy){
    while(workersOf(b).length < workerCapOf(b)){
      const w = pickWorkerFor(b);
      if(!w) break;
      assignVillagerToBuilding(w, b);
    }
  }
}

// ---------------------------------------------------------------------
// Economy
// ---------------------------------------------------------------------
// ---- resource gathering visuals (driven by the assigned villager unit) ----

// Finite resources: forest/stone tiles have a limited quantity (see
// RESOURCE_QTY_RANGE in generateMap). This searches outward ring-by-ring
// for the nearest still-productive tile of the right type, so a Lumber
// Camp/Quarry keeps working even after its immediate neighbors run dry —
// right up until the whole area is depleted, at which point it stalls.
function findNearestResourceTile(gx0, gy0, resourceType, maxRadius){
  for(let r=0; r<=maxRadius; r++){
    for(let dy=-r; dy<=r; dy++){
      for(let dx=-r; dx<=r; dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue;
        const gx=gx0+dx, gy=gy0+dy;
        if(inBounds(gx,gy) && tileAt(gx,gy)===resourceType && (state.resourceQty[gy][gx]||0) > 0){
          return {gx,gy};
        }
      }
    }
  }
  return null; // that resource type is exhausted within range
}

// Returns the resource tile a Lumber Camp/Quarry should be gathering from
// right now, or null if there's nothing left to gather nearby. Buildings
// without a resource dependency (farms) always return null — they work
// their own tile instead, handled separately below.
function gatherTargetFor(b){
  const def = BUILD_DEFS[b.type];
  if(!def.bonusNear) return null;
  return findNearestResourceTile(b.gx, b.gy, def.bonusNear, 10);
}

function depleteResourceTile(gx, gy, amount){
  if(!inBounds(gx,gy)) return;
  const remaining = state.resourceQty[gy][gx];
  if(remaining == null) return;
  const next = remaining - amount;
  if(next <= 0){
    // exhausted — the tile reverts to plain ground (or bare creep, if
    // the swarm has spread over it — frameForGroundTile handles both)
    state.grid[gy][gx] = (state.grid[gy][gx] === 'forest') ? 'grass' : 'dirt';
    state.resourceQty[gy][gx] = null;
    const spr = state.tileSprites[gy] && state.tileSprites[gy][gx];
    if(spr) spr.setFrame(frameForGroundTile(gx, gy));
  } else {
    state.resourceQty[gy][gx] = next;
  }
}

function floatResourceText(gx, gy, text, color){
  const t = scene.add.text(gx*TILE+TILE/2, gy*TILE-4, text, {
    fontSize: '12px', color: color, fontFamily: 'Trebuchet MS, sans-serif', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(9);
  scene.tweens.add({ targets: t, y: t.y-18, alpha: 0, duration: 900, onComplete: ()=> t.destroy() });
}

// Wood and stone income now happens entirely in updateGatherer (delivery on
// arrival). economyTick handles the two things that are still clock-based:
// farm harvests and food upkeep/famine.
// net resource flow, sampled once per economy tick (3s window catches
// hauls, taxes, upkeep — everything), shown as +/- per minute on hover
function updateResourceRates(){
  const keys = ['food','wheat','flour','wood','stone','gold'];
  if(state._resSnap){
    state.resourceRates = {};
    for(const k of keys){
      state.resourceRates[k] = (state.resources[k] - state._resSnap[k]) * 20; // 3s -> per min
    }
  }
  state._resSnap = {};
  for(const k of keys) state._resSnap[k] = state.resources[k];
}

function economyTick(){
  const recalled = isRecalled();
  state.happiness = computeHappiness();
  const hm = state.happiness / 100; // output multiplier

  // farms grow WHEAT now (production chain) — output scaled by happiness
  for(const b of state.buildings){
    if(b.type!=='farm' || b.hp<=0 || underConstruction(b)) continue;
    const worker = assignedWorkerOf(b);
    if(!worker || recalled) continue;
    // no harvest unless the farmer is actually standing on the farm working it
    const onTile = Math.round(worker.gx)===b.gx && Math.round(worker.gy)===b.gy && !worker.moving;
    if(!onTile) continue;
    if(b.fertility===undefined) b.fertility = 1;
    const amount = Math.max(1, Math.round(BUILD_DEFS.farm.produces.food * b.fertility * hm));
    const gained = addResource('wheat', amount);
    // soil exhaustion: every harvest wears the field down a little, so old
    // farms slowly fade and you have to found new ones on fresh ground
    b.fertility = Math.max(FARM_MIN_FERTILITY, b.fertility - FARM_SOIL_WEAR);
    if(scene && scene.add && gained>0) floatResourceText(b.gx, b.gy, '+'+gained, RESOURCE_COLOR.wheat);
  }

  // a staffed chain building only runs while its worker stands on it
  const staffedAndWorking = (b)=>{
    if(recalled || underConstruction(b)) return false;
    const w = assignedWorkerOf(b);
    return !!(w && Math.round(w.gx)===b.gx && Math.round(w.gy)===b.gy && !w.moving);
  };

  // MILLS: grind wheat into flour 1:1 (needs a worker at the millstone)
  let wheat = state.resources.wheat;
  if(wheat > 0.5){
    for(const m of state.buildings){
      if(m.type!=='mill' || m.hp<=0 || wheat<=0) continue;
      if(!staffedAndWorking(m)) continue;
      const flourRoom = Math.max(0, storageCapFor('flour') - state.resources.flour);
      const take = Math.min(MILLING.millCapacity, wheat, flourRoom);
      if(take <= 0) break;
      wheat -= take;
      const made = addResource('flour', take);
      if(scene && scene.add && made>0) floatResourceText(m.gx, m.gy, '+'+made, RESOURCE_COLOR.flour);
    }
  }

  // BAKERIES: bake flour into food at 1.5x (needs a worker at the oven)
  if(state.resources.flour > 0.5 && state.resources.food < storageCapFor('food')){
    for(const bk of state.buildings){
      if(bk.type!=='bakery' || bk.hp<=0 || state.resources.flour<=0) continue;
      if(!staffedAndWorking(bk)) continue;
      const foodRoom = Math.max(0, storageCapFor('food') - state.resources.food);
      const take = Math.min(MILLING.bakeCapacity, state.resources.flour, Math.ceil(foodRoom / MILLING.bakeRate));
      if(take <= 0) break;
      state.resources.flour -= take;
      const made = addResource('food', Math.round(take * MILLING.bakeRate));
      if(scene && scene.add && made>0) floatResourceText(bk.gx, bk.gy, '+'+made, RESOURCE_COLOR.food);
    }
  }

  // TC fallback: hand-process a wasteful trickle of wheat straight to food
  // so a young town survives before mills and bakeries exist.
  if(wheat > 0 && state.resources.food < storageCapFor('food')){
    const th = townHall();
    if(th){
      const take = Math.min(MILLING.handCapacity, wheat);
      wheat -= take;
      addResource('food', Math.round(take * MILLING.handRate));
    }
  }
  state.resources.wheat = wheat;

  // taxes: every standing house pays a trickle of gold, scaled by happiness
  const houses = state.buildings.filter(b=>b.type==='house' && b.hp>0 && !underConstruction(b)).length;
  if(houses > 0) state.resources.gold += houses * TAX_GOLD_PER_HOUSE * hm;

  // apothecaries: any wounded unit within the herb garden slowly mends
  for(const ap of state.buildings){
    if(ap.type!=='apothecary' || ap.hp<=0 || underConstruction(ap)) continue;
    for(const u of state.units){
      if(u.hp<=0 || u.hp>=u.maxHp) continue;
      if(Phaser.Math.Distance.Between(u.gx,u.gy,ap.gx,ap.gy) <= APOTHECARY.range){
        u.hp = Math.min(u.maxHp, u.hp + APOTHECARY.healPerTick);
        const pct = u.hp/u.maxHp;
        if(u.hpBarFg){
          u.hpBarFg.width = (TILE-10)*pct;
          u.hpBarFg.fillColor = pct>0.5 ? 0x6bbf59 : (pct>0.25?0xd8b23a:0xd85a3a);
          if(pct>=1){ u.hpBarBg.setVisible(false); u.hpBarFg.setVisible(false); }
        }
      }
    }
  }

  // passive absorption: every creep tile drinks a little from the land.
  // Territory IS economy — this is why the swarm must spread to live.
  if(state.faction==='swarm' && state._creepCount > 0){
    addResource('food', state._creepCount * SWARM.creep.incomePerTilePerTick);
  }

  // building maintenance: every structure draws wood (humans) or biomass
  // (the hive feeds its growths); when the stockpile is empty, everything
  // weathers instead — decay until you restock.
  const upkeepKey = state.faction==='swarm' ? 'food' : 'wood';
  const upkeepRate = state.faction==='swarm' ? SWARM.upkeepPerBuildingPerTick : UPKEEP.woodPerBuildingPerTick;
  const structures = state.buildings.filter(b=>b.hp>0 && !b.isCore);
  const upkeepNeeded = structures.length * upkeepRate;
  if(upkeepNeeded > 0){
    if(state.resources[upkeepKey] >= upkeepNeeded){
      state.resources[upkeepKey] -= upkeepNeeded;
    } else {
      state.resources[upkeepKey] = 0;
      for(const b of structures) damageBuilding(b, UPKEEP.decayHpPerTick);
      if(!state._decayWarned){ flashWaveBanner('No wood for upkeep — your buildings are weathering!'); state._decayWarned = true; }
    }
    if(state.resources[upkeepKey] > 5) state._decayWarned = false;
  }

  // rations + famine: soldiers eat double, and at zero food EVERYONE
  // bleeds HP until you fix it — starvation is a spiral, not a dice roll.
  const soldiers = state.units.filter(u=>(u.type==='archer'||u.type==='swordsman'||u.type==='captain') && u.hp>0).length;
  const civilians = state.units.filter(u=>(u.type==='villager'||u.type==='repairman') && u.hp>0).length;
  const foodUse = civilians * 0.5 + soldiers * UPKEEP.soldierFoodPerTick;
  state.resources.food -= foodUse;
  if(state.resources.food <= 0 && state.population.current > 0){
    state.resources.food = 0;
    state.starving = true;
    for(const u of [...state.units]){
      if(u.hp>0) damageUnit(u, 3);
    }
    flashWaveBanner('Famine! Your people are starving.');
  } else {
    state.starving = false;
  }
  updateResourceRates();
  updateHUD();
}

// ---------------------------------------------------------------------
// Unit production: villagers are trained manually at the Town Hall (20s),
// archers at the Barracks (60s). One unit in production per building.
// ---------------------------------------------------------------------
function trainVillager(th){
  if(state.gameOver) return false;
  if(state.starving){ flashWaveBanner('No one settles in a starving town — get food first!'); return false; }
  if(queueFull(th)) return false; // queue of 3 max
  if(state.population.current >= state.population.cap){ flashWaveBanner('Population at cap — build more houses!'); return false; }
  if(state.resources.food < VILLAGER_COST.food) return false;
  state.resources.food -= VILLAGER_COST.food;
  enqueueProduction(th, 'villager'); // a bigger Town Hall settles newcomers faster
  updateHUD();
  return true;
}

function updateProduction(delta){
  for(const b of state.buildings){
    if(!b.production || b.hp<=0) continue;
    b.production.remainingMs -= delta;
    if(b.production.remainingMs > 0) continue;
    const kind = b.production.type;
    b.production = null;
    const spot = findFreeSpotNear(b.gx, b.gy, 6) || {gx:b.gx, gy:b.gy};
    let newUnit = null;
    if(kind==='villager'){
      newUnit = createVillager(spot.gx, spot.gy);
      if(b.rallyPoint){
        // rally overrides open jobs: march to the flag first, THEN take
        // the nearest vacancy from there (see updateUnits)
        newUnit.rallyThenWork = true;
        sendToRally(newUnit, b);
      } else {
        autoAssignIdleVillagers();
      }
      flashWaveBanner('A new villager joins the town!');
    } else if(kind==='archer' || kind==='swordsman'){
      newUnit = kind==='archer' ? createArcher(spot.gx, spot.gy) : createSwordsman(spot.gx, spot.gy);
      // zerglings hatch in PAIRS — one drone, two hungry mouths
      if(kind==='swordsman' && state.faction==='swarm' && SWARM.zergling.pair){
        const spot2 = findFreeSpotNear(b.gx, b.gy, 6) || spot;
        const twin = createSwordsman(spot2.gx, spot2.gy);
        if(b.rallyPoint) sendToRally(twin, b);
      }
      if(scene.cameras && scene.cameras.main.pan) scene.cameras.main.pan(spot.gx*TILE+TILE/2, spot.gy*TILE+TILE/2, 500, 'Sine.easeInOut');
      flashWaveBanner(state.faction==='swarm' && kind==='swordsman' ? 'Two Zerglings hatch, hissing!' : `${kind==='archer'?'Archer':'Swordsman'} trained and ready!`);
    } else if(kind==='repairman'){
      newUnit = createRepairman(spot.gx, spot.gy);
      if(scene.cameras && scene.cameras.main.pan) scene.cameras.main.pan(spot.gx*TILE+TILE/2, spot.gy*TILE+TILE/2, 500, 'Sine.easeInOut');
      flashWaveBanner('Repairman ready — he patches walls and towers.');
    }
    // fresh non-villager units march to the building's rally flag
    if(newUnit && newUnit.type!=='villager' && !newUnit.assignedBuildingId) sendToRally(newUnit, b);
    // next in the queue steps up
    if(b.queue && b.queue.length){
      const nk = b.queue.shift();
      const ms = trainMsFor(nk, b);
      b.production = { type: nk, remainingMs: ms, totalMs: ms };
    }
    syncPopulationCount();
    updateHUD();
  }
}

