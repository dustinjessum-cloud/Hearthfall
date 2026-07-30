// ---------------------------------------------------------------------
// Hero spells
//
// Until now a hero's kit was two hardcoded keys with faction branches buried
// inside them — heroThrowJavelin() and heroSlash() each asking "am I the
// swarm?" internally. That works for two abilities and stops working the
// moment a third faction wants something different.
//
// This is the data-driven replacement:
//   - Each hero has a SPELLBOOK of ~3 spells to choose between.
//   - Levelling grants a PICK. You spend it either to learn a new spell or
//     to rank up one you already have, so two runs with the same hero can
//     end up quite different.
//   - Every spell has RANKS, and its numbers are functions of rank rather
//     than constants, so improving one is a data change and never a code
//     change.
//   - Casting costs MANA as well as a cooldown. Mana regenerates, so the
//     limit is per-fight rather than per-cast, and a hero who has spent
//     everything has to pick their moment rather than simply waiting.
//
// The old J/K abilities are untouched and still work; spells are additive.
// ---------------------------------------------------------------------

const HERO_MANA = {
  base: 60,             // at level 1
  perLevel: 12,
  regenPerTick: 2.5,    // per economy tick (3s)
};

// Rank-indexed helpers keep spell definitions readable: rank is 1-based.
const R = (arr) => (rank) => arr[Math.min(rank, arr.length) - 1];

// Heal a building and keep its bar honest — a heal outside the damage path
// never touches the bar, so a repaired wall kept showing the old red sliver.
function healBuilding(b, amt){
  if(!b || b.hp <= 0 || b.hp >= b.maxHp) return 0;
  const before = b.hp;
  b.hp = Math.min(b.maxHp, b.hp + amt);
  if(b.hpBarFg && b.hpBarBg){
    const pct = Math.max(0, b.hp/b.maxHp);
    b.hpBarFg.width = ((b.size||1)*TILE-6)*pct;
    b.hpBarFg.fillColor = pct>0.5 ? 0x6bbf59 : (pct>0.25?0xd8b23a:0xd85a3a);
    if(b.hp >= b.maxHp){ b.hpBarBg.setVisible(false); b.hpBarFg.setVisible(false); }
  }
  return b.hp - before;
}

// A ring that expands and fades — every spell's "something happened here".
function spellBurst(gx, gy, radius, fill, stroke, ms){
  if(!scene || !scene.add) return;
  const ring = scene.add.circle(gx*TILE+TILE/2, gy*TILE+TILE/2, 6, fill, 0.30)
    .setStrokeStyle(3, stroke, 0.95).setDepth(9);
  scene.tweens.add({ targets: ring, scaleX: radius*2.4, scaleY: radius*2.4, alpha: 0,
                     duration: ms || 450, onComplete: ()=> ring.destroy() });
}

