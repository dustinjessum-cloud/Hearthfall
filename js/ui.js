// ---------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------
function drawIconCanvas(canvasEl, frameIdx){
  const img = SPRITESHEET_IMG;
  const ctx = canvasEl.getContext('2d');
  canvasEl.width = 32; canvasEl.height = 32;
  ctx.imageSmoothingEnabled = false;
  const col = frameIdx % 6, row = Math.floor(frameIdx/6);
  ctx.drawImage(img, col*32, row*32, 32, 32, 0, 0, 32, 32);
}

let SPRITESHEET_IMG = null;
function loadIconImage(cb){
  const img = new Image();
  img.onload = ()=>{ SPRITESHEET_IMG = img; cb(); };
  img.onerror = ()=>{ console.error('Could not decode embedded spritesheet for HUD icons.'); };
  img.src = SPRITESHEET_B64;
}

function applyRateTooltip(elId, key){
  const el = document.getElementById(elId);
  if(!el || !el.dataset) return;
  if(!el.dataset.baseTitle) el.dataset.baseTitle = el.title || '';
  const r = state.resourceRates && state.resourceRates[key];
  if(r === undefined || r === null){ el.title = el.dataset.baseTitle; return; }
  const rounded = Math.round(r*10)/10;
  const sign = rounded > 0 ? '+' : '';
  el.title = el.dataset.baseTitle + `\n\u25B8 Net flow: ${sign}${rounded}/min`;
}

function updateHUD(){
  applyRateTooltip('resFood','food');
  applyRateTooltip('resWheat','wheat');
  applyRateTooltip('resFlour','flour');
  applyRateTooltip('resWood','wood');
  applyRateTooltip('resStone','stone');
  applyRateTooltip('resGold','gold');
  document.querySelector('#resFood span').textContent = `${Math.floor(state.resources.food)}/${storageCapFor('food')}`;
  const wheatEl = document.querySelector('#resWheat span');
  if(wheatEl) wheatEl.textContent = `${Math.floor(state.resources.wheat)}/${storageCapFor('wheat')}`;
  const flourEl = document.querySelector('#resFlour span');
  if(flourEl) flourEl.textContent = `${Math.floor(state.resources.flour)}/${storageCapFor('flour')}`;
  document.querySelector('#resWood span').textContent = `${Math.floor(state.resources.wood)}/${storageCapFor('wood')}`;
  document.querySelector('#resStone span').textContent = `${Math.floor(state.resources.stone)}/${storageCapFor('stone')}`;
  const boneEl = document.querySelector('#resBone span');
  if(boneEl) boneEl.textContent = `${Math.floor(state.resources.bone||0)}/${storageCapFor('bone')}`;
  const wildstoneEl = document.querySelector('#resWildstone span');
  if(wildstoneEl) wildstoneEl.textContent = `${Math.floor(state.resources.wildstone)}/${storageCapFor('wildstone')}`;
  const goldEl = document.querySelector('#resGold span');
  if(goldEl) goldEl.textContent = Math.floor(state.resources.gold);
  const happyEl = document.querySelector('#resHappy span:last-child');
  if(happyEl) happyEl.textContent = `${Math.round(state.happiness)}%`;
  const face = document.getElementById('happyFace');
  if(face) face.style.color = state.happiness>=80 ? '#6bbf59' : (state.happiness>=50 ? '#ffd76b' : '#ff8a6b');
  document.querySelector('#resPop span').textContent = `${state.population.current} / ${state.population.cap}`;
  document.getElementById('resFood').classList.toggle('warn', state.resources.food < 10 || state.starving);

  const soldierCount = mySoldiers().length;
  const workerCount = state.units.filter(u=>u.type==='villager' && u.hp>0).length;
  document.querySelector('#resWorkers span').textContent = workerCount;
  document.querySelector('#resSoldiers span').textContent = soldierCount;

  refreshBuildBar();
  refreshHud2Buttons();
  refreshIdleBox();
  updateTowerGarrisonMarkers();
}

// ---- minimap --------------------------------------------------------
// Drawn to a canvas rather than built from Phaser objects: it repaints every
// few frames and a per-tile sprite layer for 4,544 tiles would be a second
// copy of the whole map. Terrain is painted once into an offscreen buffer
// and only redrawn when the world actually changes (the corridor opening);
// the per-frame pass just blits that and stamps the moving pieces on top.
const MINIMAP = {
  px: 2,                       // screen pixels per tile
  colors: {
    grass:'#56a03d', forest:'#2f6b28', stone_deposit:'#8a8a92', water:'#2f5d8a',
    dirt:'#6b543a', wildstone_deposit:'#c98ad6', sealed_pass:'#3b414d',
    creep:'#6b5d7a', forest_corrupted:'#4a5b3a', stone_deposit_corrupted:'#5f5a6b',
    wildstone_deposit_corrupted:'#8a6a96',
  },
  fallback:'#56a03d',
};
let _miniTerrain = null;       // offscreen buffer, repainted only on change
let _miniDirty = true;

function minimapCanvas(){ return document.getElementById('minimap'); }
function markMinimapDirty(){ _miniDirty = true; }

function paintMinimapTerrain(){
  const px = MINIMAP.px;
  if(!_miniTerrain){
    _miniTerrain = document.createElement('canvas');
    _miniTerrain.width = MAP_W*px; _miniTerrain.height = MAP_H*px;
  }
  const g = _miniTerrain.getContext('2d');
  g.fillStyle = MINIMAP.fallback;
  g.fillRect(0,0,_miniTerrain.width,_miniTerrain.height);
  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      const t = state.grid[y] && state.grid[y][x];
      const c = MINIMAP.colors[t];
      if(!c) continue;
      g.fillStyle = c;
      g.fillRect(x*px, y*px, px, px);
    }
  }
  _miniDirty = false;
}

function updateMinimap(){
  const cv = minimapCanvas();
  const wrap = document.getElementById('minimapWrap');
  if(!cv || !wrap || !state.grid.length) return;
  const px = MINIMAP.px;
  if(cv.width !== MAP_W*px){ cv.width = MAP_W*px; cv.height = MAP_H*px; }
  if(_miniDirty || !_miniTerrain) paintMinimapTerrain();

  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(_miniTerrain, 0, 0);

  // everything past your own band stays blacked out until the pass opens
  if(!state.corridorOpen){
    g.fillStyle = 'rgba(8,10,16,.93)';
    g.fillRect(ZONES.passWest.x0*px, 0, (MAP_W-ZONES.passWest.x0)*px, MAP_H*px);
  }

  const dot = (gx, gy, color, size)=>{
    g.fillStyle = color;
    g.fillRect(Math.round(gx*px)-((size-px)/2), Math.round(gy*px)-((size-px)/2), size, size);
  };
  for(const b of state.buildings){
    if(b.hp<=0) continue;
    if(!state.corridorOpen && b.gx >= ZONES.passWest.x0) continue;
    dot(b.gx, b.gy, isMine(b) ? '#ffd76b' : '#ff6b5a', Math.max(px, (b.size||1)*px));
  }
  for(const u of state.units){
    if(u.hp<=0 || u.inTC || u.inTowerId) continue;
    dot(u.gx, u.gy, '#e8f0ff', px);
  }
  for(const e of state.enemies){
    if(e.hp<=0) continue;
    if(!state.corridorOpen && e.gx >= ZONES.passWest.x0) continue;
    dot(e.gx, e.gy, e.kind==='camp' ? '#c2410c' : '#ff3b30', px);
  }

  // viewport box
  if(scene && scene.cameras && scene.cameras.main){
    const cam = scene.cameras.main;
    g.strokeStyle = '#ffffff'; g.lineWidth = 1;
    g.strokeRect(
      Math.round(cam.worldView.x/TILE*px)+0.5, Math.round(cam.worldView.y/TILE*px)+0.5,
      Math.round(cam.worldView.width/TILE*px), Math.round(cam.worldView.height/TILE*px)
    );
  }
}

function bindMinimap(){
  const wrap = document.getElementById('minimapWrap');
  const cv = minimapCanvas();
  if(!wrap || !cv || wrap._bound) return;
  wrap._bound = true;
  const jump = (ev)=>{
    const r = cv.getBoundingClientRect();
    const gx = (ev.clientX - r.left) / (r.width  / MAP_W);
    const gy = (ev.clientY - r.top)  / (r.height / MAP_H);
    if(scene && scene.cameras && scene.cameras.main) scene.cameras.main.centerOn(gx*TILE, gy*TILE);
    ev.preventDefault(); ev.stopPropagation();
  };
  cv.addEventListener('mousedown', jump);
  cv.addEventListener('contextmenu', e=>e.preventDefault());
}

// ---- idle workers ---------------------------------------------------
// "Idle" means holding no job at all: not assigned to a resource building,
// not on a build task, not repairing, not burying or raising a corpse, not
// tucked inside the Town Hall or up a tower, and not walking somewhere you
// sent them. A villager walking to a destination still has an order, so it
// is not idle — it becomes idle the moment it arrives with nothing to do.
function idleWorkers(){
  if(typeof state === 'undefined' || !state || !state.units) return [];
  return state.units.filter(u =>
    u.type === 'villager' && u.hp > 0 &&
    !u.assignedBuildingId && !u.buildTaskId && !u.repairTargetId &&
    !u.buryCorpseId && !u.raiseCorpseId &&
    !u.inTC && !u.enteringTC && !u.inTowerId && !u.garrisonId &&
    !u.moving && !(u.orderQueue && u.orderQueue.length)
  );
}

let _idleCycle = 0;
let _idleIconFrame = null;

function refreshIdleBox(){
  const box = document.getElementById('idleBox');
  if(!box) return;
  const list = idleWorkers();
  // Dimmed at zero rather than hidden. Hiding it collapsed the slot and
  // shifted every other control in the bar each time the last villager
  // picked up a job.
  box.classList.toggle('hasIdle', list.length > 0);
  box.classList.toggle('noIdle',  list.length === 0);
  if(!list.length){
    _idleCycle = 0;
    document.getElementById('idleCount').textContent = '0';
    document.getElementById('idleLabel').textContent = 'idle';
    box.title = 'No idle villagers — everyone is working';
    const f0 = unitFrame('villager');
    if(_idleIconFrame !== f0 && SPRITESHEET_IMG){
      drawIconCanvas(document.getElementById('idleIcon'), f0);
      _idleIconFrame = f0;
    }
    return;
  }

  const noun = factionWord('worker');
  const word = list.length === 1 ? noun : noun + 's';
  document.getElementById('idleCount').textContent = list.length;
  document.getElementById('idleLabel').textContent = 'idle';
  box.title = `${list.length} idle ${word}\n▸ Click: jump to the next one`
            + `\n▸ Ctrl+click: select all ${list.length}`;

  // the icon can only be drawn once the faction is known, so it is drawn
  // lazily on first show rather than at boot with the other HUD icons
  const frame = unitFrame('villager');
  if(_idleIconFrame !== frame && SPRITESHEET_IMG){
    drawIconCanvas(document.getElementById('idleIcon'), frame);
    _idleIconFrame = frame;
  }
}

