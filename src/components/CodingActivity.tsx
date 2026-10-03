import { useEffect, useMemo, useRef, useState } from 'react';
import { buildGrid, dayMs, mixRGB, monthLabels, resolvePalette, type ContributionDay, type RGB } from './GitHubActivity';

const rgb = (c: number[]) => `rgb(${c.map(Math.round).join(',')})`;
const hex = (value: string): RGB => [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5), 16)];

function Heatmap({ data }: { data: ContributionDay[] }) {
  const model = useMemo(() => {
    const grid = buildGrid(data, dayMs('2026-07-01'));
    return { ...grid, months: monthLabels(grid.cells, grid.weeks) };
  }, [data]);
  const [active, setActive] = useState(-1);
  const [level, setLevel] = useState(-1);
  const [notice, setNotice] = useState('');
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), tip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current, box = stage.current, el = canvas.current, tooltip = tip.current;
    if (!host || !box || !el || !tooltip) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    const fg: RGB = [242, 242, 240], empty = mixRGB([0, 0, 0], fg, .11), colors: RGB[] = [empty, ...resolvePalette('github', true).map(hex)];
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
    const rows = [1, 3, 5].map(day => ({ day, label: weekday.format(dayMs(model.cells[day].date)) }));
    let width = 0, height = 0, pixelRatio = 1, left = 0, top = 22, size = 0, labelWidth = 0, hovered = -1, pinned = -1;
    const draw = () => {
      if (!width) return;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < model.cells.length; i++) {
        const cell = model.cells[i], x = left + (cell.week + .11) * size, y = top + (cell.day + .11) * size, w = size * .78;
        const base = colors[cell.level], dim = level >= 0 && cell.level !== level, focus = i === active;
        const color = dim ? base.map((v, channel) => v + (empty[channel] - v) * .72) : base;
        ctx.beginPath(); ctx.roundRect(x, y, w, w, size * .17); ctx.fillStyle = rgb(color); ctx.fill();
        if (focus) { ctx.strokeStyle = 'rgba(242,242,240,.85)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      ctx.font = `400 10px ${getComputedStyle(host).fontFamily || 'sans-serif'}`; ctx.fillStyle = rgb(mixRGB([0, 0, 0], fg, .55)); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      let edge = -Infinity;
      for (const month of model.months) { const x = left + (month.week + .11) * size, w = ctx.measureText(month.label).width; if (x >= edge && x + w <= width) { ctx.fillText(month.label, x, top - 3); edge = x + w + 6; } }
      if (labelWidth) { ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (const row of rows) ctx.fillText(row.label, left - 6, top + (row.day + .5) * size); }
      if (active >= 0) { const cell = model.cells[active], x = left + (cell.week + .5) * size, half = tooltip.offsetWidth / 2, center = Math.min(width - half - 2, Math.max(half + 2, x)); tooltip.style.transform = `translate(${center - half}px,${top + cell.day * size - 8}px) translateY(-100%)`; }
    };
    const layout = () => {
      width = Math.round(box.clientWidth); if (!width) return; ctx.font = `400 10px ${getComputedStyle(host).fontFamily || 'sans-serif'}`;
      labelWidth = width < 520 ? 0 : Math.ceil(Math.max(20, ...rows.map(row => ctx.measureText(row.label).width))) + 8; left = 2 + labelWidth; size = (width - labelWidth - 4) / model.weeks; height = Math.ceil(top + size * 7 + 2); pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      el.width = width * pixelRatio; el.height = height * pixelRatio; el.style.width = `${width}px`; el.style.height = `${height}px`; box.style.height = `${height}px`; draw();
    };
    const hit = (event: PointerEvent) => { const rect = el.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top, week = Math.floor((x - left) / size), day = Math.floor((y - top) / size); if (week < 0 || week >= model.weeks || day < 0 || day > 6) return -1; const ix = left + (week + .11) * size, iy = top + (day + .11) * size, w = size * .78; return x >= ix && x <= ix + w && y >= iy && y <= iy + w ? week * 7 + day : -1; };
    const activate = (next: number) => setActive(next);
    const move = (event: PointerEvent) => { if (event.pointerType !== 'mouse') return; hovered = hit(event); activate(hovered >= 0 ? hovered : pinned); el.style.cursor = hovered >= 0 ? 'pointer' : 'default'; };
    const up = (event: PointerEvent) => { const next = hit(event); pinned = next === pinned ? -1 : next; if (event.pointerType !== 'mouse') hovered = -1; activate(hovered >= 0 ? hovered : pinned); };
    const leave = () => { hovered = -1; activate(pinned); };
    const key = (event: KeyboardEvent) => { const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Escape','Enter',' ']; if (!keys.includes(event.key)) return; event.preventDefault(); if (event.key === 'Escape') pinned = -1; else { let i = pinned >= 0 ? pinned : active >= 0 ? active : model.cells.length - 1; if (event.key === 'ArrowLeft') i -= 7; if (event.key === 'ArrowRight') i += 7; if (event.key === 'ArrowUp') i--; if (event.key === 'ArrowDown') i++; if (event.key === 'Home') i = 0; if (event.key === 'End') i = model.cells.length - 1; pinned = Math.max(0, Math.min(model.cells.length - 1, i)); const c = model.cells[pinned]; setNotice(`${c.count || 'No'} submission${c.count === 1 ? '' : 's'} on ${c.date}`); } activate(pinned); };
    const observer = new ResizeObserver(layout); observer.observe(box); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointerleave', leave); el.addEventListener('keydown', key); layout();
    return () => { observer.disconnect(); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', leave); el.removeEventListener('keydown', key); };
  }, [model, active, level]);
  const colors = ['#1b1b1b', '#0e4429', '#006d32', '#26a641', '#39d353'];
  return <div ref={root} className="relative w-full font-tag text-xs text-muted"><div ref={stage} className="relative w-full overflow-hidden outline-offset-4 has-[:focus-visible]:outline-2" style={{ outlineColor: '#f2f2f0' }}><canvas ref={canvas} tabIndex={0} role="img" aria-label="LeetCode submissions heatmap. Use the arrow keys to read individual days." className="absolute top-0 left-0 block outline-none" /><div ref={tip} role="tooltip" aria-hidden={active < 0} className="pointer-events-none absolute top-0 left-0 z-20 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[12px] leading-none text-background shadow-lg" style={{ opacity: active >= 0 ? 1 : 0 }}>{active >= 0 && model.cells[active] ? <><strong>{model.cells[active].count || 'No'} submission{model.cells[active].count === 1 ? '' : 's'}</strong><span className="opacity-75"> on {model.cells[active].date}</span></> : ' '}</div></div><div className="flex items-center justify-end gap-1.5 pt-3" onMouseLeave={() => setLevel(-1)}><span className="mr-0.5">Less</span>{colors.map((color, index) => <button key={color} type="button" aria-label={`Highlight level ${index}`} aria-pressed={level === index} title={['No submissions','Light','Moderate','Heavy','Heaviest'][index]} onMouseEnter={() => setLevel(index)} onFocus={() => setLevel(index)} onBlur={() => setLevel(-1)} onClick={() => setLevel(value => value === index ? -1 : index)} className="h-[11px] w-[11px] rounded-[2px] border-0 p-0 hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-1" style={{ background: color, outlineColor: '#f2f2f0' }} />)}<span className="ml-0.5">More</span></div><p aria-live="polite" className="sr-only">{notice}</p></div>;
}

