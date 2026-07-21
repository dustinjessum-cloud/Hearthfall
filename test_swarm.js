// Headless test harness for the SWARM faction + human-mode regression.
// Boots the game script twice in isolated VM sandboxes: once as humans
// (regression: nothing changed), once as the swarm (feature coverage:
// creep, morph-building, biomass economy, corpse feeding, birth burst,
// zergling pairs, biomass hero).
//
// Usage:  node extract_and_test.js   (or: extract script to /tmp/game.js, then node test_swarm.js)
const fs = require('fs');
const vm = require('vm');

const SRC_PATH = process.env.GAME_JS || '/tmp/game.js';
let baseSrc = fs.readFileSync(SRC_PATH, 'utf8');
baseSrc += `
;globalThis.__test = {
  state, FRAME, BUILD_DEFS, BUILD_CATEGORIES, BUILD_TIME, CARRY,
  SWORDSMAN_COST, ARCHER_COST, CAPTAIN, HERO, SWARM,
  applyFaction, applySkinText, initCreep, claimCreepTile, isCreeped, updateCreep, creepSources,
  generateMap, createBuilding, isPlacementValid, tryPlaceBuilding, removeBuilding,
  upgradeStorageBuilding, upgradeTownCenter, autoAssignIdleVillagers, updateConstruction, STORAGE_LEVELS,
  assignVillagerToBuilding, findProductionBuildingFor, EVOLUTIONS, startUnitEvolution, completeUnitEvolution,
  updateUnitEvolution, canStartUnitEvolution, WILDSTONE_CAP, fmtCost,
  get SWORDSMAN_HP(){ return SWORDSMAN_HP; }, get ARCHER_HP(){ return ARCHER_HP; },
  SWORDSMAN_ATTACK, ARCHER_ATTACK, pickWorkerFor,
  createVillager, createSwordsman, createArcher, createCaptain, livingCaptain,
  heroSlash, heroThrowJavelin, recruitCaptain, grantHeroXp,
  updateUnits, updateEnemies, updateCombat, updateProduction, economyTick, updateHeroCombat,
  spawnEnemy, trainVillager, trainSoldier, bankCarry, addResource, storageCapFor,
  syncPopulationCount, findFreeSpotNear, damageUnit, removeUnit, salvageBuilding,
  MAP_W, MAP_H, TILE, inBounds, tileAt, occAt, townHall, updateHUD, heroWebDmg,
  selectEntity, refreshInfoPanel, SALVAGE, frameForGroundTile, depleteResourceTile,
  VILLAGER_COST, trySpreadTumor, updateTumorSpread, findTumorSpreadSpot, creepSources,
};
globalThis.__setScene = (s)=> { scene = s; };
`;

// ---- minimal DOM stub (modeled on test_logic2.js) ----
function makeSandbox(){
  const REGISTRY = {};
  function fakeEl(tag){
    const listeners = {};
    const el = {
      tag, id:'', className:'', textContent:'', innerHTML:'', style:{}, disabled:false, title:'',
      children: [], width:0, height:0, nodeValue:'',
      classList: { set:new Set(), toggle(c,f){ if(f===undefined){ this.set.has(c)?this.set.delete(c):this.set.add(c);} else if(f){this.set.add(c);} else {this.set.delete(c);} }, add(c){this.set.add(c);}, remove(c){this.set.delete(c);} },
      appendChild(c){ this.children.push(c); if(c.id) REGISTRY[c.id]=c; return c; },
      addEventListener(ev,fn){ listeners[ev]=fn; },
      _fire(ev){ if(listeners[ev]) listeners[ev](); },
      getContext(){ return { drawImage(){}, clearRect(){}, fillText(){}, get imageSmoothingEnabled(){return true;}, set imageSmoothingEnabled(v){} }; },
      querySelector(sel){
        const parts = sel.split(' ');
        let root = this;
        if(parts[0].startsWith('#')) root = REGISTRY[parts[0].slice(1)] || this;
        if(parts.length===1) return root;
        const stack = [...root.children];
        while(stack.length){ const c = stack.shift(); if(c.tag === parts[parts.length-1].replace(/:.*$/,'')) return c; stack.push(...c.children); }
        return fakeEl('span');
      },
    };
    return el;
  }
  ['resFood','resWheat','resFlour','resWood','resStone','resGold','resHappy','resPop','resWorkers','resSoldiers',
   'waveInfo','buildBar','infoPanel','hint','hintClose','overlay','startBtn','startSwarmBtn','happyFace',
   'icoFood','icoWheat','icoFlour','icoWood','icoStone','icoGold','icoPop','icoWorker','icoSoldier',
   'errorBanner','raidBtn','recallBtn','pauseBtn','gameWrap'].forEach(id=>{
    const el = fakeEl(id.startsWith('ico') ? 'canvas' : 'div'); el.id = id;
    if(id.startsWith('res')){ const span = fakeEl('span'); el.appendChild(span); const span2 = fakeEl('span'); el.appendChild(span2); }
    REGISTRY[id] = el;
  });
  const documentStub = {
    getElementById: (id)=> REGISTRY[id] || (REGISTRY[id] = fakeEl('div'), REGISTRY[id].id = id, REGISTRY[id]),
    querySelector: (sel)=>{
      const parts = sel.split(' ');
      const root = REGISTRY[parts[0].slice(1)];
      if(!root) return fakeEl('span');
      if(parts.length===1) return root;
      const stack=[...root.children];
      while(stack.length){ const c=stack.shift(); if(c.tag===parts[parts.length-1].replace(/:.*$/,'')) return c; stack.push(...c.children); }
      return fakeEl('span');
    },
    createElement: (tag)=> fakeEl(tag),
    createTreeWalker: (root)=>{ // walk text-ish nodes: we fake "text nodes" as elements carrying nodeValue
      const texts = [];
      (function walk(el){ if(el.textContent){ texts.push(el); } (el.children||[]).forEach(walk); })(root);
      let i = -1;
      return { nextNode(){ i++; return i < texts.length ? texts[i] : null; } };
    },
    addEventListener(){},
  };
  const PhaserStub = {
    Math: {
      Between: (min,max)=> Math.floor(Math.random()*(max-min+1))+min,
      Clamp: (v,min,max)=> Math.max(min, Math.min(max, v)),
      Distance: { Between: (x1,y1,x2,y2)=> Math.hypot(x2-x1,y2-y1) },
      Angle: { Between: (x1,y1,x2,y2)=> Math.atan2(y2-y1,x2-x1) },
      DegToRad: (deg)=> deg * Math.PI / 180,
    },
    Scene: class {},
    Textures: { Events: { ADD: 'addtexture' } },
    AUTO: 1,
    Game: class { constructor(cfg){ this.cfg = cfg; } },
  };
  const sandbox = {
    console, setTimeout, clearTimeout, Math, NodeFilter: { SHOW_TEXT: 4 },
    Image: class { set onload(fn){ this._fn=fn; } set src(v){ if(this._fn) this._fn(); } },
    Phaser: PhaserStub, document: documentStub,
    window: { addEventListener(){} }, location: { reload(){} },
  };
  sandbox.window.Image = sandbox.Image;
  vm.createContext(sandbox);
  vm.runInContext(baseSrc, sandbox, {filename:'game.js'});
  return sandbox;
}

