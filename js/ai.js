// ---------------------------------------------------------------------
// The enemy town
//
// Phase 2: static infrastructure. The town is laid out at world creation,
// defends itself with towers and a standing garrison, and razing its core
// wins the run. It has no economy and never attacks you — its workers,
// build orders and armies arrive in Phases 3 and 4, and this file is where
// they will live.
// ---------------------------------------------------------------------

// How the town is arranged, relative to its core. Kept as data so the
// layout can be reshaped without touching placement code.
const AI_TOWN_PLAN = {
  // ring of towers facing the pass you will arrive through, plus a couple
  // covering the flanks — an undefended base is a demolition job, not a fight
  towers:   [ [-6,-5], [-6,5], [-6,0], [2,-7], [2,7] ],
  barracks: [ [3,-2], [3,3] ],
  houses:   [ [-3,-4], [-1,-5], [1,-4], [-3,4], [-1,5], [1,4], [4,0] ],
  farms:    [ [5,-4], [6,-2], [5,3], [6,1] ],
  lumber:   [ [-4,-2], [-4,2] ],
  quarry:   [ [4,-6], [4,6] ],
  // a partial wall screening the western approach, with gaps — a solid
  // shell would just stall your army on a wall it has to chew through
  walls:    [ [-8,-4], [-8,-3], [-8,-2], [-8,2], [-8,3], [-8,4] ],
  // standing defenders, as offsets from the core
  garrison: { melee: [ [-5,-2], [-5,2], [-2,0] ], ranged: [ [-4,-4], [-4,4], [0,-3], [0,3] ] },
};

function aiTownCenter(){
  const z = zoneCenter('enemy');
  return z || { gx: Math.floor(MAP_W*0.85), gy: Math.floor(MAP_H/2) };
}

// Can an AI structure of this size stand here? Trees and rock do NOT block:
// a town clears its own ground, and clearGroundFor below does exactly that.
// Refusing on terrain meant a forest blob rolled over the town centre could
// stop the CORE from placing at all — and a town with no core hands you
// instant victory on frame one, before you have even seen it.
function aiCanPlace(gx, gy, size){
  for(let dy=0; dy<size; dy++){
    for(let dx=0; dx<size; dx++){
      const x = gx+dx, y = gy+dy;
      if(!inBounds(x,y)) return false;
      if(!inZone(x, 'enemy')) return false;   // never spill into the pass
      if(isImpassableTile(tileAt(x,y))) return false;  // water/rock stays
      if(occAt(x,y)) return false;
    }
  }
  return true;
}

// Fell the trees and clear the rubble under a footprint, re-skinning the
// tiles so the map matches what the grid now says.
function clearGroundFor(gx, gy, size){
  for(let dy=0; dy<size; dy++){
    for(let dx=0; dx<size; dx++){
      const x = gx+dx, y = gy+dy;
      if(!inBounds(x,y)) continue;
      if(state.grid[y][x] === 'grass') continue;
      state.grid[y][x] = 'grass';
      state.resourceQty[y][x] = null;
      const spr = state.tileSprites[y] && state.tileSprites[y][x];
      if(spr && spr.setFrame){ spr.setFrame(FRAME.grass); if(spr.clearTint) spr.clearTint(); }
    }
  }
}

function placeAiBuilding(type, gx, gy){
  const def = aiDef(type);
  if(!def) return null;
  const size = def.size || 1;
  if(!aiCanPlace(gx, gy, size)) return null;
  clearGroundFor(gx, gy, size);
  const b = createBuilding(type, gx, gy, def, OWNER_AI);
  b.aiType = type;
  if(def.isCore) b.isCore = true;
  return b;
}

// Lay the town out around its core. Anything that will not fit is simply
// skipped — a blocked slot costs the enemy one building, it does not throw.
function generateAiTown(){
  const c = aiTownCenter();
  const built = [];

  // The core must exist — the whole win condition hangs off it. If the exact
  // centre is somehow unusable (map edge, water), spiral outward rather than
  // give up: a town without a core would hand the player instant victory.
  let core = placeAiBuilding('ai_core', c.gx, c.gy);
  for(let r=1; !core && r<=6; r++){
    for(let dy=-r; dy<=r && !core; dy++){
      for(let dx=-r; dx<=r && !core; dx++){
        if(Math.abs(dx)!==r && Math.abs(dy)!==r) continue;   // ring only
        core = placeAiBuilding('ai_core', c.gx+dx, c.gy+dy);
      }
    }
  }
  if(core){ built.push(core); c.gx = core.gx; c.gy = core.gy; }
  else console.error('Enemy town could not place its core — victory check stays disarmed.');

  const groups = [
    ['ai_tower',    AI_TOWN_PLAN.towers],
    ['ai_barracks', AI_TOWN_PLAN.barracks],
    ['ai_house',    AI_TOWN_PLAN.houses],
    ['ai_farm',     AI_TOWN_PLAN.farms],
    ['ai_lumber',   AI_TOWN_PLAN.lumber],
    ['ai_quarry',   AI_TOWN_PLAN.quarry],
    ['ai_wall',     AI_TOWN_PLAN.walls],
  ];
  for(const [type, offsets] of groups){
    for(const [dx,dy] of offsets){
      const b = placeAiBuilding(type, c.gx+dx, c.gy+dy);
      if(b) built.push(b);
    }
  }

  state.aiTownCenter = { gx:c.gx, gy:c.gy };
  return built;
}

// The standing garrison. These are ordinary enemies — the same entities the
// raids use — so they render, take damage and die through code that already
// works. They are spawned homeGuard:true, which pins them to the town
// instead of marching on you.
function spawnAiGarrison(){
  // the RECORDED centre, not the zone midpoint — the core spirals outward if
  // its ideal spot is unusable, and guards posted around the old midpoint
  // would be defending an empty field next to the town
  const c = state.aiTownCenter || aiTownCenter();
  // aiTownRace() already resolves to a key ENEMY_RACES holds (human/undead/
  // troll) — the old ternary flattened everything that was not undead to
  // human, which would have put human knights in a tribe town's garrison.
  const race = aiTownRace();
  const hp = 34, dmg = 6;
  const out = [];
  for(const [dx,dy] of AI_TOWN_PLAN.garrison.melee){
    const e = spawnEnemy(hp, dmg, 3, 'swordsman', {gx:c.gx+dx, gy:c.gy+dy}, {race});
    if(e) out.push(e);
  }
  for(const [dx,dy] of AI_TOWN_PLAN.garrison.ranged){
    const e = spawnEnemy(hp, dmg, 3, 'raider', {gx:c.gx+dx, gy:c.gy+dy}, {race, ranged:true});
    if(e) out.push(e);
  }
  // Homebodies: they defend what is theirs and never walk to your town.
  // Without this they would path straight through the sealed passes toward
  // your Town Hall the moment the world loaded.
  for(const e of out){
    e.homeGuard = true;
    e.homeGx = e.gx; e.homeGy = e.gy;
  }
  return out;
}

