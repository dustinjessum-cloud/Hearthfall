// ---------------------------------------------------------------------
// Save / Load
// One autosave slot in localStorage. Buildings/units/enemies are plain
// data objects that ALSO carry live Phaser handles (sprite, hpBarBg,
// hpBarFg, marker) — those can't be JSON-serialized (circular refs to the
// scene), so the stringify replacer below drops them by key name.
// Restoring re-creates the Phaser side by calling the SAME creation
// functions used for a fresh game (createBuilding/createVillager/etc.),
// then stamps every saved field back on top of the freshly created
// object — the fresh call supplies a valid sprite; the stamp supplies
// the real hp/level/position/etc.
// ---------------------------------------------------------------------
const SAVE_KEY = 'hearthfall_save_v1';
const SAVE_INTERVAL_MS = 20000;
// Live Phaser handles that must never be serialized (circular refs to the
// scene). garrisonMarker (tower badge) and queueMarkers (order-queue dots)
// are recreated from live state on restore, so drop them here too.
const SAVE_SKIP_KEYS = new Set(['sprite', 'hpBarBg', 'hpBarFg', 'marker', 'garrisonMarker', 'queueMarkers']);

function hasSavedGame(){
  try { return !!localStorage.getItem(SAVE_KEY); } catch(err){ return false; }
}

function clearSavedGame(){
  try { localStorage.removeItem(SAVE_KEY); } catch(err){ /* ignore */ }
}

function loadSavedGame(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(err){
    console.error('Save data unreadable, discarding:', err);
    clearSavedGame();
    return null;
  }
}

function serializeGame(){
  return {
    version: 1,
    savedAt: Date.now(),
    faction: state.faction,
    resources: state.resources,
    evolutions: state.evolutions,
    evolutionInProgress: state.evolutionInProgress,
    captainRecruited: state.captainRecruited,
    hero: state.hero,
    happiness: state.happiness,
    populationCap: state.population.cap,
    wave: state.wave,
    nextWaveInMs: state.nextWaveInMs,
    nextSkirmishInMs: state.nextSkirmishInMs,
    nextCaravanInMs: state.nextCaravanInMs,
    caravanActiveMs: state.caravanActiveMs,
    manualRecall: state.manualRecall,
    starving: state.starving,
    grid: state.grid,
    resourceQty: state.resourceQty,
    roads: state.roads,
    creep: state.creep,
    creepCount: state._creepCount,
    townHallPos: scene && scene.townHallPos,
    buildings: state.buildings,
    units: state.units,
    enemies: state.enemies,
    corpses: state.corpses,
    burialBoost: state.burialBoost,
    buildingIdCounter, unitIdCounter, enemyIdCounter, corpseIdCounter,
  };
}

function saveGame(){
  if(!scene || !scene.worldReady || state.gameOver) return; // nothing sensible to save yet, or the run is over
  try {
    const json = JSON.stringify(serializeGame(), (k, v) => SAVE_SKIP_KEYS.has(k) ? undefined : v);
    localStorage.setItem(SAVE_KEY, json);
  } catch(err){
    console.error('Save failed:', err);
  }
}

// Re-creates one bandit camp's visuals to match spawnBanditCamps() exactly —
// spawnEnemy() doesn't know the 'camp' kind (it only picks raider/swordsman/
// ram frames), so restoring a camp needs its own tiny visual setup.
function restoreCamp(se){
  const e = {
    id: enemyIdCounter++, gx: se.gx, gy: se.gy, hp: se.hp, maxHp: se.maxHp, dmg: 0,
    kind: 'camp', speedMult: 0, path: null, pathIdx: 0, lastMoveAt: 0, lastAttackAt: 0, target: null,
  };
  e.sprite = scene.add.image(se.gx*TILE+TILE/2, se.gy*TILE+TILE/2, 'tiles', FRAME.wall_gate)
    .setTint(state.faction==='swarm' ? 0x8fb4e8 : 0xcc5544);
  e.hpBarBg = scene.add.rectangle(se.gx*TILE+TILE/2, se.gy*TILE-2, TILE-8, 4, 0x2a1c10).setDepth(5);
  e.hpBarFg = scene.add.rectangle(se.gx*TILE+4, se.gy*TILE-2, TILE-8, 4, 0xd85a3a).setOrigin(0,0.5).setDepth(6);
  state.enemies.push(e);
}

