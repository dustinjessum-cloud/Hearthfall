// ---------------------------------------------------------------------
// The Tribe — "Lead your Tribe"
//
// Ogres and hobgoblins. The design brief settled two things: the tribe uses
// the SAME resources as humans (food, wood, stone) but ACQUIRES them
// differently, and its signature mechanic is deliberately still open. So
// everything here is the part that survives whichever mechanic is chosen —
// the roster, the acquisition rules and the vocabulary. A signature mechanic
// will add to this file rather than rewrite it.
//
// The differences that matter, versus the human economy:
//   - They HUNT rather than farm. A Hunting Camp must sit near forest (game
//     lives in the woods), where a human farm works any open ground. Food is
//     therefore tied to the same terrain as timber, which makes their
//     territory choices tighter and their expansion more contested.
//   - There is NO cooking chain. Humans run farm -> wheat -> mill -> flour
//     -> bakery -> food for a big multiplier. The tribe eats it raw: one
//     step, no multiplier, no buildings to protect. Simpler and weaker per
//     worker, so they need more ground rather than better infrastructure.
//   - No gold, no market, no trade. Nothing to tax and no one to trade with.
//   - No happiness lever, and so no wells or taverns.
// ---------------------------------------------------------------------

function applyTribeFaction(){
  // -- HUD: hide the two trackers this faction can never fill --
  // farmYield is 'food', not 'wheat', so nothing here ever grows grain and
  // nothing mills it into flour: both sat at 0 for the whole game beside live
  // numbers. Gold and happiness deliberately STAY — houses pay a gold tithe
  // scaled by happiness, so both are real for this faction even though the
  // grain chain is not.
  for(const id of ['resWheat','resFlour']){
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  }

  // -- roster: rename, re-cost and re-skin the types the tribe keeps --
  BUILD_DEFS.house       = { name:'Hide Hut', cost:{wood:18}, hp:55, frame:'tribe_hut', popCap:4 };

  // Hunting Camp replaces the farm. bonusNear:'forest' is the whole design
  // difference in one field — food now comes from the treeline, not from
  // open ground, so food and timber compete for the same territory.
  BUILD_DEFS.farm        = { name:'Hunting Camp', cost:{wood:15}, hp:50, frame:'tribe_hunt',
                             produces:{food:5}, needsWorker:true, bonusNear:'forest' };

  BUILD_DEFS.lumber_camp = { name:'Timber Fell', cost:{wood:15}, hp:50, frame:'tribe_timber',
                             produces:{wood:4}, needsWorker:true, bonusNear:'forest' };
  BUILD_DEFS.quarry      = { name:'Stone Pit', cost:{wood:20, stone:10}, hp:60, frame:'tribe_pit',
                             produces:{stone:3}, needsWorker:true, bonusNear:'stone_deposit' };
  BUILD_DEFS.barracks    = { name:'War Lodge', cost:{wood:35}, hp:100, frame:'tribe_warlodge',
                             trains:'archer' };
  BUILD_DEFS.tower       = { name:'Watch Totem', cost:{wood:14, stone:18}, hp:140, frame:'tribe_totem',
                             blocksPath:true, garrison:true,
                             attack:{ range:4.0, damage:7, damageLow:4, cooldownMs:950 } };
  BUILD_DEFS.granary     = { name:'Cache', cost:{wood:25}, hp:80, frame:'tribe_cache',
                             nearTC:true };
  BUILD_DEFS.warehouse   = { name:'Stockpile', cost:{wood:30}, hp:80, frame:'tribe_stock',
                             nearTC:true };
  // its own palisade art — a brown TINT on the masonry wall still read as
  // stone, because the coursing and merlons were still there
  // variants must be stated, or refreshWallSprite falls back to the human
  // masonry names and overwrites the palisade on every placement
  BUILD_DEFS.wall        = { name:'Stake Wall', cost:{wood:6}, hp:100, frame:'stake_wall',
                             variants:{ straight:'stake_wall', vert:'stake_wall', corner:'stake_wall' },
                             blocksPath:true };
  BUILD_DEFS.gate        = { name:'Stake Gate', cost:{wood:8}, hp:100, frame:'tribe_gate',
                             blocksPath:true, friendlyPassable:true };
  BUILD_DEFS.road        = { name:'Trail', cost:{wood:2}, frame:'dirt', tint:0xc4a578, isRoad:true };

  BUILD_TIME.farm = 8000;
  BUILD_TIME.house = 8000;

  // -- build bar: only what the tribe actually has --
  // No mill, bakery, well, tavern, market, apothecary or mason: no cooking
  // chain, no happiness, no trade. The shorter bar IS the faction reading.
  BUILD_CATEGORIES.splice(0, BUILD_CATEGORIES.length,
    { key:'economy', label:'Camp',    types:['house','farm','lumber_camp','quarry','road'] },
    { key:'trade',   label:'Stores',  types:['granary','warehouse'] },
    { key:'defense', label:'War',     types:['wall','gate','tower','barracks'] },
  );

  // -- units: ogres are expensive and heavy, hobgoblins cheap and quick --
  delete SWORDSMAN_COST.stone;
  SWORDSMAN_COST.food = 40; SWORDSMAN_COST.wood = 15;   // ogre
  ARCHER_COST.food = 25; ARCHER_COST.wood = 10;         // hobgoblin spear-thrower
}

