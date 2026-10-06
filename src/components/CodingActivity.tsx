import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { dayMs, mixRGB, resolvePalette, type ContributionDay, type RGB } from './GitHubActivity';
import leetcodeSnapshot from '../data/leetcode-activity.json';

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

function normalizeSubmissionCounts(counts: Record<string, number>): ContributionDay[] {
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
  return days;
}

export const LEETCODE_CACHE_KEY = 'leetcode_activity_contributions';

export function saveCachedLeetCodeContributions(data: ContributionDay[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LEETCODE_CACHE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('Failed to cache LeetCode contributions in localStorage:', err);
  }
}

export function loadCachedLeetCodeContributions(): ContributionDay[] | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(LEETCODE_CACHE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    const validated: ContributionDay[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as { date?: unknown }).date === 'string' &&
        typeof (item as { count?: unknown }).count === 'number' &&
        Number.isFinite((item as { count: number }).count) &&
        (item as { count: number }).count >= 0
      ) {
        const dateStr = (item as { date: string }).date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          validated.push({
            date: dateStr,
            count: (item as { count: number }).count,
          });
        }
      }
    }

    if (validated.length === 0) {
      return null;
    }

    return validated;
  } catch (err) {
    console.warn('Failed to load cached LeetCode contributions from localStorage:', err);
    return null;
  }
}

