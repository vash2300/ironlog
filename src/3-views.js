/* ===== views ===== */
let view = 'today', lastView = 'today', calMonth = iso().slice(0, 7), pTab = 'strength', pRange = '3m', pEx = null, dip = null, hideBanner = false;
const RANGES = { '1m': 31, '3m': 92, '6m': 183, '1y': 366, all: 1e6 };
const rangeSeg = () => `<div class="seg" role="tablist">${Object.keys(RANGES).map(k => `<button data-act="range" data-v="${k}" class="${pRange === k ? 'on' : ''}">${k === 'all' ? 'All' : k.toUpperCase()}</button>`).join('')}</div>`;
const inRange = date => (Date.now() - pd(date).getTime()) / DAY <= RANGES[pRange];
const routineById = id => S.routines.find(r => r.id === id);

function setTitle(t, sub) { $('#title').innerHTML = (sub ? `<small>${esc(sub)}</small>` : '') + esc(t); }

function renderView() {
  clearCharts();
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
  $$('nav.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === view); b.setAttribute('aria-current', b.dataset.tab === view ? 'page' : 'false'); });
  ({ today: renderToday, history: renderHistory, progress: renderProgress, plan: renderPlan })[view]();
}

/* ---------- Today ---------- */
function weekDays() {
  const t = iso(), mon = monday(t), trained = new Set(S.sessions.map(s => s.date));
  return [...Array(7)].map((_, i) => { const d = addDays(mon, i); return { d, i, sched: !!routineById(S.sched[i]), done: trained.has(d), today: d === t, past: d < t }; });
}
function renderToday() {
  const now = new Date(), t = iso(now), d = dow(now), r = routineById(S.sched[d]);
  setTitle(DOW[d], now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }));
  const doneToday = S.sessions.filter(s => s.date === t);
  const others = S.routines.filter(x => !r || x.id !== r.id);
  const altChips = `<div class="chips">${others.map(x => `<button class="chip" data-act="start" data-id="${x.id}">${esc(x.name)}</button>`).join('')}<button class="chip" data-act="start" data-id="">${ic('plus', 's')} Empty workout</button></div>`;
  let h = '';
  if (framed && !hideBanner) h += `<div class="banner">${ic('info')}<div class="grow">This is the preview. Data here stays in this browser only — use Settings → Backup often, or install the app on your phone for real training.</div><button class="ib" data-act="hide-banner" aria-label="Dismiss">${ic('x', 's')}</button></div>`;
  if (S.active) {
    const a = S.active, tot = a.ex.reduce((n, e) => n + e.sets.length, 0), dn = a.ex.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0);
    h += `<div class="card hero live"><div class="sub">${a.editing ? 'Editing a past workout' : 'In progress · started ' + new Date(a.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      <h2>${esc(a.name)}</h2><div class="sub">${dn} of ${tot} sets done</div><div class="prog"><i style="width:${tot ? dn / tot * 100 : 0}%"></i></div>
      <button class="btn big blue" data-act="resume">${ic('play')} Resume workout</button></div>`;
  } else if (r) {
    h += `<div class="card hero"><div class="sub">${doneToday.length ? '<b>Done today</b>' : 'Planned for today'} · ${r.items.length} exercises</div><h2>${esc(r.name)}</h2>
      <ol class="plan">${r.items.map(it => { const lp = lastPerf(it.ex); const top = lp && lp.sets.reduce((a, b) => ((b.w || 0) > (a.w || 0) ? b : a)); return `<li><span>${esc(EX(it.ex).n)}</span><b>${it.s} × ${rr(it)}</b>${top ? `<small>Last: ${setTxt(top)}${top.w > 0 ? ' ' + U() : ''}</small>` : ''}</li>`; }).join('')}</ol>
      ${doneToday.length ? `<div class="okline">${ic('check')} Logged: ${esc(doneToday.map(s => s.name).join(', '))}</div>` : ''}
      <button class="btn big pri" data-act="start" data-id="${r.id}">${ic('play')} Start ${esc(r.name)}</button>
      <div class="alt"><div class="sub">Or train something else</div>${altChips}</div></div>`;
  } else {
    h += `<div class="card hero"><div class="sub">Nothing planned</div><h2>Rest day</h2>
      <p class="sub" style="margin-top:-4px">Recovery is training too. Want to lift anyway?</p>${altChips}</div>`;
  }
  // week plate
  const wd = weekDays(), planned = wd.filter(x => x.sched).length, trained = wd.filter(x => x.done).length;
  const wk = S.sessions.filter(s => s.date >= wd[0].d), vol = wk.reduce((a, s) => a + sessVol(s).v, 0);
  h += `<div class="card"><div class="week">${weekPlate(wd)}<div><h3>This week</h3><div class="big">${trained}<span class="sub" style="font:500 16px var(--f)"> of ${planned || '—'} workouts</span></div>
    <div class="sub">${fk(toD(vol))} ${U()} lifted · ${wk.reduce((a, s) => a + sessVol(s).n, 0)} sets</div></div></div>
    <div class="days">${wd.map(x => `<div class="${x.done ? 'd-done' : x.sched ? 'd-plan' : ''} ${x.today ? 'd-today' : ''}">${DOW[x.i][0]}<i></i></div>`).join('')}</div></div>`;
  // body weight
  const bw = [...S.bw].sort((a, b) => a.d.localeCompare(b.d)), last = bw.at(-1);
  const ref = last && [...bw].reverse().find(x => x.d <= addDays(last.d, -7));
  const delta = last && ref ? toD(last.kg) - toD(ref.kg) : null;
  const recent = bw.filter(x => x.d >= addDays(t, -60)).map(x => x.kg);
  h += `<div class="card"><h3>${ic('scale')} Body weight</h3>
    ${last ? `<div class="bw"><div><div class="big">${fw(last.kg)}<span class="sub" style="font:500 16px var(--f)"> ${U()}</span></div><div class="sub">${last.d === t ? 'Today' : fdate(last.d)}${delta !== null ? ` · ${delta > 0 ? '+' : ''}${r1(delta)} ${U()} vs a week before` : ''}</div></div>${sparkline(recent, 'var(--blue)')}</div>` : '<p class="sub" style="margin:0">Weigh in to track your body weight next to your lifts.</p>'}
    <div class="logrow"><input id="bw-in" class="in num-f" inputmode="decimal" placeholder="Today's weight (${U()})" aria-label="Today's body weight in ${U()}" enterkeyhint="done"><button class="btn pri" data-act="bw-log">Log</button></div></div>`;
  // recent PRs
  const st = stats(), prs = [];
  for (const s of [...st.ss].reverse()) { for (const p of st.prs[s.id] || []) prs.push({ ...p, date: s.date }); if (prs.length >= 5) break; }
  if (prs.length) h += `<div class="card"><h3>${ic('trophy')} Recent records</h3><div class="list">${prs.slice(0, 5).map(p => `<div class="li"><span class="dot" style="--c:${MCOL[EX(p.ex).m]}"></span><div><div class="t">${esc(EX(p.ex).n)}</div><div class="sub">${prText(p)}</div></div><span class="r sub">${fdate(p.date, { day: 'numeric', month: 'short' })}</span></div>`).join('')}</div></div>`;
  $('#v-today').innerHTML = h;
}

