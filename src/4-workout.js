/* ===== live workout ===== */
const R = { end: 0, total: 0, iv: 0, mode: '', msg: '' };
let wl = null, actx = null;
const newSets = n => Array.from({ length: Math.max(1, n) }, () => ({ w: null, r: null, rpe: null, done: false }));
const woOpen = () => $('#wo').classList.contains('on');
const syncLock = () => { document.body.classList.toggle('lock', stack.length > 0 || woOpen()); document.body.classList.toggle('sheet-open', stack.length > 0); };

function busyGuard() {
  if (!S.active) return false;
  sheet(`<h2>A workout is already open</h2><p class="sub">Finish or discard “${esc(S.active.name)}” before starting another one.</p><div class="btns"><button class="btn" data-act="close">Cancel</button><button class="btn blue" data-act="resume-close">Go to workout</button></div>`);
  return true;
}
function startWorkout(rid) {
  if (busyGuard()) return;
  const r = rid ? routineById(rid) : null;
  S.active = { id: uid('s'), name: r ? r.name : 'Workout', routine: r ? r.id : null, start: Date.now(), date: iso(),
    ex: r ? r.items.map(it => ({ ex: it.ex, item: { s: it.s, lo: it.lo, hi: it.hi }, note: '', sets: newSets(it.s) })) : [] };
  R.end = 0; R.msg = ''; save(); go('workout');
  if (!r) setTimeout(() => picker(addToWorkout), 250);
}
function repeatSession(id) {
  const s = S.sessions.find(x => x.id === id); if (!s || busyGuard()) return;
  const r = routineById(s.routine);
  S.active = { id: uid('s'), name: s.name, routine: s.routine, start: Date.now(), date: iso(),
    ex: s.ex.map(e => { const it = r && r.items.find(i => i.ex === e.ex); return { ex: e.ex, item: it ? { s: it.s, lo: it.lo, hi: it.hi } : null, note: '', sets: newSets(e.sets.length) }; }) };
  R.end = 0; save(); go('workout');
}
function editSession(id) {
  const s = S.sessions.find(x => x.id === id); if (!s || busyGuard()) return;
  const r = routineById(s.routine);
  S.active = { id: s.id, editing: s.id, name: s.name, routine: s.routine, start: s.start, end: s.end, date: s.date, demo: s.demo,
    ex: s.ex.map(e => { const it = r && r.items.find(i => i.ex === e.ex); return { ex: e.ex, item: it ? { s: it.s, lo: it.lo, hi: it.hi } : null, note: e.note || '', sets: e.sets.map(t => ({ ...t, done: true })) }; }) };
  R.end = 0; save(); go('workout');
}
function addToWorkout(id) {
  const r = routineById(S.active.routine), it = r && r.items.find(i => i.ex === id);
  const lp = lastPerf(id, S.active.editing);
  S.active.ex.push({ ex: id, item: it ? { s: it.s, lo: it.lo, hi: it.hi } : null, note: '', sets: newSets(it ? it.s : lp ? lp.sets.length : 3) });
  save(); renderWO();
  requestAnimationFrame(() => { const c = $$('#wo-list .ex').at(-1); c && c.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}

/* placeholders: last time's numbers (or +1 increment when you earned it), following today's weight once you change it */
function placeholders(e) {
  const sg = suggestion(e.ex, e.item, S.active.editing);
  return e.sets.map((t, j) => {
    let p = sg.sets[j] || sg.sets.at(-1); p = p ? { ...p } : { w: null, r: e.item ? e.item.lo : null };
    let k = j - 1; while (k >= 0 && !e.sets[k].done) k--;
    const prev = k >= 0 ? e.sets[k] : null;
    if (prev) {
      const ps = sg.sets[k];
      if (!ps || Math.abs((ps.w || 0) - (prev.w || 0)) > 1e-6) p.w = prev.w;
      if (!ps) p.r = prev.r;
    }
    return p;
  });
}
function exCard(e, i) {
  const x = EX(e.ex), a = S.active, sg = suggestion(e.ex, e.item, a.editing), ph = placeholders(e), bwEx = x.q === 'Bodyweight';
  let hint = '';
  if (sg.up) hint = `<div class="hint go">${ic('trend', 's')}<span>You hit ${e.item.hi} reps on every set last time — go up to <b>${fw(sg.top + incKg())} ${U()}</b>.</span></div>`;
  else if (!sg.lp && !a.editing) hint = `<div class="hint">${ic('info', 's')}<span>First time logging this${e.item ? ` — pick a weight you can lift for ${rr(e.item)} clean reps` : ''}.</span></div>`;
  const rows = e.sets.map((t, j) => {
    const prev = sg.lp && (sg.lp.sets[j] || null), p = ph[j];
    const pw = p.w > 0 ? fw(p.w) : p.w === 0 || bwEx ? '0' : '', pr = p.r != null ? p.r : '';
    return `<div class="row ${t.done ? 'done' : ''} ${t.pr ? 'pr' : ''}" data-i="${i}" data-j="${j}">
      <span class="sn" title="${t.pr ? 'Personal record' : ''}">${t.pr ? ic('trophy', 's') : j + 1}</span>
      <span class="prev">${prev ? setTxt(prev) : '—'}</span>
      <input class="in numi" data-f="w" inputmode="decimal" enterkeyhint="next" autocomplete="off" value="${t.w != null ? fw(t.w) : ''}" placeholder="${pw}" aria-label="Set ${j + 1} weight in ${U()}${bwEx ? ' (added)' : ''}">
      <input class="in numi" data-f="r" inputmode="numeric" enterkeyhint="${S.rpe ? 'next' : 'done'}" autocomplete="off" value="${t.r ?? ''}" placeholder="${pr}" aria-label="Set ${j + 1} reps">
      ${S.rpe ? `<input class="in numi" data-f="rpe" inputmode="decimal" enterkeyhint="done" autocomplete="off" value="${t.rpe ?? ''}" placeholder="RPE" aria-label="Set ${j + 1} RPE">` : ''}
      <button class="tick" data-act="tick" aria-pressed="${t.done}" aria-label="Set ${j + 1} done">${ic('check')}</button></div>`;
  }).join('');
  return `<div class="card ex ${S.rpe ? 'rpe' : ''}" data-i="${i}">
    <div class="exh"><span class="dot" style="--c:${MCOL[x.m]}"></span><div class="grow"><div class="exn">${esc(x.n)}</div><div class="sub">${e.item ? `${e.item.s} × ${rr(e.item)} · ` : ''}${x.m}${bwEx ? ' · weight = added load' : ''}</div></div>
    <button class="ib" data-act="ex-menu" data-i="${i}" aria-label="Options for ${esc(x.n)}">${ic('more')}</button></div>
    ${hint}${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}
    <div class="row h"><span>Set</span><span>Previous</span><span>${U()}</span><span>Reps</span>${S.rpe ? '<span>RPE</span>' : ''}<span></span></div>
    ${rows}
    <div class="exf"><button class="btn ghost sm" data-act="set-add" data-i="${i}">${ic('plus', 's')} Add set</button><button class="btn ghost sm" data-act="set-del" data-i="${i}" ${e.sets.length ? '' : 'disabled'}>Remove last set</button></div></div>`;
}
function renderWO() {
  const a = S.active; if (!a) return;
  const nm = $('#wo-name'); if (document.activeElement !== nm) nm.value = a.name;
  $('#wo-list').innerHTML = (a.ex.length ? a.ex.map(exCard).join('') : `<div class="empty"><b>No exercises yet</b>Add the first one to get going.</div>`) +
    `<button class="btn wide" data-act="wo-addex" style="min-height:52px">${ic('plus', 's')} Add exercise</button>`;
  woClock(); renderRest(true);
}
function renderCard(i) { const c = $(`#wo-list .ex[data-i="${i}"]`); if (c) c.outerHTML = exCard(S.active.ex[i], i); }
function woClock() {
  const a = S.active, el = $('#wo-clock'); if (!a || !el) return;
  const tot = a.ex.reduce((n, e) => n + e.sets.length, 0), dn = a.ex.reduce((n, e) => n + e.sets.filter(t => t.done).length, 0);
  el.textContent = (a.editing ? `Editing · ${fdate(a.date)}` : clock((Date.now() - a.start) / 1000)) + ` · ${dn}/${tot} sets`;
}

/* fill a set from its placeholder; returns an error message or '' */
function fillSet(e, j) {
  const t = e.sets[j], p = placeholders(e)[j];
  const w = t.w != null ? t.w : p.w, r = t.r != null ? t.r : p.r;
  if (!(r > 0)) return 'Enter the reps first';
  if (w == null) { if (EX(e.ex).q === 'Bodyweight') { t.w = 0; } else return 'Enter the weight first'; } else t.w = w;
  t.r = r; t.done = true; return '';
}
function tick(i, j) {
  audioInit();
  const a = S.active, e = a.ex[i], t = e.sets[j];
  if (t.done) { t.done = false; t.pr = false; save(); renderCard(i); woClock(); return; }
  const err = fillSet(e, j);
  if (err) { toast(err); const inp = $(`#wo-list .row[data-i="${i}"][data-j="${j}"] [data-f="${err.includes('reps') ? 'r' : 'w'}"]`); inp && inp.focus(); return; }
  // PR check against history and earlier sets today
  const hb = bestExcluding(e.ex, a.editing || a.id), others = e.sets.filter((s, k) => k !== j && s.done);
  const ce1 = Math.max(0, ...others.map(s => e1(s.w, s.r))), cw = Math.max(0, ...others.map(s => s.w || 0)), cr = Math.max(0, ...others.filter(s => !(s.w > 0)).map(s => s.r));
  const v = e1(t.w, t.r); let msg = '';
  if (hb.has) {
    if (v > 0 && v > Math.max(hb.e1, ce1) + 1e-6) msg = `est. 1RM ${fw(v)} ${U()}`;
    else if (t.w > Math.max(hb.w, cw) + 1e-6) msg = `heaviest ever, ${fw(t.w)} ${U()}`;
    else if (!(t.w > 0) && t.r > Math.max(hb.rw, cr)) msg = `${t.r} reps`;
  }
  t.pr = !!msg;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  save(); renderCard(i); woClock();
  if (msg) { toast(`New PR · ${EX(e.ex).n} — ${msg}`, 'pr'); buzz([60, 50, 60]); } else buzz(25);
  if (!a.editing) startRest(S.rest);
}

/* rest timer (timestamp based: keeps time while the screen is off) */
function audioInit() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } }
function beep() {
  if (!S.sound || !actx) return;
  try {
    const t0 = actx.currentTime;
    [0, 0.22, 0.44].forEach((d, k) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = k === 2 ? 1320 : 880; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.3, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18); o.connect(g); g.connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + 0.2); });
  } catch (e) { }
}
const buzz = p => { if (S.vib && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } };
function startRest(sec) { audioInit(); R.total = sec; R.end = Date.now() + sec * 1000; R.msg = ''; if (S.active) { S.active.rest = { end: R.end, total: sec }; saveSoon(); } loopRest(); }
function loopRest() { clearInterval(R.iv); if (R.end) R.iv = setInterval(renderRest, 250); renderRest(true); }
function stopRest(msg = '') { R.end = 0; R.msg = msg; clearInterval(R.iv); if (S.active) { S.active.rest = null; saveSoon(); } renderRest(true); }
function renderRest(force) {
  const el = $('#rest'); if (!el) return;
  let left = R.end ? (R.end - Date.now()) / 1000 : 0;
  if (R.end && left <= 0) { beep(); buzz([300, 120, 300, 120, 300]); stopRest('Rest over — time for your next set'); return; }
  const mode = R.end ? 'run' : 'idle';
  if (force || mode !== R.mode) {
    R.mode = mode;
    el.innerHTML = mode === 'run'
      ? `<div class="rbar"><i id="rfill"></i></div><div class="rrow"><button class="btn sm" data-act="rest-adj" data-d="-15" aria-label="15 seconds less">−15</button><div class="rtime"><span class="sub">Rest</span><b id="rtime"></b></div><button class="btn sm" data-act="rest-adj" data-d="15" aria-label="15 seconds more">+15</button><button class="btn sm" data-act="rest-skip">Skip</button></div>`
      : `<div class="rrow">${ic('timer')}<span class="rmsg ${R.msg ? 'go' : ''}">${R.msg || 'Rest'}</span>${[60, 90, 120, 180].map(s => `<button class="btn sm" data-act="rest-start" data-s="${s}">${s < 120 ? s + 's' : s / 60 + 'm'}</button>`).join('')}</div>`;
  }
  if (mode === 'run') { const f = $('#rfill'), tt = $('#rtime'); if (tt) tt.textContent = clock(left); if (f) f.style.width = Math.max(0, Math.min(100, left / R.total * 100)) + '%'; }
}
async function lockScreen() { try { if ('wakeLock' in navigator && woOpen() && !document.hidden) wl = await navigator.wakeLock.request('screen'); } catch (e) { } }
function unlockScreen() { try { wl && wl.release(); } catch (e) { } wl = null; }

