function heroJavelinDmg(){ return HERO.javelin.baseDmg + (state.hero.level-1)*HERO.javelin.dmgPerLevel; }
function heroSlashDmg(){ return HERO.slash.baseDmg + (state.hero.level-1)*HERO.slash.dmgPerLevel; }
function heroWebDmg(){ return HERO.web.baseDmg + (state.hero.level-1)*HERO.web.dmgPerLevel; }
function heroMaxHp(){ return HERO.baseHp + (state.hero.level-1)*HERO.hpPerLevel; }

function grantHeroXp(amount){
  const cap = livingCaptain();
  state.hero.xp += amount;
  if(cap && scene && scene.add) floatResourceText(Math.round(cap.gx), Math.round(cap.gy), '+'+amount+' XP', '#c9a0ff');
  while(state.hero.level < HERO.maxLevel && state.hero.xp >= HERO.xpToNext(state.hero.level)){
    state.hero.xp -= HERO.xpToNext(state.hero.level);
    state.hero.level++;
    if(cap){ cap.maxHp = heroMaxHp(); cap.hp = Math.min(cap.maxHp, cap.hp + HERO.hpPerLevel); }
    flashWaveBanner(`The Minotaur reaches level ${state.hero.level}!`);
  }
}

function heroThrowJavelin(){
  const cap = livingCaptain();
  if(!cap || state.gameOver || !scene) return;
  const swarm = state.faction === 'swarm';
  if((cap.webCd||0) > 0 && swarm) return;
  if(!swarm && (cap.javCd||0) > 0) return;
  const ptr = scene.input.activePointer;
  const wp = scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
  const txf = wp.x/TILE - 0.5, tyf = wp.y/TILE - 0.5;
  let dx = txf - cap.gx, dy = tyf - cap.gy;
  const dist = Math.hypot(dx, dy);
  if(dist < 0.2) return; // no target direction
  // the mouse sets the DIRECTION only — the shot always flies its full
  // range (stopping early only if it finds an enemy to hit)
  const flight = swarm ? HERO.web.range : HERO.javelin.range;
  dx /= dist; dy /= dist;
  const j = { x: cap.gx, y: cap.gy, dx, dy, left: flight, kind: swarm ? 'web' : 'javelin' };
  j.sprite = scene.add.image(cap.gx*TILE+TILE/2, cap.gy*TILE+TILE/2, 'tiles', FRAME.arrow)
    .setDepth(8).setTint(swarm ? 0xd0e8ff : 0xffd76b).setScale(1.3) // web reads pale/icy, javelin gold
    .setRotation(Math.atan2(dy, dx) + Math.PI/4);
  state.heroProjectiles.push(j);
  if(swarm) cap.webCd = HERO.web.cooldownMs;
  else cap.javCd = HERO.javelin.cooldownMs;
}