// ---- the enemy's blight -------------------------------------------------
// When the enemy town is UNDEAD it should sit on blight, the same as an
// undead player's town does. It never did: the town wore crypt and
// bone-spire sprites on bare grass, which reads as a human town in fancy
// dress rather than a necropolis.
//
// This reuses state.creep and the whole existing spread system rather than
// running a parallel one. That is safe because AT MOST ONE SIDE IS EVER
// UNDEAD: the enemy's faction is drawn from the three you are not playing, so
// a swarm-vs-swarm mirror cannot happen, and nobody else seeds, spreads or
// reads creep.
//
// (That invariant used to be stated as "the enemy is undead exactly when the
// player is human", which stopped being true the moment the enemy could draw
// any of four factions. The conclusion survived only because mirrors are
// excluded — worth knowing if a mirror mode is ever added, because then the
// two blights WOULD share one grid and each side would be able to build on
// the other's territory.)
//
// Creep has no effect on movement — only roads and forest do — so the
// player's units are unaffected walking over it.
function aiBlightSources(){
  if(aiTownRace() !== 'undead') return [];
  const out = [];
  for(const b of aiBuildings()){
    if(b.hp <= 0 || underConstruction(b)) continue;
    // the core anchors a wide field; outposts carry a little with them, which
    // is what makes their push into the neutral zone visible from a distance
    const r = b.isCore ? 7 : (b.aiType === 'ai_tower' || b.aiType === 'ai_barracks' ? 3 : 2);
    out.push({ gx: b.gx, gy: b.gy, r });
  }
  return out;
}

// Instant field around the town at world creation, so it never looks like the
// blight only started when you turned up to watch.
function seedAiBlight(){
  if(aiTownRace() !== 'undead') return 0;
  const c = state.aiTownCenter || aiTownCenter();
  let n = 0;
  const R = 7;
  for(let dy=-R; dy<=R; dy++){
    for(let dx=-R; dx<=R; dx++){
      if(Math.hypot(dx, dy) > R) continue;
      if(claimCreepTile(c.gx+dx, c.gy+dy)) n++;
    }
  }
  return n;
}

function updateAiBlight(delta){
  if(aiTownRace() !== 'undead') return;
  state._aiBlightMs = (state._aiBlightMs || 0) + delta;
  if(state._aiBlightMs < SWARM.creep.spreadMs) return;
  state._aiBlightMs = 0;
  updateCreep(aiBlightSources());
}

// Razing the core ends the run. Checked once per frame rather than hooked
// into removeBuilding so it cannot be missed by a future death path.
function checkAiDefeated(){
  if(state.gameOver || !state.aiTownSpawned) return;
  if(aiTownHall()) return;
  endGame(true);
}

// ---------------------------------------------------------------------
// Phase 3: the economy
//
// A real one. Workers walk to real resource tiles, deplete the SAME
// state.resourceQty your villagers draw from, haul the load home, and only
// then does the enemy have anything to spend. That is what makes the race
// real: strip a forest first and their workers find nothing there, kill
// their workers and everything downstream slows.
//
// Everything tunable lives in this one block, so difficulty can be moved
// without touching the logic below.
// ---------------------------------------------------------------------
const AI_TUNING = {
  thinkMs: 1500,               // how often the brain re-evaluates
  // Minimum gap between buildings going up. Affordability alone is far too
  // loose a leash: once the economy balanced, the enemy could pay for a
  // building nearly every think cycle and put up 163 of them in twelve
  // minutes. This is the main difficulty dial — lower it for a fiercer
  // opponent, raise it for a gentler one.
  buildCooldownMs: 20000,
  // Building costs are multiplied by this. AI_BUILD_DEFS mirrors the player's
  // costs on purpose, but the enemy fields nine gatherers against your
  // handful, so at face value it out-earned its own spending three to one and
  // banked ~1400 of each resource. That made construction gated purely by the
  // cooldown, which in turn made its workers decorative — killing all nine
  // changed its 14-minute building count by zero. Scaling costs here (rather
  // than editing the defs) keeps resources the binding constraint, and keeps
  // the shared vocabulary with BUILD_DEFS intact.
  costMult: 5,
  start: { food:120, wood:90, stone:40 },   // enough to open, not to coast

  workerTarget: 9,             // gatherers it wants before it stops training more
  // Undead only: never dissolve the crew below this into buildings. Workers
  // cost carrion and carrion is gathered by workers, so a town that spent its
  // last drone on a Grave Mound could never recover.
  workerFloor: 3,
  workerCost: { food:45 },
  workerTrainMs: 12000,
  workerHp: 22,
  workerSpeed: 1.25,           // tiles/sec

  soldierCost: { food:40, wood:20 },
  soldierTrainMs: 13000,
  // ---- war (Phase 4) ----
  // Army size is NOT on a difficulty curve — it is paid for out of what the
  // enemy actually gathered. Cripple their economy and fewer soldiers get
  // trained, so the pressure you face genuinely falls. That is the loop the
  // real-economy choice was for; a fixed schedule would have severed it.
  homeGarrisonTarget: 6,       // defenders that never leave the town
  soldierHardCap: 22,          // stops a runaway economy fielding an endless horde
  attackPartySize: 7,          // musters this many, then marches
  attackCooldownMs: 60000,     // minimum gap between parties leaving
  // A full 3:30 of peace after the pass opens. You have just fought five
  // raids and the world has tripled in size; the first war party arriving
  // while you are still reading the map is not a fight, it is an ambush.
  firstAttackDelayMs: 210000,
  // Defending the expansion: damage to ANY of their buildings raises an alarm
  // that nearby defenders answer, then drift home from.
  alarmMs: 25000,
  alarmResponseRange: 26,
  alarmMaxResponders: 5,
  // How far ahead of its own rearguard a marching party will get before the
  // leaders stop and wait. Sharing an objective was not enough on its own:
  // members still walk their own paths at their own speeds, ranged troops
  // halt to shoot while melee keeps going, and over ~100 tiles that strings
  // the party into single file — which is what "attacking individually"
  // actually looked like. They now advance at the pace of the slowest.
  cohesionRadius: 6,
  // Once this close to the objective, cohesion is released and everyone
  // commits — otherwise the front rank politely waits at the wall.
  commitRange: 10,

  // Farms are only tended while the larder is below this. Without a ceiling
  // every farm grabs a worker before anyone cuts wood, and the enemy sits on
  // a mountain of food it cannot spend while its build order stalls waiting
  // on timber (measured: 1537 food banked against 1 wood over six minutes).
  foodComfort: 180,
  haulAmount: 8,               // carried per trip
  harvestMs: 2600,             // time spent cutting/mining before hauling
  farmFoodPerTick: 3,          // per tended farm, per economy tick
  searchRadius: 22,            // how far a worker will walk for a node

  // Built in order, each when affordable and a spot exists. Adding an entry
  // is the whole change — the loop reads costs off AI_BUILD_DEFS.
  buildOrder: [
    'ai_lumber','ai_farm','ai_house','ai_farm','ai_quarry','ai_barracks',
    'ai_house','ai_lumber','ai_tower','ai_farm','ai_house','ai_barracks',
    'ai_quarry','ai_tower','ai_farm','ai_house',
  ],
  // Once the opening order is spent the enemy cycles this forever, so it
  // keeps growing instead of freezing the moment the list runs out (the
  // opening is only ~6 minutes long).
  repeatOrder: ['ai_house','ai_farm','ai_tower','ai_lumber','ai_house','ai_quarry','ai_barracks'],
  // Once it has this many buildings at home it starts pushing into the
  // neutral middle — the visible moment the race turns competitive.
  expandAfterBuildings: 6,
  expandChance: 0.45,          // of each build attempt, once expanding
};