// Word-level re-theming, the same trick the undead use: every banner and
// info-panel string passes through this so the human-flavoured copy buried
// in the UI reads in the tribe's register without rewriting call sites.
// Longest entries first, since replacement is sequential.
const TRIBE_TEXT = [
  ['A Minotaur strides in, scythe in hand, to lead your soldiers!', 'The War Chief takes up his club and bellows for the tribe!'],
  ['The Minotaur returns to the field!', 'The War Chief drags himself back to his feet!'],
  ['No one settles in a starving town — get food first!', 'The tribe will not grow on an empty belly — hunt first!'],
  ['Population at cap — build more houses!', 'No room in camp — raise more Hide Huts!'],
  ['No wood for upkeep — your buildings are weathering!', 'No timber to mend the camp — it is falling apart!'],
  ['A new villager joins the town!', 'A hobgoblin joins the tribe!'],
  ['A villager reports for duty', 'A hobgoblin shoulders a spear'],
  ['Bandit camp destroyed!', 'Rival camp smashed!'],
  ['Bandit camp', 'Rival camp'], ['bandit camp', 'rival camp'],
  ['The Minotaur', 'The War Chief'], ['Minotaur', 'War Chief'],
  ['Town Hall', 'Great Lodge'], ['Town Center', 'Great Lodge'],
  ['Villagers', 'Hobgoblins'], ['villagers', 'hobgoblins'],
  ['Villager', 'Hobgoblin'], ['villager', 'hobgoblin'],
  ['Swordsman', 'Ogre'], ['swordsman', 'ogre'],
  ['Archer', 'Spear-thrower'], ['archer', 'spear-thrower'],
  ['soldiers', 'warriors'], ['Soldiers', 'Warriors'],
  ['town', 'camp'], ['Town', 'Camp'],
];

// ---------------------------------------------------------------------
// The Forester — the tribe regrows what it takes
//
// Nothing else in the game restores forest. depleteResourceTile() turns a
// worked-out forest tile permanently to grass, so every faction's timber is
// a countdown. That bites the tribe hardest, because BOTH their food
// (Hunting Camp) and their wood (Timber Fell) need forest — one finite
// resource feeding two needs.
//
// The Forester answers that, and in doing so gives the tribe the one thing
// neither other faction has: a supply that does not run out. Deliberately
// slow. A sapling takes SAPLING_MS to become real forest, so planting is an
// investment you make early and collect later, not a button you press when
// the woodpile runs dry.
// ---------------------------------------------------------------------
const FORESTER = {
  cost: { food: 20, wood: 10 },
  hp: 24,
  saplingMs: 60000,     // how long until a sapling is harvestable forest
  qty: [70, 100],       // a planted tree yields a little less than wild growth
  // Seeding is a CAST, not a job. An autonomous planter quietly turned the
  // whole map to woodland with no decision attached; as an ability with a
  // long cooldown, WHERE you put ten trees is the interesting part.
  treesPerCast: 10,
  cooldownMs: 300000,   // five minutes — one cast is a real commitment
  castRange: 7,         // how far from the Forester the circle can be placed
  areaRadius: 3.2,      // radius of the seeded area, in tiles
};

