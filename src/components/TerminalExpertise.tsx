import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { EasterEggHeatmap } from "./EasterEggHeatmap";

interface CommandHistoryItem {
  id: string;
  command: string;
  output?: string;
  isHeatmap?: boolean;
  heatmapYear?: number;
}

const INITIAL_SUGGESTIONS = ["whoami", "help"];

const ALL_SUGGESTIONS = [
  "whoami",
  "languages --list",
  "languages --primary",
  "domains --list",
  "domains --exploring",
  "git-map",
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

function getCommandResult(rawCmd: string): { output?: string; isClear?: boolean; isHeatmap?: boolean; heatmapYear?: number } {
  const trimmed = rawCmd.trim();
  const normalized = trimmed.replace(/\s+/g, " ").toLowerCase();

  if (normalized === "whoami") {
    return { output: "Nikhil Virdi" };
  }
  if (normalized === "languages --list") {
    return { output: "Java, Python, Go, C, JavaScript" };
  }
  if (normalized === "languages --primary") {
    return { output: "Java" };
  }
  if (normalized === "domains --list") {
    return { output: "Backend, System Design, DevOps, Deep Learning" };
  }
  if (normalized === "domains --exploring") {
    return { output: "GenAI, Machine Learning, LLMs" };
  }
  if (normalized === "sudo chai") {
    return { output: "send me your address i'll parcel a cup of chai" };
  }
  if (normalized === "git-map") {
    return { isHeatmap: true, heatmapYear: 2026 };
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
        return { isHeatmap: true, heatmapYear: parsedYear };
      }
    }
  }

  if (normalized.startsWith("git-map")) {
    return { output: "oops, i have not coded any response for this." };
  }

  if (normalized === "help") {
    return {
      output: [
        "Supported commands:",
        "  whoami              Display current user identity",
        "  languages --list    List all programming languages",
        "  languages --primary Show primary programming language",
        "  domains --list      List expertise domains",
        "  domains --exploring List domains currently exploring",
        "  git-map             Show current-year heatmap",
        "  git-map --YYYY      Show a specific year's heatmap",
        "  help                List supported commands and descriptions",
        "  clear               Clear command and output history",
      ].join("\n"),
    };
  }
  if (normalized === "clear") {
    return { output: "", isClear: true };
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

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleExecute = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const { output, isClear, isHeatmap, heatmapYear } = getCommandResult(trimmed);

    if (isClear) {
      setHistory([]);
    } else {
      const newItem: CommandHistoryItem = {
        id: `${Date.now()}-${Math.random()}`,
        command: trimmed,
        output,
        isHeatmap,
        heatmapYear,
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
                  <EasterEggHeatmap years={[item.heatmapYear ?? 2026]} />
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