function getFallbackSnapshotDays(): ContributionDay[] | null {
  try {
    const snapshot = leetcodeSnapshot as
      | {
          days?: Record<string, number>;
          totalSubmissions?: number;
        }
      | undefined;
    const daysMap = snapshot?.days;
    if (daysMap && typeof daysMap === 'object' && Object.keys(daysMap).length > 0) {
      const hasAnySubmissions =
        (typeof snapshot?.totalSubmissions === 'number' && snapshot.totalSubmissions > 0) ||
        Object.values(daysMap).some((c) => Number(c) > 0);
      if (hasAnySubmissions) {
        const normalized = normalizeSubmissionCounts(daysMap);
        if (normalized.length > 0) {
          return normalized;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load LeetCode snapshot:', err);
  }
  return null;
}

export function resetLeetCodeFetchPromise(): void {
  fetchPromise = null;
}

export function fetchLeetCodeDataOnce(force = false): Promise<void> {
  if (fetchPromise && !force) return fetchPromise;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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
      let hasData = false;
      for (const cal of [parse(data2025?.submissionCalendar), parse(data2026?.submissionCalendar)]) {
        for (const [timestamp, count] of Object.entries(cal)) {
          const val = Number(timestamp);
          if (!Number.isNaN(val)) {
            const dateStr = new Date(val < 1e11 ? val * 1000 : val).toISOString().slice(0, 10);
            const numCount = Number(count);
            counts[dateStr] = (counts[dateStr] || 0) + numCount;
            if (numCount > 0) {
              hasData = true;
            }
          }
        }
      }

      if (!hasData) {
        throw new Error('LeetCode fresh request returned empty data');
      }

      const days = normalizeSubmissionCounts(counts);
      if (!Array.isArray(days) || days.length === 0) {
        throw new Error('LeetCode normalized data is empty or invalid');
      }

      saveCachedLeetCodeContributions(days);

      setSharedState({
        loading: false,
        error: false,
        data: days,
      });
    })
    .catch((err) => {
      clearTimeout(timeout);
      fetchPromise = null;
      console.warn('LeetCode live fetch failed or timed out, trying cache fallback:', err);

      // 1. Try client-side localStorage cache
      const cachedDays = loadCachedLeetCodeContributions();
      if (cachedDays && cachedDays.length > 0) {
        setSharedState({
          loading: false,
          error: false,
          data: cachedDays,
        });
        return;
      }

      // 2. Try committed static snapshot fallback
      const fallbackDays = getFallbackSnapshotDays();
      if (fallbackDays && fallbackDays.length > 0) {
        setSharedState({
          loading: false,
          error: false,
          data: fallbackDays,
        });
        return;
      }

      // 3. Both failed: show unavailable error state
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

// ==================================================
// Game Mode Layout Geometry
// Sequence: heatmap (0..height) → game space (50px) → 🚀 shooter (20px) → breathing room (40px)
// Total Game Mode vertical height: height + 110px (~1.82×, strictly derived from actual layout)
// ==================================================
const GAME_SPACE_BELOW_HEATMAP = 50; // Vertical space below heatmap to shooter top
const SHOOTER_HEIGHT = 20; // Spacecraft sprite height
const SHOOTER_BREATHING_ROOM = 40; // Clearance below spacecraft & glow animation
const GAME_EXTRA_HEIGHT = GAME_SPACE_BELOW_HEATMAP + SHOOTER_HEIGHT + SHOOTER_BREATHING_ROOM; // 110px

// ==================================================
// Kenney Pixel Shmup Assets
// ==================================================
const SHIPS = [
  { id: 0, name: 'Ship 1', src: '/assets/game/ships/ship_0000.png', fireRate: 6 },
  { id: 1, name: 'Ship 2', src: '/assets/game/ships/ship_0001.png', fireRate: 8 },
  { id: 2, name: 'Ship 3', src: '/assets/game/ships/ship_0002.png', fireRate: 4 },
  { id: 3, name: 'Ship 4', src: '/assets/game/ships/ship_0003.png', fireRate: 4 },
  { id: 4, name: 'Ship 5', src: '/assets/game/ships/ship_0004.png', fireRate: 8 },
  { id: 5, name: 'Ship 6', src: '/assets/game/ships/ship_0005.png', fireRate: 6 },
  { id: 6, name: 'Ship 7', src: '/assets/game/ships/ship_0006.png', fireRate: 8 },
  { id: 7, name: 'Ship 8', src: '/assets/game/ships/ship_0007.png', fireRate: 4 },
  { id: 8, name: 'Ship 9', src: '/assets/game/ships/ship_0008.png', fireRate: 6 },
  { id: 9, name: 'Ship 10', src: '/assets/game/ships/ship_0009.png', fireRate: 6 },
  { id: 10, name: 'Ship 11', src: '/assets/game/ships/ship_0010.png', fireRate: 8 },
  { id: 11, name: 'Ship 12', src: '/assets/game/ships/ship_0011.png', fireRate: 4 },
] as const;

const PROJECTILES = [
  { id: 'laser', name: 'Laser', src: '/assets/game/projectiles/tile_0000.png', attack: 1.0 },
  { id: 'twin', name: 'Twin Laser', src: '/assets/game/projectiles/tile_0001.png', attack: 1.0 },
  { id: 'pulse', name: 'Pulse', src: '/assets/game/projectiles/tile_0002.png', attack: 1.5 },
  { id: 'plasma', name: 'Plasma', src: '/assets/game/projectiles/tile_0003.png', attack: 2.0 },
  { id: 'missile', name: 'Missile', src: '/assets/game/projectiles/tile_0012.png', attack: 0.5 },
] as const;

type ProjectileId = typeof PROJECTILES[number]['id'];
type ProjectileConfig = typeof PROJECTILES[number];

const PROJECTILE_MAP = new Map<ProjectileId, ProjectileConfig>(
  PROJECTILES.map((proj) => [proj.id, proj])
);

// Predefined palette colors for level interpolation (0..4)
const fgRGB: RGB = [242, 242, 240];
const bgRGB: RGB = [0, 0, 0];
const emptyRGB = mixRGB(bgRGB, fgRGB, 0.11);
const GAME_COLORS: RGB[] = [emptyRGB, ...resolvePalette('github', true).map(hex)];

export function interpolateLevelColor(palette: RGB[], level: number): RGB {
  if (level <= 0) return palette[0];
  if (level >= palette.length - 1) return palette[palette.length - 1];
  const low = Math.floor(level);
  const high = Math.min(palette.length - 1, low + 1);
  const frac = level - low;
  if (frac <= 0.0001) return palette[low];
  return mixRGB(palette[low], palette[high], frac);
}

// Preload assets into image cache for instantaneous, flicker-free rendering
const shipImages: HTMLImageElement[] = [];
const projectileImages = new Map<ProjectileId, HTMLImageElement>();

if (typeof window !== 'undefined') {
  SHIPS.forEach((ship) => {
    const img = new Image();
    img.src = ship.src;
    shipImages[ship.id] = img;
  });
  PROJECTILES.forEach((proj) => {
    const img = new Image();
    img.src = proj.src;
    projectileImages.set(proj.id, img);
  });
}

// ==================================================
// Arcade Victory Bitmap Lettering
// Message 1: "HELLO WORLD!! FROM"
// Message 2: "NIKHIL VIRDI"
// ==================================================

interface MessagePixel {
  relRow: number;
  relCol: number;
}

const MSG1_PATHS: Record<string, [number, number][]> = {
  H: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // left stem (up)
    [2, 1],                                 // crossbar
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], // right stem (down)
  ],
  E: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
    [0, 1], [0, 2],                         // top bar
    [2, 2], [2, 1],                         // mid bar
    [4, 1], [4, 2],                         // bottom bar
  ],
  L: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], // stem (down)
    [4, 1], [4, 2],                         // base
  ],
  O: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // left stem (up)
    [0, 1],                                 // top
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], // right stem (down)
    [4, 1],                                 // bottom
  ],
  W: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], // left stem (down)
    [4, 1], [3, 2], [2, 2],                 // center peak (up)
    [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4], // right stem (up)
  ],
  R: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
    [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], // top loop
    [3, 2], [4, 2],                         // leg
  ],
  D: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
    [0, 1], [1, 2], [2, 2], [3, 2], [4, 1], // curve
  ],
  '!': [
    [0, 0], [1, 0], [2, 0],                 // stem (down)
    [4, 0],                                 // dot
  ],
  F: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
    [0, 1], [0, 2],                         // top bar
    [2, 2], [2, 1],                         // mid bar
  ],
  M: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // left stem (up)
    [1, 1], [2, 2], [1, 3],                 // center V
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], // right stem (down)
  ],
};

const MSG1_WIDTHS: Record<string, number> = {
  H: 3,
  E: 3,
  L: 3,
  O: 3,
  W: 5,
  R: 3,
  D: 3,
  '!': 1,
  F: 3,
  M: 5,
  ' ': 2,
};

const MSG1_TOKENS = [
  'H', 'E', 'L', 'L', 'O',
  ' ',
  'W', 'O', 'R', 'L', 'D', '!', '!',
  ' ',
  'F', 'R', 'O', 'M',
];

const MSG2_PATHS: Record<string, [number, number][]> = {
  N: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], // left stem (down)
    [1, 1], [2, 2],                         // diagonal
    [4, 3], [3, 3], [2, 3], [1, 3], [0, 3], // right stem (up)
  ],
  I: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], // stem (down)
  ],
  I_UP: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
  ],
  K: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
    [2, 1], [1, 2], [0, 3],                 // top diagonal
    [3, 2], [4, 3],                         // bottom diagonal
  ],
  H: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // left stem (up)
    [2, 1], [2, 2],                         // crossbar
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], // right stem (down)
  ],
  L: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], // stem (down)
    [4, 1], [4, 2],                         // base
  ],
  V: [
    [0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [3, 3], [2, 3], [1, 4], [0, 4],
  ],
  R: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
    [0, 1], [0, 2], [1, 3], [2, 2], [2, 1], // loop
    [3, 2], [4, 3],                         // leg
  ],
  D: [
    [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], // stem (up)
    [0, 1], [0, 2], [1, 3], [2, 3], [3, 3], [4, 2], [4, 1], // curve
  ],
};