// ---------------------------------------------------------------------
// How the enemy town PLAYS, per faction.
//
// Phase 1 gave the enemy a faction's roster and art; this is where it starts
// obeying that faction's actual rules. Everything the shared brain does that
// a faction would do differently reads from here rather than from a
// `aiTownFaction()==='swarm'` branch scattered through ai.js.
//
// Only the undead entry is filled in so far. Tribe and grove still use the
// human profile — their signature systems (hunting, the root network) are
// steps 3 and 4, and stating that explicitly beats letting them fall through
// a default and look finished.
// ---------------------------------------------------------------------
const AI_FACTION_RULES = {
  human: {
    costMap: null,                       // pays in the resource each def names
    gather: [ {tile:'forest', res:'wood'}, {tile:'stone_deposit', res:'stone'} ],
    buildsOnBlight: false,
    buildConsumesWorker: false,
    foodComfort: null,                   // null = use AI_TUNING.foodComfort
  },
  swarm: {
    // Carrion is the only undead resource: every cost collapses into food,
    // which is also what their farms and their forest-harvesting both yield.
    // Remapping here rather than editing AI_BUILD_DEFS keeps one roster and
    // one set of relative prices across all four factions.
    costMap: { wood:'food', stone:'food' },
    // No timber, no masonry — ghouls render the forest itself into carrion,
    // which is exactly what the player's Charnel Pit does.
    gather: [ {tile:'forest', res:'food'} ],
    buildsOnBlight: true,
    buildConsumesWorker: true,
    // There is no "comfortable" amount of carrion when carrion also buys
    // every building and every unit. The human ceiling (180) would have them
    // stop harvesting while they still could not afford a Grave Mound.
    foodComfort: 600,
  },
  tribe: {
    costMap: null,                       // timber and stone, as the tribe pays
    gather: [ {tile:'forest', res:'wood'}, {tile:'stone_deposit', res:'stone'} ],
    buildsOnBlight: false,
    buildConsumesWorker: false,
    foodComfort: null,
    // Food is HUNTED, not farmed: a camp feeds nobody by itself, its hunter
    // has to be out standing on live forest within HUNT.radius of it. Which
    // makes their timber and their dinner the same finite resource — felling
    // the woods for wood eats the ground their food stands on.
    hunts: true,
    // ...and the answer to that, which is the one supply in the game that does
    // not run out. The player has the Forester; the enemy replants on a timer.
    replants: true,
  },
  grove: {
    // The Grove pays for everything in timber, as the player's does.
    costMap: { stone:'wood' },
    // Ents tend, and can chop badly — the same secondary trickle the player's
    // Ents get. It is not where the income comes from.
    gather: [ {tile:'forest', res:'wood'} ],
    buildsOnBlight: false,
    buildConsumesWorker: false,
    foodComfort: null,
    // The whole faction, in one flag: structures are inert until a root
    // reaches them, and then pay out for being CONNECTED rather than staffed.
    // Handled by the shared grove system in grove.js, which now runs for
    // whichever side is playing Grove.
    rootNetwork: true,
  },
};
function aiRules(){ return AI_FACTION_RULES[aiTownFaction()] || AI_FACTION_RULES.human; }
function aiFoodComfort(){ const r = aiRules(); return r.foodComfort || AI_TUNING.foodComfort; }

function initAiEconomy(){
  state.ai = {
    resources: Object.assign({ food:0, wood:0, stone:0 }, AI_TUNING.start),
    thinkMs: 0,
    buildIdx: 0,
    training: null,            // { what:'worker'|'soldier', msLeft }
    buildCdMs: 0,              // throttles construction — see buildCooldownMs
    expanding: false,
    built: 0,
  };
}

// Building costs scale by costMult; unit costs (already tuned directly in
// AI_TUNING) do not, hence the flag.
// Building costs scale by costMult; unit costs (already tuned directly in
// AI_TUNING) do not. The faction's costMap applies to BOTH — an undead
// soldier's 20 wood is as meaningless as an undead barracks' 35.
//
// Keys are summed after remapping, so a quarry costing 20 wood + 10 stone
// becomes 30 carrion rather than silently keeping only the last one.
function aiScaled(cost, scaled){
  if(!cost) return null;
  const map = aiRules().costMap;
  const mult = scaled ? AI_TUNING.costMult : 1;
  const out = {};
  for(const k in cost){
    const key = (map && map[k]) || k;
    out[key] = (out[key] || 0) + cost[k] * mult;
  }
  return out;
}
function aiCan(cost, scaled){
  const c = aiScaled(cost, scaled);
  if(!c) return true;
  for(const k in c) if((state.ai.resources[k]||0) < c[k]) return false;
  return true;
}
function aiPay(cost, scaled){
  const c = aiScaled(cost, scaled);
  if(!c) return;
  for(const k in c) state.ai.resources[k] = (state.ai.resources[k]||0) - c[k];
}

function aiWorkers(){ return state.enemies.filter(e=>e.kind==='ai_worker' && e.hp>0); }
// Defenders: pinned to the town, answer alarms, never march on you.
function aiSoldiers(){ return state.enemies.filter(e=>e.homeGuard && e.kind!=='ai_worker' && e.hp>0); }
// Trained and waiting for a party to fill out.
function aiMustering(){ return state.enemies.filter(e=>e.mustering && e.hp>0); }
// On the march. These count as an active raid, which is exactly right.
function aiAttackers(){ return state.enemies.filter(e=>e.aiAttacker && e.hp>0); }
function aiTroopCount(){ return aiSoldiers().length + aiMustering().length + aiAttackers().length; }

