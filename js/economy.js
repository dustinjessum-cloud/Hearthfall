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

// ---- tower garrison (enter/exit) ----
// Defenders climb INSIDE the tower — hidden, safe from harm, and adding
// damage — mirroring the Town Hall garrison the player already knows.
function enterTower(u, b){
  u.inTowerId = b.id;
  u.moving = false; u.path = null; u.gatherWorking = false; u.playerOrder = false;
  u.gx = b.gx; u.gy = b.gy; u.tx = b.gx; u.ty = b.gy; // logically ON the tower while inside
  setUnitHidden(u, true);
  if(state.selected && state.selected.ref===u) selectEntity(null, null);
  if(scene && scene.add) floatResourceText(b.gx, b.gy, 'garrisoned!', '#9fc4ff');
  updateHUD();
}

function exitTower(u){
  const b = buildingById(u.inTowerId);
  u.inTowerId = null; u.path = null;
  const at = b ? {gx:b.gx, gy:b.gy} : {gx:Math.round(u.gx), gy:Math.round(u.gy)};
  const spot = findFreeSpotNear(at.gx, at.gy, 3) || at;
  u.gx = spot.gx; u.gy = spot.gy; u.tx = spot.gx; u.ty = spot.gy; u.moving = false;
  setUnitHidden(u, false);
  positionUnitVisuals(u, u.gx*TILE+TILE/2, u.gy*TILE+TILE/2);
}

// A small always-on badge above any manned tower showing its defender
// count — so the player can tell at a glance which towers are crewed
// (they're hidden INSIDE, so there's otherwise no on-map sign). Refreshed
// from updateHUD, which fires on every garrison change and economy tick.
function updateTowerGarrisonMarkers(){
  if(!scene || !scene.add) return;
  for(const b of myBuildings()){
    if(b.type!=='tower' || b.hp<=0){
      if(b.garrisonMarker){ b.garrisonMarker.destroy(); b.garrisonMarker = null; }
      continue;
    }
    const n = towerGarrison(b).total;
    if(n <= 0){
      if(b.garrisonMarker) b.garrisonMarker.setVisible(false);
      continue;
    }
    if(!b.garrisonMarker){
      const circ = scene.add.circle(0, 0, 6, 0x24406e).setStrokeStyle(1, 0x9fc4ff, 1);
      const txt = scene.add.text(0, 0, '', { fontSize:'9px', color:'#dbe8ff', fontStyle:'bold' }).setOrigin(0.5);
      b.garrisonMarker = scene.add.container(b.gx*TILE+TILE-5, b.gy*TILE+5, [circ, txt]).setDepth(7);
      b.garrisonMarker._txt = txt;
    }
    b.garrisonMarker.setVisible(true);
    b.garrisonMarker._txt.setText(String(n));
  }
}

function releaseTowerGarrison(tower){
  let n = 0;
  for(const u of [...state.units]){
    if(u.inTowerId !== tower.id) continue;
    if(u.type==='villager') unassignVillager(u); // exits the tower as part of unassigning
    else { u.garrisonId = null; exitTower(u); }
    n++;
  }
  if(n) flashWaveBanner(`${n} defender${n>1?'s':''} climb down from the tower.`);
  updateHUD();
}