const MSG2_WIDTHS: Record<string, number> = {
  N: 4,
  I: 1,
  I_UP: 1,
  K: 4,
  H: 4,
  L: 3,
  ' ': 2,
  V: 5,
  R: 4,
  D: 4,
};

const MSG2_TOKENS = ['N', 'I', 'K', 'H', 'I_UP', 'L', ' ', 'V', 'I', 'R', 'D', 'I_UP'];

function buildMessagePixels(
  tokens: string[],
  paths: Record<string, [number, number][]>,
  widths: Record<string, number>
): { pixels: MessagePixel[]; totalWidth: number } {
  const pixels: MessagePixel[] = [];
  let col = 0;

  for (const token of tokens) {
    if (token === ' ') {
      col += widths[' '] || 2;
      continue;
    }
    const path = paths[token];
    if (path) {
      for (const [r, c] of path) {
        pixels.push({ relRow: r, relCol: col + c });
      }
      col += (widths[token] || 3) + 1; // 1 column spacing between letters
    }
  }

  return { pixels, totalWidth: col > 0 ? col - 1 : 0 };
}

const MESSAGE_1 = buildMessagePixels(MSG1_TOKENS, MSG1_PATHS, MSG1_WIDTHS);
const MESSAGE_2 = buildMessagePixels(MSG2_TOKENS, MSG2_PATHS, MSG2_WIDTHS);

// Discrete green levels for Phase 2 blinking (4 blinks across 2 seconds)
// Exactly maps the heatmap contribution levels from brightest to darkest
const PHASE_2_PALETTE = [
  '#39d353', // Blink 1: Level 4 (brightest green)
  '#26a641', // Blink 2: Level 3 (medium green)
  '#006d32', // Blink 3: Level 2 (darker green)
  '#0e4429', // Blink 4: Level 1 (darkest green)
];

// Discrete green levels for Phase 4 blinking (8 blinks across 4 seconds)
// Stepped discretely per blink from Level 4 down to Level 1
const PHASE_4_PALETTE = [
  '#39d353', // Blink 1: Level 4 (brightest green)
  '#30ba49', // Blink 2
  '#26a641', // Blink 3: Level 3 (medium green)
  '#1b923c', // Blink 4
  '#0d7c35', // Blink 5
  '#006d32', // Blink 6: Level 2 (darker green)
  '#07592e', // Blink 7
  '#0e4429', // Blink 8: Level 1 (darkest green)
];

