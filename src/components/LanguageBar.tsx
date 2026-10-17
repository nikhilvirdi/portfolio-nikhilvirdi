import { useState, useRef, useEffect, useId, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import githubStats from '../data/github-stats.json';
import { BASE_TECH_DEFS } from './TechStackFloating';
import kotlinSvg from 'devicon/icons/kotlin/kotlin-original.svg';
import powershellSvg from 'devicon/icons/powershell/powershell-original.svg';
import openglSvg from 'devicon/icons/opengl/opengl-original.svg';
import bashSvg from 'devicon/icons/bash/bash-original.svg';
import matlabSvg from 'devicon/icons/matlab/matlab-original.svg';
import aarch64Svg from 'devicon/icons/aarch64/aarch64-original.svg';
import cSvg from 'devicon/icons/c/c-original.svg';

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
  Python: '#3d82bd',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  Kotlin: '#A97BFF',
  C: '#6b8299',
  CSS: '#7c5ba8',
  Go: '#00ADD8',
  GLSL: '#5686a5',
  Dockerfile: '#5b7d87',
  PowerShell: '#2f6bc7',
  Shell: '#89e051',
  MATLAB: '#e16737',
  Other: '#8b949e',
};

const FALLBACK_COLOR = '#8b949e';

const getLanguageColor = (name: string): string => {
  return LINGUIST_COLORS[name] ?? FALLBACK_COLOR;
};

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
const FOREGROUND = 'var(--color-foreground, #f2f2f0)';
const ACCENT = '#39d353'; // GitHub green matching activity heatmap level 4

// Map languages to Tech Stack definitions or devicon fallbacks
const TECH_NAME_ALIASES: Record<string, string> = {
  HTML: 'HTML5',
  CSS: 'CSS3',
  Go: 'Golang',
  Dockerfile: 'Docker',
};

const EXTRA_LANGUAGE_LOGOS: Record<string, { svg: string; invert?: boolean }> = {
  Kotlin: { svg: kotlinSvg },
  C: { svg: cSvg },
  PowerShell: { svg: powershellSvg },
  GLSL: { svg: openglSvg },
  Shell: { svg: bashSvg },
  Bash: { svg: bashSvg },
  MATLAB: { svg: matlabSvg },
  M: { svg: matlabSvg },
  Assembly: { svg: aarch64Svg },
  VHDL: { svg: aarch64Svg },
};

function getLanguageLogo(name: string): { svg: string; invert?: boolean } | null {
  if (name === 'Other') {
    return null;
  }
  const targetName = TECH_NAME_ALIASES[name] || name;
  const tech = BASE_TECH_DEFS.find((t) => t.name.toLowerCase() === targetName.toLowerCase());
  if (tech) {
    return { svg: tech.svg, invert: tech.invert };
  }
  return EXTRA_LANGUAGE_LOGOS[name] || null;
}