function spawnAiWorker(gx, gy){
  const spot = findFreeSpotNear(gx, gy, 3) || {gx, gy};
  const race = aiTownRace();
  const e = {
    id: enemyIdCounter++, gx:spot.gx, gy:spot.gy,
    aiFaction: aiTownFaction(),
    hp:AI_TUNING.workerHp, maxHp:AI_TUNING.workerHp, dmg:0,
    kind:'ai_worker', race, ranged:false, speedMult:1,
    path:null, pathIdx:0, lastMoveAt:0, lastAttackAt:0, target:null,
    job:null, carrying:0, harvestMs:0, stuckMs:0,
  };
  // Reuses whatever worker sprite that FACTION uses for itself — reading as a
  // worker at a glance is exactly the point when you are deciding what to
  // raid, and a grove town crewed by human villagers gave the whole thing
  // away. Keyed off faction, not race, since tribe and grove share a race.
  const AI_WORKER_FRAME = { human:'villager', swarm:'ghoul', tribe:'tribe_worker', grove:'grove_ent' };
  const frame = AI_WORKER_FRAME[aiTownFaction()] || 'villager';
  // DEPTH.unit, not the implicit 0 this used to get: on 0 an enemy worker
  // walking behind one of its own structures disappeared into it.
  e.sprite = scene.add.image(e.gx*TILE+TILE/2, e.gy*TILE+TILE/2, 'tiles', FRAME[frame])
    .setDepth(DEPTH.unit);
  e.baseTint = 0xff9a7a;   // hostile wash so they never read as your own
  if(e.sprite.setTint) e.sprite.setTint(e.baseTint);
  e.hpBarBg = scene.add.rectangle(e.gx*TILE+TILE/2, e.gy*TILE-2, TILE-8, 4, 0x2a1c10).setDepth(5);
  e.hpBarFg = scene.add.rectangle(e.gx*TILE+4, e.gy*TILE-2, TILE-8, 4, 0xd85a3a).setOrigin(0,0.5).setDepth(6);
  state.enemies.push(e);
  return e;
}

// Where a hauled load gets dropped: their core.
function aiDropPoint(){
  const core = aiTownHall();
  return core ? {gx:core.gx, gy:core.gy} : (state.aiTownCenter || aiTownCenter());
}

// Pick a job for an idle worker: tend an untended farm, else gather whatever
// the stockpile is shortest of.
function assignAiJob(w){
  const farms = aiBuildings().filter(b=>(b.aiType==='ai_farm') && b.hp>0 && !underConstruction(b));
  const tended = new Set(aiWorkers().map(x=>x.job && x.job.kind==='farm' ? x.job.buildingId : null));
  if(state.ai.resources.food < aiFoodComfort()){
    for(const f of farms){
      if(tended.has(f.id)) continue;
      // A hunter walks to the TREELINE near the camp, not to the camp itself.
      // Sending them to the camp tile would have them stand on bare ground
      // beside it producing nothing, which is what "tend" means for everyone
      // else and would have quietly starved a tribe town.
      if(aiRules().hunts){
        const spot = aiHuntSpot(f, w);
        if(!spot) continue;                     // camp's treeline is stripped — try the next
        w.job = {kind:'farm', buildingId:f.id, gx:spot.gx, gy:spot.gy, phase:'out'};
        return;
      }
      w.job = {kind:'farm', buildingId:f.id, gx:f.gx, gy:f.gy, phase:'out'};
      return;
    }
  }
  // WHAT this faction harvests, and what it banks it as, comes off its rules.
  // The undead have one entry (forest -> carrion) because they have one
  // resource; a human town has two and picks whichever pile is shorter.
  const r = state.ai.resources;
  const opts = aiRules().gather;
  const ranked = opts.slice().sort((a,b)=> (r[a.res]||0) - (r[b.res]||0));
  const from = aiDropPoint();
  for(const opt of ranked){
    const tile = findNearestResourceTile(from.gx, from.gy, opt.tile, AI_TUNING.searchRadius);
    if(tile){ w.job = { kind:'gather', res:opt.res, gx:tile.gx, gy:tile.gy, phase:'out' }; return; }
  }
  w.job = null;   // nothing this faction can use within reach; idles
}

function aiStepToward(w, tx, ty, delta){
  const dx = tx - w.gx, dy = ty - w.gy;
  const dist = Math.hypot(dx, dy);
  const step = AI_TUNING.workerSpeed * (delta/1000);
  if(dist <= step){ w.gx = tx; w.gy = ty; return true; }
  w.gx += (dx/dist)*step;
  w.gy += (dy/dist)*step;
  return false;
}

function updateAiWorkers(delta){
  if(!state.ai) return;
  const drop = aiDropPoint();
  for(const w of aiWorkers()){
    if(!w.job) assignAiJob(w);
    const job = w.job;
    if(job){
      if(job.kind === 'farm'){
        const f = buildingById(job.buildingId);
        if(!f || f.hp<=0){ w.job = null; }
        else if(job.phase === 'out'){
          // job.gx/gy is the camp for a tender, a forest tile for a hunter
          if(aiStepToward(w, job.gx, job.gy, delta)) job.phase = 'tend';
        } else if(job.phase === 'tend' && aiRules().hunts){
          // Hunters work a spot, then move along the treeline — the same roam
          // the player's hunters do, so a tribe camp reads as a hunting ground
          // rather than a worker glued to one tree.
          w.huntMs = (w.huntMs || 0) + delta;
          if(state.ai.resources.food > aiFoodComfort() * 1.6){ w.job = null; }
          else if(w.huntMs >= HUNT.moveEveryMs){
            w.huntMs = 0;
            const spot = aiHuntSpot(f, w);
            if(spot){ job.gx = spot.gx; job.gy = spot.gy; job.phase = 'out'; }
            else w.job = null;              // treeline stripped — go do something else
          }
        } else if(job.phase === 'tend' && state.ai.resources.food > aiFoodComfort() * 1.6){
          // Release a tender once the larder is genuinely full. The assign-side
          // check alone was not enough: 'tend' never ended, so whoever started
          // farming while food was low stayed on that farm for the rest of the
          // run and the stockpile ran to 3838 while wood sat at 30. The release
          // threshold is deliberately higher than the assign one — equal values
          // make workers flip between farm and forest every few frames.
          w.job = null;
        }
        // 'tend' is a standing job — the farm's yield is added in aiEconomyTick
      } else if(job.kind === 'gather'){
        if(job.phase === 'out'){
          // the tile may have been stripped by YOUR villagers while it walked
          const qty = (state.resourceQty[job.gy] && state.resourceQty[job.gy][job.gx]) || 0;
          if(qty <= 0){ w.job = null; }
          else if(aiStepToward(w, job.gx, job.gy, delta)){ job.phase = 'harvest'; w.harvestMs = 0; }
        } else if(job.phase === 'harvest'){
          w.harvestMs += delta;
          if(w.harvestMs >= AI_TUNING.harvestMs){
            const qty = (state.resourceQty[job.gy] && state.resourceQty[job.gy][job.gx]) || 0;
            const take = Math.min(AI_TUNING.haulAmount, qty);
            if(take > 0){
              depleteResourceTile(job.gx, job.gy, take);   // the SAME tiles you draw from
              w.carrying = take;
              job.phase = 'home';
            } else { w.job = null; }
          }
        } else if(job.phase === 'home'){
          if(aiStepToward(w, drop.gx, drop.gy, delta)){
            state.ai.resources[job.res] = (state.ai.resources[job.res]||0) + w.carrying;
            w.carrying = 0;
            w.job = null;    // re-evaluate: the nearest node may have moved
          }
        }
      }
    }
    w.sprite.setPosition(w.gx*TILE+TILE/2, w.gy*TILE+TILE/2);
    w.hpBarBg.setPosition(w.gx*TILE+TILE/2, w.gy*TILE-2);
    w.hpBarFg.setPosition(w.gx*TILE+4, w.gy*TILE-2);
    w.hpBarFg.width = (TILE-8)*Math.max(0, w.hp/w.maxHp);
    const hurt = w.hp < w.maxHp;
    w.hpBarBg.setVisible(hurt); w.hpBarFg.setVisible(hurt);
  }
}

