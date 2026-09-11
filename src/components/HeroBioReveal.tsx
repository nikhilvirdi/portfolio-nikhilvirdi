import { Fragment, useEffect, useRef, useState } from 'react';

const LINES = [
  "Yo gng! I'm Nik. I genuinely can't function",
  "without chai. It's less a drink and more a",
  "personality trait at this point. I do my best",
  "thinking during the kind of sleepless nights",
  "most people would call a bad idea.",
  "I've built a PR watchdog, a bug-",
  "hunting property-based testing library, and",
  "a live sky companion that shows you what's actually",
  "happening above you right now. Currently",
  "tinkering with a memory tool that helps keep",
  "track of what we were even doing mid-project.",
];

interface HighlightDef {
  phrase: string;
  className: string;
}

const HIGHLIGHTS: HighlightDef[] = [
  { phrase: "I'm Nik", className: "bg-[#0284c7]/45" },
  { phrase: "chai", className: "bg-[#78350f]/60" },
  { phrase: "sleepless nights", className: "bg-[#ca8a04]/45" },
  { phrase: "sky companion", className: "bg-[#52525b]/50" },
  { phrase: "memory tool", className: "bg-[#be123c]/35" },
];

interface Segment {
  text: string;
  startIndex: number;
  highlightClass?: string;
}

interface ParsedLine {
  lineIdx: number;
  segments: Segment[];
}

function parseLineSegments(lines: string[], highlights: HighlightDef[]) {
  let globalCharIndex = 0;
  const parsedLines: ParsedLine[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx];
    const matches: { phrase: string; className: string; start: number; end: number }[] = [];

    for (const h of highlights) {
      const idx = lineText.indexOf(h.phrase);
      if (idx !== -1) {
        matches.push({
          phrase: h.phrase,
          className: h.className,
          start: idx,
          end: idx + h.phrase.length,
        });
      }
    }
    matches.sort((a, b) => a.start - b.start);

    const segments: Segment[] = [];
    let curr = 0;
    for (const m of matches) {
      if (m.start > curr) {
        const text = lineText.slice(curr, m.start);
        segments.push({
          text,
          startIndex: globalCharIndex,
        });
        globalCharIndex += text.length;
      }
      const text = lineText.slice(m.start, m.end);
      segments.push({
        text,
        highlightClass: m.className,
        startIndex: globalCharIndex,
      });
      globalCharIndex += text.length;
      curr = m.end;
    }

    if (curr < lineText.length) {
      const text = lineText.slice(curr);
      segments.push({
        text,
        startIndex: globalCharIndex,
      });
      globalCharIndex += text.length;
    }

    parsedLines.push({
      lineIdx,
      segments,
    });
  }

  return { parsedLines, totalChars: globalCharIndex };
}

const { parsedLines: PARSED_LINES, totalChars: TOTAL_CHARS } = parseLineSegments(
  LINES,
  HIGHLIGHTS,
);

// Total accumulated wheel deltaY needed to fully reveal all characters.
// ~30 mouse-wheel clicks or equivalent trackpad distance.
const TOTAL_SCROLL_PX = 3000;

export default function HeroBioReveal() {
  const [revealed, setRevealed] = useState(0);

  // Refs so event handlers always see current values without re-registration
  const revealedRef = useRef(0);
  const accRef = useRef(0); // accumulated deltaY, range [0, TOTAL_SCROLL_PX]
  const doneAndPassedRef = useRef(false); // true once fully revealed and scrolled away

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Let ScrollIntercept's white-overlay effect run unimpeded
      if (document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden') return;

      // Once fully revealed and user has scrolled past hero: never re-engage
      if (doneAndPassedRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;

      // If the page has scrolled away from hero (scrollTop > small threshold)
      if (scrollTop > 80) {
        // Reveal is complete and user has scrolled past — mark done
        if (revealedRef.current >= TOTAL_CHARS) {
          doneAndPassedRef.current = true;
        }
        // Either way, don't intercept — let normal scroll happen
        return;
      }

      // ── Hero is in view (scrollTop ≈ 0) ──

      const currentAcc = accRef.current;
      const currentRevealed = revealedRef.current;

      if (e.deltaY > 0 && currentRevealed < TOTAL_CHARS) {
        // Scrolling down, reveal not complete: lock scroll, advance reveal
        e.preventDefault();
        const newAcc = Math.min(TOTAL_SCROLL_PX, currentAcc + e.deltaY);
        const newRevealed = Math.min(
          TOTAL_CHARS,
          Math.round((newAcc / TOTAL_SCROLL_PX) * TOTAL_CHARS),
        );
        accRef.current = newAcc;
        if (newRevealed !== currentRevealed) {
          revealedRef.current = newRevealed;
          setRevealed(newRevealed);
        }
        return;
      }

      if (e.deltaY < 0 && currentRevealed > 0 && scrollTop <= 5) {
        // Scrolling up, some chars revealed, page at top: lock scroll, reverse reveal
        e.preventDefault();
        const newAcc = Math.max(0, currentAcc + e.deltaY); // deltaY is negative
        const newRevealed = Math.max(
          0,
          Math.round((newAcc / TOTAL_SCROLL_PX) * TOTAL_CHARS),
        );
        accRef.current = newAcc;
        if (newRevealed !== currentRevealed) {
          revealedRef.current = newRevealed;
          setRevealed(newRevealed);
        }
        return;
      }

      // All other cases (reveal complete scrolling down, or nothing to reverse scrolling up):
      // let the browser handle scrolling normally
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      window.removeEventListener('wheel', handleWheel, {
        capture: true,
      } as EventListenerOptions);
    };
  }, []);

  const isComplete = revealed >= TOTAL_CHARS;

  return (
    <h1 className="font-heading text-[38px] font-bold leading-tight max-w-none w-full tracking-tight">
      {PARSED_LINES.map((pl, lineIdx) => (
        <Fragment key={lineIdx}>
          <span className="inline-block whitespace-nowrap">
            {pl.segments.map((segment) => {
              const chars = Array.from(segment.text);
              if (!segment.highlightClass) {
                return (
                  <span key={segment.startIndex}>
                    {chars.map((char, charIdx) => {
                      const i = segment.startIndex + charIdx;
                      return (
                        <span
                          key={i}
                          style={{ color: i < revealed ? '#f2f2f0' : '#71717a' }}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                );
              }

              return (
                <span
                  key={segment.startIndex}
                  className={`box-decoration-clone transition-colors duration-700 ease-out ${
                    isComplete ? segment.highlightClass : 'bg-transparent'
                  }`}
                >
                  {chars.map((char, charIdx) => {
                    const i = segment.startIndex + charIdx;
                    return (
                      <span
                        key={i}
                        style={{ color: i < revealed ? '#f2f2f0' : '#71717a' }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </span>
              );
            })}
          </span>
          {lineIdx < PARSED_LINES.length - 1 && <br />}
        </Fragment>
      ))}
    </h1>
  );
}
