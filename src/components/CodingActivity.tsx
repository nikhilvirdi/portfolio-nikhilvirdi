import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { dayMs, mixRGB, resolvePalette, type ContributionDay, type RGB } from './GitHubActivity';

const rgb = (c: number[]) => `rgb(${c.map(Math.round).join(',')})`;
const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5), 16),
];

const DAY_MS = 86400000;

export type CodingCell = {
  date: string;
  count: number;
  level: number;
  week: number;
  day: number;
};

export type CodingModel = {
  cells: CodingCell[];
  weeks: number;
  max: number;
  months: { week: number; label: string }[];
  coordMap: Map<string, number>;
};

const levelOf = (count: number, busy: number): number =>
  count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));

export function buildCodingGrid(days: ContributionDay[]): CodingModel {
  if (!days.length) {
    return {
      cells: [],
      weeks: 0,
      max: 0,
      months: [],
      coordMap: new Map(),
    };
  }

  // Week columns start on Sunday (day 0).
  // Weekdays: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat.
  const firstDayMs = dayMs(days[0].date);
  const firstDow = new Date(firstDayMs).getUTCDay();
  const startSundayMs = firstDayMs - firstDow * DAY_MS;

  const cells: CodingCell[] = [];
  const coordMap = new Map<string, number>();

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const ms = dayMs(d.date);
    const day = new Date(ms).getUTCDay();
    const week = Math.floor((ms - startSundayMs) / (7 * DAY_MS));
    cells.push({
      date: d.date,
      count: d.count,
      level: 0,
      week,
      day,
    });
    coordMap.set(`${week}:${day}`, i);
  }

  // Compute intensity levels based on 95th percentile of active days
  const nz = cells
    .map((c) => c.count)
    .filter((c) => c > 0)
    .sort((a, b) => a - b);
  const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
  for (const c of cells) {
    c.level = levelOf(c.count, busy);
  }

  const weeks = cells.length ? cells[cells.length - 1].week + 1 : 0;
  const max = nz.length ? nz[nz.length - 1] : 0;

  // Month labels
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
  const months: { week: number; label: string }[] = [];
  let prevMonth = -1;
  for (const c of cells) {
    const m = Number(c.date.slice(5, 7));
    if (m !== prevMonth) {
      months.push({ week: c.week, label: fmt.format(dayMs(c.date)) });
      prevMonth = m;
    }
  }

  return { cells, weeks, max, months, coordMap };
}

// ==================================================
// Shared LeetCode Data Fetching (Singleton Store)
// ==================================================
type LeetCodeState = {
  loading: boolean;
  error: boolean;
  data: ContributionDay[];
};

let sharedState: LeetCodeState = {
  loading: true,
  error: false,
  data: [],
};

const listeners = new Set<() => void>();
let fetchPromise: Promise<void> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LeetCodeState {
  return sharedState;
}

function setSharedState(next: LeetCodeState) {
  sharedState = next;
  listeners.forEach((l) => l());
}

export function fetchLeetCodeDataOnce(): Promise<void> {
  if (fetchPromise) return fetchPromise;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const parse = (value: unknown): Record<string, number> => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value && typeof value === 'object' ? (value as Record<string, number>) : {};
  };

  fetchPromise = Promise.all([
    fetch('https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2025', { signal: controller.signal }),
    fetch('https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2026', { signal: controller.signal }),
  ])
    .then(async (responses) => {
      clearTimeout(timeout);
      if (!responses.every((res) => res.ok)) {
        throw new Error('LeetCode calendar unavailable');
      }
      return Promise.all(responses.map((res) => res.json()));
    })
    .then(([data2025, data2026]) => {
      const counts: Record<string, number> = {};
      for (const cal of [parse(data2025.submissionCalendar), parse(data2026.submissionCalendar)]) {
        for (const [timestamp, count] of Object.entries(cal)) {
          const val = Number(timestamp);
          if (!Number.isNaN(val)) {
            const dateStr = new Date(val < 1e11 ? val * 1000 : val).toISOString().slice(0, 10);
            counts[dateStr] = (counts[dateStr] || 0) + Number(count);
          }
        }
      }

      // Range: April 1, 2025 through current date dynamically
      const startDate = new Date(Date.UTC(2025, 3, 1)); // 2025-04-01
      const now = new Date();
      const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const days: ContributionDay[] = [];
      for (
        const cur = new Date(startDate.getTime());
        cur <= endDate;
        cur.setUTCDate(cur.getUTCDate() + 1)
      ) {
        const key = cur.toISOString().slice(0, 10);
        days.push({
          date: key,
          count: counts[key] || 0,
        });
      }

      setSharedState({
        loading: false,
        error: false,
        data: days,
      });
    })
    .catch((err) => {
      clearTimeout(timeout);
      console.error('LeetCode calendar fetch error:', err);
      setSharedState({
        loading: false,
        error: true,
        data: [],
      });
    });

  return fetchPromise;
}

