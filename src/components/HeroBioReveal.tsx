import { Fragment, useEffect, useRef, useState } from 'react';
import { setHeroProgress } from '../utils/heroScroll';

const LINES = [
  "Yo gng! I'm Nik. I genuinely can't function",
  "without chai. It's less a drink and more a",
  "personality trait at this point. I do my best",
  "thinking during the kind of sleepless nights",
  "most people would call a bad idea.",
  "I've built a PR watchdog, a bug-hunting",
  "property-based testing library, and",
  "a live sky companion that shows you",
  "what's actually happening above you",
  "right now. Currently tinkering with a memory",
  "tool that helps keep track of what we",
  "were even doing mid-project.",
];

interface ParsedLine {
  lineIdx: number;
  startIndex: number;
  chars: string[];
}

function parseLines(lines: string[]) {
  let globalCharIndex = 0;
  const parsed: ParsedLine[] = [];
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const chars = Array.from(lines[lineIdx]);
    parsed.push({
      lineIdx,
      startIndex: globalCharIndex,
      chars,
    });
    globalCharIndex += chars.length;
  }
  return { parsedLines: parsed, totalChars: globalCharIndex };
}

const { parsedLines: PARSED_LINES, totalChars: TOTAL_CHARS } = parseLines(LINES);

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
    setHeroProgress(accRef.current / TOTAL_SCROLL_PX);
    const scrollEl = (document.getElementById('main-scroll-pane') || document.querySelector('main')) as HTMLElement | null;

    const getScrollTop = () => {
      if (scrollEl) return scrollEl.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const handleWheel = (e: WheelEvent) => {
      // Let ScrollIntercept's white-overlay effect run unimpeded
      if (
        (scrollEl && scrollEl.style.overflow === 'hidden') ||
        document.body.style.overflow === 'hidden' ||
        document.documentElement.style.overflow === 'hidden'
      ) {
        return;
      }

      // Once fully revealed and user has scrolled past hero: never re-engage
      if (doneAndPassedRef.current) return;

      const scrollTop = getScrollTop();

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
        setHeroProgress(newAcc / TOTAL_SCROLL_PX);
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
        setHeroProgress(newAcc / TOTAL_SCROLL_PX);
        if (newRevealed !== currentRevealed) {
          revealedRef.current = newRevealed;
          setRevealed(newRevealed);
        }
        return;
      }

      // All other cases (reveal complete scrolling down, or nothing to reverse scrolling up):
      // let the browser handle scrolling normally
    };

    const handleScroll = () => {
      const scrollTop = getScrollTop();
      if (scrollTop > 80 && revealedRef.current >= TOTAL_CHARS) {
        doneAndPassedRef.current = true;
      }
    };

    scrollEl?.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    scrollEl?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      scrollEl?.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
      scrollEl?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
    };
  }, []);

  return (
    <h1 className="font-heading text-[35px] font-bold leading-tight max-w-none w-full tracking-tight">
      {PARSED_LINES.map((pl, lineIdx) => (
        <Fragment key={lineIdx}>
          <span className="inline-block whitespace-nowrap">
            {pl.chars.map((char, charIdx) => {
              const i = pl.startIndex + charIdx;
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
          {lineIdx < PARSED_LINES.length - 1 && <br />}
        </Fragment>
      ))}
    </h1>
  );
}
