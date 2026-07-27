// ---------------------------------------------------------------------
// Session recorder
//
// The project's real problem is that far more has been BUILT than has been
// VALIDATED: four endgame phases, three factions and an AI economy, all
// tuned by reasoning rather than evidence. This records what actually
// happens in a run so balance can be argued from data.
//
// PRIVACY: everything stays in this browser's localStorage, under its own
// key, separate from the save. Nothing is transmitted anywhere. Exporting is
// a manual click that downloads a file you choose to share.
//
// The log is capped and events are terse — this runs for a whole session, so
// it must never grow without bound or cost measurable frame time.
// ---------------------------------------------------------------------
const TELEMETRY_KEY = 'hearthfall_session_log';
const TELEMETRY = {
  maxEvents: 4000,       // ~a very long session; oldest are dropped first
  snapshotMs: 30000,     // periodic economy sample, for the SHAPE of a run
  flushMs: 10000,        // how often the log is written to localStorage
};

function telemetryInit(){
  state.session = {
    id: 'S' + Date.now().toString(36),
    startedAt: Date.now(),
    faction: state.faction,
    events: [],
    snapMs: 0,
    flushMs: 0,
    recording: true,
  };
  logEvent('session_start', { faction: state.faction });
}

// Seconds since the run began — far more useful than wall-clock timestamps
// when reading a log back, and much smaller to store.
function sessionT(){
  return state.session ? Math.round((Date.now() - state.session.startedAt)/1000) : 0;
}

function logEvent(type, data){
  const s = state.session;
  if(!s || !s.recording) return;
  s.events.push(Object.assign({ t: sessionT(), e: type }, data || {}));
  // drop the oldest rather than stop recording: the END of a run is the
  // interesting part, so a capped log should lose its beginning, not its end
  if(s.events.length > TELEMETRY.maxEvents) s.events.splice(0, 500);
}

// A periodic sample of the whole economy. Single events tell you WHAT
// happened; these tell you the shape — whether food climbed all run, whether
// the army ever grew, whether the AI kept pace.
function logSnapshot(){
  if(!state.session) return;
  const r = state.resources;
  logEvent('snap', {
    food: Math.round(r.food), wood: Math.round(r.wood), stone: Math.round(r.stone),
    gold: Math.round(r.gold || 0), bone: Math.round(r.bone || 0),
    pop: state.population.current, cap: state.population.cap,
    hap: Math.round(state.happiness),
    units: state.units.filter(u=>u.hp>0).length,
    army: (typeof mySoldiers === 'function') ? mySoldiers().length : 0,
    bldgs: (typeof myBuildings === 'function') ? myBuildings().filter(b=>b.hp>0).length : 0,
    wave: state.wave,
    enemies: state.enemies.filter(e=>e.hp>0 && e.kind!=='camp').length,
    // Which production buildings exist and whether they are STAFFED. Reading
    // the last log, stone froze at 79 for six minutes and the data could not
    // say whether the quarry was destroyed, unstaffed, or out of deposit.
    // Production, counted per building type. Reads BOTH economies: the
    // worker-driven one (produces + a staffed worker) and the Grove's, where
    // buildings yield by being CONNECTED and no worker exists. Reading the
    // first Grove log, this block was empty in every snapshot — it only knew
    // about `produces`, so the entire faction's economy was invisible exactly
    // where it most needed measuring.
    prod: (function(){
      const out = {};
      const groveOn = (state.faction === 'grove' && typeof groveConnectedIds === 'function');
      const linked = groveOn ? groveConnectedIds() : null;
      for(const b of myBuildings()){
        if(b.hp<=0 || underConstruction(b)) continue;
        const d = BUILD_DEFS[b.type];
        if(!d || (!d.produces && !d.groveYield)) continue;
        const k = b.type;
        out[k] = out[k] || { n:0, staffed:0, dry:0 };
        out[k].n++;
        if(d.produces){
          if(workersOf(b).length) out[k].staffed++;
          // no resource left within reach is the difference between "idle" and
          // "nothing left to mine"
          if(d.bonusNear && !findNearestResourceTile(b.gx, b.gy, d.bonusNear, 10)) out[k].dry++;
        } else {
          // Grove: "staffed" means CONNECTED — a severed structure is the
          // faction's equivalent of an unstaffed one, and yields nothing.
          const conn = b.isCore || (linked && linked.has(b.id));
          if(conn) out[k].staffed++;
          // and record how far along it is, since a Seed yields nothing even
          // when perfectly connected
          const st = (typeof groveStageDef === 'function') ? groveStageDef(b).name : '?';
          out[k].stages = out[k].stages || {};
          out[k].stages[st] = (out[k].stages[st] || 0) + 1;
          // Heartroots and Stonebarks can ALSO be worked by an Ent now, so the
          // passive yield is no longer the whole story for them — record the
          // crew separately from `staffed`, which still means "connected".
          if(d.needsWorker) out[k].ents = (out[k].ents || 0) + workersOf(b).length;
        }
      }
      return out;
    })(),
    // Meaningful for every faction now. This used to be null for the Grove
    // because it had no gathering jobs at all, so every Ent read idle forever
    // and the number said nothing. Ents can be put to work at a Heartroot or
    // Stonebark, so an idle one is once again a real thing to notice.
    idle: (typeof idleWorkers === 'function') ? idleWorkers().length : null,
    // The Grove IS its network, so record the network: how much is connected,
    // how much is stranded, and how many roots are still creeping.
    grove: (state.faction === 'grove' && typeof groveConnectedIds === 'function') ? (function(){
      const linked = groveConnectedIds();
      const mine = myBuildings().filter(b => b.hp > 0 && !underConstruction(b));
      const roots = state.groveRoots || [];
      return {
        structures: mine.length,
        connected: mine.filter(b => b.isCore || linked.has(b.id)).length,
        severed:   mine.filter(b => !b.isCore && !linked.has(b.id)).length,
        rootsGrowing: roots.filter(r => !r.done).length,
        rootsDone:    roots.filter(r => r.done).length,
        heartwoodStage: (function(){
          const h = groveHeartwood();
          return h && typeof groveStageDef === 'function' ? groveStageDef(h).name : null;
        })(),
      };
    })() : null,
    // the AI's side of the race, so their economy can be compared to yours
    aiRes: state.ai ? { f:Math.round(state.ai.resources.food), w:Math.round(state.ai.resources.wood), s:Math.round(state.ai.resources.stone) } : null,
    aiBldgs: (typeof aiBuildings === 'function') ? aiBuildings().filter(b=>b.hp>0).length : 0,
    aiFac: state.aiFaction || null,   // which faction you were actually racing
    aiUnits: state.enemies.filter(e=>e.hp>0 && (e.homeGuard || e.mustering || e.aiAttacker)).length,
  });
}

