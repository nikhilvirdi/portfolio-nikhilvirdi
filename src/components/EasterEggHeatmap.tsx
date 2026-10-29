"use client";

import { useState, useEffect } from "react";
import { loadCachedGitHubContributions } from "./GitHubActivity";
import { loadCachedLeetCodeContributions } from "./CodingActivity";
import leetcodeSnapshot from "../data/leetcode-activity.json";

export interface EasterEggHeatmapProps {
  years?: number[];
  className?: string;
  style?: React.CSSProperties;
  source?: "github" | "leetcode";
}

interface DayData {
  date: string;
  count: number;
  level: number;
}

// Exact neon-to-forest green palette sampled directly from the reference screenshot
const GREEN_PALETTE = [
  "#005f00", // Level 1: Deep forest green
  "#00ae00", // Level 2: Medium green
  "#00d700", // Level 3: Vibrant green
  "#88fe00", // Level 4: Bright electric lime green
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CELL_SIZE = 7.5;
const GAP = 1.8;
const STEP = CELL_SIZE + GAP; // 9.3
const START_X = 40;
const START_Y = 22;
const SVG_WIDTH = 538;
const SVG_HEIGHT = 90;

// Mon=0, Tue=1, ..., Sun=6
function getDayIndex(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

function buildCalendarYearGrid(year: number) {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31));
  const jan1Day = getDayIndex(startDate);

  // Week 0 begins on the Monday of the week containing Jan 1
  const firstMonday = new Date(Date.UTC(year, 0, 1 - jan1Day));

  const current = new Date(firstMonday);
  let week = 0;
  const cells: { date: string; inYear: boolean; week: number; day: number }[] = [];
  const months: { month: number; week: number; name: string }[] = [];
  let prevMonth = -1;

  while (current <= endDate || getDayIndex(current) !== 0) {
    const dateStr = current.toISOString().slice(0, 10);
    const inYear = current.getUTCFullYear() === year;
    const day = getDayIndex(current);
    const month = current.getUTCMonth();

    if (inYear && month !== prevMonth && current.getUTCDate() <= 7) {
      months.push({
        month,
        week,
        name: current.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      });
      prevMonth = month;
    }

    cells.push({
      date: dateStr,
      inYear,
      week,
      day,
    });

    if (day === 6) {
      week++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return { cells, months };
}

let sharedContributionsMap: Map<string, DayData> | null = null;
let sharedFetchPromise: Promise<Map<string, DayData>> | null = null;

let sharedLeetCodeMap: Map<string, DayData> | null = null;
let sharedLeetCodeFetchPromise: Promise<Map<string, DayData>> | null = null;

function getInitialLeetCodeMap(): Map<string, DayData> {
  if (sharedLeetCodeMap && sharedLeetCodeMap.size > 0) {
    return sharedLeetCodeMap;
  }
  const map = new Map<string, DayData>();
  const rawDays: Record<string, number> = {};

  const cached = loadCachedLeetCodeContributions();
  if (cached && cached.length > 0) {
    for (const item of cached) {
      rawDays[item.date] = item.count;
    }
  } else {
    const snap = leetcodeSnapshot as { days?: Record<string, number> } | undefined;
    if (snap?.days) {
      Object.assign(rawDays, snap.days);
    }
  }

  const entries = Object.entries(rawDays);
  const nz = entries.map(([, count]) => count).filter((c) => c > 0).sort((a, b) => a - b);
  const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;

  for (const [date, count] of entries) {
    const level = count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));
    map.set(date, { date, count, level });
  }

  sharedLeetCodeMap = map;
  return map;
}

