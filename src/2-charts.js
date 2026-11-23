/* ===== charts (hand-drawn SVG, no libraries, work offline) ===== */
let ROs = [];
const clearCharts = () => { ROs.forEach(r => r.disconnect()); ROs = []; };
const nice = v => { if (!(v > 0)) return 1; const p = 10 ** Math.floor(Math.log10(v)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
const tickTxt = v => (Math.abs(v) >= 10000 ? r1(v / 1000) + 'k' : String(r1(v)));
const shortD = x => new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function observe(el, draw) { const ro = new ResizeObserver(() => draw()); ro.observe(el); ROs.push(ro); }

/* series: [{pts:[{x,y,...}], c, dash, area, line, dots, w}] ; tip(point) -> text */
function lineChart(el, series, o = {}) {
  const draw = () => {
    const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
    const pts = series.flatMap(s => s.pts);
    if (!pts.length) { el.innerHTML = `<div class="nochart">${o.empty || 'No data in this range yet'}</div>`; return; }
    const small = W < 420, P = { l: small ? 38 : 46, r: 12, t: 30, b: 26 };
    let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
    if (x1 - x0 < DAY * 2) { x0 -= DAY * 3; x1 += DAY * 3; }
    let y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    let sp = y1 - y0; if (sp < 1e-9) sp = Math.max(1, Math.abs(y1) * 0.1);
    y0 -= sp * 0.15; y1 += sp * 0.15; if (o.zero || y0 < 0) y0 = Math.max(0, y0);
    const st = nice((y1 - y0) / (small ? 3 : 4)); y0 = Math.floor(y0 / st) * st; y1 = Math.ceil(y1 / st) * st; if (y1 === y0) y1 = y0 + st;
    const X = x => P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r), Y = y => H - P.b - (y - y0) / (y1 - y0) * (H - P.t - P.b);
    let g = '';
    for (let v = y0; v <= y1 + st / 2; v += st) { const yy = Y(v).toFixed(1); g += `<line x1="${P.l}" x2="${W - P.r}" y1="${yy}" y2="${yy}" class="gl"/><text x="${P.l - 7}" y="${+yy + 4}" class="tk" text-anchor="end">${tickTxt(v)}</text>`; }
    const nx = small ? 3 : 4;
    for (let i = 0; i < nx; i++) { const x = x0 + (x1 - x0) * i / (nx - 1); g += `<text x="${X(x).toFixed(1)}" y="${H - 6}" class="tk" text-anchor="${i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle'}">${shortD(x)}</text>`; }
    let body = '';
    for (const s of series) {
      const ps = [...s.pts].sort((a, b) => a.x - b.x); if (!ps.length) continue;
      const d = ps.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join('');
      if (s.area) body += `<path d="${d}L${X(ps.at(-1).x).toFixed(1)},${H - P.b}L${X(ps[0].x).toFixed(1)},${H - P.b}Z" fill="${s.c}" opacity=".1"/>`;
      if (s.line !== false && ps.length > 1) body += `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="${s.w || 2.5}" ${s.dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
      if (s.dots !== false) body += ps.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${s.r || (ps.length > 40 ? 2.5 : 3.6)}" fill="${s.fill || 'var(--card)'}" stroke="${s.c}" stroke-width="2"/>`).join('');
    }
    el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(o.label || 'Chart')}">${g}${body}<g class="cur"></g></svg><div class="tip" hidden></div>`;
    if (!o.tip) return;
    const svg = el.querySelector('svg'), cur = svg.querySelector('.cur'), tip = el.querySelector('.tip');
    const main = [...series[o.tipSeries || 0].pts].sort((a, b) => a.x - b.x);
    const pick = ev => {
      const r = svg.getBoundingClientRect(), mx = ev.clientX - r.left; let best = null, bd = 1e9;
      for (const p of main) { const dd = Math.abs(X(p.x) - mx); if (dd < bd) { bd = dd; best = p; } }
      if (!best) return; const xx = X(best.x);
      cur.innerHTML = `<line x1="${xx}" x2="${xx}" y1="${P.t - 6}" y2="${H - P.b}" class="cl"/>` + series.map(s => { const q = s.pts.find(p => p.x === best.x); return q ? `<circle cx="${xx}" cy="${Y(q.y)}" r="5.5" fill="${s.c}"/>` : ''; }).join('');
      tip.hidden = false; tip.textContent = o.tip(best);
      const tw = tip.offsetWidth; tip.style.left = Math.min(Math.max(0, xx - tw / 2), W - tw) + 'px';
    };
    svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') pick(e); });
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { tip.hidden = true; cur.innerHTML = ''; } });
  };
  observe(el, draw); draw();
}