function restoreHpBar(entity, barWidthFull){
  if(!entity.hpBarFg || entity.hp >= entity.maxHp) return;
  entity.hpBarBg.setVisible(true); entity.hpBarFg.setVisible(true);
  const pct = Math.max(0, entity.hp / entity.maxHp);
  entity.hpBarFg.width = barWidthFull * pct;
  entity.hpBarFg.fillColor = pct>0.5 ? 0x6bbf59 : (pct>0.25 ? 0xd8b23a : 0xd85a3a);
}

// Called from MainScene.startWorld() instead of the fresh-map setup.
// Rebuilds the whole world (map, buildings, units, enemies) from a
// snapshot produced by serializeGame().
function restoreGame(snapshot){
  state.grid = snapshot.grid;
  state.resourceQty = snapshot.resourceQty;
  state.roads = snapshot.roads;
  state.creep = snapshot.creep || [];
  state._creepCount = snapshot.creepCount || 0;
  state.occupied = []; state.tileSprites = [];
  for(let y=0; y<MAP_H; y++){
    state.occupied.push(new Array(MAP_W).fill(null));
    state.tileSprites.push(new Array(MAP_W).fill(null));
  }

  scene.townHallPos = snapshot.townHallPos;
  scene.drawMap();

  // drawMap() paints raw terrain only — re-skin creep and road tiles on top,
  // same as the live game does as territory/roads change.
  for(let y=0; y<MAP_H; y++){
    for(let x=0; x<MAP_W; x++){
      const spr = state.tileSprites[y][x];
      if(!spr || !spr.setFrame) continue;
      if(state.roads[y] && state.roads[y][x]){
        spr.setFrame(FRAME.dirt);
        spr.setTint(state.faction==='swarm' ? SWARM.creep.roadTint : (BUILD_DEFS.road.tint || 0xe0c898));
      } else if(isCreeped(x, y)){
        spr.setFrame(frameForGroundTile(x, y));
      }
    }
  }

  Object.assign(state.resources, snapshot.resources);
  Object.assign(state.evolutions, snapshot.evolutions);
  state.evolutionInProgress = snapshot.evolutionInProgress;
  state.captainRecruited = snapshot.captainRecruited;
  Object.assign(state.hero, snapshot.hero);
  state.happiness = snapshot.happiness;
  state.wave = snapshot.wave;
  state.nextWaveInMs = snapshot.nextWaveInMs;
  state.nextSkirmishInMs = snapshot.nextSkirmishInMs;
  state.nextCaravanInMs = snapshot.nextCaravanInMs;
  state.caravanActiveMs = snapshot.caravanActiveMs || 0;
  state.manualRecall = snapshot.manualRecall;
  state.starving = snapshot.starving;

  buildingIdCounter = snapshot.buildingIdCounter || buildingIdCounter;
  unitIdCounter = snapshot.unitIdCounter || unitIdCounter;
  enemyIdCounter = snapshot.enemyIdCounter || enemyIdCounter;
  corpseIdCounter = snapshot.corpseIdCounter || corpseIdCounter;
  state.burialBoost = snapshot.burialBoost || 0;

  // ---- corpses (fallen humans awaiting raise/burial) ----
  state.corpses = [];
  for(const sc of (snapshot.corpses || [])){
    const c = spawnCorpse(sc.gx, sc.gy);
    c.id = sc.id; c.rotMs = sc.rotMs; // keep identity + remaining rot time
  }

  // ---- buildings ----
  for(const sb of snapshot.buildings){
    const override = sb.isCore
      ? (state.faction==='swarm'
          ? {name:'Necropolis', hp:sb.maxHp, frame:'crypt', size:sb.size||2}
          : {name:'Town Hall', hp:sb.maxHp, frame:'town_hall', size:sb.size||2})
      : Object.assign({}, BUILD_DEFS[sb.type], {hp: sb.maxHp});
    if(!override.frame){ console.error('Skipping unknown building type on restore:', sb.type); continue; }
    const b = createBuilding(sb.type, sb.gx, sb.gy, override);
    Object.assign(b, sb); // overlay every saved field (sprite/hpBar refs are absent from sb, so the live ones survive)
    if(b.sprite && b.sprite.setAlpha) b.sprite.setAlpha(underConstruction(b) ? (b.awaitingBuilder ? 0.3 : 0.55) : 1);
    refreshEvolution(b);
    restoreHpBar(b, (b.size||1)*TILE-6);
  }
  // wall sprite variants (straight/corner/junction) depend on neighbors, so
  // this needs a second pass once every building is in place.
  for(const b of state.buildings) if(b.type==='wall') refreshWallSprite(b);

  // ---- units ----
  const CREATORS = { villager: createVillager, archer: createArcher, swordsman: createSwordsman, captain: createCaptain, repairman: createRepairman };
  for(const su of snapshot.units){
    const create = CREATORS[su.type];
    if(!create){ console.error('Skipping unknown unit type on restore:', su.type); continue; }
    const u = create(su.gx, su.gy);
    Object.assign(u, su);
    // don't try to resume a mid-stride walk or a mid-trip gather cycle —
    // snap to standing still at the saved tile; the normal per-tick logic
    // (job assignment kept via assignedBuildingId) resumes work within a
    // second or two on its own.
    u.tx = u.gx; u.ty = u.gy; u.moving = false; u.buildTaskId = null; u.path = null;
    u.buryCorpseId = null; u.raiseCorpseId = null; // mid-walk corpse errands don't survive a reload — re-order them
    if(su.type==='villager'){ u.gatherWorking = false; u.gatherPhase = null; u.gatherTarget = null; u.carrying = null; u.harvestMs = 0; }
    positionUnitVisuals(u, u.gx*TILE+TILE/2, u.gy*TILE+TILE/2);
    if(u.baseTint && u.sprite && u.sprite.setTint) u.sprite.setTint(u.baseTint);
    setUnitHidden(u, !!(u.inTC || u.inTowerId)); // tower garrisons stay tucked inside across a save/load
    restoreHpBar(u, TILE-10);
  }
  syncPopulationCount();
  state.population.cap = snapshot.populationCap; // set LAST — createBuilding() bumps this as a side effect while buildings are recreated above

  // ---- enemies (raiders + bandit camps alike) ----
  state.enemyProjectiles = []; // in-flight shots are transient — not saved
  for(const se of snapshot.enemies){
    if(se.kind==='camp'){ restoreCamp(se); continue; }
    spawnEnemy(se.maxHp, se.dmg, snapshot.wave, se.kind, {gx: se.gx, gy: se.gy}, {race: se.race, ranged: se.ranged});
    const e = state.enemies[state.enemies.length-1];
    // spawnEnemy re-derives hp/dmg from the race multipliers, but the saved
    // values are authoritative — stamp them back so nothing double-scales
    e.hp = se.hp; e.maxHp = se.maxHp; e.dmg = se.dmg;
    restoreHpBar(e, TILE-8);
  }

  // any foundation that was mid-walk-to (buildTaskId reset above) or any
  // building short a worker needs a fresh dispatch pass now that the world
  // is actually rebuilt.
  autoAssignIdleVillagers();

  updateHUD();
  buildBuildBar();
  refreshBuildBar();
}