function updateTelemetry(delta){
  const s = state.session;
  if(!s || !s.recording) return;
  s.snapMs += delta;
  if(s.snapMs >= TELEMETRY.snapshotMs){ s.snapMs = 0; logSnapshot(); }
  // Written periodically rather than every event: a crash or an accidental
  // reload should cost seconds of history, not the whole run.
  s.flushMs += delta;
  if(s.flushMs >= TELEMETRY.flushMs){ s.flushMs = 0; telemetryFlush(); }
}

function telemetryFlush(){
  if(!state.session) return;
  try {
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(telemetryPayload()));
  } catch(err){
    // Storage full or private mode. Recording continues in memory so the
    // session is still exportable — it just will not survive a reload.
    console.warn('Session log could not be saved to localStorage:', err && err.message);
  }
}

function telemetryPayload(){
  const s = state.session;
  return {
    version: 1,
    id: s.id,
    faction: s.faction,
    startedAt: s.startedAt,
    durationSec: sessionT(),
    build: (typeof SAVE_VERSION !== 'undefined') ? SAVE_VERSION : null,
    mapW: MAP_W, mapH: MAP_H,
    events: s.events,
  };
}

function telemetryEventCount(){ return state.session ? state.session.events.length : 0; }

// Download the run as a JSON file. Deliberately a file rather than a
// clipboard copy: a long session is far too large to paste comfortably, and
// a file can be attached as-is.
function exportSessionLog(){
  if(!state.session){ flashWaveBanner('Nothing recorded yet.'); return; }
  telemetryFlush();
  const payload = telemetryPayload();
  const name = `hearthfall_${payload.faction}_${new Date(payload.startedAt).toISOString().slice(0,16).replace(/[:T]/g,'-')}.json`;
  try {
    const blob = new Blob([JSON.stringify(payload, null, 1)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
    flashWaveBanner(`Session exported — ${payload.events.length} events, ${Math.round(payload.durationSec/60)} min.`);
  } catch(err){
    console.error('Export failed:', err);
    flashWaveBanner('Export failed — see the console.');
  }
}

function toggleRecording(){
  if(!state.session) return;
  // Log the PAUSE before pausing, or the gap it creates is unexplained: a
  // read of the last log showed snapshots stopping at t=283 and resuming at
  // t=625 with nothing to say why 5.7 minutes were missing.
  if(state.session.recording) logEvent('recording_paused');
  state.session.recording = !state.session.recording;
  if(state.session.recording) logEvent('recording_resumed');
  refreshHud2Buttons();
  flashWaveBanner(state.session.recording ? 'Recording resumed.' : 'Recording paused.');
}