// Farm yield, on the same 3s cadence as your own economy.
function aiEconomyTick(){
  if(!state.ai) return;
  // A Grove town earns nothing this way: its structures pay out through
  // groveEconomyTick for being connected, and a worker standing next to one is
  // adding a tend BONUS to that, not a second independent harvest. Paying both
  // would double-count every tended Bough.
  if(aiRules().rootNetwork) return;
  let tended = 0;
  for(const w of aiWorkers()){
    if(!w.job || w.job.kind !== 'farm' || w.job.phase !== 'tend') continue;
    // A tribe hunter only feeds anyone while actually out on live forest near
    // the camp — standing on the camp tile is not hunting. Same test the
    // player's huntingInPlace() applies.
    if(!aiHuntingInPlace(w)) continue;
    tended++;
  }
  state.ai.resources.food += tended * AI_TUNING.farmFoodPerTick;
}

// For a hunting faction: is this worker out on live forest, in range of the
// camp it is assigned to? Always true for factions that simply tend a tile.
function aiHuntingInPlace(w){
  if(!aiRules().hunts) return true;
  const camp = buildingById(w.job.buildingId);
  if(!camp || camp.hp <= 0) return false;
  const gx = Math.round(w.gx), gy = Math.round(w.gy);
  if(Math.max(Math.abs(gx-camp.gx), Math.abs(gy-camp.gy)) > HUNT.radius) return false;
  if(tileAt(gx, gy) !== 'forest') return false;
  return (state.resourceQty[gy] && state.resourceQty[gy][gx] || 0) > 0;
}

// A live forest tile within hunting range of the camp, or null if the treeline
// around it has been stripped. Excludes the tile another hunter is already on
// so they spread along the treeline instead of stacking.
function aiHuntSpot(camp, self){
  const spots = [];
  for(let dy=-HUNT.radius; dy<=HUNT.radius; dy++){
    for(let dx=-HUNT.radius; dx<=HUNT.radius; dx++){
      const x = camp.gx+dx, y = camp.gy+dy;
      if(!inBounds(x,y) || tileAt(x,y) !== 'forest') continue;
      if((state.resourceQty[y] && state.resourceQty[y][x] || 0) <= 0) continue;
      if(aiWorkers().some(o => o !== self && Math.round(o.gx)===x && Math.round(o.gy)===y)) continue;
      spots.push({gx:x, gy:y});
    }
  }
  return spots.length ? spots[Math.floor(Math.random()*spots.length)] : null;
}

