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
    .setDepth(8).setTint(swarm ? 0xbfe89a : 0xffd76b).setScale(1.3) // hex reads sickly green, javelin gold
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
      floatResourceText(cgx, cgy, 'RISE!', '#b6c98a');
      const ring = scene.add.ellipse(cap.gx*TILE+TILE/2, cap.gy*TILE+TILE/2, 20, 20, 0x9aae78, 0.25)
        .setStrokeStyle(2, 0x9aae78, 0.9).setDepth(9);
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
          if(!(e.webSlowMs > 0) && e.sprite && e.sprite.setTint) e.sprite.setTint(0xbfe89a); // sickly hex-rot tint
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
  // small-bodied units (zerglings) pull their ring & HP bar in proportionally
  // so the UI hugs the tiny sprite instead of floating full-size around it.
  const s = u.visualScale || 1;
  u.sprite.setPosition(cx, cy);
  if(u.marker) u.marker.setPosition(cx, cy+9*s);
  if(u.hpBarBg){
    u.hpBarBg.setPosition(cx, cy-18*s);
    // hpBarFg is left-anchored (origin x=0); offset by its SCALED half-width
    // so the bar stays centered under the body (its .width is still set to
    // the full TILE-10 fraction elsewhere — setScale shrinks the render)
    u.hpBarFg.setPosition(cx-(TILE-10)*s/2, cy-18*s);
  }
}

