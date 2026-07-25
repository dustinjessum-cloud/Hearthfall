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
  // -- roster: rename, re-cost and re-skin the types the tribe keeps --
  BUILD_DEFS.house       = { name:'Hide Hut', cost:{wood:18}, hp:55, frame:'tribe_hut', popCap:4 };

  // Hunting Camp replaces the farm. bonusNear:'forest' is the whole design
  // difference in one field — food now comes from the treeline, not from
  // open ground, so food and timber compete for the same territory.
  BUILD_DEFS.farm        = { name:'Hunting Camp', cost:{wood:15}, hp:50, frame:'tribe_hut',
                             tint:0xb08858, produces:{food:5}, needsWorker:true, bonusNear:'forest' };

  BUILD_DEFS.lumber_camp = { name:'Timber Fell', cost:{wood:15}, hp:50, frame:'lumber_camp',
                             tint:0xc0a070, produces:{wood:4}, needsWorker:true, bonusNear:'forest' };
  BUILD_DEFS.quarry      = { name:'Stone Pit', cost:{wood:20, stone:10}, hp:60, frame:'quarry',
                             tint:0xc0a070, produces:{stone:3}, needsWorker:true, bonusNear:'stone_deposit' };
  BUILD_DEFS.barracks    = { name:'War Lodge', cost:{wood:35}, hp:100, frame:'tribe_lodge',
                             tint:0xd8b088, trains:'archer' };
  BUILD_DEFS.tower       = { name:'Watch Totem', cost:{wood:14, stone:18}, hp:140, frame:'tribe_totem',
                             blocksPath:true, garrison:true,
                             attack:{ range:4.0, damage:7, damageLow:4, cooldownMs:950 } };
  BUILD_DEFS.granary     = { name:'Cache', cost:{wood:25}, hp:80, frame:'granary',
                             tint:0xc0a070, nearTC:true };
  BUILD_DEFS.warehouse   = { name:'Stockpile', cost:{wood:30}, hp:80, frame:'warehouse',
                             tint:0xc0a070, nearTC:true };
  BUILD_DEFS.wall        = { name:'Stake Wall', cost:{wood:6}, hp:100, frame:'wall',
                             tint:0xc0a070, blocksPath:true };
  BUILD_DEFS.gate        = { name:'Stake Gate', cost:{wood:8}, hp:100, frame:'wall_gate',
                             tint:0xc0a070, blocksPath:true, friendlyPassable:true };
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
  plantMs: 2500,        // time spent planting one sapling
  saplingMs: 60000,     // how long until it is harvestable forest
  qty: [70, 100],       // a planted tree yields a little less than wild growth
  searchRadius: 6,      // how far it will wander looking for bare ground
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
  state.saplings = state.saplings.filter(s => !done.includes(s));
  markMinimapDirty();
}

// Foresters work on their own: find bare ground near where they stand, walk
// to it, plant, repeat. They are workers, not a spell — they cost population
// and can be killed mid-walk like any other unit.
function updateForesters(delta){
  for(const u of state.units){
    if(u.type !== 'forester' || u.hp <= 0) continue;
    if(u.moving) continue;
    if(u.plantMs > 0){
      u.plantMs -= delta;
      if(u.plantMs <= 0){
        plantSapling(Math.round(u.gx), Math.round(u.gy));
        u.plantTarget = null;
      }
      continue;
    }
    if(u.plantTarget){
      // arrived where it meant to plant?
      if(Math.round(u.gx) === u.plantTarget.gx && Math.round(u.gy) === u.plantTarget.gy){
        u.plantMs = FORESTER.plantMs;
      } else if(!u.path || !u.path.length){
        u.path = findFriendlyPath(u, u.plantTarget.gx, u.plantTarget.gy, null);
        if(!u.path) u.plantTarget = null;
      }
      continue;
    }
    // look for somewhere to plant, spiralling out from where it stands
    const ox = Math.round(u.gx), oy = Math.round(u.gy);
    let found = null;
    for(let r = 1; r <= FORESTER.searchRadius && !found; r++){
      for(let dy = -r; dy <= r && !found; dy++){
        for(let dx = -r; dx <= r && !found; dx++){
          if(Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if(canPlantAt(ox+dx, oy+dy)) found = { gx: ox+dx, gy: oy+dy };
        }
      }
    }
    if(found){
      u.plantTarget = found;
      commandUnitMove(u, found.gx, found.gy);
      u.playerOrder = false;   // it is working, not following an order
    }
  }
}

function createForester(gx, gy){
  const u = {
    id: unitIdCounter++, type:'forester', gx, gy, tx:gx, ty:gy,
    hp: FORESTER.hp, maxHp: FORESTER.hp, lastAttackAt: 0, moving: false,
    orderQueue: [], plantTarget: null, plantMs: 0,
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
