// ---------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------
let enemyIdCounter = 1;
function spawnWave(){
  const wave = state.wave + 1;
  // gentler scaling: raids keep getting harder, but the growth curve is
  // flatter — the town-building game is the star, raids are the weather.
  const count = 3 + Math.round(wave*1.2);
  const hp = Math.round((26 + wave*7) * 1.15);
  const dmg = Math.round((5 + wave) * 1.15);
  // from wave 2 on, roughly a third of the raiders are PILLAGERS: they
  // ignore your Town Hall and hunt farms, camps, mills and markets. A safe
  // wall ring around the center no longer protects your sprawl.
  const pillagers = wave >= 2 ? Math.floor(count/3) : 0;
  for(let i=0;i<count;i++){
    const kind = i < pillagers ? 'pillager' : null;
    setTimeout(()=> spawnEnemy(hp, dmg, wave, kind), i*500);
  }
  // from wave 3 on, battering rams roll in: slow, very tough, immune to the
  // temptation of chasing your soldiers — they exist to flatten buildings.
  if(wave >= 3){
    const rams = 1 + Math.floor((wave-3)/3);
    for(let i=0;i<rams;i++){
      setTimeout(()=> spawnEnemy(80 + wave*10, 20, wave, 'ram'), 1500 + i*900);
    }
  }
  flashWaveBanner(`Wave ${wave} incoming!`);
}

// Small harassment raids between the big waves — one or two raiders probing
// your frontier. Cheap to kill, but they pause gathering (recall) and will
// happily murder an unescorted woodcutter, so sprawl carries real risk.
// Skirmishers now pour out of the bandit camps. No camps left standing =
// no more skirmishes — razing them is how you pacify the frontier.
function spawnSkirmish(){
  const camps = state.enemies.filter(e=>e.kind==='camp' && e.hp>0);
  if(camps.length===0) return;
  const camp = camps[Phaser.Math.Between(0, camps.length-1)];
  const n = Phaser.Math.Between(1,2);
  const hp = 24 + state.wave*3;
  const dmg = 4 + Math.ceil(state.wave*0.7);
  for(let i=0;i<n;i++) setTimeout(()=> spawnEnemy(hp, dmg, state.wave, 'pillager', {gx:camp.gx, gy:camp.gy}), i*400);
  flashWaveBanner('Skirmishers ride out from a bandit camp!');
}

// Camps squat near the map edges, well away from your Town Hall. Your
// soldiers can assault them; each one destroyed drops a pile of loot and
// permanently thins the skirmisher raids.
function spawnBanditCamps(){
  const n = Phaser.Math.Between(BANDIT_CAMP.count[0], BANDIT_CAMP.count[1]);
  const th = scene.townHallPos;
  let placed = 0, tries = 0;
  while(placed < n && tries < 200){
    tries++;
    // pick a tile within 3 of an edge
    const side = Phaser.Math.Between(0,3);
    let gx, gy;
    if(side===0){ gx=Phaser.Math.Between(1,MAP_W-2); gy=Phaser.Math.Between(1,3); }
    else if(side===1){ gx=Phaser.Math.Between(1,MAP_W-2); gy=Phaser.Math.Between(MAP_H-4,MAP_H-2); }
    else if(side===2){ gx=Phaser.Math.Between(1,3); gy=Phaser.Math.Between(1,MAP_H-2); }
    else { gx=Phaser.Math.Between(MAP_W-4,MAP_W-2); gy=Phaser.Math.Between(1,MAP_H-2); }
    if(tileAt(gx,gy)!=='grass' || occAt(gx,gy)) continue;
    if(Phaser.Math.Distance.Between(gx,gy,th.gx,th.gy) < BANDIT_CAMP.minDistFromTC) continue;
    if(state.enemies.some(e=>e.kind==='camp' && Phaser.Math.Distance.Between(e.gx,e.gy,gx,gy) < 8)) continue;
    const e = {
      id: enemyIdCounter++, gx, gy, hp:BANDIT_CAMP.hp, maxHp:BANDIT_CAMP.hp, dmg:0,
      kind:'camp', speedMult:0, path:null, pathIdx:0, lastMoveAt:0, lastAttackAt:0, target:null,
    };
    e.sprite = scene.add.image(gx*TILE+TILE/2, gy*TILE+TILE/2, 'tiles', FRAME.wall_gate).setTint(state.faction==='swarm' ? 0x8fb4e8 : 0xcc5544);
    e.hpBarBg = scene.add.rectangle(gx*TILE+TILE/2, gy*TILE-2, TILE-8, 4, 0x2a1c10).setDepth(5);
    e.hpBarFg = scene.add.rectangle(gx*TILE+4, gy*TILE-2, TILE-8, 4, 0xd85a3a).setOrigin(0,0.5).setDepth(6);
    state.enemies.push(e);
    placed++;
  }
  if(placed>0) flashWaveBanner(`${placed} bandit camp${placed>1?'s':''} spotted on the frontier — destroy them to stop the skirmishers!`);
}