const HERO_SPELLS = {
  // The Minotaur — the human hero.
  //
  // His J (javelin) and K (slash) are both damage, ranged and melee, so the
  // book is everything he cannot already do: make the soldiers around him
  // hit harder, stop a charge, and put a battered line back together.
  human: [
    {
      id: 'war_cry',
      name: 'War Cry',
      desc: 'A bellow that carries. Every soldier under his banner strikes harder.',
      maxRank: 3,
      minLevel: 1,
      targeting: 'self',
      mana:     R([25, 30, 35]),
      cooldown: R([20000, 18000, 16000]),
      mult:     R([1.4, 1.6, 1.9]),
      holdMs:   R([8000, 10000, 12000]),
      rankText: (r, s) => `banner damage x${s.mult(r).toFixed(1)} for ${(s.holdMs(r)/1000).toFixed(0)}s`,
      cast(hero, gx, gy, rank){
        // Layers on the standing captain aura rather than replacing it, so
        // this is a reason to keep the Minotaur WITH the line, not behind it.
        state.hero.furyMult = this.mult(rank);
        state.hero.furyMs = this.holdMs(rank);
        spellBurst(hero.gx, hero.gy, CAPTAIN.auraRange, 0xffd76b, 0xe0b040, 500);
        if(scene && scene.add) floatResourceText(hero.gx, hero.gy, 'WAR CRY!', '#ffd76b');
        return true;
      },
    },
    {
      id: 'ground_slam',
      name: 'Ground Slam',
      desc: 'He brings the earth up. What it catches is hurt, and stays put.',
      maxRank: 3,
      minLevel: 2,
      targeting: 'point',
      range: 6,
      mana:     R([30, 34, 38]),
      cooldown: R([15000, 13000, 11000]),
      radius:   R([2.2, 2.8, 3.4]),
      damage:   R([12, 18, 26]),
      holdMs:   R([1500, 2200, 3000]),
      rankText: (r, s) => `${s.radius(r).toFixed(1)} tile radius, ${s.damage(r)} damage, holds ${(s.holdMs(r)/1000).toFixed(1)}s`,
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), dmg = this.damage(rank), ms = this.holdMs(rank);
        let hit = 0;
        for(const e of state.enemies){
          if(e.hp <= 0 || e.kind === 'camp') continue;
          if(Phaser.Math.Distance.Between(e.gx, e.gy, gx, gy) > rad) continue;
          e.hp -= dmg; e.lastHitBy = 'hero';
          e.rootedMs = Math.max(e.rootedMs || 0, ms);
          hit++;
        }
        spellBurst(gx, gy, rad, 0xd8a06b, 0xa8703a);
        if(scene && scene.add) floatResourceText(gx, gy, hit ? `${hit} staggered` : 'the ground shakes', '#d8a06b');
        return true;
      },
    },
    {
      id: 'hold_the_line',
      name: 'Hold the Line',
      desc: 'Wounds bound, walls shored. The only thing that puts stonework back up mid-fight.',
      maxRank: 3,
      minLevel: 3,
      targeting: 'self',
      mana:     R([35, 40, 45]),
      cooldown: R([26000, 23000, 20000]),
      radius:   R([4.0, 5.0, 6.0]),
      heal:     R([20, 32, 46]),
      repair:   R([25, 45, 70]),
      rankText: (r, s) => `heals ${s.heal(r)} to units and repairs ${s.repair(r)} on walls and towers within ${s.radius(r).toFixed(1)} tiles`,
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), amt = this.heal(rank), fix = this.repair(rank);
        let mended = 0, shored = 0;
        for(const u of state.units){
          if(u.hp <= 0 || u.hp >= u.maxHp) continue;
          if(Phaser.Math.Distance.Between(u.gx, u.gy, hero.gx, hero.gy) > rad) continue;
          u.hp = Math.min(u.maxHp, u.hp + amt); mended++;
        }
        // Walls and towers only: a general building heal would quietly make
        // the Repairman redundant, and this is meant to hold a line, not
        // rebuild a town.
        for(const b of myBuildings()){
          if(b.type !== 'wall' && b.type !== 'tower') continue;
          if(Phaser.Math.Distance.Between(b.gx, b.gy, hero.gx, hero.gy) > rad) continue;
          if(healBuilding(b, fix) > 0) shored++;
        }
        spellBurst(hero.gx, hero.gy, rad, 0x9fc4ff, 0x6f94d0, 520);
        if(scene && scene.add) floatResourceText(hero.gx, hero.gy, `${mended} mended, ${shored} shored`, '#9fc4ff');
        return true;
      },
    },
  ],

  // The War Chief — the tribe's hero.
  //
  // The tribe lives off the treeline: it hunts in forest and its timber and
  // its dinner are the same finite thing. So the book is a brawler's opener,
  // a crowd-breaker, and — the one that is really theirs — the power to put
  // the forest back.
  tribe: [
    {
      id: 'frenzy',
      name: 'Frenzy',
      desc: 'The war band works itself into a fury. Harder and shorter than a human war cry.',
      maxRank: 3,
      minLevel: 1,
      targeting: 'self',
      mana:     R([25, 30, 35]),
      cooldown: R([18000, 16000, 14000]),
      mult:     R([1.6, 1.9, 2.3]),
      holdMs:   R([5000, 6500, 8000]),
      rankText: (r, s) => `banner damage x${s.mult(r).toFixed(1)} for ${(s.holdMs(r)/1000).toFixed(1)}s`,
      cast(hero, gx, gy, rank){
        state.hero.furyMult = this.mult(rank);
        state.hero.furyMs = this.holdMs(rank);
        spellBurst(hero.gx, hero.gy, CAPTAIN.auraRange, 0xd85a3a, 0xa8402a, 450);
        if(scene && scene.add) floatResourceText(hero.gx, hero.gy, 'FRENZY!', '#ff8a6b');
        return true;
      },
    },
    {
      id: 'stampede',
      name: 'Stampede',
      desc: 'The band crashes through. Wide, heavy, and it leaves them limping.',
      maxRank: 3,
      minLevel: 2,
      targeting: 'point',
      range: 6,
      mana:     R([30, 35, 40]),
      cooldown: R([16000, 14000, 12000]),
      radius:   R([3.0, 3.8, 4.6]),
      damage:   R([10, 15, 22]),
      slowMs:   R([3000, 4500, 6000]),
      rankText: (r, s) => `${s.radius(r).toFixed(1)} tile radius, ${s.damage(r)} damage, slows ${(s.slowMs(r)/1000).toFixed(0)}s`,
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), dmg = this.damage(rank), ms = this.slowMs(rank);
        let hit = 0;
        for(const e of state.enemies){
          if(e.hp <= 0 || e.kind === 'camp') continue;
          if(Phaser.Math.Distance.Between(e.gx, e.gy, gx, gy) > rad) continue;
          e.hp -= dmg; e.lastHitBy = 'hero';
          e.webSlowMs = Math.max(e.webSlowMs || 0, ms);
          hit++;
        }
        spellBurst(gx, gy, rad, 0xc08a5a, 0x8a5a30);
        if(scene && scene.add) floatResourceText(gx, gy, hit ? `${hit} trampled` : 'dust', '#c08a5a');
        return true;
      },
    },
    {
      id: 'wildgrowth',
      name: 'Wildgrowth',
      desc: 'He calls the woodland back. Saplings burst up where he points.',
      maxRank: 3,
      minLevel: 3,
      targeting: 'point',
      range: 7,
      mana:     R([30, 35, 40]),
      cooldown: R([40000, 34000, 28000]),
      radius:   R([2.5, 3.2, 4.0]),
      trees:    R([5, 8, 12]),
      rankText: (r, s) => `plants up to ${s.trees(r)} saplings within ${s.radius(r).toFixed(1)} tiles`,
      cast(hero, gx, gy, rank){
        const rad = Math.ceil(this.radius(rank)), want = this.trees(rank);
        // The tribe's timber and its food are the SAME finite resource, so
        // regrowing the treeline is an economy action, not a nature effect —
        // which is why it is on a long cooldown and belongs to their hero.
        const spots = [];
        for(let dy=-rad; dy<=rad; dy++){
          for(let dx=-rad; dx<=rad; dx++){
            const x = gx+dx, y = gy+dy;
            if(Math.hypot(dx, dy) > this.radius(rank)) continue;
            if(typeof canPlantAt === 'function' && canPlantAt(x, y)) spots.push([x, y]);
          }
        }
        if(!spots.length){ flashWaveBanner('Nothing here will take root.'); return false; }
        // deterministic spread rather than a clump around the centre
        let planted = 0;
        const step = Math.max(1, Math.floor(spots.length / want));
        for(let i=0; i<spots.length && planted<want; i+=step){
          if(plantSapling(spots[i][0], spots[i][1])) planted++;
        }
        spellBurst(gx, gy, this.radius(rank), 0x6bbf59, 0x4a8a3a, 520);
        if(scene && scene.add) floatResourceText(gx, gy, `${planted} saplings`, '#9fe08a');
        return true;
      },
    },
  ],

  // The Necromancer — the swarm's hero.
  //
  // Her J (web shot) and K (raise broodlings) already cover ranged poke and
  // summoning, so the spellbook deliberately covers what she otherwise CANNOT
  // do: turn the battlefield's dead into damage, hold a crowd at range, and
  // mend her own. Three different answers, not three damage buttons.
  swarm: [
    {
      id: 'corpse_bloom',
      name: 'Corpse Bloom',
      desc: 'Every corpse in the area bursts — shredding the living around it and sending the biomass home.',
      maxRank: 3,
      minLevel: 1,
      targeting: 'point',
      range: 7,
      mana:     R([30, 34, 38]),
      cooldown: R([16000, 14000, 12000]),
      radius:   R([2.5, 3.2, 4.0]),
      damage:   R([9, 14, 20]),
      carrion:  R([8, 12, 18]),
      rankText: (r, s) => `${s.radius(r).toFixed(1)} tile radius — ${s.damage(r)} damage around each corpse, +${s.carrion(r)} carrion each`,
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), dmg = this.damage(rank), food = this.carrion(rank);
        const dead = (state.corpses || []).filter(c =>
          Phaser.Math.Distance.Between(c.gx, c.gy, gx, gy) <= rad);
        // Refusing here rather than fizzling matters: castHeroSpell only
        // charges mana and starts the cooldown when cast() returns non-false,
        // so an empty patch of ground costs the player nothing.
        if(!dead.length){ flashWaveBanner('No dead here to bloom.'); return false; }
        let hit = 0, banked = 0;
        for(const c of dead){
          for(const e of state.enemies){
            if(e.hp <= 0 || e.kind === 'camp') continue;
            if(Phaser.Math.Distance.Between(e.gx, e.gy, c.gx, c.gy) > 1.6) continue;
            e.hp -= dmg; e.lastHitBy = 'hero'; hit++;
          }
          banked += addResource('food', food);
          removeCorpse(c);
        }
        if(scene && scene.add){
          const ring = scene.add.circle(gx*TILE+TILE/2, gy*TILE+TILE/2, 6, 0x9aae78, 0.35)
            .setStrokeStyle(3, 0x6f8a4a, 0.95).setDepth(9);
          scene.tweens.add({ targets: ring, scaleX: rad*2.4, scaleY: rad*2.4, alpha: 0,
                             duration: 420, onComplete: ()=> ring.destroy() });
          floatResourceText(gx, gy, `${dead.length} burst, +${Math.round(banked)} carrion`, '#9aae78');
        }
        return true;
      },
    },
    {
      id: 'grave_chill',
      name: 'Grave Chill',
      desc: 'A cold that settles in the living — a wide, lasting drag on everything caught in it.',
      maxRank: 3,
      minLevel: 2,
      targeting: 'point',
      range: 7,
      mana:     R([28, 32, 36]),
      cooldown: R([15000, 13000, 11000]),
      radius:   R([3.0, 3.8, 4.6]),
      slowMs:   R([4000, 6000, 8000]),
      damage:   R([3, 5, 8]),
      rankText: (r, s) => `${s.radius(r).toFixed(1)} tile radius, slows for ${(s.slowMs(r)/1000).toFixed(0)}s, ${s.damage(r)} damage`,
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), ms = this.slowMs(rank), dmg = this.damage(rank);
        let caught = 0;
        for(const e of state.enemies){
          if(e.hp <= 0 || e.kind === 'camp') continue;
          if(Phaser.Math.Distance.Between(e.gx, e.gy, gx, gy) > rad) continue;
          // Reuses the web shot's slow field, so the drag on both movement AND
          // rate of fire is already handled in enemies.js — one slow, one
          // implementation, no second set of rules to keep in step.
          e.webSlowMs = Math.max(e.webSlowMs || 0, ms);
          e.hp -= dmg; e.lastHitBy = 'hero';
          caught++;
        }
        if(scene && scene.add){
          const ring = scene.add.circle(gx*TILE+TILE/2, gy*TILE+TILE/2, 6, 0x8fb4e8, 0.30)
            .setStrokeStyle(3, 0x6f8ec8, 0.95).setDepth(9);
          scene.tweens.add({ targets: ring, scaleX: rad*2.4, scaleY: rad*2.4, alpha: 0,
                             duration: 500, onComplete: ()=> ring.destroy() });
          floatResourceText(gx, gy, caught ? `${caught} chilled` : 'the cold finds nothing', '#8fb4e8');
        }
        return true;
      },
    },
    {
      id: 'knit_bone',
      name: 'Knit Bone',
      desc: 'Bone finds bone. Mends the Necromancer and every risen thing around her.',
      maxRank: 3,
      minLevel: 3,
      targeting: 'self',
      mana:     R([35, 40, 45]),
      cooldown: R([24000, 21000, 18000]),
      radius:   R([3.5, 4.5, 5.5]),
      heal:     R([18, 30, 45]),
      rankText: (r, s) => `heals ${s.heal(r)} to everything within ${s.radius(r).toFixed(1)} tiles`,
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), amt = this.heal(rank);
        // The undead have NO other healing of any kind — every other faction
        // out-sustains them by default. This is the whole reason the spell
        // exists, so it deliberately reaches the hero herself too.
        let mended = 0;
        for(const u of state.units){
          if(u.hp <= 0 || u.hp >= u.maxHp) continue;
          if(Phaser.Math.Distance.Between(u.gx, u.gy, hero.gx, hero.gy) > rad) continue;
          u.hp = Math.min(u.maxHp, u.hp + amt);
          mended++;
        }
        if(scene && scene.add){
          const ring = scene.add.circle(hero.gx*TILE+TILE/2, hero.gy*TILE+TILE/2, 6, 0xc9b0e8, 0.28)
            .setStrokeStyle(3, 0xa88fd0, 0.95).setDepth(9);
          scene.tweens.add({ targets: ring, scaleX: rad*2.4, scaleY: rad*2.4, alpha: 0,
                             duration: 480, onComplete: ()=> ring.destroy() });
          floatResourceText(hero.gx, hero.gy, mended ? `${mended} knitted` : 'nothing broken', '#c9b0e8');
        }
        return true;
      },
    },
  ],

  // The Elder Bough — the Grove's hero.
  grove: [
    {
      id: 'rootgrasp',
      name: 'Rootgrasp',
      desc: 'Roots burst from the earth, holding enemies fast.',
      maxRank: 3,
      minLevel: 1,
      targeting: 'point',
      range: 7,
      mana:     R([25, 30, 35]),
      cooldown: R([14000, 12000, 10000]),
      radius:   R([2.2, 2.8, 3.4]),
      holdMs:   R([2500, 3500, 4500]),
      damage:   R([0, 4, 8]),      // rank 1 is pure control; later ranks bite
      rankText: (r, s) => `${s.radius(r).toFixed(1)} tile radius, holds ${(s.holdMs(r)/1000).toFixed(1)}s`
        + (s.damage(r) ? `, ${s.damage(r)} damage` : ''),
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), ms = this.holdMs(rank), dmg = this.damage(rank);
        let caught = 0;
        for(const e of state.enemies){
          if(e.hp <= 0 || e.kind === 'camp') continue;
          if(Phaser.Math.Distance.Between(e.gx, e.gy, gx, gy) > rad) continue;
          e.rootedMs = Math.max(e.rootedMs || 0, ms);
          if(dmg){ e.hp -= dmg; e.lastHitBy = 'hero'; }
          caught++;
        }
        if(scene && scene.add){
          const ring = scene.add.circle(gx*TILE+TILE/2, gy*TILE+TILE/2, 6, 0x6b8f4a, 0.35)
            .setStrokeStyle(3, 0x4a6b32, 0.95).setDepth(9);
          scene.tweens.add({ targets: ring, scaleX: rad*2.4, scaleY: rad*2.4, alpha: 0,
                             duration: 420, onComplete: ()=> ring.destroy() });
          floatResourceText(gx, gy, caught ? `${caught} held!` : 'roots grasp', '#9fe08a');
        }
        return true;
      },
    },
    {
      id: 'deep_root',
      name: 'Deep Root',
      desc: 'He reaches under the ground and finds a severed limb. The root is back at once.',
      maxRank: 3,
      minLevel: 2,
      targeting: 'point',
      range: 8,
      mana:     R([30, 26, 22]),      // cheaper with rank: this is a rescue tool
      cooldown: R([20000, 16000, 12000]),
      heal:     R([0, 15, 35]),
      rankText: (r, s) => `reconnects a severed structure instantly and free`
        + (s.heal(r) ? `, and heals it ${s.heal(r)}` : ''),
      cast(hero, gx, gy, rank){
        const b = (typeof occAt === 'function') ? occAt(gx, gy) : null;
        if(!b){ flashWaveBanner('Nothing there to reach.'); return false; }
        if(typeof canRegrowRoot !== 'function' || !canRegrowRoot(b)){
          flashWaveBanner('That is not a severed structure he can reach.');
          return false;
        }
        if(!startRootTo(b)) return false;
        // The paid Regrow Root grows a root at the normal creep speed and the
        // structure keeps withering until it lands. THIS arrives instantly —
        // that immediacy is what a hero cast is worth, and it is why the
        // ability is a rescue rather than a cheaper version of the button.
        const r = (state.groveRoots || []).find(x => x.toId === b.id);
        if(r){ r.progress = 1; r.done = true; }
        b.groveRootFailed = false;
        if(typeof setWitherLook === 'function') setWitherLook(b, false);
        const amt = this.heal(rank);
        if(amt) healBuilding(b, amt);
        if(typeof drawGroveRoots === 'function') drawGroveRoots();
        spellBurst(b.gx, b.gy, 2.5, 0x9fe08a, 0x4a6b32, 480);
        if(scene && scene.add) floatResourceText(b.gx, b.gy, 'rooted!', '#9fe08a');
        return true;
      },
    },
    {
      id: 'bloom',
      name: 'Bloom',
      desc: 'The grove flowers around him, and the wood knits closed.',
      maxRank: 3,
      minLevel: 3,
      targeting: 'self',
      mana:     R([35, 40, 45]),
      cooldown: R([28000, 24000, 20000]),
      radius:   R([4.0, 5.0, 6.5]),
      heal:     R([18, 30, 45]),
      rankText: (r, s) => `heals ${s.heal(r)} to every Grove structure within ${s.radius(r).toFixed(1)} tiles`,
      cast(hero, gx, gy, rank){
        const rad = this.radius(rank), amt = this.heal(rank);
        // Redirect Nutrients mends ONE structure on a 45s cooldown while the
        // rest of the network pays for it. This is the opposite trade: less
        // per structure, but everything at once and nothing forfeited — so
        // after a raid sweeps a limb they answer different problems.
        let mended = 0;
        for(const b of myBuildings()){
          if(b.hp <= 0) continue;
          if(Phaser.Math.Distance.Between(b.gx, b.gy, hero.gx, hero.gy) > rad) continue;
          if(healBuilding(b, amt) > 0) mended++;
        }
        spellBurst(hero.gx, hero.gy, rad, 0xe8c0d8, 0xc090b0, 560);
        if(scene && scene.add) floatResourceText(hero.gx, hero.gy, mended ? `${mended} bloomed` : 'all is whole', '#e8c0d8');
        return true;
      },
    },
  ],
};