/* ---------- History ---------- */
function renderHistory() {
  setTitle('History');
  const [y, m] = calMonth.split('-').map(Number), first = new Date(y, m - 1, 1), nDays = new Date(y, m, 0).getDate(), t = iso();
  const by = {}; for (const s of S.sessions) (by[s.date] = by[s.date] || []).push(s);
  let cells = DOW.map(d => `<div class="wd">${d[0]}</div>`).join('') + '<span class="c"></span>'.repeat(dow(first));
  for (let i = 1; i <= nDays; i++) {
    const ds = iso(new Date(y, m - 1, i)), has = by[ds];
    cells += has ? `<button class="has ${ds === t ? 'tod' : ''}" data-act="day" data-d="${ds}" aria-label="${fdate(ds)}: ${has.length} workout">${i}<i></i></button>` : `<span class="c ${ds === t ? 'tod' : ''}">${i}</span>`;
  }
  const inMonth = S.sessions.filter(s => s.date.startsWith(calMonth));
  const mv = inMonth.reduce((a, s) => a + sessVol(s).v, 0);
  let h = `<div class="card"><div class="calh"><h3>${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h3>
    <button class="ib" data-act="cal" data-d="-1" aria-label="Previous month">${ic('chev-l')}</button><button class="ib" data-act="cal" data-d="1" aria-label="Next month">${ic('chev-r')}</button></div>
    <div class="cal">${cells}</div><div class="sub" style="margin-top:10px">${inMonth.length} workouts · ${fk(toD(mv))} ${U()} lifted this month</div></div>`;
  const ss = [...S.sessions].sort(cmpS).reverse(), st = stats();
  if (!ss.length) h += `<div class="empty"><b>No workouts yet</b>Finish your first session and it shows up here.</div>`;
  let curM = '';
  for (const s of ss) {
    const mk = s.date.slice(0, 7);
    if (mk !== curM) { curM = mk; h += `<div class="sec">${pd(s.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>`; }
    const sv = sessVol(s), prs = st.prs[s.id] || [], muscles = [...new Set(s.ex.map(e => EX(e.ex).m))];
    h += `<button class="sess" data-act="sess" data-id="${s.id}"><div class="t"><b>${esc(s.name)}</b><span class="sub">${fdate(s.date)}</span></div>
      <div class="meta">${s.end ? `<span class="tag">${ic('timer', 's')}${dur(s.end - s.start)}</span>` : ''}<span class="tag">${sv.n} sets</span><span class="tag">${fk(toD(sv.v))} ${U()}</span>${prs.length ? `<span class="tag pr">${ic('trophy', 's')}${prs.length} PR${prs.length > 1 ? 's' : ''}</span>` : ''}${s.demo ? '<span class="tag">demo</span>' : ''}</div>
      <div class="meta">${muscles.map(mm => `<span class="tag"><span class="dot" style="--c:${MCOL[mm]}"></span>${mm}</span>`).join('')}</div></button>`;
  }
  $('#v-history').innerHTML = h;
}
function sessionSheet(id) {
  const s = S.sessions.find(x => x.id === id); if (!s) return;
  const sv = sessVol(s), prs = stats().prs[s.id] || [];
  const prSet = new Set(prs.map(p => p.set).filter(Boolean));
  sheet(`<div class="sub">${fdate(s.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><h2>${esc(s.name)}</h2>
    <div class="kpis"><div class="kpi"><span>Duration</span><b>${s.end ? dur(s.end - s.start) : '—'}</b></div><div class="kpi"><span>Sets</span><b>${sv.n}</b></div><div class="kpi"><span>Volume</span><b>${fk(toD(sv.v))}</b><small>${U()}</small></div></div>
    ${prs.length ? `<div class="warn">${ic('trophy')}<div>${prs.map(p => `<b>${esc(EX(p.ex).n)}</b> — ${prText(p)}`).join('<br>')}</div></div>` : ''}
    ${s.ex.map(e => `<div class="det"><h4><span class="dot" style="--c:${MCOL[EX(e.ex).m]}"></span>${esc(EX(e.ex).n)}</h4>${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}<ol>${e.sets.map((t, j) => `<li><span>${j + 1}</span><span>${t.w > 0 ? `${fw(t.w)} ${U()} × ${t.r}` : `${t.r} reps`}${t.rpe ? ` <span class="sub">@${t.rpe}</span>` : ''}${prSet.has(t) ? ` <span class="tag pr">PR</span>` : ''}</span><span class="e">${t.w > 0 && t.r <= 15 ? 'e1RM ' + fw(e1(t.w, t.r)) : ''}</span></li>`).join('')}</ol></div>`).join('')}
    <div class="btns"><button class="btn" data-act="sess-edit" data-id="${s.id}">${ic('edit', 's')} Edit</button><button class="btn" data-act="sess-repeat" data-id="${s.id}">${ic('repeat', 's')} Do again</button></div>
    <button class="btn wide ghost danger" style="margin-top:8px" data-act="sess-del" data-id="${s.id}">${ic('trash', 's')} Delete workout</button>`);
}

