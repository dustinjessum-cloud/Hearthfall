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

  const soldierCount = state.units.filter(u=>(u.type==='archer'||u.type==='swordsman'||u.type==='captain') && u.hp>0).length;
  const workerCount = state.units.filter(u=>u.type==='villager' && u.hp>0).length;
  document.querySelector('#resWorkers span').textContent = workerCount;
  document.querySelector('#resSoldiers span').textContent = soldierCount;

  refreshBuildBar();
  refreshHud2Buttons();
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
  if(!inBounds(gx, gy) || tileAt(gx, gy)==='water') return false;
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
  for(const b of state.buildings){
    if(!b.rallyMarker) continue;
    const shown = !!(state.selected && state.selected.type==='building' && state.selected.ref===b);
    b.rallyMarker.setVisible(shown);
  }
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
const BUILD_CATEGORIES = [
  { key:'economy', label:'Economy',        types:['farm','lumber_camp','quarry','mill','bakery','wildstone_refinery'] },
  { key:'town',    label:'Town',           types:['house','well','tavern','apothecary','mason','road'] },
  { key:'trade',   label:'Storage/Trade',  types:['granary','warehouse','market'] },
  { key:'defense', label:'Defense',        types:['wall','gate','tower','barracks'] },
];
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

function selectEntity(type, ref){
  if(state.selected && state.selected.type==='unit' && state.selected.ref.sprite) {
    const prev = state.selected.ref;
    // restore the unit's own tint (e.g. the swordsman's blue) not just clear it
    if(prev.baseTint != null) prev.sprite.setTint(prev.baseTint);
    else prev.sprite.clearTint();
  }
  state.selected = type ? {type, ref} : null;
  if(type==='unit') ref.sprite.setTint(0xffe08a);
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
function refreshInfoPanel(){
  const panel = document.getElementById('infoPanel');
  if(!state.selected){
    if(state.selectedGroup && state.selectedGroup.length > 1){
      panel.style.display='block';
      if(panel._boundRef !== 'group'){
        panel._boundRef = 'group';
        panel.innerHTML = `<h3>Group</h3><div id="groupCount"></div>
          <div style="margin-top:6px;color:#d8c79a;">Right-click a tile to move everyone there. Esc deselects.</div>`;
      }
      const gc = document.getElementById('groupCount');
      if(gc){
        const alive = state.selectedGroup.filter(u=>u.hp>0);
        gc.textContent = `${alive.length} units selected`;
      }
      return;
    }
    panel.style.display='none'; panel._boundRef=null; return;
  }
  panel.style.display='block';
  const {type, ref} = state.selected;

  if(panel._boundRef !== ref){
    panel._boundRef = ref;
    if(type==='building'){
      const def = BUILD_DEFS[ref.type] || {name:'Town Hall'};
      panel.innerHTML = `<h3>${def.name}</h3>
        <div>HP: <span id="infoHpText"></span></div>
        <div class="hpbar"><div class="hpfill" id="infoHpFill"></div></div>
        <div id="infoBuild" style="margin-top:4px;color:#ffd76b;"></div>
        ${BUILD_DEFS[ref.type] && BUILD_DEFS[ref.type].needsWorker ? `<div id="infoWorkers" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${ref.type==='farm' ? `<div id="infoSoil" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
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
        ${(ref.type==='barracks' || ref.type==='town_hall_core') ? `<div id="prodStatus" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${ref.type==='town_hall_core' ? `<div id="infoTC" style="margin-top:4px;color:#d8c79a;"></div><div id="infoGarrisonTC" style="margin-top:4px;color:#d8c79a;"></div><button id="tcUpgradeBtn"></button><button id="trainVillagerBtn"></button><button id="captainBtn"></button><button id="releaseBtn"></button>` : ''}
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
        document.getElementById('tcUpgradeBtn').addEventListener('click', ()=> upgradeTownCenter(ref));
        document.getElementById('captainBtn').addEventListener('click', ()=> recruitCaptain());
        document.getElementById('releaseBtn').addEventListener('click', ()=> releaseTCGarrison());
      }
      if(STORAGE_LEVELS[ref.type]){
        document.getElementById('upgradeBtn').addEventListener('click', ()=> upgradeStorageBuilding(ref));
      }
      if(ref.type==='mason'){
        document.getElementById('trainRepBtn').addEventListener('click', ()=> trainRepairman(ref));
      }
      if(ref.type==='tower'){
        const rb = document.getElementById('towerReleaseBtn');
        if(rb) rb.addEventListener('click', ()=> releaseTowerGarrison(ref));
      }
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
      const unitName = isVillager ? 'Villager' : (ref.type==='captain' ? 'Minotaur' : (ref.type==='swordsman' ? 'Swordsman' : (ref.type==='repairman' ? 'Repairman' : 'Archer')));
      const isHero = ref.type==='captain';
      panel.innerHTML = `<h3>${unitName}${isHero ? ' <span id="heroLvl"></span>' : ''}</h3>
        <div>HP: <span id="infoHpText"></span></div>
        <div class="hpbar"><div class="hpfill" id="infoHpFill"></div></div>
        ${isHero ? `<div id="heroXp" style="margin-top:4px;color:#c9a0ff;"></div>
        <div class="hpbar"><div class="hpfill" id="heroXpFill" style="background:#9a6fd4;"></div></div>
        <div id="heroCds" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        ${isVillager ? `<div id="infoAssign" style="margin-top:4px;color:#d8c79a;"></div>` : ''}
        <div style="margin-top:6px;color:#d8c79a;">${isVillager
          ? 'Right-click a Farm/Lumber Camp/Quarry to assign them there, or an empty tile to send them there (unassigns).'
          : (isHero ? (state.faction==='swarm' ? 'Right-click to move. J = hurl a hex toward the mouse, slowing the target 20% for a few seconds. K = raise short-lived risen. Gains power from kills nearby.'
                                                : 'Right-click to move. J = hurl javelin toward the mouse. K = slash everything adjacent. He gains XP from kills near him.')
                    : (ref.type==='repairman' ? 'Right-click a damaged Wall or Tower to repair it (costs wood). He works only on your orders.'
                    : 'Right-click a tile to move.'))}</div>`;
    }
  }

  // dynamic updates only, every frame — no DOM node ever gets replaced here
  if(type==='building'){
    const bEl = document.getElementById('infoBuild');
    if(bEl) bEl.textContent = underConstruction(ref) ? `Under construction — ${Math.ceil(ref.buildMs/1000)}s` : '';
    const wEl2 = document.getElementById('infoWorkers');
    if(wEl2) wEl2.textContent = `Workers: ${workersOf(ref).length}/${workerCapOf(ref)}`;
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
      gEl.textContent = g.total > 0
        ? `Garrison: ${g.total}/${TOWER_GARRISON_CAP} inside (${g.archers} archer${g.archers!==1?'s':''}, ${g.villagers} villager${g.villagers!==1?'s':''}) — ${dmgNow} damage${g.total<TOWER_GARRISON_CAP ? '' : ' (full)'}`
        : `No garrison — ${BUILD_DEFS.tower.attack.damageLow} damage only. Right-click here with villagers or archers (up to ${TOWER_GARRISON_CAP}); they climb inside, safe from harm.`;
      const rb = document.getElementById('towerReleaseBtn');
      if(rb) rb.disabled = g.total === 0;
    }
  }
  if(type==='building' && STORAGE_LEVELS[ref.type]){
    const conf = STORAGE_LEVELS[ref.type];
    const lvl = ref.level || 1;
    const stEl = document.getElementById('infoStorage');
    if(stEl) stEl.textContent = `Level ${lvl} — +${conf.bonus[lvl-1]} ${ref.type==='granary'?'food':'wood & stone'} storage`;
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

function findFreeSpotNear(gx0, gy0, maxRadius){
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
  state.gameOver = true;
  clearSavedGame(); // a finished run should never offer "Continue" back into it
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `<h1>${won ? 'Victory' : 'Your Town Has Fallen'}</h1>
    <p>You survived ${state.wave} wave${state.wave===1?'':'s'} with a population of ${state.population.current}.</p>
    <button id="restartBtn">Try Again</button>`;
  document.getElementById('restartBtn').addEventListener('click', ()=> location.reload());
}

