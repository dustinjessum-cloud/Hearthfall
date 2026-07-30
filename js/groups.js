// ---------------------------------------------------------------------
// Control groups
//
// Ctrl+1..9 binds the current selection, 1..9 recalls it, and a chip strip
// in the bottom bar shows what each group is and how it is faring.
//
// Groups store unit IDs, never object references. Three reasons, all of
// which bit other systems earlier:
//   - ids survive save/load (unitIdCounter is serialised and every unit's id
//     is stamped back), so a group does not evaporate on reload
//   - a dead unit prunes itself when the group is next read, so nothing has
//     to be cleaned up in the combat path
//   - stale references cannot keep dead objects alive
//
// Membership OVERLAPS on purpose: a unit may sit in several groups. That is
// what players expect, and exclusive membership makes "all my soldiers" and
// "my left flank" mutually exclusive, which is useless.
// ---------------------------------------------------------------------
const CONTROL_GROUPS = {
  count: 9,
  doubleTapMs: 350,   // second press within this window centres the camera
  flashMs: 2500,      // how long a chip stays lit after the group takes a hit
};

function groupsInit(){
  if(!state.controlGroups) state.controlGroups = {};
  state._groupTap = {};      // n -> timestamp of last recall, for double-tap
  state._groupHurt = {};     // n -> timestamp of last damage taken
}

// Living members, in a stable order. Also the pruning step: anything dead or
// removed simply stops being returned.
function groupMembers(n){
  const ids = state.controlGroups && state.controlGroups[n];
  if(!ids || !ids.length) return [];
  const out = [];
  for(const id of ids){
    const u = state.units.find(x => x.id === id && x.hp > 0);
    if(u) out.push(u);
  }
  return out;
}

// What is currently selected, as a list — one unit, a drag-selected group,
// or nothing.
function currentSelectionUnits(){
  if(state.selectedGroup && state.selectedGroup.length) return state.selectedGroup.filter(u=>u.hp>0);
  if(state.selected && state.selected.type === 'unit' && state.selected.ref.hp > 0) return [state.selected.ref];
  return [];
}

function bindControlGroup(n, append){
  const sel = currentSelectionUnits();
  if(!sel.length){ flashWaveBanner(`Nothing selected — group ${n} unchanged.`); return; }
  const existing = append ? (state.controlGroups[n] || []) : [];
  const ids = existing.slice();
  for(const u of sel) if(!ids.includes(u.id)) ids.push(u.id);
  state.controlGroups[n] = ids;
  flashWaveBanner(`${append ? 'Added to' : 'Bound'} group ${n} — ${ids.length} unit${ids.length===1?'':'s'}.`);
  refreshGroupChips();
}

function recallControlGroup(n){
  const members = groupMembers(n);
  if(!members.length){ flashWaveBanner(`Group ${n} is empty.`); return; }
  // rewrite the stored ids so the dead are dropped for good, not re-scanned
  state.controlGroups[n] = members.map(u => u.id);

  const now = performance.now();
  const last = state._groupTap[n] || 0;
  state._groupTap[n] = now;

  setGroupSelection(members);

  // Second press inside the window centres the camera. Deliberately NOT on
  // the first press: with a group you often want to select and immediately
  // right-click somewhere already on screen, and moving the camera under the
  // cursor fights that.
  if(now - last <= CONTROL_GROUPS.doubleTapMs){
    const cx = members.reduce((s,u)=>s+u.gx,0)/members.length;
    const cy = members.reduce((s,u)=>s+u.gy,0)/members.length;
    if(scene && scene.cameras) scene.cameras.main.pan(cx*TILE, cy*TILE, 260, 'Sine.easeInOut');
  }
}

// Select the whole army. The single most common thing a player wants, and
// cheap because mySoldiers() already exists.
function selectAllSoldiers(){
  const army = mySoldiers();
  if(!army.length){ flashWaveBanner('No soldiers to select.'); return; }
  setGroupSelection(army);
}

