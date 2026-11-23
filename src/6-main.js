/* ===== routing, actions, events, start-up ===== */
const VIEWS = ['today', 'history', 'progress', 'plan'];
function route() {
  const h = (location.hash || '').slice(1);
  if (h === 'workout') {
    if (!S.active) { go(lastView, true); return; }
    if (!$('#v-' + view).classList.contains('on')) renderView();
    openWO(); return;
  }
  closeWO();
  view = VIEWS.includes(h) ? h : 'today'; lastView = view;
  renderView(); window.scrollTo(0, 0);
}
function go(v, replace) {
  const h = '#' + v;
  if (location.hash === h) { route(); return; }
  try { if (replace) location.replace(h); else location.hash = h; } catch (e) { route(); }
}
function logBW(date, val) {
  const v = pnum(val);
  if (!(v > 0)) { toast('Type your weight first'); return; }
  const kg = toKg(v); if (kg < 25 || kg > 350) { toast(`${v} ${U()} looks off — check the number`); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) date = iso();
  S.bw = S.bw.filter(x => x.d !== date); S.bw.push({ d: date, kg }); S.bw.sort((a, b) => a.d.localeCompare(b.d));
  save(); renderView(); toast(`Logged ${r1(v)} ${U()} for ${date === iso() ? 'today' : fdate(date)}`);
}
const curSheetOpt = () => (stack.at(-1) || { o: {} }).o;