// ---- hero state ------------------------------------------------------
function heroMaxMana(){ return HERO_MANA.base + (state.hero.level - 1) * HERO_MANA.perLevel; }

function initHeroSpells(){
  const h = state.hero;
  if(h.mana === undefined) h.mana = heroMaxMana();
  if(!h.spells) h.spells = {};       // id -> rank
  if(h.picks === undefined) h.picks = 1;   // one to spend at level 1
  if(!h.cooldowns) h.cooldowns = {}; // id -> ms remaining
}

function heroSpellbook(){ return HERO_SPELLS[state.faction] || []; }
function heroSpellById(id){ return heroSpellbook().find(s => s.id === id) || null; }
function heroSpellRank(id){ return (state.hero.spells && state.hero.spells[id]) || 0; }

// What a pick could be spent on right now: an unlearned spell at the right
// level, or a known one below its max rank.
function heroSpellChoices(){
  return heroSpellbook().filter(s => {
    if(state.hero.level < s.minLevel) return false;
    return heroSpellRank(s.id) < s.maxRank;
  });
}

function learnHeroSpell(id){
  const s = heroSpellById(id);
  if(!s || state.hero.picks <= 0) return false;
  const cur = heroSpellRank(id);
  if(cur >= s.maxRank) return false;
  if(state.hero.level < s.minLevel) return false;
  state.hero.spells[id] = cur + 1;
  state.hero.picks--;
  flashWaveBanner(cur ? `${s.name} improved to rank ${cur+1}.` : `${s.name} learned!`);
  refreshInfoPanel();
  return true;
}