function fakeSprite(){
  const o = { x:0,y:0, width:0, fillColor:0, frame:null, _tint:null, _alpha:1, _visible:true };
  for(const m of ['setPosition','setRotation','setDepth','setOrigin','setStrokeStyle','setDisplaySize','setAngle','setScale']) o[m]=()=>o;
  o.setAlpha=(a)=>{o._alpha=a;return o;};
  o.setVisible=(v)=>{o._visible=v;return o;};
  o.setTint=(t)=>{o._tint=t;return o;}; o.clearTint=()=>{o._tint=null;return o;};
  o.setFrame=(f)=>{o.frame=f;return o;}; o.destroy=()=>{o._destroyed=true;};
  return o;
}
function makeScene(sandbox){
  const scene = {
    add: { image: (x,y,key,frame)=> { const s = fakeSprite(); s.frame = frame; return s; }, rectangle: ()=> fakeSprite(), ellipse: ()=> fakeSprite(),
           text: ()=> fakeSprite(), group: ()=> ({ add(){} }) },
    buildingLayerGroup: { add(){} }, tileLayerGroup: { add(){} },
    tweens: { add:(cfg)=>{ if(cfg.onComplete) cfg.onComplete(); return {stop(){}}; } },
    cameras: { main: { pan(){} } },
    townHallPos: null, cancelBuildMode(){}, ghost: null,
  };
  sandbox.__setScene(scene);
  return scene;
}

let failures = [];
let passes = 0;
function assert(cond, msg){ if(!cond){ failures.push(msg); console.log('  FAIL: '+msg); } else { passes++; console.log('  ok: '+msg); } }

// helper: find a grass tile with an adjacent free grass tile, far from water
function findGrass(T, nearX, nearY, radius){
  for(let r=0;r<radius;r++){
    for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      const x=nearX+dx, y=nearY+dy;
      if(T.inBounds(x,y) && T.tileAt(x,y)==='grass' && !T.occAt(x,y)) return {x,y};
    }
  }
  return null;
}

