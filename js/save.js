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

// Bump when a change makes older saves unloadable rather than merely
// out-of-date. Additive fields (a new building property, say) do NOT need a
// bump — restore overlays them onto freshly created objects, so anything
// missing keeps its default.
const SAVE_VERSION = 3;   // v3: bone resource + bone piles in the terrain grid

// A save is only offered if it can actually be restored, so the "Continue
// Your Game" button can't appear for one this build would choke on.
function hasSavedGame(){
  return loadSavedGame() !== null;
}

function clearSavedGame(){
  try { localStorage.removeItem(SAVE_KEY); } catch(err){ /* ignore */ }
}

function loadSavedGame(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const snap = JSON.parse(raw);
    // version has been WRITTEN into every save since the beginning but never
    // READ, so nothing stopped a save from an incompatible build being
    // restored onto a mismatched world.
    // Explicit undefined/null test, NOT `snap.version || 1` — version 0 is
    // falsy, so that form quietly reads a v0 save as "legacy, assume 1" and
    // waves it straight through the check meant to stop it.
    const ver = (snap.version === undefined || snap.version === null) ? 1 : snap.version;
    if(ver !== SAVE_VERSION){
      console.warn(`Save is version ${snap.version}, this build reads ${SAVE_VERSION} — discarding.`);
      clearSavedGame();
      return null;
    }
    // Belt and braces on the dimension that actually corrupts: the grid is
    // stored as raw [y][x] arrays, so restoring a 44-wide save into a wider
    // world leaves every tile past column 44 undefined — a silently broken
    // map rather than an honest "this save is too old". Checked explicitly
    // instead of relying on remembering to bump the version.
    if(snap.mapW !== undefined && (snap.mapW !== MAP_W || snap.mapH !== MAP_H)){
      console.warn(`Save is ${snap.mapW}x${snap.mapH}, this build is ${MAP_W}x${MAP_H} — discarding.`);
      clearSavedGame();
      return null;
    }
    return snap;
  } catch(err){
    console.error('Save data unreadable, discarding:', err);
    clearSavedGame();
    return null;
  }
}

function serializeGame(){
  return {
    version: SAVE_VERSION,
    mapW: MAP_W, mapH: MAP_H,   // validated on load — see loadSavedGame
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
    corridorOpen: state.corridorOpen,
    aiTownSpawned: state.aiTownSpawned,
    aiTownCenter: state.aiTownCenter,
    ai: state.ai,   // their stockpile, build index and training timer
    controlGroups: state.controlGroups,   // ids, so they survive a reload
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
    .setTint(factionDef().campTint);
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
  // MUST be set before drawMap(), which paints the unexplored veil over
  // everything past your band when the corridor is shut. Restored later, a
  // save taken AFTER the pass opened would be veiled again on load with
  // nothing left to lift it.
  state.corridorOpen = !!snapshot.corridorOpen;
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
        spr.setTint(factionDef().roadTintKey==='swarm' ? SWARM.creep.roadTint : (BUILD_DEFS.road.tint || 0xe0c898));
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
  // must be restored or checkAiDefeated would declare victory on load, when
  // aiTownHall() is momentarily null before the buildings are rebuilt
  state.aiTownSpawned = !!snapshot.aiTownSpawned;
  state.aiTownCenter = snapshot.aiTownCenter || null;
  state.controlGroups = snapshot.controlGroups || {};
  // Rebuild the economy from the snapshot, or from scratch for a save taken
  // before it existed — a null state.ai would make aiThink() a no-op and
  // leave the enemy frozen for the rest of the run.
  if(typeof initAiEconomy === 'function') initAiEconomy();
  if(snapshot.ai && state.ai) Object.assign(state.ai, snapshot.ai);
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
    // The enemy town's types live in AI_BUILD_DEFS, not BUILD_DEFS — looked
    // up first, and BEFORE the isCore branch, because THEIR core is isCore
    // too and would otherwise be rebuilt as a second copy of your own Town
    // Hall. Ownership decides which roster to read.
    const aiOwned = sb.owner === OWNER_AI;
    const override = aiOwned
      ? Object.assign({}, aiDef(sb.aiType || sb.type), {hp: sb.maxHp})
      : (sb.isCore
        // off the faction table, same as world creation — hardcoding the two
        // known cores here would reload a tribe save as a human town
        ? {name: factionDef().coreName, hp: sb.maxHp, frame: factionDef().coreFrame, size: sb.size||2}
        : Object.assign({}, BUILD_DEFS[sb.type], {hp: sb.maxHp}));
    if(!override || !override.frame){ console.error('Skipping unknown building type on restore:', sb.type); continue; }
    const b = createBuilding(sb.type, sb.gx, sb.gy, override, sb.owner || OWNER_PLAYER);
    Object.assign(b, sb); // overlay every saved field (sprite/hpBar refs are absent from sb, so the live ones survive)
    if(b.sprite && b.sprite.setAlpha) b.sprite.setAlpha(underConstruction(b) ? (b.awaitingBuilder ? 0.3 : 0.55) : 1);
    refreshEvolution(b);
    restoreHpBar(b, (b.size||1)*TILE-6);
  }
  // wall sprite variants (straight/corner/junction) depend on neighbors, so
  // this needs a second pass once every building is in place.
  for(const b of state.buildings) if(b.type==='wall') refreshWallSprite(b);

  // ---- units ----
  const CREATORS = { villager: createVillager, archer: createArcher, swordsman: createSwordsman, captain: createCaptain, repairman: createRepairman, flesh_golem: createFleshGolem, forester: createForester };
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
    u.dragCorpseId = null; u.carryingCorpse = false;  // ...same for a haul; the pit's banked COUNT persists on the building
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
    // AI workers have their own creation path — spawnEnemy knows nothing of
    // the kind and would rebuild each one as a raider, complete with a
    // raider sprite and a march order toward your Town Hall
    if(se.kind==='ai_worker'){
      const w = spawnAiWorker(se.gx, se.gy);
      if(w){
        w.gx = se.gx; w.gy = se.gy;
        w.hp = se.hp; w.maxHp = se.maxHp;
        w.job = se.job || null; w.carrying = se.carrying || 0; w.harvestMs = se.harvestMs || 0;
        restoreHpBar(w, TILE-8);
      }
      continue;
    }
    spawnEnemy(se.maxHp, se.dmg, snapshot.wave, se.kind, {gx: se.gx, gy: se.gy}, {race: se.race, ranged: se.ranged});
    const e = state.enemies[state.enemies.length-1];
    // spawnEnemy re-derives hp/dmg from the race multipliers, but the saved
    // values are authoritative — stamp them back so nothing double-scales
    e.hp = se.hp; e.maxHp = se.maxHp; e.dmg = se.dmg;
    // the town's standing defenders must stay defenders — without this they
    // reload as ordinary raiders and march across the map at you
    if(se.homeGuard){ e.homeGuard = true; e.homeGx = se.homeGx; e.homeGy = se.homeGy; }
    // war roles must survive a reload, or a party mid-march reloads as an
    // ordinary raider and a mustering soldier is forgotten entirely
    if(se.mustering) e.mustering = true;
    if(se.aiAttacker){
      e.aiAttacker = true;
      e.partyId = se.partyId; e.partyGx = se.partyGx; e.partyGy = se.partyGy;
    }
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