function heroSpellReady(id){
  const s = heroSpellById(id);
  if(!s) return false;
  const rank = heroSpellRank(id);
  if(rank <= 0) return false;
  if((state.hero.cooldowns[id] || 0) > 0) return false;
  return state.hero.mana >= s.mana(rank);
}

function castHeroSpell(id, gx, gy){
  const s = heroSpellById(id);
  const hero = livingCaptain();
  if(!s || !hero) return false;
  const rank = heroSpellRank(id);
  if(rank <= 0){ flashWaveBanner('Not learned yet.'); return false; }
  if((state.hero.cooldowns[id] || 0) > 0){ flashWaveBanner(`${s.name} is not ready.`); return false; }
  if(state.hero.mana < s.mana(rank)){ flashWaveBanner('Not enough power.'); return false; }
  if(s.targeting === 'point' && Phaser.Math.Distance.Between(hero.gx, hero.gy, gx, gy) > s.range){
    flashWaveBanner('Out of range.'); return false;
  }
  if(s.cast(hero, gx, gy, rank) === false) return false;
  state.hero.mana -= s.mana(rank);
  state.hero.cooldowns[id] = s.cooldown(rank);
  refreshInfoPanel();
  return true;
}

// Cooldowns run on the frame clock; mana refills on the economy tick so it
// is paced against the rest of the economy rather than the frame rate.
function updateHeroSpells(delta){
  const h = state.hero;
  if(!h || !h.cooldowns) return;
  for(const id in h.cooldowns){
    if(h.cooldowns[id] > 0) h.cooldowns[id] = Math.max(0, h.cooldowns[id] - delta);
  }
  if(h.furyMs > 0) h.furyMs = Math.max(0, h.furyMs - delta);
}