function edgeSpawnPoint(){
  const side = Phaser.Math.Between(0,3);
  let gx,gy;
  if(side===0){ gx=Phaser.Math.Between(0,MAP_W-1); gy=0; }
  else if(side===1){ gx=Phaser.Math.Between(0,MAP_W-1); gy=MAP_H-1; }
  else if(side===2){ gx=0; gy=Phaser.Math.Between(0,MAP_H-1); }
  else { gx=MAP_W-1; gy=Phaser.Math.Between(0,MAP_H-1); }
  return {gx,gy};
}

function spawnEnemy(hp, dmg, wave, kind, at){
  if(state.gameOver) return;
  const {gx,gy} = at || edgeSpawnPoint();
  const k = kind || (wave%3===0 ? 'swordsman' : 'raider');
  const frame = k==='ram' ? 'enemy_ram' : (k==='swordsman' ? 'enemy_swordsman' : 'enemy_raider');
  const e = {
    id: enemyIdCounter++, gx, gy, hp, maxHp:hp, dmg, kind:k,
    speedMult: k==='ram' ? 0.55 : 1,
    path: null, pathIdx: 0, lastMoveAt:0, lastAttackAt:0, target:null,
  };
  e.sprite = scene.add.image(gx*TILE+TILE/2, gy*TILE+TILE/2, 'tiles', FRAME[frame]);
  // pillagers read as orange: they're here for your farms, not your walls
  e.baseTint = (k==='pillager') ? 0xffaa55 : null; // remembered so the web
                                                    // slow's tint can be
                                                    // restored correctly on expiry
  if(e.baseTint && e.sprite.setTint) e.sprite.setTint(e.baseTint);
  e.hpBarBg = scene.add.rectangle(gx*TILE+TILE/2, gy*TILE-2, TILE-8, 4, 0x2a1c10).setDepth(5);
  e.hpBarFg = scene.add.rectangle(gx*TILE+4, gy*TILE-2, TILE-8, 4, 0xd85a3a).setOrigin(0,0.5).setDepth(6);
  state.enemies.push(e);
  repathEnemy(e);
}

function isBlocked(gx,gy, ignoreBuildings){
  const t = tileAt(gx,gy);
  if(t==='water') return true;
  if(t==='stone_deposit') return true; // enemies are never miners — stone is solid rock to them
  if(ignoreBuildings) return false;    // siege mode: buildings are obstacles to smash, not walls of the world
  const b = occAt(gx,gy);
  return !!b;
}

// Raiders don't just meekly walk to the Town Hall and ignore whatever's
// shooting at them — if a Tower or Archer is within range, they'll break
// off and go deal with it first.
const ENEMY_AGGRO_RANGE = 6;
function findNearbyThreat(e){
  if(e.kind==='ram' || e.kind==='pillager') return null; // single-minded — buildings only
  let best=null, bestD=Infinity;
  for(const b of state.buildings){
    if(b.type!=='tower' || b.hp<=0) continue;
    const d = Phaser.Math.Distance.Between(e.gx,e.gy,b.gx,b.gy);
    if(d<=ENEMY_AGGRO_RANGE && d<bestD){ bestD=d; best=b; }
  }
  for(const u of state.units){
    if(u.hp<=0 || u.inTC) continue;
    // soldiers, heroes — and yes, unescorted villagers and repairmen too:
    // raiders will happily run down a farmer caught in the open
    const d = Phaser.Math.Distance.Between(e.gx,e.gy,u.gx,u.gy);
    if(d<=ENEMY_AGGRO_RANGE && d<bestD){ bestD=d; best=u; }
  }
  return best;
}