/* ---------- Progress ---------- */
function renderProgress() {
  setTitle('Progress');
  let h = `<div class="seg" role="tablist">${[['strength', 'Strength'], ['body', 'Body weight'], ['volume', 'Volume']].map(([k, l]) => `<button data-act="ptab" data-v="${k}" class="${pTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  $('#v-progress').innerHTML = h + '<div id="pbody"></div>';
  ({ strength: progStrength, body: progBody, volume: progVolume })[pTab]();
}
function exSeries(exId) {
  return stats().ss.flatMap(s => s.ex.filter(e => e.ex === exId).map(e => ({ s, e, b: entryBest(e) }))).filter(x => x.b.n);
}
function progStrength() {
  const st = stats();
  const used = Object.keys(st.best).sort((a, b) => st.best[b].last.localeCompare(st.best[a].last) || EX(a).n.localeCompare(EX(b).n));
  const el = $('#pbody');
  if (!used.length) { el.innerHTML = `<div class="empty"><b>No lifts logged yet</b>Finish a workout and each exercise gets its own progress chart here.</div>`; return; }
  if (!used.includes(pEx)) pEx = used[0];
  const all = exSeries(pEx), weighted = all.some(x => x.b.w > 0), rows = all.filter(x => inRange(x.s.date));
  const best = weighted ? Math.max(...all.map(x => x.b.e1)) : Math.max(...all.map(x => x.b.r));
  const heavy = Math.max(...all.map(x => x.b.w));
  const firstV = rows.length ? (weighted ? rows[0].b.e1 : rows[0].b.r) : 0, lastV = rows.length ? (weighted ? rows.at(-1).b.e1 : rows.at(-1).b.r) : 0;
  const ch = rows.length > 1 ? (weighted ? toD(lastV) - toD(firstV) : lastV - firstV) : null;
  const goal = S.goals[pEx];
  let h = `<label class="f" for="pex">Exercise</label><select id="pex" class="in" data-chg="pex">${used.map(id => `<option value="${id}" ${id === pEx ? 'selected' : ''}>${esc(EX(id).n)} (${st.best[id].n})</option>`).join('')}</select>
    <div class="kpis" style="margin-top:14px">
      <div class="kpi"><span>${weighted ? 'Best est. 1RM' : 'Most reps'}</span><b>${weighted ? fw(best) : best}</b><small>${weighted ? U() : 'reps'}</small></div>
      ${weighted ? `<div class="kpi"><span>Heaviest set</span><b>${fw(heavy)}</b><small>${U()}</small></div>` : ''}
      <div class="kpi"><span>Change (${pRange === 'all' ? 'all time' : pRange.toUpperCase()})</span><b class="${ch > 0 ? 'up' : ch < 0 ? 'down' : ''}">${ch === null ? '—' : (ch > 0 ? '+' : '') + r1(ch)}</b><small>${ch === null ? 'need 2 sessions' : weighted ? U() + ' e1RM' : 'reps'}</small></div>
    </div>
    <div class="card"><h3>${weighted ? 'Estimated 1RM & top set' : 'Best set (reps)'}</h3>${rangeSeg()}<div class="fig" id="f-str"></div>
    <div class="legend">${weighted ? `<span><i style="--c:var(--red)"></i>Est. 1RM</span><span><i class="d" style="--c:var(--blue)"></i>Top set weight</span>` : `<span><i style="--c:var(--red)"></i>Reps</span>`}</div></div>`;
  if (weighted) {
    const reps = [1, 3, 5, 8, 10, 12], sets = all.flatMap(x => x.e.sets.filter(t => t.done).map(t => ({ ...t, d: x.s.date })));
    h += `<div class="card"><h3>Rep records</h3><table class="t"><thead><tr><th>Reps</th><th class="n">Heaviest</th><th class="n">Date</th></tr></thead><tbody>${reps.map(n => { const c = sets.filter(t => t.r >= n && t.w > 0).sort((a, b) => b.w - a.w || b.r - a.r)[0]; return `<tr><td>${n}+</td><td class="n"><b>${c ? fw(c.w) + ' ' + U() : '—'}</b>${c && c.r > n ? ` <span class="sub">×${c.r}</span>` : ''}</td><td class="n sub">${c ? fdate(c.d, { day: 'numeric', month: 'short' }) : ''}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="card"><h3>Goal</h3><div class="logrow" style="margin-top:0"><input id="goal-in" class="in num-f" inputmode="decimal" placeholder="Target weight for one set (${U()})" value="${goal ? fw(goal) : ''}" aria-label="Goal weight"><button class="btn" data-act="goal-save">Save</button></div>
    ${goal ? `<div class="goalbar"><i style="width:${Math.min(100, heavy / goal * 100)}%"></i></div><div class="sub">${heavy >= goal ? 'Goal reached — set a new one.' : `${fw(heavy)} of ${fw(goal)} ${U()} · ${r1(toD(goal - heavy))} ${U()} to go`}</div>` : ''}</div>`;
  }
  h += `<div class="card"><h3>Sessions</h3><div class="list">${[...all].reverse().slice(0, 8).map(x => `<button class="li" data-act="sess" data-id="${x.s.id}"><div><div class="t">${fdate(x.s.date)}</div><div class="sub">${x.e.sets.filter(t => t.done).map(setTxt).join(' · ')}</div></div><span class="r">${weighted ? fw(x.b.e1) : x.b.r} ${ic('chev-r', 's')}</span></button>`).join('')}</div></div>`;
  el.innerHTML = h;
  const pts = rows.map(x => ({ x: pd(x.s.date).getTime(), y: weighted ? toD(x.b.e1) : x.b.r, top: x.b.top, d: x.s.date }));
  const series = [{ pts, c: 'var(--red)', area: true }];
  if (weighted) series.push({ pts: rows.map(x => ({ x: pd(x.s.date).getTime(), y: toD(x.b.w) })), c: 'var(--blue)', dash: true, dots: false, w: 2 });
  lineChart($('#f-str'), series, { label: `${EX(pEx).n} progress`, tip: p => `${fdate(p.d, { day: 'numeric', month: 'short' })} · ${weighted ? `e1RM ${r1(p.y)} · top ${setTxt(p.top)}` : p.y + ' reps'}` });
}
function progBody() {
  const el = $('#pbody'), all = [...S.bw].sort((a, b) => a.d.localeCompare(b.d)), rows = all.filter(x => inRange(x.d));
  const last = all.at(-1);
  const ch = rows.length > 1 ? toD(rows.at(-1).kg) - toD(rows[0].kg) : null;
  let h = `<div class="kpis"><div class="kpi"><span>Current</span><b>${last ? fw(last.kg) : '—'}</b><small>${U()}</small></div>
    <div class="kpi"><span>Change (${pRange === 'all' ? 'all' : pRange.toUpperCase()})</span><b>${ch === null ? '—' : (ch > 0 ? '+' : '') + r1(ch)}</b><small>${ch === null ? '' : U()}</small></div>
    <div class="kpi"><span>Goal</span><b>${S.bwGoal ? fw(S.bwGoal) : '—'}</b><small>${S.bwGoal && last ? `${r1(Math.abs(toD(last.kg - S.bwGoal)))} ${U()} to go` : 'not set'}</small></div></div>
    <div class="card"><h3>Trend</h3>${rangeSeg()}<div class="fig" id="f-bw"></div><div class="legend"><span><i style="--c:var(--blue)"></i>7-day average</span><span><i style="--c:var(--muted)"></i>Weigh-ins</span>${S.bwGoal ? '<span><i class="d" style="--c:var(--green)"></i>Goal</span>' : ''}</div></div>
    <div class="card"><h3>Log a weigh-in</h3><div class="dr" style="margin-top:0"><input id="bw-date" class="in" type="date" value="${iso()}" max="${iso()}" aria-label="Date"><input id="bw-in2" class="in num-f" inputmode="decimal" placeholder="${U()}" aria-label="Weight in ${U()}"><button class="btn pri" data-act="bw-log2">Log</button></div>
    <div class="logrow"><input id="bwg-in" class="in num-f" inputmode="decimal" placeholder="Goal weight (${U()})" value="${S.bwGoal ? fw(S.bwGoal) : ''}" aria-label="Goal body weight"><button class="btn" data-act="bwg-save">Set goal</button></div></div>`;
  if (all.length) h += `<div class="card"><h3>Weigh-ins</h3><div class="list">${[...all].reverse().slice(0, 14).map(x => `<div class="li"><div class="t">${fdate(x.d)}</div><span class="r num-f" style="font-size:19px;font-weight:700">${fw(x.kg)} <span class="sub">${U()}</span></span><button class="ib" data-act="bw-del" data-d="${x.d}" aria-label="Delete weigh-in ${fdate(x.d)}">${ic('trash', 's')}</button></div>`).join('')}</div></div>`;
  el.innerHTML = h;
  const pts = rows.map(x => ({ x: pd(x.d).getTime(), y: toD(x.kg), d: x.d }));
  const avg = pts.map(p => { const win = all.filter(x => pd(x.d).getTime() <= p.x && pd(x.d).getTime() > p.x - 7 * DAY); return { x: p.x, y: win.reduce((a, b) => a + toD(b.kg), 0) / win.length, d: p.d }; });
  const series = [{ pts: avg, c: 'var(--blue)', dots: false, w: 3 }, { pts, c: 'var(--muted)', line: false, r: 3, fill: 'var(--muted)' }];
  if (S.bwGoal && pts.length) series.push({ pts: [{ x: pts[0].x, y: toD(S.bwGoal) }, { x: pts.at(-1).x, y: toD(S.bwGoal) }], c: 'var(--green)', dash: true, dots: false, w: 1.5 });
  lineChart($('#f-bw'), series, { label: 'Body weight trend', empty: 'Log a few weigh-ins to see your trend', tipSeries: 1, tip: p => `${fdate(p.d, { day: 'numeric', month: 'short' })} · ${r1(p.y)} ${U()} · avg ${r1(avg.find(a => a.x === p.x).y)}` });
}
function progVolume() {
  const el = $('#pbody'), thisMon = monday(iso());
  const weeks = [...Array(12)].map((_, i) => addDays(thisMon, -7 * (11 - i)));
  const wk = Object.fromEntries(weeks.map(w => [w, { v: 0, n: 0, s: 0, m: {} }]));
  for (const s of S.sessions) {
    const w = wk[monday(s.date)]; if (!w) continue; w.n++;
    for (const e of s.ex) { const mm = EX(e.ex).m; for (const t of e.sets) if (t.done) { w.v += (t.w || 0) * (t.r || 0); w.s++; w.m[mm] = (w.m[mm] || 0) + 1; } }
  }
  const cur = wk[thisMon], prev = wk[weeks[10]];
  const ms = MUSCLES.filter(mm => cur.m[mm] || prev.m[mm]), mx = Math.max(1, ...ms.map(mm => Math.max(cur.m[mm] || 0, prev.m[mm] || 0)));
  el.innerHTML = `<div class="kpis"><div class="kpi"><span>Workouts this week</span><b>${cur.n}</b><small>last week ${prev.n}</small></div>
    <div class="kpi"><span>Sets this week</span><b>${cur.s}</b><small>last week ${prev.s}</small></div>
    <div class="kpi"><span>Volume this week</span><b>${fk(toD(cur.v))}</b><small>last week ${fk(toD(prev.v))} ${U()}</small></div></div>
    <div class="card"><h3>Weekly volume (${U()})</h3><div class="fig" id="f-vol"></div><div class="sub">Weight × reps for every ticked set, Monday to Sunday.</div></div>
    <div class="card"><h3>Sets per muscle group</h3><div class="legend" style="margin:0 0 8px"><span><i style="--c:var(--ink)"></i>This week</span><span><i style="--c:var(--ink);opacity:.3"></i>Last week</span></div>
    ${ms.length ? ms.map(mm => `<div class="mrow" style="--c:${MCOL[mm]}"><span>${mm}</span><div class="bars"><i style="width:${(cur.m[mm] || 0) / mx * 100}%"></i><i class="l" style="width:${(prev.m[mm] || 0) / mx * 100}%"></i></div><span class="n">${cur.m[mm] || 0} <span class="sub">/ ${prev.m[mm] || 0}</span></span></div>`).join('') : '<div class="sub">No sets in the last two weeks.</div>'}</div>`;
  barChart($('#f-vol'), weeks.map(w => ({ label: fdate(w, { day: 'numeric', month: 'short' }), v: toD(wk[w].v), on: w === thisMon, n: wk[w].n })), { label: 'Weekly volume', tip: b => `Week of ${b.label}: ${fnum(b.v)} ${U()} · ${b.n} workouts` });
}

/* ---------- Plan ---------- */
function renderPlan() {
  setTitle('Plan');
  const custom = S.ex.filter(e => e.c && !e.hide).length;
  let h = `<div class="card sched"><h3>${ic('cal')} Weekly schedule</h3><div class="list">${DOW.map((d, i) => { const r = routineById(S.sched[i]); return `<button class="li" data-act="sched" data-d="${i}"><span class="dn">${d.slice(0, 3)}</span><span class="t" style="${r ? '' : 'color:var(--muted);font-weight:500'}">${r ? esc(r.name) : 'Rest'}</span><span class="r sub">${r ? r.items.length + ' exercises' : ''} ${ic('chev-r', 's')}</span></button>`; }).join('')}</div></div>
    <div class="sec">Routines</div>`;
  h += S.routines.map(r => { const days = DOW.filter((_, i) => S.sched[i] === r.id).map(d => d.slice(0, 3)); const ms = [...new Set(r.items.map(it => EX(it.ex).m))]; return `<button class="rt" data-act="rt-edit" data-id="${r.id}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>${esc(r.name)}</b><span class="sub">${days.join(', ') || 'Not scheduled'}</span></div><div class="sub" style="margin:4px 0 8px">${r.items.map(it => esc(EX(it.ex).n)).join(' · ') || 'No exercises yet'}</div><div class="meta" style="display:flex;gap:6px;flex-wrap:wrap">${ms.map(mm => `<span class="tag"><span class="dot" style="--c:${MCOL[mm]}"></span>${mm}</span>`).join('')}</div></button>`; }).join('');
  h += `<button class="btn wide" data-act="rt-new">${ic('plus', 's')} New routine</button>
    <div class="sec">Exercise library</div><button class="card li" style="padding:14px 16px" data-act="lib"><div><div class="t">${S.ex.filter(e => !e.hide).length} exercises</div><div class="sub">${custom} of your own · add, rename or hide</div></div><span class="r">${ic('chev-r')}</span></button>`;
  $('#v-plan').innerHTML = h;
}