// A temporary multiplier ON TOP of the captain's standing damage aura. It
// rides the aura rather than introducing a second combat path, so exactly one
// line in enemies.js changes and the UI's damage preview stays honest by
// reading the same helper.
function heroFuryMult(){
  const h = state.hero;
  return (h && h.furyMs > 0) ? (h.furyMult || 1) : 1;
}
function heroFuryActive(){ return heroFuryMult() > 1; }
function heroManaTick(){
  const h = state.hero;
  if(!h) return;
  h.mana = Math.min(heroMaxMana(), (h.mana || 0) + HERO_MANA.regenPerTick);
}

// Enemies held by Rootgrasp. Kept here rather than in the spell so any future
// hold effect shares one implementation.
function updateRootedEnemies(delta){
  for(const e of state.enemies){
    if(!(e.rootedMs > 0)) continue;
    e.rootedMs -= delta;
    if(e.rootedMs <= 0){
      e.rootedMs = 0;
      if(e.sprite && e.sprite.setTint){
        if(e.baseTint) e.sprite.setTint(e.baseTint); else e.sprite.clearTint();
      }
    } else if(e.sprite && e.sprite.setTint){
      e.sprite.setTint(0x7a9a5a);   // held: washed green
    }
  }
}
function isEnemyRooted(e){ return !!(e && e.rootedMs > 0); }