function garrisonVillagerInTC(u, quiet){
  if(u.inTC || u.enteringTC) return false;
  // NOTE: the worker KEEPS their job assignment — on release they simply
  // walk back to whatever they were doing before the recall
  u.enteringTC = true;
  u.gatherWorking = false;
  u.path = null;
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
    if(onTowerDuty(u)) continue; // tower defenders hold their post through a recall
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
  wall:3000, gate:3000, tower:15000, barracks:15000,
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

// Humans: construction only advances while the assigned builder is
// physically standing at the site — pull them away (or they die) and
// progress simply pauses until someone (them again, or a freshly
// dispatched replacement — see autoAssignIdleVillagers) is back on-site.
// The swarm has no such requirement: its "builder" is a drone that
// dissolves into the structure the moment it arrives, so there's no unit
// left to check the presence of — construction just runs on its own once
// started, same as it always has.
function assignedBuilder(b){
  return state.units.find(u=> u.type==='villager' && u.hp>0 && u.buildTaskId===b.id) || null;
}
function builderPresent(u, b){
  return !!u && !u.moving && Math.round(u.gx)===b.gx && Math.round(u.gy)===b.gy;
}

// how far a builder who JUST finished something will roam to continue the
// project (much looser than AUTO_ASSIGN_RADIUS, which governs pulling a
// fresh villager onto a job in the first place)
const BUILDER_CHAIN_RADIUS = 12;
function nearestUnbuiltFoundation(u, radius){
  let best = null, bd = Infinity;
  for(const b of myBuildings()){
    if(!underConstruction(b) || b.hp<=0) continue;
    if(assignedBuilder(b)) continue; // someone's already on it (or walking over)
    const d = Phaser.Math.Distance.Between(u.gx, u.gy, b.gx, b.gy);
    if(d <= radius && d < bd){ bd = d; best = b; }
  }
  return best;
}

function updateConstruction(delta){
  for(const b of myBuildings()){
    if(underConstruction(b) && !b.awaitingBuilder){
      const builder = factionDef().builderDissolves ? null : assignedBuilder(b);
      const ready = state.faction==='swarm' || builderPresent(builder, b);
      if(ready){
        b.buildMs -= delta;
        if(b.buildMs <= 0){
          b.buildMs = 0;
          if(b.sprite && b.sprite.setAlpha) b.sprite.setAlpha(1);
          const def = BUILD_DEFS[b.type];
          if(def && def.popCap && isMine(b)) state.population.cap += def.popCap;
          if(builder){ builder.buildTaskId = null; builder.path = null; } // done — free to become a worker
          // a production building's own builder gets first claim on working it
          if(def && def.needsWorker && builder) assignVillagerToBuilding(builder, b);
          // the just-freed builder rolls straight onto the NEAREST remaining
          // foundation — with a generous project radius, NOT pickWorkerFor's
          // tight auto-assign one. A builder already on the job keeps working
          // the project (chaining down a wall line segment by segment); the
          // 4-tile radius only governs pulling fresh villagers in.
          if(builder && !builder.assignedBuildingId){
            const next = nearestUnbuiltFoundation(builder, BUILDER_CHAIN_RADIUS);
            if(next){
              builder.buildTaskId = next.id;
              builder.tx = next.gx; builder.ty = next.gy; builder.moving = true;
            }
          }
          autoAssignIdleVillagers(); // and anyone else idle nearby fills remaining sites
          if(scene && scene.add) floatResourceText(b.gx, b.gy, 'complete!', '#a8e6a1');
          updateHUD();
        }
      }
    }
    if(b.upgradeMs > 0){
      b.upgradeMs -= delta;
      if(b.upgradeMs <= 0){
        if(b.upgradeToBone) completeWallUpgrade(b);
        else if(STORAGE_LEVELS[b.type]) completeStorageUpgrade(b);
        else if(b.isCore) completeTownCenterUpgrade(b);
      }
    }
  }
}

// ---- salvage / cancel ----
// Tear a FINISHED building down for scraps: costs 3 gold in labor, returns
// 15% of the original build cost.
const SALVAGE = { goldCost: 3, refund: 0.15 };
function salvageBuilding(b){
  if(!b || b.isCore || b.hp<=0 || underConstruction(b)) return false;
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

// Cancel an UNBUILT/in-progress foundation: full refund, no gold fee —
// this is calling off an order before it's delivered, not demolishing a
// finished building (that's Salvage, and stays lossy on purpose).
// Whoever was assigned to build it is freed automatically (removeBuilding
// clears their buildTaskId).
function cancelBuilding(b){
  if(!b || b.isCore || !underConstruction(b)) return false;
  const def = BUILD_DEFS[b.type];
  const parts = [];
  if(def && def.cost){
    for(const k in def.cost){
      if(def.cost[k] > 0){ addResource(k, def.cost[k]); parts.push(def.cost[k] + ' ' + k); }
    }
  }
  removeBuilding(b);
  flashWaveBanner('Cancelled' + (parts.length ? ' — refunded ' + parts.join(', ') : '') + '.');
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
function hasBuilding(type){ return myBuildings().some(b=>b.type===type && b.hp>0 && !(b.buildMs>0)); }

// The caravan is a real wagon on the map: it rolls in from the map edge,
// parks beside the market while the deals last, then rolls away again.
function spawnCaravanVisual(){
  if(!scene || !scene.add) return;
  const market = myBuildings().find(b=>b.type==='market' && b.hp>0);
  if(!market) return;
  if(state.caravan && state.caravan.sprite) state.caravan.sprite.destroy();
  const {gx, gy} = edgeSpawnPoint();
  const c = { gx, gy, tx:market.gx, ty:market.gy, phase:'arriving', market };
  c.sprite = scene.add.image(gx*TILE+TILE/2, gy*TILE+TILE/2, 'tiles', FRAME.caravan)
    .setDepth(4); // its own wagon sprite now — no more gold-tinted battering ram
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
// ---- the Ritual Pit -------------------------------------------------
// Corpses are BANKED here as a count, not stored as bodies. That is the
// whole reason the mechanic works: corpses rot in 45 seconds, so twenty of
// them can never exist on the map at once — but a tally survives between
// raids, so a golem is something you build toward over a whole war.
function ritualPit(){
  return myBuildings().find(b=>b.type==='ritual_pit' && b.hp>0 && !underConstruction(b)) || null;
}

function depositCorpseInPit(pit){
  pit.corpseCount = (pit.corpseCount || 0) + 1;
  const need = RITUAL.corpsesPerGolem;
  if(scene && scene.add) floatResourceText(pit.gx, pit.gy, `${pit.corpseCount}/${need}`, '#b6c98a');
  if(pit.corpseCount >= need){
    pit.corpseCount -= need;
    const spot = findFreeSpotNear(pit.gx, pit.gy, 3) || {gx:pit.gx, gy:pit.gy};
    createFleshGolem(spot.gx, spot.gy);
    flashWaveBanner('The pit heaves — a Flesh Golem drags itself free!');
  }
  updateHUD();
  refreshInfoPanel();
}

// ---- corpses: the shared raise/bury resource (see CORPSE in content.js) ----
let corpseIdCounter = 1;
function spawnCorpse(gx, gy){
  const c = {
    id: corpseIdCounter++, gx: Math.round(gx), gy: Math.round(gy),
    rotMs: factionDef().corpseRotMs,
  };
  if(scene && scene.add){
    c.sprite = scene.add.image(c.gx*TILE+TILE/2, c.gy*TILE+TILE/2, 'tiles', FRAME.corpse).setDepth(2); // above ground, below units
  }
  state.corpses.push(c);
  return c;
}
function corpseAt(gx, gy){ return state.corpses.find(c=> c.gx===gx && c.gy===gy) || null; }
function corpseById(id){ return state.corpses.find(c=> c.id===id) || null; }
function removeCorpse(c){
  if(c.sprite) c.sprite.destroy();
  state.corpses = state.corpses.filter(x=>x!==c);
}
function updateCorpses(delta){
  for(const c of [...state.corpses]){
    c.rotMs -= delta;
    // fade out over the last stretch so the disappearance isn't a pop
    if(c.sprite && c.rotMs < 10000) c.sprite.setAlpha(Math.max(0.25, c.rotMs/10000));
    if(c.rotMs > 0) continue;
    if(state.faction==='swarm'){
      // left to rot on the blight, the fallen dissolve into carrion —
      // the old instant-on-death income, now the "didn't bother raising" default
      addResource('food', SWARM.corpseBiomass);
      if(scene && scene.add) floatResourceText(c.gx, c.gy, '+'+SWARM.corpseBiomass+' carrion', '#b6c98a');
      updateHUD();
    }
    removeCorpse(c);
  }
}

function computeHappiness(){
  let h = 70;
  const wells = myBuildings().filter(b=>b.type==='well' && b.hp>0 && !underConstruction(b)).length;
  const taverns = myBuildings().filter(b=>b.type==='tavern' && b.hp>0 && !underConstruction(b)).length;
  h += Math.min(wells, 3) * 5;    // up to +15
  h += Math.min(taverns, 2) * 10; // up to +20
  h += Math.min(state.burialBoost || 0, CORPSE.buryHappyCap); // the honored dead — recent burials
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
  if(key==='bone') return BONE_CAP;           // likewise: bone is meant to gate, not to pile up
  let cap = STORAGE_BASE;
  // Town Hall levels raise the base cap for every resource
  const lvl = tcLevel();
  for(let i=0; i<lvl-1; i++) cap += TC_LEVELS.storageBonus[i];
  for(const b of myBuildings()){
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
  // YOUR buildings only. The enemy core carries isCore too, and its art comes
  // from AI_BUILD_DEFS through aiDef() — but this reads factionDef(), i.e. the
  // PLAYER's faction. Without this guard the restore pass (save.js calls
  // refreshEvolution on every rebuilt building) stamped your core's sprite
  // onto theirs: an undead enemy's crypt came back from a reload as a human
  // town hall, and a human enemy's town hall came back as a crypt. It bit the
  // enemy's whole roster the moment they stopped being one of two fixed skins.
  if(!isMine(b)) return null;
  // The ladders live in FACTION_DEFS.evolutionFrames so every faction has to
  // STATE its upgrade art. This used to be a chain of ifs that special-cased
  // the undead core and then fell through to the human tiers for everyone
  // else, which is why an upgraded Heartwood became a town hall and an
  // upgraded Hollow or tribe Cache became a human granary.
  const ladder = factionDef().evolutionFrames[b.isCore ? 'core' : b.type];
  if(!ladder) return null;
  const lvl = b.level || 1;
  for(const [minLevel, frame] of ladder) if(lvl >= minLevel) return frame;
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

// ---------------------------------------------------------------------
// Wall upgrades — the undead's bone tier.
//
// WALL_UPGRADE is null for every faction that has no second wall tier, so
// every check below is also the "does this faction do this at all" check.
// Set by applySwarmFaction(); see there for the numbers.
//
// Per-wall rather than a one-time unlock: a wall you have paid bone for is a
// wall you chose to reinforce, so a long screen can be part fence, part
// crypt, and the bone goes where you expect the assault.
// ---------------------------------------------------------------------
function canUpgradeWall(b){
  if(!WALL_UPGRADE || !b || b.type !== 'wall') return false;
  if(b.boneWall || b.hp <= 0) return false;
  if(underConstruction(b) || b.upgradeMs > 0) return false;
  return true;
}

function upgradeWall(b){
  if(!canUpgradeWall(b)) return false;
  const cost = WALL_UPGRADE.cost;
  for(const k in cost) if((state.resources[k] || 0) < cost[k]) return false;
  for(const k in cost) state.resources[k] -= cost[k];
  b.upgradeMs = WALL_UPGRADE.ms;
  b.upgradeToBone = true;    // tells updateConstruction which completer to run
  flashWaveBanner(`${WALL_UPGRADE.name} rising...`);
  updateHUD();
  return true;
}

function completeWallUpgrade(b){
  b.upgradeMs = 0; b.upgradeToBone = false;
  b.boneWall = true;
  const gain = WALL_UPGRADE.hp - b.maxHp;
  b.maxHp = WALL_UPGRADE.hp;
  b.hp = Math.min(b.maxHp, b.hp + Math.max(0, gain));   // reinforced, not healed to full
  refreshWallSprite(b);
  refreshWallNeighborhood(b.gx, b.gy);   // neighbours may now want a corner piece
  if(scene && scene.add) floatResourceText(b.gx, b.gy, WALL_UPGRADE.name + '!', '#e2e0ce');
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
function createBuilding(type, gx, gy, override, owner){
  const def = override || BUILD_DEFS[type];
  const size = def.size || 1; // the Town Center is 2x2; everything else 1x1
  const b = {
    id: buildingIdCounter++,
    type, gx, gy, size, hp: def.hp, maxHp: def.hp,
    frame: def.frame, isCore: false,
    owner: owner || OWNER_PLAYER,   // see the ownership helpers in state.js
    lastAttackAt: 0,
  };
  if(STORAGE_LEVELS[type]) b.level = 1;
  if(type === 'creep_tumor' && b.creepGen === undefined) b.creepGen = 0; // auto-spread children override this after creation
  for(let dy=0; dy<size; dy++) for(let dx=0; dx<size; dx++){
    if(inBounds(gx+dx, gy+dy)) state.occupied[gy+dy][gx+dx] = b;
  }
  state.buildings.push(b);
  // The Grove: a new structure starts as a dormant SEED and sends out a root
  // toward the nearest connected neighbour. It is inert until that root
  // lands — that delay is the whole faction, and it is what the enemy gets
  // to interrupt.
  //
  // NOT during a restore. restoreGame() stamps the SAVED id over the fresh one
  // immediately after this returns (Object.assign(b, sb)), so a root started
  // here would hold the discarded id: buildingById(toId) then returns null,
  // updateGroveRoots marks the root dead, the cascade takes every root hanging
  // off it, and nothing anywhere re-roots an existing structure. The entire
  // Grove was left permanently severed — no yield, no growth — by any reload.
  // The saved roots are restored wholesale instead, progress and all.
  // Whichever side is playing Grove — you or the enemy town. groveOwner()
  // returns null when nobody is, so this is also the "is this game a Grove
  // game at all" check.
  if(!state._restoring && typeof groveOwner === 'function'
     && groveOwner() === (b.owner || OWNER_PLAYER) && !b.isCore){
    b.groveStage = 0; b.groveAgeMs = 0;
    // Out of root reach right now is not necessarily out of reach forever —
    // the network may grow toward it later. Flagged rather than abandoned; see
    // retryUnrootedGrove().
    if(typeof startRootTo === 'function' && !startRootTo(b)) b.groveRootFailed = true;
  }
  const px = gx*TILE + size*TILE/2, py = gy*TILE + size*TILE/2;
  b.sprite = scene.add.image(px, py, 'tiles', FRAME[def.frame]).setDepth(DEPTH.building);
  if(def.tint && b.sprite.setTint) b.sprite.setTint(def.tint); // reused frames get a signature tint
  if(size>1 && b.sprite.setDisplaySize) b.sprite.setDisplaySize(size*TILE, size*TILE);
  // Remembered so a Grove structure can swap to the shared seed sprite and
  // back to its own. Stored for every faction — it costs nothing and means
  // "what does this building normally look like" has one answer.
  b.baseFrame = def.frame;
  // A freshly-placed Grove structure is a SEED, and has to LOOK like one.
  // applyGroveStage was never called at creation, so the sprite kept its
  // default scale of 1.0 while b.groveStage said 0 — a seed rendered at FULL
  // size and then visibly SHRANK to 0.7 the moment it became a sapling.
  if(!state._restoring && typeof applyGroveStage === 'function'
     && typeof groveOwner === 'function' && groveOwner() === (b.owner || OWNER_PLAYER)
     && !b.isCore){
    applyGroveStage(b);
  }
  b.hpBarBg = scene.add.rectangle(px, gy*TILE+2, size*TILE-6, 4, 0x2a1c10).setDepth(5);
  b.hpBarFg = scene.add.rectangle(gx*TILE+4, gy*TILE+2, size*TILE-6, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6);
  b.hpBarBg.setVisible(false); b.hpBarFg.setVisible(false);
  scene.buildingLayerGroup.add(b.sprite);
  // new builds start as scaffolding (override = pre-built, e.g. the TC)
  if(!override && BUILD_TIME[type]){
    b.buildMs = BUILD_TIME[type];
    if(b.sprite.setAlpha) b.sprite.setAlpha(0.55);
  }
  // isMine: population is YOUR headcount. The enemy town ships seven
  // dwellings (popCap 4) and a core (popCap 8), so without this their
  // housing silently raised your cap by 36 the instant the world loaded.
  if(def.popCap && !underConstruction(b) && isMine(b)) state.population.cap += def.popCap;
  if(isWallType(type)) refreshWallNeighborhood(gx, gy);
  // Same reason as the root guard above: dispatch stamps b.id onto a worker
  // (assignedBuildingId / buildTaskId) and restore is about to replace that id.
  // Harmless today only because units are rebuilt AFTER buildings, so there is
  // nobody to dispatch — restoreGame runs its own pass at the end, once the
  // world is real. Guarded rather than left to depend on that ordering.
  if(def.needsWorker && !underConstruction(b) && !state._restoring) autoAssignIdleVillagers();
  updateHUD();
  return b;
}

// Walls are drawn as a horizontal stone segment by default. When a wall
// tile's only wall neighbors are above/below it (not left/right), switch
// to the vertical-facing sprite so vertical runs connect visually too.
// 'wall' is the player's; 'ai_wall' is the enemy town's. Both are walls and
// both need to pick a straight/vertical/corner variant from their neighbours.
function isWallType(t){ return t === 'wall' || t === 'ai_wall'; }

function refreshWallSprite(b){
  if(!b || !isWallType(b.type) || !b.sprite) return;
  // Only ever connect to walls of the SAME kind. Yours and theirs can end up
  // adjacent once the corridor opens and the fight reaches their screen; a
  // shared run would have your masonry growing a bone corner.
  const same = (nb)=> nb && nb.type === b.type;
  const left = occAt(b.gx-1, b.gy), right = occAt(b.gx+1, b.gy);
  const up = occAt(b.gx, b.gy-1), down = occAt(b.gx, b.gy+1);
  const horiz = same(left) || same(right);
  const vert = same(up) || same(down);
  // corners, T-junctions and crossings use the junction sprite so
  // perpendicular wall runs read as one continuous wall
  // Variant names come off the def, not hardcoded. These three were literal
  // human frame names, so they overwrote whatever a faction had set the moment
  // a wall was placed or a neighbour updated — which is why the tribe kept
  // building human masonry despite frame:stake_wall.
  //
  // The enemy town reads its variants off AI_BUILD_DEFS the same way. Until
  // this existed refreshWallSprite early-returned on anything that was not
  // exactly 'wall', so ai_wall never picked a variant at all — and the town
  // plan's screen is a VERTICAL run, so it rendered as six horizontal
  // segments stacked on top of one another with the courses running the wrong
  // way and the crown repeating down the middle.
  const wd = (b.type === 'ai_wall')
    ? (typeof aiDef === 'function' ? (aiDef('ai_wall') || {}) : {})
    : (BUILD_DEFS.wall || {});
  // an upgraded wall wears the bone tier's sprites, not its base tier's
  const v = (b.boneWall && WALL_UPGRADE && WALL_UPGRADE.variants)
    ? WALL_UPGRADE.variants
    : (wd.variants || { corner:'wall_corner', vert:'wall_v', straight:'wall' });
  const frame = (vert && horiz) ? v.corner : ((vert && !horiz) ? v.vert : v.straight);
  if(FRAME[frame] !== undefined) b.sprite.setFrame(FRAME[frame]);
}

function refreshWallNeighborhood(gx, gy){
  const spots = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of spots){
    const nb = occAt(gx+dx, gy+dy);
    if(isWallType(nb && nb.type)) refreshWallSprite(nb);
  }
}

function isPlacementValid(type, gx, gy){
  if(!inBounds(gx,gy)) return false;
  const t = tileAt(gx,gy);
  if(isImpassableTile(t)) return false;
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
    // a selected drone (busy harvesting included) is the deliberate morpher;
    // otherwise fall back to the nearest idle one
    morphDrone = explicitlySelectedWorker({gx, gy}) || pickWorkerFor({gx, gy});
    if(!morphDrone){
      flashWaveBanner('No ghoul free to raise it — grow more at the Necropolis!');
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
    unassignVillager(morphDrone); // fully drop any harvest job before morphing
    morphDrone.buildTaskId = newBuilding.id;
    morphDrone.tx = gx; morphDrone.ty = gy; morphDrone.moving = true;
  } else {
    // humans: an explicitly SELECTED villager is the deliberate builder —
    // pull them off whatever they're doing (harvesting included) and send
    // them. Only with nothing eligible selected do we auto-dispatch the
    // nearest idle villager instead.
    const selBuilder = explicitlySelectedWorker({gx, gy});
    if(selBuilder){
      unassignVillager(selBuilder);
      selBuilder.buildTaskId = newBuilding.id;
      selBuilder.tx = gx; selBuilder.ty = gy; selBuilder.moving = true; selBuilder.playerOrder = true;
    } else {
      autoAssignIdleVillagers(); // dispatch an idle villager right now if one's free
    }
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
  // a builder mid-construction (or still walking over) shouldn't stay
  // pinned to a foundation that no longer exists — free them up
  for(const builder of state.units.filter(u=> u.type==='villager' && u.buildTaskId===b.id)){
    builder.buildTaskId = null; builder.path = null;
  }
  // anyone still garrisoned inside (archers — villagers already popped out
  // via unassignVillager above) climbs down before the tower vanishes
  for(const g of state.units.filter(u=> u.inTowerId===b.id)){
    if(g.type==='archer') g.garrisonId = null;
    exitTower(g);
  }
  const bSize = b.size || 1;
  for(let dy=0; dy<bSize; dy++) for(let dx=0; dx<bSize; dx++){
    if(inBounds(b.gx+dx, b.gy+dy) && state.occupied[b.gy+dy][b.gx+dx]===b) state.occupied[b.gy+dy][b.gx+dx] = null;
  }
  state.buildings = state.buildings.filter(x=>x!==b);
  if(b.garrisonMarker){ b.garrisonMarker.destroy(); b.garrisonMarker = null; }
  // the gloom (a charged blight source) goes with it — see updateGloomMarkers
  if(b.gloom){ scene.tweens.killTweensOf(b.gloom); b.gloom.destroy(); b.gloom = null; }
  b.sprite.destroy(); b.hpBarBg.destroy(); b.hpBarFg.destroy();
  const def = BUILD_DEFS[b.type];
  // and symmetrically: razing one of THEIR houses must not shrink your cap
  if(def && def.popCap && isMine(b)) state.population.cap = Math.max(3, state.population.cap - def.popCap);
  if(state.selected && state.selected.ref===b) selectEntity(null,null);
  if(b.type==='wall') refreshWallNeighborhood(b.gx, b.gy);
  // Losing YOUR core ends the run. Theirs is the win condition, handled by
  // checkAiDefeated — and this fires synchronously from combat, well before
  // that runs, so without the ownership test razing their Town Hall showed
  // "Your Town Has Fallen" at the exact moment you won.
  if(b.isCore && isMine(b)){
    endGame(false);
  }
  updateHUD();
}

function damageBuilding(b, dmg){
  // Scaffolding is flimsy: ANY hit levels an unfinished building, and the
  // materials are lost. Without this, cheap unbuilt wall foundations were a
  // free barricade — you could wall a raid out with walls you never paid to
  // finish. Refunds are what the Cancel button is for; being overrun isn't.
  if(underConstruction(b)){
    if(scene && scene.add) floatResourceText(b.gx, b.gy, 'wrecked!', '#ff8a6b');
    removeBuilding(b); // no refund
    return;
  }
  b.hp -= dmg;
  // Their expansion is worth defending: any hit on an enemy structure calls
  // nearby defenders to it, so taking the middle costs a fight rather than
  // being free demolition.
  if(isEnemyBuilding(b) && typeof aiRaiseAlarm === 'function') aiRaiseAlarm(b.gx, b.gy);
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
// Per-unit gather rate. A villager is the baseline (1x); a Grove Ent is
// deliberately worse at both halves of the job. Kept as two small functions
// rather than inlined so a future faction with, say, a fast miner is a data
// change here and not another branch inside updateGatherer.
function gatherHarvestMs(u){
  const m = (typeof groveGatherMods === 'function') ? groveGatherMods(u) : null;
  return HARVEST_MS * (m ? m.harvestMult : 1);
}
function gatherCarryAmount(u, carry){
  const m = (typeof groveGatherMods === 'function') ? groveGatherMods(u) : null;
  // never rounds to zero — a slow gatherer is slow, not useless
  return Math.max(1, Math.round(carry.amt * (m ? m.carryMult : 1)));
}

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

  // Garrison duty: a villager assigned to a tower walks to its base (pathing
  // around walls — towers usually sit IN a wall line) and climbs inside:
  // hidden, safe, adding damage, like the Town Hall garrison. Garrisons do
  // NOT retreat during raids — holding the tower IS their job.
  if(b.type==='tower'){
    u.gatherWorking = false;
    if(u.inTowerId===b.id) return; // already inside (normally skipped in updateUnits)
    if(u.moving) return;
    const atPost = Math.max(Math.abs(Math.round(u.gx)-b.gx), Math.abs(Math.round(u.gy)-b.gy)) <= 1;
    if(atPost){
      if(towerGarrison(b).total < TOWER_GARRISON_CAP) enterTower(u, b);
      // else: tower's full — wait at the base for a slot
    } else if(!u.path || !u.path.length){
      u.path = findPathToTowerPost(u, b);
      if(!u.path || !u.path.length){
        // Same retry the archer path uses, and for the same reason: order two
        // or three villagers into a tower together and they arrive clustered,
        // all routing to the same post tile. The first takes it and the rest
        // fail against their own groupmate. Unassigning on the FIRST failure
        // is why group garrisoning only ever got one of them in.
        u.towerPostFailMs = (u.towerPostFailMs || 0) + delta;
        if(u.towerPostFailMs > TOWER_POST_RETRY_MS){
          u.towerPostFailMs = 0;
          flashWaveBanner('The villager can\'t reach that tower — is it walled off?');
          unassignVillager(u); // genuinely blocked — stand down rather than twitch forever
        }
      } else u.towerPostFailMs = 0;
    }
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

  // ---- ran out, or there's a better camp now ----------------------------
  // Both checks sit here, ahead of the per-type branches, so they cover the
  // haulers (Lumber Camp/Quarry/Refinery/Bone Yard) and the tribe's Hunting
  // Camp — which takes the farm path below — in one place.
  if(isResourceCamp(b)){
    if(u.migrateCoolMs > 0) u.migrateCoolMs -= delta;
    // Dry: let them go. A worker carrying a load finishes the trip first, so
    // a full haul is never dropped on the ground.
    if(b.depleted && !u.carrying){
      unassignVillager(u);
      return;
    }
    // Transfer to a nearer camp of the same type. Only BETWEEN trips
    // (gatherPhase is null exactly when a haul has just been banked, or when
    // the job is brand new) so nobody abandons a walk halfway. The cooldown
    // is a stop against two near-equidistant camps trading a worker forever —
    // CAMP_MIGRATE_MARGIN handles the common case, this bounds the worst one.
    if(!u.carrying && !u.gatherPhase && !u.moving && !(u.migrateCoolMs > 0)){
      const better = nearerCampFor(u, b, workedTileOf(u, b));
      if(better){
        assignVillagerToBuilding(u, better);
        u.migrateCoolMs = 10000;
        if(scene && scene.add) floatResourceText(b.gx, b.gy, 'closer camp', '#b6c98a');
        return;
      }
    }
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
      if(u.harvestMs >= gatherHarvestMs(u)){
        const t = u.gatherTarget;
        const avail = (t && state.resourceQty[t.gy] && state.resourceQty[t.gy][t.gx]) || 0;
        const amt = Math.min(gatherCarryAmount(u, carry), avail);
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
        // Discovered mid-run rather than on the economy tick — flag it here
        // too, so the crew is released on the very next frame instead of
        // milling about the dead camp until refreshDryCamps() catches up.
        markCampDry(b, true);
        if(!atHome && !u.moving){ u.tx=b.gx; u.ty=b.gy; u.moving=true; }
        return;
      }
      markCampDry(b, false);
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
  if(b && !underConstruction(b) && BUILD_DEFS[b.type] && (BUILD_DEFS[b.type].needsWorker || BUILD_DEFS[b.type].garrison)) return b;
  // (wall repair is the Repairman's job now — villagers don't take it)
  return null;
}

// Tower garrison: only units that have actually climbed INSIDE count
// (u.inTowerId — set by enterTower once they reach the base). Up to 3
// defenders; archers fire their own bows (bigger bonus), villagers just
// help work it (a small bonus). Entry is gated on the cap in the walk
// code, so the clamps here are belt-and-braces.
const TOWER_GARRISON_CAP = 3;
const TOWER_GARRISON_DMG = { archer: 3, villager: 2 };
// An archer up the tower shoots FURTHER than the tower's own arrow slits —
// they have height and a longbow, where the base tower is just murder holes.
// Per archer, capped, so three archers is a meaningfully longer reach and not
// an unbounded sniper nest. Villagers add damage (they work the machine) but
// no range: they aren't the ones aiming.
const TOWER_GARRISON_RANGE = { perArcher: 0.4, max: 1.2 };
function towerAttackRange(b){
  const def = BUILD_DEFS[b.type];
  const base = (def && def.attack) ? def.attack.range : 0;
  if(b.type !== 'tower') return base;
  const g = towerGarrison(b);
  return base + Math.min(g.archers * TOWER_GARRISON_RANGE.perArcher, TOWER_GARRISON_RANGE.max);
}
function towerGarrison(tower){
  let archers = 0, villagers = 0;
  for(const u of state.units){
    if(u.hp<=0 || u.inTowerId!==tower.id) continue;
    if(u.type==='archer') archers++;
    else if(u.type==='villager') villagers++;
  }
  archers = Math.min(archers, TOWER_GARRISON_CAP);
  villagers = Math.min(villagers, TOWER_GARRISON_CAP - archers);
  return { archers, villagers, total: archers + villagers };
}
function towerGarrisonCount(tower){ return towerGarrison(tower).total; }
function isGarrisoned(tower){ return towerGarrisonCount(tower) > 0; }

// A villager posted to a tower is on defensive duty — exempt from the
// Recall Workers sweep (see recallAllWorkers) and from gathering.
function onTowerDuty(u){
  if(u.type!=='villager' || u.assignedBuildingId==null) return false;
  const b = buildingById(u.assignedBuildingId);
  return !!(b && b.type==='tower' && b.hp>0);
}

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

// byPlayer marks a posting the player made by hand (right-click "work here").
// Auto-migration to a nearer camp leaves those alone — a deliberate placement
// is not something to quietly undo. Every automatic dispatch omits the flag.
function assignVillagerToBuilding(v, building, byPlayer){
  // join the crew if there's room; if the building is fully crewed, bump
  // the longest-serving worker (keeps the old replace behavior for farms)
  const crew = workersOf(building).filter(w=>w!==v);
  if(crew.length >= workerCapOf(building)){
    crew[0].assignedBuildingId = null;
  }
  if(v.inTowerId && v.inTowerId !== building.id) exitTower(v); // new job elsewhere — climb down first
  v.jobByPlayer = !!byPlayer;
  v.assignedBuildingId = building.id;
  v.buildTaskId = null; // now actually working — any pending build task is abandoned
  v.path = null;
  v.gatherWorking = false;
  v.gatherPhase = null; v.gatherTarget = null; // restart the haul loop fresh
  v.moving = false; // updateGatherer takes over from here
}

function unassignVillager(v){
  if(v.inTowerId) exitTower(v); // no longer posted — climb down
  v.assignedBuildingId = null;
  v.jobByPlayer = false;   // off the job entirely — the hand-placement no longer applies
  v.buildTaskId = null; // an explicit new order always cancels a pending build task, human or swarm
  v.path = null;
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

  // beyond a selected unit, auto-dispatch only reaches AUTO_ASSIGN_RADIUS
  // tiles — far enough to catch a villager standing right outside a camp,
  // not far enough to send one sprinting across the whole map. An explicit
  // right-click order (assignVillagerToBuilding / the build-a-foundation
  // handler in main.js) bypasses this entirely, same as it always has.
  let best = null, bestD = Infinity;
  for(const u of state.units){
    if(u.type!=='villager' || u.hp<=0 || u.assignedBuildingId || u.buildTaskId || u.inTC || u.enteringTC || u===sel) continue;
    const d = Phaser.Math.Distance.Between(u.gx, u.gy, location.gx, location.gy);
    if(d > AUTO_ASSIGN_RADIUS) continue;
    if(d < bestD){ bestD = d; best = u; }
  }
  return best;
}

// An EXPLICITLY selected villager/drone is a deliberate choice of who should
// act — so unlike pickWorkerFor (which only auto-grabs an IDLE unit near the
// job), this returns the selection even when it's busy HARVESTING, so placing
// a building pulls that worker off gathering to build it (the standard RTS
// "the worker I selected builds what I place"). It still won't grab one that's
// already building something — that's what stops a chain of placed walls from
// yanking the same builder off each segment. With a group selected, the
// nearest eligible member to the job wins.
function explicitlySelectedWorker(location){
  const eligible = (u)=> u && u.type==='villager' && u.hp>0 && !u.buildTaskId && !u.inTC && !u.enteringTC;
  if(state.selectedGroup && state.selectedGroup.length){
    let best=null, bd=Infinity;
    for(const u of state.selectedGroup){
      if(!eligible(u)) continue;
      const d = Phaser.Math.Distance.Between(u.gx, u.gy, location.gx, location.gy);
      if(d<bd){ bd=d; best=u; }
    }
    return best;
  }
  const sel = (state.selected && state.selected.type==='unit') ? state.selected.ref : null;
  return eligible(sel) ? sel : null;
}

function autoAssignIdleVillagers(){
  // priority 1: any foundation without a LIVING assigned builder needs one
  // dispatched — whether it never had one (awaitingBuilder), or had one who
  // died or got manually reassigned partway through (buildMs>0, nobody's
  // buildTaskId points at it anymore). Checked live against units, not a
  // flag on the building, so this self-heals on the next call regardless
  // of why the previous builder is gone.
  // Swarm is simpler: its drone dissolves into the structure the instant
  // it arrives, so "no living builder" is the NORMAL state mid-construction
  // — only truly-unstarted (awaitingBuilder) growths need a fresh drone.
  const unbuilt = myBuildings().filter(b=>{
    if(!underConstruction(b) || b.hp<=0) return false;
    if(state.faction==='swarm') return b.awaitingBuilder;
    return !assignedBuilder(b);
  });
  for(const b of unbuilt){
    const builder = pickWorkerFor(b);
    if(!builder) continue; // no one free right now — try again next call
    builder.buildTaskId = b.id;
    builder.tx = b.gx; builder.ty = b.gy; builder.moving = true;
  }

  // The Grove staffs its camps BY HAND only. Its structures already pay out
  // just for being connected, and an Ent that wanders off to chop is an Ent no
  // longer adding its tendBonus — so sending one to work is a trade the player
  // should make deliberately. Auto-dispatch would grab the starting Ent (there
  // is exactly one) the moment a Heartroot finished and quietly rewrite how the
  // faction plays. Explicit right-click assignment still works normally.
  if(state.faction === 'grove') return;

  // A DRY camp is deliberately not needy. Without this, releasing its crew and
  // re-staffing it are the same loop: the workers go idle, the very next
  // dispatch pass sees an understaffed camp and sends them straight back, and
  // the idle counter flickers between 0 and 3 forever.
  const needy = myBuildings().filter(b=> BUILD_DEFS[b.type] && BUILD_DEFS[b.type].needsWorker
    && !(b.buildMs>0) && !b.depleted && workersOf(b).length < workerCapOf(b));
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
  return findNearestResourceTile(b.gx, b.gy, def.bonusNear, CAMP_DRY_RADIUS);
}

// ---------------------------------------------------------------------
// Depleted camps, and moving crews to a nearer one
//
// Both of these exist because an assigned villager is invisible. idleWorkers()
// skips anyone with an assignedBuildingId and so does pickWorkerFor(), so a
// worker standing at a worked-out Lumber Camp is neither gathering nor
// available nor counted anywhere — the idle box reads 0 while three villagers
// do nothing. The camp has to let them go for them to exist again.
// ---------------------------------------------------------------------

// Camps that draw on a terrain resource: Lumber Camp, Quarry, Refinery, Bone
// Yard, and the tribe's Hunting Camp. Keyed on bonusNear rather than a type
// list so a faction adding its own camp is covered without touching this.
function isResourceCamp(b){
  const d = b && BUILD_DEFS[b.type];
  return !!(d && d.bonusNear && d.needsWorker);
}

// The tile a worker is drawing from, which is what "a camp closer to the
// resource" is measured against. Haulers have an explicit gatherTarget;
// hunters roam, so their reference is the nearest live tile to the camp.
function workedTileOf(u, b){
  if(u && u.gatherTarget){
    const t = u.gatherTarget;
    if((state.resourceQty[t.gy] && state.resourceQty[t.gy][t.gx] || 0) > 0) return t;
  }
  return gatherTargetFor(b);
}

// A camp is dry when nothing it can harvest remains within CAMP_DRY_RADIUS.
// The result is cached on the building because this is a ring search and it
// would otherwise run per worker per frame; refreshDryCamps() re-tests it on
// the economy tick, so a camp comes back to life on its own when the ground
// does (tribe saplings maturing into forest is the case that matters).
function markCampDry(b, dry){
  if(!!b.depleted === !!dry) return;
  b.depleted = !!dry;
  // A washed-out tint is the whole marker: at 32px a badge is unreadable, and
  // "this camp is grey" is legible at a glance across a whole town.
  if(b.sprite && b.sprite.setTint){
    if(dry) b.sprite.setTint(0x6e6a63);
    else if(BUILD_DEFS[b.type] && BUILD_DEFS[b.type].tint) b.sprite.setTint(BUILD_DEFS[b.type].tint);
    else if(b.sprite.clearTint) b.sprite.clearTint();
  }
  if(dry){
    const def = BUILD_DEFS[b.type] || {};
    const what = def.bonusNear==='forest' ? 'trees'
               : def.bonusNear==='stone_deposit' ? 'stone'
               : def.bonusNear==='bone_pile' ? 'bone' : 'wildstone';
    flashWaveBanner(`${def.name} has no ${what} left in reach — its workers are idle.`);
  }
}

// Re-test every camp's ground. Cheap (one ring search per camp, once per 3s
// tick) and it is what lets a dry camp restaff itself rather than staying
// dead for the rest of the run.
function refreshDryCamps(){
  for(const b of myBuildings()){
    if(!isResourceCamp(b) || b.hp<=0 || underConstruction(b)) continue;
    markCampDry(b, !gatherTargetFor(b));
  }
}

// The camp this worker SHOULD be at: one of the same type, with a free slot,
// meaningfully closer to the tile they are actually working. Building a new
// Lumber Camp beside the wood you are already walking to should pull the crew
// over instead of leaving them on the long commute forever.
//
// Skipped for a villager the player placed by hand (jobByPlayer) — a
// deliberate posting is not something to quietly undo.
function nearerCampFor(u, camp, tile){
  if(!tile || u.jobByPlayer) return null;
  const cur = Phaser.Math.Distance.Between(camp.gx, camp.gy, tile.gx, tile.gy);
  let best = null, bestD = cur - CAMP_MIGRATE_MARGIN;
  for(const c of myBuildings()){
    if(c === camp || c.type !== camp.type || c.hp<=0) continue;
    if(underConstruction(c) || c.depleted) continue;
    if(workersOf(c).length >= workerCapOf(c)) continue;   // never bump someone else out to move in
    const d = Phaser.Math.Distance.Between(c.gx, c.gy, tile.gx, tile.gy);
    if(d < bestD){ bestD = d; best = c; }
  }
  return best;
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
const RATE_KEYS = ['food','wheat','flour','wood','stone','gold'];

// SUSTAINED flow only — production, hauls, taxes, upkeep and rations. The
// snapshot is taken at the START of economyTick and diffed at the END, so
// the window covers just this function's own work.
//
// It used to snapshot at the end of one tick and diff at the start of the
// next, which meant the window covered the whole 3s INCLUDING one-off
// purchases. Training a villager (-30 food) read as -600/min, so the number
// lurched around and told you nothing about whether your economy was
// actually keeping up. Purchases all happen on click, outside economyTick,
// so bracketing the tick excludes them for free — no need to itemise spends.
function snapshotResourceRates(){
  state._resSnap = {};
  for(const k of RATE_KEYS) state._resSnap[k] = state.resources[k];
}
function updateResourceRates(){
  if(!state._resSnap) return;
  state.resourceRates = {};
  for(const k of RATE_KEYS){
    state.resourceRates[k] = (state.resources[k] - state._resSnap[k]) * 20; // 3s -> per min
  }
}

function economyTick(){
  if(typeof sandboxTopUp === 'function') sandboxTopUp();  // testing mode: refill first
  snapshotResourceRates(); // bracket the tick — see updateResourceRates
  const recalled = isRecalled();
  refreshDryCamps();   // release crews from worked-out sites, revive camps whose ground came back
  // the honor of a burial fades with time — mourning isn't forever
  if(state.burialBoost > 0) state.burialBoost = Math.max(0, state.burialBoost - CORPSE.buryDecayPerTick);
  state.happiness = computeHappiness();
  const hm = state.happiness / 100; // output multiplier

  // farms grow WHEAT now (production chain) — output scaled by happiness
  for(const b of myBuildings()){
    if(b.type!=='farm' || b.hp<=0 || underConstruction(b)) continue;
    const worker = assignedWorkerOf(b);
    if(!worker || recalled) continue;
    // no harvest unless the farmer is actually standing on the farm working it
    // A human farmer tends the field itself, so must stand on it. A tribe
    // HUNTER draws from the surrounding forest and counts as working
    // anywhere in the treeline near the camp.
    const onTile = (typeof isHuntCamp === 'function' && isHuntCamp(b))
      ? huntingInPlace(worker, b)
      : (Math.round(worker.gx)===b.gx && Math.round(worker.gy)===b.gy && !worker.moving);
    if(!onTile) continue;
    if(b.fertility===undefined) b.fertility = 1;
    const amount = Math.max(1, Math.round(BUILD_DEFS.farm.produces.food * b.fertility * hm));
    // WHICH resource a farm yields is faction business. Humans grow wheat and
    // run it through mill -> bakery for a 1.5x payoff. The tribe HUNTS: there
    // is no cooking chain, so wheat would be a resource they can never eat —
    // and that is exactly what happened, food falling from 45 to 0 across a
    // whole run while the Hunting Camps worked perfectly and banked grain
    // nobody could cook.
    const yieldKey = factionDef().farmYield;
    const gained = addResource(yieldKey, amount);
    // soil exhaustion: every harvest wears the field down a little, so old
    // farms slowly fade and you have to found new ones on fresh ground
    b.fertility = Math.max(FARM_MIN_FERTILITY, b.fertility - FARM_SOIL_WEAR);
    if(scene && scene.add && gained>0) floatResourceText(b.gx, b.gy, '+'+gained, RESOURCE_COLOR[yieldKey] || RESOURCE_COLOR.wheat);
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
    for(const m of myBuildings()){
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
    for(const bk of myBuildings()){
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
  const houses = myBuildings().filter(b=>b.type==='house' && b.hp>0 && !underConstruction(b)).length;
  if(houses > 0) state.resources.gold += houses * TAX_GOLD_PER_HOUSE * hm;

  // apothecaries: any wounded unit within the herb garden slowly mends
  for(const ap of myBuildings()){
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
  const upkeepKey = factionDef().upkeepKey;
  const upkeepRate = isSwarm() ? SWARM.upkeepPerBuildingPerTick : UPKEEP.woodPerBuildingPerTick;
  const structures = myBuildings().filter(b=>b.hp>0 && !b.isCore);
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
  const soldiers = mySoldiers().length;
  const civilians = state.units.filter(u=>(u.type==='villager'||u.type==='repairman') && u.hp>0).length;
  // Per-faction appetite. The tribe eats 15% less: they have no cooking
  // chain to multiply what they gather, and their food is tied to finite
  // forest, so the cut is compensation rather than a bonus.
  const foodUse = (civilians * 0.5 + soldiers * UPKEEP.soldierFoodPerTick) * factionDef().foodUpkeepMult;
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
  // The Grove earns HERE, inside the bracket, not from main.js afterwards.
  // snapshotResourceRates() runs at the top of this function and the diff
  // below closes it, so income banked outside those two lines is invisible to
  // the rate readout — the Grove's entire production was landing after the
  // diff, and its net flow tooltip showed upkeep only. It read as a faction
  // that consumes and never produces.
  if(typeof groveEconomyTick === 'function') groveEconomyTick();
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
  for(const b of myBuildings()){
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
      flashWaveBanner(state.faction==='swarm' && kind==='swordsman' ? 'Two Skeletons claw up from the grave!' : `${kind==='archer'?'Archer':'Swordsman'} trained and ready!`);
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

