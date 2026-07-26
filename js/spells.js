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

const HERO_SPELLS = {
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
}
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
  state.castMode = { kind:'spell', spellId:id };
  const s = heroSpellById(id);
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
