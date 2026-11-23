/* ===== bottom sheets (Android back button closes them) ===== */
const stack = [];
const SHEET_TOP = `<div class="grab"></div><button class="ib x" data-act="close" aria-label="Close">${ic('x')}</button>`;
let popWait = null, popTimer = 0;
function sheet(html, o = {}) {
  const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.act = 'close';
  const el = document.createElement('div'); el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = SHEET_TOP + html;
  $('#layer').append(scrim, el);
  let p = false; try { history.pushState({ sheet: stack.length + 1 }, ''); p = true; } catch (e) { }
  stack.push({ el, scrim, p, o }); syncLock();
  const h = el.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  return el;
}
function setSheet(html) { const t = stack.at(-1); if (!t) return; const sc = t.el.scrollTop; t.el.innerHTML = SHEET_TOP + html; t.el.scrollTop = sc; }
function popDom() { const t = stack.pop(); if (!t) return null; t.el.remove(); t.scrim.remove(); syncLock(); if (t.o.onClose) t.o.onClose(); return t; }
function closeSheets(n = 1, then) {
  let back = 0; while (n-- > 0 && stack.length) { if (popDom().p) back++; }
  if (!back) { then && then(); return; }
  const prev = popWait; popWait = { then: () => { prev && prev.then(); then && then(); } };
  clearTimeout(popTimer); popTimer = setTimeout(() => { if (popWait) { const f = popWait.then; popWait = null; f(); } }, 450);
  history.go(-back);
}
window.addEventListener('popstate', () => {
  if (popWait) { clearTimeout(popTimer); const f = popWait.then; popWait = null; f(); return; }
  if (stack.length) popDom();
});
function confirmDlg(title, msg, ok, fn, danger = true) {
  sheet(`<h2>${esc(title)}</h2><p class="sub">${esc(msg)}</p><div class="btns"><button class="btn" data-act="close">Cancel</button><button class="btn ${danger ? 'pri' : 'blue'}" data-act="confirm-ok">${esc(ok)}</button></div>`, { ok: fn });
}
function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.setAttribute('role', 'status');
  t.innerHTML = (kind === 'pr' ? ic('trophy') : '') + `<span>${esc(msg)}</span>`; $('#toasts').append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, kind === 'pr' ? 3600 : 2600);
}