// A tile can be planted if it is open ground the tribe can actually reach:
// bare grass or worked-out dirt, nothing built on it, no one standing there.
function canPlantAt(gx, gy){
  if(!inBounds(gx, gy)) return false;
  const t = tileAt(gx, gy);
  if(t !== 'grass' && t !== 'dirt') return false;
  if(occAt(gx, gy)) return false;
  if(state.saplings && state.saplings.some(s => s.gx === gx && s.gy === gy)) return false;
  return true;
}

function plantSapling(gx, gy){
  if(!canPlantAt(gx, gy)) return null;
  const s = { gx, gy, msLeft: FORESTER.saplingMs };
  if(scene && scene.add){
    // a small dim sprite so a planted tile reads as "coming" rather than done
    s.sprite = scene.add.image(gx*TILE+TILE/2, gy*TILE+TILE/2, 'tiles', FRAME.forest)
      .setDepth(2).setScale(0.4).setAlpha(0.55);
  }
  (state.saplings = state.saplings || []).push(s);
  return s;
}

// Saplings grow on the frame clock, then become genuine forest — the same
// tile type and quantity range a wild tree has, so every existing system
// (gathering, pathing, the Hunting Camp's bonusNear) just works.
function updateSaplings(delta){
  if(!state.saplings || !state.saplings.length) return;
  const done = [];
  for(const s of state.saplings){
    s.msLeft -= delta;
    if(s.sprite){
      const grown = 1 - (s.msLeft / FORESTER.saplingMs);
      s.sprite.setScale(0.4 + grown*0.6).setAlpha(0.55 + grown*0.45);
    }
    if(s.msLeft <= 0) done.push(s);
  }
  if(!done.length) return;
  // Drop the matured saplings from the list BEFORE testing the ground.
  // canPlantAt() refuses a tile that already holds a sapling, so calling it
  // while these are still listed made every tree fail its OWN check: the
  // grid was never set to forest, the ghost sprite was destroyed, and the
  // tree simply disappeared at the moment it finished growing.
  state.saplings = state.saplings.filter(s => !done.includes(s));
  for(const s of done){
    // the ground may have been built on or corrupted while it grew
    if(canPlantAt(s.gx, s.gy)){
      state.grid[s.gy][s.gx] = 'forest';
      state.resourceQty[s.gy][s.gx] = Phaser.Math.Between(FORESTER.qty[0], FORESTER.qty[1]);
      const spr = state.tileSprites[s.gy] && state.tileSprites[s.gy][s.gx];
      if(spr && spr.setFrame) spr.setFrame(FRAME.forest);
      if(scene && scene.add) floatResourceText(s.gx, s.gy, 'grown', '#7ad07a');
    }
    if(s.sprite) s.sprite.destroy();
  }
  markMinimapDirty();
}

// Foresters no longer plant on their own — all they do per frame is tick
// their cooldown down. The decision moved to the player.
function updateForesters(delta){
  for(const u of state.units){
    if(u.type !== 'forester' || u.hp <= 0) continue;
    if(u.seedCd > 0) u.seedCd = Math.max(0, u.seedCd - delta);
  }
}

function foresterReady(u){ return !!u && u.type === 'forester' && u.hp > 0 && (u.seedCd || 0) <= 0; }

// Scatter treesPerCast saplings at RANDOM valid spots inside the circle.
// Random on purpose: you choose the ground, the grove chooses its own shape,
// so no two castings look alike and a planted wood never reads as a grid.
function castSeedGrove(u, gx, gy){
  if(!foresterReady(u)) return false;
  const dist = Phaser.Math.Distance.Between(u.gx, u.gy, gx, gy);
  if(dist > FORESTER.castRange){
    flashWaveBanner('Too far — move the Forester closer.');
    return false;
  }
  // gather every plantable tile in the circle, then take a random sample
  const spots = [];
  const R = Math.ceil(FORESTER.areaRadius);
  for(let dy = -R; dy <= R; dy++){
    for(let dx = -R; dx <= R; dx++){
      if(Math.hypot(dx, dy) > FORESTER.areaRadius) continue;
      const x = gx + dx, y = gy + dy;
      if(canPlantAt(x, y)) spots.push({gx:x, gy:y});
    }
  }
  if(!spots.length){ flashWaveBanner('No open ground there to seed.'); return false; }
  // Fisher-Yates, so the same tile is never picked twice
  for(let i = spots.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const t = spots[i]; spots[i] = spots[j]; spots[j] = t;
  }
  const n = Math.min(FORESTER.treesPerCast, spots.length);
  for(let i = 0; i < n; i++) plantSapling(spots[i].gx, spots[i].gy);
  u.seedCd = FORESTER.cooldownMs;
  if(scene && scene.add) floatResourceText(gx, gy, `${n} seeded`, '#7ad07a');
  flashWaveBanner(n < FORESTER.treesPerCast
    ? `Only ${n} seeds found open ground.`
    : 'The Forester scatters a season of seed.');
  refreshInfoPanel();
  return true;
}