export function useLeetCodeActivity() {
  useEffect(() => {
    fetchLeetCodeDataOnce();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}

function Heatmap({ data }: { data: ContributionDay[] }) {
  const model = useMemo(() => buildCodingGrid(data), [data]);
  const [active, setActive] = useState(-1);
  const [level, setLevel] = useState(-1);
  const [notice, setNotice] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const scrollBox = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const kickRef = useRef<(() => void) | null>(null);
  const levelRef = useRef(level);
  levelRef.current = level;

  // Trigger animation transition when legend highlight level changes
  useEffect(() => {
    kickRef.current?.();
  }, [level]);

  useEffect(() => {
    const host = root.current;
    const scrollEl = scrollBox.current;
    const box = stage.current;
    const el = canvas.current;
    const tooltip = tip.current;
    if (!host || !scrollEl || !box || !el || !tooltip || !model.weeks) return;

    const ctx = el.getContext('2d');
    if (!ctx) return;

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = reduceMq.matches;

    const fg: RGB = [242, 242, 240];
    const bg: RGB = [0, 0, 0];
    const empty = mixRGB(bg, fg, 0.11);
    const colors: RGB[] = [empty, ...resolvePalette('github', true).map(hex)];
    const ex = empty[0];
    const ey = empty[1];
    const ez = empty[2];

    const rows = [
      { day: 1, label: 'Mon' },
      { day: 3, label: 'Wed' },
      { day: 5, label: 'Fri' },
    ];

    const n = model.cells.length;
    const lv = new Uint8Array(n);
    const hover = new Float32Array(n);
    const dim = new Float32Array(n);
    for (let i = 0; i < n; i++) lv[i] = model.cells[i].level;

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let left = 0;
    const top = 22;
    let s = 15;
    let labelWidth = 0;
    let hovered = -1;
    let pinned = -1;
    let activeIdx = -1;
    let raf = 0;
    let last = 0;

    const draw = () => {
      if (!width) return;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const outline = 0.07;
      const w = s * 0.78;
      const radius = s * 0.17;

      for (let i = 0; i < n; i++) {
        const cell = model.cells[i];
        const x = left + (cell.week + 0.11) * s;
        const y = top + (cell.day + 0.11) * s;

        const base = colors[cell.level];
        let r = base[0];
        let g = base[1];
        let bl = base[2];

        // Dimming when a legend level is hovered/selected (exact match to GitHubActivity lines 759-764)
        const d = dim[i];
        if (d > 0.002) {
          r += (ex - r) * 0.72 * d;
          g += (ey - g) * 0.72 * d;
          bl += (ez - bl) * 0.72 * d;
        }

        // Hover glow / fill lightening (exact match to GitHubActivity lines 765-771)
        const hv = hover[i];
        if (hv > 0.002) {
          const m = 0.16 * hv;
          r += (fg[0] - r) * m;
          g += (fg[1] - g) * m;
          bl += (fg[2] - bl) * m;
        }

        ctx.beginPath();
        ctx.roundRect(x, y, w, w, radius);
        ctx.fillStyle = rgb([r, g, bl]);
        ctx.fill();

        // Subtle base outline on every cell (exact match to GitHubActivity lines 788-792)
        if (outline > 0.004) {
          ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${outline.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Active/hover outline (exact match to GitHubActivity lines 793-797)
        if (hv > 0.02) {
          ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${(0.85 * hv).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Labels (exact match to GitHubActivity lines 801-820)
      const muted = mixRGB(bg, fg, 0.55);
      ctx.font = `400 10px ${getComputedStyle(host).fontFamily || 'sans-serif'}`;
      ctx.fillStyle = `rgba(${Math.round(muted[0])},${Math.round(muted[1])},${Math.round(muted[2])},1)`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';

      let edge = -Infinity;
      for (const month of model.months) {
        const x = left + (month.week + 0.11) * s;
        const mw = ctx.measureText(month.label).width;
        if (x >= edge) {
          ctx.fillText(month.label, x, top - 3);
          edge = x + mw + 6;
        }
      }

      if (labelWidth) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (const row of rows) {
          ctx.fillText(row.label, left - 6, top + (row.day + 0.5) * s);
        }
      }

      // Tooltip position (exact match to GitHubActivity lines 835-844)
      if (activeIdx >= 0 && model.cells[activeIdx]) {
        const cell = model.cells[activeIdx];
        const tx = left + (cell.week + 0.5) * s;
        const ty = top + (cell.day + 0.11) * s;
        const half = tooltip.offsetWidth / 2;
        const center = Math.min(width - half - 2, Math.max(half + 2, tx));
        tooltip.style.transform = `translate(${(center - half).toFixed(1)}px,${(ty - 8).toFixed(1)}px) translateY(-100%)`;
      }
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      let moving = false;

      const kh = reduced ? 1 : 1 - Math.exp(-dt * 16);
      const kd = reduced ? 1 : 1 - Math.exp(-dt * 10);
      const leg = levelRef.current;

      for (let i = 0; i < n; i++) {
        const hg = i === activeIdx ? 1 : 0;
        const dg = leg >= 0 && lv[i] !== leg ? 1 : 0;
        const h = hover[i];
        const d = dim[i];
        if (h !== hg) {
          hover[i] = Math.abs(hg - h) < 0.003 ? hg : h + (hg - h) * kh;
          moving = true;
        }
        if (d !== dg) {
          dim[i] = Math.abs(dg - d) < 0.003 ? dg : d + (dg - d) * kd;
          moving = true;
        }
      }

      draw();
      if (moving) raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    kickRef.current = kick;

    const layout = () => {
      ctx.font = `400 10px ${getComputedStyle(host).fontFamily || 'sans-serif'}`;
      labelWidth = Math.ceil(Math.max(20, ...rows.map((row) => ctx.measureText(row.label).width))) + 8;
      left = 2 + labelWidth;

      // Exact single source of truth week-step formula from GitHubActivity:
      // (844px desktop content width - gutter - 4) / 53 reference weeks
      s = (844 - labelWidth - 4) / 53;

      width = Math.ceil(left + model.weeks * s + 4);
      height = Math.ceil(top + s * 7 + 4);
      pixelRatio = Math.min(2, window.devicePixelRatio || 1);

      el.width = Math.round(width * pixelRatio);
      el.height = Math.round(height * pixelRatio);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;

      box.style.width = `${width}px`;
      box.style.height = `${height}px`;

      kick();
    };

    const refreshActive = () => {
      const next = hovered >= 0 ? hovered : pinned;
      if (next === activeIdx) return;
      activeIdx = next;
      setActive(next);
      kick();
    };

    const hit = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const week = Math.floor((x - left) / s);
      const day = Math.floor((y - top) / s);
      if (week < 0 || week >= model.weeks || day < 0 || day > 6) return -1;
      const cellIndex = model.coordMap.get(`${week}:${day}`);
      if (cellIndex === undefined) return -1;
      const cell = model.cells[cellIndex];
      const ix = left + (cell.week + 0.11) * s;
      const iy = top + (cell.day + 0.11) * s;
      const w = s * 0.78;
      return x >= ix && x <= ix + w && y >= iy && y <= iy + w ? cellIndex : -1;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      hovered = hit(event);
      refreshActive();
      el.style.cursor = hovered >= 0 ? 'pointer' : 'default';
    };

    const up = (event: PointerEvent) => {
      const next = hit(event);
      pinned = next === pinned ? -1 : next;
      if (event.pointerType !== 'mouse') hovered = -1;
      refreshActive();
    };

    const leave = () => {
      hovered = -1;
      refreshActive();
    };

    const key = (event: KeyboardEvent) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape', 'Enter', ' '];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Escape') {
        pinned = -1;
      } else {
        let i = pinned >= 0 ? pinned : activeIdx >= 0 ? activeIdx : model.cells.length - 1;
        if (event.key === 'ArrowLeft') {
          const cur = model.cells[i];
          const target = model.coordMap.get(`${cur.week - 1}:${cur.day}`);
          if (target !== undefined) i = target;
        } else if (event.key === 'ArrowRight') {
          const cur = model.cells[i];
          const target = model.coordMap.get(`${cur.week + 1}:${cur.day}`);
          if (target !== undefined) i = target;
        } else if (event.key === 'ArrowUp') {
          if (i > 0) i--;
        } else if (event.key === 'ArrowDown') {
          if (i < model.cells.length - 1) i++;
        } else if (event.key === 'Home') {
          i = 0;
        } else if (event.key === 'End') {
          i = model.cells.length - 1;
        }
        pinned = i;
        const c = model.cells[pinned];
        if (c) {
          setNotice(`${c.count || 'No'} submission${c.count === 1 ? '' : 's'} on ${c.date}`);
          // Ensure keyboard focused cell is scrolled into view
          const cellX = left + (c.week + 0.5) * s;
          if (cellX < scrollEl.scrollLeft + 40) {
            scrollEl.scrollLeft = Math.max(0, cellX - 50);
          } else if (cellX > scrollEl.scrollLeft + scrollEl.clientWidth - 40) {
            scrollEl.scrollLeft = cellX - scrollEl.clientWidth + 50;
          }
        }
      }
      refreshActive();
    };

    const onReduce = () => {
      reduced = reduceMq.matches;
      kick();
    };
    reduceMq.addEventListener('change', onReduce);

    const observer = new ResizeObserver(layout);
    observer.observe(scrollEl);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('keydown', key);
    layout();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      reduceMq.removeEventListener('change', onReduce);
      observer.disconnect();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('keydown', key);
    };
  }, [model]);

  const colors = ['#1b1b1b', '#0e4429', '#006d32', '#26a641', '#39d353'];

  return (
    <div ref={root} className="relative w-full font-tag text-xs text-muted">
      {/* Horizontally scrollable container for the full April 2025 -> current date heatmap */}
      <div
        ref={scrollBox}
        className="w-full overflow-x-auto overflow-y-hidden pb-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#27272a #000000',
        }}
      >
        <div
          ref={stage}
          className="relative overflow-hidden outline-offset-4 has-[:focus-visible]:outline-2"
          style={{ outlineColor: '#f2f2f0' }}
        >
          <canvas
            ref={canvas}
            tabIndex={0}
            role="img"
            aria-label="LeetCode submissions heatmap. Use the arrow keys to read individual days."
            className="absolute top-0 left-0 block outline-none"
          />
          <div
            ref={tip}
            role="tooltip"
            aria-hidden={active < 0}
            className="pointer-events-none absolute top-0 left-0 z-20 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[12px] leading-none text-background shadow-lg"
            style={{ opacity: active >= 0 ? 1 : 0 }}
          >
            {active >= 0 && model.cells[active] ? (
              <>
                <strong>
                  {model.cells[active].count || 'No'} submission
                  {model.cells[active].count === 1 ? '' : 's'}
                </strong>
                <span className="opacity-75"> on {model.cells[active].date}</span>
              </>
            ) : (
              ' '
            )}
          </div>
        </div>
      </div>

      {/* Legend below the scrollable container */}
      <div className="flex items-center justify-end gap-1.5 pt-3" onMouseLeave={() => setLevel(-1)}>
        <span className="mr-0.5">Less</span>
        {colors.map((color, index) => (
          <button
            key={color}
            type="button"
            aria-label={`Highlight level ${index}`}
            aria-pressed={level === index}
            title={['No submissions', 'Light', 'Moderate', 'Heavy', 'Heaviest'][index]}
            onMouseEnter={() => setLevel(index)}
            onFocus={() => setLevel(index)}
            onBlur={() => setLevel(-1)}
            onClick={() => setLevel((value) => (value === index ? -1 : index))}
            className="h-[11px] w-[11px] rounded-[2px] border-0 p-0 hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              background: color,
              outlineColor: '#f2f2f0',
              boxShadow: 'inset 0 0 0 1px rgba(127,127,127,0.12)',
            }}
          />
        ))}
        <span className="ml-0.5">More</span>
      </div>
      <p aria-live="polite" className="sr-only">
        {notice}
      </p>
    </div>
  );
}

export default function CodingActivity() {
  const { loading, error, data } = useLeetCodeActivity();

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
