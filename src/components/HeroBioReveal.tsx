import { Fragment, useEffect, useRef, useState } from 'react';
import { setHeroProgress } from '../utils/heroScroll';

const LINES = [
  "",
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

interface ParsedWord {
  word: string;
  startIndex: number;
}

function parseMobileWords(text: string) {
  const words = text.split(' ');
  let currentIndex = 0;
  const parsedWords: ParsedWord[] = [];
  for (let i = 0; i < words.length; i++) {
    parsedWords.push({
      word: words[i],
      startIndex: currentIndex,
    });
    currentIndex += words[i].length + 1;
  }
  return { parsedWords, totalChars: currentIndex };
}

const { parsedLines: PARSED_LINES, totalChars: TOTAL_CHARS } = parseLines(LINES);

const MOBILE_TEXT = LINES.filter((l) => l.trim().length > 0).join(" ");
const { parsedWords: MOBILE_PARSED_WORDS, totalChars: MOBILE_TOTAL_CHARS } = parseMobileWords(MOBILE_TEXT);

// Total accumulated wheel deltaY needed to fully reveal all characters.
// ~30 mouse-wheel clicks or equivalent trackpad distance.
const TOTAL_SCROLL_PX = 3000;

interface HeroBioRevealProps {
  isMobile?: boolean;
}

export default function HeroBioReveal({ isMobile = false }: HeroBioRevealProps = {}) {
  const [revealed, setRevealed] = useState(0);

  // Refs so event handlers always see current values without re-registration
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const revealedRef = useRef(0);
  const accRef = useRef(0); // accumulated deltaY, range [0, TOTAL_SCROLL_PX]
  const doneAndPassedRef = useRef(false); // true once fully revealed and scrolled away

  useEffect(() => {
    // Check if main-scroll-pane exists and is actually scrollable
    const getScrollContainer = () => {
      const el = document.getElementById('main-scroll-pane');
      if (el && el.clientHeight > 0 && el.scrollHeight > el.clientHeight) {
        return el;
      }
      return null;
    };

    // Check if this specific HeroBioReveal instance is visible in the active layout
    const isVisible = () => {
      if (!headingRef.current) return false;
      const rect = headingRef.current.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isVisible()) return;

      const scrollEl = getScrollContainer();
      // On mobile / when main-scroll-pane is not scrollable, do not intercept wheel
      if (!scrollEl) return;

      // Do not engage if scroll is locked
      if (
        scrollEl.style.overflow === 'hidden' ||
        document.body.style.overflow === 'hidden' ||
        document.documentElement.style.overflow === 'hidden'
      ) {
        return;
      }

      // Once fully revealed and user has scrolled past hero: never re-engage
      if (doneAndPassedRef.current) return;

      const scrollTop = scrollEl.scrollTop;

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
      if (!isVisible()) return;

      const scrollEl = getScrollContainer();
      if (scrollEl) {
        const scrollTop = scrollEl.scrollTop;
        if (scrollTop > 80 && revealedRef.current >= TOTAL_CHARS) {
          doneAndPassedRef.current = true;
        }
      } else {
        // Fallback for mobile / window scroll:
        // Compute scroll progress from window.scrollY relative to the Hero block's own position
        if (doneAndPassedRef.current) return;
        if (!headingRef.current) return;

        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const heroBlock = headingRef.current.closest('section') || headingRef.current;
        const rect = heroBlock.getBoundingClientRect();

        const scrollRange = Math.max(180, Math.min(320, rect.height || 260));
        const progress = Math.min(1, Math.max(0, scrollY / scrollRange));

        accRef.current = progress * TOTAL_SCROLL_PX;
        setHeroProgress(progress);

        const targetTotal = isMobile ? MOBILE_TOTAL_CHARS : TOTAL_CHARS;
        const newRevealed = Math.min(
          targetTotal,
          Math.round(progress * targetTotal),
        );
        if (newRevealed !== revealedRef.current) {
          revealedRef.current = newRevealed;
          setRevealed(newRevealed);
        }

        if (scrollY > scrollRange + 40 && newRevealed >= targetTotal) {
          doneAndPassedRef.current = true;
        }
      }
    };

    const scrollPane = document.getElementById('main-scroll-pane');
    scrollPane?.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    scrollPane?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    if (isVisible() && !getScrollContainer()) {
      handleScroll();
    }

    return () => {
      scrollPane?.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
      scrollPane?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile]);

  if (isMobile) {
    return (
      <h1
        ref={headingRef}
        className="font-heading text-[22px] sm:text-[28px] font-bold leading-snug tracking-tight text-foreground w-full"
      >
        {MOBILE_PARSED_WORDS.map((pw, wordIdx) => (
          <Fragment key={wordIdx}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(pw.word).map((char, charIdx) => {
                const i = pw.startIndex + charIdx;
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
            {wordIdx < MOBILE_PARSED_WORDS.length - 1 && ' '}
          </Fragment>
        ))}
      </h1>
    );
  }

  return (
    <h1
      ref={headingRef}
      className="font-heading text-[39px] font-bold leading-[1.1] max-w-none w-full tracking-tight"
    >
      {PARSED_LINES.map((pl, lineIdx) => (
        <Fragment key={lineIdx}>
          <span className="inline-block whitespace-nowrap">
            {pl.chars.length === 0 ? (
              '\u00A0'
            ) : (
              pl.chars.map((char, charIdx) => {
                const i = pl.startIndex + charIdx;
                return (
                  <span
                    key={i}
                    style={{ color: i < revealed ? '#f2f2f0' : '#71717a' }}
                  >
                    {char}
                  </span>
                );
              })
            )}
          </span>
          {lineIdx < PARSED_LINES.length - 1 && <br />}
        </Fragment>
      ))}
    </h1>
  );
}