// =====================================================================
console.log('================ HUMAN MODE (regression) ================');
{
  const sb = makeSandbox();
  const T = sb.__test;
  const scene = makeScene(sb);
  T.applyFaction('human');
  const {cx, cy} = T.generateMap();
  scene.townHallPos = {gx:cx, gy:cy};
  const th = T.createBuilding('town_hall_core', cx, cy, {name:'Town Hall', hp:500, frame:'town_hall', size:2});
  th.isCore = true; th.level = 1;
  T.initCreep();

  assert(T.state.faction==='human', 'faction is human');
  assert(T.BUILD_DEFS.lumber_camp.name==='Lumber Camp', 'lumber camp keeps its human name');
  assert(T.BUILD_DEFS.creep_tumor===undefined, 'no creep tumor in the human build set');
  assert(T.CARRY.lumber_camp.key==='wood', 'lumber camps still haul wood');
  assert(T.BUILD_CATEGORIES.length===4, 'four human build tabs');
  assert(T.SWORDSMAN_COST.wood===10 && T.SWORDSMAN_COST.stone===5, 'swordsman still costs wood+stone');

  // humans can build off-creep (creep grid is all false and must not gate them)
  const g = findGrass(T, cx+3, cy, 8);
  T.state.resources.wood = 500; T.state.resources.stone = 500;
  assert(g && T.isPlacementValid('farm', g.x, g.y), 'human farm placement valid on plain grass (no creep requirement)');

  // no drone consumed on human build
  for(let i=0;i<3;i++){ const s=T.findFreeSpotNear(cx,cy,4); T.createVillager(s.gx,s.gy); }
  const unitsBefore = T.state.units.length;
  T.tryPlaceBuilding('farm', g.x, g.y);
  assert(T.state.units.length===unitsBefore, 'no villager consumed by human construction');
  assert(T.state.buildings.some(b=>b.type==='farm'), 'farm actually placed');

  // human swordsman keeps full HP
  const sw = T.createSwordsman(cx+1, cy+3);
  assert(sw.hp===70, 'human swordsman has 70 HP');
  assert(sw.sprite.frame===T.FRAME.enemy_swordsman, 'human swordsman still renders as the original bipedal frame, untouched by the zergling redesign');
  const humanArcher = T.createArcher(cx+2, cy+4);
  assert(humanArcher.sprite.frame===T.FRAME.archer, 'human archer still renders as the original bow-wielding frame, untouched by the spitter redesign');

  // banner text is NOT skinned for humans
  assert(T.applySkinText('A new villager joins the town!')==='A new villager joins the town!', 'skin text is a no-op for humans');

  // human hero still gates on gold
  T.state.resources.gold = 0; T.state.resources.food = 999;
  assert(T.recruitCaptain()===false, 'no gold, no Minotaur');
  T.state.resources.gold = 100;
  assert(T.recruitCaptain()===true, 'gold buys the Minotaur');
  assert(T.VILLAGER_COST.food===30, 'human villager cost stays at 30 — untouched by the swarm drone-cost change');

  // human hero still uses FRAME.minotaur, and J still throws a real javelin
  const humanCap = T.livingCaptain();
  assert(!!humanCap.sprite && humanCap.sprite.frame===T.FRAME.minotaur, 'human hero renders as FRAME.minotaur');
  scene.input = { activePointer: {x:100,y:100} };
  scene.cameras.main.getWorldPoint = ()=> ({x: (cx+3)*T.TILE, y: cy*T.TILE});
  const projBefore = T.state.heroProjectiles.length;
  T.heroThrowJavelin();
  assert(T.state.heroProjectiles.length===projBefore+1, 'human J still launches a javelin projectile');
  assert(humanCap.javCd > 0, 'human javelin cooldown still tracked via javCd');

  // ---- upgrade guard: can't upgrade what isn't finished ----
  console.log('--- upgrade guard ---');
  T.state.resources.wood = 500; T.state.resources.stone = 500; T.state.resources.food = 500; T.state.resources.gold = 500;
  const granarySpot = findGrass(T, cx-5, cy-5, 8);
  for(let i=0;i<2;i++){ const s=T.findFreeSpotNear(cx,cy,4); T.createVillager(s.gx,s.gy); }
  T.tryPlaceBuilding('granary', granarySpot.x, granarySpot.y);
  const gran = T.state.buildings.find(b=>b.type==='granary');
  assert(!!gran, 'granary foundation placed');
  assert(gran.awaitingBuilder===true, 'granary starts awaiting a builder, same as any other placement');
  assert(T.upgradeStorageBuilding(gran)===false, 'cannot upgrade a foundation nobody has even started');
  // walk the builder there and let construction actually begin
  const granBuilder = T.state.units.find(u=>u.buildTaskId===gran.id);
  assert(!!granBuilder, 'a villager was auto-dispatched to the granary');
  granBuilder.gx = gran.gx; granBuilder.gy = gran.gy; granBuilder.moving = false;
  T.updateUnits(16);
  assert(gran.awaitingBuilder===false, 'construction started on arrival');
  assert(T.upgradeStorageBuilding(gran)===false, 'still refused — the building is mid-construction (buildMs still counting down), not finished');
  gran.buildMs = 0; // finish it
  const levelBefore = gran.level || 1;
  assert(T.upgradeStorageBuilding(gran)===true, 'upgrade starts successfully once actually complete');
  assert((gran.level||1)===levelBefore, 'the level does NOT change the instant the upgrade starts — cost is paid up front, the bonus lands later');
  assert(gran.upgradeMs===T.STORAGE_LEVELS[gran.type].upMs[levelBefore-1], 'the countdown matches the configured duration for this level exactly');
  assert(T.upgradeStorageBuilding(gran)===false, 'cannot start a second upgrade while one is already underway');
  const upgradeDuration = gran.upgradeMs;
  T.updateConstruction(upgradeDuration - 1000); // not quite there yet
  assert((gran.level||1)===levelBefore, 'still not complete with a second left on the clock');
  T.updateConstruction(1500); // now past it
  assert((gran.level||1)===levelBefore+1, 'the level bump lands once the full duration has actually elapsed');

  // Town Hall upgrades follow the exact same timed pattern
  const thRef = T.townHall();
  const thLevelBefore = thRef.level || 1;
  assert(T.upgradeTownCenter(thRef)===true, 'Town Hall upgrade starts');
  assert((thRef.level||1)===thLevelBefore, 'Town Hall level unchanged the instant it starts');
  assert(thRef.upgradeMs > 0, 'Town Hall upgrade is on a real timer too');
  T.updateConstruction(thRef.upgradeMs + 1000);
  assert(thRef.level===thLevelBefore+1, 'Town Hall level bump lands once its own timer elapses');

  // ---- water blocks everyone now, no exceptions ----
  console.log('--- water blocking ---');
  const wx = cx+10, wy = cy-10;
  T.state.grid[wy][wx] = 'water';
  const villager2 = T.state.units.find(u=>u.type==='villager' && u.hp>0);
  villager2.gx = wx-1; villager2.gy = wy; villager2.tx = wx; villager2.ty = wy; villager2.moving = true;
  T.updateUnits(2000);
  assert(Math.round(villager2.gx)!==wx || Math.round(villager2.gy)!==wy, 'a villager can no longer cross water — the old "goat path" exception is gone');
  assert(villager2.moving===false, 'movement halts at the waters edge rather than oscillating forever');
  const sw2 = T.createSwordsman(wx-1, wy);
  sw2.tx = wx; sw2.ty = wy; sw2.moving = true;
  T.updateUnits(2000);
  assert(Math.round(sw2.gx)!==wx || Math.round(sw2.gy)!==wy, 'a swordsman is (still, as before) blocked by water');

  // ---- walls block friendly movement; gates do not; builders are exempt from their own site ----
  console.log('--- walls & gates ---');
  const wallSpot = findGrass(T, cx+6, cy+6, 6);
  T.tryPlaceBuilding('wall', wallSpot.x, wallSpot.y);
  const wallB = T.state.buildings.find(b=>b.gx===wallSpot.x && b.gy===wallSpot.y && b.type==='wall');
  assert(!!wallB, 'wall placed');
  const soldier = T.createSwordsman(wallSpot.x-1, wallSpot.y);
  soldier.tx = wallSpot.x; soldier.ty = wallSpot.y; soldier.moving = true;
  T.updateUnits(2000);
  assert(!(Math.round(soldier.gx)===wallSpot.x && Math.round(soldier.gy)===wallSpot.y), 'a soldier cannot walk through a wall — friendly units are blocked too now');

  const gateSpot = findGrass(T, cx+8, cy+6, 6);
  T.tryPlaceBuilding('gate', gateSpot.x, gateSpot.y);
  const gateB = T.state.buildings.find(b=>b.gx===gateSpot.x && b.gy===gateSpot.y && b.type==='gate');
  assert(!!gateB, 'gate placed');
  const soldier2 = T.createSwordsman(gateSpot.x-1, gateSpot.y);
  soldier2.tx = gateSpot.x; soldier2.ty = gateSpot.y; soldier2.moving = true;
  T.updateUnits(2000);
  assert(Math.round(soldier2.gx)===gateSpot.x && Math.round(soldier2.gy)===gateSpot.y, 'a gate lets friendly units through even though it blocks the same as a wall for enemies');

  // the specific builder walking to construct a wall must not be blocked BY that same unfinished wall
  const wallSpot2 = findGrass(T, cx-6, cy+6, 6);
  T.tryPlaceBuilding('wall', wallSpot2.x, wallSpot2.y);
  const wallB2 = T.state.buildings.find(b=>b.gx===wallSpot2.x && b.gy===wallSpot2.y && b.type==='wall');
  const wallBuilder = T.state.units.find(u=>u.buildTaskId===wallB2.id);
  assert(!!wallBuilder, 'a villager was dispatched to build the new wall');
  wallBuilder.gx = wallSpot2.x-1; wallBuilder.gy = wallSpot2.y; wallBuilder.moving = true;
  T.updateUnits(2000);
  assert(Math.round(wallBuilder.gx)===wallSpot2.x && Math.round(wallBuilder.gy)===wallSpot2.y, 'the builder reaches their OWN wall site without being blocked by the wall they are about to build');

  // ---- Wildstone: deposits, the auto-camp, and gathering ----
  console.log('--- wildstone deposits & the Refinery ---');
  assert(Array.isArray(T.state._wildstoneSites) && T.state._wildstoneSites.length>0, 'generateMap placed at least one wildstone deposit');
  const wsSite = T.state._wildstoneSites[0];
  assert(T.state.grid[wsSite.gy][wsSite.gx]==='wildstone_deposit', 'the tile is really a wildstone deposit in the data layer');
  assert(!T.state.buildings.some(b=>b.type==='wildstone_refinery'), 'no auto-generated site exists anymore — nothing gets built without the player');

  // gated behind Town Hall level 3
  T.state.resources.wood=500; T.state.resources.stone=500;
  th.level = 1;
  assert(T.isPlacementValid('wildstone_refinery', wsSite.gx, wsSite.gy)===false, 'Refinery is refused before Town Hall level 3');
  T.tryPlaceBuilding('wildstone_refinery', wsSite.gx, wsSite.gy);
  assert(!T.state.buildings.some(b=>b.type==='wildstone_refinery'), 'placement attempt at TC1 does nothing');
  th.level = 3;
  assert(T.isPlacementValid('wildstone_refinery', wsSite.gx, wsSite.gy)===true, 'Refinery is allowed once Town Hall reaches level 3');

  // can ONLY go on the deposit, and the deposit can ONLY take the Refinery
  const farGrass = findGrass(T, cx+12, cy, 20);
  assert(farGrass && T.isPlacementValid('wildstone_refinery', farGrass.x, farGrass.y)===false, 'Refinery cannot be built on plain grass — it has to sit on the vein itself');
  assert(T.isPlacementValid('farm', wsSite.gx, wsSite.gy)===false, 'nothing else can be built on a wildstone deposit — only the Refinery belongs there');

  // placing it costs real resources and goes through the normal walk-to-build flow now
  const woodBefore = T.state.resources.wood, stoneBefore = T.state.resources.stone;
  T.tryPlaceBuilding('wildstone_refinery', wsSite.gx, wsSite.gy);
  const refinery = T.state.buildings.find(b=>b.type==='wildstone_refinery');
  assert(!!refinery, 'Refinery placed once gated and validly located');
  assert(T.state.resources.wood < woodBefore && T.state.resources.stone < stoneBefore, 'it actually costs wood and stone, unlike the old free auto-camp');
  assert(refinery.awaitingBuilder===true, 'it goes through the SAME walk-to-build flow as every other building now — not instantly complete');

  // walk a builder over and let it finish, matching how any other building works
  T.autoAssignIdleVillagers();
  const refBuilder = T.state.units.find(u=>u.buildTaskId===refinery.id);
  assert(!!refBuilder, 'a builder was auto-dispatched to the Refinery, same as any other foundation');
  refBuilder.gx = refinery.gx; refBuilder.gy = refinery.gy; refBuilder.moving = false;
  T.updateUnits(16);
  assert(refinery.awaitingBuilder===false, 'construction started on arrival');
  refinery.buildMs = 0; // finish it

  // NOW it staffs completely normally — no more special exclusion
  for(let i=0;i<3;i++){ const s=T.findFreeSpotNear(cx,cy,4); T.createVillager(s.gx,s.gy); }
  T.autoAssignIdleVillagers();
  const refWorker = T.state.units.find(u=>u.assignedBuildingId===refinery.id);
  assert(!!refWorker, 'idle villagers now DO get auto-assigned to the Refinery — it is a normal building, not raw exposed crystal anymore');

  // run the full walk-out/harvest/walk-home cycle and confirm real income.
  // Start the worker AT the refinery rather than wherever they happened to
  // spawn — deposits are deliberately placed far from the town center, so
  // a full walk from spawn is a distance/timing test (covered elsewhere),
  // not what this assertion is actually checking (does gathering work).
  refWorker.gx = refinery.gx; refWorker.gy = refinery.gy;
  const wildstoneBefore = T.state.resources.wildstone;
  for(let i=0;i<200;i++) T.updateUnits(200);
  assert(T.state.resources.wildstone > wildstoneBefore, 'gathering wildstone actually banks it into the global pool ('+wildstoneBefore+' -> '+T.state.resources.wildstone+')');

  assert(T.storageCapFor('wildstone')===T.WILDSTONE_CAP, 'wildstone has its own small fixed cap, not the scaling storage-base');
  assert(T.fmtCost({wildstone:15, wood:40}).includes('Wild'), 'wildstone is labeled unambiguously in cost strings, not colliding with wood\u2019s "W"');

  // ---- pickWorkerFor: the actual bug report ----
  // "I have a villager selected, I place a building, and someone from
  // across the map goes to build it instead." This tests the fix directly,
  // not just incidentally through a dispatch flow.
  console.log('--- pickWorkerFor priority ---');
  const jobSite = { gx: cx+15, gy: cy-10 };
  const closeVillager = T.createVillager(jobSite.gx+1, jobSite.gy); // right next to the job
  const farVillager = T.createVillager(cx-15, cy+15); // literally across the map

  T.state.selected = { type:'unit', ref: farVillager };
  const pickWhenFarSelected = T.pickWorkerFor(jobSite);
  assert(pickWhenFarSelected===farVillager, 'the SELECTED villager wins even though a much closer one is free — this is the actual fix for the reported bug');

  T.state.selected = null; // deselect
  const pickWhenNoneSelected = T.pickWorkerFor(jobSite);
  assert(pickWhenNoneSelected===closeVillager, 'with nothing selected, the NEAREST free villager wins — not array order, not whoever was picked last time');

  // a selected villager that's already busy doesn't get force-picked —
  // falls through to the normal pool instead
  farVillager.assignedBuildingId = 999; // pretend they're already working somewhere
  T.state.selected = { type:'unit', ref: farVillager };
  const pickWhenSelectedIsBusy = T.pickWorkerFor(jobSite);
  assert(pickWhenSelectedIsBusy===closeVillager, 'a selected-but-busy villager is skipped in favor of the nearest free one');
  farVillager.assignedBuildingId = null;

  // garrisoned villagers are never picked, selected or not
  T.state.selected = { type:'unit', ref: closeVillager };
  closeVillager.inTC = true;
  const pickWhenSelectedIsGarrisoned = T.pickWorkerFor(jobSite);
  assert(pickWhenSelectedIsGarrisoned!==closeVillager, 'a garrisoned villager is never picked, even while selected');
  closeVillager.inTC = false;
  T.state.selected = null;

  // ---- unit evolutions (human side) ----
  console.log('--- evolutions (human) ---');
  assert(T.canStartUnitEvolution('swordsman')===true, 'swordsman evolution is available from the start');
  T.state.resources.wildstone = 0;
  assert(T.startUnitEvolution('swordsman')===false, 'cannot start without enough wildstone');
  T.state.resources.wildstone = 100; T.state.resources.wood=500; T.state.resources.stone=500;
  const hpBonusH = T.EVOLUTIONS.swordsman.hpBonus, dmgBonusH = T.EVOLUTIONS.swordsman.dmgBonus;
  const wildstoneBeforeEvo = T.state.resources.wildstone;
  assert(T.startUnitEvolution('swordsman')===true, 'evolution starts with sufficient resources');
  assert(T.state.resources.wildstone < wildstoneBeforeEvo, 'wildstone was actually spent');
  assert(T.state.evolutions.swordsman===false, 'not yet researched — it takes time');
  assert(T.startUnitEvolution('archer')===false, 'cannot start a second evolution while one is already underway, even a different type');

  const existingSwordsman = T.createSwordsman(cx+1, cy+9);
  const maxHpBefore = existingSwordsman.maxHp;
  const hpBefore = existingSwordsman.hp;
  const dmgBefore = T.SWORDSMAN_ATTACK.damage;
  const hpConstBefore = T.SWORDSMAN_HP;
  const msTotal = T.state.evolutionInProgress.msRemaining;
  T.updateUnitEvolution(msTotal - 1000);
  assert(T.state.evolutions.swordsman===false, 'still not complete with a second left');
  T.updateUnitEvolution(1500);
  assert(T.state.evolutions.swordsman===true, 'completes once the full duration elapses');
  assert(existingSwordsman.maxHp===maxHpBefore+hpBonusH, 'an ALREADY-ALIVE swordsman gets the HP bonus retroactively');
  assert(existingSwordsman.hp===hpBefore+hpBonusH, 'their current hp rose by the same amount, not just the max');
  assert(T.SWORDSMAN_ATTACK.damage===dmgBefore+dmgBonusH, 'the shared damage constant increased — future AND existing swordsmen read from it');
  assert(T.SWORDSMAN_HP===hpConstBefore+hpBonusH, 'the base HP constant increased for units trained after this point');
  const newSwordsman = T.createSwordsman(cx+2, cy+9);
  assert(newSwordsman.maxHp===hpConstBefore+hpBonusH, 'a swordsman trained AFTER completion is born with the evolved HP baked in');

  // archer evolution has a different bonus shape (damage+range, no HP) — confirm that distinction holds
  T.state.resources.wildstone = 100;
  const existingArcher = T.createArcher(cx+3, cy+9);
  const archerHpBefore = existingArcher.maxHp;
  T.startUnitEvolution('archer');
  T.updateUnitEvolution(T.state.evolutionInProgress.msRemaining + 1000);
  assert(existingArcher.maxHp===archerHpBefore, 'archer evolution has zero HP bonus by design — existing archers HP is untouched');
  assert(T.ARCHER_ATTACK.damage===6+3, 'archer damage bonus applied to the shared constant');
  assert(T.ARCHER_ATTACK.range===3.5+0.5, 'archer range bonus applied too');
}