// The building types pillagers consider worth burning.
const PILLAGE_TARGETS = { farm:1, lumber_camp:1, quarry:1, mill:1, bakery:1, market:1, granary:1, warehouse:1, wildstone_refinery:1 };
function nearestEconomyBuilding(e){
  let best=null, bestD=Infinity;
  for(const b of state.buildings){
    if(b.hp<=0 || !PILLAGE_TARGETS[b.type]) continue;
    const d = Phaser.Math.Distance.Between(e.gx, e.gy, b.gx, b.gy);
    if(d<bestD){ bestD=d; best=b; }
  }
  return best;
}

function repathEnemy(e){
  if(e.kind==='camp') return; // camps don't march
  // pillagers hunt the economy; only when nothing is left to burn do they
  // turn on the Town Hall like everyone else
  if(e.kind==='pillager'){
    const eco = nearestEconomyBuilding(e);
    if(eco){
      let p = bfsPath(Math.round(e.gx), Math.round(e.gy), eco.gx, eco.gy, false);
      if(!p) p = bfsPath(Math.round(e.gx), Math.round(e.gy), eco.gx, eco.gy, true);
      if(p){ e.path = p; e.pathIdx = 1; e.target = null; return; }
    }
    // fall through to standard TC-march below
  }
  const threat = findNearbyThreat(e);
  const goal = threat ? {gx:Math.round(threat.gx), gy:Math.round(threat.gy)} : scene.townHallPos;
  // First try a clean route around defenses…
  let path = bfsPath(Math.round(e.gx), Math.round(e.gy), goal.gx, goal.gy, false);
  // …but if the town is fully walled in, plan a route straight THROUGH the
  // defenses instead: the enemy walks the route and bashes whatever building
  // blocks each step (see updateEnemies). This fixes raiders freezing at the
  // map edge forever once a wall ring closed — the "wave 3 lockup".
  if(!path) path = bfsPath(Math.round(e.gx), Math.round(e.gy), goal.gx, goal.gy, true);
  if(path){ e.path = path; e.pathIdx = 1; e.target = null; }
  else {
    // truly unreachable (terrain-sealed) — camp on the nearest building
    e.path = null;
    let best=null, bestD=Infinity;
    for(const b of state.buildings){
      const d = Phaser.Math.Distance.Between(e.gx,e.gy,b.gx,b.gy);
      if(d<bestD){ bestD=d; best=b; }
    }
    e.target = best;
  }
}

// Terrain-only blocking test for the "smash through" path mode.
function isBlockedForPath(gx, gy, ignoreBuildings){
  const t = tileAt(gx,gy);
  if(t==='water' || t==='stone_deposit') return true;
  if(ignoreBuildings) return false;
  return !!occAt(gx,gy);
}

