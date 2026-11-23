/* ===== core: helpers, data, storage, stats ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, c = '') => `<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const KEY = 'ironlog_v3', OLD_KEY = 'ironlog_gym_tracker_v2', LB = 2.20462, DAY = 864e5;
const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body', 'Cardio', 'Other'];
const MCOL = { Chest: '#D7262B', Back: '#1D56CF', Legs: '#E08600', Shoulders: '#17864A', Arms: '#8B5CF6', Core: '#64748B', 'Full body': '#0E9F9E', Cardio: '#DB2777', Other: '#78716C' };
const EQUIP = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Other'];
const DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = o => JSON.parse(JSON.stringify(o));
const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

const LIB = [
  ['Barbell Bench Press', 'Chest', 'Barbell'], ['Dumbbell Bench Press', 'Chest', 'Dumbbell'], ['Incline Barbell Bench Press', 'Chest', 'Barbell'],
  ['Incline Dumbbell Press', 'Chest', 'Dumbbell'], ['Machine Chest Press', 'Chest', 'Machine'], ['Cable Fly', 'Chest', 'Cable'],
  ['Pec Deck', 'Chest', 'Machine'], ['Dumbbell Fly', 'Chest', 'Dumbbell'], ['Dips', 'Chest', 'Bodyweight'], ['Push-Ups', 'Chest', 'Bodyweight'],
  ['Deadlift', 'Back', 'Barbell'], ['Pull-Ups', 'Back', 'Bodyweight'], ['Chin-Ups', 'Back', 'Bodyweight'], ['Lat Pulldown', 'Back', 'Cable'],
  ['Barbell Row', 'Back', 'Barbell'], ['Dumbbell Row', 'Back', 'Dumbbell'], ['Seated Cable Row', 'Back', 'Cable'], ['T-Bar Row', 'Back', 'Barbell'],
  ['Back Squat', 'Legs', 'Barbell'], ['Front Squat', 'Legs', 'Barbell'], ['Leg Press', 'Legs', 'Machine'], ['Romanian Deadlift', 'Legs', 'Barbell'],
  ['Bulgarian Split Squat', 'Legs', 'Dumbbell'], ['Walking Lunge', 'Legs', 'Dumbbell'], ['Leg Extension', 'Legs', 'Machine'], ['Leg Curl', 'Legs', 'Machine'],
  ['Hip Thrust', 'Legs', 'Barbell'], ['Standing Calf Raise', 'Legs', 'Machine'], ['Hack Squat', 'Legs', 'Machine'],
  ['Overhead Press', 'Shoulders', 'Barbell'], ['Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell'], ['Lateral Raise', 'Shoulders', 'Dumbbell'],
  ['Cable Lateral Raise', 'Shoulders', 'Cable'], ['Rear Delt Fly', 'Shoulders', 'Dumbbell'], ['Face Pull', 'Shoulders', 'Cable'], ['Shrugs', 'Shoulders', 'Dumbbell'],
  ['Barbell Curl', 'Arms', 'Barbell'], ['Dumbbell Curl', 'Arms', 'Dumbbell'], ['Hammer Curl', 'Arms', 'Dumbbell'], ['Preacher Curl', 'Arms', 'Machine'],
  ['Tricep Pushdown', 'Arms', 'Cable'], ['Overhead Tricep Extension', 'Arms', 'Cable'], ['Skull Crusher', 'Arms', 'Barbell'], ['Close-Grip Bench Press', 'Arms', 'Barbell'],
  ['Hanging Leg Raise', 'Core', 'Bodyweight'], ['Cable Crunch', 'Core', 'Cable'], ['Ab Wheel Rollout', 'Core', 'Other'], ['Russian Twist', 'Core', 'Bodyweight'],
];
// Old IronLog (v2) names -> new library names
const ALIAS = {
  'barbell deadlift': 'Deadlift', 'barbell back squat': 'Back Squat', 'overhead barbell press': 'Overhead Press', 'bent-over barbell row': 'Barbell Row',
  'barbell bicep curl': 'Barbell Curl', 'dumbbell chest fly': 'Dumbbell Fly', 'weighted dips': 'Dips', 'cable crossover': 'Cable Fly',
  'lying leg curl': 'Leg Curl', 'dumbbell lateral raise': 'Lateral Raise', 'cable face pull': 'Face Pull', 'tricep rope pushdown': 'Tricep Pushdown',
  'ez-bar skullcrusher': 'Skull Crusher', 'chest press': 'Machine Chest Press', 'dumbbell chest press': 'Dumbbell Bench Press', 'bench press': 'Barbell Bench Press',
  'squat': 'Back Squat', 'ohp': 'Overhead Press',
};
// The weekly plan you start with (editable in Plan)
const ROUTINES = [
  { name: 'Chest Day', day: 0, items: [['Barbell Bench Press', 4, 6, 8], ['Dumbbell Bench Press', 3, 8, 10], ['Incline Dumbbell Press', 3, 8, 12], ['Machine Chest Press', 3, 10, 12], ['Cable Fly', 3, 12, 15]] },
  { name: 'Back Day', day: 1, items: [['Deadlift', 3, 5, 5], ['Pull-Ups', 3, 6, 10], ['Barbell Row', 3, 8, 10], ['Lat Pulldown', 3, 10, 12], ['Seated Cable Row', 3, 10, 12]] },
  { name: 'Leg Day', day: 2, items: [['Back Squat', 4, 5, 8], ['Romanian Deadlift', 3, 8, 10], ['Leg Press', 3, 10, 12], ['Leg Curl', 3, 10, 12], ['Standing Calf Raise', 4, 12, 15]] },
  { name: 'Shoulder Day', day: 3, items: [['Overhead Press', 4, 6, 8], ['Dumbbell Shoulder Press', 3, 8, 10], ['Lateral Raise', 4, 12, 15], ['Rear Delt Fly', 3, 12, 15], ['Shrugs', 3, 10, 12]] },
  { name: 'Arm Day', day: 4, items: [['Barbell Curl', 3, 8, 10], ['Close-Grip Bench Press', 3, 8, 10], ['Hammer Curl', 3, 10, 12], ['Tricep Pushdown', 3, 10, 12], ['Hanging Leg Raise', 3, 10, 15]] },
];

function freshState() {
  const ex = LIB.map(([n, m, q]) => ({ id: slug(n), n, m, q }));
  const routines = ROUTINES.map(r => ({ id: 'r-' + slug(r.name), name: r.name, items: r.items.map(([n, s, lo, hi]) => ({ ex: slug(n), s, lo, hi })) }));
  const sched = Array(7).fill(null);
  ROUTINES.forEach((r, i) => { sched[r.day] = routines[i].id; });
  return { v: 3, unit: 'kg', rest: 90, inc: { kg: 2.5, lbs: 5 }, rpe: false, sound: true, vib: true, ex, routines, sched, sessions: [], bw: [], goals: {}, bwGoal: null, active: null, seen: false };
}

/* storage: localStorage with an in-memory fallback */
let mem = {}, storeOK = true;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { storeOK = false; return mem[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { storeOK = false; mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
};
let S, dirty = true, saveT = 0;
function load() {
  const raw = store.get(KEY);
  if (raw) { try { S = Object.assign(freshState(), JSON.parse(raw)); return; } catch (e) { console.warn('Bad saved data', e); } }
  S = freshState();
}
function save() { dirty = true; clearTimeout(saveT); saveT = 0; store.set(KEY, JSON.stringify(S)); }
function saveSoon() { dirty = true; clearTimeout(saveT); saveT = setTimeout(save, 350); }

/* units & formatting (weights are stored in kg) */
const U = () => S.unit;
const toD = kg => (S.unit === 'lbs' ? kg * LB : kg);
const toKg = v => (S.unit === 'lbs' ? v / LB : v);
const r1 = n => Math.round(n * 10) / 10;
const fw = kg => String(r1(toD(kg || 0)));
const fnum = n => Math.round(n).toLocaleString('en-GB');
const fk = n => (Math.abs(n) >= 10000 ? (n / 1000).toFixed(Math.abs(n) >= 100000 ? 0 : 1) + 'k' : fnum(n));
const incKg = () => toKg(S.inc[S.unit] || (S.unit === 'kg' ? 2.5 : 5));
const pnum = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const e1 = (w, r) => (!(w > 0) || !(r > 0) ? 0 : r === 1 ? w : w * (1 + r / 30));
const rr = it => (it.lo === it.hi ? `${it.lo}` : `${it.lo}–${it.hi}`);
const setTxt = t => (t.w > 0 ? `${fw(t.w)}×${t.r}` : `${t.r} reps`);

/* dates */
const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const dow = d => (d.getDay() + 6) % 7;
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
const monday = s => addDays(s, -dow(pd(s)));
const fdate = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => pd(s).toLocaleDateString('en-GB', o);
const dur = ms => { const m = Math.max(1, Math.round(ms / 6e4)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
const clock = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

/* exercises */
const EX = id => S.ex.find(e => e.id === id) || { id, n: id, m: 'Other', q: 'Other' };
function exByName(name) {
  const n = String(name).trim(), low = n.toLowerCase();
  const target = (ALIAS[low] || n).toLowerCase();
  return S.ex.find(e => e.n.toLowerCase() === target) || S.ex.find(e => e.n.toLowerCase() === low);
}
function addExercise(n, m = 'Other', q = 'Other') {
  const found = exByName(n); if (found) { found.hide = false; return found; }
  let id = slug(n) || uid('ex'); if (S.ex.some(e => e.id === id)) id = uid(id);
  n = n.trim(); if (n === n.toLowerCase()) n = n.replace(/(^|[\s-])\S/g, c => c.toUpperCase());
  const e = { id, n, m: MUSCLES.includes(m) ? m : 'Other', q, c: true }; S.ex.push(e); return e;
}

/* stats: per-exercise bests and the PRs each session set (cached until data changes) */
const cmpS = (a, b) => a.date.localeCompare(b.date) || (a.start || 0) - (b.start || 0);
function entryBest(e) {
  const b = { e1: 0, w: 0, r: 0, rw: 0, vol: 0, n: 0, top: null };
  for (const t of e.sets) {
    if (!t.done) continue; b.n++;
    const v = e1(t.w, t.r); if (v > b.e1) b.e1 = v;
    if ((t.w || 0) > b.w || (b.top && (t.w || 0) === b.w && t.r > b.top.r)) { b.w = t.w || 0; b.top = t; }
    if (!b.top) b.top = t;
    if (!(t.w > 0)) b.rw = Math.max(b.rw, t.r || 0);
    b.r = Math.max(b.r, t.r || 0); b.vol += (t.w || 0) * (t.r || 0);
  }
  return b;
}
let ST = null;
function stats() {
  if (!dirty && ST) return ST;
  const ss = [...S.sessions].sort(cmpS), best = {}, prs = {};
  for (const s of ss) {
    const list = [];
    for (const e of s.ex) {
      const x = entryBest(e); if (!x.n) continue;
      const b = best[e.ex];
      if (b) {
        if (x.e1 > b.e1 + 1e-6) list.push({ ex: e.ex, t: 'e1', v: x.e1, set: x.top });
        else if (x.w > b.w + 1e-6) list.push({ ex: e.ex, t: 'w', v: x.w, set: x.top });
        else if (x.w === 0 && x.rw > b.rw) list.push({ ex: e.ex, t: 'r', v: x.rw });
        b.e1 = Math.max(b.e1, x.e1); b.w = Math.max(b.w, x.w); b.rw = Math.max(b.rw, x.rw); b.n += 1; b.last = s.date;
      } else best[e.ex] = { e1: x.e1, w: x.w, rw: x.rw, n: 1, first: s.date, last: s.date };
    }
    prs[s.id] = list;
  }
  ST = { ss, best, prs }; dirty = false; return ST;
}
const prText = p => (p.t === 'e1' ? `est. 1RM ${fw(p.v)} ${U()}` : p.t === 'w' ? `heaviest ${fw(p.v)} ${U()}` : `${p.v} reps`);
function sessVol(s) { let v = 0, n = 0; for (const e of s.ex) for (const t of e.sets) if (t.done) { v += (t.w || 0) * (t.r || 0); n++; } return { v, n }; }
function bestExcluding(exId, excl) {
  const b = { e1: 0, w: 0, rw: 0, has: false };
  for (const s of S.sessions) {
    if (s.id === excl) continue;
    for (const e of s.ex) if (e.ex === exId) { const x = entryBest(e); if (!x.n) continue; b.has = true; b.e1 = Math.max(b.e1, x.e1); b.w = Math.max(b.w, x.w); b.rw = Math.max(b.rw, x.rw); }
  }
  return b;
}
function lastPerf(exId, excl) {
  const ss = stats().ss;
  for (let i = ss.length - 1; i >= 0; i--) {
    const s = ss[i]; if (s.id === excl) continue;
    for (const e of s.ex) if (e.ex === exId) { const sets = e.sets.filter(t => t.done); if (sets.length) return { date: s.date, sets }; }
  }
  return null;
}
/* progressive overload: hit the top of the rep range on every set -> add one increment */
function suggestion(exId, item, excl) {
  const lp = lastPerf(exId, excl); if (!lp) return { lp: null, up: false, sets: [] };
  const top = Math.max(...lp.sets.map(t => t.w || 0));
  const up = !!(item && item.hi && top > 0 && lp.sets.length >= item.s && lp.sets.every(t => t.r >= item.hi));
  const sets = lp.sets.map(t => (up ? { w: top + incKg(), r: item.lo } : { w: t.w || 0, r: t.r }));
  return { lp, up, top, sets };
}