function Heatmap({ data }: { data: ContributionDay[] }) {
  const model = useMemo(() => buildCodingGrid(data), [data]);
  const [active, setActive] = useState(-1);
  const [level, setLevel] = useState(-1);
  const [notice, setNotice] = useState('');
  const [gameMode, setGameMode] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const isCompletingRef = useRef(false);
  const [selectedProjectile, setSelectedProjectile] = useState<ProjectileId>('laser');
  const [selectedShipIndex, setSelectedShipIndex] = useState<number>(0);

  const selectedProjectileRef = useRef<ProjectileId>(selectedProjectile);
  selectedProjectileRef.current = selectedProjectile;
  const selectedShipRef = useRef<number>(selectedShipIndex);
  selectedShipRef.current = selectedShipIndex;

  const root = useRef<HTMLDivElement>(null);
  const scrollBox = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const gameCanvas = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const kickRef = useRef<(() => void) | null>(null);
  const layoutRef = useRef<(() => void) | null>(null);
  const cellHealthRef = useRef<Map<string, number> | null>(null);
  const levelRef = useRef(level);
  levelRef.current = level;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;

  const handleToggleGameMode = () => {
    if (isCompletingRef.current) return;
    setGameMode((prev) => !prev);
  };

  // Trigger animation transition when legend highlight level changes
  useEffect(() => {
    kickRef.current?.();
  }, [level]);

  // Trigger redraw and layout update when game mode changes
  useEffect(() => {
    gameModeRef.current = gameMode;
    if (!gameMode) {
      cellHealthRef.current = null;
    }
    layoutRef.current?.();
    kickRef.current?.();
  }, [gameMode]);

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

        const currentLevel = (gameModeRef.current && cellHealthRef.current)
          ? (cellHealthRef.current.get(cell.date) ?? cell.level)
          : cell.level;
        const base = interpolateLevelColor(colors, currentLevel);
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

      // Hide month labels when game mode is active
      if (!gameModeRef.current) {
        let edge = -Infinity;
        for (const month of model.months) {
          const x = left + (month.week + 0.11) * s;
          const mw = ctx.measureText(month.label).width;
          if (x >= edge) {
            ctx.fillText(month.label, x, top - 3);
            edge = x + mw + 6;
          }
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
      draw();
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

      const targetHeight = gameModeRef.current ? height + GAME_EXTRA_HEIGHT : height;
      box.style.width = `${width}px`;
      box.style.height = `${targetHeight}px`;

      if (gameCanvas.current && gameModeRef.current) {
        const gCanvas = gameCanvas.current;
        const gameHeight = height + GAME_EXTRA_HEIGHT;
        gCanvas.width = Math.round(width * pixelRatio);
        gCanvas.height = Math.round(gameHeight * pixelRatio);
        gCanvas.style.width = `${width}px`;
        gCanvas.style.height = `${gameHeight}px`;
      }

      kick();
    };
    layoutRef.current = layout;

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
      if (gameModeRef.current || isCompletingRef.current) return;
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
      layoutRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      reduceMq.removeEventListener('change', onReduce);
      observer.disconnect();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('keydown', key);
    };
  }, [model]);

  // Game Mode Canvas Setup and Game Loop
  useEffect(() => {
    const box = stage.current;
    
    if (!gameMode) {
      // When game mode is off, ensure the stage returns to normal compact heatmap height
      cellHealthRef.current = null;
      layoutRef.current?.();
      kickRef.current?.();
      return;
    }

    const host = root.current;
    const scrollEl = scrollBox.current;
    const gCanvas = gameCanvas.current;
    if (!host || !scrollEl || !box || !gCanvas || !model.weeks) return;

    const gCtx = gCanvas.getContext('2d');
    if (!gCtx) return;

    // Check for reduced motion preference
    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = reduceMq.matches;

    // If user prefers reduced motion, significantly reduce animation speed
    const motionScale = reduced ? 0.3 : 1.0;

    // Use the same layout calculations as the main heatmap
    const rows = [
      { day: 1, label: 'Mon' },
      { day: 3, label: 'Wed' },
      { day: 5, label: 'Fri' },
    ];

    gCtx.font = `400 10px ${getComputedStyle(host).fontFamily || 'sans-serif'}`;
    const labelWidth = Math.ceil(Math.max(20, ...rows.map((row) => gCtx.measureText(row.label).width))) + 8;
    const left = 2 + labelWidth;
    const top = 22;
    const s = (844 - labelWidth - 4) / 53;
    const width = Math.ceil(left + model.weeks * s + 4);
    const height = Math.ceil(top + s * 7 + 4);
    const gameHeight = height + GAME_EXTRA_HEIGHT;
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);

    gCanvas.width = Math.round(width * pixelRatio);
    gCanvas.height = Math.round(gameHeight * pixelRatio);
    gCanvas.style.width = `${width}px`;
    gCanvas.style.height = `${gameHeight}px`;

    // Adjust the stage container to accommodate the extended game canvas
    box.style.height = `${gameHeight}px`;

    // Temporary game state - cell health levels
    const cellHealth = new Map<string, number>();
    let initialActiveCount = 0;
    model.cells.forEach((cell) => {
      cellHealth.set(cell.date, cell.level);
      if (cell.level > 0) initialActiveCount++;
    });
    cellHealthRef.current = cellHealth;
    kickRef.current?.();

    const cellWidth = s * 0.78;

    // Active contribution region tracking and column-based spatial indexing
    let activeMinX = Infinity;
    let activeMaxX = -Infinity;
    let activeMinY = Infinity;
    let activeMaxY = -Infinity;
    let activeMinWeek = Infinity;
    let activeMaxWeek = -Infinity;
    let hasActiveRegion = false;
    const activeColumns = new Map<number, CodingCell[]>();

    const updateActiveRegion = () => {
      activeColumns.clear();
      let minW = Infinity;
      let maxW = -Infinity;
      let minD = Infinity;
      let maxD = -Infinity;
      let count = 0;

      for (let i = 0; i < model.cells.length; i++) {
        const cell = model.cells[i];
        const health = cellHealth.get(cell.date) ?? 0;
        if (health > 0) {
          count++;
          if (cell.week < minW) minW = cell.week;
          if (cell.week > maxW) maxW = cell.week;
          if (cell.day < minD) minD = cell.day;
          if (cell.day > maxD) maxD = cell.day;

          let colList = activeColumns.get(cell.week);
          if (!colList) {
            colList = [];
            activeColumns.set(cell.week, colList);
          }
          colList.push(cell);
        }
      }

      if (count > 0) {
        hasActiveRegion = true;
        activeMinWeek = minW;
        activeMaxWeek = maxW;
        activeMinX = left + (minW + 0.11) * s;
        activeMaxX = left + (maxW + 0.11) * s + cellWidth;
        activeMinY = top + (minD + 0.11) * s;
        activeMaxY = top + (maxD + 0.11) * s + cellWidth;
      } else {
        hasActiveRegion = false;
        activeMinWeek = Infinity;
        activeMaxWeek = -Infinity;
        activeMinX = Infinity;
        activeMaxX = -Infinity;
        activeMinY = Infinity;
        activeMaxY = -Infinity;
      }
    };

    updateActiveRegion();

    // Game state
    type Star = { x: number; y: number; speed: number; size: number; alpha: number };
    type Bullet = { x: number; y: number; vy: number; width: number; height: number; type: ProjectileId; attack: number };
    type Particle = { x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number; life: number; maxLife: number };

    const stars: Star[] = Array.from({ length: reduced ? 70 : 140 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * gameHeight,
      speed: (Math.random() * 0.4 + 0.1) * motionScale,
      size: Math.random() * 1.2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const player = {
      x: width / 2 - 15,
      y: height + GAME_SPACE_BELOW_HEATMAP, // Position below the heatmap
      width: 30,
      height: SHOOTER_HEIGHT,
      speed: 4 * motionScale,
      direction: 1,
      color: '#38bdf8',
    };

    let bullets: Bullet[] = [];
    let particles: Particle[] = [];
    let lastShot = 0;

    type CompletionPhase =
      | 'none'
      | 'p1_draw'
      | 'p1_pause'
      | 'p2_blink'
      | 'p3_draw'
      | 'p3_pause'
      | 'p4_blink'
      | 'done';

    let completionPhase: CompletionPhase = 'none';
    let completionStartTime = 0;
    let currentPixelIndex = 0;
    let flashVisible = true;
    let currentFlashColor = '#39d353';

    const PIXEL_INTERVAL = reduced ? 14 : 22;
    const PAUSE_DURATION = 200;
    const BLINK_1_DURATION = 2000;
    const BLINK_2_DURATION = 4000;
    const BLINK_CYCLE = 500; // 280ms ON, 220ms OFF

    const startCol1 = Math.max(0, Math.floor((model.weeks - MESSAGE_1.totalWidth) / 2));
    const startCol2 = Math.max(0, Math.floor((model.weeks - MESSAGE_2.totalWidth) / 2));

    const t1_draw = MESSAGE_1.pixels.length * PIXEL_INTERVAL;
    const t1_pause = t1_draw + PAUSE_DURATION;
    const t1_blink = t1_pause + BLINK_1_DURATION;
    const t2_draw = t1_blink + MESSAGE_2.pixels.length * PIXEL_INTERVAL;
    const t2_pause = t2_draw + PAUSE_DURATION;
    const t2_blink = t2_pause + BLINK_2_DURATION;

    const startCompletion = () => {
      if (isCompletingRef.current) return;
      isCompletingRef.current = true;
      setIsCompleting(true);
      completionPhase = 'p1_draw';
      completionStartTime = performance.now();
      currentPixelIndex = 0;
      bullets = [];
    };

    const shoot = () => {
      const pType = selectedProjectileRef.current;
      const projConfig = PROJECTILE_MAP.get(pType);
      const attack = projConfig ? projConfig.attack : 1.0;
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y - 4,
        vy: -6 * motionScale,
        width: 4,
        height: 10,
        type: pType,
        attack,
      });
    };

    const explode = (x: number, y: number, color: string) => {
      const particleCount = reduced ? 6 : 12;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 2.5 + 1.2) * motionScale;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size: Math.random() * 2 + 1,
          alpha: 1,
          life: 0,
          maxLife: Math.random() * 15 + 15,
        });
      }
    };

    let animationFrameId: number;

    const update = () => {
      if (isCompletingRef.current) {
        const elapsed = performance.now() - completionStartTime;

        const trackScroll = (msg: { pixels: MessagePixel[]; totalWidth: number }, sCol: number, idx: number) => {
          const viewportWidth = scrollEl.clientWidth;
          const maxScroll = Math.max(0, scrollEl.scrollWidth - viewportWidth);
          if (maxScroll > 0) {
            const activePixel = msg.pixels[Math.min(idx - 1, msg.pixels.length - 1)];
            const pixelX = left + (sCol + activePixel.relCol + 0.5) * s;
            const targetScroll = Math.max(0, Math.min(maxScroll, pixelX - viewportWidth / 2));
            const diff = targetScroll - scrollEl.scrollLeft;
            if (Math.abs(diff) > 0.5) {
              scrollEl.scrollLeft += diff * (reduced ? 1 : 0.1);
            }
          }
        };

        const centerScroll = (msg: { pixels: MessagePixel[]; totalWidth: number }, sCol: number) => {
          const viewportWidth = scrollEl.clientWidth;
          const maxScroll = Math.max(0, scrollEl.scrollWidth - viewportWidth);
          if (maxScroll > 0) {
            const messageCenterX = left + (sCol + msg.totalWidth / 2) * s;
            const targetScroll = Math.max(0, Math.min(maxScroll, messageCenterX - viewportWidth / 2));
            const diff = targetScroll - scrollEl.scrollLeft;
            if (Math.abs(diff) > 0.5) {
              scrollEl.scrollLeft += diff * (reduced ? 1 : 0.1);
            }
          }
        };

        if (elapsed < t1_draw) {
          // Phase 1 — First message ("HELLO WORLD!! FROM") typing reveal
          completionPhase = 'p1_draw';
          currentPixelIndex = Math.min(MESSAGE_1.pixels.length, Math.floor(elapsed / PIXEL_INTERVAL) + 1);
          trackScroll(MESSAGE_1, startCol1, currentPixelIndex);
        } else if (elapsed < t1_pause) {
          // Phase 1 — Brief hold
          completionPhase = 'p1_pause';
          currentPixelIndex = MESSAGE_1.pixels.length;
          centerScroll(MESSAGE_1, startCol1);
        } else if (elapsed < t1_blink) {
          // Phase 2 — First message 2-second discrete darkening blink
          completionPhase = 'p2_blink';
          const bElapsed = elapsed - t1_pause;
          const bIndex = Math.min(PHASE_2_PALETTE.length - 1, Math.floor(bElapsed / BLINK_CYCLE));
          currentFlashColor = PHASE_2_PALETTE[bIndex];
          flashVisible = (bElapsed % BLINK_CYCLE) < 280;
          centerScroll(MESSAGE_1, startCol1);
        } else if (elapsed < t2_draw) {
          // Phase 3 — Second message ("NIKHIL VIRDI") typing reveal
          completionPhase = 'p3_draw';
          const draw2Elapsed = elapsed - t1_blink;
          currentPixelIndex = Math.min(MESSAGE_2.pixels.length, Math.floor(draw2Elapsed / PIXEL_INTERVAL) + 1);
          trackScroll(MESSAGE_2, startCol2, currentPixelIndex);
        } else if (elapsed < t2_pause) {
          // Phase 3 — Brief hold
          completionPhase = 'p3_pause';
          currentPixelIndex = MESSAGE_2.pixels.length;
          centerScroll(MESSAGE_2, startCol2);
        } else if (elapsed < t2_blink) {
          // Phase 4 — Second message 4-second discrete darkening blink
          completionPhase = 'p4_blink';
          const bElapsed = elapsed - t2_pause;
          const bIndex = Math.min(PHASE_4_PALETTE.length - 1, Math.floor(bElapsed / BLINK_CYCLE));
          currentFlashColor = PHASE_4_PALETTE[bIndex];
          flashVisible = (bElapsed % BLINK_CYCLE) < 280;
          centerScroll(MESSAGE_2, startCol2);
        } else {
          // Phase 5 — Exit Game Mode automatically and restore original heatmap
          completionPhase = 'done';
          setIsCompleting(false);
          isCompletingRef.current = false;
          cellHealthRef.current = null;
          setGameMode(false);
          return;
        }

        // Keep background stars drifting
        stars.forEach((star) => {
          star.y += star.speed;
          if (star.y > gameHeight) {
            star.y = 0;
            star.x = Math.random() * width;
          }
        });

        return;
      }

      const minX = 0;
      const maxX = width - player.width;
      player.x = Math.max(minX, Math.min(maxX, player.x));

      // Automatic sweep movement across the entire heatmap width
      player.x += player.speed * player.direction;
      if (player.x >= maxX) {
        player.x = maxX;
        player.direction = -1;
      } else if (player.x <= minX) {
        player.x = minX;
        player.direction = 1;
      }

      // Automatically move horizontal scrollbar to follow the spacecraft in Game Mode
      const viewportWidth = scrollEl.clientWidth;
      const maxScroll = Math.max(0, scrollEl.scrollWidth - viewportWidth);
      if (maxScroll > 0) {
        const shooterCenterX = player.x + player.width / 2;
        const targetScroll = Math.max(0, Math.min(maxScroll, shooterCenterX - viewportWidth / 2));
        const currentScroll = scrollEl.scrollLeft;
        const diff = targetScroll - currentScroll;
        if (Math.abs(diff) > 0.5) {
          scrollEl.scrollLeft = currentScroll + diff * (reduced ? 1 : 0.12);
        } else {
          scrollEl.scrollLeft = targetScroll;
        }
      }

      // Auto-shooting based on selected ship's fireRate
      const now = Date.now();
      const currentShip = SHIPS[selectedShipRef.current] || SHIPS[0];
      const fireInterval = (1000 / currentShip.fireRate) * (reduced ? 1.4 : 1.0);
      if (now - lastShot >= fireInterval) {
        shoot();
        lastShot = now;
      }

      // Check if game complete
      if (!hasActiveRegion && initialActiveCount > 0 && !isCompletingRef.current) {
        startCompletion();
        return;
      }

      // Update stars
      stars.forEach((star) => {
        star.y += star.speed;
        if (star.y > gameHeight) {
          star.y = 0;
          star.x = Math.random() * width;
        }
      });

      // Update bullets
      bullets = bullets.filter((b) => {
        b.y += b.vy;
        return b.y > 0;
      });

      // Update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
      });
      particles = particles.filter((p) => p.life < p.maxLife);

      // Collision detection: check bullets against the active contribution region
      let hitOccurred = false;

      if (hasActiveRegion) {
        for (let b = bullets.length - 1; b >= 0; b--) {
          const bullet = bullets[b];

          // Spatial rejection: skip bullets completely outside the remaining active contribution region
          if (
            bullet.x + bullet.width < activeMinX ||
            bullet.x > activeMaxX ||
            bullet.y + bullet.height < activeMinY ||
            bullet.y > activeMaxY
          ) {
            continue;
          }

          // Target only the week column(s) intersecting this bullet's horizontal span
          const startWeek = Math.max(activeMinWeek, Math.floor((bullet.x - left) / s));
          const endWeek = Math.min(activeMaxWeek, Math.floor((bullet.x + bullet.width - left) / s));

          let hitCell: CodingCell | null = null;
          let maxCellY = -Infinity;

          for (let w = startWeek; w <= endWeek; w++) {
            const colCells = activeColumns.get(w);
            if (!colCells) continue;

            for (let i = 0; i < colCells.length; i++) {
              const cell = colCells[i];
              const cellX = left + (cell.week + 0.11) * s;
              const cellY = top + (cell.day + 0.11) * s;

              if (
                bullet.x < cellX + cellWidth &&
                bullet.x + bullet.width > cellX &&
                bullet.y < cellY + cellWidth &&
                bullet.y + bullet.height > cellY
              ) {
                // Find intersecting cell closest to the bullet's origin (largest cellY)
                if (cellY > maxCellY) {
                  maxCellY = cellY;
                  hitCell = cell;
                }
              }
            }
          }

          if (hitCell) {
            // Consume bullet immediately so it cannot hit again in this or subsequent frames
            bullets.splice(b, 1);

            const currentLevel = cellHealth.get(hitCell.date) ?? 0;
            if (currentLevel > 0) {
              const rawNext = currentLevel - bullet.attack;
              const nextLevel = rawNext <= 0.0001 ? 0 : Math.round(rawNext * 100) / 100;
              cellHealth.set(hitCell.date, nextLevel);
              if (nextLevel === 0) {
                updateActiveRegion();
              }

              if (!hasActiveRegion && initialActiveCount > 0 && !isCompletingRef.current) {
                hitOccurred = true;
                startCompletion();
                break;
              } else {
                const cellX = left + (hitCell.week + 0.11) * s;
                const cellY = top + (hitCell.day + 0.11) * s;

                const hitColor = rgb(interpolateLevelColor(GAME_COLORS, currentLevel));
                explode(cellX + cellWidth / 2, cellY + cellWidth / 2, hitColor);
                hitOccurred = true;
              }
            }
          }
        }
      }

      if (hitOccurred) {
        kickRef.current?.();
      }
    };

    const render = () => {
      gCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      gCtx.imageSmoothingEnabled = false;
      gCtx.clearRect(0, 0, width, gameHeight);

      // Draw stars
      gCtx.fillStyle = '#ffffff';
      stars.forEach((star) => {
        gCtx.globalAlpha = star.alpha;
        gCtx.fillRect(star.x, star.y, star.size, star.size);
      });
      gCtx.globalAlpha = 1.0;

      if (isCompletingRef.current) {
        const w = s * 0.78;
        const radius = s * 0.17;
        const startRow = 1;

        const drawMessagePixels = (
          msg: { pixels: MessagePixel[]; totalWidth: number },
          sCol: number,
          count: number,
          color: string,
          highlightHead: boolean
        ) => {
          for (let i = 0; i < count; i++) {
            const p = msg.pixels[i];
            const col = sCol + p.relCol;
            const row = startRow + p.relRow;
            if (col < 0 || col >= model.weeks || row < 0 || row > 6) continue;

            const px = left + (col + 0.11) * s;
            const py = top + (row + 0.11) * s;
            const isHead = highlightHead && i === count - 1;

            gCtx.beginPath();
            gCtx.roundRect(px, py, w, w, radius);
            gCtx.fillStyle = isHead ? '#ffffff' : color;
            gCtx.fill();
          }
        };

        if (completionPhase === 'p1_draw') {
          drawMessagePixels(MESSAGE_1, startCol1, currentPixelIndex, '#39d353', true);
        } else if (completionPhase === 'p1_pause') {
          drawMessagePixels(MESSAGE_1, startCol1, MESSAGE_1.pixels.length, '#39d353', false);
        } else if (completionPhase === 'p2_blink') {
          if (flashVisible) {
            drawMessagePixels(MESSAGE_1, startCol1, MESSAGE_1.pixels.length, currentFlashColor, false);
          }
        } else if (completionPhase === 'p3_draw') {
          drawMessagePixels(MESSAGE_2, startCol2, currentPixelIndex, '#39d353', true);
        } else if (completionPhase === 'p3_pause') {
          drawMessagePixels(MESSAGE_2, startCol2, MESSAGE_2.pixels.length, '#39d353', false);
        } else if (completionPhase === 'p4_blink') {
          if (flashVisible) {
            drawMessagePixels(MESSAGE_2, startCol2, MESSAGE_2.pixels.length, currentFlashColor, false);
          }
        }

        // Draw player spacecraft frozen in place
        const shipIdx = selectedShipRef.current;
        const shipImg = shipImages[shipIdx];
        const shipDrawSize = 32;
        const shipX = Math.round(player.x + (player.width - shipDrawSize) / 2);
        const shipY = Math.round(player.y + (player.height - shipDrawSize) / 2);

        if (shipImg && shipImg.complete && shipImg.naturalWidth > 0) {
          gCtx.drawImage(shipImg, shipX, shipY, shipDrawSize, shipDrawSize);
        } else {
          gCtx.fillStyle = player.color;
          gCtx.beginPath();
          gCtx.moveTo(player.x + player.width / 2, player.y);
          gCtx.lineTo(player.x + player.width, player.y + player.height);
          gCtx.lineTo(player.x + player.width * 0.7, player.y + player.height * 0.75);
          gCtx.lineTo(player.x + player.width * 0.3, player.y + player.height * 0.75);
          gCtx.lineTo(player.x, player.y + player.height);
          gCtx.closePath();
          gCtx.fill();
        }

        return;
      }

      // Draw bullets using pixelated projectile sprites
      bullets.forEach((b) => {
        const img = projectileImages.get(b.type);
        if (img && img.complete && img.naturalWidth > 0) {
          const drawSize = 16;
          const drawX = Math.round(b.x + b.width / 2 - drawSize / 2);
          const drawY = Math.round(b.y);
          gCtx.drawImage(img, drawX, drawY, drawSize, drawSize);
        } else {
          gCtx.fillStyle = '#fbbf24';
          gCtx.fillRect(b.x, b.y, b.width, b.height);
        }
      });

      // Draw particles
      particles.forEach((p) => {
        gCtx.fillStyle = p.color;
        gCtx.globalAlpha = p.alpha;
        gCtx.fillRect(p.x, p.y, p.size, p.size);
      });
      gCtx.globalAlpha = 1.0;

      // Draw player spacecraft using active session Kenney ship sprite
      const shipIdx = selectedShipRef.current;
      const shipImg = shipImages[shipIdx];
      const shipDrawSize = 32;
      const shipX = Math.round(player.x + (player.width - shipDrawSize) / 2);
      const shipY = Math.round(player.y + (player.height - shipDrawSize) / 2);

      if (shipImg && shipImg.complete && shipImg.naturalWidth > 0) {
        gCtx.drawImage(shipImg, shipX, shipY, shipDrawSize, shipDrawSize);
      } else {
        // Fallback polygon if sprite is still loading
        gCtx.fillStyle = player.color;
        gCtx.shadowColor = player.color;
        gCtx.shadowBlur = 6;
        gCtx.beginPath();
        gCtx.moveTo(player.x + player.width / 2, player.y);
        gCtx.lineTo(player.x + player.width, player.y + player.height);
        gCtx.lineTo(player.x + player.width * 0.7, player.y + player.height * 0.75);
        gCtx.lineTo(player.x + player.width * 0.3, player.y + player.height * 0.75);
        gCtx.lineTo(player.x, player.y + player.height);
        gCtx.closePath();
        gCtx.fill();
        gCtx.shadowBlur = 0;
      }
    };

    const loop = () => {
      update();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      gCtx.clearRect(0, 0, width, gameHeight);
      box.style.height = `${height}px`;
      cellHealthRef.current = null;
      isCompletingRef.current = false;
    };
  }, [gameMode, model]);

  const colors = ['#1b1b1b', '#0e4429', '#006d32', '#26a641', '#39d353'];

  return (
    <div ref={root} className="relative w-full font-tag text-xs text-muted">
      {/* Horizontally scrollable container for the full April 2025 -> current date heatmap */}
      <div
        ref={scrollBox}
        className="w-full pb-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#27272a #000000',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        <div
          ref={stage}
          className="relative overflow-hidden outline-offset-4 has-[:focus-visible]:outline-2"
          style={{ outlineColor: '#f2f2f0', transition: 'height 0.25s ease-out' }}
        >
          <canvas
            ref={canvas}
            tabIndex={0}
            role="img"
            aria-label="LeetCode submissions heatmap. Use the arrow keys to read individual days."
            className="absolute top-0 left-0 block outline-none"
          />
          {gameMode && (
            <canvas
              ref={gameCanvas}
              className="absolute top-0 left-0 pointer-events-auto z-10"
              style={{ cursor: 'crosshair' }}
            />
          )}
          <div
            ref={tip}
            role="tooltip"
            aria-hidden={active < 0 || gameMode}
            className="pointer-events-none absolute top-0 left-0 z-20 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[12px] leading-none text-background shadow-lg"
            style={{ opacity: active >= 0 && !gameMode ? 1 : 0 }}
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

      {/* Legend / Controls row below the scrollable container */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
        {!gameMode ? (
          /* Normal mode: Less / More contribution legend on the left */
          <div className="flex items-center gap-1.5" onMouseLeave={() => setLevel(-1)}>
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
        ) : (
          /* Game Mode ON: Ship selector in the freed left-side position */
          <div className="flex items-center gap-1.5 min-w-0 max-w-full" role="radiogroup" aria-label="Select ship">
            <span className="text-[11px] text-muted select-none shrink-0">Ship</span>
            <div className="flex items-center gap-0.5 rounded-md border border-black bg-black p-0.5 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SHIPS.map((ship) => {
                const isSelected = selectedShipIndex === ship.id;
                return (
                  <button
                    key={ship.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${ship.name}, ${ship.fireRate} shots/s`}
                    title={`${ship.name} (${ship.fireRate} shots/s)`}
                    disabled={isCompleting}
                    onClick={() => {
                      if (isCompletingRef.current) return;
                      setSelectedShipIndex(ship.id);
                      selectedShipRef.current = ship.id;
                    }}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all focus-visible:outline-2 focus-visible:outline-offset-1 ${
                      isCompleting
                        ? 'cursor-not-allowed opacity-50'
                        : isSelected
                          ? 'border border-neutral-600 bg-neutral-800 shadow-sm'
                          : 'border border-transparent opacity-50 hover:bg-neutral-800/60 hover:opacity-100'
                    }`}
                    style={{ outlineColor: '#f2f2f0' }}
                  >
                    <img
                      src={ship.src}
                      alt=""
                      width={14}
                      height={14}
                      className="pointer-events-none select-none"
                      style={{
                        imageRendering: 'pixelated',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right side: Weapon selector (if Game Mode ON) + Game Mode Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {gameMode && (
            <div className="flex items-center gap-1.5 shrink-0" role="radiogroup" aria-label="Select projectile type">
              <span className="text-[11px] text-muted select-none shrink-0">Weapon</span>
              <div className="flex items-center gap-0.5 rounded-md border border-black bg-black p-0.5">
                {PROJECTILES.map((proj) => {
                  const isSelected = selectedProjectile === proj.id;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${proj.name}, ${proj.attack} attack`}
                      title={`${proj.name} (${proj.attack} ATK)`}
                      disabled={isCompleting}
                      onClick={() => {
                        if (isCompletingRef.current) return;
                        setSelectedProjectile(proj.id);
                        selectedProjectileRef.current = proj.id;
                      }}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all focus-visible:outline-2 focus-visible:outline-offset-1 ${
                        isCompleting
                          ? 'cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'border border-neutral-600 bg-neutral-800 shadow-sm'
                            : 'border border-transparent opacity-50 hover:bg-neutral-800/60 hover:opacity-100'
                      }`}
                      style={{ outlineColor: '#f2f2f0' }}
                    >
                      <img
                        src={proj.src}
                        alt=""
                        width={14}
                        height={14}
                        className="pointer-events-none select-none"
                        style={{
                          imageRendering: 'pixelated',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Game Mode Toggle */}
          <div className="flex items-center gap-2 border-l border-neutral-800 pl-3 shrink-0">
            <span className="text-[11px] text-muted select-none" id="game-mode-label">Game Mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={gameMode}
              aria-labelledby="game-mode-label"
              aria-describedby="game-mode-description"
              disabled={isCompleting}
              onClick={handleToggleGameMode}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isCompleting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
              style={{
                backgroundColor: gameMode ? '#22c55e' : '#27272a',
                outlineColor: '#f2f2f0',
              }}
            >
              <span
                className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                style={{
                  transform: gameMode ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </button>
            <span id="game-mode-description" className="sr-only">
              {gameMode ? 'Game Mode active. Interactive space-defense game overlaying the heatmap.' : 'Game Mode inactive. Toggle to enable interactive game.'}
            </span>
          </div>
        </div>
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