/* bars: [{label, v, on}] */
function barChart(el, bars, o = {}) {
  const draw = () => {
    const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
    if (!bars.some(b => b.v > 0)) { el.innerHTML = `<div class="nochart">${o.empty || 'Nothing logged yet'}</div>`; return; }
    const small = W < 420, P = { l: small ? 38 : 46, r: 6, t: 30, b: 26 };
    const max = Math.max(...bars.map(b => b.v)), st = nice(max / 3), y1 = Math.ceil(max / st) * st || 1;
    const Y = y => H - P.b - y / y1 * (H - P.t - P.b), bw = (W - P.l - P.r) / bars.length;
    let g = '';
    for (let v = 0; v <= y1 + st / 2; v += st) { const yy = Y(v).toFixed(1); g += `<line x1="${P.l}" x2="${W - P.r}" y1="${yy}" y2="${yy}" class="gl"/><text x="${P.l - 7}" y="${+yy + 4}" class="tk" text-anchor="end">${tickTxt(v)}</text>`; }
    const every = Math.ceil(bars.length / (small ? 4 : 6));
    const body = bars.map((b, i) => {
      const x = P.l + i * bw + bw * 0.18, w = bw * 0.64, y = Y(b.v), h = H - P.b - y;
      const lab = (bars.length - 1 - i) % every === 0 ? `<text x="${(x + w / 2).toFixed(1)}" y="${H - 6}" class="tk" text-anchor="middle">${esc(b.label)}</text>` : '';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${Math.min(5, w / 3)}" fill="${b.on ? 'var(--red)' : 'color-mix(in srgb,var(--red) 38%,var(--card))'}"><title>${esc(b.label)}: ${fnum(b.v)}</title></rect>${lab}`;
    }).join('');
    el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(o.label || 'Bar chart')}">${g}${body}</svg><div class="tip" hidden></div>`;
    if (!o.tip) return;
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip');
    svg.addEventListener('pointerdown', ev => {
      const r = svg.getBoundingClientRect(), i = Math.floor((ev.clientX - r.left - P.l) / bw); const b = bars[i]; if (!b) return;
      tip.hidden = false; tip.textContent = o.tip(b); const tw = tip.offsetWidth, cx = P.l + i * bw + bw / 2;
      tip.style.left = Math.min(Math.max(0, cx - tw / 2), W - tw) + 'px';
    });
  };
  observe(el, draw); draw();
}

function sparkline(vals, c = 'var(--red)') {
  if (vals.length < 2) return '<svg></svg>';
  const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
  const d = vals.map((v, i) => (i ? 'L' : 'M') + (i / (vals.length - 1) * 100).toFixed(2) + ',' + (30 - (v - lo) / sp * 26).toFixed(2)).join('');
  return `<svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${c}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* the week as a bumper plate: one segment per weekday */
function weekPlate(days) {
  const cx = 64, cy = 64, R = 61, r2 = 39, gap = 4;
  const arc = (a0, a1, ro, ri) => {
    const p = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)].map(n => n.toFixed(2)).join(',');
    const lg = a1 - a0 > 180 ? 1 : 0;
    return `M${p(a0, ro)}A${ro},${ro} 0 ${lg} 1 ${p(a1, ro)}L${p(a1, ri)}A${ri},${ri} 0 ${lg} 0 ${p(a0, ri)}Z`;
  };
  const segs = days.map((d, i) => {
    const a0 = i * 360 / 7 + gap / 2, a1 = (i + 1) * 360 / 7 - gap / 2;
    const fill = d.done ? '#D7262B' : d.today && d.sched ? '#2F6BE8' : d.sched ? '#4A4D55' : '#2A2C31';
    return `<path d="${arc(a0, a1, R - 5, r2 + 3)}" fill="${fill}"><title>${DOW[i]}: ${d.done ? 'trained' : d.sched ? 'planned' : 'rest'}</title></path>`;
  }).join('');
  return `<svg viewBox="0 0 128 128" role="img" aria-label="This week as a plate: ${days.filter(d => d.done).length} days trained">
    <circle cx="${cx}" cy="${cy}" r="${R + 2}" fill="#141518"/><circle cx="${cx}" cy="${cy}" r="${R + 1.5}" fill="none" stroke="#33363C" stroke-width="1.5"/>
    ${segs}
    <circle cx="${cx}" cy="${cy}" r="${r2}" fill="#1B1D21"/>
    <circle cx="${cx}" cy="${cy}" r="25" fill="#BFC3C9"/><circle cx="${cx}" cy="${cy}" r="25" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="40 200"/>
    <circle cx="${cx}" cy="${cy}" r="19" fill="#8E939B"/><circle cx="${cx}" cy="${cy}" r="13" fill="var(--card)"/>
  </svg>`;
}