// Rewritten with flat typed arrays + an index-pointer queue: the old
// version copied the whole path array per node and used queue.shift(),
// which crawled once the map grew — visible as stutter during big raids.
function bfsPath(sx, sy, tx, ty, ignoreBuildings){
  if(sx===tx && sy===ty) return [{gx:sx,gy:sy}];
  if(!inBounds(sx,sy) || !inBounds(tx,ty)) return null;
  const N = MAP_W*MAP_H;
  const visited = new Uint8Array(N);
  const prev = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N);
  let head=0, tail=0;
  const sIdx = sy*MAP_W+sx, tIdx = ty*MAP_W+tx;
  queue[tail++] = sIdx; visited[sIdx] = 1;
  const dirs = [1,-1,MAP_W,-MAP_W];
  while(head < tail){
    const cur = queue[head++];
    const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    for(let d=0; d<4; d++){
      const nIdx = cur + dirs[d];
      const nx = nIdx % MAP_W, ny = (nIdx / MAP_W) | 0;
      // reject horizontal wrap-around (x changed by more than 1)
      if(nIdx<0 || nIdx>=N || Math.abs(nx-cx)>1) continue;
      if(visited[nIdx]) continue;
      const isGoal = nIdx===tIdx;
      if(!isGoal && isBlockedForPath(nx, ny, ignoreBuildings)) continue;
      visited[nIdx] = 1; prev[nIdx] = cur;
      if(isGoal){
        const path = [];
        let p = tIdx;
        while(p !== -1){ path.push({gx:p%MAP_W, gy:(p/MAP_W)|0}); p = prev[p]; }
        path.reverse();
        return path;
      }
      queue[tail++] = nIdx;
    }
  }
  return null;
}