function panCameraTo(gx, gy){
  if(typeof scene !== 'undefined' && scene && scene.cameras && scene.cameras.main && scene.cameras.main.pan)
    scene.cameras.main.pan(gx*TILE + TILE/2, gy*TILE + TILE/2, 300, 'Sine.easeInOut');
}

// click cycles one at a time (so you can hand out jobs individually),
// ctrl+click grabs the whole unemployed crowd at once
function selectIdleWorkers(all){
  const list = idleWorkers();
  if(!list.length) return;
  if(all){
    setGroupSelection(list.slice());
    const cx = list.reduce((s,u)=>s+u.gx, 0) / list.length;
    const cy = list.reduce((s,u)=>s+u.gy, 0) / list.length;
    panCameraTo(cx, cy);
    return;
  }
  if(_idleCycle >= list.length) _idleCycle = 0;
  const u = list[_idleCycle];
  _idleCycle = (_idleCycle + 1) % list.length;
  clearGroupSelection();
  selectEntity('unit', u);
  panCameraTo(u.gx, u.gy);
}

function refreshHud2Buttons(){
  const raidBtn = document.getElementById('raidBtn');
  const recallBtn = document.getElementById('recallBtn');
  if(raidBtn) raidBtn.disabled = isRaidActive();
  if(recallBtn){
    const sheltering = typeof anyWorkersSheltering==='function' && anyWorkersSheltering();
    recallBtn.classList.toggle('toggled-on', sheltering);
    recallBtn.textContent = sheltering ? 'Release Workers' : 'Recall Workers';
  }
  const ringBtn = document.getElementById('ringBtn');
  if(ringBtn){
    const on = rangeRingsOn();
    ringBtn.classList.toggle('toggled-on', on);
    ringBtn.textContent = on ? 'Rings: On' : 'Rings: Off';
  }
  const recBtn = document.getElementById('recBtn');
  if(recBtn){
    const on = !!(state.session && state.session.recording);
    recBtn.classList.toggle('live', on);
    recBtn.classList.toggle('paused', !on);
    // Say ON/OFF in words. A dot vs a pause glyph reads as decoration at a
    // glance, and this button decides whether a whole session is captured —
    // guessing wrong costs the run's data.
    recBtn.textContent = `${on ? '●' : '○'} REC ${on ? 'ON' : 'OFF'} · ${telemetryEventCount()}`;
    recBtn.title = on
      ? `Recording — ${telemetryEventCount()} events captured. Click to pause.`
      : `PAUSED — nothing is being captured. ${telemetryEventCount()} events so far. Click to resume.`;
  }
  const sbBtn = document.getElementById('sandboxBtn');
  if(sbBtn){
    sbBtn.classList.toggle('toggled-on', sandboxOn());
    sbBtn.textContent = sandboxOn() ? 'Sandbox: On' : 'Sandbox: Off';
  }
  const skBtn = document.getElementById('skipBtn');
  if(skBtn){
    skBtn.disabled = !!state.corridorOpen;
    skBtn.textContent = state.corridorOpen ? 'Pass Open' : 'Skip to Corridor';
  }
}

function callRaidNow(){
  if(isRaidActive() || state.gameOver) return;
  // Reuse the exact same trigger path the timer uses (see update()), just
  // fast-forward the clock, so there's only one code path for "a wave starts".
  state.nextWaveInMs = Math.min(state.nextWaveInMs, 50);
}

function toggleRecall(){ toggleRecallGarrison(); }

// ---- rally points ----
// Unit-producing buildings (TC, Barracks, Mason) can be given a rally
// point: select the building, right-click the map, and every unit that
// finishes there marches straight to the flag.
function canRally(b){ return !!(b && (b.isCore || b.type==='barracks' || b.type==='mason')); }

function setRallyPoint(b, gx, gy){
  if(!inBounds(gx, gy) || isImpassableTile(tileAt(gx, gy))) return false;
  // right-clicking the building itself clears its rally
  const size = b.size || 1;
  if(gx>=b.gx && gx<b.gx+size && gy>=b.gy && gy<b.gy+size){
    clearRallyPoint(b);
    flashWaveBanner('Rally point cleared.');
    return true;
  }
  clearRallyPoint(b);
  b.rallyPoint = {gx, gy};
  if(scene && scene.add){
    b.rallyMarker = scene.add.image(gx*TILE+TILE/2, gy*TILE+TILE/2, 'tiles', FRAME.rally_flag).setDepth(7);
  }
  refreshRallyMarkers();
  flashWaveBanner(`Rally point set for the ${b.isCore ? 'Town Hall' : BUILD_DEFS[b.type].name}.`);
  return true;
}

function clearRallyPoint(b){
  if(b.rallyMarker){ b.rallyMarker.destroy(); b.rallyMarker = null; }
  b.rallyPoint = null;
}

// flags are private: you only see a building's rally flag while that
// building is selected
function refreshRallyMarkers(){
  for(const b of myBuildings()){
    if(!b.rallyMarker) continue;
    const shown = !!(state.selected && state.selected.type==='building' && state.selected.ref===b);
    b.rallyMarker.setVisible(shown);
  }
}

// Live combat stats for a selected unit. Reads the shared ATTACK constants
// rather than a copy, so permanent evolutions (Veteran Training / Masterwork
// Bows, which mutate those constants) show up here automatically, and the
// Minotaur's banner bonus appears the moment the unit steps into his radius.
// Returns null for non-combatants (villagers, repairmen).
function unitAttack(u){
  const def = unitDef(u);
  const atk = def && def.attack;
  if(!atk) return null;
  // non-soldiers (villagers) get no banner buff, and the panel says so
  const isSoldier = isSoldierType(u);
  const cap = livingCaptain();
  const inAura = !!(isSoldier && cap && cap !== u &&
    Phaser.Math.Distance.Between(cap.gx, cap.gy, u.gx, u.gy) <= CAPTAIN.auraRange);
  // same helper the combat path uses, so a War Cry actually shows up here
  const fury = (typeof heroFuryMult === 'function') ? heroFuryMult() : 1;
  const dmg = inAura ? Math.round(atk.damage * CAPTAIN.auraMult * fury) : atk.damage;
  const secs = atk.cooldownMs / 1000;
  return {
    dmg, base: atk.damage, inAura, range: atk.range,
    secs: secs.toFixed(1), dps: (dmg / secs).toFixed(1),
    inTower: !!u.inTowerId, selfDefence: !isSoldier,
  };
}

// What a selected unit is actually doing right now. Soldiers previously said
// nothing, so there was no way to tell "holding the line" from "hasn't
// noticed the enemy yet" — the states already exist, they just weren't shown.
function unitActivity(u){
  if(u.inTC) return 'Sheltering in the Town Hall';
  if(u.inTowerId) return 'Garrisoned in a tower';
  if(u.buryCorpseId) return 'Going to bury the fallen';
  if(u.raiseCorpseId) return 'Going to raise the fallen';
  if(u.buildTaskId) return 'Heading to a build site';
  if(u.repairTargetId) return 'On a repair order';
  if(u.garrisonId) return 'Climbing to a tower';
  if(u.moving) return u.playerOrder ? 'Moving on your order' : 'Moving';
  if(u.type==='swordsman' && state.enemies.some(e=> e.hp>0 &&
      Phaser.Math.Distance.Between(e.gx, e.gy, u.gx, u.gy) <= SWORDSMAN_AGGRO)) return 'Engaging';
  return 'Holding position';
}

// What this unit costs to keep, per minute (economy ticks are 3s => x20).
function unitUpkeepPerMin(u){
  return unitUpkeepPerTick(u) * 20 * factionDef().foodUpkeepMult;
}
function foodWord(){ return factionWord('food'); }

// Range + aura rings drawn on the map for the current selection. Numbers tell
// you an archer has 3.5 range; a ring tells you whether that wall is actually
// covered. Rebuilt lazily and just toggled/moved after that, so this is cheap
// enough to run every frame (it has to — the rings follow moving units).
// Range rings are a display preference, not part of the run, so they live in
// their own localStorage key rather than the save — turning them off should
// stick across games instead of resetting with every new town.
const RING_PREF_KEY = 'hearthfall_range_rings';
function rangeRingsOn(){
  if(state._rangeRingsOn === undefined){
    let saved = null;
    try { saved = localStorage.getItem(RING_PREF_KEY); } catch(err){ /* private mode */ }
    state._rangeRingsOn = (saved === null) ? true : (saved === '1');
  }
  return state._rangeRingsOn;
}
function toggleRangeRings(){
  state._rangeRingsOn = !rangeRingsOn();
  try { localStorage.setItem(RING_PREF_KEY, state._rangeRingsOn ? '1' : '0'); } catch(err){ /* ignore */ }
  updateSelectionRings();   // apply immediately rather than on the next selection
  refreshHud2Buttons();
}

// ---- testing tools ---------------------------------------------------
// Both of these exist to reach the endgame without playing 25 minutes of
// raids first. Neither is part of normal play; they're styled apart in the
// HUD so they can't be mistaken for it.

// "Free build" is implemented as INFINITE RESOURCES, not as zero cost.
// Costs are checked and deducted in fifteen separate places across four
// files; special-casing each one is how you end up with a mode that's free
// for buildings but not for upgrades, or free for archers but not for
// repairmen. Topping the stockpile back to its cap every tick makes every
// affordability check pass and every deduction refill itself, with exactly
// one place to get wrong.
//
// Population cap is deliberately NOT touched — build houses for free and it
// rises through the normal path, so nothing about the accounting diverges
// from a real game.
const SANDBOX_KEYS = ['food','wheat','flour','wood','stone','gold','wildstone'];
function sandboxOn(){ return !!state.sandbox; }
function toggleSandbox(){
  state.sandbox = !state.sandbox;
  if(state.sandbox) sandboxTopUp();
  refreshHud2Buttons();
  updateHUD();
  flashWaveBanner(state.sandbox
    ? 'Sandbox ON — resources stay full. Testing only.'
    : 'Sandbox OFF — resources spend normally again.');
}
function sandboxTopUp(){
  if(!state.sandbox) return;
  for(const k of SANDBOX_KEYS){
    if(state.resources[k] === undefined) continue;
    const cap = storageCapFor(k);
    if(state.resources[k] < cap) state.resources[k] = cap;
  }
  state.starving = false;   // a full larder can't be starving
}

// Jump to the endgame. Marks the raids survived, clears anything still
// fighting (so the corridor gate is satisfied honestly rather than bypassed),
// then opens the pass through the normal reveal so the veil, tiles, camera
// and banner all behave exactly as they would in a real run.
function skipToCorridor(){
  if(state.gameOver) return;
  if(state.corridorOpen){ flashWaveBanner('The pass is already open.'); return; }
  state.wave = Math.max(state.wave, RAIDS_BEFORE_CORRIDOR);
  state.nextWaveInMs = 0;
  // wipe live raiders only — bandit camps, the enemy town's garrison and its
  // workers are not part of "the raids" and must survive this
  let cleared = 0;
  for(const e of state.enemies){
    if(e.hp > 0 && e.kind !== 'camp' && e.kind !== 'ai_worker' && !e.homeGuard){ e.hp = 0; cleared++; }
  }
  if(scene && scene.revealCorridor) scene.revealCorridor();
  refreshHud2Buttons();
  updateHUD();
  if(cleared) console.log(`skipToCorridor: cleared ${cleared} raider(s)`);
}

