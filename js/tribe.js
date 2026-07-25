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