// Somewhere to put a new building: rings out from the core, and once the
// enemy is expanding, sometimes into the neutral middle instead.
function aiFindBuildSpot(size, intoNeutral, type){
  const c = state.aiTownCenter || aiTownCenter();
  const origin = intoNeutral
    ? { gx: ZONES.neutral.x1 - 3, gy: Math.floor(MAP_H/2) }   // their side of the middle
    : c;
  const zone = intoNeutral ? 'neutral' : 'enemy';
  // The undead can only raise a structure on blighted ground, exactly as the
  // player's undead can. Their blight radiates from their own buildings
  // (aiBlightSources), so each thing they raise at the edge pushes the field
  // out a little further and opens the next ring — the town grows as a
  // spreading stain rather than appearing wherever there is space. It also
  // means their expansion into the neutral middle has to CREEP there, which
  // is the same toll the player pays.
  const needsBlight = aiRules().buildsOnBlight;
  // Reach is wider for the blight-bound than the human 14: their usable ground
  // is wherever the stain has got to, not a fixed ring around the core.
  const maxRadiusForBlight = needsBlight ? 26 : 14;
  // Which columns this town may build on. Normally its own band (or the
  // neutral middle when pushing out) — but a blight-bound faction also needs
  // the OPEN PASS, because its territory has to be physically continuous.
  //
  // Without that the undead stop dead in the gap: blight reaches about two
  // tiles past its westernmost source, sources are buildings, and buildings
  // were confined to the enemy band — so the ten-tile pass was ground no
  // source could ever stand on. Measured: they crept to the mouth, put six
  // tiles of stain inside it, and sat there for the rest of the run, unable
  // to contest the middle at all. The player has never had this restriction
  // (isPlacementValid does not look at zones), so this only levels it up.
  const zoneOk = (x)=>{
    if(inZone(x, zone)) return true;
    if(needsBlight && state.corridorOpen && (inZone(x,'passEast') || inZone(x,'passWest'))) return true;
    return false;
  };
  const fits = (gx, gy)=>{
    for(let sy=0; sy<size; sy++) for(let sx=0; sx<size; sx++){
      const x=gx+sx, y=gy+sy;
      if(!inBounds(x,y) || !zoneOk(x) || isImpassableTile(tileAt(x,y)) || occAt(x,y)) return false;
      if(needsBlight && !isCreeped(x, y)) return false;
    }
    return true;
  };
  // A blighted tile with unblighted ground beside it. Building HERE is what
  // pushes the field outward, because every structure is a blight source.
  const onFrontier = (gx, gy)=>
    !isCreeped(gx-1,gy) || !isCreeped(gx+1,gy) || !isCreeped(gx,gy-1) || !isCreeped(gx,gy+1);

  // A Grove structure is inert until a root reaches it, and a root can only
  // stretch GROVE.rootMaxLen. Placing beyond that produces a building that is
  // severed on the day it is raised and stays severed forever — nothing
  // retries startRootTo. Measured before this check: four of the enemy's
  // structures were permanently dead Seeds, and the count grew as it built.
  //
  // Deliberately budgeted. The reachability test samples every root in the
  // network, so running it on every candidate tile of a 26-ring scan would
  // cost thousands of those per build attempt. `fits` filters first and this
  // only ever sees tiles that already passed, with a hard cap on how many get
  // tested before we accept that nothing nearby is rootable.
  // A hunting camp on bare plain feeds nobody — its hunters need live forest
  // within HUNT.radius to stand on. Sited blindly, a tribe town would raise
  // camps its own workers could never work.
  const needsTreeline = (aiRules().hunts && type === 'ai_farm');
  const hasTreeline = (gx, gy)=>
    !!findNearestResourceTile(gx, gy, 'forest', HUNT.radius);

  const needsRoot = aiRules().rootNetwork;
  let rootChecks = 0;
  const rootReachable = (gx, gy)=>{
    if(!needsRoot) return true;
    if(rootChecks++ > 60) return false;
    if(typeof nearestNetworkPoint !== 'function') return true;
    const c = rootCollarPoint(gx, gy, size);
    const src = nearestNetworkPoint(c.x, c.y);
    return !!src && src.d <= GROVE.rootMaxLen * TILE;
  };

  const ringSearch = (maxR, wantFrontier)=>{
    rootChecks = 0;
    for(let r=2; r<=maxR; r++){
      for(let dy=-r; dy<=r; dy++){
        for(let dx=-r; dx<=r; dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue;
          const gx = origin.gx+dx, gy = origin.gy+dy;
          if(!fits(gx, gy)) continue;
          if(wantFrontier && !onFrontier(gx, gy)) continue;
          if(needsTreeline && !hasTreeline(gx, gy)) continue;
          if(!rootReachable(gx, gy)) continue;
          return {gx, gy};
        }
      }
    }
    return null;
  };

  // The frontier tile that carries the blight TOWARD the middle. Taking
  // whichever edge tile the ring scan happened to reach first grew the field
  // as an even disc, and since most of its perimeter faces away from you,
  // almost all of that growth went nowhere: measured at 4 tiles of westward
  // progress in 30 minutes, against a pass 7 tiles further and the neutral
  // band 17 beyond that. They would never have arrived.
  //
  // A necropolis grows toward what it intends to eat. Once expanding, pick the
  // frontier tile closest to the neutral band, so each structure lays the
  // stain a little further along and the reach becomes a visible tendril
  // rather than a slowly fattening blob.
  const towardMiddle = ()=>{
    const targetX = ZONES.neutral.x1;   // the near edge of the prize, from their side
    let best = null, bestD = Infinity;
    for(let r=2; r<=maxRadiusForBlight; r++){
      for(let dy=-r; dy<=r; dy++){
        for(let dx=-r; dx<=r; dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue;
          const gx = origin.gx+dx, gy = origin.gy+dy;
          if(!fits(gx, gy) || !onFrontier(gx, gy)) continue;
          // distance to the target band, not to a point — anywhere along its
          // edge will do, so this does not funnel every structure into one row
          const d = Math.abs(gx - targetX);
          if(d < bestD){ bestD = d; best = {gx, gy}; }
        }
      }
    }
    return best;
  };

  // Undead: take the EDGE of the blight first. The plain outward spiral always
  // returned the innermost free tile, so the town packed itself into the
  // seeded disc and the field stopped growing the moment that disc was full —
  // measured flat at ~271 tiles from minute 6 while the building count went on
  // climbing. Nothing ever reached the frontier, so nothing ever extended it,
  // and expansion into the neutral middle was impossible because there is no
  // blight out there to start from. Preferring the frontier makes each new
  // structure carry the stain a couple of tiles further, which is how the
  // player's undead push outward too.
  const maxR = maxRadiusForBlight;
  if(needsBlight){
    // While expanding, reach for the middle; before that, consolidate on
    // whatever edge is nearest so the town has a body before it grows a limb.
    const edge = (state.ai && state.ai.expanding) ? (towardMiddle() || ringSearch(maxR, true))
                                                  : ringSearch(maxR, true);
    if(edge) return edge;
  }
  return ringSearch(maxR, false);
}

// A drone dissolves into every undead structure. Destroyed outright rather
// than routed through the hp<=0 death path — nothing killed it, so it should
// not grant hero XP, leave a corpse, or count as a kill.
function consumeAiWorker(w){
  if(!w) return false;
  if(scene && scene.add) floatResourceText(Math.round(w.gx), Math.round(w.gy), 'rising...', '#b6c98a');
  if(w.sprite) w.sprite.destroy();
  if(w.hpBarBg) w.hpBarBg.destroy();
  if(w.hpBarFg) w.hpBarFg.destroy();
  state.enemies = state.enemies.filter(e => e !== w);
  return true;
}

function aiTryBuild(){
  const ai = state.ai;
  if(ai.buildCdMs > 0) return false;
  const order = AI_TUNING.buildOrder;
  const rep = AI_TUNING.repeatOrder;
  const type = ai.buildIdx < order.length
    ? order[ai.buildIdx]
    : rep[(ai.buildIdx - order.length) % rep.length];
  const def = aiDef(type);
  if(!def) { ai.buildIdx++; return false; }
  if(!aiCan(def.cost, true)) return false;
  const rules = aiRules();
  // Every undead structure eats a drone. Checked BEFORE placing, and never
  // down to the last few — a town that consumed its final worker could never
  // train another (workers cost carrion, carrion needs workers) and would sit
  // there dead. The player hits the same wall; they just get to see it coming.
  const morph = rules.buildConsumesWorker
    ? aiWorkers().sort((a,b)=> (b.job?0:1) - (a.job?0:1))[0]   // an idle one first
    : null;
  if(rules.buildConsumesWorker && aiWorkers().length <= AI_TUNING.workerFloor) return false;
  const intoNeutral = ai.expanding && Math.random() < AI_TUNING.expandChance && state.corridorOpen;
  // Fall back to home ground if the push into the middle finds nowhere. The
  // undead especially: the neutral origin starts with no blight at all, so
  // ~45% of their build attempts would otherwise find nothing, return false,
  // and burn the think cycle without advancing anything. They reach the middle
  // by creeping the field there, not by starting a colony in clean grass.
  const spot = aiFindBuildSpot(def.size||1, intoNeutral, type)
            || (intoNeutral ? aiFindBuildSpot(def.size||1, false, type) : null);
  if(!spot) return false;
  // Placed straight up rather than as a foundation a drone must walk to:
  // "a worker must physically arrive" is a PLAYER rule, and what the economy
  // actually gates on is the cost — which for the undead now includes the
  // drone itself.
  const b = placeAiBuildingAt(type, spot.gx, spot.gy);
  if(!b) return false;
  if(morph) consumeAiWorker(morph);
  aiPay(def.cost, true);
  ai.buildIdx++;
  ai.built++;
  ai.buildCdMs = AI_TUNING.buildCooldownMs;
  if(ai.built >= AI_TUNING.expandAfterBuildings) ai.expanding = true;
  return true;
}