function updateSelectionRings(){
  if(!scene || !scene.add) return;
  // Hidden: drop both circles and stop. The rings are created lazily, so when
  // they have never been shown there is nothing to hide yet.
  if(!rangeRingsOn()){
    if(scene._rangeRing) scene._rangeRing.setVisible(false);
    if(scene._auraRing) scene._auraRing.setVisible(false);
    return;
  }
  const sel = state.selected;
  const u = (sel && sel.type==='unit') ? sel.ref : null;
  const b = (sel && sel.type==='building') ? sel.ref : null;

  let r = 0, rx = 0, ry = 0;
  if(u && u.hp > 0){
    const a = unitAttack(u);
    if(a && !a.inTower){ r = a.range; rx = u.gx; ry = u.gy; }
  } else if(b && b.hp > 0 && !underConstruction(b)){
    const def = BUILD_DEFS[b.type];
    // towerAttackRange, not def.attack.range — the ring has to show the range
    // the tower ACTUALLY fires at, garrison bonus included, or the indicator
    // contradicts the thing it is indicating
    if(def && def.attack){ r = towerAttackRange(b); rx = b.gx; ry = b.gy; }
  }
  if(r > 0){
    if(!scene._rangeRing){
      scene._rangeRing = scene.add.circle(0, 0, 10, 0xffe08a, 0)
        .setStrokeStyle(1, 0xffe08a, 0.55).setDepth(1);
    }
    scene._rangeRing.setVisible(true).setRadius(r * TILE)
      .setPosition(rx*TILE + TILE/2, ry*TILE + TILE/2);
  } else if(scene._rangeRing){
    scene._rangeRing.setVisible(false);
  }

  // the Minotaur's banner — who is actually inside the +25%
  const heroSel = u && u.type==='captain' && u.hp > 0;
  if(heroSel){
    if(!scene._auraRing){
      scene._auraRing = scene.add.circle(0, 0, 10, 0xffd76b, 0.07)
        .setStrokeStyle(1, 0xffd76b, 0.45).setDepth(1);
    }
    scene._auraRing.setVisible(true).setRadius(CAPTAIN.auraRange * TILE)
      .setPosition(u.gx*TILE + TILE/2, u.gy*TILE + TILE/2);
  } else if(scene._auraRing){
    scene._auraRing.setVisible(false);
  }
}

// A crosshair that blinks out at the tile you just ordered a unit to —
// confirmation that the click registered and where they're headed. Purely
// cosmetic and self-destructing: nothing holds a reference, and it tears
// itself down on completion, so it can't leak or outlive the order.
const MOVE_MARK = { ms: 420, color: 0xe2e8f0, arm: 6, gap: 3, thick: 2 };
function spawnMoveMarker(gx, gy){
  if(!scene || !scene.add || !scene.tweens) return;
  const A = MOVE_MARK.arm, G = MOVE_MARK.gap, T = MOVE_MARK.thick, C = MOVE_MARK.color;
  const g = scene.add.container(gx*TILE + TILE/2, gy*TILE + TILE/2).setDepth(9);
  g.add([
    scene.add.rectangle(0, -(G + A/2), T, A, C),   // up
    scene.add.rectangle(0,  (G + A/2), T, A, C),   // down
    scene.add.rectangle(-(G + A/2), 0, A, T, C),   // left
    scene.add.rectangle( (G + A/2), 0, A, T, C),   // right
  ]);
  g.setScale(1.4);
  scene.tweens.add({
    targets: g, scaleX: 0.8, scaleY: 0.8, alpha: 0,
    duration: MOVE_MARK.ms, ease: 'Quad.easeOut',
    onComplete: ()=> g.destroy(),
  });
}

// Where a queued order's destination actually is, for drawing its marker.
// null means "nothing to draw there" (a stale build/repair/garrison target
// that's since vanished) — executeOrder() re-validates independently when
// the order actually fires, this is purely cosmetic.
function orderPosition(order){
  if(order.kind==='move') return {gx: order.gx, gy: order.gy};
  if(order.kind==='garrisonTC'){ const th = townHall(); return th ? {gx: th.gx, gy: th.gy} : null; }
  if(order.corpseId!=null){ const c = corpseById(order.corpseId); return c ? {gx: c.gx, gy: c.gy} : null; }
  const b = order.buildingId!=null ? buildingById(order.buildingId) : null;
  return b ? {gx: b.gx, gy: b.gy} : null;
}

// Small numbered markers at each of a unit's queued destinations. Like
// rally flags, the markers themselves persist on the unit (rebuilt
// whenever the queue changes) but only ever SHOW while that unit is
// selected — updateQueueMarkerVisibility() toggles that.
function refreshQueueMarkers(u){
  if(u.queueMarkers) for(const m of u.queueMarkers) m.destroy();
  u.queueMarkers = [];
  if(!scene || !scene.add || !u.orderQueue) return;
  const shown = isUnitSelected(u);
  u.orderQueue.forEach((order, i)=>{
    const pos = orderPosition(order);
    if(!pos) return;
    const cx = pos.gx*TILE+TILE/2, cy = pos.gy*TILE+TILE/2;
    const dot = scene.add.circle(cx, cy, 7, 0xffe08a, 0.9).setStrokeStyle(1, 0x2a1c10, 1).setDepth(15).setVisible(shown);
    const label = scene.add.text(cx, cy, String(i+1), {fontSize:'10px', color:'#2a1c10', fontStyle:'bold'}).setOrigin(0.5).setDepth(16).setVisible(shown);
    u.queueMarkers.push(dot, label);
  });
}

function isUnitSelected(u){
  return !!((state.selected && state.selected.type==='unit' && state.selected.ref===u)
    || (state.selectedGroup && state.selectedGroup.includes(u)));
}

// only ever called for units that HAVE queue markers already built —
// selection changes just toggle visibility, they don't rebuild anything
function updateQueueMarkerVisibility(){
  for(const u of state.units){
    if(!u.queueMarkers || !u.queueMarkers.length) continue;
    const shown = isUnitSelected(u);
    for(const m of u.queueMarkers) m.setVisible(shown);
  }
}

function sendToRally(unit, b){
  if(!b || !b.rallyPoint || !unit) return;
  const spot = findFreeSpotNear(b.rallyPoint.gx, b.rallyPoint.gy, 3) || b.rallyPoint;
  unit.tx = spot.gx; unit.ty = spot.gy; unit.moving = true; unit.playerOrder = true;
}

// per-kind training time (villager speed scales with TC level)
function trainMsFor(kind, b){
  if(kind==='villager') return TC_LEVELS.trainMs[(b.level||1)-1] || VILLAGER_TRAIN_MS;
  if(kind==='archer') return ARCHER_TRAIN_MS;
  if(kind==='swordsman') return SWORDSMAN_TRAIN_MS;
  if(kind==='repairman') return REPAIRMAN.trainMs;
  return 20000;
}
// 1 in training + up to 2 waiting = a queue of three
function queueFull(b){ return !!(b.production && (b.queue||[]).length >= 2); }
function enqueueProduction(b, kind){
  if(!b.production){
    const ms = trainMsFor(kind, b);
    b.production = { type: kind, remainingMs: ms, totalMs: ms };
  } else {
    b.queue = b.queue || [];
    b.queue.push(kind);
  }
}

function togglePause(){
  if(state.gameOver) return;
  state.paused = !state.paused;
  const btn = document.getElementById('pauseBtn');
  if(btn){
    btn.classList.toggle('toggled-on', state.paused);
    btn.textContent = state.paused ? 'Resume' : 'Pause';
  }
  const el = document.getElementById('waveInfo');
  if(el && state.paused){ el.textContent = '\u23F8 PAUSED'; el.style.color = '#9fc4ff'; }
  else if(el){ el.style.color = '#ffd76b'; }
}