const ACT = {
  settings: () => openSettings(),
  close: () => closeSheets(1),
  'confirm-ok': () => closeSheets(1, curSheetOpt().ok),
  'hide-banner': () => { hideBanner = true; renderView(); },
  start: b => startWorkout(b.dataset.id || null),
  resume: () => go('workout'),
  'resume-close': () => closeSheets(1, () => go('workout')),
  'bw-log': () => logBW(iso(), $('#bw-in').value),
  'bw-log2': () => logBW($('#bw-date').value, $('#bw-in2').value),
  'bw-del': b => { S.bw = S.bw.filter(x => x.d !== b.dataset.d); save(); renderView(); toast('Weigh-in deleted'); },
  'bwg-save': () => { const v = pnum($('#bwg-in').value); S.bwGoal = v > 0 ? toKg(v) : null; save(); renderView(); toast(v > 0 ? 'Body-weight goal set' : 'Goal cleared'); },
  'goal-save': () => { const v = pnum($('#goal-in').value); if (v > 0) S.goals[pEx] = toKg(v); else delete S.goals[pEx]; save(); renderView(); toast(v > 0 ? 'Goal saved' : 'Goal cleared'); },
  cal: b => { const [y, m] = calMonth.split('-').map(Number); calMonth = iso(new Date(y, m - 1 + Number(b.dataset.d), 1)).slice(0, 7); renderView(); },
  day: b => {
    const ss = S.sessions.filter(s => s.date === b.dataset.d);
    if (ss.length === 1) sessionSheet(ss[0].id);
    else sheet(`<h2>${fdate(b.dataset.d, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><div class="list">${ss.map(s => `<button class="li" data-act="sess-swap" data-id="${s.id}"><span class="t">${esc(s.name)}</span><span class="r">${ic('chev-r', 's')}</span></button>`).join('')}</div>`);
  },
  'sess-swap': b => closeSheets(1, () => sessionSheet(b.dataset.id)),
  sess: b => sessionSheet(b.dataset.id),
  'sess-edit': b => closeSheets(1, () => editSession(b.dataset.id)),
  'sess-repeat': b => closeSheets(1, () => repeatSession(b.dataset.id)),
  'sess-del': b => { const id = b.dataset.id; confirmDlg('Delete this workout?', 'It disappears from your history and progress charts. This cannot be undone unless you have a backup.', 'Delete', () => { S.sessions = S.sessions.filter(s => s.id !== id); save(); closeSheets(stack.length, () => { renderView(); toast('Workout deleted'); }); }); },
  ptab: b => { pTab = b.dataset.v; renderView(); },
  range: b => { pRange = b.dataset.v; renderView(); },
  sched: b => schedSheet(+b.dataset.d),
  'sched-set': b => { S.sched[+b.dataset.d] = b.dataset.id || null; save(); closeSheets(1, () => renderView()); },
  'rt-edit': b => rtEdit(b.dataset.id),
  'rt-new': () => rtEdit(null),
  'rd-day': b => { const d = +b.dataset.d; RD.days = RD.days.includes(d) ? RD.days.filter(x => x !== d) : [...RD.days, d]; setSheet(rtHTML()); },
  'rd-mv': b => { const k = +b.dataset.k, j = k + +b.dataset.d; if (j < 0 || j >= RD.items.length) return; [RD.items[k], RD.items[j]] = [RD.items[j], RD.items[k]]; setSheet(rtHTML()); },
  'rd-rm': b => { RD.items.splice(+b.dataset.k, 1); setSheet(rtHTML()); },
  'rd-add': () => picker(id => { RD.items.push({ ex: id, s: 3, lo: 8, hi: 12 }); setSheet(rtHTML()); }),
  'rd-save': saveRoutine,
  'rd-del': () => { const id = RD.id, name = RD.name; confirmDlg(`Delete “${name || 'this routine'}”?`, 'Workouts you already logged stay in your history.', 'Delete', () => { S.routines = S.routines.filter(r => r.id !== id); S.sched = S.sched.map(x => (x === id ? null : x)); save(); closeSheets(stack.length, () => { renderView(); toast('Routine deleted'); }); }); },
  lib: () => picker(id => exEditSheet(id), 'Exercise library'),
  'ex-save': b => { const x = EX(b.dataset.id), n = $('#xe-n').value.trim(); if (!n) { toast('Give it a name'); return; } x.n = n; x.m = $('#xe-m').value; x.q = $('#xe-q').value; save(); closeSheets(1, () => { renderView(); toast('Exercise updated'); }); },
  'ex-hide': b => { const x = EX(b.dataset.id); x.hide = true; S.routines.forEach(r => { r.items = r.items.filter(it => it.ex !== x.id); }); save(); closeSheets(1, () => { renderView(); toast(`Removed “${x.n}”`); }); },
  // workout
  'wo-min': () => go(lastView, true),
  'wo-finish': () => sheet(finishHTML()),
  'wo-save': saveWorkout,
  'wo-discard': () => confirmDlg(S.active && S.active.editing ? 'Discard your changes?' : 'Discard this workout?', S.active && S.active.editing ? 'The saved version stays as it was.' : 'Every set you logged in this session will be lost.', 'Discard', discardWorkout),
  'tick-all': () => { for (const e of S.active.ex) e.sets.forEach((t, j) => { if (!t.done && (t.w != null || t.r != null)) fillSet(e, j); }); save(); renderWO(); setSheet(finishHTML()); },
  tick: b => { const row = b.closest('.row'); tick(+row.dataset.i, +row.dataset.j); },
  'set-add': b => { const i = +b.dataset.i; S.active.ex[i].sets.push({ w: null, r: null, rpe: null, done: false }); save(); renderCard(i); woClock(); },
  'set-del': b => { const i = +b.dataset.i; S.active.ex[i].sets.pop(); save(); renderCard(i); woClock(); },
  'wo-addex': () => picker(addToWorkout),
  'ex-menu': b => exMenu(+b.dataset.i),
  'exm-note': b => { const i = +b.dataset.i; closeSheets(1, () => sheet(`<h2>Note</h2><textarea id="note-in" class="in" maxlength="200" placeholder="Seat height 4, grip width, how it felt…">${esc(S.active.ex[i].note)}</textarea><div class="btns"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="note-save" data-i="${i}">Save note</button></div>`)); },
  'note-save': b => { const i = +b.dataset.i; S.active.ex[i].note = $('#note-in').value.trim(); save(); closeSheets(1, () => renderCard(i)); },
  'exm-swap': b => { const i = +b.dataset.i; closeSheets(1, () => picker(id => { const e = S.active.ex[i]; e.ex = id; e.sets.forEach(t => { t.pr = false; }); save(); renderWO(); }, 'Replace with')); },
  'exm-mv': b => { const i = +b.dataset.i, j = i + +b.dataset.d, L = S.active.ex; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; save(); closeSheets(1, renderWO); },
  'exm-prog': b => { pEx = b.dataset.id; pTab = 'strength'; closeSheets(1, () => go('progress', true)); },
  'exm-rm': b => { const i = +b.dataset.i, e = S.active.ex[i]; const rm = () => { S.active.ex.splice(i, 1); save(); renderWO(); }; if (e.sets.some(t => t.done)) closeSheets(1, () => confirmDlg(`Remove ${EX(e.ex).n}?`, 'Its ticked sets will be dropped from this workout.', 'Remove', rm)); else closeSheets(1, rm); },
  'rest-start': b => startRest(+b.dataset.s),
  'rest-adj': b => { if (!R.end) return; R.end += +b.dataset.d * 1000; R.total = Math.max(R.total + +b.dataset.d, 1); if (S.active) S.active.rest = { end: R.end, total: R.total }; saveSoon(); renderRest(); },
  'rest-skip': () => stopRest(''),
  // settings
  'set-unit': b => { const v = b.dataset.v; if (S.unit === v) return; S.unit = v; save(); refreshSettings(); renderView(); if (woOpen()) renderWO(); toast(`Showing weights in ${v}`); },
  'set-tog': b => { const k = b.dataset.k; S[k] = !S[k]; save(); refreshSettings(); if (woOpen()) renderWO(); },
  install: () => { if (!dip) return; dip.prompt(); dip.userChoice.finally(() => { dip = null; refreshSettings(); }); },
  'exp-json': async () => { const r = await download(`ironlog-backup-${iso()}.json`, backupText(), 'application/json'); if (r === 'saved') toast('Backup saved'); else if (r === 'fail') toast('Saving files is blocked here — use Copy backup instead'); },
  'copy-json': () => { navigator.clipboard.writeText(backupText()).then(() => toast('Backup copied — paste it into a note or email to yourself'), () => toast('Copy was blocked here')); },
  'exp-csv': async () => { if (!S.sessions.length) { toast('No workouts to export yet'); return; } const r = await download(`ironlog-${U()}-${iso()}.csv`, csvText(), 'text/csv'); if (r === 'saved') toast('CSV saved — opens in Excel or Google Sheets'); else if (r === 'fail') toast('Saving files is blocked here'); },
  'imp-paste': () => sheet(`<h2>Paste to import</h2><p class="sub">Paste an IronLog backup (starts with “{”) or a CSV with Date, Exercise, Reps and Weight columns — including exports from the old IronLog.</p><textarea id="imp-txt" class="in" style="min-height:160px" placeholder="Paste here"></textarea><div class="btns"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="imp-go">Import</button></div>`),
  'imp-go': () => importText($('#imp-txt').value),
  'demo-add': () => { addDemo(); save(); closeSheets(stack.length, () => { route(); toast('Demo data loaded — remove it any time in Settings'); }); },
  'demo-rm': () => { S.sessions = S.sessions.filter(s => !s.demo); S.bw = S.bw.filter(b => !b.demo); save(); closeSheets(stack.length, () => { route(); toast('Demo data removed'); }); },
  erase: () => confirmDlg('Erase everything?', 'All workouts, weigh-ins, routines and settings on this device will be deleted. Save a backup first if you might want them back.', 'Erase', () => { S = freshState(); S.seen = true; R.end = 0; save(); closeSheets(stack.length, () => { go('today', true); toast('Everything erased'); }); }),
  'w-fresh': () => { S.seen = true; save(); closeSheets(1); },
  'w-demo': () => { S.seen = true; addDemo(); save(); closeSheets(stack.length, () => { route(); toast('Demo data loaded — remove it any time in Settings'); }); },
  'w-legacy': () => { S.seen = true; const res = importLegacyStore(); save(); closeSheets(stack.length, () => { route(); toast(res ? `Imported ${res.sets} sets from ${res.sessions} workout${res.sessions > 1 ? 's' : ''}` : 'Nothing new to import'); }); },
};