function createForester(gx, gy){
  const u = {
    id: unitIdCounter++, type:'forester', gx, gy, tx:gx, ty:gy,
    hp: FORESTER.hp, maxHp: FORESTER.hp, lastAttackAt: 0, moving: false,
    orderQueue: [], seedCd: 0,
  };
  const cx = gx*TILE+TILE/2, cy = gy*TILE+TILE/2;
  u.marker = scene.add.ellipse(cx, cy+9, 18, 8, 0x3a7a3a, 0.5)
    .setStrokeStyle(1, 0xa8e6a1, 0.85).setDepth(3);
  u.sprite = scene.add.image(cx, cy, 'tiles', FRAME.tribe_worker).setDepth(4);
  u.baseTint = 0x9fe08a;   // green wash so a Forester reads apart from a labourer
  u.sprite.setTint(u.baseTint);
  u.hpBarBg = scene.add.rectangle(cx, cy-18, TILE-10, 4, 0x2a1c10).setDepth(5).setVisible(false);
  u.hpBarFg = scene.add.rectangle(cx-(TILE-10)/2, cy-18, TILE-10, 4, 0x6bbf59).setOrigin(0,0.5).setDepth(6).setVisible(false);
  state.units.push(u);
  syncPopulationCount();
  return u;
}

// Trained at the Great Lodge, like a villager — it IS a worker, just one
// that makes forest instead of carrying it.
function trainForester(core){
  if(!core || state.faction !== 'tribe') return false;
  if(state.population.current >= state.population.cap){
    flashWaveBanner('No room in camp — raise more Hide Huts!'); return false;
  }
  for(const k in FORESTER.cost){
    if(state.resources[k] < FORESTER.cost[k]){
      flashWaveBanner(`Not enough ${k} for a Forester.`); return false;
    }
  }
  for(const k in FORESTER.cost) state.resources[k] -= FORESTER.cost[k];
  const spot = findFreeSpotNear(core.gx, core.gy, 4) || {gx:core.gx, gy:core.gy};
  createForester(spot.gx, spot.gy);
  flashWaveBanner('A Forester takes up seed and spade.');
  updateHUD();
  return true;
}

// ---- targeting mode --------------------------------------------------
// Mirrors how build placement works: enter a mode, a ghost follows the
// cursor, click commits, Esc or right-click cancels. Two circles are drawn —
// the AREA that will be seeded, and the RANGE the Forester can reach — so
// the two limits are visible at once rather than discovered by being refused.
function beginSeedTargeting(u){
  if(!foresterReady(u)) return;
  state.castMode = { unitId: u.id };
  flashWaveBanner('Choose where to seed — Esc or right-click to cancel.');
}

function cancelSeedTargeting(){
  state.castMode = null;
  if(scene){
    if(scene._seedArea){ scene._seedArea.destroy(); scene._seedArea = null; }
    if(scene._seedRange){ scene._seedRange.destroy(); scene._seedRange = null; }
  }
}

function castModeUnit(){
  if(!state.castMode) return null;
  const u = state.units.find(x => x.id === state.castMode.unitId && x.hp > 0);
  return foresterReady(u) ? u : null;
}

// Redrawn every frame while targeting: area circle under the cursor, range
// circle around the Forester. Out of range turns the area circle red, so the
// refusal is visible BEFORE the click rather than as a banner after it.
function updateSeedGhost(gx, gy){
  const u = castModeUnit();
  if(!u){ cancelSeedTargeting(); return; }
  if(!scene._seedRange){
    scene._seedRange = scene.add.circle(0, 0, 10, 0x9fe08a, 0)
      .setStrokeStyle(1, 0x9fe08a, 0.5).setDepth(9);
  }
  scene._seedRange.setPosition(u.gx*TILE + TILE/2, u.gy*TILE + TILE/2);
  scene._seedRange.setRadius(FORESTER.castRange * TILE);

  const inRange = Phaser.Math.Distance.Between(u.gx, u.gy, gx, gy) <= FORESTER.castRange;
  const col = inRange ? 0x7ad07a : 0xd85a3a;
  if(!scene._seedArea){
    scene._seedArea = scene.add.circle(0, 0, 10, 0x7ad07a, 0.18)
      .setStrokeStyle(2, 0x7ad07a, 0.9).setDepth(10);
  }
  scene._seedArea.setPosition(gx*TILE + TILE/2, gy*TILE + TILE/2);
  scene._seedArea.setRadius(FORESTER.areaRadius * TILE);
  scene._seedArea.setFillStyle(col, 0.18);
  scene._seedArea.setStrokeStyle(2, col, 0.9);
}