/* exercise picker (search, filter, create) */
function picker(onPick, title = 'Add exercise') {
  let q = '', mf = 'All';
  const el = sheet(`<h2>${esc(title)}</h2><input class="in" id="pk-q" placeholder="Search, or type a new exercise" autocomplete="off" aria-label="Search exercises">
    <div class="chips scroll" style="margin-top:10px">${['All', ...MUSCLES].map(m => `<button class="chip ${m === 'All' ? 'on' : ''}" data-pm="${m}">${m}</button>`).join('')}</div><div class="plist" id="pk-list"></div>`);
  const list = $('#pk-list', el);
  const draw = () => {
    const ql = q.trim().toLowerCase();
    const items = S.ex.filter(e => !e.hide && (mf === 'All' || e.m === mf) && (!ql || e.n.toLowerCase().includes(ql))).sort((a, b) => MUSCLES.indexOf(a.m) - MUSCLES.indexOf(b.m) || a.n.localeCompare(b.n));
    let h = '';
    if (ql && !S.ex.some(e => !e.hide && e.n.toLowerCase() === ql)) h += `<button class="li" data-pnew="1">${ic('plus')}<div><div class="t">Create “${esc(q.trim())}”</div><div class="sub">Add it to your library</div></div></button>`;
    let g = '';
    for (const e of items) { if (e.m !== g) { g = e.m; h += `<div class="grp">${g}</div>`; } h += `<button class="li" data-pick="${e.id}"><span class="dot" style="--c:${MCOL[e.m]}"></span><div><div class="t">${esc(e.n)}</div><div class="sub">${esc(e.q)}${e.c ? ' · yours' : ''}</div></div></button>`; }
    if (!items.length && !ql) h += '<div class="empty">No exercises in this group yet.</div>';
    list.innerHTML = h;
  };
  $('#pk-q', el).addEventListener('input', ev => { q = ev.target.value; draw(); });
  el.addEventListener('click', ev => {
    const c = ev.target.closest('[data-pm]'); if (c) { mf = c.dataset.pm; $$('[data-pm]', el).forEach(b => b.classList.toggle('on', b === c)); draw(); return; }
    const p = ev.target.closest('[data-pick]'); if (p) { const id = p.dataset.pick; closeSheets(1, () => onPick(id)); return; }
    if (ev.target.closest('[data-pnew]')) {
      list.innerHTML = `<div class="card" style="margin-top:12px"><h3>New exercise</h3><label class="f" for="nx-n">Name</label><input id="nx-n" class="in" value="${esc(q.trim())}" maxlength="60">
        <label class="f" for="nx-m">Muscle group</label><select id="nx-m" class="in">${MUSCLES.map(m => `<option ${m === (mf === 'All' ? 'Chest' : mf) ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <label class="f" for="nx-q">Equipment</label><select id="nx-q" class="in">${EQUIP.map(m => `<option>${m}</option>`).join('')}</select>
        <button class="btn pri wide" style="margin-top:14px" data-pcreate="1">Create and add</button></div>`;
      return;
    }
    if (ev.target.closest('[data-pcreate]')) {
      const n = $('#nx-n', el).value.trim(); if (!n) { toast('Give it a name'); return; }
      const x = addExercise(n, $('#nx-m', el).value, $('#nx-q', el).value); save();
      closeSheets(1, () => { onPick(x.id); toast(`Added “${x.n}” to your library`); });
    }
  });
  draw();
}

/* routine editor */
let RD = null;
function rtEdit(id) {
  const r = id ? routineById(id) : null;
  RD = r ? clone(r) : { id: uid('r'), name: '', items: [] };
  RD.days = DOW.map((_, i) => i).filter(i => S.sched[i] === RD.id); RD.isNew = !r;
  sheet(rtHTML());
}
function rtHTML() {
  return `<h2>${RD.isNew ? 'New routine' : 'Edit routine'}</h2>
    <label class="f" for="rd-name">Name</label><input id="rd-name" class="in" data-rd="name" value="${esc(RD.name)}" placeholder="e.g. Chest Day" maxlength="40">
    <label class="f">Train it on</label><div class="daychips">${DOW.map((d, i) => `<button class="chip ${RD.days.includes(i) ? 'on' : ''}" data-act="rd-day" data-d="${i}" aria-pressed="${RD.days.includes(i)}" aria-label="${d}">${d.slice(0, 2)}</button>`).join('')}</div>
    <label class="f">Exercises</label>
    ${RD.items.length ? RD.items.map((it, k) => `<div class="item"><div class="nm">${esc(EX(it.ex).n)}</div>
      <div class="mv"><button class="ib" data-act="rd-mv" data-k="${k}" data-d="-1" ${k ? '' : 'disabled'} aria-label="Move up">${ic('up', 's')}</button><button class="ib" data-act="rd-mv" data-k="${k}" data-d="1" ${k < RD.items.length - 1 ? '' : 'disabled'} aria-label="Move down">${ic('down', 's')}</button><button class="ib" data-act="rd-rm" data-k="${k}" aria-label="Remove ${esc(EX(it.ex).n)}">${ic('x', 's')}</button></div>
      <div class="cfg"><input class="in num-f" inputmode="numeric" data-rdi="s" data-k="${k}" value="${it.s}" aria-label="Sets"> sets of <input class="in num-f" inputmode="numeric" data-rdi="lo" data-k="${k}" value="${it.lo}" aria-label="Minimum reps"> to <input class="in num-f" inputmode="numeric" data-rdi="hi" data-k="${k}" value="${it.hi}" aria-label="Maximum reps"> reps</div></div>`).join('') : '<div class="sub">No exercises yet.</div>'}
    <button class="btn wide" style="margin-top:12px" data-act="rd-add">${ic('plus', 's')} Add exercise</button>
    <div class="btns"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="rd-save">Save routine</button></div>
    ${RD.isNew ? '' : `<button class="btn wide ghost danger" style="margin-top:8px" data-act="rd-del">${ic('trash', 's')} Delete routine</button>`}`;
}
function saveRoutine() {
  const r = { id: RD.id, name: RD.name.trim() || 'My routine', items: RD.items.map(it => { const s = Math.min(20, Math.max(1, it.s | 0 || 3)); let lo = Math.max(1, it.lo | 0 || 8), hi = Math.max(1, it.hi | 0 || lo); if (lo > hi) [lo, hi] = [hi, lo]; return { ex: it.ex, s, lo, hi }; }) };
  const k = S.routines.findIndex(x => x.id === r.id); if (k >= 0) S.routines[k] = r; else S.routines.push(r);
  DOW.forEach((_, i) => { if (RD.days.includes(i)) S.sched[i] = r.id; else if (S.sched[i] === r.id) S.sched[i] = null; });
  save(); closeSheets(1, () => { renderView(); toast(`Saved “${r.name}”`); });
}
function schedSheet(d) {
  sheet(`<h2>${DOW[d]}</h2><div class="list">${S.routines.map(r => `<button class="li" data-act="sched-set" data-d="${d}" data-id="${r.id}"><div><div class="t">${esc(r.name)}</div><div class="sub">${r.items.length} exercises</div></div><span class="r">${S.sched[d] === r.id ? ic('check') : ''}</span></button>`).join('')}
    <button class="li" data-act="sched-set" data-d="${d}" data-id=""><div class="t">Rest day</div><span class="r">${routineById(S.sched[d]) ? '' : ic('check')}</span></button></div>
    <button class="btn wide" style="margin-top:12px" data-act="rt-new">${ic('plus', 's')} New routine</button>`);
}
function exEditSheet(id) {
  const x = EX(id);
  sheet(`<h2>Edit exercise</h2><label class="f" for="xe-n">Name</label><input id="xe-n" class="in" value="${esc(x.n)}" maxlength="60">
    <label class="f" for="xe-m">Muscle group</label><select id="xe-m" class="in">${MUSCLES.map(m => `<option ${m === x.m ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <label class="f" for="xe-q">Equipment</label><select id="xe-q" class="in">${EQUIP.map(m => `<option ${m === x.q ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <div class="btns"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="ex-save" data-id="${esc(id)}">Save</button></div>
    <button class="btn wide ghost danger" style="margin-top:8px" data-act="ex-hide" data-id="${esc(id)}">${ic('trash', 's')} Remove from library</button>
    <p class="sub">Removing hides it from lists; workouts you already logged keep it.</p>`);
}

/* settings, backup & import */
function settingsHTML() {
  const L = legacyData(), hasDemo = S.sessions.some(s => s.demo) || S.bw.some(b => b.demo);
  const standalone = matchMedia('(display-mode: standalone)').matches;
  const tog = (k, label, sub) => `<div class="setg"><div><div class="t">${label}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div><button class="sw ${S[k] ? 'on' : ''}" data-act="set-tog" data-k="${k}" role="switch" aria-checked="${!!S[k]}" aria-label="${label}"></button></div>`;
  return `<h2>Settings</h2>
    <div class="setg"><div class="t">Units</div><div class="seg">${['kg', 'lbs'].map(u => `<button data-act="set-unit" data-v="${u}" class="${S.unit === u ? 'on' : ''}" style="padding:0 18px">${u}</button>`).join('')}</div></div>
    <div class="setg"><div><div class="t">Default rest</div><div class="sub">Starts when you tick a set</div></div><select class="in" data-chg="set-rest" style="width:auto" aria-label="Default rest">${[45, 60, 90, 120, 150, 180, 240, 300].map(s => `<option value="${s}" ${S.rest === s ? 'selected' : ''}>${clock(s)}</option>`).join('')}</select></div>
    <div class="setg"><div><div class="t">Weight jump</div><div class="sub">For “go up” suggestions</div></div><select class="in" data-chg="set-inc" style="width:auto" aria-label="Weight jump">${(S.unit === 'kg' ? [1, 1.25, 2.5, 5] : [2.5, 5, 10]).map(v => `<option value="${v}" ${S.inc[S.unit] == v ? 'selected' : ''}>${v} ${U()}</option>`).join('')}</select></div>
    ${tog('rpe', 'Track RPE', 'Adds an effort column (1–10) to every set')}${tog('sound', 'Rest timer sound')}${tog('vib', 'Vibration')}
    <div class="sec">Install on your phone</div>
    ${standalone ? `<p class="sub">${ic('check', 's')} Installed — IronLog runs offline from your home screen.</p>` : dip ? `<button class="btn wide blue" data-act="install">${ic('download', 's')} Install IronLog</button>` : `<p class="sub">Open IronLog's own web address in Chrome on Android, then tap ⋮ → <b>Install app</b> (or <b>Add to Home screen</b>). It then works offline like a normal app.</p>`}
    <div class="sec">Your data</div>
    <p class="sub">${storeOK ? (framed ? 'Saved in this browser only. Back up regularly — a backup file is the safest copy.' : 'Saved on this phone, works offline. Back up now and then in case you change phones.') : 'Storage is blocked here, so data only lasts until this page closes. Back up before leaving.'}</p>
    <div class="btns"><button class="btn" data-act="exp-json">${ic('download', 's')} Save backup</button><button class="btn" data-act="copy-json">${ic('copy', 's')} Copy backup</button></div>
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="exp-csv">${ic('download', 's')} Export CSV</button><label class="btn" style="flex:1">${ic('upload', 's')} Import file<input type="file" id="imp-file" accept=".json,.csv,application/json,text/csv" hidden></label></div>
    <button class="btn wide ghost" style="margin-top:4px" data-act="imp-paste">Paste a backup or CSV instead</button>
    ${L ? `<button class="btn wide" style="margin-top:8px" data-act="w-legacy">Bring over ${L.ws.length} sets from the old IronLog</button>` : ''}
    <div class="sec">Demo &amp; reset</div>
    ${hasDemo ? `<button class="btn wide" data-act="demo-rm">Remove demo data</button>` : `<button class="btn wide" data-act="demo-add">Load 5 weeks of demo data</button>`}
    <button class="btn wide ghost danger" style="margin-top:8px" data-act="erase">${ic('trash', 's')} Erase everything</button>
    <p class="sub" style="margin-top:16px">IronLog 3 · Estimated 1RM uses the Epley formula: weight × (1 + reps ÷ 30). PRs count from your second session of an exercise.</p>`;
}
const openSettings = () => sheet(settingsHTML(), { settings: true });
const refreshSettings = () => { if (stack.at(-1) && stack.at(-1).o.settings) setSheet(settingsHTML()); };

/* returns 'saved' | 'declined' | 'fail'. Inside the Claude preview, files go through the viewer's save prompt. */
async function download(name, text, type) {
  if (framed) {
    try { const d = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (!d) return 'fail'; await d.save({ filename: name, data: text }); return 'saved'; }
    catch (e) { return e && e.code === 'declined' ? 'declined' : 'fail'; }
  }
  try { const b = new Blob([text], { type }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); return 'saved'; } catch (e) { return 'fail'; }
}
const backupText = () => JSON.stringify({ ...S, exported: new Date().toISOString() });
function csvText() {
  const q = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['Date', 'Workout', 'Exercise', 'Muscle Group', 'Set #', 'Reps', `Weight (${U()})`, `Est. 1RM (${U()})`, 'RPE', 'Notes']];
  for (const s of [...S.sessions].sort(cmpS)) for (const e of s.ex) e.sets.forEach((t, j) => rows.push([s.date, s.name, EX(e.ex).n, EX(e.ex).m, j + 1, t.r, r1(toD(t.w || 0)), r1(toD(e1(t.w, t.r))), t.rpe ?? '', j === 0 ? e.note : '']));
  return '\uFEFF' + rows.map(r => r.map(q).join(',')).join('\r\n');
}
function parseCSV(t) {
  t = t.replace(/^\uFEFF/, ''); const rows = []; let row = [], f = '', q = false;
  const hdr = t.split(/\r?\n/, 1)[0], sep = hdr.split(';').length > hdr.split(',').length ? ';' : ',';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const normM = m => MUSCLES.find(x => x.toLowerCase() === String(m || '').trim().toLowerCase()) || 'Other';
function importRows(rows) {
  const groups = new Map();
  for (const r of rows) { const k = r.date + '|' + (r.split || 'Workout'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  let sessions = 0, sets = 0;
  for (const rs of groups.values()) {
    const date = rs[0].date, name = rs[0].split || 'Workout';
    if (S.sessions.some(s => s.date === date && s.name === name)) continue;
    const s = { id: uid('s'), name, routine: (S.routines.find(r => r.name.toLowerCase() === name.toLowerCase()) || {}).id || null, date, start: pd(date).getTime() + 18 * 36e5, end: null, ex: [] };
    for (const r of rs) {
      const x = exByName(r.exercise) || addExercise(r.exercise, normM(r.muscle));
      let e = s.ex.find(z => z.ex === x.id); if (!e) { e = { ex: x.id, note: '', sets: [] }; s.ex.push(e); }
      e.sets.push({ w: r.kg || 0, r: r.reps, rpe: r.rpe || null, done: true, _n: r.set || 0 });
      if (r.notes && !e.note.includes(r.notes)) e.note = (e.note ? e.note + '; ' : '') + r.notes;
      sets++;
    }
    s.ex.forEach(e => { e.sets.sort((a, b) => a._n - b._n); e.sets.forEach(t => delete t._n); });
    S.sessions.push(s); sessions++;
  }
  return sessions ? { sessions, sets } : null;
}
function importCSV(txt) {
  const rows = parseCSV(txt); if (rows.length < 2) return null;
  const H = rows[0].map(h => h.trim().toLowerCase()), col = (...ks) => H.findIndex(h => ks.some(k => h === k || h.startsWith(k)));
  const ci = { d: col('date'), sp: col('workout', 'split', 'routine'), ex: col('exercise'), m: col('muscle'), set: col('set'), r: col('reps'), w: col('weight'), rpe: col('rpe'), n: col('notes', 'note') };
  if (ci.d < 0 || ci.ex < 0 || ci.r < 0) return null;
  const lbs = ci.w >= 0 && /lb/.test(H[ci.w]);
  const list = rows.slice(1).map(r => ({ date: (r[ci.d] || '').trim(), split: ci.sp >= 0 ? (r[ci.sp] || '').trim() : 'Workout', exercise: (r[ci.ex] || '').trim(), muscle: ci.m >= 0 ? r[ci.m] : '', set: ci.set >= 0 ? parseInt(r[ci.set], 10) || 0 : 0, reps: parseInt(r[ci.r], 10) || 0, kg: ci.w >= 0 ? (pnum(r[ci.w]) || 0) / (lbs ? LB : 1) : 0, rpe: ci.rpe >= 0 ? pnum(r[ci.rpe]) : null, notes: ci.n >= 0 ? (r[ci.n] || '').trim() : '' }))
    .filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.exercise && x.reps > 0);
  return importRows(list);
}
function legacyData() {
  const raw = store.get(OLD_KEY); if (!raw) return null;
  try { const p = JSON.parse(raw), ws = (p.workouts || []).filter(w => !String(w.id).startsWith('sample-')); return ws.length ? { p, ws } : null; } catch (e) { return null; }
}
function importLegacyStore() {
  const L = legacyData(); if (!L) return null;
  const mus = n => ((L.p.exercises || []).find(e => e.name === n) || {}).muscleGroup || '';
  const res = importRows(L.ws.map(w => ({ date: w.date, split: w.split, exercise: w.exercise, muscle: mus(w.exercise), set: w.setNum, reps: Number(w.reps), kg: Number(w.weight), rpe: w.rpe, notes: w.notes })));
  for (const [n, g] of Object.entries(L.p.goals || {})) { const x = exByName(n); if (x && g > 0 && !S.goals[x.id]) S.goals[x.id] = g; }
  if (L.p.unit === 'lbs') S.unit = 'lbs';
  return res;
}
function importText(txt) {
  txt = String(txt || '').trim(); if (!txt) { toast('Nothing to import'); return; }
  if (txt[0] === '{') {
    let p; try { p = JSON.parse(txt); } catch (e) { toast('That backup could not be read'); return; }
    if (!p || !Array.isArray(p.sessions) || !Array.isArray(p.ex)) { toast("That isn't an IronLog backup"); return; }
    confirmDlg('Restore this backup?', `It has ${p.sessions.length} workouts and ${(p.bw || []).length} weigh-ins, and it replaces everything on this device.`, 'Restore', () => {
      delete p.exported; S = Object.assign(freshState(), p); S.seen = true; save(); closeSheets(stack.length, () => { route(); toast('Backup restored'); });
    }, false);
    return;
  }
  const res = importCSV(txt);
  if (!res) { toast('No new workouts found in that file'); return; }
  save(); closeSheets(stack.length, () => { route(); toast(`Imported ${res.sets} sets from ${res.sessions} workout${res.sessions > 1 ? 's' : ''}`); });
}

/* demo data: five weeks of the default split with steady progress */
const DEMO = { 'barbell-bench-press': 70, 'dumbbell-bench-press': 26, 'incline-dumbbell-press': 22, 'machine-chest-press': 55, 'cable-fly': 12.5, deadlift: 120, 'pull-ups': 0, 'barbell-row': 60, 'lat-pulldown': 55, 'seated-cable-row': 55, 'back-squat': 90, 'romanian-deadlift': 80, 'leg-press': 140, 'leg-curl': 40, 'standing-calf-raise': 60, 'overhead-press': 45, 'dumbbell-shoulder-press': 18, 'lateral-raise': 8, 'rear-delt-fly': 7, shrugs: 30, 'barbell-curl': 30, 'close-grip-bench-press': 60, 'hammer-curl': 14, 'tricep-pushdown': 25, 'hanging-leg-raise': 0 };
function addDemo() {
  const t = iso(), start = addDays(monday(t), -35); let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let w = 0; w < 6; w++) for (let d = 0; d < 7; d++) {
    const date = addDays(start, w * 7 + d); if (date >= t) continue;
    const r = routineById(S.sched[d]); if (!r || rnd() < 0.1) continue;
    const st = pd(date).getTime() + (17.5 + rnd() * 2) * 36e5;
    const s = { id: uid('s'), name: r.name, routine: r.id, date, start: st, end: st + (48 + rnd() * 25) * 6e4, demo: true, ex: [] };
    for (const it of r.items) {
      const b = DEMO[it.ex]; if (b === undefined) continue;
      const step = b >= 40 ? 2.5 : b >= 10 ? 1 : 0.5, wt = b ? b + step * Math.floor(w * 0.85 + rnd() * 0.5) : 0;
      s.ex.push({ ex: it.ex, note: '', sets: Array.from({ length: it.s }, (_, k) => ({ w: wt, r: b ? Math.max(it.lo, it.hi - k - (w % 2)) : Math.max(3, 6 + w - k), rpe: null, done: true })) });
    }
    S.sessions.push(s);
  }
  for (let k = 42; k >= 1; k--) { const d = addDays(t, -k); if (rnd() < 0.3 || S.bw.some(x => x.d === d)) continue; S.bw.push({ d, kg: Math.round((77.9 + k / 42 * 1.5 + (rnd() - 0.5) * 0.8) * 10) / 10, demo: true }); }
  S.bw.sort((a, b) => a.d.localeCompare(b.d));
  if (!S.goals['barbell-bench-press']) S.goals['barbell-bench-press'] = 85;
}
function welcome() {
  const L = legacyData();
  sheet(`<h2>Welcome to IronLog</h2><p class="sub">Plan your week, log each set in a couple of taps, and watch your lifts and body weight move.</p>
    <p>You start with a 5-day split: <b>Mon</b> chest, <b>Tue</b> back, <b>Wed</b> legs, <b>Thu</b> shoulders, <b>Fri</b> arms. Change any of it in <b>Plan</b>.</p>
    <div class="stack">${L ? `<button class="btn wide blue" data-act="w-legacy">Bring over ${L.ws.length} sets from your old IronLog</button>` : ''}
    <button class="btn big pri" data-act="w-fresh">Start training</button>
    <button class="btn wide" data-act="w-demo">Explore with 5 weeks of demo data</button>
    <label class="btn wide ghost">${ic('upload', 's')} Import a backup or CSV<input type="file" id="imp-file" accept=".json,.csv,application/json,text/csv" hidden></label></div>`, { onClose: () => { if (!S.seen) { S.seen = true; save(); } } });
}