// placeAiBuilding refuses outside the enemy band; expansion needs the
// neutral zone too, so this is the zone-agnostic version.
function placeAiBuildingAt(type, gx, gy){
  const def = aiDef(type);
  if(!def) return null;
  const size = def.size || 1;
  for(let dy=0; dy<size; dy++) for(let dx=0; dx<size; dx++){
    const x=gx+dx, y=gy+dy;
    if(!inBounds(x,y) || isImpassableTile(tileAt(x,y)) || occAt(x,y)) return null;
  }
  clearGroundFor(gx, gy, size);
  const b = createBuilding(type, gx, gy, def, OWNER_AI);
  b.aiType = type;
  if(def.isCore) b.isCore = true;
  return b;
}

function aiTryTrain(delta){
  const ai = state.ai;
  if(ai.training){
    ai.training.msLeft -= delta;
    if(ai.training.msLeft > 0) return;
    const c = state.aiTownCenter || aiTownCenter();
    if(ai.training.what === 'worker'){
      spawnAiWorker(c.gx, c.gy);
    } else {
      const race = aiTownRace();   // already an ENEMY_RACES key — see spawnAiGarrison
      const spot = findFreeSpotNear(c.gx, c.gy, 4) || c;
      const ranged = Math.random() < 0.35;
      const e = spawnEnemy(34, 7, 4, ranged ? 'raider' : 'swordsman',
                           {gx:spot.gx, gy:spot.gy}, {race, ranged});
      if(e){
        // The town keeps its garrison staffed FIRST; only the surplus musters
        // for an attack. Otherwise a fresh party leaves an undefended town and
        // the player can simply walk past the outgoing army into the core.
        if(aiSoldiers().length < AI_TUNING.homeGarrisonTarget){
          e.homeGuard = true; e.homeGx = e.gx; e.homeGy = e.gy;
        } else {
          e.mustering = true;
        }
      }
    }
    ai.training = null;
    return;
  }
  if(aiWorkers().length < AI_TUNING.workerTarget && aiCan(AI_TUNING.workerCost) && aiTownHall()){
    aiPay(AI_TUNING.workerCost);
    ai.training = { what:'worker', msLeft: AI_TUNING.workerTrainMs };
    return;
  }
  // Soldiers are trained whenever there is a barracks and the resources to
  // pay — no schedule, no difficulty curve. Their army is literally what
  // their economy could afford, so starving that economy is what makes the
  // war quieter. The cap only exists to stop a runaway game fielding a horde.
  const hasBarracks = aiBuildings().some(b=>b.aiType==='ai_barracks' && b.hp>0 && !underConstruction(b));
  if(hasBarracks && aiTroopCount() < AI_TUNING.soldierHardCap && aiCan(AI_TUNING.soldierCost)){
    aiPay(AI_TUNING.soldierCost);
    ai.training = { what:'soldier', msLeft: AI_TUNING.soldierTrainMs };
  }
}

// ---------------------------------------------------------------------
// Phase 4: the war
// ---------------------------------------------------------------------

// Something of theirs took a hit. Raise an alarm that nearby defenders
// answer — this is what gives their neutral-zone expansion real weight
// instead of leaving it free demolition.
function aiRaiseAlarm(gx, gy){
  if(!state.ai) return;
  state.ai.alarm = { gx, gy, msLeft: AI_TUNING.alarmMs };
}

// Defenders answer the nearest alarm, then drift back to their posts.
function updateAiDefence(delta){
  const ai = state.ai;
  if(!ai) return;
  if(ai.alarm){
    ai.alarm.msLeft -= delta;
    if(ai.alarm.msLeft <= 0){ ai.alarm = null; }
  }
  const guards = aiSoldiers();
  if(!ai.alarm){
    // no alarm: anyone who answered one heads home
    for(const g of guards){
      if(g.respondingTo){ g.respondingTo = null; g.path = null; }
    }
    return;
  }
  // closest few respond; the rest hold their posts so the town is never
  // stripped bare by a feint on the far side of the map
  const sorted = guards
    .map(g=>({g, d: Phaser.Math.Distance.Between(g.gx, g.gy, ai.alarm.gx, ai.alarm.gy)}))
    .filter(x=> x.d <= AI_TUNING.alarmResponseRange)
    .sort((a,b)=> a.d - b.d)
    .slice(0, AI_TUNING.alarmMaxResponders);
  const chosen = new Set(sorted.map(x=>x.g));
  for(const g of guards){
    if(chosen.has(g)){
      if(!g.respondingTo){ g.respondingTo = true; g.path = null; }
      g.alarmGx = ai.alarm.gx; g.alarmGy = ai.alarm.gy;
    } else if(g.respondingTo){
      g.respondingTo = null; g.path = null;
    }
  }
}

// One objective for a whole war party: your nearest building to THEIR town,
// so the party commits to a single approach instead of each soldier drifting
// toward whatever happens to be closest to it personally.
function aiPartyTarget(){
  const from = state.aiTownCenter || aiTownCenter();
  let best = null, bd = Infinity;
  for(const b of myBuildings()){
    if(b.hp <= 0) continue;
    const d = Phaser.Math.Distance.Between(from.gx, from.gy, b.gx, b.gy);
    if(d < bd){ bd = d; best = b; }
  }
  return best ? { gx: best.gx, gy: best.gy } : null;
}

// If a party's objective is razed (by them, or by you salvaging it) the whole
// party picks the next one TOGETHER — otherwise they revert to individual
// nearest-target and scatter at the worst possible moment.
function retargetSpentParties(){
  const live = aiAttackers();
  if(!live.length) return;
  const byParty = {};
  for(const a of live){ (byParty[a.partyId || 0] = byParty[a.partyId || 0] || []).push(a); }
  for(const id in byParty){
    const members = byParty[id];
    const g = members[0];
    if(g.partyGx === undefined) continue;
    const stillThere = occAt(g.partyGx, g.partyGy);
    if(stillThere && stillThere.hp > 0 && isMine(stillThere)) continue;
    const next = aiPartyTarget();
    if(!next) continue;
    for(const m of members){ m.partyGx = next.gx; m.partyGy = next.gy; m.path = null; }
  }
}