function updateEnemies(delta){
  const baseSpeed = 1.4; // tiles/sec
  for(const e of state.enemies){
    if(e.hp<=0) continue;
    // the web's temporary slow — ticks down regardless of what the enemy
    // is doing this frame, and restores whatever tint it had before
    // (pillager orange, or none) once it wears off
    if(e.webSlowMs > 0){
      e.webSlowMs -= delta;
      if(e.webSlowMs <= 0){
        e.webSlowMs = 0;
        if(e.sprite && e.sprite.setTint){
          if(e.baseTint) e.sprite.setTint(e.baseTint); else e.sprite.clearTint();
        }
      }
    }
    // bandit camps are structures — they never move or swing a weapon,
    // they just spawn skirmishers and soak damage until razed
    if(e.kind==='camp'){
      e.hpBarFg.width = (TILE-8)*Math.max(0,e.hp/e.maxHp);
      continue;
    }
    if(e.path && e.pathIdx < e.path.length){
      const node = e.path[e.pathIdx];
      // something (probably a wall) stands on the next step of the route —
      // stop and bash it down before continuing the march
      const blocker = occAt(node.gx, node.gy);
      if(blocker && blocker.hp > 0){
        e.target = blocker;
      } else {
        const webMult = (e.webSlowMs > 0) ? HERO.web.slowFactor : 1;
        const speed = baseSpeed * (e.speedMult||1) * webMult * speedMultiplierAt(e.gx, e.gy);
        const dx = node.gx - e.gx, dy = node.gy - e.gy;
        const dist = Math.hypot(dx,dy);
        if(dist < 0.06){
          e.gx = node.gx; e.gy = node.gy; e.pathIdx++;
          if(e.pathIdx % 4 === 0) repathEnemy(e); // re-evaluate periodically (walls may have changed)
        } else {
          e.gx += (dx/dist)*speed*(delta/1000);
          e.gy += (dy/dist)*speed*(delta/1000);
        }
      }
      if(Math.round(e.gx)===scene.townHallPos.gx && Math.round(e.gy)===scene.townHallPos.gy){
        e.target = occAt(scene.townHallPos.gx, scene.townHallPos.gy);
      }
    } else if(e.path && e.pathIdx >= e.path.length){
      // walked the whole route (e.g. a pillager standing in the ashes of a
      // razed farm) — plan the next objective
      e.path = null;
      repathEnemy(e);
    } else if(!e.path){
      // stuck, attacking blocker; occasionally retry pathing
      e.lastMoveAt += delta;
      if(e.lastMoveAt > 4000){ e.lastMoveAt=0; repathEnemy(e); }
    }
    e.sprite.setPosition(e.gx*TILE+TILE/2, e.gy*TILE+TILE/2);
    e.hpBarBg.setPosition(e.gx*TILE+TILE/2, e.gy*TILE-2);
    e.hpBarFg.setPosition(e.gx*TILE+4, e.gy*TILE-2);
    e.hpBarFg.width = (TILE-8)*Math.max(0,e.hp/e.maxHp);

    // attack logic: if adjacent to a blocking building (target) or reached town hall
    let target = (e.target && e.target.hp>0) ? e.target : null;
    if(!target){
      // check adjacency to any building along path blockage
      const adj = [[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dx,dy] of adj){
        const b = occAt(Math.round(e.gx)+dx, Math.round(e.gy)+dy);
        if(b && b.hp>0){ target = b; break; }
      }
    }
    if(!target && e.kind!=='ram'){
      // any unit standing in the enemy's way is a valid target — including
      // unescorted villagers out gathering (rams ignore people entirely)
      target = state.units.find(u=> u.hp>0 && !u.inTC && Phaser.Math.Distance.Between(u.gx,u.gy,e.gx,e.gy) <= 1.6) || null;
    }
    e.target = target;
    if(target && target.hp>0){
      const d = Phaser.Math.Distance.Between(e.gx,e.gy,target.gx,target.gy);
      if(d <= 1.6){
        e.lastAttackAt += delta;
        if(e.lastAttackAt > 1000){
          e.lastAttackAt = 0;
          if(target.type==='archer' || target.type==='villager' || target.type==='swordsman' || target.type==='captain' || target.type==='repairman') damageUnit(target, e.dmg);
          else damageBuilding(target, e.dmg);
        }
      }
    }
  }
  // cleanup dead
  const dead = state.enemies.filter(e=>e.hp<=0);
  const heroU = livingCaptain();
  for(const e of dead){
    // hero XP: enemies dying near him teach him; his own kills teach double
    if(heroU){
      const val = HERO.xpValue[e.kind] || HERO.xpValue.raider;
      const own = e.lastHitBy === 'hero';
      const near = Phaser.Math.Distance.Between(heroU.gx, heroU.gy, e.gx, e.gy) <= HERO.xpRadius;
      if(own) grantHeroXp(val*2);
      else if(near) grantHeroXp(val);
    }
    e.sprite.destroy(); e.hpBarBg.destroy(); e.hpBarFg.destroy();
    if(e.kind==='camp'){
      if(state.faction==='swarm'){
        // a razed human outpost is a feast
        addResource('food', SWARM.outpostLoot);
        if(scene && scene.add) floatResourceText(e.gx, e.gy, 'FEAST!', '#c9a0ff');
        flashWaveBanner(`Human outpost razed! The Swarm consumes ${SWARM.outpostLoot} biomass.`);
      } else {
        addResource('wood', BANDIT_CAMP.loot.wood);
        addResource('stone', BANDIT_CAMP.loot.stone);
        state.resources.gold += BANDIT_CAMP.loot.gold;
        if(scene && scene.add) floatResourceText(e.gx, e.gy, 'LOOT!', RESOURCE_COLOR.gold);
        flashWaveBanner(`Bandit camp destroyed! Looted ${BANDIT_CAMP.loot.wood} wood, ${BANDIT_CAMP.loot.stone} stone, ${BANDIT_CAMP.loot.gold} gold.`);
      }
    } else if(state.faction==='swarm'){
      // dead humans dissolve into biomass where they fall — defense feeds you
      addResource('food', SWARM.corpseBiomass);
      if(scene && scene.add) floatResourceText(Math.round(e.gx), Math.round(e.gy), '+'+SWARM.corpseBiomass+' bio', '#c9a0ff');
    } else {
      addResource('food', 1); addResource('wood', 1);
    }
  }
  state.enemies = state.enemies.filter(e=>e.hp>0);
  if(dead.length) updateHUD();
}