// Global flag tracking if the stats count-up has already triggered entrance
let globalHasEntered = false;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      language: string;
      percentage: number;
      bytes: number;
      color: string;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border border-white/15 bg-black/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md pointer-events-none font-tag">
        <div className="flex items-center gap-2">
          <div
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-medium text-white">{data.language}</span>
          <span className="font-semibold text-white ml-2 tabular-nums">
            {data.percentage < 0.1 ? '<0.1%' : `${data.percentage.toFixed(1)}%`}
          </span>
        </div>
        {data.bytes > 0 && (
          <div className="text-[11px] text-zinc-400 mt-1 pl-4">
            {formatBytes(data.bytes)}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const renderCustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (
    value === undefined ||
    value === null ||
    x === undefined ||
    y === undefined ||
    width === undefined
  ) {
    return null;
  }
  const numX = Number(x);
  const numY = Number(y);
  const numW = Number(width);
  const num = Number(value);
  const text = num < 0.1 ? '<0.1%' : `${num.toFixed(1)}%`;
  return (
    <text
      x={numX + numW / 2}
      y={numY - 6}
      fill="#a1a1aa"
      textAnchor="middle"
      fontSize={9.5}
      className="font-tag tabular-nums select-none"
    >
      {text}
    </text>
  );
};

const renderCustomTick = (props: any) => {
  const { x, y, payload } = props;
  if (!payload || x === undefined || y === undefined) return null;
  const numX = Number(x);
  const numY = Number(y);
  const langName = String(payload.value);
  const logo = getLanguageLogo(langName);

  if (logo) {
    return (
      <g transform={`translate(${numX - 8}, ${numY + 6})`}>
        <image
          href={logo.svg}
          xlinkHref={logo.svg}
          width={16}
          height={16}
          style={{
            filter: logo.invert ? 'invert(1)' : undefined,
            opacity: 0.9,
          }}
        />
        <title>{langName}</title>
      </g>
    );
  }

  return (
    <text
      x={numX}
      y={numY + 18}
      fill="#a1a1aa"
      textAnchor="middle"
      fontSize={10}
      className="font-tag select-none"
    >
      {langName}
    </text>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function LanguageBar({ className = '' }: { className?: string }) {
  const stats = githubStats as GitHubStatsData | undefined;
  const rawLanguages = stats?.languages ?? [];

  // Group languages: > 0.1% shown individually, <= 0.1% grouped as "Other"
  const languages: LanguageEntry[] = useMemo(() => {
    const visible: LanguageEntry[] = [];
    const hidden: LanguageEntry[] = [];

    for (const lang of rawLanguages) {
      if (lang.percent > 0.1) {
        visible.push(lang);
      } else {
        hidden.push(lang);
      }
    }

    // If there are hidden languages, create "Other" entry
    if (hidden.length > 0) {
      const otherBytes = hidden.reduce((sum, lang) => sum + lang.bytes, 0);
      const otherPercent = hidden.reduce((sum, lang) => sum + lang.percent, 0);

      if (otherPercent > 0) {
        visible.push({
          name: 'Other',
          bytes: otherBytes,
          percent: otherPercent,
        });
      }
    }

    return visible;
  }, [rawLanguages]);

  const chartData = useMemo(() => {
    return languages.map((l) => ({
      language: l.name,
      percentage: l.percent,
      bytes: l.bytes,
      color: getLanguageColor(l.name),
      patternId: `lang-diagonal-hatch-${l.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    }));
  }, [languages]);

  const totals = stats?.totals ?? {
    linesNet: 0,
    commits: 0,
    linesAdded: 0,
    linesDeleted: 0,
    activeDays: 0,
  };
  const hasStats = Boolean(stats && stats.languages && stats.languages.length > 0 && stats.totals);

  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [hasEntered, setHasEntered] = useState(() => globalHasEntered);
  const [isReduced, setIsReduced] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Scroll entrance trigger
  useEffect(() => {
    let prefersReduced = false;
    if (typeof window !== 'undefined') {
      prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (prefersReduced) {
      setIsReduced(true);
      globalHasEntered = true;
      setHasEntered(true);
      return;
    }

    if (globalHasEntered) {
      setHasEntered(true);
      return;
    }

    const target = containerRef.current;
    if (!target) return;

    // Check if already visible in viewport
    const checkVisibility = () => {
      const rect = target.getBoundingClientRect();
      if (rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
        globalHasEntered = true;
        setHasEntered(true);
        return true;
      }
      return false;
    };

    if (checkVisibility()) {
      return;
    }

    const pane = target.closest('#main-scroll-pane');
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          globalHasEntered = true;
          setHasEntered(true);
          observer.disconnect();
        }
      },
      {
        root: pane,
        threshold: 0.05,
        rootMargin: '40px 0px',
      }
    );

    observer.observe(target);

    const handleCheck = () => {
      if (globalHasEntered || checkVisibility()) {
        observer.disconnect();
        window.removeEventListener('resize', handleCheck);
        window.removeEventListener('scroll', handleCheck);
        if (pane) {
          pane.removeEventListener('scroll', handleCheck);
        }
      }
    };

    window.addEventListener('resize', handleCheck, { passive: true });
    window.addEventListener('scroll', handleCheck, { passive: true });
    if (pane) {
      pane.addEventListener('scroll', handleCheck, { passive: true });
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleCheck);
      window.removeEventListener('scroll', handleCheck);
      if (pane) {
        pane.removeEventListener('scroll', handleCheck);
      }
    };
  }, []);

  const activeItem = chartData.find((l) => l.language === activeLang);

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

  if (!hasStats) {
    return null;
  }

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
        {/* Left ~55%: Dashed-Bar Language Distribution Chart                 */}
        {/* ================================================================= */}
        <div
          role="img"
          aria-label={ariaSummary}
          className="w-full lg:w-[55%] flex-shrink-0 flex flex-col justify-between"
        >
          {/* Section header & live tooltip badge */}
          <div className="flex items-center justify-between mb-2 min-h-[24px]">
            <span className="text-[13px] leading-tight font-normal" style={{ color: FOREGROUND }}>
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
                  <strong className="text-white font-medium">{activeItem.language}</strong>:{' '}
                  {activeItem.percentage < 0.1 ? '<0.1%' : `${activeItem.percentage.toFixed(1)}%`} (
                  {formatBytes(activeItem.bytes)})
                </span>
              )}
            </div>
          </div>

          {/* Chart Wrapper: responsive and horizontally scrollable on extra small screens */}
          <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none">
            <div className="w-full min-w-[340px] h-[200px] sm:h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 22,
                    right: 6,
                    bottom: 24,
                    left: 6,
                  }}
                  barCategoryGap="16%"
                  onMouseMove={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length) {
                      setActiveLang(state.activePayload[0].payload.language);
                    }
                  }}
                  onMouseLeave={() => setActiveLang(null)}
                >
                  <defs>
                    {chartData.map((item) => (
                      <pattern
                        key={item.patternId}
                        id={item.patternId}
                        patternUnits="userSpaceOnUse"
                        width="8"
                        height="8"
                      >
                        <rect
                          width="8"
                          height="8"
                          fill={item.color}
                          opacity="0.1"
                        />
                        <path
                          d="M0,8 L8,0 M4,12 L12,4 M-4,4 L4,-4"
                          stroke={item.color}
                          strokeWidth="1.5"
                          opacity="0.6"
                        />
                        <path
                          d="M2,10 L10,2 M6,14 L14,6 M-2,6 L6,-2"
                          stroke={item.color}
                          strokeWidth="1"
                          opacity="0.3"
                        />
                      </pattern>
                    ))}
                  </defs>

                  <YAxis hide domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} />

                  <XAxis
                    dataKey="language"
                    tick={renderCustomTick}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />

                  <Tooltip
                    cursor={false}
                    content={<CustomTooltip />}
                  />

                  <Bar
                    dataKey="percentage"
                    radius={[4, 4, 0, 0]}
                    minPointSize={6}
                    isAnimationActive={!isReduced}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    <LabelList dataKey="percentage" content={renderCustomLabel} />
                    {chartData.map((entry) => {
                      const isHovered = activeLang === entry.language;
                      const isDimmed = activeLang !== null && !isHovered;
                      return (
                        <Cell
                          key={entry.language}
                          fill={`url(#${entry.patternId})`}
                          stroke={entry.color}
                          strokeWidth={isHovered ? 1.5 : 1}
                          opacity={isDimmed ? 0.35 : 1}
                          style={{
                            transition: 'opacity 150ms ease, stroke-width 150ms ease',
                            cursor: 'pointer',
                          }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
              <div
                className="mt-0.5 truncate text-[12px]"
                style={{ color: MUTED }}
              >
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