// Formation march: hold the leaders back so the party arrives as a body.
// Recomputed once per frame into e._holdMarch, which updateEnemies() reads —
// doing it there per unit would be O(n^2) against every other attacker.
function updateAiFormations(){
  const live = aiAttackers();
  if(!live.length) return;
  const byParty = {};
  for(const a of live){ (byParty[a.partyId || 0] = byParty[a.partyId || 0] || []).push(a); }
  for(const id in byParty){
    const p = byParty[id];
    for(const a of p) a._holdMarch = false;
    if(p.length < 2) continue;
    const gx = p[0].partyGx, gy = p[0].partyGy;
    if(gx === undefined) continue;
    // distance-to-objective per member; the LARGEST is the rearguard
    let rear = -Infinity, lead = Infinity;
    for(const a of p){
      a._toGoal = Phaser.Math.Distance.Between(a.gx, a.gy, gx, gy);
      if(a._toGoal > rear) rear = a._toGoal;
      if(a._toGoal < lead) lead = a._toGoal;
    }
    // close enough to the objective? release everyone and let them commit
    if(lead <= AI_TUNING.commitRange) continue;
    for(const a of p){
      // a member that has pulled more than cohesionRadius ahead of the
      // rearguard waits for it to catch up
      if(rear - a._toGoal > AI_TUNING.cohesionRadius) a._holdMarch = true;
    }
  }
}

// Muster, then march. The party only forms once enough soldiers exist BEYOND
// the home garrison, so pressure scales with what their economy actually
// afforded rather than with a clock.
function updateAiWar(delta){
  const ai = state.ai;
  if(!ai || state.gameOver) return;
  if(!state.corridorOpen) return;   // no route to you until the pass opens

  retargetSpentParties();
  ai.warMs = (ai.warMs || 0) + delta;
  if(ai.warMs < AI_TUNING.firstAttackDelayMs) return;   // grace after it opens
  if(ai.attackCdMs > 0){ ai.attackCdMs -= delta; return; }

  const muster = aiMustering();
  if(muster.length < AI_TUNING.attackPartySize) return;

  // ONE objective for the whole party, fixed when it forms.
  //
  // Each attacker used to pick its own nearest target every time it
  // re-pathed. Over a 100-tile march that fragments the party immediately:
  // two units a tile apart resolve different "nearest" buildings, peel off
  // toward them, and what left as a war band arrives as a trickle of
  // individuals that your towers kill one at a time. Sharing the goal is
  // what makes it land as a force.
  const goal = aiPartyTarget();
  if(!goal) return;                       // nothing of yours standing
  ai.partySeq = (ai.partySeq || 0) + 1;
  for(const m of muster){
    m.mustering = false;
    m.aiAttacker = true;
    m.partyId = ai.partySeq;
    m.partyGx = goal.gx; m.partyGy = goal.gy;
    m.path = null;
    m.homeGuard = false;
  }
  ai.attackCdMs = AI_TUNING.attackCooldownMs;
  logEvent('ai_attack', { size: muster.length, gx: goal.gx, gy: goal.gy });
  flashWaveBanner(`A war party marches out of the enemy town — ${muster.length} strong!`);
}

// The tribe's answer to felling the woods it also eats from. The player casts
// Seed Grove; the enemy replants on a timer, near a camp whose treeline is
// thinning, because that is where the loss actually hurts.
//
// Deliberately modest and slow: this is meant to keep a tribe town alive on
// finite ground over a long run, not to turn the map into forest. Saplings go
// through the SAME state.saplings system the player's do, so they take
// FORESTER.saplingMs to become real forest and either side can then use it.
const AI_REPLANT = {
  everyMs: 45000,   // one small planting every 45s
  trees: 4,         // saplings per planting
  radius: 5,        // scattered this far around the chosen camp
  // Only reseed a camp whose treeline has actually thinned. Planting
  // unconditionally is not restoration, it is afforestation: measured over a
  // 30-minute run the enemy band went from 74 live forest tiles to 206 and
  // was still climbing, which is the tribe slowly turning its own territory
  // into woodland rather than living off it. Below this many live tiles in
  // hunting range, a camp is genuinely short and worth reseeding; above it,
  // the woods are feeding themselves.
  healthyTreeline: 14,
};
function updateAiReplant(delta){
  if(!state.ai || !aiRules().replants) return;
  if(typeof plantSapling !== 'function') return;
  state.ai.replantMs = (state.ai.replantMs || 0) + delta;
  if(state.ai.replantMs < AI_REPLANT.everyMs) return;
  state.ai.replantMs = 0;
  // the camp with the thinnest treeline is the one worth reseeding
  const camps = aiBuildings().filter(b => b.aiType === 'ai_farm' && b.hp > 0 && !underConstruction(b));
  if(!camps.length) return;
  let worst = null, worstCount = Infinity;
  for(const c of camps){
    let n = 0;
    for(let dy=-HUNT.radius; dy<=HUNT.radius; dy++)
      for(let dx=-HUNT.radius; dx<=HUNT.radius; dx++){
        const x=c.gx+dx, y=c.gy+dy;
        if(inBounds(x,y) && tileAt(x,y)==='forest' && (state.resourceQty[y] && state.resourceQty[y][x] || 0) > 0) n++;
      }
    if(n < worstCount){ worstCount = n; worst = c; }
  }
  if(!worst || worstCount >= AI_REPLANT.healthyTreeline) return;   // nothing is short
  let planted = 0;
  for(let tries=0; tries<40 && planted<AI_REPLANT.trees; tries++){
    const gx = worst.gx + Phaser.Math.Between(-AI_REPLANT.radius, AI_REPLANT.radius);
    const gy = worst.gy + Phaser.Math.Between(-AI_REPLANT.radius, AI_REPLANT.radius);
    if(plantSapling(gx, gy)) planted++;
  }
}

function aiThink(delta){
  if(!state.ai || state.gameOver) return;
  if(!aiTownHall()) return;   // headless: no core, no orders
  // NO corridor gate here. There used to be a blanket `if(!state.corridorOpen)
  // return` guarding this whole function, to stop the enemy colonising the
  // neutral middle before you could contest it. It did far more than that:
  // aiEconomyTick() and updateAiWorkers() run unconditionally from the main
  // loop, so the enemy GATHERED for the entire pre-corridor game and could
  // not spend a single resource. Measured over a full 46-minute run: their
  // building count sat at exactly 29 for the first 32 minutes while wood and
  // stone climbed to ~1500 each, they never trained past their starting 3
  // workers (aiTryTrain lives in here too), and the instant the pass opened
  // they began spending. You arrived to a static museum, not a rival.
  //
  // The neutral-zone concern it was written for is already handled where it
  // belongs — `intoNeutral` in aiTryBuild() carries its own corridorOpen
  // check, so their expansion still cannot cross until you can. Verified:
  // over 32 simulated minutes with this open, buildings in the neutral zone
  // stayed at 0 while their home town grew to 80 (against a player's 79) and
  // ended resource-bound, which is the loop costMult was built for.
  aiTryTrain(delta);
  updateAiReplant(delta);
  if(state.ai.buildCdMs > 0) state.ai.buildCdMs -= delta;
  state.ai.thinkMs += delta;
  if(state.ai.thinkMs < AI_TUNING.thinkMs) return;
  state.ai.thinkMs = 0;
  aiTryBuild();
}