function createArcher(gx, gy){
  const u = {
    id: unitIdCounter++, type:'archer', gx, gy, tx:gx, ty:gy,
    hp: ARCHER_HP, maxHp: ARCHER_HP, lastAttackAt: 0, moving:false,
    orderQueue: [],
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
    javCd: 0, slashCd: 0, orderQueue: [],
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
    hp, maxHp: hp, lastAttackAt: 0, moving:false, orderQueue: [],
    // zerglings are little swarmy things — scale the whole visual (body +
    // ring + HP bar) down. Humans keep full size (visualScale 1).
    visualScale: swarm ? (SWARM.zergling.scale || 1) : 1,
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  u.marker = scene.add.ellipse(cx, cy+9, 20, 9, 0x22848a, 0.55).setStrokeStyle(1, 0x9fe8e0, 0.9).setDepth(3);
  // reuse the swordsman frame for humans; zerglings get their own quadruped sprite
  u.baseTint = swarm ? SWARM.unitTints.swordsman : 0xaad4ff;
  u.sprite = scene.add.image(cx, cy, 'tiles', swarm ? FRAME.zergling_quad : FRAME.enemy_swordsman).setDepth(4).setTint(u.baseTint);
  u.hpBarBg = scene.add.rectangle(cx, cy-18, TILE-10, 4, 0x2a1c10).setDepth(5).setVisible(false);
  u.hpBarFg = scene.add.rectangle(cx-(TILE-10)/2, cy-18, TILE-10, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6).setVisible(false);
  if(u.visualScale !== 1){
    const s = u.visualScale;
    u.sprite.setScale(s); u.marker.setScale(s); u.hpBarBg.setScale(s); u.hpBarFg.setScale(s);
    positionUnitVisuals(u, cx, cy); // reflow ring/HP-bar offsets to the smaller body
  }
  state.units.push(u);
  return u;
}

function createRepairman(gx, gy){
  const u = {
    id: unitIdCounter++, type:'repairman', gx, gy, tx:gx, ty:gy,
    hp: REPAIRMAN.hp, maxHp: REPAIRMAN.hp, lastAttackAt: 0, moving:false,
    repairTargetId: null, repMs: 0, orderQueue: [],
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
    orderQueue: [],
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  u.marker = scene.add.ellipse(cx, cy+9, 18, 8, 0x3a7a3a, 0.5).setStrokeStyle(1, 0xa8e6a1, 0.85).setDepth(3);
  // the undead drone is a proper ghoul sprite (baked sickly-green flesh), so
  // it needs no runtime tint — unlike the other swarm units which recolor a
  // shared frame
  u.sprite = scene.add.image(cx, cy, 'tiles', state.faction==='swarm' ? FRAME.ghoul : FRAME.villager).setDepth(4);
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
  if(u.queueMarkers) for(const m of u.queueMarkers) m.destroy();
}

function removeUnit(u){
  u.hp = 0;
  // fallen humans leave a corpse to bury (or, in enemy hands one day, to
  // raise). Only the living do: the undead's units are already dead, and
  // the hero has a revival of his own. (See CORPSE in content.js.)
  if(state.faction!=='swarm' && (u.type==='villager' || u.type==='repairman' || u.type==='archer' || u.type==='swordsman')){
    spawnCorpse(u.gx, u.gy);
  }
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
  u.path = null; // a direct order overrides any in-progress computed path
  u.tx = gx; u.ty = gy; u.moving = true;
  // a direct order suppresses the melee auto-charge until they arrive —
  // this was the hero bug: his charge instinct overwrote every move
  // command the moment any enemy was inside aggro range
  u.playerOrder = true;
}

// ---------------------------------------------------------------------
// Order queue (shift-click)
// Right-click gives an order immediately, same as always. Shift+right-click
// instead appends the SAME order to a small queue (ORDER_QUEUE_MAX deep)
// that fires automatically once the unit goes fully idle — one order
// resolver/executor pair backs both paths, so "queued" and "immediate"
// can never drift apart. Works identically for drones: they're just
// villagers under the swarm skin, so nothing swarm-specific is needed here.
//
// Two of the six order kinds (work, garrisonTower) put a unit into an
// OPEN-ENDED state with no natural "done" moment — gathering and manning a
// tower both run forever until something else ends them. A queue entry
// behind one of those simply won't fire until that happens; that's a
// property of the job, not a bug in the queue.
// ---------------------------------------------------------------------

// The building/garrison/repair half of order resolution — deliberately
// ignores whether the unit could physically stand on (gx,gy), since a
// building order targets the STRUCTURE, not the tile. Returns null if
// nothing building-related applies here for this unit type. Split out from
// resolveOrder so group orders (below) can tell "this unit has somewhere
// specific to go" apart from "this unit just needs a nearby tile to walk
// to" — they can't all stand on the exact clicked tile, but they should
// never be blocked from building/working/repairing just because that
// single tile happens to be occupied by a groupmate.
function resolveBuildingOrder(u, gx, gy){
  const bAt = occAt(gx, gy);
  if(u.type==='villager'){
    if(bAt && bAt.isCore) return {kind:'garrisonTC'};
    if(bAt && bAt.hp>0 && underConstruction(bAt) && (bAt.awaitingBuilder || state.faction!=='swarm')){
      return {kind:'build', buildingId: bAt.id};
    }
    const targetBuilding = findProductionBuildingFor(gx, gy);
    if(targetBuilding) return {kind:'work', buildingId: targetBuilding.id};
  } else if(u.type==='repairman'){
    if(bAt && (bAt.type==='wall' || bAt.type==='tower') && bAt.hp < bAt.maxHp) return {kind:'repair', buildingId: bAt.id};
  } else if(u.type==='archer'){
    if(bAt && bAt.type==='tower' && bAt.hp>0) return {kind:'garrisonTower', buildingId: bAt.id};
  } else if(u.type==='captain' && state.faction==='swarm'){
    // the Necromancer raises the fallen where they lie
    const c = corpseAt(gx, gy);
    if(c) return {kind:'raise', corpseId: c.id};
    return null; // ghouls & the Necromancer never bury — they raise
  }
  // burying the fallen: ALL the living can do it — villagers, soldiers,
  // repairmen, and the hero — humans only (the undead raise instead).
  if(state.faction!=='swarm'){
    const c = corpseAt(gx, gy);
    if(c) return {kind:'bury', corpseId: c.id};
  }
  return null;
}

// Figure out what right-clicking (gx,gy) with unit u WOULD do, without
// doing it — used for both the immediate-order path and shift-queueing.
// Returns null if there's nothing valid to do there (matches the old
// silent-no-op behavior for e.g. right-clicking an occupied/blocked tile).
function resolveOrder(u, gx, gy){
  const order = resolveBuildingOrder(u, gx, gy);
  if(order) return order;
  if(isTileFreeForUnit(gx, gy, u)) return {kind:'move', gx, gy};
  return null;
}

// Actually carry out a resolved order. Building/tile references are
// re-checked here (not trusted from resolve time) because a QUEUED order
// can sit for a while before it fires — the target may have finished,
// been destroyed, or already been fully repaired by then.
function executeOrder(u, order){
  if(!order || u.hp<=0) return;
  if(order.kind==='garrisonTC'){
    garrisonVillagerInTC(u);
  } else if(order.kind==='build'){
    const b = buildingById(order.buildingId);
    if(!b || b.hp<=0 || !underConstruction(b)) return;
    const prevBuilder = state.units.find(x=> x.type==='villager' && x.hp>0 && x.buildTaskId===b.id && x!==u);
    if(prevBuilder) prevBuilder.buildTaskId = null;
    unassignVillager(u);
    u.buildTaskId = b.id;
    u.tx = b.gx; u.ty = b.gy; u.moving = true; u.playerOrder = true;
    flashWaveBanner(`Villager sent to build the ${BUILD_DEFS[b.type].name}.`);
  } else if(order.kind==='work'){
    const b = buildingById(order.buildingId);
    if(!b || b.hp<=0) return;
    assignVillagerToBuilding(u, b);
    flashWaveBanner(`Villager assigned to ${BUILD_DEFS[b.type].name}.`);
  } else if(order.kind==='repair'){
    const b = buildingById(order.buildingId);
    if(!b || b.hp<=0 || b.hp>=b.maxHp) return;
    u.repairTargetId = b.id;
    flashWaveBanner('Repairman heads to the damage.');
  } else if(order.kind==='garrisonTower'){
    const b = buildingById(order.buildingId);
    if(!b || b.hp<=0 || b.type!=='tower') return;
    if(u.inTowerId && u.inTowerId!==b.id) exitTower(u); // switching towers — climb down first
    u.garrisonId = b.id; u.path = null;
    u.tx = b.gx; u.ty = b.gy; u.moving = true;
    flashWaveBanner('Archer climbs the tower.');
  } else if(order.kind==='bury'){
    const c = corpseById(order.corpseId);
    if(!c) return; // already rotted or buried by someone else
    // any of the living can bury — drop whatever they were doing first
    if(u.inTowerId) exitTower(u);
    if(u.type==='villager') unassignVillager(u);
    else if(u.type==='repairman') u.repairTargetId = null;
    else if(u.type==='archer'){ u.garrisonId = null; u.path = null; }
    u.buryCorpseId = c.id;
    u.tx = c.gx; u.ty = c.gy; u.moving = true; u.playerOrder = true;
    flashWaveBanner('Heading over to lay the fallen to rest.');
  } else if(order.kind==='raise'){
    const c = corpseById(order.corpseId);
    if(!c) return;
    u.raiseCorpseId = c.id; u.path = null;
    u.tx = c.gx; u.ty = c.gy; u.moving = true; u.playerOrder = true;
    flashWaveBanner('The Necromancer approaches the fallen...');
  } else if(order.kind==='move'){
    if(u.inTowerId) exitTower(u); // any move order pops them out of the tower
    u.buryCorpseId = null; // a move cancels a pending burial, whoever's doing it
    if(u.type==='villager') unassignVillager(u);
    else if(u.type==='repairman') u.repairTargetId = null;
    else if(u.type==='archer'){ u.garrisonId = null; u.path = null; }
    else if(u.type==='captain'){ u.raiseCorpseId = null; }
    commandUnitMove(u, order.gx, order.gy);
  }
}

function describeOrder(order){
  if(order.kind==='move') return 'move';
  if(order.kind==='garrisonTC') return 'shelter in the Town Hall';
  if(order.kind==='garrisonTower') return 'garrison the tower';
  if(order.kind==='repair') return 'repair';
  if(order.kind==='build') return 'build';
  if(order.kind==='work') return 'work';
  if(order.kind==='bury') return 'bury the fallen';
  if(order.kind==='raise') return 'raise the fallen';
  return 'order';
}

// Appends to the queue (shift-click). Full queues reject new orders rather
// than silently dropping an old one — the player should notice and either
// wait for it to drain or right-click (no shift) to clear-and-replace.
function queueOrder(u, order){
  if(!order) return false;
  u.orderQueue = u.orderQueue || [];
  if(u.orderQueue.length >= ORDER_QUEUE_MAX){
    flashWaveBanner(`Order queue full (${ORDER_QUEUE_MAX}/${ORDER_QUEUE_MAX}) — right-click without shift to clear it.`);
    return false;
  }
  u.orderQueue.push(order);
  flashWaveBanner(`Queued (${u.orderQueue.length}/${ORDER_QUEUE_MAX}): ${describeOrder(order)}.`);
  refreshQueueMarkers(u);
  return true;
}

// Called once a unit goes fully idle with something waiting. Pulled from
// the front (FIFO — orders happen in the sequence they were queued).
function advanceOrderQueue(u){
  if(!u.orderQueue || !u.orderQueue.length) return;
  const next = u.orderQueue.shift();
  executeOrder(u, next);
  refreshQueueMarkers(u);
}

function clearOrderQueue(u){
  if(u.orderQueue && u.orderQueue.length){ u.orderQueue = []; refreshQueueMarkers(u); }
}

// A unit is only truly "idle" — eligible to pop its next queued order —
// once every busy-indicator is clear. Checking it this way (rather than
// hooking every individual completion site) means any new busy-state added
// later gets queue support for free, and it self-heals if a queued target
// goes stale (executeOrder's checks just no-op and the NEXT frame moves on).
function isUnitIdle(u){
  return !u.moving && !u.assignedBuildingId && !u.buildTaskId && !u.garrisonId
    && !u.repairTargetId && !u.buryCorpseId && !u.raiseCorpseId && !u.inTC && !u.enteringTC;
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
  updateQueueMarkerVisibility();
}

function setGroupSelection(units){
  selectEntity(null, null);
  clearGroupSelection();
  if(units.length === 1){ selectEntity('unit', units[0]); return; }
  state.selectedGroup = units;
  for(const u of units) if(u.sprite) u.sprite.setTint(0xffe08a);
  updateQueueMarkerVisibility();
  refreshInfoPanel();
}

// spread a group over free tiles ring by ring around the target — shared by
// the immediate and queued group-move paths so they can never drift apart
function computeGroupTargets(units, gx, gy){
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
  return targets;
}

// build/garrisonTC are single-assignee jobs — only one unit in a group
// should actually claim one (executeOrder's own "bump the previous
// builder" logic would otherwise have groupmates fight over it, with only
// the last one processed actually winning). work/garrisonTower/repair have
// real worker caps (or just don't conflict), so every eligible groupmate
// is let through for those.
const SINGLE_ASSIGNEE_KINDS = new Set(['build', 'garrisonTC', 'bury', 'raise']);
function resolveGroupOrders(units, gx, gy){
  const claimed = new Set();
  return units.map(u=>{
    const order = resolveBuildingOrder(u, gx, gy);
    if(order && SINGLE_ASSIGNEE_KINDS.has(order.kind)){
      const key = order.kind + ':' + (order.buildingId != null ? order.buildingId : (order.corpseId != null ? 'c'+order.corpseId : 'core'));
      if(claimed.has(key)) return null; // a groupmate already has this — fall back to a spread move
      claimed.add(key);
    }
    return order;
  });
}

// A group right-click checks EACH unit for a building order first (build/
// work/garrison/repair — whichever applies to that unit's type) and only
// falls back to a plain move for whoever has nothing building-related to
// do there (or already lost a single-assignee job to a groupmate). Only
// the movers get spread across nearby tiles — they can't all stand on the
// one clicked tile, but that's no reason to block a villager from being
// sent to build/work the thing that IS there.
function commandGroupMove(units, gx, gy){
  const live = units.filter(u=>u.hp>0);
  const orders = resolveGroupOrders(live, gx, gy);
  const movers = live.filter((u,i)=> !orders[i]);
  const targets = computeGroupTargets(movers, gx, gy);
  let mi = 0;
  live.forEach((u, i)=>{
    const order = orders[i];
    if(order){ executeOrder(u, order); return; }
    const t = targets.length ? targets[mi % targets.length] : {gx, gy};
    mi++;
    executeOrder(u, {kind:'move', gx:t.gx, gy:t.gy});
  });
}

// shift-click on a group: same per-unit resolution, but queued behind
// whatever each unit is currently doing instead of interrupting it
function queueGroupMove(units, gx, gy){
  const live = units.filter(u=>u.hp>0);
  const orders = resolveGroupOrders(live, gx, gy);
  const movers = live.filter((u,i)=> !orders[i]);
  const targets = computeGroupTargets(movers, gx, gy);
  let mi = 0;
  live.forEach((u, i)=>{
    const order = orders[i];
    if(order){ queueOrder(u, order); return; }
    const t = targets.length ? targets[mi % targets.length] : {gx, gy};
    mi++;
    queueOrder(u, {kind:'move', gx:t.gx, gy:t.gy});
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

// ---- friendly pathfinding ----
// Straight-line walking stops dead at the first blocking tile — fine in the
// open, useless once the town has walls (a villager sent to a tower embedded
// in a wall line just twitched against the stones forever). BFS over the
// tile grid, same idea as the enemies' repathEnemy, but with FRIENDLY rules:
// gates are passable, stone is passable for villagers (goat paths), and the
// walk may end ON a normally-blocking goal tile (a foundation the unit is
// assigned to build). Only the automated work-walks (build sites, tower
// posts) use this; plain right-click moves stay straight-line, same as ever.
function friendlyBlocked(u, gx, gy, goalBuildingId){
  if(!inBounds(gx, gy)) return true;
  const t = tileAt(gx, gy);
  if(t==='water') return true;
  if(t==='stone_deposit' && u.type!=='villager') return true;
  const b = occAt(gx, gy);
  if(!b || b.id===goalBuildingId) return false;
  const def = BUILD_DEFS[b.type];
  return !!(def && def.blocksPath && !def.friendlyPassable);
}

// Returns waypoints from the unit's tile to (tx,ty) — excluding the start
// tile — or null when unreachable.
function findFriendlyPath(u, tx, ty, goalBuildingId){
  const sx = Math.round(u.gx), sy = Math.round(u.gy);
  if(sx===tx && sy===ty) return [];
  const key = (x,y)=> y*MAP_W + x;
  const prev = new Map();
  prev.set(key(sx,sy), null);
  const q = [[sx,sy]];
  while(q.length){
    const [x,y] = q.shift();
    if(x===tx && y===ty){
      const path = [];
      let cur = [x,y];
      while(cur){ path.push({gx:cur[0], gy:cur[1]}); cur = prev.get(key(cur[0], cur[1])); }
      path.reverse();
      path.shift(); // drop the start tile — the unit is already there
      return path;
    }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx, ny=y+dy;
      if(prev.has(key(nx,ny))) continue;
      if(friendlyBlocked(u, nx, ny, goalBuildingId)) continue;
      prev.set(key(nx,ny), [x,y]);
      q.push([nx,ny]);
    }
  }
  return null;
}

// Path to a tower's BASE (any tile within Chebyshev 1 of it). Usually the
// path ends on the tower tile via the goal exception and we drop that last
// step; if all four sides are walled, a diagonally-adjacent tile still
// counts as the post, so fall back to trying the corners as explicit goals.
function findPathToTowerPost(u, t){
  let p = findFriendlyPath(u, t.gx, t.gy, t.id);
  if(p){ if(p.length) p.pop(); return p; }
  let best = null;
  for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
    const gx=t.gx+dx, gy=t.gy+dy;
    if(friendlyBlocked(u, gx, gy, t.id)) continue;
    const q = findFriendlyPath(u, gx, gy, t.id);
    if(q && (!best || q.length < best.length)) best = q;
  }
  return best;
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
    if(u.inTowerId){
      // tucked inside a tower — inert until released. If the tower fell out
      // from under them some way removeBuilding didn't catch, self-heal.
      const t = buildingById(u.inTowerId);
      if(!t || t.hp<=0) exitTower(u);
      else continue;
    }
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
        u.buildTaskId = null; u.path = null;
      } else if(Math.round(u.gx)===targetBuilding.gx && Math.round(u.gy)===targetBuilding.gy){
        // ACTUALLY at the site — merely having stopped isn't enough. (The
        // old check here fired whenever the builder stood still ANYWHERE,
        // so one blocked by a wall "started" the construction remotely and
        // the site then read as having a builder forever — the wall-chain
        // stall.)
        if(targetBuilding.awaitingBuilder){
          targetBuilding.awaitingBuilder = false;
          if(targetBuilding.sprite && targetBuilding.sprite.setAlpha) targetBuilding.sprite.setAlpha(0.55);
          if(scene && scene.add) floatResourceText(targetBuilding.gx, targetBuilding.gy, 'building started!', '#a8e6a1');
          if(state.faction==='swarm'){
            if(scene && scene.add) floatResourceText(Math.round(u.gx), Math.round(u.gy), 'rising...', '#b6c98a');
            destroyUnitVisuals(u);
            state.units = state.units.filter(x=>x!==u);
            syncPopulationCount();
            continue; // this unit is gone — nothing further to do with it this frame
          }
        }
      } else if(!u.path || !u.path.length){
        // stopped short of the site (something blocked the straight walk) —
        // path around the obstacles instead of twitching against them
        u.path = findFriendlyPath(u, targetBuilding.gx, targetBuilding.gy, targetBuilding.id);
        if(!u.path){
          u.buildTaskId = null; // genuinely unreachable — free the builder so dispatch can try someone else
          flashWaveBanner('A builder can\'t reach the site — is it walled off?');
        }
      }
    }
    // burial: a villager standing over the corpse lays it to rest
    if(u.buryCorpseId && !u.moving){ // any of the living: villager, soldier, repairman, or hero
      const c = corpseById(u.buryCorpseId);
      if(!c){ u.buryCorpseId = null; } // rotted away (or someone else got there) mid-walk
      else if(Math.round(u.gx)===c.gx && Math.round(u.gy)===c.gy){
        u.buryCorpseId = null;
        state.burialBoost = Math.min((state.burialBoost||0) + CORPSE.buryHappy, CORPSE.buryHappyCap);
        if(scene && scene.add) floatResourceText(c.gx, c.gy, 'laid to rest', '#a8e6a1');
        removeCorpse(c);
        updateHUD();
      } else if(!u.path || !u.path.length){
        // stopped short (blocked) — path around, same as the other work-walks
        u.path = findFriendlyPath(u, c.gx, c.gy, null);
        if(!u.path) u.buryCorpseId = null; // unreachable — give up gracefully
      }
    }
    // raising: the Necromancer within reach pulls the fallen up as a skeleton
    if(u.type==='captain' && u.raiseCorpseId && !u.moving && state.faction==='swarm'){
      const c = corpseById(u.raiseCorpseId);
      if(!c){ u.raiseCorpseId = null; } // rotted to carrion before he arrived
      else if(Phaser.Math.Distance.Between(u.gx, u.gy, c.gx, c.gy) <= 1.6){
        u.raiseCorpseId = null;
        if(state.population.current >= state.population.cap){
          flashWaveBanner('The dead are at their limit — raise more Grave Mounds!');
        } else if(state.resources.food < CORPSE.raiseCost){
          flashWaveBanner(`Not enough carrion to raise the fallen (${CORPSE.raiseCost} needed).`);
        } else {
          state.resources.food -= CORPSE.raiseCost;
          const sk = createSwordsman(c.gx, c.gy);
          sk.raised = true; // raised dead are swarm units — they leave no corpse, so no re-raising chains
          removeCorpse(c);
          syncPopulationCount();
          if(scene && scene.add) floatResourceText(c.gx, c.gy, 'RISE!', '#b6c98a');
          updateHUD();
        }
      } else if(!u.path || !u.path.length){
        u.path = findFriendlyPath(u, c.gx, c.gy, null);
        if(!u.path) u.raiseCorpseId = null;
      }
    }
    if(u.type==='villager' && u.assignedBuildingId && !u.enteringTC) updateGatherer(u, delta);
    // garrisoning archers walk to their tower and climb INSIDE it (hidden
    // and safe, like the Town Hall garrison) — pathing around walls en route
    if(u.type==='archer' && u.garrisonId){
      const t = buildingById(u.garrisonId);
      if(!t || t.hp<=0 || t.type!=='tower'){ u.garrisonId = null; u.path = null; }
      else if(!u.moving){
        const atPost = Math.max(Math.abs(Math.round(u.gx)-t.gx), Math.abs(Math.round(u.gy)-t.gy)) <= 1;
        if(atPost){
          if(towerGarrison(t).total < TOWER_GARRISON_CAP){ enterTower(u, t); continue; }
          // tower full — wait at the base; a slot may open
        } else if(!u.path || !u.path.length){
          u.path = findPathToTowerPost(u, t);
          if(!u.path || !u.path.length){
            u.garrisonId = null; u.path = null; // unreachable — stand down
            flashWaveBanner('The archer can\'t reach that tower — is it walled off?');
          }
        }
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
    // follow a computed path (build-site / tower-post walks) one waypoint at
    // a time — each leg is a plain straight walk to an adjacent tile the BFS
    // already validated, so the normal movement code below just works
    if(!u.moving && u.path && u.path.length){
      const wp = u.path.shift();
      u.tx = wp.gx; u.ty = wp.gy; u.moving = true;
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
        u.path = null; // the world changed under a computed path — recompute from wherever we stopped
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
    // fully idle with something queued? pop the next order. Placed once
    // per unit per frame rather than at each individual completion site —
    // whatever JUST freed them up (a plain move, a finished build, a
    // completed repair...) is already reflected in isUnitIdle() by now.
    if(u.orderQueue && u.orderQueue.length && isUnitIdle(u)) advanceOrderQueue(u);
  }
}