function bind() {
  document.addEventListener('click', ev => {
    const tab = ev.target.closest('[data-tab]'); if (tab) { go(tab.dataset.tab); return; }
    const b = ev.target.closest('[data-act]'); if (!b || b.disabled) return;
    const f = ACT[b.dataset.act]; if (f) { ev.preventDefault(); f(b, ev); }
  });
  document.addEventListener('input', ev => {
    const t = ev.target;
    if (t.matches('#wo-list .numi')) {
      const row = t.closest('.row'), set = S.active.ex[+row.dataset.i].sets[+row.dataset.j], v = pnum(t.value), f = t.dataset.f;
      set[f] = v == null ? null : f === 'w' ? toKg(v) : f === 'r' ? Math.round(v) : Math.min(10, v);
      saveSoon(); return;
    }
    if (t.id === 'wo-name') { S.active.name = t.value; saveSoon(); return; }
    if (t.dataset.rd === 'name') { RD.name = t.value; return; }
    if (t.dataset.rdi) { RD.items[+t.dataset.k][t.dataset.rdi] = parseInt(t.value, 10) || 0; }
  });
  document.addEventListener('change', ev => {
    const t = ev.target;
    if (t.id === 'imp-file' && t.files && t.files[0]) { t.files[0].text().then(importText, () => toast('Could not read that file')); t.value = ''; return; }
    const c = t.dataset.chg;
    if (c === 'pex') { pEx = t.value; renderView(); }
    if (c === 'set-rest') { S.rest = +t.value; save(); }
    if (c === 'set-inc') { S.inc[S.unit] = +t.value; save(); if (woOpen()) renderWO(); }
  });
  document.addEventListener('focusin', ev => { if (ev.target.matches('.numi')) setTimeout(() => { try { ev.target.select(); } catch (e) { } }, 0); });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return; const t = ev.target;
    if (t.matches('#wo-list .numi')) {
      ev.preventDefault(); const row = t.closest('.row');
      const next = t.dataset.f === 'w' ? row.querySelector('[data-f="r"]') : t.dataset.f === 'r' && S.rpe ? row.querySelector('[data-f="rpe"]') : null;
      if (next) next.focus(); else if (!S.active.ex[+row.dataset.i].sets[+row.dataset.j].done) tick(+row.dataset.i, +row.dataset.j); else t.blur();
    }
    if (t.id === 'bw-in') ACT['bw-log']();
    if (t.id === 'bw-in2') ACT['bw-log2']();
    if (t.id === 'wo-name') t.blur();
  });
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && woOpen()) { lockScreen(); renderRest(); woClock(); } if (!document.hidden && !woOpen() && view === 'today') renderView(); });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; refreshSettings(); });
  window.addEventListener('appinstalled', () => { dip = null; toast('IronLog installed'); });
  setInterval(() => { if (woOpen()) woClock(); }, 1000);
}

function init() {
  load();
  if (!S.seen && !S.sessions.length) { /* first run */ }
  bind();
  if (S.active && S.active.rest && S.active.rest.end > Date.now()) { R.end = S.active.rest.end; R.total = S.active.rest.total; loopRest(); }
  route();
  if (!S.seen) welcome();
  if ('serviceWorker' in navigator && !framed && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
}
init();
