import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'entering' | 'covering' | 'exiting' | 'done';

export default function ScrollIntercept() {
  const [phase, setPhase] = useState<Phase>('idle');
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const scrollEl = document.querySelector('main') as HTMLElement | null;

    const lockScroll = () => {
      if (scrollEl) scrollEl.style.overflow = 'hidden';
    };
    const unlockScroll = () => {
      if (scrollEl) scrollEl.style.overflow = 'auto';
    };

    const handleWheel = (e: WheelEvent) => {
      if (hasTriggeredRef.current) return;
      if (e.deltaY <= 0) return; // only downward scroll

      hasTriggeredRef.current = true;
      e.stopPropagation();
      lockScroll();

      // Mount overlay in its start position (off-screen below)
      setPhase('entering');

      // Next frame: trigger the sweep-in animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('covering');

          // After sweep-in completes (700ms), sweep out
          setTimeout(() => {
            setPhase('exiting');

            // After sweep-out completes (450ms), done
            setTimeout(() => {
              setPhase('done');
              unlockScroll();
            }, 500);
          }, 750);
        });
      });
    };

    scrollEl?.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      scrollEl?.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
    };
  }, []);

  if (phase === 'idle' || phase === 'done') return null;

  const translateY =
    phase === 'entering'
      ? '100%'      // start off-screen below
      : phase === 'covering'
        ? '0%'       // fully covers screen
        : '-100%';   // swept off above

  const transition =
    phase === 'entering'
      ? 'none'       // no transition on mount
      : phase === 'covering'
        ? 'transform 0.7s cubic-bezier(0.76, 0, 0.24, 1)'
        : 'transform 0.45s cubic-bezier(0.76, 0, 0.24, 1)';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        pointerEvents: 'none',
        backgroundColor: '#ffffff',
        transform: `translateY(${translateY})`,
        transition,
        willChange: 'transform',
      }}
    />
  );
}
