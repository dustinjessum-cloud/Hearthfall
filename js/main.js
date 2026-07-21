// ---------------------------------------------------------------------
// Phaser scene
// ---------------------------------------------------------------------
let scene;

class MainScene extends Phaser.Scene {
  constructor(){ super('main'); }

  preload(){
    // Intentionally empty. The spritesheet is loaded in create() via
    // textures.addBase64(), NOT this.load.*  — Phaser's file loader both
    // rejects data URIs outright for spritesheets, and (separately) tags
    // loader-fetched images with crossOrigin, which breaks plain image
    // loading over file:// where no CORS headers can ever be served.
    // addBase64() sidesteps both problems: no network fetch, no CORS.
  }

  create(){
    scene = this;
    this.worldReady = false;

    const finish = (texture)=>{
      this.setupFrames(texture);
      this.startWorld();
    };

    if(this.textures.exists('tiles')){
      finish(this.textures.get('tiles'));
    } else {
      this.textures.once(Phaser.Textures.Events.ADD, (key, texture)=>{
        if(key==='tiles') finish(texture);
      });
      this.textures.addBase64('tiles', SPRITESHEET_B64);
      // Safety net: this should resolve almost instantly for a ~3KB image,
      // but if the browser ever fails to fire the event, surface an error
      // instead of leaving the screen blank.
      setTimeout(()=>{
        if(!this.worldReady) showFatalError('Game art failed to load (spritesheet texture never became ready). Try reloading the page.');
      }, 6000);
    }
  }