function heroSlash(){
  const cap = livingCaptain();
  if(!cap || state.gameOver) return;
  if((cap.slashCd||0) > 0) return;
  cap.slashCd = HERO.slash.cooldownMs;
  // Broodmother: K is a BIRTH BURST — she spawns short-lived broodlings
  // around herself instead of slashing. They fight (and benefit from her
  // aura), then dissolve back into the creep after their brief lives.
  if(state.faction === 'swarm'){
    const cgx = Math.round(cap.gx), cgy = Math.round(cap.gy);
    let born = 0;
    for(let i=0; i<SWARM.broodmother.burstCount; i++){
      const spot = findFreeSpotNear(cgx, cgy, 2);
      if(!spot) break;
      const b = createSwordsman(spot.gx, spot.gy);
      b.expireMs = SWARM.broodmother.burstLifeMs;
      if(b.sprite && b.sprite.setAlpha) b.sprite.setAlpha(0.85); // slightly ghostly — they're temporary
      born++;
    }
    syncPopulationCount();
    if(born && scene && scene.add){
      floatResourceText(cgx, cgy, 'BIRTH!', '#c9a0ff');
      const ring = scene.add.ellipse(cap.gx*TILE+TILE/2, cap.gy*TILE+TILE/2, 20, 20, 0xb478ff, 0.25)
        .setStrokeStyle(2, 0xb478ff, 0.9).setDepth(9);
      scene.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 320, onComplete: ()=> ring.destroy() });
    }
    updateHUD();
    return;
  }
  let hits = 0;
  for(const e of state.enemies){
    if(e.hp<=0) continue;
    if(Phaser.Math.Distance.Between(cap.gx, cap.gy, e.gx, e.gy) <= HERO.slash.radius){
      e.hp -= heroSlashDmg();
      e.lastHitBy = 'hero';
      hits++;
    }
  }
  // whirl visual: quick spin of the beast + expanding ring
  if(scene && scene.tweens && cap.sprite){
    scene.tweens.add({ targets: cap.sprite, angle: 360, duration: 250, onComplete: ()=>{ cap.sprite.setAngle(0); } });
    const ring = scene.add.ellipse(cap.gx*TILE+TILE/2, cap.gy*TILE+TILE/2, 20, 20, 0xffd76b, 0.25)
      .setStrokeStyle(2, 0xffd76b, 0.9).setDepth(9);
    scene.tweens.add({ targets: ring, scaleX: HERO.slash.radius*2.2, scaleY: HERO.slash.radius*2.2, alpha: 0, duration: 280, onComplete: ()=> ring.destroy() });
  }
}

function updateHeroCombat(delta){
  const cap = livingCaptain();
  if(cap){
    if(cap.javCd > 0) cap.javCd -= delta;
    if(cap.slashCd > 0) cap.slashCd -= delta;
    if(cap.webCd > 0) cap.webCd -= delta;
  }
  // hero projectiles in flight: hit the first enemy along the path
  for(const j of state.heroProjectiles){
    const isWeb = j.kind === 'web';
    const step = (isWeb ? HERO.web.speed : HERO.javelin.speed) * (delta/1000);
    const move = Math.min(step, j.left);
    j.x += j.dx*move; j.y += j.dy*move; j.left -= move;
    if(j.sprite) j.sprite.setPosition(j.x*TILE+TILE/2, j.y*TILE+TILE/2);
    const hitRadius = isWeb ? HERO.web.hitRadius : HERO.javelin.hitRadius;
    for(const e of state.enemies){
      if(e.hp<=0) continue;
      if(Phaser.Math.Distance.Between(j.x, j.y, e.gx, e.gy) <= hitRadius){
        if(isWeb){
          e.hp -= heroWebDmg();
          if(!(e.webSlowMs > 0) && e.sprite && e.sprite.setTint) e.sprite.setTint(0xbfe8ff); // pale web-strand tint
          e.webSlowMs = HERO.web.slowDurationMs;
        } else {
          e.hp -= heroJavelinDmg();
        }
        e.lastHitBy = 'hero';
        j.left = 0; // the shot stops in the target
        break;
      }
    }
    if(j.left <= 0 && j.sprite){ j.sprite.destroy(); j.sprite = null; }
  }
  state.heroProjectiles = state.heroProjectiles.filter(j=> j.left > 0);
}

// ---------------------------------------------------------------------
// Units (archers)
// ---------------------------------------------------------------------
let unitIdCounter = 1;

function buildingById(id){
  return state.buildings.find(b=>b.id===id) || null;
}

// A "miner" is a villager currently assigned to a quarry — the only unit
// type allowed to set foot on a stone deposit tile. Everyone else (other
// villagers, archers, enemies) treats stone as impassable rock.
function isMiner(u){
  if(!u || u.type!=='villager' || !u.assignedBuildingId) return false;
  const b = buildingById(u.assignedBuildingId);
  return !!(b && b.type==='quarry');
}