export default function CodingActivity() {
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [data, setData] = useState<ContributionDay[]>([]);
  useEffect(() => {
    let mounted = true; const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    const parse = (value: unknown): Record<string, number> => { if (typeof value === 'string') try { return JSON.parse(value); } catch { return {}; } return value && typeof value === 'object' ? value as Record<string, number> : {}; };
    Promise.all([fetch('https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2025', { signal: controller.signal }), fetch('https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2026', { signal: controller.signal })]).then(async responses => { clearTimeout(timeout); if (!responses.every(response => response.ok)) throw new Error('LeetCode calendar unavailable'); return Promise.all(responses.map(response => response.json())); }).then(([a, b]) => { const counts: Record<string, number> = {}; for (const calendar of [parse(a.submissionCalendar), parse(b.submissionCalendar)]) for (const [timestamp, count] of Object.entries(calendar)) { const value = Number(timestamp); if (!Number.isNaN(value)) { const date = new Date(value < 1e11 ? value * 1000 : value).toISOString().slice(0, 10); counts[date] = (counts[date] || 0) + Number(count); } } const days: ContributionDay[] = []; for (const date = new Date(Date.UTC(2025, 6, 1)), end = new Date(Date.UTC(2026, 6, 1)); date <= end; date.setUTCDate(date.getUTCDate() + 1)) { const key = date.toISOString().slice(0, 10); days.push({ date: key, count: counts[key] || 0 }); } if (mounted) { setData(days); setLoading(false); } }).catch(reason => { console.error('LeetCode calendar fetch error:', reason); if (mounted) { setError(true); setLoading(false); } });
    return () => { mounted = false; clearTimeout(timeout); controller.abort(); };
  }, []);
  return (
    <div
      className="w-[844px] max-w-full mt-8"
      style={{ width: '844px', maxWidth: '100%' }}
    >
      {loading && <p className="font-tag text-sm text-muted animate-pulse py-2">Loading...</p>}
      {error && (
        <p className="font-tag text-sm text-muted py-2">
          LeetCode activity temporarily unavailable (<a href="https://leetcode.com/u/nikhilvirdi/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://leetcode.com/u/nikhilvirdi/</a>)
        </p>
      )}
      {!loading && !error && data.length > 0 && <Heatmap data={data} />}
    </div>
  );
}