// =====================================================================
console.log('================ SWARM MODE (features) ================');
{
  const sb = makeSandbox();
  const T = sb.__test;
  const scene = makeScene(sb);
  T.applyFaction('swarm');

  // ---- faction patch ----
  console.log('--- faction patch ---');
  assert(T.state.faction==='swarm', 'faction is swarm');
  assert(T.BUILD_DEFS.lumber_camp.name==='Feeding Pit', 'lumber camp became the Feeding Pit');
  assert(T.CARRY.lumber_camp.key==='food', 'feeding pits haul biomass (food slot)');
  assert(T.BUILD_DEFS.creep_tumor && T.BUILD_DEFS.creep_tumor.popCap===2, 'creep tumor exists, +2 brood cap');
  assert(T.BUILD_CATEGORIES.length===3, 'three swarm build tabs');
  assert(T.SWORDSMAN_COST.wood===undefined && T.SWORDSMAN_COST.stone===undefined, 'zergling cost has no wood/stone');
  assert(T.SWORDSMAN_COST.food===T.SWARM.zergling.cost.food, 'zergling costs pure biomass');
  assert(T.VILLAGER_COST.food===T.SWARM.drone.cost, 'drone cost dropped to the swarm-specific value');
  assert(T.VILLAGER_COST.food < T.BUILD_DEFS.creep_tumor.cost.food, 'a drone now costs LESS than even the cheapest structure it might morph into');
  assert(T.applySkinText('A new villager joins the town!')==='A Drone wriggles out of the Hive!', 'banner copy re-themes');
  assert(T.applySkinText('Bandit camp destroyed!').includes('Human outpost'), 'camps become human outposts in copy');

  // ---- world boot: hive + creep seed (mirrors startWorld) ----
  console.log('--- creep ---');
  const {cx, cy} = T.generateMap();
  scene.townHallPos = {gx:cx, gy:cy};
  // mimic MainScene.drawMap(): give every tile a real (fake) sprite so
  // claimCreepTile's setFrame/clearTint calls have something to act on
  for(let y=0;y<T.MAP_H;y++) for(let x=0;x<T.MAP_W;x++) T.state.tileSprites[y][x] = fakeSprite();
  const th = T.createBuilding('town_hall_core', cx, cy, {name:'Hive', hp:500, frame:'town_hall', size:2, tint:0xb478ff});
  th.isCore = true; th.level = 1;
  T.initCreep();
  for(let dy=-4; dy<=4; dy++) for(let dx=-4; dx<=4; dx++){
    if(Math.hypot(dx,dy) <= 4) T.claimCreepTile(cx+dx, cy+dy); // matches the game's own (now circular) seed
  }
  assert(T.isCreeped(cx+2, cy+2), 'seed creep claimed around the hive'); // dist ~2.83, well inside radius 4
  assert(!T.isCreeped(cx+9, cy+9), 'far ground is not yet creeped');
  assert(T.state._creepCount > 40, 'creep count tracked ('+T.state._creepCount+' tiles)');
  // a corner that WOULD be in-range under the old square (Chebyshev) rule
  // but is OUTSIDE the circular (Euclidean) one — proves the shape actually
  // changed, not just "didn't overflow"
  assert(!T.isCreeped(cx+4, cy+4), 'corner beyond the circular radius is excluded (old square logic would have claimed it)');

  // creep is a dedicated texture now, not a tint on the grass sprite
  const creepTileSpr = T.state.tileSprites[cy+2][cx+2];
  assert(creepTileSpr.frame===T.FRAME.creep, 'creeped tile renders FRAME.creep, not a tint');
  assert(creepTileSpr._tint===null, 'no runtime tint applied — color is baked into the texture');

  // creep spreads outward but respects hive radius, CIRCULARLY
  const before = T.state._creepCount;
  for(let i=0;i<30;i++) T.updateCreep();
  assert(T.state._creepCount > before, 'creep grows over pulses ('+before+' -> '+T.state._creepCount+')');
  const r = T.SWARM.creep.hiveRadius[0];
  let outOfRange = false;
  for(let y=0;y<T.MAP_H;y++) for(let x=0;x<T.MAP_W;x++){
    if(T.isCreeped(x,y) && Math.hypot(x-cx,y-cy) > Math.max(r,4)+0.5) outOfRange = true;
  }
  assert(!outOfRange, 'creep stays within the CIRCULAR hive radius (no tumors yet)');

  // ---- resources are corrupted, not erased, by creep ----
  console.log('--- corrupted resources ---');
  // pick tiles just beyond the current creep zone, force them into known
  // resource states, and claim them deterministically (not via the random
  // pulse) so this test doesn't depend on where generateMap() happened to
  // scatter forests/stone this run
  const fx = cx+7, fy = cy;
  T.state.grid[fy][fx] = 'forest';
  T.state.resourceQty[fy][fx] = 40;
  T.state.tileSprites[fy][fx] = fakeSprite();
  assert(!T.isCreeped(fx,fy), 'sanity: test forest tile starts outside creep');
  T.claimCreepTile(fx, fy);
  assert(T.state.tileSprites[fy][fx].frame===T.FRAME.forest_corrupted, 'creeped forest shows the corrupted-forest frame, not bare creep');
  assert(T.state.grid[fy][fx]==='forest', 'the tile is still logically a forest — creep did not consume it');
  assert(T.state.resourceQty[fy][fx]===40, 'resource quantity untouched by creep claiming the tile');

  const sx = cx-7, sy = cy;
  T.state.grid[sy][sx] = 'stone_deposit';
  T.state.resourceQty[sy][sx] = 25;
  T.state.tileSprites[sy][sx] = fakeSprite();
  T.claimCreepTile(sx, sy);
  assert(T.state.tileSprites[sy][sx].frame===T.FRAME.stone_deposit_corrupted, 'creeped stone deposit shows the corrupted-stone frame');
  assert(T.state.resourceQty[sy][sx]===25, 'stone quantity untouched by creep claiming the tile');

  // this is the actual reported bug: a wildstone deposit visually vanished
  // (fell through to bare creep) when creep reached it, since
  // frameForGroundTile only ever knew about forest/stone_deposit
  const wx2 = cx, wy2 = cy-9;
  T.state.grid[wy2][wx2] = 'wildstone_deposit';
  T.state.resourceQty[wy2][wx2] = 50;
  T.state.tileSprites[wy2][wx2] = fakeSprite();
  assert(!T.isCreeped(wx2,wy2), 'sanity: test wildstone tile starts outside creep');
  T.claimCreepTile(wx2, wy2);
  assert(T.state.tileSprites[wy2][wx2].frame===T.FRAME.wildstone_deposit_corrupted, 'creeped wildstone shows its own corrupted frame — it no longer disappears into bare creep');
  assert(T.state.tileSprites[wy2][wx2].frame!==T.FRAME.creep, 'explicitly NOT the bare-creep frame — this is the exact bug that was reported');
  assert(T.state.grid[wy2][wx2]==='wildstone_deposit', 'the tile is still logically a wildstone deposit — still buildable and harvestable');
  assert(T.state.resourceQty[wy2][wx2]===50, 'wildstone quantity untouched by creep claiming the tile');

  // once fully harvested, a creeped resource tile reverts to bare CREEP —
  // not raw grass/dirt, which would be a visual regression (de-corrupting
  // on depletion even though the tile is still deep in swarm territory)
  T.depleteResourceTile(fx, fy, 999);
  assert(T.state.grid[fy][fx]==='grass', 'depleted forest reverts to grass in the data layer');
  assert(T.state.tileSprites[fy][fx].frame===T.FRAME.creep, 'but the SPRITE shows bare creep, not plain grass, since the tile is still creeped');

  T.depleteResourceTile(wx2, wy2, 999);
  assert(T.state.tileSprites[wy2][wx2].frame===T.FRAME.creep, 'a fully-depleted, still-creeped wildstone tile correctly falls back to bare creep too');


  // ---- placement: creep-gated, morphs from a drone (now via walk-then-morph) ----
  console.log('--- morph building (walk-to-build) ---');
  T.state.resources.food = 500;
  const near = findGrass(T, cx+2, cy+2, 4);
  const far  = findGrass(T, cx+12, cy, 20);
  assert(far && !T.isPlacementValid('creep_tumor', far.x, far.y), 'cannot grow structures off-creep');
  // no drones yet -> morph refused even on creep
  const bCountA = T.state.buildings.length;
  T.tryPlaceBuilding('creep_tumor', near.x, near.y);
  assert(T.state.buildings.length===bCountA, 'no free drone -> no morph');
  // with drones: placement dispatches one to WALK there — it is NOT
  // consumed yet. This is the new behavior request #2 introduced.
  for(let i=0;i<3;i++){ const s=T.findFreeSpotNear(cx,cy,4); T.createVillager(s.gx,s.gy); }
  const dronesBefore = T.state.units.filter(u=>u.type==='villager').length;
  T.tryPlaceBuilding('creep_tumor', near.x, near.y);
  const dronesRightAfterPlacement = T.state.units.filter(u=>u.type==='villager').length;
  assert(T.state.buildings.some(b=>b.type==='creep_tumor'), 'tumor foundation placed onto creep');
  assert(dronesRightAfterPlacement===dronesBefore, 'the drone is NOT consumed at the moment of placement — it must walk there first');
  const tumor = T.state.buildings.find(b=>b.type==='creep_tumor');
  assert(tumor.awaitingBuilder===true, 'the foundation sits awaiting its builder');
  assert(tumor.sprite._alpha===0.3, 'the foundation renders fainter than an active build site');
  const walker = T.state.units.find(u=>u.buildTaskId===tumor.id);
  assert(!!walker && walker.type==='villager', 'a specific drone was tasked to walk to the site');
  assert(walker.tx===tumor.gx && walker.ty===tumor.gy && walker.moving===true, 'that drone is walking straight to the exact tile');
  // buildMs must not move at all while awaiting — not even a partial tick
  const buildMsBefore = tumor.buildMs;
  T.updateConstruction(99999);
  assert(tumor.buildMs===buildMsBefore, 'construction does not progress one bit while awaiting a builder');

  // simulate arrival: the drone reaches the tile, and updateUnits resolves the morph
  walker.gx = tumor.gx; walker.gy = tumor.gy; walker.moving = false;
  const dronesBeforeArrival = T.state.units.filter(u=>u.type==='villager').length;
  T.updateUnits(16);
  const dronesAfterArrival = T.state.units.filter(u=>u.type==='villager').length;
  assert(dronesAfterArrival===dronesBeforeArrival-1, 'the drone dissolves into the growth exactly on arrival, not before');
  assert(tumor.awaitingBuilder===false, 'construction begins the instant the builder arrives');
  assert(tumor.sprite._alpha===0.55, 'the foundation now renders at the normal in-progress alpha');

  // tumor extends creep reach once built
  tumor.buildMs = 0; // finish construction
  assert(T.creepSources().length===2, 'hive + finished tumor both exude creep');

  // ---- morph dispatch respects selection too (a third, separate call site) ----
  console.log('--- morph dispatch respects selection ---');
  const morphSpot = findGrass(T, cx-3, cy+2, 4);
  T.claimCreepTile(morphSpot.x, morphSpot.y);
  const closeDrone = T.createVillager(morphSpot.x+1, morphSpot.y);
  const farDrone = T.createVillager(cx+16, cy-16);
  T.state.selected = { type:'unit', ref: farDrone };
  const dronesCountBefore = T.state.units.filter(u=>u.type==='villager').length;
  T.tryPlaceBuilding('creep_tumor', morphSpot.x, morphSpot.y);
  assert(farDrone.buildTaskId!=null, 'the SELECTED (distant) drone was dispatched to walk over and morph, not the closer unselected one');
  assert(closeDrone.buildTaskId==null, 'the closer, unselected drone was left alone');
  T.state.selected = null;

  // ---- biomass economy ----
  console.log('--- biomass economy ---');
  // hauling: a feeding-pit drone banking a load adds biomass (stay under the storage cap)
  T.state.resources.food = 40;
  const foodA = T.state.resources.food;
  const hauler = T.state.units.find(u=>u.type==='villager');
  hauler.carrying = { key:'food', amt:6 };
  T.bankCarry(hauler, {gx:cx, gy:cy});
  assert(T.state.resources.food > foodA, 'banked forest haul lands in the biomass pool');
  assert(T.storageCapFor('food') >= T.state.resources.food, 'biomass respects the storage cap ('+T.storageCapFor('food')+')');

  // passive creep income inside economyTick (start well under cap)
  T.state.resources.food = 40;
  const creepIncome = T.state._creepCount * T.SWARM.creep.incomePerTilePerTick;
  const civies = T.state.units.filter(u=>u.type==='villager'&&u.hp>0).length;
  T.economyTick();
  const expected = 40 + creepIncome - civies*0.5 - T.state.buildings.filter(b=>b.hp>0&&!b.isCore).length*T.SWARM.upkeepPerBuildingPerTick;
  assert(Math.abs(T.state.resources.food - expected) < 0.5, 'tick applies creep income + eating + biomass upkeep ('+T.state.resources.food.toFixed(2)+' ~ '+expected.toFixed(2)+')');

  // corpse biomass: a dead human dissolves where it falls
  T.state.resources.food = 40;
  const foodB = T.state.resources.food;
  T.spawnEnemy(10, 2, 1, null, {gx:cx+2, gy:cy-2});
  const e = T.state.enemies[T.state.enemies.length-1];
  assert(!!e, 'enemy spawned into state');
  e.hp = 0;
  T.updateEnemies(16);
  assert(T.state.resources.food >= foodB + T.SWARM.corpseBiomass - 0.01, 'corpse dissolved into +'+T.SWARM.corpseBiomass+' biomass');

  // ---- hive units ----
  console.log('--- broods ---');
  const z = T.createSwordsman(cx+1, cy+3);
  assert(z.hp===T.SWARM.zergling.hp, 'zergling hatches with swarm HP ('+z.hp+')');
  assert(z.sprite.frame===T.FRAME.zergling_quad, 'zergling renders as the quadruped frame, not the reskinned human swordsman');
  const spitterUnit = T.createArcher(cx+3, cy-2);
  assert(spitterUnit.sprite.frame===T.FRAME.spitter_naga, 'spitter renders as the naga/cobra/alien frame, not the reskinned human archer');
  T.removeUnit(z);

  // zergling pair from one production run
  T.state.resources.food = 500;
  const pool = T.createBuilding('barracks', near.x+1, near.y);
  pool.buildMs = 0;
  const swBefore = T.state.units.filter(u=>u.type==='swordsman').length;
  assert(T.trainSoldier(pool, 'swordsman')===true, 'spawning pool accepts a zergling order (consumes a drone)');
  T.updateProduction(999999);
  const swAfter = T.state.units.filter(u=>u.type==='swordsman').length;
  assert(swAfter===swBefore+2, 'one order births TWO zerglings');

  // ---- the Broodmother ----
  console.log('--- broodmother ---');
  T.state.resources.gold = 0;              // she costs no gold...
  T.state.resources.food = 200;            // ...only biomass
  assert(T.recruitCaptain()===true, 'Broodmother born of biomass, gold untouched at 0');
  const cap = T.livingCaptain();
  assert(!!cap, 'she lives');
  assert(cap.sprite.frame===T.FRAME.broodmother, 'Broodmother renders as her own FRAME.broodmother, not a tinted minotaur');

  // J is now a ranged, mouse-aimed web shot — like the human javelin, but
  // it also applies a temporary movement slow on hit
  const webTargetGy = Math.round(cap.gy);
  const webTargetGx = Math.round(cap.gx) + 3;
  scene.input = { activePointer: {x:100,y:100} };
  // heroThrowJavelin computes txf = wp.x/TILE - 0.5, so add the +0.5 tile-
  // center offset here to aim EXACTLY at the target tile, not just near it
  scene.cameras.main.getWorldPoint = ()=> ({x: (webTargetGx+0.5)*T.TILE, y: (webTargetGy+0.5)*T.TILE});
  T.spawnEnemy(50, 2, 1, null, {gx: webTargetGx, gy: webTargetGy});
  const target = T.state.enemies[T.state.enemies.length-1];
  const hpBefore = target.hp;
  const projCountBefore = T.state.heroProjectiles.length;
  T.heroThrowJavelin(); // dispatches to the swarm's ranged-web branch internally
  assert(T.state.heroProjectiles.length===projCountBefore+1, 'web shot launches a real projectile — this is ranged, not melee');
  assert(T.state.heroProjectiles[T.state.heroProjectiles.length-1].kind==='web', 'the projectile is tagged as a web shot');
  assert(cap.webCd > 0, 'web shot is now on cooldown');
  for(let i=0;i<60;i++) T.updateHeroCombat(16); // ~1s of realistic 60fps ticks, not one tunneling jump
  assert(target.hp < hpBefore, 'web shot damaged the target ('+hpBefore+' -> '+target.hp+')');
  assert(target.hp === hpBefore - T.heroWebDmg(), 'damage matches heroWebDmg() exactly');
  assert(target.webSlowMs > 0, 'the hit applied the temporary slow');
  assert(target.sprite._tint===0xbfe8ff, 'the slowed target gets the pale web-strand tint');

  // the slow actually reduces movement speed
  target.path = [{gx: webTargetGx-1, gy: webTargetGy}];
  target.pathIdx = 0;
  const gxBeforeMove = target.gx;
  T.updateEnemies(1000);
  const slowedMoveDist = Math.abs(target.gx - gxBeforeMove);
  target.webSlowMs = 0; target.gx = webTargetGx; // reset and compare unslowed
  T.updateEnemies(1000);
  const unslowedMoveDist = Math.abs(target.gx - gxBeforeMove);
  assert(slowedMoveDist < unslowedMoveDist, 'slowed movement ('+slowedMoveDist.toFixed(3)+') is measurably less than unslowed ('+unslowedMoveDist.toFixed(3)+')');
  assert(Math.abs(slowedMoveDist/unslowedMoveDist - T.HERO.web.slowFactor) < 0.01, 'the ratio matches the configured 20% slow exactly');

  // cooldown gates a second shot — compare against the count NOW, since
  // the first projectile already hit and was correctly filtered out of
  // state.heroProjectiles during the 60-tick travel loop above
  const hpAfterFirst = target.hp;
  const countBeforeSecondAttempt = T.state.heroProjectiles.length;
  T.heroThrowJavelin();
  assert(T.state.heroProjectiles.length===countBeforeSecondAttempt, 'second shot blocked by cooldown — no new projectile');
  assert(target.hp===hpAfterFirst, 'no additional damage from the blocked second attempt');

  const unitsBefore = T.state.units.length;
  T.heroSlash(); // K = birth burst in swarm mode
  const born = T.state.units.length - unitsBefore;
  assert(born===T.SWARM.broodmother.burstCount, 'K births '+T.SWARM.broodmother.burstCount+' broodlings');
  assert(T.state.units.filter(u=>u.expireMs!==undefined).length===born, 'broodlings carry lifespans');
  // they dissolve when their time runs out
  T.updateUnits(T.SWARM.broodmother.burstLifeMs + 1000);
  assert(T.state.units.filter(u=>u.expireMs!==undefined).length===0, 'broodlings dissolve back into the creep');
  // and the burst respects its cooldown
  const unitsNow = T.state.units.length;
  T.heroSlash();
  assert(T.state.units.length===unitsNow, 'birth burst is cooldown-gated');

  // ---- outpost feast ----
  console.log('--- outpost feast ---');
  T.state.resources.food = 10;
  const foodC = T.state.resources.food;
  T.spawnEnemy(220, 0, 0, 'camp', {gx: cx+9, gy: cy+9});
  const camp = T.state.enemies[T.state.enemies.length-1];
  camp.hp = 0;
  T.updateEnemies(16);
  assert(T.state.resources.food >= Math.min(foodC + T.SWARM.outpostLoot, T.storageCapFor('food')) - 0.01, 'razed outpost feeds the swarm (+'+T.SWARM.outpostLoot+' biomass, storage-capped)');

  // ---- salvage is free reabsorption ----
  T.state.resources.gold = 0;
  assert(T.salvageBuilding(tumor)===true, 'swarm reabsorbs a growth with zero gold');

  // ---- salvage BUTTON UI path (not just the bare function) ----
  // This is the exact bug shape that hit the start-screen earlier:
  // salvageBuilding() was correctly updated for swarm (free), but the
  // button's own disabled/label logic in refreshInfoPanel is a SEPARATE
  // code path that read state.resources.gold < SALVAGE.goldCost
  // unconditionally — and the swarm's gold is always 0, so that left the
  // button permanently disabled no matter what building was selected.
  console.log('--- salvage button (real UI path, not the bare function) ---');
  T.state.resources.gold = 0; // true for the entire swarm run, always
  T.selectEntity('building', pool);
  const sbEl = sb.document.getElementById('salvageBtn');
  assert(sbEl.disabled === false, 'salvage button is NOT disabled for the swarm despite zero gold');
  assert(!/\dG/.test(sbEl.textContent), 'button label does not claim a gold cost that does not apply ("'+sbEl.textContent+'")');
  const buildingsBefore = T.state.buildings.length;
  sbEl._fire('click'); // the real click path: button -> listener -> salvageBuilding(ref)
  assert(T.state.buildings.length === buildingsBefore - 1, 'clicking the real salvage button actually removed the building');

  // ---- tumor auto-spread chain ----
  console.log('--- tumor auto-spread chain ---');
  const tGx = cx, tGy = cy+6;
  T.claimCreepTile(tGx, tGy);
  const gen0 = T.createBuilding('creep_tumor', tGx, tGy, T.BUILD_DEFS.creep_tumor);
  assert(gen0.creepGen===0, 'a normally-created tumor defaults to generation 0');
  assert(T.creepSources().some(s=>s.gx===tGx && s.gy===tGy && s.r===T.SWARM.creep.tumorGenRadius[0]), 'gen-0 tumor reports the base radius via creepSources()');

  // spreading costs nothing and consumes no drone
  const droneCountBefore = T.state.units.filter(u=>u.type==='villager').length;
  const foodBefore = T.state.resources.food;
  const buildCountBefore = T.state.buildings.length;
  T.trySpreadTumor(gen0);
  assert(T.state.buildings.length===buildCountBefore+1, 'trySpreadTumor grew exactly one child tumor');
  assert(T.state.units.filter(u=>u.type==='villager').length===droneCountBefore, 'spreading consumed NO drone');
  assert(T.state.resources.food===foodBefore, 'spreading cost NO biomass');
  assert(gen0.spreadDone===true, 'the parent is marked as having attempted its one spread');

  const gen1 = T.state.buildings[T.state.buildings.length-1];
  assert(gen1.type==='creep_tumor' && gen1.creepGen===1, 'the child is tagged generation 1');
  assert(!gen1.buildMs, 'the child appears fully grown — no scaffolding delay');
  assert(T.creepSources().some(s=>s.gx===gen1.gx && s.gy===gen1.gy && s.r===T.SWARM.creep.tumorGenRadius[1]), 'gen-1 child has the SMALLER radius, not the base one');
  const distFromParent = Math.hypot(gen1.gx-tGx, gen1.gy-tGy);
  assert(distFromParent <= T.SWARM.creep.tumorGenRadius[0] + 0.01, 'child landed within the parent\'s own (pre-shrink) reach');
  gen1.spreadDone = true; // already exercised via the direct trySpreadTumor call above — keep it out of the timer test below

  // the chain terminates after tumorSpreadGenerations — a gen-2 tumor does NOT spawn a gen-3
  const tGx2 = cx-8, tGy2 = cy+6;
  T.claimCreepTile(tGx2, tGy2);
  const gen2 = T.createBuilding('creep_tumor', tGx2, tGy2, T.BUILD_DEFS.creep_tumor);
  gen2.creepGen = T.SWARM.creep.tumorSpreadGenerations; // simulate being the last allowed generation
  const buildCountBeforeTerminus = T.state.buildings.length;
  T.trySpreadTumor(gen2);
  assert(T.state.buildings.length===buildCountBeforeTerminus, 'a max-generation tumor does NOT spawn a further child — the chain ends');

  // the timer gates when a spread is even attempted
  const tGx3 = cx+8, tGy3 = cy+6;
  T.claimCreepTile(tGx3, tGy3);
  const timedTumor = T.createBuilding('creep_tumor', tGx3, tGy3, T.BUILD_DEFS.creep_tumor);
  const buildCountBeforeTimer = T.state.buildings.length;
  T.updateTumorSpread(1000); // well under the delay
  assert(T.state.buildings.length===buildCountBeforeTimer, 'no spread yet — the delay has not elapsed');
  assert(timedTumor.spreadDone===undefined || timedTumor.spreadDone===false, 'not marked done before the delay elapses');
  T.updateTumorSpread(T.SWARM.creep.tumorSpreadDelayMs + 1000); // now past the delay
  assert(T.state.buildings.length===buildCountBeforeTimer+1, 'spread fires once the delay has elapsed');
  assert(timedTumor.spreadDone===true, 'timedTumor itself is marked done after spreading');
  // a SEPARATE, freshly-created descendant maturing on its own schedule is
  // expected (and fine) — what must NOT happen is THIS SAME tumor spreading
  // a second time. Confirm directly, since the global building count can
  // legitimately keep growing as new children mature and take their turn.
  const sameSpotCountBefore = T.state.buildings.filter(b=>b.type==='creep_tumor' && b.gx===timedTumor.gx && b.gy===timedTumor.gy).length;
  T.updateTumorSpread(999999); // way past — should not make timedTumor spread again
  const sameSpotCountAfter = T.state.buildings.filter(b=>b.type==='creep_tumor' && b.gx===timedTumor.gx && b.gy===timedTumor.gy).length;
  assert(sameSpotCountAfter===sameSpotCountBefore, 'timedTumor itself does not spread a second time, even with further ticks');
  assert(timedTumor.spreadDone===true, 'timedTumor remains marked done, permanently');

  // ---- unit evolutions (swarm side — different bonus shape than humans) ----
  console.log('--- evolutions (swarm) ---');
  assert(T.EVOLUTIONS.swordsman.name==='Chitinous Plating', 'zergling evolution has its own swarm-flavored name');
  assert(T.EVOLUTIONS.archer.name==='Volatile Acid', 'spitter evolution has its own swarm-flavored name');
  assert(!('wood' in T.EVOLUTIONS.swordsman.cost) && !('stone' in T.EVOLUTIONS.swordsman.cost), 'swarm evolution cost is biomass-only, no wood/stone');
  assert(T.EVOLUTIONS.swordsman.cost.food > 0, 'swarm evolution costs biomass (the food slot)');

  T.state.resources.wildstone = 100; T.state.resources.food = 200;
  const zerglingHpBonus = T.EVOLUTIONS.swordsman.hpBonus, zerglingDmgBonus = T.EVOLUTIONS.swordsman.dmgBonus;
  assert(zerglingHpBonus>0 && zerglingDmgBonus===0, 'zergling evolution is HP-only, per the approved design — no damage component');
  const existingZergling = T.createSwordsman(cx-1, cy+9);
  const zMaxHpBefore = existingZergling.maxHp;
  const zDmgBefore = T.SWORDSMAN_ATTACK.damage;
  assert(T.startUnitEvolution('swordsman')===true, 'zergling evolution starts');
  T.updateUnitEvolution(T.state.evolutionInProgress.msRemaining + 1000);
  assert(existingZergling.maxHp===zMaxHpBefore+zerglingHpBonus, 'existing zergling gets the HP bonus');
  assert(T.SWORDSMAN_ATTACK.damage===zDmgBefore, 'shared damage constant is UNCHANGED — zergling evolution never touches damage');

  T.state.resources.wildstone = 100;
  const spitterDmgBonus = T.EVOLUTIONS.archer.dmgBonus, spitterHpBonus = T.EVOLUTIONS.archer.hpBonus;
  assert(spitterDmgBonus>0 && spitterHpBonus===0, 'spitter evolution is damage-only, per the approved design — no HP component');
  const existingSpitter = T.createArcher(cx-2, cy+9);
  const sMaxHpBefore = existingSpitter.maxHp;
  const sDmgBefore = T.ARCHER_ATTACK.damage;
  assert(T.startUnitEvolution('archer')===true, 'spitter evolution starts');
  T.updateUnitEvolution(T.state.evolutionInProgress.msRemaining + 1000);
  assert(existingSpitter.maxHp===sMaxHpBefore, 'existing spitter HP is unchanged — this evolution is damage-only');
  assert(T.ARCHER_ATTACK.damage===sDmgBefore+spitterDmgBonus, 'shared damage constant increased for the spitter evolution');
}

console.log('\n================ RESULT ================');
console.log(passes + ' passed, ' + failures.length + ' failed');
if(failures.length){ console.log('FAILURES:'); failures.forEach(f=>console.log('  - '+f)); process.exit(1); }
console.log('ALL GREEN');