  setupFrames(texture){
    const cols=6, rows=9, size=32;
    let idx=0;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        texture.add(idx, 0, c*size, r*size, size, size);
        idx++;
      }
    }
  }

  startWorld(){
    this.tileLayerGroup = this.add.group();
    this.buildingLayerGroup = this.add.group();
    this.ghost = null;
    this.selectionBox = null;
    this.unitMoveTargets = new Map();

    const {cx, cy} = generateMap();
    this.townHallPos = {gx:cx, gy:cy};

    this.drawMap();

    // place the starting core — Town Hall for humans, the Hive for the swarm
    const swarm = state.faction === 'swarm';
    const th = createBuilding('town_hall_core', cx, cy,
      swarm ? {name:'Hive', hp:500, frame:'town_hall', size:2, tint:0xb478ff}
            : {name:'Town Hall', hp:500, frame:'town_hall', size:2});
    th.isCore = true;
    th.level = 1;

    // the swarm wakes on a bed of creep
    initCreep();
    if(swarm){
      for(let dy=-SWARM.creep.seedRadius; dy<=SWARM.creep.seedRadius; dy++){
        for(let dx=-SWARM.creep.seedRadius; dx<=SWARM.creep.seedRadius; dx++){
          if(Math.hypot(dx, dy) <= SWARM.creep.seedRadius) claimCreepTile(cx+dx, cy+dy);
        }
      }
    }

    // starting workers — idle until you build somewhere for them to work
    for(let i=0;i<3;i++){
      const spot = findFreeSpotNear(cx, cy, 4) || {gx:cx, gy:cy};
      createVillager(spot.gx, spot.gy);
    }

    // bandit camps take root on the frontier from day one
    spawnBanditCamps();

    this.cameras.main.setBounds(0,0, MAP_W*TILE, MAP_H*TILE);
    this.cameras.main.centerOn(cx*TILE, cy*TILE);
    this.cameras.main.setZoom(1);

    // Without this, right-clicking the canvas opens the browser's native
    // context menu instead of reaching Phaser's pointerdown/rightButtonDown,
    // which is why right-click (cancel build / move archer) did nothing.
    this.input.mouse.disableContextMenu();

    this.dragStart = null;
    this.dragging = false;
    this.dragRect = null;

    this.input.on('pointerdown', (p)=> this.handlePointerDown(p));
    this.input.on('pointermove', (p)=> this.handlePointerMove(p));
    this.input.on('pointerup', (p)=> this.handlePointerUp(p));
    // hero abilities: J = javelin (swarm: slowing web), K = slash (swarm: birth burst)
    this.input.keyboard.on('keydown-J', ()=> heroThrowJavelin());
    this.input.keyboard.on('keydown-K', ()=> heroSlash());
    this.input.keyboard.on('keydown-P', ()=> togglePause());
    this.input.keyboard.on('keydown-ESC', ()=>{
      this.cancelBuildMode();
      clearGroupSelection();
      selectEntity(null,null);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.input.on('wheel', (pointer, go, dx, dy)=>{
      let z = this.cameras.main.zoom - dy*0.001;
      z = Phaser.Math.Clamp(z, 0.6, 2.2);
      this.cameras.main.setZoom(z);
    });

    this.projectiles = this.add.group();

    this.lastTickAt = 0;
    this.lastGrowthAt = 0;

    updateHUD();
    buildBuildBar();
    refreshBuildBar();

    this.worldReady = true;
  }

  drawMap(){
    for(let y=0;y<MAP_H;y++){
      for(let x=0;x<MAP_W;x++){
        const t = state.grid[y][x];
        const img = this.add.image(x*TILE+TILE/2, y*TILE+TILE/2, 'tiles', FRAME[t]);
        this.tileLayerGroup.add(img);
        state.tileSprites[y][x] = img;
      }
    }
  }

  screenToGrid(worldX, worldY){
    return { gx: Math.floor(worldX/TILE), gy: Math.floor(worldY/TILE) };
  }

  handlePointerMove(p){
    // drag-selection rectangle
    if(this.dragStart && p.isDown && !state.buildMode){
      const ddx = p.x - this.dragStart.sx, ddy = p.y - this.dragStart.sy;
      if(this.dragging || Math.hypot(ddx, ddy) > 8){
        this.dragging = true;
        const w1 = this.cameras.main.getWorldPoint(this.dragStart.sx, this.dragStart.sy);
        const w2 = this.cameras.main.getWorldPoint(p.x, p.y);
        if(!this.dragRect){
          this.dragRect = this.add.rectangle(0, 0, 1, 1, 0x9fd4ff, 0.15)
            .setStrokeStyle(1, 0xffe08a, 1).setOrigin(0, 0).setDepth(20);
        }
        this.dragRect.setPosition(Math.min(w1.x, w2.x), Math.min(w1.y, w2.y));
        this.dragRect.setSize(Math.abs(w2.x - w1.x), Math.abs(w2.y - w1.y));
      }
    }
    if(!state.buildMode) return;
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const {gx, gy} = this.screenToGrid(wp.x, wp.y);
    this.updateGhost(gx, gy);
  }

  handlePointerUp(p){
    if(p.button !== 0) return; // left releases only
    if(!this.dragStart) return;
    const start = this.dragStart;
    this.dragStart = null;
    if(this.dragging){
      this.dragging = false;
      const w1 = this.cameras.main.getWorldPoint(start.sx, start.sy);
      const w2 = this.cameras.main.getWorldPoint(p.x, p.y);
      if(this.dragRect){ this.dragRect.destroy(); this.dragRect = null; }
      const x0 = Math.min(w1.x, w2.x), x1 = Math.max(w1.x, w2.x);
      const y0 = Math.min(w1.y, w2.y), y1 = Math.max(w1.y, w2.y);
      const picked = state.units.filter(u=>{
        if(u.hp<=0 || u.inTC) return false;
        const px = u.gx*TILE + TILE/2, py = u.gy*TILE + TILE/2;
        return px>=x0 && px<=x1 && py>=y0 && py<=y1;
      });
      setGroupSelection(picked);
    } else {
      // plain click — select whatever is nearest under the cursor
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      const {gx, gy} = this.screenToGrid(wp.x, wp.y);
      clearGroupSelection();
      let unit=null, bd=0.8;
      for(const uu of state.units){
        if(uu.hp<=0 || uu.inTC) continue;
        const d = Math.hypot(uu.gx - (wp.x/TILE - 0.5), uu.gy - (wp.y/TILE - 0.5));
        if(d < bd){ bd = d; unit = uu; }
      }
      if(unit){ selectEntity('unit', unit); return; }
      const b = occAt(gx, gy);
      if(b){ selectEntity('building', b); return; }
      selectEntity(null, null);
    }
  }

  updateGhost(gx, gy){
    const def = BUILD_DEFS[state.buildMode];
    if(!def) return;
    const valid = isPlacementValid(state.buildMode, gx, gy);
    if(!this.ghost){
      this.ghost = this.add.image(0,0,'tiles', FRAME[def.frame]).setAlpha(0.75);
    }
    if(inBounds(gx,gy)){
      this.ghost.setVisible(true);
      this.ghost.setPosition(gx*TILE+TILE/2, gy*TILE+TILE/2);
      this.ghost.setTint(valid ? 0x99ffb0 : 0xff8a8a);
    } else {
      this.ghost.setVisible(false);
    }
  }

  cancelBuildMode(){
    state.buildMode = null;
    if(this.ghost){ this.ghost.destroy(); this.ghost=null; }
    refreshBuildBar();
  }

  handlePointerDown(p){
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const {gx, gy} = this.screenToGrid(wp.x, wp.y);

    if(p.rightButtonDown()){
      if(state.buildMode){ this.cancelBuildMode(); return; }
      if(state.selectedGroup && state.selectedGroup.length > 1){
        commandGroupMove(state.selectedGroup, gx, gy);
        return;
      }
      if(state.selected && state.selected.type==='building' && canRally(state.selected.ref)){
        setRallyPoint(state.selected.ref, gx, gy);
        return;
      }
      if(state.selected && state.selected.type==='unit'){
        const u = state.selected.ref;
        if(u.type==='villager'){
          // right-click the Town Hall: take shelter inside (garrison)
          const bAt = occAt(gx, gy);
          if(bAt && bAt.isCore){ garrisonVillagerInTC(u); return; }
          const targetBuilding = findProductionBuildingFor(gx, gy);
          if(targetBuilding){
            assignVillagerToBuilding(u, targetBuilding);
            flashWaveBanner(`Villager assigned to ${BUILD_DEFS[targetBuilding.type].name}.`);
          } else if(isTileFreeForUnit(gx, gy, u)){
            unassignVillager(u);
            commandUnitMove(u, gx, gy);
          }
        } else if(u.type==='repairman'){
          // repairmen take work orders on damaged walls & towers
          const b = occAt(gx, gy);
          if(b && (b.type==='wall' || b.type==='tower') && b.hp < b.maxHp){
            u.repairTargetId = b.id;
            flashWaveBanner('Repairman heads to the damage.');
          } else {
            u.repairTargetId = null;
            commandUnitMove(u, gx, gy);
          }
        } else if(u.type==='archer'){
          // archers can garrison towers: right-click the tower to man it
          const b = occAt(gx, gy);
          if(b && b.type==='tower' && b.hp>0){
            u.garrisonId = b.id;
            u.tx = b.gx; u.ty = b.gy; u.moving = true;
            flashWaveBanner('Archer climbs the tower.');
          } else {
            u.garrisonId = null; // any other order ends the garrison duty
            commandUnitMove(u, gx, gy);
          }
        } else {
          commandUnitMove(u, gx, gy);
        }
        return;
      }
      return;
    }

    if(state.buildMode){
      tryPlaceBuilding(state.buildMode, gx, gy);
      return;
    }

    // left button: start a potential drag-select; actual selection happens
    // on pointerup so a click and a box-drag can be told apart
    this.dragStart = { sx: p.x, sy: p.y };
  }

  update(time, delta){
    if(!this.worldReady) return;
    if(state.gameOver || state.paused) return;

    // camera pan
    const speed = 320 * (delta/1000) / this.cameras.main.zoom;
    if(this.cursors.left.isDown || this.keys.A.isDown) this.cameras.main.scrollX -= speed;
    if(this.cursors.right.isDown || this.keys.D.isDown) this.cameras.main.scrollX += speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) this.cameras.main.scrollY -= speed;
    if(this.cursors.down.isDown || this.keys.S.isDown) this.cameras.main.scrollY += speed;

    // economy tick every 3s
    this.lastTickAt += delta;
    if(this.lastTickAt >= 3000){
      this.lastTickAt = 0;
      economyTick();
    }

    // the creep breathes: one growth pulse per interval (swarm only)
    if(state.faction === 'swarm'){
      this.lastCreepAt = (this.lastCreepAt || 0) + delta;
      if(this.lastCreepAt >= SWARM.creep.spreadMs){
        this.lastCreepAt = 0;
        updateCreep();
      }
      updateTumorSpread(delta); // each mature tumor's one autonomous spread attempt
    }

    // unit production timers (villagers at the TC, archers at the barracks)
    updateProduction(delta);

    // wave timer
    state.nextWaveInMs -= delta;
    if(state.nextWaveInMs <= 0){
      spawnWave();
      state.wave++;
      state.nextWaveInMs = 420000; // 7 min between raids
    }
    // skirmishes: random harassment between the big waves (only once the
    // war has started — the pre-first-raid peace stays untouched)
    if(state.wave >= 1 && !isRaidActive()){
      state.nextSkirmishInMs -= delta;
      if(state.nextSkirmishInMs <= 0){
        spawnSkirmish();
        state.nextSkirmishInMs = 150000 + Math.random()*90000; // 2.5–4 min
      }
    }
    updateWaveHUD();

    // merchant caravan: only visits towns with a market
    if(state.caravanActiveMs > 0){
      state.caravanActiveMs -= delta;
      if(state.caravanActiveMs <= 0) flashWaveBanner('The merchant caravan moves on.');
    } else if(hasBuilding('market')){
      state.nextCaravanInMs -= delta;
      if(state.nextCaravanInMs <= 0){
        state.caravanActiveMs = CARAVAN_STAY_MS;
        state.nextCaravanInMs = Phaser.Math.Between(CARAVAN_EVERY_MS[0], CARAVAN_EVERY_MS[1]);
        spawnCaravanVisual();
        flashWaveBanner('A merchant caravan has arrived — better rates at the Market!');
      }
    }
    updateCaravan(delta);
    updateHeroCombat(delta);
    updateConstruction(delta);
    updateUnitEvolution(delta);

    updateUnits(delta);
    updateEnemies(delta);
    updateCombat(delta, time);

    if(state.selected || (state.selectedGroup && state.selectedGroup.length)) refreshInfoPanel();
  }
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
function showFatalError(msg){
  console.error(msg);
  const banner = document.getElementById('errorBanner');
  banner.style.display = 'block';
  banner.textContent = 'Error: ' + msg;
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `<h1>Something went wrong</h1>
    <p>${msg}</p>
    <button id="reloadBtn">Reload Page</button>`;
  const rb = document.getElementById('reloadBtn');
  if(rb) rb.addEventListener('click', ()=> location.reload());
}

window.addEventListener('error', (e)=>{
  // Surface runtime errors instead of leaving a silent blank screen.
  showFatalError((e && e.message) ? e.message : 'An unexpected error occurred.');
});

window.addEventListener('DOMContentLoaded', ()=>{
  try {
    loadIconImage(()=>{
      drawIconCanvas(document.getElementById('icoFood'), FRAME.icon_food);
      drawIconCanvas(document.getElementById('icoWood'), FRAME.icon_wood);
      drawIconCanvas(document.getElementById('icoStone'), FRAME.icon_stone);
      drawIconCanvas(document.getElementById('icoWildstone'), FRAME.icon_wildstone);
      drawIconCanvas(document.getElementById('icoPop'), FRAME.icon_population);
      drawIconCanvas(document.getElementById('icoWorker'), FRAME.villager);
      drawIconCanvas(document.getElementById('icoSoldier'), FRAME.archer);
      drawIconCanvas(document.getElementById('icoWheat'), FRAME.farm);
      // gold has no sprite — draw a simple coin
      const gc = document.getElementById('icoGold');
      gc.width = 32; gc.height = 32;
      const gctx = gc.getContext('2d');
      gctx.fillStyle = '#ffd700'; gctx.beginPath(); gctx.arc(16,16,11,0,Math.PI*2); gctx.fill();
      gctx.strokeStyle = '#b8860b'; gctx.lineWidth = 3; gctx.stroke();
      gctx.fillStyle = '#b8860b'; gctx.font = 'bold 14px sans-serif'; gctx.textAlign='center'; gctx.textBaseline='middle';
      gctx.fillText('g', 16, 17);
      // flour: a simple pale sack
      const fc = document.getElementById('icoFlour');
      fc.width = 32; fc.height = 32;
      const fctx = fc.getContext('2d');
      fctx.fillStyle = '#f0e8d8'; fctx.beginPath(); fctx.arc(16,18,10,0,Math.PI*2); fctx.fill();
      fctx.fillRect(11,6,10,6);
      fctx.strokeStyle = '#b8a888'; fctx.lineWidth = 2; fctx.stroke();
      fctx.fillStyle = '#b8a888'; fctx.font = 'bold 12px sans-serif'; fctx.textAlign='center'; fctx.textBaseline='middle';
      fctx.fillText('f', 16, 19);
    });
  } catch(err){
    console.error('Icon draw failed (non-fatal):', err);
  }

  const bootGame = (faction)=>{
    try {
      if(typeof Phaser === 'undefined'){
        throw new Error('The Phaser game engine failed to load from the CDN (cdnjs.cloudflare.com). Check your internet connection, then reload this page.');
      }
      applyFaction(faction); // must run before the world builds — it rewrites the def tables
      document.getElementById('overlay').style.display = 'none';
      const config = {
        type: Phaser.AUTO,
        parent: 'gameWrap',
        width: 960,
        height: 560,
        backgroundColor: '#1c140c',
        pixelArt: true,
        scene: [MainScene],
      };
      new Phaser.Game(config);
    } catch(err){
      showFatalError(err.message || String(err));
    }
  };
  document.getElementById('startBtn').addEventListener('click', ()=> bootGame('human'));
  document.getElementById('startSwarmBtn').addEventListener('click', ()=> bootGame('swarm'));

  document.getElementById('raidBtn').addEventListener('click', callRaidNow);
  document.getElementById('recallBtn').addEventListener('click', toggleRecall);
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  const hintCloseBtn = document.getElementById('hintClose');
  if(hintCloseBtn){
    hintCloseBtn.addEventListener('click', ()=>{
      document.getElementById('hint').style.display = 'none';
    });
  }
});