// Called when a unit takes damage, so its chips can flash. Cheap: a
// timestamp per group, read by the renderer.
function noteGroupDamage(u){
  if(!u || !state.controlGroups) return;
  for(const n in state.controlGroups){
    if(state.controlGroups[n].includes(u.id)) state._groupHurt[n] = performance.now();
  }
}

// ---- the chip strip --------------------------------------------------
// Rebuilt only when the SHAPE changes (which groups exist, how many in
// each); HP and the hurt flash are updated in place every refresh. Same
// discipline as the info panel — never replace a node a player might click.
function refreshGroupChips(){
  const bar = document.getElementById('groupBar');
  if(!bar) return;
  const live = [];
  for(let n = 1; n <= CONTROL_GROUPS.count; n++){
    const m = groupMembers(n);
    if(m.length) live.push({ n, m });
  }
  const shape = live.map(g => g.n + ':' + g.m.length).join('|');
  if(bar._shape !== shape){
    bar._shape = shape;
    if(!live.length){
      bar.innerHTML = '<span class="slotEmpty">Ctrl+1-9</span>';
    } else {
      bar.innerHTML = live.map(g =>
        `<button class="grpChip" data-n="${g.n}" title="Group ${g.n} — click to select, double-click to centre">
           <span class="grpN">${g.n}</span><span class="grpCount">${g.m.length}</span>
           <span class="grpHp"><i></i></span>
         </button>`).join('');
      for(const btn of bar.querySelectorAll('.grpChip')){
        btn.addEventListener('click', ()=> recallControlGroup(+btn.dataset.n));
      }
    }
  }
  // live values every call
  const now = performance.now();
  for(const btn of bar.querySelectorAll('.grpChip')){
    const n = +btn.dataset.n;
    const m = groupMembers(n);
    if(!m.length) continue;
    const hp = m.reduce((s,u)=>s+Math.max(0,u.hp),0);
    const max = m.reduce((s,u)=>s+u.maxHp,0);
    const pct = max ? hp/max : 0;
    const fill = btn.querySelector('.grpHp > i');
    if(fill){
      fill.style.width = Math.round(pct*100) + '%';
      fill.style.background = pct > 0.5 ? '#6bbf59' : (pct > 0.25 ? '#d8b23a' : '#d85a3a');
    }
    const hurt = (now - (state._groupHurt[n] || 0)) < CONTROL_GROUPS.flashMs;
    btn.classList.toggle('hurt', hurt);
  }
}

// ---- double-click: select every one of that kind on screen -------------
// The RTS convention, and the fastest way to grab "all my archers" without
// binding a control group first. Deliberately limited to what is ON SCREEN:
// the map is 142 tiles wide, so selecting every villager everywhere would
// hand you a selection spanning the whole world and quietly pull workers off
// jobs at the far end when you next right-clicked.
const TYPE_SELECT = {
  doubleClickMs: 350,   // same window the control-group double-tap uses
};

function unitsOfTypeOnScreen(type){
  const out = [];
  const cam = scene && scene.cameras && scene.cameras.main;
  const view = cam && cam.worldView;
  for(const u of state.units){
    if(u.hp <= 0 || u.type !== type) continue;
    if(u.inTC || u.inTowerId) continue;          // hidden inside something
    if(view){
      const px = u.gx*TILE + TILE/2, py = u.gy*TILE + TILE/2;
      if(px < view.x || px > view.x + view.width) continue;
      if(py < view.y || py > view.y + view.height) continue;
    }
    out.push(u);
  }
  return out;
}

function selectAllOfTypeOnScreen(proto){
  if(!proto) return;
  const matches = unitsOfTypeOnScreen(proto.type);
  if(matches.length <= 1){ selectEntity('unit', proto); return; }
  setGroupSelection(matches);
  const name = (typeof unitDisplayName === 'function') ? unitDisplayName(proto.type) : 'unit';
  flashWaveBanner(`Selected ${matches.length} ${name}${matches.length === 1 ? '' : 's'} on screen.`);
}