function hasDataForYears(map: Map<string, DayData>, targetYears: number[]): boolean {
  return targetYears.every((yr) => {
    const prefix = `${yr}-`;
    for (const key of map.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  });
}

export function EasterEggHeatmap({
  years = [2026],
  className = "",
  style,
  source = "github",
}: EasterEggHeatmapProps) {
  const [dataMap, setDataMap] = useState<Map<string, DayData>>(() => {
    if (source === "leetcode") {
      return getInitialLeetCodeMap();
    }
    if (sharedContributionsMap && sharedContributionsMap.size > 0) {
      return sharedContributionsMap;
    }
    const map = new Map<string, DayData>();
    // Load initial data from existing GitHub Activity cache if available
    const cached = loadCachedGitHubContributions();
    if (cached && cached.length > 0) {
      const nz = cached.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
      const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
      for (const item of cached) {
        const level = item.count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((item.count / busy) * 4));
        map.set(item.date, { date: item.date, count: item.count, level });
      }
    }
    return map;
  });

  useEffect(() => {
    if (source === "leetcode") {
      if (hasDataForYears(dataMap, years)) return;

      if (!sharedLeetCodeFetchPromise) {
        sharedLeetCodeFetchPromise = Promise.all([
          fetch("https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2025").then((r) => (r.ok ? r.json() : null)),
          fetch("https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2026").then((r) => (r.ok ? r.json() : null)),
        ])
          .then(([d2025, d2026]) => {
            const rawDays: Record<string, number> = {};
            const snap = leetcodeSnapshot as { days?: Record<string, number> } | undefined;
            if (snap?.days) Object.assign(rawDays, snap.days);

            const parse = (val: unknown) => {
              if (typeof val === "string") {
                try { return JSON.parse(val); } catch { return {}; }
              }
              return val && typeof val === "object" ? (val as Record<string, number>) : {};
            };

            for (const cal of [parse(d2025?.submissionCalendar), parse(d2026?.submissionCalendar)]) {
              for (const [timestamp, count] of Object.entries(cal)) {
                const val = Number(timestamp);
                if (!Number.isNaN(val)) {
                  const dateStr = new Date(val < 1e11 ? val * 1000 : val).toISOString().slice(0, 10);
                  const num = Number(count);
                  if (num > 0) rawDays[dateStr] = num;
                }
              }
            }

            const newMap = new Map<string, DayData>();
            const entries = Object.entries(rawDays);
            const nz = entries.map(([, count]) => count).filter((c) => c > 0).sort((a, b) => a - b);
            const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;

            for (const [date, count] of entries) {
              const level = count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));
              newMap.set(date, { date, count, level });
            }

            sharedLeetCodeMap = newMap;
            return newMap;
          })
          .catch(() => dataMap);
      }

      let isMounted = true;
      sharedLeetCodeFetchPromise.then((map) => {
        if (isMounted) setDataMap(map);
      });

      return () => {
        isMounted = false;
      };
    }

    // GitHub fetch logic
    if (hasDataForYears(dataMap, years)) return;

    if (!sharedFetchPromise) {
      sharedFetchPromise = fetch("https://github-contributions-api.jogruber.de/v4/nikhilvirdi?y=all&client=react-github-calendar")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch contribution data");
          const json = await res.json();
          if (!json || typeof json !== "object" || !Array.isArray(json.contributions)) {
            throw new Error("Invalid contribution data format");
          }
          return json.contributions as { date: string; count: number; level?: number }[];
        })
        .then((contributions) => {
          const newMap = new Map<string, DayData>();
          const nz = contributions.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
          const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;

          for (const item of contributions) {
            const level =
              typeof item.level === "number" && item.level >= 0 && item.level <= 4
                ? item.level
                : item.count <= 0
                ? 0
                : busy <= 0
                ? 4
                : 1 + Math.min(3, Math.floor((item.count / busy) * 4));

            newMap.set(item.date, {
              date: item.date,
              count: item.count,
              level,
            });
          }
          sharedContributionsMap = newMap;
          return newMap;
        });
    }

    let isMounted = true;
    sharedFetchPromise
      .then((map) => {
        if (isMounted) {
          setDataMap(map);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Keep cached data
      });

    return () => {
      isMounted = false;
    };
  }, [dataMap, years, source]);

  return (
    <div
      className={`w-full bg-[#1e1e1e] p-3 sm:p-4 my-2.5 select-none ${className}`}
      style={{
        backgroundColor: "#1e1e1e",
        borderRadius: "0px",
        boxShadow: "none",
        border: "none",
        ...style,
      }}
    >
      {years.map((year, yearIdx) => {
        const { cells, months } = buildCalendarYearGrid(year);

        return (
          <div key={year} className={yearIdx > 0 ? "mt-4" : ""}>
            {/* Heatmap Grid SVG matching reference screenshot layout & alignment */}
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-auto block overflow-visible"
              preserveAspectRatio="xMinYMin meet"
              aria-label={`${source === "leetcode" ? "LeetCode submission" : "GitHub contribution"} heatmap for ${year}`}
            >
              {/* Blue rectangular year badge on the exact same header row as month labels */}
              <rect
                x="2"
                y="1"
                width="34"
                height="14"
                fill="#2471ca"
                rx="1.5"
              />
              <text
                x="19"
                y="11"
                fill="#ffffff"
                fontWeight="bold"
                fontSize="9.5"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                textAnchor="middle"
              >
                {year}
              </text>

              {/* Horizontal Month Labels Jan through Dec aligned on same header row */}
              {months.map(({ month, week, name }) => (
                <text
                  key={month}
                  x={START_X + week * STEP}
                  y="11.5"
                  fill="#8e9192"
                  fontSize="8.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  textAnchor="start"
                >
                  {name}
                </text>
              ))}

              {/* Vertically Aligned Weekday Labels Mon through Sun directly under year badge */}
              {WEEKDAYS.map((dayLabel, dayIdx) => (
                <text
                  key={dayLabel}
                  x="4"
                  y={START_Y + dayIdx * STEP + 6.2}
                  fill="#8e9192"
                  fontSize="8.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  textAnchor="start"
                >
                  {dayLabel}
                </text>
              ))}

              {/* Contribution Squares & Subtle Gray Dotted Markers */}
              {cells.map(({ date, inYear, week, day }) => {
                if (!inYear) return null;

                const dayData = dataMap.get(date);
                const count = dayData ? dayData.count : 0;
                const level = dayData ? dayData.level : 0;
                const x = START_X + week * STEP;
                const y = START_Y + day * STEP;

                if (count > 0 && level > 0) {
                  const color = GREEN_PALETTE[Math.min(3, Math.max(0, level - 1))];
                  return (
                    <rect
                      key={date}
                      x={x}
                      y={y}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx="1"
                      fill={color}
                    />
                  );
                }

                // Empty day: subtle gray dotted marker
                return (
                  <circle
                    key={date}
                    cx={x + CELL_SIZE / 2}
                    cy={y + CELL_SIZE / 2}
                    r="1.1"
                    fill="#3a3a3a"
                  />
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

export default EasterEggHeatmap;