// ---- hunting: work the treeline, do not stand on the hut ---------------
// The farm harvest requires its worker to be standing ON the building tile.
// That is right for a human farmer tending a field, and wrong for a hunter:
// the Hunting Camp draws from FOREST, so the worker should be out among the
// trees. This lets them count as working while on any forest tile near the
// camp, and walks them between tiles so the camp reads as a hunting ground
// rather than someone standing still on a hut.
// WHICH SIDE is playing the Tribe — you, the enemy town, or nobody. Same
// shape as groveOwner(): at most one side is ever Tribe, because the enemy's
// faction is drawn from the three you are not playing.
//
// state.saplings is shared world terrain rather than one side's property — a
// planted tree becomes real forest that EITHER side can then hunt or fell —
// so what this gates is only whether the sapling system needs to run at all.
function tribeOwner(){
  if(state.faction === 'tribe') return OWNER_PLAYER;
  if(typeof aiTownFaction === 'function' && aiTownFaction() === 'tribe') return OWNER_AI;
  return null;
}
function tribeActive(){ return tribeOwner() !== null; }

const HUNT = {
  radius: 4,        // how far from the camp a hunter will range
  moveEveryMs: 5200, // how long they work one spot before moving on
};

function isHuntCamp(b){
  const d = BUILD_DEFS[b.type];
  return !!(state.faction === 'tribe' && b.type === 'farm' && d && d.bonusNear === 'forest');
}

// True if this worker is close enough to its Hunting Camp, and standing on
// forest, to count as hunting. Used by the harvest tick in place of the
// stand-exactly-on-the-building test.
function huntingInPlace(u, b){
  if(u.moving) return false;
  const gx = Math.round(u.gx), gy = Math.round(u.gy);
  if(Math.max(Math.abs(gx-b.gx), Math.abs(gy-b.gy)) > HUNT.radius) return false;
  return tileAt(gx, gy) === 'forest' || (gx === b.gx && gy === b.gy);
}

// Send hunters to a fresh nearby tree every few seconds. Picks randomly
// among the tiles in range rather than always the closest, so two hunters
// on one camp do not stack on the same trunk.
function updateHunters(delta){
  if(state.faction !== 'tribe') return;
  for(const u of state.units){
    if(u.type !== 'villager' || u.hp <= 0 || u.inTC || !u.assignedBuildingId) continue;
    const b = buildingById(u.assignedBuildingId);
    if(!b || !isHuntCamp(b) || underConstruction(b)) continue;
    u.huntMs = (u.huntMs || 0) + delta;
    if(u.moving || u.huntMs < HUNT.moveEveryMs) continue;
    u.huntMs = 0;
    const spots = [];
    for(let dy = -HUNT.radius; dy <= HUNT.radius; dy++){
      for(let dx = -HUNT.radius; dx <= HUNT.radius; dx++){
        const x = b.gx+dx, y = b.gy+dy;
        if(!inBounds(x, y) || tileAt(x, y) !== 'forest') continue;
        if((state.resourceQty[y] && state.resourceQty[y][x] || 0) <= 0) continue;
        if(Math.round(u.gx) === x && Math.round(u.gy) === y) continue;  // already here
        if(state.units.some(o => o !== u && o.hp > 0 && Math.round(o.gx) === x && Math.round(o.gy) === y)) continue;
        spots.push({gx:x, gy:y});
      }
    }
    if(!spots.length) continue;   // no trees left in range — stay put
    const t = spots[Math.floor(Math.random() * spots.length)];
    commandUnitMove(u, t.gx, t.gy);
    u.playerOrder = false;        // this is work, not an order to obey
  }
}