// ---------------------------------------------------------------------
// Combat: towers + archers auto-attack enemies in range
// ---------------------------------------------------------------------
function updateCombat(delta, time){
  const attackers = [];
  for(const b of state.buildings){
    const def = BUILD_DEFS[b.type];
    if(underConstruction(b)) continue;
    if(def && def.attack){
      // an unmanned tower still loses arrows over the wall, but weakly —
      // garrison a villager on it for full damage
      let dmg = def.attack.damage;
      if(b.type==='tower' && def.attack.damageLow!==undefined){
        const crew = towerGarrisonCount(b);
        let bonus = 0;
        for(let ci=1; ci<crew; ci++) bonus += TOWER_EXTRA_DMG[ci-1] || 0;
        dmg = crew > 0 ? def.attack.damage + bonus : def.attack.damageLow;
      }
      attackers.push({ent:b, atk:{range:def.attack.range, damage:dmg, cooldownMs:def.attack.cooldownMs}, gx:b.gx, gy:b.gy});
    }
    // a fully upgraded Town Hall mans its own battlements
    if(b.isCore){
      const n = tcGarrisonCount();
      const lvl3 = (b.level||1) >= TC_LEVELS.maxLevel;
      if(lvl3 || n > 0){
        // garrisoned villagers man the windows: +damage per villager, at
        // ANY level. Level-3 battlements stack on top.
        const effective = Math.min(n, TC_GARRISON.attackCap);
        const dmg = (lvl3 ? TC_LEVELS.attack.damage : TC_GARRISON.baseDamage) + effective * TC_GARRISON.dmgPerVillager;
        const range = lvl3 ? TC_LEVELS.attack.range : TC_GARRISON.range;
        const cd = lvl3 ? TC_LEVELS.attack.cooldownMs : TC_GARRISON.cooldownMs;
        attackers.push({ent:b, atk:{range:range, damage:dmg, cooldownMs:cd}, gx:b.gx, gy:b.gy});
      }
    }
  }
  for(const u of state.units){
    if(u.hp<=0) continue;
    if(u.type==='archer') attackers.push({ent:u, atk:ARCHER_ATTACK, gx:u.gx, gy:u.gy, soldier:true});
    else if(u.type==='swordsman') attackers.push({ent:u, atk:SWORDSMAN_ATTACK, gx:u.gx, gy:u.gy, melee:true, soldier:true});
    // the Minotaur attacks only via his manual javelin (J) and slash (K)
  }
  // the Captain's banner: soldiers within his aura strike 25% harder
  const captain = livingCaptain();
  for(const a of attackers){
    a.ent.lastAttackAt += delta;
    if(a.ent.lastAttackAt < a.atk.cooldownMs) continue;
    let best=null, bestD=Infinity;
    for(const e of state.enemies){
      if(e.hp<=0) continue;
      const d = Phaser.Math.Distance.Between(a.gx,a.gy,e.gx,e.gy);
      if(d<=a.atk.range && d<bestD){ bestD=d; best=e; }
    }
    if(best){
      a.ent.lastAttackAt = 0;
      if(a.melee){
        // quick lunge toward the target instead of an arrow
        if(a.ent.sprite && scene && scene.tweens){
          const ox = a.ent.sprite.x, oy = a.ent.sprite.y;
          const angle = Phaser.Math.Angle.Between(a.gx, a.gy, best.gx, best.gy);
          scene.tweens.add({ targets:a.ent.sprite, x:ox+Math.cos(angle)*7, y:oy+Math.sin(angle)*7, duration:90, yoyo:true });
        }
      } else {
        fireProjectile(a.gx, a.gy, best);
      }
      let dmg = a.atk.damage;
      if(a.soldier && captain && Phaser.Math.Distance.Between(captain.gx, captain.gy, a.gx, a.gy) <= CAPTAIN.auraRange){
        dmg = Math.round(dmg * CAPTAIN.auraMult);
      }
      best.hp -= dmg;
      best.lastHitBy = 'other';
    }
  }
}

function fireProjectile(gx, gy, targetEnemy){
  const sx = gx*TILE+TILE/2, sy = gy*TILE+TILE/2;
  const arrow = scene.add.image(sx, sy, 'tiles', FRAME.arrow).setDepth(8);
  const angle = Phaser.Math.Angle.Between(sx, sy, targetEnemy.gx*TILE+TILE/2, targetEnemy.gy*TILE+TILE/2);
  arrow.setRotation(angle);
  scene.tweens.add({
    targets: arrow,
    x: targetEnemy.gx*TILE+TILE/2,
    y: targetEnemy.gy*TILE+TILE/2,
    duration: 220,
    onComplete: ()=> arrow.destroy(),
  });
}