function openWO() {
  const w = $('#wo'), was = woOpen();
  w.classList.add('on'); document.body.classList.add('wo-open'); syncLock();
  const a = S.active; if (a.rest && a.rest.end > Date.now() && !R.end) { R.end = a.rest.end; R.total = a.rest.total; }
  renderWO(); loopRest();
  if (!was) { $('#wo-scroll').scrollTop = 0; lockScreen(); }
}
function closeWO() { if (!woOpen()) return; $('#wo').classList.remove('on'); document.body.classList.remove('wo-open'); syncLock(); unlockScreen(); }

/* finish / save / discard */
function woTotals() {
  const a = S.active; let n = 0, v = 0, pend = 0, prs = 0;
  for (const e of a.ex) for (const t of e.sets) { if (t.done) { n++; v += (t.w || 0) * (t.r || 0); if (t.pr) prs++; } else if (t.w != null || t.r != null) pend++; }
  return { n, v, pend, prs };
}
function finishHTML() {
  const a = S.active, T = woTotals(), el = a.editing ? (a.end || a.start) - a.start : Date.now() - a.start;
  return `<h2>${a.editing ? 'Save changes' : 'Finish workout'}</h2>
    <div class="kpis"><div class="kpi"><span>Time</span><b>${a.editing && !a.end ? '—' : dur(el)}</b></div><div class="kpi"><span>Sets</span><b>${T.n}</b></div><div class="kpi"><span>Volume</span><b>${fk(toD(T.v))}</b><small>${U()}</small></div>${T.prs ? `<div class="kpi"><span>Records</span><b style="color:light-dark(#7A5A00,#F7CF4A)">${T.prs}</b></div>` : ''}</div>
    ${T.pend ? `<div class="warn"><span class="grow">${T.pend} set${T.pend > 1 ? 's have' : ' has'} numbers but ${T.pend > 1 ? "aren't" : "isn't"} ticked, so ${T.pend > 1 ? 'they' : 'it'} won't be saved.</span><button class="btn sm" data-act="tick-all">Tick ${T.pend > 1 ? 'them' : 'it'}</button></div>` : ''}
    ${T.n ? '' : `<div class="warn">No sets ticked yet — there is nothing to save.</div>`}
    <label class="f" for="fin-date">Date</label><input id="fin-date" class="in" type="date" value="${a.date}" max="${iso()}">
    <div class="stack" style="margin-top:16px"><button class="btn big pri" data-act="wo-save" ${T.n ? '' : 'disabled'}>${a.editing ? 'Save changes' : 'Save workout'}</button>
    <button class="btn wide" data-act="close">Keep training</button>
    <button class="btn wide ghost danger" data-act="wo-discard">${a.editing ? 'Discard changes' : 'Discard workout'}</button></div>`;
}
function saveWorkout() {
  const a = S.active; if (!a) return;
  const date = ($('#fin-date') && $('#fin-date').value) || a.date;
  const s = { id: a.editing || a.id, name: (a.name || '').trim() || 'Workout', routine: a.routine, date, start: a.start, end: a.editing ? a.end : Date.now(),
    ex: a.ex.map(e => ({ ex: e.ex, note: e.note || '', sets: e.sets.filter(t => t.done).map(t => ({ w: t.w || 0, r: t.r, rpe: t.rpe ?? null, done: true })) })).filter(e => e.sets.length) };
  if (a.demo) s.demo = true;
  const k = S.sessions.findIndex(x => x.id === s.id);
  if (k >= 0) S.sessions[k] = s; else S.sessions.push(s);
  const editing = a.editing; S.active = null; stopRest(); save();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
  const prs = (stats().prs[s.id] || []).length;
  closeSheets(stack.length, () => { go(lastView, true); toast(editing ? 'Changes saved' : `Workout saved${prs ? ` · ${prs} new record${prs > 1 ? 's' : ''}` : ''} — nice work`, prs ? 'pr' : ''); });
}
function discardWorkout() { S.active = null; stopRest(); save(); closeSheets(stack.length, () => { go(lastView, true); toast('Workout discarded'); }); }

/* per-exercise menu */
function exMenu(i) {
  const e = S.active.ex[i], n = S.active.ex.length;
  sheet(`<h2>${esc(EX(e.ex).n)}</h2><div class="list">
    <button class="li" data-act="exm-note" data-i="${i}">${ic('edit')}<span class="t">${e.note ? 'Edit note' : 'Add a note'}</span></button>
    <button class="li" data-act="exm-swap" data-i="${i}">${ic('swap')}<span class="t">Replace exercise</span></button>
    <button class="li" data-act="exm-mv" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'}>${ic('up')}<span class="t">Move up</span></button>
    <button class="li" data-act="exm-mv" data-i="${i}" data-d="1" ${i < n - 1 ? '' : 'disabled'}>${ic('down')}<span class="t">Move down</span></button>
    <button class="li" data-act="exm-prog" data-id="${e.ex}">${ic('chart')}<span class="t">See progress</span></button>
    <button class="li" data-act="exm-rm" data-i="${i}" style="color:var(--red-ink)">${ic('trash')}<span class="t">Remove from workout</span></button></div>`);
}