function fmtClock(ms){
  const totalSec = Math.max(0, Math.ceil(ms/1000));
  const m = Math.floor(totalSec/60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function updateWaveHUD(){
  const el = document.getElementById('waveInfo');
  // Once the raids are broken the countdown is a lie — it keeps ticking in
  // state but nothing spawns from it any more.
  if(state.wave >= RAIDS_BEFORE_CORRIDOR){
    if(state.corridorOpen){ el.textContent = 'The raids are broken — the pass lies open'; return; }
    // Say HOW MANY are left, and where. "Clear the last of them" on its own
    // is unfalsifiable: when it was wrongly counting the enemy town's
    // garrison there was no way to tell a real straggler from a bug.
    const left = state.enemies.filter(e =>
      e.hp > 0 && e.kind !== 'camp' && e.kind !== 'ai_worker' && !e.homeGuard);
    if(left.length === 0){ el.textContent = `Wave ${state.wave} survived — the pass is opening...`; return; }
    const n = left.length;
    el.textContent = `Wave ${state.wave} survived — ${n} raider${n===1?'':'s'} still afoot`;
    return;
  }
  if(state.wave===0 && state.nextWaveInMs>0){
    el.textContent = `Peace — first raid in ${fmtClock(state.nextWaveInMs)}`;
  } else {
    el.textContent = `Wave ${state.wave} survived — next raid in ${fmtClock(state.nextWaveInMs)}`;
  }
}

let bannerTimeout=null;
function flashWaveBanner(msg){
  const el = document.getElementById('waveInfo');
  el.textContent = applySkinText(msg);
  el.style.color = '#ff8a6b';
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(()=>{ el.style.color = '#ffd76b'; }, 2500);
}

// The build bar is split into category tabs so 17 buildings don't sprawl
// across the whole width — click a tab, see only that family.
let activeBuildCategory = 'economy';

function categoryOf(type){
  for(const c of BUILD_CATEGORIES) if(c.types.includes(type)) return c.key;
  return BUILD_CATEGORIES[0].key;
}

function showBuildCategory(key){
  activeBuildCategory = key;
  for(const c of BUILD_CATEGORIES){
    const tab = document.getElementById('tab_'+c.key);
    if(tab) tab.classList.toggle('activeTab', c.key===key);
    for(const t of c.types){
      const btn = document.getElementById('btn_'+t);
      if(btn) btn.style.display = (c.key===key) ? 'flex' : 'none';
    }
  }
}

function buildBuildBar(){
  const bar = document.getElementById('buildBar');
  bar.innerHTML = '';
  // tab row
  const tabRow = document.createElement('div');
  tabRow.id = 'buildTabs';
  for(const c of BUILD_CATEGORIES){
    const tab = document.createElement('button');
    tab.className = 'buildTab';
    tab.id = 'tab_'+c.key;
    tab.textContent = c.label;
    tab.addEventListener('click', ()=> showBuildCategory(c.key));
    tabRow.appendChild(tab);
  }
  bar.appendChild(tabRow);
  // building buttons (all created; tabs just show/hide them)
  const btnRow = document.createElement('div');
  btnRow.id = 'buildBtns';
  for(const key in BUILD_DEFS){
    // only offer what the current faction's build tabs actually contain
    if(!BUILD_CATEGORIES.some(c=>c.types.includes(key))) continue;
    const def = BUILD_DEFS[key];
    const btn = document.createElement('button');
    btn.className = 'buildBtn';
    btn.id = 'btn_'+key;
    const cv = document.createElement('canvas');
    btn.appendChild(cv);
    const label = document.createElement('div');
    label.textContent = def.name;
    btn.appendChild(label);
    const cost = document.createElement('div');
    cost.className = 'cost';
    cost.textContent = fmtCost(def.cost);
    btn.appendChild(cost);
    btn.addEventListener('click', ()=> toggleBuildMode(key));
    btnRow.appendChild(btn);
    drawIconCanvas(cv, FRAME[def.frame]);
  }
  bar.appendChild(btnRow);
  showBuildCategory(activeBuildCategory);
}

function toggleBuildMode(key){
  if(state.buildMode === key){
    scene.cancelBuildMode();
    return;
  }
  state.buildMode = key;
  refreshBuildBar();
}

function refreshBuildBar(){
  for(const key in BUILD_DEFS){
    const btn = document.getElementById('btn_'+key);
    if(!btn) continue;
    const def = BUILD_DEFS[key];
    const costEl = btn.querySelector('.cost');
    if(def.tcLevelReq && tcLevel() < def.tcLevelReq){
      btn.disabled = true;
      btn.classList.remove('active');
      if(costEl) costEl.textContent = `Requires TC Lv.${def.tcLevelReq}`;
      continue;
    }
    const cost = effectiveBuildCost(key);
    let affordable = true;
    for(const k in cost) if(state.resources[k] < cost[k]) affordable=false;
    btn.disabled = !affordable;
    btn.classList.toggle('active', state.buildMode===key);
    // keep cost labels live — the mason discount changes tower prices
    if(costEl) costEl.textContent = fmtCost(cost);
  }
}

// A readable name + one-line description for a selected enemy, by race/role.
function enemyName(e){
  if(e.kind==='camp') return factionDef().campName;
  if(e.kind==='ram') return 'Battering Ram';
  const race = e.race || 'human';
  if(race==='troll') return e.ranged ? 'Hobgoblin' : 'Troll';
  if(race==='undead') return e.ranged ? 'Plaguebearer' : 'Ghoul';
  if(e.ranged) return 'Enemy Archer';
  if(e.kind==='swordsman') return 'Enemy Swordsman';
  if(e.kind==='pillager') return 'Pillager';
  return 'Raider';
}
function enemyDesc(e){
  if(e.kind==='camp') return 'A fortified enemy outpost — raze it to stop its patrols and take its loot.';
  if(e.kind==='ram') return 'A siege engine — slow and tough, only interested in smashing buildings.';
  if(e.ranged) return 'Holds at range and looses at your exposed units and buildings.';
  if(e.kind==='pillager') return 'Ignores your Town Hall — hunts your farms, camps, mills and markets.';
  return 'Marches on your Town Hall.';
}

function selectEntity(type, ref){
  // restore the previously-selected unit/enemy's own tint (a swordsman's
  // blue, a pillager's orange) rather than just clearing it
  if(state.selected && (state.selected.type==='unit' || state.selected.type==='enemy') && state.selected.ref.sprite) {
    const prev = state.selected.ref;
    if(prev.baseTint != null) prev.sprite.setTint(prev.baseTint);
    else prev.sprite.clearTint();
  }
  state.selected = type ? {type, ref} : null;
  if((type==='unit' || type==='enemy') && ref.sprite) ref.sprite.setTint(0xffe08a);
  refreshRallyMarkers();
  updateQueueMarkerVisibility();
  refreshInfoPanel();
}

// IMPORTANT: this used to rebuild panel.innerHTML from scratch on every
// single call, and update() called it every animation frame (~60/sec)
// whenever something was selected. That destroyed and recreated the Train
// Archer <button> constantly, which is exactly the kind of DOM churn that
// makes real mouse clicks get lost mid-gesture (the element under your
// cursor at mouseup time may not be the element that existed at mousedown
// time). Now the panel's static structure is built ONCE per selection
// (tracked via panel._boundRef), and only the dynamic bits — hp text, hp
// bar width, button disabled state/cost — are updated in place every
// frame without ever removing the button from the DOM.
// The selection panel, split into three. It was one 493-line function —
// 6% of all logic — mixing markup construction with per-frame updates for
// buildings, units, enemies, groups and the empty state. The split preserves
// the property that matters: markup is built ONCE per selection (tracked by
// panel._boundRef) and only live values are touched each frame, so the DOM
// never churns under the cursor mid-click.
function refreshInfoPanel(){
  const panel = document.getElementById('infoPanel');
  if(!state.selected){ renderNoSelectionPanel(panel); return; }
  const {type, ref} = state.selected;
  if(panel._boundRef !== ref){
    panel._boundRef = ref;
    buildPanelMarkup(panel, type, ref);
  }
  updatePanelLive(type, ref);
}

// Nothing selected: a multi-unit group summary, or a placeholder. Never
// display:none — a panel that collapses reflows the whole bottom bar.
function renderNoSelectionPanel(panel){
    if(state.selectedGroup && state.selectedGroup.length > 1){
      if(panel._boundRef !== 'group'){
        panel._boundRef = 'group';
        panel.innerHTML = `<h3>Group</h3><div id="groupCount"></div>
          <div class="hpbar"><div class="hpfill" id="groupHpFill"></div></div>
          <div id="groupAtk" style="margin-top:4px;color:#e8dcc0;"></div>
          <div id="groupUpkeep" style="color:#d8c79a;"></div>
          <div style="margin-top:6px;color:#d8c79a;">Right-click a tile to move everyone there. Esc deselects.</div>`;
      }
      const gc = document.getElementById('groupCount');
      if(gc){
        // pooled totals — lets you size up an army at a glance instead of
        // clicking through it one unit at a time
        const alive = state.selectedGroup.filter(u=>u.hp>0);
        const hp = alive.reduce((s,u)=> s + Math.max(0, u.hp), 0);
        const maxHp = alive.reduce((s,u)=> s + u.maxHp, 0);
        const dmg = alive.reduce((s,u)=>{ const a = unitAttack(u); return s + (a ? a.dmg : 0); }, 0);
        const up = alive.reduce((s,u)=> s + unitUpkeepPerMin(u), 0);
        gc.textContent = `${alive.length} units — ${Math.round(hp)}/${maxHp} HP`;
        const fill = document.getElementById('groupHpFill');
        if(fill) fill.style.width = (maxHp ? Math.max(0, hp/maxHp)*100 : 0) + '%';
        const ae = document.getElementById('groupAtk');
        if(ae) ae.textContent = dmg > 0 ? `${dmg} dmg per volley` : 'No combat units';
        const ue = document.getElementById('groupUpkeep');
        if(ue) ue.textContent = `Eats ${Math.round(up)} ${foodWord()}/min`;
      }
      return;
    }
    // Placeholder rather than display:none. An empty panel that collapses
    // reflows the whole bar every time you deselect.
    if(panel._boundRef !== 'empty'){
      panel._boundRef = 'empty';
      panel.innerHTML = '<span class="slotEmpty">Nothing selected</span>';
    }
    return;
}

// Static structure for one selection, built once per selection.
function buildPanelMarkup(panel, type, ref){
    if(type==='building' && isEnemyBuilding(ref)){
      // Enemy structures get a plain readout — no train/upgrade/salvage
      // buttons, because every one of those acts on a building it assumes
      // you own. BUILD_DEFS has no ai_ types either, so the normal panel
      // would render an untitled shell of dead controls.
      const adef = AI_BUILD_DEFS[ref.aiType || ref.type] || {name:'Enemy Structure'};
      panel.innerHTML = `<h3 style="color:#ff8a6b;">${adef.name}</h3>
        <div>HP: <span id="infoHpText"></span></div>
        <div class="hpbar"><div class="hpfill" id="infoHpFill"></div></div>
        <div style="margin-top:6px;color:#d8c79a;">${ref.isCore
          ? 'Their seat of power. Raze it to win the war.'
          : 'Enemy holding — right-click it with soldiers to attack.'}</div>`;
    } else if(type==='building'){
      const def = BUILD_DEFS[ref.type] || {name:'Town Hall'};
      panel.innerHTML = `<h3>${def.name}</h3>
        <div>HP: <span id="infoHpText"></span></div>
        <div class="hpbar"><div class="hpfill" id="infoHpFill"></div></div>
        <div id="infoBuild" style="margin-top:4px;color:#ffd76b;"></div>
        ${BUILD_DEFS[ref.type] && BUILD_DEFS[ref.type].needsWorker ? `<div id="infoWorkers" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${ref.type==='farm' ? `<div id="infoSoil" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${(state.faction==='swarm' && (ref.isCore || ref.type==='creep_tumor') && blightCanEverSpread(ref))
          ? `<div id="blightNote" style="margin-top:4px;color:#9aae78;"></div><button id="blightBtn">Spread Blight</button>`
          : ((state.faction==='swarm' && (ref.isCore || ref.type==='creep_tumor'))
             ? `<div style="margin-top:4px;color:#8a7a5c;">The blight spreads no further from here.</div>` : '')}
        ${(state.faction==='grove') ? `<div id="growNote" style="margin-top:4px;color:#9fe08a;"></div>
        <div class="hpbar"><div class="hpfill" id="growFill" style="background:#6bbf59;"></div></div>` : ''}
        ${(state.faction==='grove' && ref.isCore)
          ? `<div id="redirectNote" style="margin-top:4px;color:#ffd76b;"></div><button id="redirectBtn">Redirect Nutrients</button>` : ''}
        ${(state.faction==='grove' && !ref.isCore)
          ? `<div id="rootNote" style="margin-top:4px;color:#c08a5a;"></div><button id="regrowBtn">Regrow Root</button>` : ''}
        ${ref.type==='ritual_pit' ? `<div id="pitCount" style="margin-top:4px;color:#c98a8a;"></div>
        <div class="hpbar"><div class="hpfill" id="pitFill" style="background:#a8443f;"></div></div>` : ''}
        ${ref.type==='tower' ? `<div id="infoGarrison" style="margin-top:4px;color:#d8c79a;"></div><button id="towerReleaseBtn">Release defenders</button>` : ''}
        ${ref.type==='wall' ? `<div id="infoWallRepair" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${ref.type==='mill' ? `<div style="margin-top:4px;color:#d8c79a;">Grinds up to ${MILLING.millCapacity} wheat/tick into flour. Needs a worker at the millstone — right-click here with a villager selected.</div>` : ''}
        ${ref.type==='bakery' ? `<div style="margin-top:4px;color:#d8c79a;">Bakes up to ${MILLING.bakeCapacity} flour/tick into food at 1.5x. Needs a worker at the oven — right-click here with a villager selected.</div>` : ''}
        ${ref.type==='mason' ? `<div style="margin-top:4px;color:#d8c79a;">Cuts stone for skilled work: towers, Town Hall and storage upgrades cost 25% less stone. Trains Repairmen.</div><button id="trainRepBtn"></button>` : ''}
        ${ref.type==='well' ? `<div style="margin-top:4px;color:#d8c79a;">+5% happiness (up to 3 wells count).</div>` : ''}
        ${ref.type==='tavern' ? `<div style="margin-top:4px;color:#d8c79a;">+10% happiness (up to 2 taverns count).</div>` : ''}
        ${ref.type==='apothecary' ? `<div style="margin-top:4px;color:#d8c79a;">Wounded units within ${APOTHECARY.range} tiles heal ${APOTHECARY.healPerTick} HP per tick.</div>` : ''}
        ${ref.type==='market' ? `<div id="marketInfo" style="margin-top:4px;color:#d8c79a;"></div>
          <button class="tradeBtn" id="tr_wood_stone"></button>
          <button class="tradeBtn" id="tr_stone_wood"></button>
          <button class="tradeBtn" id="tr_food_wood"></button>
          <button class="tradeBtn" id="tr_wood_food"></button>
          <button class="tradeBtn" id="buy_wood"></button>
          <button class="tradeBtn" id="buy_stone"></button>
          <button class="tradeBtn" id="buy_food"></button>` : ''}
        ${STORAGE_LEVELS[ref.type] ? `<div id="infoStorage" style="margin-top:4px;color:#d8c79a;"></div><button id="upgradeBtn"></button>` : ''}
        ${(WALL_UPGRADE && ref.type==='wall') ? `<div id="infoWallTier" style="margin-top:4px;color:#d8c79a;"></div>${ref.boneWall ? '' : `<button id="boneWallBtn"></button>`}` : ''}
        ${(ref.type==='barracks' || ref.type==='town_hall_core') ? `<div id="prodStatus" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${ref.type==='town_hall_core' ? `<div id="infoTC" style="margin-top:4px;color:#d8c79a;"></div><div id="infoGarrisonTC" style="margin-top:4px;color:#d8c79a;"></div><button id="tcUpgradeBtn"></button><button id="trainVillagerBtn"></button>${state.faction==='tribe' ? `<button id="trainForesterBtn"></button>` : ''}<button id="captainBtn"></button><button id="releaseBtn"></button>` : ''}
        ${ref.type==='barracks' ? `<button id="trainBtn"></button><button id="trainSwordBtn"></button>
          <div style="margin-top:6px;color:#d8c79a;font-size:12px;">EVOLUTIONS (permanent, faction-wide)</div>
          <button id="evolveSwordBtn"></button><button id="evolveArcherBtn"></button>` : ''}
        ${ref.isCore ? '' : `<button id="salvageBtn"></button>`}`;
      if(ref.type==='barracks'){
        document.getElementById('trainBtn').addEventListener('click', ()=> trainSoldier(ref, 'archer'));
        document.getElementById('trainSwordBtn').addEventListener('click', ()=> trainSoldier(ref, 'swordsman'));
        document.getElementById('evolveSwordBtn').addEventListener('click', ()=> startUnitEvolution('swordsman'));
        document.getElementById('evolveArcherBtn').addEventListener('click', ()=> startUnitEvolution('archer'));
      }
      if(ref.type==='town_hall_core'){
        document.getElementById('trainVillagerBtn').addEventListener('click', ()=> trainVillager(ref));
        const fb = document.getElementById('trainForesterBtn');
        if(fb) fb.addEventListener('click', ()=> trainForester(ref));
        document.getElementById('tcUpgradeBtn').addEventListener('click', ()=> upgradeTownCenter(ref));
        document.getElementById('captainBtn').addEventListener('click', ()=> recruitCaptain());
        document.getElementById('releaseBtn').addEventListener('click', ()=> releaseTCGarrison());
      }
      if(STORAGE_LEVELS[ref.type]){
        document.getElementById('upgradeBtn').addEventListener('click', ()=> upgradeStorageBuilding(ref));
      }
      const bwBtn = document.getElementById('boneWallBtn');
      if(bwBtn){
        bwBtn.addEventListener('click', ()=>{ if(upgradeWall(ref)) refreshInfoPanel(); });
      }
      if(ref.type==='mason'){
        document.getElementById('trainRepBtn').addEventListener('click', ()=> trainRepairman(ref));
      }
      if(ref.type==='tower'){
        const rb = document.getElementById('towerReleaseBtn');
        if(rb) rb.addEventListener('click', ()=> releaseTowerGarrison(ref));
      }
      const blb = document.getElementById('blightBtn');
      if(blb) blb.addEventListener('click', ()=> beginBlightTargeting(ref));
      const rdb = document.getElementById('redirectBtn');
      if(rdb) rdb.addEventListener('click', ()=> beginRedirectTargeting());
      const rgb = document.getElementById('regrowBtn');
      if(rgb) rgb.addEventListener('click', ()=> regrowRoot(ref));
      if(!ref.isCore){
        const sb = document.getElementById('salvageBtn');
        // checked at CLICK time, not bind time — the panel can stay open
        // across a construction finishing, and Cancel vs Salvage needs to
        // reflect whatever's true right now
        if(sb) sb.addEventListener('click', ()=> underConstruction(ref) ? cancelBuilding(ref) : salvageBuilding(ref));
      }
      if(ref.type==='market'){
        document.getElementById('tr_wood_stone').addEventListener('click', ()=> tradeAtMarket('wood','stone'));
        document.getElementById('tr_stone_wood').addEventListener('click', ()=> tradeAtMarket('stone','wood'));
        document.getElementById('tr_food_wood').addEventListener('click', ()=> tradeAtMarket('food','wood'));
        document.getElementById('tr_wood_food').addEventListener('click', ()=> tradeAtMarket('wood','food'));
        document.getElementById('buy_wood').addEventListener('click', ()=> buyWithGold('wood'));
        document.getElementById('buy_stone').addEventListener('click', ()=> buyWithGold('stone'));
        document.getElementById('buy_food').addEventListener('click', ()=> buyWithGold('food'));
      }
    } else if(type==='unit'){
      const isVillager = ref.type==='villager';
      const unitName = unitDisplayName(ref);
      const isHero = ref.type==='captain';
      panel.innerHTML = `<h3>${unitName}${isHero ? ' <span id="heroLvl"></span>' : ''}</h3>
        <div>HP: <span id="infoHpText"></span></div>
        <div class="hpbar"><div class="hpfill" id="infoHpFill"></div></div>
        ${unitAttack(ref) ? `<div id="infoAtk" style="margin-top:4px;color:#e8dcc0;"></div>
        <div id="infoAtkNote" style="color:#ffd76b;"></div>` : ''}
        <div id="infoActivity" style="margin-top:4px;color:#9fc4ff;"></div>
        <div id="infoUpkeep" style="color:#d8c79a;"></div>
        ${isHero ? `<div id="heroXp" style="margin-top:4px;color:#c9a0ff;"></div>
        <div class="hpbar"><div class="hpfill" id="heroXpFill" style="background:#9a6fd4;"></div></div>
        <div id="heroCds" style="margin-top:4px;color:#d8c79a;"></div>
        <div id="heroMana" style="margin-top:4px;color:#8fd0ff;"></div>
        <div class="hpbar"><div class="hpfill" id="heroManaFill" style="background:#4a90d9;"></div></div>
        <div id="heroSpells" style="margin-top:6px;"></div>` : ''}
        ${isVillager ? `<div id="infoAssign" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${ref.type==='forester' ? `<div id="seedNote" style="margin-top:4px;color:#9fe08a;"></div><button id="seedBtn">Seed Grove</button>` : ''}
        <div style="margin-top:6px;color:#d8c79a;">${isVillager
          ? 'Right-click a Farm/Lumber Camp/Quarry to assign them there, or an empty tile to send them there (unassigns).'
          : (isHero ? (state.faction==='swarm' ? 'Right-click to move. J = hurl a hex toward the mouse, slowing the target 20% for a few seconds. K = raise short-lived risen. Gains power from kills nearby.'
                                                : 'Right-click to move. J = hurl javelin toward the mouse. K = slash everything adjacent. He gains XP from kills near him.')
                    : (ref.type==='repairman' ? 'Right-click a damaged Wall or Tower to repair it (costs wood). He works only on your orders.'
                    : 'Right-click a tile to move.'))}</div>`;
      const sb2 = document.getElementById('seedBtn');
      if(sb2) sb2.addEventListener('click', ()=> beginSeedTargeting(ref));
    } else if(type==='enemy'){
      panel.innerHTML = `<h3 style="color:#ff8a6b;">${enemyName(ref)}</h3>
        <div>HP: <span id="infoHpText"></span></div>
        <div class="hpbar"><div class="hpfill" id="infoHpFill" style="background:#d85a3a;"></div></div>
        <div id="infoEnemyAtk" style="margin-top:4px;color:#e8dcc0;"></div>
        <div id="infoEnemyAtkNote" style="color:#d8c79a;"></div>
        <div style="margin-top:6px;color:#d8c79a;">${enemyDesc(ref)}</div>`;
    }
}

// Runs every frame while something is selected. Updates values in place
// only — replacing a node can drop a button between mousedown and mouseup.
function updatePanelLive(type, ref){

  // dynamic updates only, every frame — no DOM node ever gets replaced here
  if(type==='building'){
    const bEl = document.getElementById('infoBuild');
    if(bEl) bEl.textContent = underConstruction(ref) ? `Under construction — ${Math.ceil(ref.buildMs/1000)}s` : '';
    const wEl2 = document.getElementById('infoWorkers');
    if(wEl2){
      // A dry camp says so instead of reporting "Workers: 0/3", which reads as
      // "needs staff" when the truth is the opposite — there is nothing here
      // to work and staffing it would only strand villagers again.
      if(ref.depleted){
        wEl2.textContent = 'Depleted — nothing left in reach. Salvage it and rebuild nearer the resource.';
        wEl2.style.color = '#e0a06b';
      } else {
        wEl2.textContent = `Workers: ${workersOf(ref).length}/${workerCapOf(ref)}`;
        wEl2.style.color = '#d8c79a';
      }
    }
    if(ref.type==='mason'){
      const rb = document.getElementById('trainRepBtn');
      if(rb){
        let ok = !underConstruction(ref) && !queueFull(ref) && state.units.some(u=>u.type==='villager' && u.hp>0 && !u.inTC);
        for(const k in REPAIRMAN.cost) if(state.resources[k] < REPAIRMAN.cost[k]) ok = false;
        rb.disabled = !ok;
        rb.textContent = `Train Repairman (${fmtCost(REPAIRMAN.cost)}, 1 villager, 20s)`;
      }
    }
    if(!ref.isCore){
      const sb = document.getElementById('salvageBtn');
      if(sb){
        const defC = BUILD_DEFS[ref.type];
        if(underConstruction(ref)){
          // canceling an order in progress — full refund, no gold fee, no gate
          const parts = [];
          if(defC && defC.cost) for(const k in defC.cost){ if(defC.cost[k]>0) parts.push(defC.cost[k]+k[0].toUpperCase()); }
          sb.disabled = false;
          sb.textContent = `Cancel (refund ${parts.length?parts.join(' '):'nothing'})`;
        } else {
          const parts = [];
          if(defC && defC.cost) for(const k in defC.cost){ const r = Math.floor(defC.cost[k]*SALVAGE.refund); if(r>0) parts.push(r+k[0].toUpperCase()); }
          if(state.faction==='swarm'){
            // the swarm reabsorbs its own growths — no gold, no gate. This
            // branch was missing before: salvageBuilding() itself already
            // waived the gold cost, but this button never got the memo, so
            // it sat permanently disabled (gold is always 0 for the swarm).
            sb.disabled = false;
            sb.textContent = `Reabsorb (free → ${parts.length?parts.join(' '):'nothing'})`;
          } else {
            sb.disabled = state.resources.gold < SALVAGE.goldCost;
            sb.textContent = `Salvage (${SALVAGE.goldCost}G → ${parts.length?parts.join(' '):'scrap'})`;
          }
        }
      }
    }
  }
  const hpText = document.getElementById('infoHpText');
  if(hpText) hpText.textContent = `${Math.max(0,Math.round(ref.hp))} / ${ref.maxHp}`;
  const hpFill = document.getElementById('infoHpFill');
  if(hpFill) hpFill.style.width = (Math.max(0, ref.hp/ref.maxHp)*100) + '%';
  if(type==='building' && (ref.type==='barracks' || ref.type==='town_hall_core')){
    const prodEl = document.getElementById('prodStatus');
    if(prodEl){
      if(ref.production){
        const secs = Math.ceil(ref.production.remainingMs/1000);
        const qn = (ref.queue||[]).length;
        prodEl.textContent = `Training ${ref.production.type}… ${secs}s` + (qn ? ` (+${qn} queued)` : '');
      } else {
        prodEl.textContent = '';
      }
    }
  }
  if(type==='building' && ref.type==='barracks'){
    const haveVillager = state.units.some(u=>u.type==='villager' && u.hp>0);
    const affords = (cost)=>{ for(const k in cost) if(state.resources[k]<cost[k]) return false; return true; };
    const btn = document.getElementById('trainBtn');
    if(btn){
      btn.disabled = !(affords(ARCHER_COST) && haveVillager) || queueFull(ref);
      btn.textContent = `Train Archer (${fmtCost(ARCHER_COST)}, 1 villager, 60s)`;
    }
    const sbtn = document.getElementById('trainSwordBtn');
    if(sbtn){
      sbtn.disabled = !(affords(SWORDSMAN_COST) && haveVillager) || queueFull(ref);
      sbtn.textContent = `Train Swordsman (${fmtCost(SWORDSMAN_COST)}, 1 villager, 45s)`;
    }
    for(const [evoType, btnId] of [['swordsman','evolveSwordBtn'],['archer','evolveArcherBtn']]){
      const ebtn = document.getElementById(btnId);
      if(!ebtn) continue;
      const conf = EVOLUTIONS[evoType];
      if(state.evolutions[evoType]){
        ebtn.disabled = true;
        ebtn.textContent = `${conf.name} — researched`;
      } else if(state.evolutionInProgress){
        ebtn.disabled = true;
        ebtn.textContent = state.evolutionInProgress.type===evoType
          ? `${conf.name}... ${Math.ceil(state.evolutionInProgress.msRemaining/1000)}s`
          : `${conf.name} (another evolution in progress)`;
      } else {
        ebtn.disabled = !affords(conf.cost);
        ebtn.textContent = `${conf.name} (${fmtCost(conf.cost)})`;
      }
    }
  }
  if(type==='building' && ref.type==='town_hall_core'){
    const lvl = ref.level || 1;
    const tcEl = document.getElementById('infoTC');
    if(tcEl){
      let perks = `Level ${lvl}`;
      if(lvl >= TC_LEVELS.maxLevel) perks += ' — battlements manned (shoots raiders)';
      tcEl.textContent = perks;
    }
    const upBtn = document.getElementById('tcUpgradeBtn');
    if(upBtn){
      if(underConstruction(ref)){
        upBtn.disabled = true;
        upBtn.textContent = ref.awaitingBuilder ? 'Waiting for a builder...' : 'Under construction...';
      } else if(ref.upgradeMs > 0){
        upBtn.disabled = true;
        upBtn.textContent = `Upgrading... ${Math.ceil(ref.upgradeMs/1000)}s`;
      } else if(lvl >= TC_LEVELS.maxLevel){
        upBtn.disabled = true;
        upBtn.textContent = 'Max level';
      } else {
        const cost = masonAdjust(TC_LEVELS.upCost[lvl-1]);
        let afford = true;
        for(const k in cost) if(state.resources[k] < cost[k]) afford = false;
        upBtn.disabled = !afford;
        upBtn.textContent = `Upgrade TC (${fmtCost(cost)})`;
        upBtn.title = `+${TC_LEVELS.hpBonus[lvl-1]} HP, +${TC_LEVELS.storageBonus[lvl-1]} base storage, +${TC_LEVELS.popBonus[lvl-1]} pop cap, faster settlers` + (lvl+1>=TC_LEVELS.maxLevel ? ', TC shoots raiders' : '');
      }
    }
    const btn = document.getElementById('trainVillagerBtn');
    if(btn){
      const canAfford = state.resources.food>=VILLAGER_COST.food
        && state.population.current < state.population.cap && !state.starving;
      btn.disabled = !canAfford || queueFull(ref);
      const trainSec = Math.round((TC_LEVELS.trainMs[lvl-1] || VILLAGER_TRAIN_MS)/1000);
      btn.textContent = `Train Villager (${fmtCost(VILLAGER_COST)}, ${trainSec}s)`;
    }
    const fbtn = document.getElementById('trainForesterBtn');
    if(fbtn){
      let ok = state.population.current < state.population.cap && !state.starving;
      for(const k in FORESTER.cost) if(state.resources[k] < FORESTER.cost[k]) ok = false;
      fbtn.disabled = !ok;
      fbtn.textContent = `Train Forester (${fmtCost(FORESTER.cost)})`;
    }
    const capBtn = document.getElementById('captainBtn');
    if(capBtn){
      if(livingCaptain()){
        capBtn.disabled = true;
        capBtn.textContent = 'The Minotaur leads your soldiers';
      } else {
        const cost = state.captainRecruited ? CAPTAIN.reviveCost : CAPTAIN.cost;
        const swarmHero = state.faction==='swarm';
        capBtn.disabled = state.resources[swarmHero ? 'food' : 'gold'] < cost;
        capBtn.textContent = swarmHero
          ? `${state.captainRecruited ? 'Raise anew' : 'Raise'} Necromancer (${cost}C)`
          : `${state.captainRecruited ? 'Revive' : 'Recruit'} Minotaur (${cost}G)`;
        capBtn.title = swarmHero
          ? 'Manual hero. Risen within 3 tiles deal +25% damage. J hurls a hex toward the mouse, slowing the target 20% for a few seconds; K raises short-lived risen.'
          : 'Strong melee hero. Soldiers within 3 tiles of him deal +25% damage.';
      }
    }
    const gEl = document.getElementById('infoGarrisonTC');
    const n = tcGarrisonCount();
    if(gEl){
      gEl.textContent = n > 0
        ? `Garrison: ${n} workers — +${Math.min(n, TC_GARRISON.attackCap)} defense damage${n>TC_GARRISON.attackCap ? ' (max)' : ''}`
        : `Garrison empty — right-click here with a villager, or press Recall Workers (+1 dmg each, capped at ${TC_GARRISON.attackCap}).`;
    }
    const relBtn = document.getElementById('releaseBtn');
    if(relBtn){
      relBtn.disabled = n === 0;
      relBtn.textContent = n > 0 ? `Release ${n} Worker${n>1?'s':''}` : 'Release Workers';
    }
  }
  if(type==='building' && ref.type==='market'){
    const infoEl = document.getElementById('marketInfo');
    if(infoEl) infoEl.textContent = caravanActive()
      ? `Caravan in town! (${fmtClock(state.caravanActiveMs)} left)`
      : 'Standard rates. Caravans bring better deals.';
    const getAmt = tradeGetAmt(), gCost = goldBuyCost();
    const setBtn = (id, label, affordable)=>{
      const b = document.getElementById(id);
      if(b){ b.textContent = label; b.disabled = !affordable; }
    };
    setBtn('tr_wood_stone', `${TRADE_GIVE} Wood → ${getAmt} Stone`, state.resources.wood>=TRADE_GIVE);
    setBtn('tr_stone_wood', `${TRADE_GIVE} Stone → ${getAmt} Wood`, state.resources.stone>=TRADE_GIVE);
    setBtn('tr_food_wood', `${TRADE_GIVE} Food → ${getAmt} Wood`, state.resources.food>=TRADE_GIVE);
    setBtn('tr_wood_food', `${TRADE_GIVE} Wood → ${getAmt} Food`, state.resources.wood>=TRADE_GIVE);
    setBtn('buy_wood', `${gCost} Gold → ${GOLD_BUY_AMT} Wood`, state.resources.gold>=gCost);
    setBtn('buy_stone', `${gCost} Gold → ${GOLD_BUY_AMT} Stone`, state.resources.gold>=gCost);
    setBtn('buy_food', `${gCost} Gold → ${GOLD_BUY_AMT} Food`, state.resources.gold>=gCost);
  }
  if(type==='building' && ref.type==='wall'){
    const wEl = document.getElementById('infoWallRepair');
    if(wEl){
      if(ref.hp >= ref.maxHp){
        wEl.textContent = 'Wall intact.';
      } else {
        const crew = assignedWorkerOf(ref);
        wEl.textContent = crew
          ? 'Repair crew on site — patching it up (costs wood).'
          : 'Damaged! Send a Repairman (trained at the Mason) — right-click here with one selected.';
      }
    }
  }
  if(type==='building' && ref.type==='farm'){
    const soilEl = document.getElementById('infoSoil');
    if(soilEl){
      const f = ref.fertility===undefined ? 1 : ref.fertility;
      soilEl.textContent = `Soil fertility: ${Math.round(f*100)}%` + (f<=FARM_MIN_FERTILITY+0.001 ? ' (exhausted)' : '');
    }
  }
  if(type==='building' && ref.type==='tower'){
    const gEl = document.getElementById('infoGarrison');
    if(gEl){
      const g = towerGarrison(ref);
      const dmgNow = BUILD_DEFS.tower.attack.damageLow + g.archers*TOWER_GARRISON_DMG.archer + g.villagers*TOWER_GARRISON_DMG.villager;
      // Range is called out separately from damage: archers extend it, so
      // the panel has to say WHY stacking archers differs from villagers.
      const rNow = towerAttackRange(ref);
      const rBase = BUILD_DEFS.tower.attack.range;
      const rTxt = rNow > rBase ? `, ${rNow.toFixed(1)} range (+${(rNow-rBase).toFixed(1)})` : `, ${rBase.toFixed(1)} range`;
      gEl.textContent = g.total > 0
        ? `Garrison: ${g.total}/${TOWER_GARRISON_CAP} inside (${g.archers} archer${g.archers!==1?'s':''}, ${g.villagers} villager${g.villagers!==1?'s':''}) — ${dmgNow} damage${rTxt}${g.total<TOWER_GARRISON_CAP ? '' : ' (full)'}`
        : `No garrison — ${BUILD_DEFS.tower.attack.damageLow} damage, ${rBase.toFixed(1)} range. Right-click here with villagers or archers (up to ${TOWER_GARRISON_CAP}); they climb inside, safe from harm. Archers also shoot further.`;
      const rb = document.getElementById('towerReleaseBtn');
      if(rb) rb.disabled = g.total === 0;
    }
  }
  if(type==='building' && STORAGE_LEVELS[ref.type]){
    const conf = STORAGE_LEVELS[ref.type];
    const lvl = ref.level || 1;
    const stEl = document.getElementById('infoStorage');
    if(stEl) stEl.textContent = `Level ${lvl} — +${conf.bonus[lvl-1]} ${ref.type==='granary'?'food':'wood & stone'} storage`;
    const wtEl = document.getElementById('infoWallTier');
    if(wtEl && WALL_UPGRADE){
      wtEl.textContent = ref.boneWall ? `${WALL_UPGRADE.name} — reinforced`
        : (ref.upgradeMs > 0 ? `${WALL_UPGRADE.name} rising — ${Math.ceil(ref.upgradeMs/1000)}s`
                             : `${BUILD_DEFS.wall.name} — can be reinforced with bone`);
    }
    const bwb = document.getElementById('boneWallBtn');
    if(bwb && WALL_UPGRADE){
      const affordable = Object.keys(WALL_UPGRADE.cost)
        .every(k => (state.resources[k]||0) >= WALL_UPGRADE.cost[k]);
      bwb.disabled = !canUpgradeWall(ref) || !affordable;
      bwb.textContent = ref.upgradeMs > 0
        ? `Reinforcing... ${Math.ceil(ref.upgradeMs/1000)}s`
        : `Reinforce to ${WALL_UPGRADE.name} (${fmtCost(WALL_UPGRADE.cost)})`;
    }
    const upBtn = document.getElementById('upgradeBtn');
    if(upBtn){
      if(underConstruction(ref)){
        upBtn.disabled = true;
        upBtn.textContent = ref.awaitingBuilder ? 'Waiting for a builder...' : 'Under construction...';
      } else if(ref.upgradeMs > 0){
        upBtn.disabled = true;
        upBtn.textContent = `Upgrading... ${Math.ceil(ref.upgradeMs/1000)}s`;
      } else if(lvl >= conf.bonus.length){
        upBtn.disabled = true;
        upBtn.textContent = 'Max level';
      } else {
        const reqTC = STORAGE_TC_REQ[lvl+1];
        if(reqTC && tcLevel() < reqTC){
          upBtn.disabled = true;
          upBtn.textContent = `Level ${lvl+1} needs Town Hall L${reqTC}`;
        } else {
          const cost = masonAdjust(conf.upCost[lvl-1]);
          let afford = true;
          for(const k in cost) if(state.resources[k] < cost[k]) afford = false;
          upBtn.disabled = !afford;
          upBtn.textContent = `Upgrade (${fmtCost(cost)})`;
        }
      }
    }
  }
  if(type==='unit' && ref.type==='captain'){
    const lvlEl = document.getElementById('heroLvl');
    if(lvlEl) lvlEl.textContent = `— Level ${state.hero.level}`;
    const xpEl = document.getElementById('heroXp');
    const need = HERO.xpToNext(state.hero.level);
    if(xpEl) xpEl.textContent = state.hero.level >= HERO.maxLevel
      ? 'Max level'
      : `XP: ${state.hero.xp} / ${need}`;
    const xpFill = document.getElementById('heroXpFill');
    if(xpFill) xpFill.style.width = (state.hero.level >= HERO.maxLevel ? 100 : Math.min(100, state.hero.xp/need*100)) + '%';
    const cdEl = document.getElementById('heroCds');
    if(cdEl){
      const jav = (ref.javCd||0) > 0 ? (ref.javCd/1000).toFixed(1)+'s' : 'READY (J)';
      const sl  = (ref.slashCd||0) > 0 ? (ref.slashCd/1000).toFixed(1)+'s' : 'READY (K)';
      cdEl.textContent = `Javelin ${heroJavelinDmg()}dmg: ${jav} — Slash ${heroSlashDmg()}dmg: ${sl}`;
    }
  }
  if(type==='enemy'){
    // Enemy stats were HP and a sentence — nothing about what it hits for,
    // which is exactly what you want to know before deciding to engage.
    const ae = document.getElementById('infoEnemyAtk');
    const an = document.getElementById('infoEnemyAtkNote');
    if(ae){
      if(ref.kind === 'camp'){
        ae.textContent = 'Unarmed — it spawns raiders rather than fighting';
        if(an) an.textContent = '';
      } else if(ref.kind === 'ai_worker'){
        ae.textContent = 'Unarmed labourer';
        if(an) an.textContent = 'Killing it slows their whole economy';
      } else {
        const rng = ref.ranged ? ENEMY_RANGED.range : 1.6;
        const secs = (ref.ranged ? ENEMY_RANGED.cooldownMs : 1000)/1000;
        ae.textContent = `${ref.dmg} dmg · ${rng} range · ${(ref.dmg/secs).toFixed(1)}/s`;
        if(an) an.textContent = `every ${secs.toFixed(1)}s${ref.ranged ? ' — holds at range and looses' : ' — melee'}`;
      }
    }
  }
  if(type==='unit' && ref.type==='captain' && typeof heroSpellbook === 'function'){
    const mEl = document.getElementById('heroMana');
    const mFill = document.getElementById('heroManaFill');
    const max = heroMaxMana();
    if(mEl) mEl.textContent = `Power: ${Math.floor(state.hero.mana)} / ${max}`
      + (state.hero.picks > 0 ? `  —  ${state.hero.picks} skill point${state.hero.picks>1?'s':''} to spend` : '');
    if(mFill) mFill.style.width = Math.round((state.hero.mana/max)*100) + '%';

    const wrap = document.getElementById('heroSpells');
    const book = heroSpellbook();
    if(wrap){
      // Rebuilt only when the SHAPE changes — which spells are known, at what
      // rank, and whether a point is available. Cooldown numbers update in
      // place, so a button never vanishes under the cursor mid-click.
      // hero LEVEL is part of the shape: the "requires level N" line below
      // changes on level-up, and keying only on ranks and points left a
      // freshly-unlocked spell still showing its lock until something else
      // happened to redraw the panel.
      const shape = book.map(sp=>sp.id+':'+heroSpellRank(sp.id)).join('|')
        + '#' + state.hero.picks + '@' + state.hero.level;
      if(wrap._shape !== shape){
        wrap._shape = shape;
        wrap.innerHTML = book.map(sp=>{
          const rank = heroSpellRank(sp.id);
          const locked = state.hero.level < sp.minLevel;
          const maxed = rank >= sp.maxRank;
          const canLearn = state.hero.picks > 0 && !maxed && !locked;
          // Say WHY there is no button. Without this a level-gated spell drew
          // its name and description and nothing else — no button, no reason —
          // so it read as broken rather than as not yet earned.
          let why = '';
          if(locked) why = `<span style="color:#8a7a5c;">needs hero level ${sp.minLevel}</span>`;
          else if(maxed) why = `<span style="color:#9fe08a;">fully ranked</span>`;
          else if(state.hero.picks <= 0) why = `<span style="color:#8a7a5c;">no skill points — level up to earn one</span>`;
          return `<div style="margin-bottom:6px;">
            <div style="color:#e8dcc0;">${sp.name}${rank ? ` <span style="color:#9fe08a;">rank ${rank}/${sp.maxRank}</span>`
              : ` <span style="color:#8a7a5c;">not learned</span>`}</div>
            <div style="font-size:11px;color:#b8a888;">${rank ? sp.rankText(rank, sp) : sp.desc}</div>
            ${rank ? `<button class="spellCast" data-id="${sp.id}">Cast</button>` : ''}
            ${canLearn ? `<button class="spellLearn" data-id="${sp.id}">${rank ? 'Improve' : 'Learn'} (1 point)</button>` : ''}
            ${why ? `<div style="font-size:11px;margin-top:2px;">${why}</div>` : ''}
          </div>`;
        }).join('');
        for(const btn of wrap.querySelectorAll('.spellCast'))
          btn.addEventListener('click', ()=> beginSpellTargeting(btn.dataset.id));
        for(const btn of wrap.querySelectorAll('.spellLearn'))
          btn.addEventListener('click', ()=> learnHeroSpell(btn.dataset.id));
      }
      // live: cooldown + affordability on each cast button
      for(const btn of wrap.querySelectorAll('.spellCast')){
        const sp = heroSpellById(btn.dataset.id), rank = heroSpellRank(btn.dataset.id);
        const cd = state.hero.cooldowns[sp.id] || 0;
        btn.disabled = !heroSpellReady(sp.id);
        btn.textContent = cd > 0 ? `Cast (${Math.ceil(cd/1000)}s)`
          : (state.hero.mana < sp.mana(rank) ? `Cast (${sp.mana(rank)} power)` : `Cast (${sp.mana(rank)})`);
      }
    }
  }
  if(type==='building' && state.faction==='grove'){
    // Growth reads like experience: which stage it is, how far to the next,
    // and whether it is actually growing at all — a severed structure is
    // frozen, and that has to be visible or a stalled grove is a mystery.
    const nEl = document.getElementById('growNote');
    const fEl = document.getElementById('growFill');
    const st = groveStageDef(ref);
    const maxed = groveStage(ref) >= groveMaxStage(ref);
    const linked = isGroveConnected(ref);
    const pct = maxed ? 1 : Math.min(1, (ref.groveAgeMs||0) / groveStageMs(ref));
    if(nEl){
      nEl.textContent = maxed
        ? `${st.name} — fully grown${ref.isCore ? '' : ' (only the Heartwood grows further)'}`
        : (!linked && !ref.isCore
            ? `${st.name} — SEVERED, growth halted. Reconnect it to the Heartwood.`
            : `${st.name} — ${Math.round(pct*100)}% to ${GROVE.stages[groveStage(ref)+1].name}`);
    }
    if(fEl){
      fEl.style.width = Math.round(pct*100) + '%';
      fEl.style.background = maxed ? '#c9a227' : (linked || ref.isCore ? '#6bbf59' : '#8a7a5c');
    }
  }
  if(type==='building' && ref.type==='ritual_pit'){
    const need = RITUAL.corpsesPerGolem;
    const have = ref.corpseCount || 0;
    const cEl = document.getElementById('pitCount');
    if(cEl) cEl.textContent = `Bodies: ${have} / ${need}` + (have >= need ? ' — rising!' : ` (${need-have} more)`);
    const fEl = document.getElementById('pitFill');
    if(fEl) fEl.style.width = Math.min(100, (have/need)*100) + '%';
  }
  if(type==='building' && state.faction==='swarm' && (ref.isCore || ref.type==='creep_tumor')){
    const nEl = document.getElementById('blightNote');
    const bBtn = document.getElementById('blightBtn');
    const canEver = blightCanEverSpread(ref);
    const ready = blightSpreadReady(ref);
    if(nEl){
      const left = blightSpreadsLeft(ref);
      nEl.textContent = !canEver
        ? 'This growth is spent — the blight reaches no further from here.'
        : (ready ? `Ready — place on blight within ${blightSpreadRange(ref)} tiles. ${left} seeding${left===1?'':'s'} left.`
                 : `Gathering strength... ${Math.ceil(blightSpreadRemainingMs(ref)/1000)}s (${left} left)`);
    }
    if(bBtn){
      bBtn.disabled = !ready;
      bBtn.textContent = !canEver ? 'Spent'
        : (ready ? 'Spread Blight' : `Spread Blight (${Math.ceil(blightSpreadRemainingMs(ref)/1000)}s)`);
    }
  }
  if(type==='building' && state.faction==='grove' && ref.isCore){
    const nEl = document.getElementById('redirectNote');
    const rBtn = document.getElementById('redirectBtn');
    const r = groveRedirect();
    const active = redirectActive();
    const R = GROVE.redirect;
    if(nEl){
      if(active){
        const tgt = redirectTargetBuilding();
        const name = (tgt && BUILD_DEFS[tgt.type] && BUILD_DEFS[tgt.type].name) || 'a structure';
        nEl.textContent = `Feeding ${name} — ${Math.ceil(r.msLeft/1000)}s left. `
          + `The rest of the grove is yielding half and has stopped growing.`;
      } else if(r.cooldownMs > 0){
        nEl.textContent = `The Heartwood is drawing breath... ${Math.ceil(r.cooldownMs/1000)}s`;
      } else {
        nEl.textContent = `Ready — feed one CONNECTED structure: heals it and ages it `
          + `${R.growthMult}x for ${Math.round(R.durationMs/1000)}s, while everything else `
          + `yields half and stops growing.`;
      }
    }
    if(rBtn){
      rBtn.disabled = !redirectReady();
      rBtn.textContent = active
        ? `Redirecting (${Math.ceil(r.msLeft/1000)}s)`
        : (r.cooldownMs > 0 ? `Redirect Nutrients (${Math.ceil(r.cooldownMs/1000)}s)`
                            : 'Redirect Nutrients');
    }
  }
  if(type==='building' && state.faction==='grove' && !ref.isCore){
    const nEl = document.getElementById('rootNote');
    const gBtn = document.getElementById('regrowBtn');
    const connected = groveConnectedIds().has(ref.id);
    const arriving = !connected && rootArrivingTo(ref);
    const cost = (!connected && !arriving) ? regrowRootCost(ref) : null;
    if(nEl){
      if(connected){
        nEl.textContent = 'Rooted to the Heartwood.';
        nEl.style.color = '#9fe08a';
      } else if(arriving){
        nEl.textContent = 'A root is creeping toward it — it will wake when the sap arrives.';
        nEl.style.color = '#d8c79a';
      } else {
        const secs = Math.ceil(ref.hp / (ref.maxHp * GROVE.wither.pctPerSec));
        nEl.textContent = cost
          ? `SEVERED — withering, ~${secs}s left. Regrow the root across ${cost.tiles} tiles for ${cost.wood} wood.`
          : `SEVERED — withering, ~${secs}s left. Nothing in reach to grow a root from.`;
        nEl.style.color = '#e8956b';
      }
    }
    if(gBtn){
      const affordable = !!cost && state.resources.wood >= cost.wood;
      gBtn.style.display = (connected || arriving) ? 'none' : '';
      gBtn.disabled = !affordable;
      gBtn.textContent = !cost ? 'Out of reach'
        : (affordable ? `Regrow Root (${cost.wood} wood)` : `Regrow Root (need ${cost.wood} wood)`);
    }
  }
  if(type==='unit' && ref.type==='forester'){
    const nEl = document.getElementById('seedNote');
    const sBtn = document.getElementById('seedBtn');
    const cd = ref.seedCd || 0;
    if(nEl){
      nEl.textContent = cd > 0
        ? `Seed Grove ready in ${Math.ceil(cd/1000)}s`
        : `Ready — scatters ${FORESTER.treesPerCast} saplings, range ${FORESTER.castRange}`;
    }
    if(sBtn){
      sBtn.disabled = cd > 0;
      sBtn.textContent = cd > 0 ? `Seed Grove (${Math.ceil(cd/1000)}s)` : 'Seed Grove';
    }
  }
  if(type==='unit'){
    const a = unitAttack(ref);
    const atkEl = document.getElementById('infoAtk');
    if(a && atkEl) atkEl.textContent = `${a.dmg} dmg · ${a.range} range · ${a.dps}/s`;
    const noteEl = document.getElementById('infoAtkNote');
    if(a && noteEl){
      noteEl.textContent = a.inTower ? 'Manning the tower — fires through it, not their own bow'
        : (a.selfDefence ? `every ${a.secs}s — self-defence only, no banner bonus`
        : (a.inAura ? `+25% under the banner (base ${a.base}, every ${a.secs}s)`
                    : `every ${a.secs}s`));
      noteEl.style.color = a.inTower ? '#9fc4ff' : (a.inAura ? '#ffd76b' : '#d8c79a');
    }
    const actEl = document.getElementById('infoActivity');
    if(actEl) actEl.textContent = unitActivity(ref);
    const upEl = document.getElementById('infoUpkeep');
    if(upEl) upEl.textContent = `Eats ${unitUpkeepPerMin(ref)} ${foodWord()}/min`;
  }
  if(type==='unit' && ref.type==='villager'){
    const assignEl = document.getElementById('infoAssign');
    if(assignEl){
      const b = ref.assignedBuildingId!=null ? state.buildings.find(x=>x.id===ref.assignedBuildingId) : null;
      const buildTarget = ref.buildTaskId!=null ? state.buildings.find(x=>x.id===ref.buildTaskId) : null;
      let txt = buildTarget ? `Walking to build: ${BUILD_DEFS[buildTarget.type].name}`
              : b ? (b.type==='wall' ? 'Repairing: Wall' : `Working: ${BUILD_DEFS[b.type].name}`) : 'Idle — not assigned';
      if(ref.carrying) txt += ` — hauling ${ref.carrying.amt} ${ref.carrying.key}`;
      assignEl.textContent = txt;
    }
  }
  // hive eyes read hive words — re-theme the panel copy without touching listeners
  skinDomText(document.getElementById('infoPanel'));
}

// ---------------------------------------------------------------------
// The faction briefing (#hint) — opened from the small Briefing button in
// the bottom bar, closed by default.
//
// Open/closed is read from the COMPUTED style, never from an inline one.
// The closed state comes from the stylesheet, so element.style.display is ''
// on a fresh page — a `style.display === 'none'` test reads that as "open"
// and the first click would close an already-closed panel, i.e. the button
// would appear dead until clicked twice.
// ---------------------------------------------------------------------
function hintIsOpen(){
  const h = document.getElementById('hint');
  return !!h && getComputedStyle(h).display !== 'none';
}
function setHintOpen(open){
  const h = document.getElementById('hint');
  const btn = document.getElementById('helpBtn');
  if(h){
    h.style.display = open ? 'block' : 'none';
    if(open) h.scrollTop = 0;   // always start at the top, however it was left
  }
  if(btn) btn.classList.toggle('toggled-on', !!open);
}
function toggleHint(){ setHintOpen(!hintIsOpen()); }
function closeHint(){ setHintOpen(false); }

function findFreeSpotNear(gx0, gy0, maxRadius){
  // ROUNDED first. This returns a TILE, so a fractional origin was never
  // meaningful — but several callers hand it a live entity position, which is
  // fractional whenever that entity is mid-stride. The ring offsets are whole
  // numbers, so a fractional origin makes every candidate fractional too:
  // inBounds() passes (16.4 < MAP_H) while state.grid[16.4] is undefined, and
  // tileAt() dies reading a property of undefined.
  //
  // That is not theoretical. AI workers move by fractions (aiStepToward) and
  // their raw position is saved, so restoreGame() -> spawnAiWorker(se.gx,
  // se.gy) threw for any save taken while an enemy worker was walking — which
  // is nearly all of them, since they gather and haul continuously. The throw
  // escaped to window.onerror and put up the fatal-error screen, so "Continue
  // Your Game" was broken outright.
  gx0 = Math.round(gx0); gy0 = Math.round(gy0);
  // spiral outward ring by ring until a genuinely free tile is found, so
  // archers never stack invisibly on top of each other or the barracks.
  for(let r=1; r<=maxRadius; r++){
    for(let dy=-r; dy<=r; dy++){
      for(let dx=-r; dx<=r; dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue; // ring only
        const gx=gx0+dx, gy=gy0+dy;
        if(isTileFreeForUnit(gx,gy)) return {gx,gy};
      }
    }
  }
  return null;
}

// Training an archer conscripts an existing villager rather than conjuring
// a brand new person — total population doesn't change, it just shifts
// from the worker pool to the soldier pool. Prefer an idle villager so we
// don't strip a farm/camp of its worker if we don't have to.
function trainSoldier(barracks, kind){
  const cost = kind==='swordsman' ? SWORDSMAN_COST : ARCHER_COST;
  const ms = kind==='swordsman' ? SWORDSMAN_TRAIN_MS : ARCHER_TRAIN_MS;
  if(state.starving){ flashWaveBanner('Starving men make poor soldiers — get food first!'); return false; }
  if(queueFull(barracks) || underConstruction(barracks)) return false; // queue of 3 max
  for(const k in cost) if(state.resources[k] < cost[k]) return false;
  const villager = state.units.find(u=>u.type==='villager' && u.hp>0 && !u.assignedBuildingId && !u.inTC && !u.enteringTC)
                 || state.units.find(u=>u.type==='villager' && u.hp>0 && !u.inTC && !u.enteringTC);
  if(!villager) return false; // no one left to conscript

  for(const k in cost) state.resources[k] -= cost[k];
  // the conscript walks into the barracks now; the soldier marches out later
  destroyUnitVisuals(villager);
  state.units = state.units.filter(u=>u!==villager);
  autoAssignIdleVillagers(); // backfill the vacancy left behind, if anyone's free
  syncPopulationCount();

  enqueueProduction(barracks, kind);
  flashWaveBanner(`A villager reports for duty — ${kind} ready in ${Math.round(ms/1000)}s.`);
  updateHUD();
  refreshInfoPanel();
  return true;
}

function endGame(won){
  logEvent('game_over', { won: !!won, wave: state.wave, pop: state.population.current,
                          bldgs: myBuildings().filter(b=>b.hp>0).length });
  if(typeof telemetryFlush === 'function') telemetryFlush();
  state.gameOver = true;
  clearSavedGame(); // a finished run should never offer "Continue" back into it
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `<h1>${won ? 'Victory' : 'Your Town Has Fallen'}</h1>
    <p>You survived ${state.wave} wave${state.wave===1?'':'s'} with a population of ${state.population.current}.</p>
    <button id="restartBtn">Try Again</button>`;
  document.getElementById('restartBtn').addEventListener('click', ()=> location.reload());
}

