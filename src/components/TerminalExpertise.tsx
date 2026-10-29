import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { EasterEggHeatmap } from "./EasterEggHeatmap";
import { loadCachedGitHubContributions } from "./GitHubActivity";
import { loadCachedLeetCodeContributions } from "./CodingActivity";
import leetcodeSnapshot from "../data/leetcode-activity.json";

interface CommandHistoryItem {
  id: string;
  command: string;
  output?: string;
  isHeatmap?: boolean;
  heatmapYear?: number;
  heatmapSource?: "github" | "leetcode";
}

const INITIAL_SUGGESTIONS = ["whoami", "help"];

const ALL_SUGGESTIONS = [
  "whoami",
  "expertise",
  "backend --focus",
  "devops --focus",
  "languages",
  "git-map",
  "git-streak",
  "leet-map",
  "leet-streak",
  "interests",
  "sudo chai",
  "date",
  "help",
];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// GitHub streak computation and caching
let gitHubStreaksCache: { current: number; longest: number } | null = null;

function parseYMDToDays(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
}

function computeGitHubStreaks(days: { date: string; count: number }[]): { current: number; longest: number } {
  if (!days || days.length === 0) return { current: 0, longest: 0 };

  const now = new Date();
  const todayUTC = now.toISOString().slice(0, 10);
  const localY = now.getFullYear();
  const localM = String(now.getMonth() + 1).padStart(2, "0");
  const localD = String(now.getDate()).padStart(2, "0");
  const todayLocal = `${localY}-${localM}-${localD}`;
  const maxAllowedDate = todayUTC > todayLocal ? todayUTC : todayLocal;

  const activeDates = Array.from(
    new Set(
      days
        .filter((d) => d.count > 0 && d.date <= maxAllowedDate)
        .map((d) => d.date)
    )
  ).sort();

  if (activeDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 0;
  let curRun = 0;
  let prevDayNum: number | null = null;

  for (const d of activeDates) {
    const dayNum = parseYMDToDays(d);
    if (prevDayNum === null || dayNum - prevDayNum !== 1) {
      curRun = 1;
    } else {
      curRun++;
    }
    if (curRun > longest) {
      longest = curRun;
    }
    prevDayNum = dayNum;
  }

  const lastActiveDate = activeDates[activeDates.length - 1];
  const lastActiveNum = parseYMDToDays(lastActiveDate);
  const todayNumUTC = parseYMDToDays(todayUTC);
  const todayNumLocal = parseYMDToDays(todayLocal);

  const gapUTC = todayNumUTC - lastActiveNum;
  const gapLocal = todayNumLocal - lastActiveNum;
  const minGap = Math.min(gapUTC, gapLocal);

  const isCurrentStreakActive = minGap >= 0 && minGap <= 1;
  const current = isCurrentStreakActive ? curRun : 0;

  return { current, longest };
}

function getCachedGitHubStreaks(): { current: number; longest: number } | null {
  if (gitHubStreaksCache) return gitHubStreaksCache;
  const cached = loadCachedGitHubContributions();
  if (cached && cached.length > 0) {
    gitHubStreaksCache = computeGitHubStreaks(cached);
    return gitHubStreaksCache;
  }
  return null;
}

// LeetCode streak computation and caching
let leetCodeStreaksCache: { current: number; longest: number } | null = null;

function computeLeetCodeStreaks(daysMap: Record<string, number>): { current: number; longest: number } {
  const now = new Date();
  const todayUTC = now.toISOString().slice(0, 10);
  const localY = now.getFullYear();
  const localM = String(now.getMonth() + 1).padStart(2, "0");
  const localD = String(now.getDate()).padStart(2, "0");
  const todayLocal = `${localY}-${localM}-${localD}`;
  const maxAllowedDate = todayUTC > todayLocal ? todayUTC : todayLocal;

  const activeDates = Object.keys(daysMap)
    .filter((d) => (daysMap[d] || 0) > 0 && d <= maxAllowedDate)
    .sort();

  if (activeDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 0;
  let curRun = 0;
  let prevDayNum: number | null = null;

  for (const d of activeDates) {
    const dayNum = parseYMDToDays(d);
    if (prevDayNum === null || dayNum - prevDayNum !== 1) {
      curRun = 1;
    } else {
      curRun++;
    }
    if (curRun > longest) {
      longest = curRun;
    }
    prevDayNum = dayNum;
  }

  const lastActiveDate = activeDates[activeDates.length - 1];
  const lastActiveNum = parseYMDToDays(lastActiveDate);
  const todayNumUTC = parseYMDToDays(todayUTC);
  const todayNumLocal = parseYMDToDays(todayLocal);

  const gapUTC = todayNumUTC - lastActiveNum;
  const gapLocal = todayNumLocal - lastActiveNum;
  const minGap = Math.min(gapUTC, gapLocal);

  const isCurrentStreakActive = minGap >= 0 && minGap <= 1;
  const current = isCurrentStreakActive ? curRun : 0;

  return { current, longest };
}

function getCachedLeetCodeStreaks(): { current: number; longest: number } | null {
  if (leetCodeStreaksCache) return leetCodeStreaksCache;
  const cached = loadCachedLeetCodeContributions();
  const rawDays: Record<string, number> = {};

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

  leetCodeStreaksCache = computeLeetCodeStreaks(rawDays);
  return leetCodeStreaksCache;
}

function getCommandResult(rawCmd: string): {
  output?: string;
  isClear?: boolean;
  isHeatmap?: boolean;
  heatmapYear?: number;
  heatmapSource?: "github" | "leetcode";
} {
  const trimmed = rawCmd.trim();
  const normalized = trimmed.replace(/\s+/g, " ").toLowerCase();

  // Technical commands
  if (normalized === "expertise") {
    return { output: "Backend Development, System Design, DevOps, Deep Learning" };
  }
  if (normalized === "backend --focus") {
    return { output: "Node.js, Express, exploring Go" };
  }
  if (normalized === "devops --focus") {
    return { output: "Docker, Nginx, GitHub Actions (CI/CD pipelines)" };
  }
  if (normalized === "languages") {
    return { output: "Java, Python, Go, C, JavaScript, TypeScript" };
  }

  // git-map
  if (normalized === "git-map") {
    return { isHeatmap: true, heatmapYear: 2026, heatmapSource: "github" };
  }
  const gitMapYearMatch = normalized.match(/^git-map(?:\s+--|--)(\d+)$/);
  if (gitMapYearMatch) {
    if (gitMapYearMatch[1].length === 4) {
      const parsedYear = parseInt(gitMapYearMatch[1], 10);
      if (parsedYear > 2026) {
        return { output: "trying to act smart??" };
      }
      if (parsedYear === 2022 || parsedYear === 2023) {
        return { output: "sadly, i was grinding PCM at that time" };
      }
      if (parsedYear < 2022) {
        return { output: "oops, nothing to see here." };
      }
      if (parsedYear >= 2024 && parsedYear <= 2026) {
        return { isHeatmap: true, heatmapYear: parsedYear, heatmapSource: "github" };
      }
    }
  }
  if (normalized.startsWith("git-map")) {
    return { output: "oops, i have not coded any response for this." };
  }

  // git-streak
  if (normalized === "git-streak") {
    const s = getCachedGitHubStreaks();
    if (!s) {
      return { output: "GitHub streak data temporarily unavailable." };
    }
    return { output: `${s.current} ${s.current === 1 ? "day" : "days"}` };
  }
  if (normalized === "git-streak --longest") {
    const s = getCachedGitHubStreaks();
    if (!s) {
      return { output: "GitHub streak data temporarily unavailable." };
    }
    return { output: `${s.longest} ${s.longest === 1 ? "day" : "days"}` };
  }
  if (normalized.startsWith("git-streak")) {
    return { output: "oops, i have not coded any response for this." };
  }

  // leet-map
  if (normalized === "leet-map") {
    return { isHeatmap: true, heatmapYear: 2026, heatmapSource: "leetcode" };
  }
  const leetMapYearMatch = normalized.match(/^leet-map(?:\s+--|--)(\d+)$/);
  if (leetMapYearMatch) {
    if (leetMapYearMatch[1].length === 4) {
      const parsedYear = parseInt(leetMapYearMatch[1], 10);
      if (parsedYear > 2026) {
        return { output: "trying to act smart??" };
      }
      if (parsedYear === 2022 || parsedYear === 2023) {
        return { output: "sadly, i was grinding PCM at that time" };
      }
      if (parsedYear === 2024 || parsedYear < 2022) {
        return { output: "oops, nothing to see here." };
      }
      if (parsedYear >= 2025 && parsedYear <= 2026) {
        return { isHeatmap: true, heatmapYear: parsedYear, heatmapSource: "leetcode" };
      }
    }
  }
  if (normalized.startsWith("leet-map")) {
    return { output: "oops, i have not coded any response for this." };
  }

  // leet-streak
  if (normalized === "leet-streak") {
    const s = getCachedLeetCodeStreaks();
    if (!s) {
      return { output: "LeetCode streak data temporarily unavailable." };
    }
    return { output: `${s.current} ${s.current === 1 ? "day" : "days"}` };
  }
  if (normalized === "leet-streak --longest") {
    const s = getCachedLeetCodeStreaks();
    if (!s) {
      return { output: "LeetCode streak data temporarily unavailable." };
    }
    return { output: `${s.longest} ${s.longest === 1 ? "day" : "days"}` };
  }
  if (normalized.startsWith("leet-streak")) {
    return { output: "oops, i have not coded any response for this." };
  }

  // Personal and utility commands
  if (normalized === "whoami") {
    return { output: "Nikhil Virdi — CS undergrad from Jammu, living in Bangalore." };
  }
  if (normalized === "interests") {
    return { output: "Cricket, geopolitics, reading about Himalayan peoples and culture" };
  }
  if (normalized === "sudo chai") {
    return { output: "send me your address i'll parcel a cup of chai" };
  }
  if (normalized === "date") {
    return { output: new Date().toDateString() };
  }
  if (normalized === "help") {
    return {
      output: [
        "  expertise              Display expertise domains",
        "  backend --focus        Display backend technologies and focus",
        "  devops --focus         Display DevOps tools and pipelines",
        "  languages              List all programming languages",
        "  git-map                Show current-year GitHub contribution heatmap",
        "  git-map --YYYY         Show GitHub contribution heatmap for a specific year",
        "  git-streak             Show current GitHub contribution streak",
        "  git-streak --longest   Show longest GitHub contribution streak",
        "  leet-map               Show current-year LeetCode submission heatmap",
        "  leet-map --YYYY        Show LeetCode submission heatmap for a specific year",
        "  leet-streak            Show current LeetCode submission streak",
        "  leet-streak --longest  Show longest LeetCode submission streak",
        "  whoami                 Display personal introduction",
        "  interests              Display personal interests and hobbies",
        "  sudo chai              Request a cup of chai",
        "  date                   Display current date",
        "  help                   List all supported commands and descriptions",
        "  clear                  Clear command and output history",
        "  exit                   Exit the terminal",
      ].join("\n"),
    };
  }
  if (normalized === "clear") {
    return { output: "", isClear: true };
  }
  if (normalized === "exit") {
    return { output: "there's nowhere to exit, better close the tab." };
  }

  return { output: "oops, i have not coded any response for this." };
}

export interface TerminalExpertiseProps {
  className?: string;
}

export function TerminalExpertise({ className }: TerminalExpertiseProps) {
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [commandList, setCommandList] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [input, setInput] = useState<string>("");

  const queueRef = useRef<string[]>([]);
  const currentSuggestionRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  // Initial suggestion chosen randomly from whoami and help
  const [suggestion, setSuggestion] = useState<string>(() => {
    const initial = INITIAL_SUGGESTIONS[Math.floor(Math.random() * INITIAL_SUGGESTIONS.length)];
    currentSuggestionRef.current = initial;
    // Prepare the shuffled queue with remaining suggestions so no repetition occurs
    const remaining = ALL_SUGGESTIONS.filter((s) => s !== initial);
    queueRef.current = shuffle(remaining);
    return initial;
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const tempInputRef = useRef<string>("");
  const shouldScrollRef = useRef<boolean>(false);

  // Scroll terminal history to newest output only after command execution
  useEffect(() => {
    if (shouldScrollRef.current && historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
      shouldScrollRef.current = false;
      const frameId = requestAnimationFrame(() => {
        if (historyScrollRef.current) {
          historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [history]);

  // Select next suggestion from the shuffled queue, refilling without repeating the current one
  const getNextSuggestion = useCallback(() => {
    if (queueRef.current.length === 0) {
      const last = currentSuggestionRef.current;
      const pool = ALL_SUGGESTIONS.filter((s) => s !== last);
      queueRef.current = shuffle(pool);
    }
    const next = queueRef.current.shift()!;
    currentSuggestionRef.current = next;
    setSuggestion(next);
    return next;
  }, []);

  // Manage 10-second timer to avoid stale closures
  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      getNextSuggestion();
    }, 10000);
  }, [getNextSuggestion]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [resetTimer]);

  // Auto-focus input on mount and pre-fetch fresh streaks
  useEffect(() => {
    inputRef.current?.focus();

    // Background fetch to ensure fresh GitHub streak data
    fetch("https://github-contributions-api.jogruber.de/v4/nikhilvirdi?y=all&client=react-github-calendar")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && Array.isArray(json.contributions)) {
          gitHubStreaksCache = computeGitHubStreaks(json.contributions);
        }
      })
      .catch(() => {});

    // Background fetch to ensure fresh LeetCode streak data
    fetch("https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2026")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) {
          const rawDays: Record<string, number> = {};
          const snap = leetcodeSnapshot as { days?: Record<string, number> } | undefined;
          if (snap?.days) {
            Object.assign(rawDays, snap.days);
          }
          if (json.submissionCalendar) {
            try {
              const subCal =
                typeof json.submissionCalendar === "string"
                  ? JSON.parse(json.submissionCalendar)
                  : json.submissionCalendar;
              for (const [timestamp, count] of Object.entries(subCal)) {
                const dateKey = new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
                rawDays[dateKey] = Number(count);
              }
            } catch {}
          }
          leetCodeStreaksCache = computeLeetCodeStreaks(rawDays);
        }
      })
      .catch(() => {});
  }, []);

  const handleExecute = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const { output, isClear, isHeatmap, heatmapYear, heatmapSource } = getCommandResult(trimmed);

    if (isClear) {
      setHistory([]);
    } else {
      const newItem: CommandHistoryItem = {
        id: `${Date.now()}-${Math.random()}`,
        command: trimmed,
        output,
        isHeatmap,
        heatmapYear,
        heatmapSource,
      };
      shouldScrollRef.current = true;
      setHistory((prev) => [...prev, newItem]);
    }

    setCommandList((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    tempInputRef.current = "";
    setInput("");

    // Advance to next suggestion from queue and restart the 10-second timer
    getNextSuggestion();
    resetTimer();

    // Keep input usable and focused after execution
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [input, getNextSuggestion, resetTimer]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    } else if (e.key === "Tab") {
      if (!input) {
        e.preventDefault();
        setInput(suggestion);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandList.length === 0) return;

      if (historyIndex === -1) {
        tempInputRef.current = input;
        const newIndex = commandList.length - 1;
        setHistoryIndex(newIndex);
        setInput(commandList[newIndex]);
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandList[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;

      if (historyIndex < commandList.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandList[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput(tempInputRef.current);
      }
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      role="region"
      aria-label="Interactive CS Expertise Terminal"
      onClick={handleContainerClick}
      className={cn(
        "rounded-[4px] border border-transparent bg-black p-2.5 sm:p-3 mt-2.5 mb-0 w-full flex-1 min-h-0 flex flex-col font-mono text-[12px] leading-[18px] cursor-text",
        className
      )}
    >
      {/* Internally scrollable history/output area */}
      {history.length > 0 && (
        <div
          ref={historyScrollRef}
          className="overflow-y-auto min-h-0 space-y-1.5 mb-1.5 pr-1"
        >
          {history.map((item) => (
            <div key={item.id} className="space-y-0.5">
              <div className="flex items-center text-white break-all">
                <span className="text-white select-none mr-2 font-semibold shrink-0">
                  &gt;{" "}
                </span>
                <span>{item.command}</span>
              </div>
              {item.isHeatmap ? (
                <div className="pl-4 my-1 max-w-full overflow-hidden">
                  <EasterEggHeatmap
                    years={[item.heatmapYear ?? 2026]}
                    source={item.heatmapSource ?? "github"}
                  />
                </div>
              ) : item.output ? (
                <div className="text-neutral-300 whitespace-pre-wrap pl-4 break-words">
                  {item.output}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Input line with white '>' prompt, white cursor, and inline ghost-text suggestion placeholder */}
      <div className="flex items-center shrink-0 text-white">
        <span className="text-white select-none mr-2 font-semibold shrink-0">
          &gt;{" "}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={suggestion}
          className="w-full bg-transparent border-0 outline-none p-0 font-mono text-[12px] text-white placeholder:text-neutral-500 caret-white focus:ring-0 focus:outline-none"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          aria-label="Terminal command input"
        />
      </div>
    </div>
  );
}

export default TerminalExpertise;
