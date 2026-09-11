import { useEffect, useRef, useState } from 'react';

const TEXT =
  "Yo gng! I'm Nik. I genuinely can't function without chai. It's less a drink and more a personality trait at this point. I do my best thinking during the kind of sleepless nights most people would call a bad idea. I've built a PR watchdog, a bug-hunting testing library, and a live sky companion that shows you what's actually happening above you right now. Currently tinkering with a memory tool that helps keep track of what we were even doing mid-project. Outside of building things, I run Riyasat-e-Duggar, where I document the culture and history of the trans-Himalayan region, something I'll call a side chic of mine.";

const CHARS = Array.from(TEXT);
const TOTAL_CHARS = CHARS.length;

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
    const mainEl = document.querySelector('main') as HTMLElement | null;
    if (!mainEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Let ScrollIntercept's white-overlay effect run unimpeded
      if (mainEl.style.overflow === 'hidden') return;

      // Once fully revealed and user has scrolled past hero: never re-engage
      if (doneAndPassedRef.current) return;

      const scrollTop = mainEl.scrollTop;

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

      if (e.deltaY < 0 && currentRevealed > 0 && scrollTop === 0) {
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

    mainEl.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      mainEl.removeEventListener('wheel', handleWheel, {
        capture: true,
      } as EventListenerOptions);
    };
  }, []);

  return (
    <h1 className="font-heading text-[46px] font-bold leading-tight max-w-[92%] tracking-tight">
      {CHARS.map((char, i) => (
        <span
          key={i}
          style={{ color: i < revealed ? '#f2f2f0' : '#71717a' }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
}
