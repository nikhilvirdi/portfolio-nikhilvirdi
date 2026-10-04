import { useState, useRef, useEffect, useId } from 'react';
import githubStats from '../data/github-stats.json';

export interface LanguageEntry {
  name: string;
  bytes: number;
  percent: number;
}

export interface StatsTotals {
  linesNet: number;
  linesAdded: number;
  linesDeleted: number;
  commits: number;
  activeDays: number;
}

export interface GitHubStatsData {
  generatedAt: string;
  languages: LanguageEntry[];
  totals: StatsTotals;
}

// ============================================================================
// Linguist Colors & Dark Contrast Adjustments
// ============================================================================

const LINGUIST_COLORS: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  Kotlin: '#A97BFF',
  CSS: '#563d7c',
  Go: '#00ADD8',
  GLSL: '#5686a5',
  Dockerfile: '#384d54',
  PowerShell: '#012456',
  Shell: '#89e051',
};

// Lighten-for-dark-background tweak so deep tones stand out with crisp clarity on pure black
const COLOR_TWEAKS: Record<string, string> = {
  CSS: '#7c5ba8', // Lifted from deep purple #563d7c
  PowerShell: '#2f6bc7', // Lifted from deep navy #012456
  Dockerfile: '#5b7d87', // Lifted from deep #384d54
  Python: '#3d82bd', // Subtle lift from #3572A5 for optimal contrast
};

const FALLBACK_COLOR = '#8b949e';