function isTileFreeForUnit(gx, gy, mover){
  if(!inBounds(gx,gy)) return false;
  const t = tileAt(gx,gy);
  if(t==='water') return false;
  if(t==='stone_deposit' && !isMiner(mover)) return false;
  if(occAt(gx,gy)) return false;
  for(const u of state.units){
    if(u!==mover && u.hp>0 && Math.round(u.gx)===gx && Math.round(u.gy)===gy) return false;
  }
  return true;
}

function positionUnitVisuals(u, cx, cy){
  u.sprite.setPosition(cx, cy);
  if(u.marker) u.marker.setPosition(cx, cy+9);
  if(u.hpBarBg){
    u.hpBarBg.setPosition(cx, cy-18);
    u.hpBarFg.setPosition(cx-(TILE-10)/2, cy-18);
  }
}

function createArcher(gx, gy){
  const u = {
    id: unitIdCounter++, type:'archer', gx, gy, tx:gx, ty:gy,
    hp: ARCHER_HP, maxHp: ARCHER_HP, lastAttackAt: 0, moving:false,
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  // A colored ring under the unit's feet so it's easy to spot against the
  // grass tiles, since the sprite alone is small and similarly toned.
  u.marker = scene.add.ellipse(cx, cy+9, 20, 9, 0x2255aa, 0.55).setStrokeStyle(1, 0x9fc4ff, 0.9).setDepth(3);
  u.sprite = scene.add.image(cx, cy, 'tiles', state.faction==='swarm' ? FRAME.spitter_naga : FRAME.archer).setDepth(4);
  if(state.faction==='swarm'){ u.baseTint = SWARM.unitTints.archer; u.sprite.setTint(u.baseTint); }
  u.hpBarBg = scene.add.rectangle(cx, cy-18, TILE-10, 4, 0x2a1c10).setDepth(5).setVisible(false);
  u.hpBarFg = scene.add.rectangle(cx-(TILE-10)/2, cy-18, TILE-10, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6).setVisible(false);
  state.units.push(u);
  return u;
}

function createCaptain(gx, gy){
  const u = {
    id: unitIdCounter++, type:'captain', gx, gy, tx:gx, ty:gy,
    hp: heroMaxHp(), maxHp: heroMaxHp(), lastAttackAt: 0, moving:false,
    javCd: 0, slashCd: 0,
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  // gold ring + gold-tinted sprite: unmistakably the hero
  u.marker = scene.add.ellipse(cx, cy+9, 24, 11, 0xaa8822, 0.6).setStrokeStyle(2, 0xffd76b, 1).setDepth(3);
  u.sprite = scene.add.image(cx, cy, 'tiles', state.faction==='swarm' ? FRAME.broodmother : FRAME.minotaur).setDepth(4);
  // the Broodmother's colors are baked into her own sprite — no tint needed,
  // same as the Minotaur
  u.hpBarBg = scene.add.rectangle(cx, cy-18, TILE-10, 4, 0x2a1c10).setDepth(5).setVisible(false);
  u.hpBarFg = scene.add.rectangle(cx-(TILE-10)/2, cy-18, TILE-10, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6).setVisible(false);
  state.units.push(u);
  return u;
}

function livingCaptain(){ return state.units.find(u=>u.type==='captain' && u.hp>0) || null; }

function recruitCaptain(){
  if(state.gameOver || livingCaptain()) return false;
  const cost = state.captainRecruited ? CAPTAIN.reviveCost : CAPTAIN.cost;
  const heroResKey = state.faction==='swarm' ? 'food' : 'gold'; // the Broodmother is born of biomass
  if(state.resources[heroResKey] < cost) return false;
  state.resources[heroResKey] -= cost;
  const th = scene.townHallPos;
  const spot = findFreeSpotNear(th.gx, th.gy, 5) || {gx:th.gx, gy:th.gy};
  const cap = createCaptain(spot.gx, spot.gy);
  const tcB = townHall();
  if(tcB && tcB.rallyPoint) sendToRally(cap, tcB);
  const first = !state.captainRecruited;
  state.captainRecruited = true;
  flashWaveBanner(first ? 'A Minotaur strides in, scythe in hand, to lead your soldiers!' : 'The Minotaur returns to the field!');
  if(scene.cameras && scene.cameras.main.pan) scene.cameras.main.pan(spot.gx*TILE+TILE/2, spot.gy*TILE+TILE/2, 500, 'Sine.easeInOut');
  updateHUD();
  return true;
}

function createSwordsman(gx, gy){
  const swarm = state.faction==='swarm';
  const hp = swarm ? SWARM.zergling.hp : SWORDSMAN_HP; // zerglings: frailer, but birthed in pairs
  const u = {
    id: unitIdCounter++, type:'swordsman', gx, gy, tx:gx, ty:gy,
    hp, maxHp: hp, lastAttackAt: 0, moving:false,
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  u.marker = scene.add.ellipse(cx, cy+9, 20, 9, 0x22848a, 0.55).setStrokeStyle(1, 0x9fe8e0, 0.9).setDepth(3);
  // reuse the swordsman frame for humans; zerglings get their own quadruped sprite
  u.baseTint = swarm ? SWARM.unitTints.swordsman : 0xaad4ff;
  u.sprite = scene.add.image(cx, cy, 'tiles', swarm ? FRAME.zergling_quad : FRAME.enemy_swordsman).setDepth(4).setTint(u.baseTint);
  u.hpBarBg = scene.add.rectangle(cx, cy-18, TILE-10, 4, 0x2a1c10).setDepth(5).setVisible(false);
  u.hpBarFg = scene.add.rectangle(cx-(TILE-10)/2, cy-18, TILE-10, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6).setVisible(false);
  state.units.push(u);
  return u;
}

function createRepairman(gx, gy){
  const u = {
    id: unitIdCounter++, type:'repairman', gx, gy, tx:gx, ty:gy,
    hp: REPAIRMAN.hp, maxHp: REPAIRMAN.hp, lastAttackAt: 0, moving:false,
    repairTargetId: null, repMs: 0,
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  // dedicated sprite: overalls, apron, hammer, hard hat
  u.marker = scene.add.ellipse(cx, cy+9, 18, 8, 0x4a5a7a, 0.5).setStrokeStyle(1, 0xb8c8e8, 0.85).setDepth(3);
  u.sprite = scene.add.image(cx, cy, 'tiles', FRAME.repairman).setDepth(4);
  u.hpBarBg = scene.add.rectangle(cx, cy-18, TILE-10, 4, 0x2a1c10).setDepth(5).setVisible(false);
  u.hpBarFg = scene.add.rectangle(cx-(TILE-10)/2, cy-18, TILE-10, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6).setVisible(false);
  state.units.push(u);
  syncPopulationCount();
  return u;
}

function trainRepairman(mason){
  if(state.starving){ flashWaveBanner('No one apprentices in a starving town!'); return false; }
  if(queueFull(mason) || underConstruction(mason)) return false;
  for(const k in REPAIRMAN.cost) if(state.resources[k] < REPAIRMAN.cost[k]) return false;
  const villager = state.units.find(u=>u.type==='villager' && u.hp>0 && !u.assignedBuildingId && !u.buildTaskId && !u.inTC && !u.enteringTC)
                 || state.units.find(u=>u.type==='villager' && u.hp>0 && !u.inTC && !u.enteringTC);
  if(!villager) return false;
  for(const k in REPAIRMAN.cost) state.resources[k] -= REPAIRMAN.cost[k];
  destroyUnitVisuals(villager);
  state.units = state.units.filter(u=>u!==villager);
  autoAssignIdleVillagers();
  syncPopulationCount();
  enqueueProduction(mason, 'repairman');
  flashWaveBanner('A villager apprentices at the Mason — repairman ready in 20s.');
  updateHUD();
  refreshInfoPanel();
  return true;
}

// Villagers live in the same state.units array as archers (type:'villager'),
// so selection, movement, hp bars, and combat all fall out of the existing
// generic unit code for free. What's villager-specific is assignedBuildingId
// (which production building they're currently working) and the gather
// visuals driven from economyTick.
function createVillager(gx, gy){
  const u = {
    id: unitIdCounter++, type:'villager', gx, gy, tx:gx, ty:gy,
    hp: 25, maxHp: 25, lastAttackAt: 0, moving:false,
    assignedBuildingId: null, gatherWorking: false, bobPhase: 0,
    // delivery-based gathering: what they're hauling and where they are in
    // the walk-out -> harvest -> walk-home loop
    carrying: null, gatherPhase: null, gatherTarget: null, harvestMs: 0,
    recallSpot: null, // where they shelter (near the TC) while recalled
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  u.marker = scene.add.ellipse(cx, cy+9, 18, 8, 0x3a7a3a, 0.5).setStrokeStyle(1, 0xa8e6a1, 0.85).setDepth(3);
  u.sprite = scene.add.image(cx, cy, 'tiles', FRAME.villager).setDepth(4);
  if(state.faction==='swarm'){ u.baseTint = SWARM.unitTints.villager; u.sprite.setTint(u.baseTint); }
  u.hpBarBg = scene.add.rectangle(cx, cy-18, TILE-10, 4, 0x2a1c10).setDepth(5).setVisible(false);
  u.hpBarFg = scene.add.rectangle(cx-(TILE-10)/2, cy-18, TILE-10, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6).setVisible(false);
  state.units.push(u);
  syncPopulationCount();
  return u;
}

// state.population.current is derived from actual living units, never
// hand-incremented, so it can't drift out of sync with what's really on
// the map (a bug in an earlier version of this code).
function syncPopulationCount(){
  const villagers = state.units.filter(u=>(u.type==='villager'||u.type==='repairman') && u.hp>0).length;
  const soldiers = state.units.filter(u=>(u.type==='archer'||u.type==='swordsman') && u.hp>0).length;
  state.population.current = villagers + soldiers;
}

function damageUnit(u, dmg){
  u.hp -= dmg;
  u.hpBarBg.setVisible(true); u.hpBarFg.setVisible(true);
  const pct = Math.max(0, u.hp/u.maxHp);
  u.hpBarFg.width = (TILE-10)*pct;
  u.hpBarFg.fillColor = pct>0.5 ? 0x6bbf59 : (pct>0.25?0xd8b23a:0xd85a3a);
  if(u.hp<=0) removeUnit(u);
}

function destroyUnitVisuals(u){
  if(state.selected && state.selected.ref===u) selectEntity(null,null);
  u.sprite.destroy();
  if(u.marker) u.marker.destroy();
  if(u.hpBarBg) u.hpBarBg.destroy();
  if(u.hpBarFg) u.hpBarFg.destroy();
}

function removeUnit(u){
  u.hp = 0;
  destroyUnitVisuals(u);
  state.units = state.units.filter(x=>x!==u);
  if(state.selectedGroup && state.selectedGroup.includes(u)){
    state.selectedGroup = state.selectedGroup.filter(x=>x!==u);
  }
  if(u.type==='villager') autoAssignIdleVillagers(); // backfill whoever they were replacing, if anyone's free
  syncPopulationCount();
  updateHUD();
}

function commandUnitMove(u, gx, gy){
  if(!isTileFreeForUnit(gx, gy, u)) return;
  u.tx = gx; u.ty = gy; u.moving = true;
  // a direct order suppresses the melee auto-charge until they arrive —
  // this was the hero bug: his charge instinct overwrote every move
  // command the moment any enemy was inside aggro range
  u.playerOrder = true;
}

// ---- multi-unit selection ----
function clearGroupSelection(){
  for(const u of (state.selectedGroup||[])){
    if(u.sprite){
      if(u.baseTint != null) u.sprite.setTint(u.baseTint);
      else u.sprite.clearTint();
    }
  }
  state.selectedGroup = [];
}

function setGroupSelection(units){
  selectEntity(null, null);
  clearGroupSelection();
  if(units.length === 1){ selectEntity('unit', units[0]); return; }
  state.selectedGroup = units;
  for(const u of units) if(u.sprite) u.sprite.setTint(0xffe08a);
  refreshInfoPanel();
}

function commandGroupMove(units, gx, gy){
  // spread the group over free tiles ring by ring around the target
  const targets = [];
  if(isTileFreeForUnit(gx, gy)) targets.push({gx, gy});
  let r = 1;
  while(targets.length < units.length && r <= 6){
    for(let dy=-r; dy<=r && targets.length<units.length; dy++){
      for(let dx=-r; dx<=r && targets.length<units.length; dx++){
        if(Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = gx+dx, ty = gy+dy;
        if(isTileFreeForUnit(tx, ty)) targets.push({gx:tx, gy:ty});
      }
    }
    r++;
  }
  units.forEach((u, i)=>{
    if(u.hp<=0) return;
    const t = targets.length ? targets[i % targets.length] : {gx, gy};
    if(u.type==='villager') unassignVillager(u);
    if(u.type==='archer') u.garrisonId = null;
    if(u.type==='repairman') u.repairTargetId = null;
    u.tx = t.gx; u.ty = t.gy; u.moving = true; u.playerOrder = true;
  });
}

// Forest slows everyone down (thick undergrowth), stone deposits don't
// come into it here since only miners are ever on one, and their gather
// movement isn't routed through isTileFreeForUnit's speed math anyway.
function speedMultiplierAt(gx, gy){
  const rx = Math.round(gx), ry = Math.round(gy);
  if(state.roads[ry] && state.roads[ry][rx]) return ROAD_SPEED;
  return tileAt(rx, ry)==='forest' ? 0.5 : 1;
}

function updateUnits(delta){
  const baseSpeed = 2.2; // tiles/sec
  for(const u of [...state.units]){
    if(u.hp<=0) continue;
    // burst-born broodlings live fast and dissolve back into the creep
    if(u.expireMs !== undefined){
      u.expireMs -= delta;
      if(u.expireMs <= 0){
        if(scene && scene.add) floatResourceText(Math.round(u.gx), Math.round(u.gy), '~', '#c9a0ff');
        removeUnit(u);
        continue;
      }
    }
    if(u.inTC) continue; // tucked away inside the Town Hall
    if(u.enteringTC && !u.moving){
      const th = scene.townHallPos;
      const d = Phaser.Math.Distance.Between(u.gx, u.gy, th.gx+0.5, th.gy+0.5);
      if(d <= 3.6){ enterTC(u); continue; }
      // arrival spot got taken — sidle closer and try again
      const spot = findFreeSpotNear(th.gx, th.gy, 4);
      if(spot){ u.tx = spot.gx; u.ty = spot.gy; u.moving = true; }
      else u.enteringTC = false;
    }
    // a rallied villager who has arrived takes the nearest open job
    if(u.type==='villager' && u.rallyThenWork && !u.moving && !u.assignedBuildingId && !u.inTC){
      u.rallyThenWork = false;
      let best=null, bd=Infinity;
      for(const nb of state.buildings){
        if(!BUILD_DEFS[nb.type] || !BUILD_DEFS[nb.type].needsWorker || nb.hp<=0 || underConstruction(nb)) continue;
        if(workersOf(nb).length >= workerCapOf(nb)) continue;
        const d = Phaser.Math.Distance.Between(u.gx, u.gy, nb.gx, nb.gy);
        if(d<bd){ bd=d; best=nb; }
      }
      if(best) assignVillagerToBuilding(u, best);
    }
    // arrived at (or standing at) a build site. buildTaskId now stays set
    // for the WHOLE construction, not just the walk over — updateConstruction()
    // only lets buildMs tick down while this unit is actually here (see
    // there for why), so this block just handles the one-time "just
    // arrived" moment and otherwise leaves them be. Swarm drones dissolve
    // into the growth right here instead (delayed from placement to this
    // exact moment) — they don't need to stick around after that.
    if(u.type==='villager' && u.buildTaskId && !u.moving){
      const targetBuilding = buildingById(u.buildTaskId);
      if(!targetBuilding || targetBuilding.hp<=0 || !underConstruction(targetBuilding)){
        // gone or already finished while this unit was en route/away — task's moot
        u.buildTaskId = null;
      } else if(targetBuilding.awaitingBuilder){
        targetBuilding.awaitingBuilder = false;
        if(targetBuilding.sprite && targetBuilding.sprite.setAlpha) targetBuilding.sprite.setAlpha(0.55);
        if(scene && scene.add) floatResourceText(targetBuilding.gx, targetBuilding.gy, 'building started!', '#a8e6a1');
        if(state.faction==='swarm'){
          if(scene && scene.add) floatResourceText(Math.round(u.gx), Math.round(u.gy), 'morphing...', '#c9a0ff');
          destroyUnitVisuals(u);
          state.units = state.units.filter(x=>x!==u);
          syncPopulationCount();
          continue; // this unit is gone — nothing further to do with it this frame
        }
      }
      // else: already started and this IS (or has returned as) the
      // assigned builder, just standing here — nothing to do this frame
    }
    if(u.type==='villager' && u.assignedBuildingId && !u.enteringTC) updateGatherer(u, delta);
    // garrisoning archers walk to their tower and hold it
    if(u.type==='archer' && u.garrisonId){
      const t = buildingById(u.garrisonId);
      if(!t || t.hp<=0 || t.type!=='tower'){ u.garrisonId = null; }
      else {
        const onTower = Math.round(u.gx)===t.gx && Math.round(u.gy)===t.gy;
        if(!onTower && !u.moving){ u.tx = t.gx; u.ty = t.gy; u.moving = true; }
      }
    }
    // repairmen: patch the assigned wall/tower; auto-seek damage when idle
    if(u.type==='repairman' && !u.enteringTC){
      if(u.repairTargetId){
        const b = buildingById(u.repairTargetId);
        if(!b || b.hp<=0 || b.hp>=b.maxHp){ u.repairTargetId = null; }
        else {
          const d = Phaser.Math.Distance.Between(u.gx, u.gy, b.gx, b.gy);
          if(d <= 1.9 && !u.moving){
            u.repMs = (u.repMs||0) + delta;
            if(u.repMs >= 1000){
              u.repMs -= 1000;
              const chunk = Math.min(REPAIRMAN.hpPerSec, b.maxHp - b.hp);
              const woodCost = chunk * REPAIRMAN.woodPerHp;
              if(state.resources.wood >= woodCost){
                state.resources.wood -= woodCost;
                b.hp = Math.min(b.maxHp, b.hp + chunk);
                const pct = Math.max(0, b.hp/b.maxHp);
                b.hpBarFg.width = ((b.size||1)*TILE-6)*pct;
                b.hpBarFg.fillColor = pct>0.5 ? 0x6bbf59 : (pct>0.25?0xd8b23a:0xd85a3a);
                if(b.hp >= b.maxHp){
                  b.hpBarBg.setVisible(false); b.hpBarFg.setVisible(false);
                  if(scene && scene.add) floatResourceText(b.gx, b.gy, 'repaired!', '#a8e6a1');
                  u.repairTargetId = null;
                }
                updateHUD();
              }
            }
          } else if(!u.moving){
            const spot = findFreeSpotNear(b.gx, b.gy, 1) || findFreeSpotNear(b.gx, b.gy, 2);
            if(spot){ u.tx = spot.gx; u.ty = spot.gy; u.moving = true; }
          }
        }
      }
      // (no auto-seek: repairmen work strictly on player orders)
    }
    // melee units (swordsmen & the Minotaur) charge the nearest enemy in
    // aggro range on their own — unless the player has given them a direct
    // order (playerOrder), which takes priority until they arrive
    // (the Minotaur no longer auto-charges — he moves and fights only on command)
    if(u.type==='swordsman' && state.enemies.length>0 && !u.playerOrder){
      const aggro = SWORDSMAN_AGGRO;
      const atkRange = SWORDSMAN_ATTACK.range;
      let best=null, bd=Infinity;
      for(const e of state.enemies){
        if(e.hp<=0) continue;
        const d = Phaser.Math.Distance.Between(u.gx,u.gy,e.gx,e.gy);
        if(d<bd){ bd=d; best=e; }
      }
      if(best && bd<=aggro){
        if(bd > atkRange*0.85){
          u.tx = best.gx; u.ty = best.gy; u.moving = true;
        } else {
          u.moving = false; // in reach — stand and fight
        }
      }
    }
    if(u.moving){
      // archers march 25% slower — longbows and quivers are heavy
      const typeSpeed = u.type==='archer' ? baseSpeed*0.75 : baseSpeed;
      const speed = typeSpeed * speedMultiplierAt(u.gx, u.gy) * (delta/1000);
      const dx = u.tx - u.gx, dy = u.ty - u.gy;
      const dist = Math.hypot(dx,dy);
      // arrive when close OR when this frame's step would overshoot —
      // otherwise units can oscillate around the target on slow frames
      const willArrive = dist < 0.05 || dist <= speed;
      const nx = willArrive ? u.tx : u.gx + (dx/dist)*speed;
      const ny = willArrive ? u.ty : u.gy + (dy/dist)*speed;
      // water is impassable to everyone, full stop. Rocks still let
      // villagers/drones through ("goat paths") — that exception was
      // never about water, just solid stone. Checked against wherever
      // this step actually lands — including a same-frame arrival — so a
      // big delta (or an order issued from point-blank range) can't skip
      // the check by reaching the target in a single step.
      const nrx = Math.round(nx), nry = Math.round(ny);
      const nt = tileAt(nrx, nry);
      const nb = occAt(nrx, nry);
      // A tiny first step barely moves gx/gy, so it can round right back to
      // the tile the unit is ALREADY standing on. Without this, a builder
      // who just finished a tower (they have to stand exactly on its tile
      // to build it) gets treated as walking INTO the tower the instant
      // they try to leave — wallBlocked fires on frame one, every frame,
      // forever, and they're stuck there permanently.
      const curTile = occAt(Math.round(u.gx), Math.round(u.gy));
      const wallBlocked = nb && BUILD_DEFS[nb.type] && BUILD_DEFS[nb.type].blocksPath
        && !BUILD_DEFS[nb.type].friendlyPassable
        && u.buildTaskId !== nb.id // never blocked from reaching the very site you're walking over to build
        && nb !== curTile; // ...nor from leaving a blocking tile you're already standing on, for any reason
      if(nt==='water' || (u.type!=='villager' && nt==='stone_deposit') || wallBlocked){
        u.moving = false; u.playerOrder = false;
      } else if(willArrive){
        u.gx = u.tx; u.gy = u.ty; u.moving = false; u.playerOrder = false;
      } else {
        u.gx = nx; u.gy = ny;
      }
      positionUnitVisuals(u, u.gx*TILE+TILE/2, u.gy*TILE+TILE/2);
    } else if(u.type==='villager' && u.gatherWorking){
      // a little "busy" bob in place — used for farm workers, who don't
      // commute anywhere, so this is the only visual cue that they're
      // actively working the tile rather than idle.
      u.bobPhase += delta;
      u.sprite.y = u.gy*TILE + TILE/2 + Math.sin(u.bobPhase/180)*3;
    }
  }
}