// ---- targeting -------------------------------------------------------
// Reuses the castMode pattern that Seed Grove and Spread Blight already use,
// so a third targeted thing needs no third set of input rules.
function beginSpellTargeting(id){
  if(!heroSpellReady(id)) return;
  const s = heroSpellById(id);
  // A SELF cast has nothing to aim at. Without this it entered targeting mode
  // anyway and made you click your own hero to buff your own hero, which reads
  // as a bug rather than a spell.
  if(s && s.targeting === 'self'){
    const hero = livingCaptain();
    if(hero) castHeroSpell(id, hero.gx, hero.gy);
    return;
  }
  state.castMode = { kind:'spell', spellId:id };
  flashWaveBanner(`${s.name} — choose a target. Esc or right-click to cancel.`);
}
function cancelSpellTargeting(){
  state.castMode = null;
  if(scene){
    if(scene._spellArea){ scene._spellArea.destroy(); scene._spellArea = null; }
    if(scene._spellRange){ scene._spellRange.destroy(); scene._spellRange = null; }
  }
}
function updateSpellGhost(gx, gy){
  const cm = state.castMode;
  if(!cm || cm.kind !== 'spell'){ return; }
  const s = heroSpellById(cm.spellId);
  const hero = livingCaptain();
  if(!s || !hero){ cancelSpellTargeting(); return; }
  const rank = heroSpellRank(s.id);
  if(!scene._spellRange){
    scene._spellRange = scene.add.circle(0,0,10,0x9fe08a,0).setStrokeStyle(1,0x9fe08a,0.5).setDepth(9);
  }
  scene._spellRange.setPosition(hero.gx*TILE+TILE/2, hero.gy*TILE+TILE/2);
  scene._spellRange.setRadius(s.range*TILE);
  const inRange = Phaser.Math.Distance.Between(hero.gx, hero.gy, gx, gy) <= s.range;
  const col = inRange ? 0x7ad07a : 0xd85a3a;
  if(!scene._spellArea){
    scene._spellArea = scene.add.circle(0,0,10,0x7ad07a,0.18).setStrokeStyle(2,0x7ad07a,0.9).setDepth(10);
  }
  scene._spellArea.setPosition(gx*TILE+TILE/2, gy*TILE+TILE/2);
  scene._spellArea.setRadius((s.radius ? s.radius(rank) : 1) * TILE);
  scene._spellArea.setFillStyle(col, 0.18);
  scene._spellArea.setStrokeStyle(2, col, 0.9);
}

// The action bar's cast path. beginSpellTargeting() silently ignores a spell
// that is not ready, which is correct for a panel button that is already
// disabled — but a HOTKEY has no disabled state, so pressing I on a cooling
// spell did nothing at all and read as a dead key. Say why, then cast.
function heroCastFromBar(id){
  const s = heroSpellById(id);
  if(!s) return false;
  if(state.gameOver || state.paused) return false;
  if(!livingCaptain()){ flashWaveBanner('No hero to command.'); return false; }
  const rank = heroSpellRank(id);
  if(rank <= 0){
    flashWaveBanner(state.hero.level < s.minLevel
      ? `${s.name} needs hero level ${s.minLevel}.`
      : `${s.name} is not learned yet — spend a skill point on it.`);
    return false;
  }
  const cd = state.hero.cooldowns[id] || 0;
  if(cd > 0){ flashWaveBanner(`${s.name} is not ready (${Math.ceil(cd/1000)}s).`); return false; }
  if(state.hero.mana < s.mana(rank)){
    flashWaveBanner(`Not enough power for ${s.name} (${s.mana(rank)} needed).`); return false;
  }
  beginSpellTargeting(id);
  return true;
}