const getBarBaseColor = (name: string): string => {
  return COLOR_TWEAKS[name] ?? LINGUIST_COLORS[name] ?? FALLBACK_COLOR;
};

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Replicating GitHubActivity 3D face shading:
// Front face: base language color
// Top face: lighter from overhead illumination (+38% towards white)
// Right face: darker shadow (0.68 multiplier matching GitHubActivity line 782)
function get3DFaceColors(baseHex: string) {
  const [r, g, b] = hexToRgb(baseHex);
  const front = `rgb(${r}, ${g}, ${b})`;
  const topR = Math.min(255, Math.round(r + (255 - r) * 0.38));
  const topG = Math.min(255, Math.round(g + (255 - g) * 0.38));
  const topB = Math.min(255, Math.round(b + (255 - b) * 0.38));
  const top = `rgb(${topR}, ${topG}, ${topB})`;
  const rightR = Math.round(r * 0.68);
  const rightG = Math.round(g * 0.68);
  const rightB = Math.round(b * 0.68);
  const right = `rgb(${rightR}, ${rightG}, ${rightB})`;

  return { front, top, right };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Shared formatter for all stat blocks in the language/stats section:
 * - Below 10,000: show the full number with thousands separators (e.g. 851, 1,785, 9,999)
 * - From 10,000 up: compact notation with at most one decimal, no trailing ".0" (e.g. 10K, 12.8K, 161.4K; 1.2M)
 */
export function formatStatNumber(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  const rounded = Math.round(abs);

  if (rounded < 10000) {
    return sign + rounded.toLocaleString('en-US');
  }

  if (abs >= 1000000000) {
    const num = abs / 1000000000;
    const formatted = (Math.round(num * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return sign + formatted + 'B';
  }

  if (abs >= 1000000) {
    const num = abs / 1000000;
    const formatted = (Math.round(num * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return sign + formatted + 'M';
  }

  const num = abs / 1000;
  const formatted = (Math.round(num * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return sign + formatted + 'K';
}

function useCountUp(target: number, start: boolean, durationMs: number = 1000): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!start) {
      setVal(0);
      return;
    }

    if (durationMs <= 0) {
      setVal(target);
      return;
    }

    let startTime: number | null = null;
    let animId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * easeOut);

      setVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setVal(target);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [target, start, durationMs]);

  return val;
}

const MUTED = 'var(--color-muted-foreground, #737373)';
const ACCENT = '#39d353'; // GitHub green matching activity heatmap level 4

// 2.5D Depth offsets (px)
const DX = 6;
const DY = 4.5;

// ============================================================================
// Main Component
// ============================================================================

export default function LanguageBar({ className = '' }: { className?: string }) {
  const stats = githubStats as GitHubStatsData | undefined;

  // Render nothing if stats data is missing or empty
  if (!stats || !stats.languages || stats.languages.length === 0 || !stats.totals) {
    return null;
  }

  const { languages, totals } = stats;

  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [isReduced, setIsReduced] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Scroll entrance trigger (runs once only)
  useEffect(() => {
    let prefersReduced = false;
    if (typeof window !== 'undefined') {
      prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (prefersReduced) {
      setIsReduced(true);
      setHasEntered(true);
      return;
    }

    const target = containerRef.current;
    if (!target) return;

    // Check if already in viewport on mount
    const rect = target.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setHasEntered(true);
      return;
    }

    const scrollPane = document.getElementById('main-scroll-pane');
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      {
        root: scrollPane && window.innerWidth >= 1024 ? scrollPane : null,
        threshold: 0.05,
        rootMargin: '40px 0px',
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Compute scale for linear y-axis
  const maxPercent = Math.max(...languages.map((l) => l.percent), 10);
  const maxScale = Math.ceil(maxPercent / 10) * 10; // e.g. 50%

  const activeItem = languages.find((l) => l.name === activeLang);

  // Animated stat values counting up on entrance
  const countUpDuration = isReduced ? 0 : 1000;
  const curLinesNet = useCountUp(totals.linesNet, hasEntered, countUpDuration);
  const curCommits = useCountUp(totals.commits, hasEntered, countUpDuration);
  const curLinesAdded = useCountUp(totals.linesAdded, hasEntered, countUpDuration);
  const curLinesDeleted = useCountUp(totals.linesDeleted, hasEntered, countUpDuration);
  const curActiveDays = useCountUp(totals.activeDays, hasEntered, countUpDuration);

  const ariaSummary = `Language distribution across repositories: ${languages
    .map((l) => `${l.name} ${l.percent < 0.1 ? '<0.1%' : `${l.percent.toFixed(1)}%`}`)
    .join(', ')}`;

  return (
    <div
      id="languages-section"
      ref={containerRef}
      className={`pt-8 mt-2 font-tag text-foreground ${className}`}
    >
      {/* Accessible visually hidden table */}
      <table className="sr-only">
        <caption>Language and repository statistics</caption>
        <thead>
          <tr>
            <th scope="col">Language</th>
            <th scope="col">Percentage</th>
            <th scope="col">Bytes</th>
          </tr>
        </thead>
        <tbody>
          {languages.map((l) => (
            <tr key={l.name}>
              <td>{l.name}</td>
              <td>{l.percent < 0.1 ? '<0.1%' : `${l.percent.toFixed(1)}%`}</td>
              <td>{l.bytes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Two-column layout on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-stretch">
        {/* ================================================================= */}
        {/* Left ~55%: 2.5D Vertical Bar Graph                                */}
        {/* ================================================================= */}
        <div
          role="img"
          aria-label={ariaSummary}
          className="w-full lg:w-[55%] flex-shrink-0 flex flex-col justify-between"
        >
          {/* Section header & live tooltip */}
          <div className="flex items-center justify-between mb-3 min-h-[24px]">
            <span className="text-[13px] leading-tight font-normal" style={{ color: MUTED }}>
              Languages across my projects
            </span>

            {/* Hover / focus detail badge */}
            <div
              id={tooltipId}
              role="status"
              aria-live="polite"
              className={`text-[11px] font-tag transition-opacity duration-150 tabular-nums px-2 py-0.5 rounded border border-white/10 bg-zinc-900/90 text-zinc-300 ${
                activeItem ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {activeItem && (
                <span>
                  <strong className="text-white font-medium">{activeItem.name}</strong>:{' '}
                  {activeItem.percent < 0.1 ? '<0.1%' : `${activeItem.percent.toFixed(1)}%`} (
                  {formatBytes(activeItem.bytes)})
                </span>
              )}
            </div>
          </div>

          {/* Bar Chart Area with 3 Faint Gridlines */}
          {/* pb-24 gives 96px of clean space below baseline for rotated labels */}
          <div
            className="relative w-full h-[185px] sm:h-[205px] flex items-end gap-1.5 sm:gap-2.5 pt-7 pb-24 pl-5 sm:pl-7 pr-4 sm:pr-6"
          >
            {/* Baseline Gridline */}
            <div
              className="absolute inset-x-0 bottom-24 pointer-events-none border-b border-zinc-800/60"
              aria-hidden="true"
            />
            {/* 33% dashed gridline */}
            <div
              className="absolute inset-x-0 bottom-[calc(96px+(100%-124px)*0.33)] pointer-events-none border-b border-zinc-800/40 border-dashed"
              aria-hidden="true"
            />
            {/* 66% dashed gridline */}
            <div
              className="absolute inset-x-0 bottom-[calc(96px+(100%-124px)*0.66)] pointer-events-none border-b border-zinc-800/40 border-dashed"
              aria-hidden="true"
            />
            {/* 100% dashed gridline */}
            <div
              className="absolute inset-x-0 top-7 pointer-events-none border-b border-zinc-800/40 border-dashed"
              aria-hidden="true"
            />

            {/* 2.5D Vertical Bars */}
            {languages.map((item, index) => {
              const isHovered = activeLang === item.name;
              const isDimmed = activeLang !== null && !isHovered;

              // Calculate normalized height percentage
              const rawHeightPercent = (item.percent / maxScale) * 100;
              // 4px minimum height so tiny languages still show a visible 3D block
              const targetHeight = `max(4px, ${rawHeightPercent}%)`;
              const currentHeight = isReduced || hasEntered ? targetHeight : '0px';

              const percentDisplay = item.percent < 0.1 ? '<0.1%' : `${item.percent.toFixed(1)}%`;
              const baseColor = getBarBaseColor(item.name);
              const { front, top, right } = get3DFaceColors(baseColor);

              // Staggered grow animation: ~900ms ease-out, staggered 70ms left-to-right
              const growTransition = isReduced
                ? 'none'
                : hasEntered
                ? `height 900ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 70}ms`
                : 'none';

              // % labels fade in as each bar finishes
              const percentFadeTransition = isReduced
                ? 'none'
                : hasEntered
                ? `opacity 300ms ease-out ${index * 70 + 750}ms`
                : 'none';

              return (
                <div
                  key={item.name}
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.name}: ${percentDisplay} (${formatBytes(item.bytes)})`}
                  aria-describedby={isHovered ? tooltipId : undefined}
                  onMouseEnter={() => setActiveLang(item.name)}
                  onMouseLeave={() => setActiveLang(null)}
                  onFocus={() => setActiveLang(item.name)}
                  onBlur={() => setActiveLang(null)}
                  className="relative flex-1 h-full flex flex-col justify-end items-center cursor-pointer outline-none group"
                >
                  {/* % Label above the bar (fades in as bar completes growth) */}
                  <span
                    className="absolute -top-5 text-[8.5px] sm:text-[9.5px] tabular-nums font-tag text-zinc-400 select-none whitespace-nowrap"
                    style={{
                      opacity: isReduced || hasEntered ? (isDimmed ? 0.35 : 1) : 0,
                      transition: percentFadeTransition,
                    }}
                  >
                    {percentDisplay}
                  </span>

                  {/* 3D Bar Assembly (Front Face + Top Face + Right Side Face) */}
                  <div
                    className="relative w-full max-w-[20px] sm:max-w-[26px] transition-all"
                    style={{
                      height: currentHeight,
                      transition: growTransition,
                      opacity: isDimmed ? 0.4 : 1,
                      filter: isHovered ? 'brightness(1.18)' : 'none',
                    }}
                  >
                    {/* 1. Lighter Top Face (parallelogram riding on top of front face) */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: `-${DY}px`,
                        left: 0,
                        width: `calc(100% + ${DX}px)`,
                        height: `${DY}px`,
                        backgroundColor: top,
                        clipPath: `polygon(${DX}px 0%, 100% 0%, calc(100% - ${DX}px) 100%, 0% 100%)`,
                        boxShadow: isHovered ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                      }}
                    />

                    {/* 2. Darker Right Side Face (parallelogram riding on right edge) */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: `-${DY}px`,
                        left: '100%',
                        width: `${DX}px`,
                        height: `calc(100% + ${DY}px)`,
                        backgroundColor: right,
                        clipPath: `polygon(0 ${DY}px, 100% 0%, 100% calc(100% - ${DY}px), 0 100%)`,
                      }}
                    />

                    {/* 3. Front Face (true language color) */}
                    <div
                      className="w-full h-full rounded-tl-[1px]"
                      style={{
                        backgroundColor: front,
                      }}
                    />
                  </div>

                  {/* Language label: fully BELOW baseline, rotated -45deg, pure white #FFFFFF, Manrope 12-13px weight 500 */}
                  <div
                    className="absolute pointer-events-none whitespace-nowrap"
                    style={{
                      top: 'calc(100% - 84px)', // 12px below the 96px baseline
                      right: '50%',
                      transformOrigin: 'top right',
                      transform: 'rotate(-45deg)',
                    }}
                  >
                    <span
                      className="block select-none transition-opacity duration-200"
                      style={{
                        color: '#FFFFFF',
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        lineHeight: 1,
                        opacity: isDimmed ? 0.35 : 1,
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* Right ~45%: 2x2 Grid of Stat Blocks                               */}
        {/* Reusing exact Stat classes & structure from GitHubActivity        */}
        {/* ================================================================= */}
        <div className="w-full lg:w-[45%] flex flex-col justify-center pt-2 sm:pt-0">
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:gap-y-7">
            {/* Block 1: Lines of code */}
            <div
              className="min-w-0"
              title={`${totals.linesNet.toLocaleString()} net lines of code (added minus deleted)`}
            >
              <div className="text-[13px] leading-tight" style={{ color: MUTED }}>
                Lines of code
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color: ACCENT,
                    fontSize: '28px',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatStatNumber(curLinesNet)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12px]" style={{ color: MUTED }}>
                added minus deleted
              </div>
            </div>

            {/* Block 2: Total commits */}
            <div
              className="min-w-0"
              title={`${totals.commits.toLocaleString()} commits across all repositories`}
            >
              <div className="text-[13px] leading-tight" style={{ color: MUTED }}>
                Total commits
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color: ACCENT,
                    fontSize: '28px',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatStatNumber(curCommits)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12px]" style={{ color: MUTED }}>
                all time
              </div>
            </div>

            {/* Block 3: Lines added / deleted */}
            <div
              className="min-w-0"
              title={`+${totals.linesAdded.toLocaleString()} added / -${totals.linesDeleted.toLocaleString()} deleted`}
            >
              <div className="text-[13px] leading-tight" style={{ color: MUTED }}>
                Lines added / deleted
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-1">
                <span
                  className="font-semibold tabular-nums text-[21px] sm:text-[24px]"
                  style={{
                    color: ACCENT,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  +{formatStatNumber(curLinesAdded)} / -{formatStatNumber(curLinesDeleted)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12px]" style={{ color: MUTED }}>
                all repositories
              </div>
            </div>

            {/* Block 4: Active days */}
            <div
              className="min-w-0"
              title={`${totals.activeDays.toLocaleString()} distinct days with a GitHub contribution`}
            >
              <div className="text-[13px] leading-tight" style={{ color: MUTED }}>
                Active days
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color: ACCENT,
                    fontSize: '28px',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatStatNumber(curActiveDays)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12px]" style={{ color: MUTED }}>
                days with a contribution
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
