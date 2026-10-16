import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/* Inline stand-in for @gsap/react's useGSAP. Mirrors its default
   `revertOnUpdate: false`: one gsap.context lives for the component's
   lifetime, the callback is re-added when dependencies change, and the
   context is reverted only on unmount. A callback may return its own
   cleanup, which runs before the next re-add and on unmount. */
function useGSAP(
  callback: (context: gsap.Context) => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  }
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export type JHuskRelease = {
  id: string;
  version: string;
  date: string;
  content: string;
};

type SplitTextInstance = InstanceType<typeof SplitText>;

export type JHuskTimelineProps = {
  scrollerId?: string;
  periodLabel?: string;
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  logoAlt?: string;
  /** Reveal animation duration, in seconds. */
  duration?: number;
  /** Fallback reveal duration when `duration` is omitted, in seconds. */
  scrollDuration?: number;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);

  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;

  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

export const topJourneyData: JHuskRelease[] = [
  {
    id: "v1-0-0",
    version: "v1.0.0",
    date: "August 8, 2026",
    content:
      "First release: composable generators, internal shrinking, JUnit 5 integration, deterministic seed replay, and local failure storage.",
  },
  {
    id: "v1-1-0",
    version: "v1.1.0",
    date: "August 10, 2026",
    content:
      "Deterministic edge cases, exhaustive generators, improved collection shrinking, and stateful command-sequence testing.",
  },
  {
    id: "v1-2-0",
    version: "v1.2.0",
    date: "August 31, 2026",
    content:
      "Structured JUnit 5 reports, property-level results, configurable timeouts, validation improvements, and adversarial suite with 210 scenarios and 17 planted bugs.",
  },
];

export const bottomJourneyData: JHuskRelease[] = [
  {
    id: "v1-0-1",
    version: "v1.0.1",
    date: "August 9, 2026",
    content:
      "Reliability updates: timeouts, configurable generation budgets, Windows atomic-write retries, and a clearer exception hierarchy.",
  },
  {
    id: "v1-1-1",
    version: "v1.1.1",
    date: "August 10, 2026",
    content:
      "Fixed Generator.flatMap() handling of invalid source results.",
  },
];

export const allJourneyItems: JHuskRelease[] = [
  topJourneyData[0], // v1.0.0 (Aug 8)
  bottomJourneyData[0], // v1.0.1 (Aug 9)
  topJourneyData[1], // v1.1.0 (Aug 10)
  bottomJourneyData[1], // v1.1.1 (Aug 10)
  topJourneyData[2], // v1.2.0 (Aug 31)
];

export default function JHuskTimeline({
  scrollerId,
  periodLabel = "August 2026",
  textColor = "var(--color-foreground, #ffffff)",
  mutedTextColor = "#a1a1aa",
  activeColor = "#ff5f00",
  backgroundColor = "var(--color-background, #000000)",
  logoUrl = "/logos/jhusk.svg",
  logoAlt = "JHusk logo",
  duration,
  scrollDuration = 1.2,
}: JHuskTimelineProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);

  const sectionStyle: CSSProperties = {
    color: textColor,
    backgroundColor,
  };
  const activeStyle: CSSProperties = {
    backgroundColor: activeColor,
  };
  const mutedTextStyle: CSSProperties = {
    color: mutedTextColor,
  };

  // Horizontal scrub animation & main timeline line
  useGSAP(
    () => {
      const section = sectionRef.current;
      const slider = wholeSliderRef.current;
      const frame = frameRef.current;
      if (!section || !slider || !frame) return;

      const scroller = scrollerId ? document.getElementById(scrollerId) : null;
      const scrollerTarget = scroller ?? window;

      const isMobile = window.innerWidth < 640;
      const calculateDistance = () => {
        const totalWidth = slider.scrollWidth;
        const frameWidth = frame.clientWidth;
        if (totalWidth <= frameWidth) return 0;
        return -(totalWidth - frameWidth + (isMobile ? 24 : 48));
      };

      const slideDistance = calculateDistance();
      const lineWidth = isMobile ? "85%" : "98%";

      const mainTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          scroller: scrollerTarget,
          start: "top top",
          end: () =>
            `+=${Math.max(600, section.offsetHeight - frame.offsetHeight)}`,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
        defaults: {
          ease: "none",
        },
      });

      mainTl.fromTo(slider, { x: 0 }, { x: slideDistance });

      if (reducedMotion) {
        gsap.set(".journey-line", { width: lineWidth });
        return;
      }

      gsap.to(".journey-line", {
        width: lineWidth,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          scroller: scrollerTarget,
          start: "top top",
          end: () =>
            `+=${Math.max(600, section.offsetHeight - frame.offsetHeight)}`,
          scrub: 0.8,
        },
      });
    },
    { dependencies: [reducedMotion, scrollerId], scope: sectionRef }
  );

  // Milestone reveals with SplitText and animated lines/dots
  useGSAP(
    () => {
      const section = sectionRef.current;
      const frame = frameRef.current;
      if (!section || !frame) return;

      const scroller = scrollerId ? document.getElementById(scrollerId) : null;
      const scrollerTarget = scroller ?? window;

      const items = allJourneyItems;

      if (reducedMotion) {
        items.forEach((item) => {
          gsap.set(`.jl-${item.id}`, { scaleY: 1 });
          gsap.set(`.jd-${item.id}`, { scale: 1 });
          gsap.set(`.title-${item.id}`, { opacity: 1, clearProps: "transform" });
          gsap.set(`.description-${item.id}`, {
            opacity: 1,
            clearProps: "transform",
          });
        });
        return;
      }

      items.forEach((item) => {
        gsap.set(`.jl-${item.id}`, {
          scaleY: 0,
          transformOrigin: "bottom bottom",
        });
        gsap.set(`.jd-${item.id}`, { scale: 0 });
        gsap.set(`.title-${item.id}`, { opacity: 1 });
        gsap.set(`.description-${item.id}`, { opacity: 1 });
      });

      const titleSplits: Partial<Record<string, SplitTextInstance>> = {};
      const descriptionSplits: Partial<Record<string, SplitTextInstance>> = {};

      items.forEach((item) => {
        const titleEl = section.querySelector(`.title-${item.id}`);
        const descEl = section.querySelector(`.description-${item.id}`);

        if (titleEl) {
          titleSplits[item.id] = new SplitText(titleEl, {
            type: "lines, words",
            mask: "lines",
          });
        }

        if (descEl) {
          descriptionSplits[item.id] = new SplitText(descEl, {
            type: "lines, words",
          });
        }
      });

      const isTopItem = (id: string) =>
        topJourneyData.some((t) => t.id === id);

      items.forEach((item, index) => {
        const lineSelector = `.jl-${item.id}`;
        const dotSelector = `.jd-${item.id}`;
        const titleLines = titleSplits[item.id]?.lines || [];
        const descriptionLines = descriptionSplits[item.id]?.lines || [];

        if (!isTopItem(item.id)) {
          gsap.set(lineSelector, { transformOrigin: "top top" });
        }

        const step = 0.8 / items.length;
        const startProgress = 0.04 + index * step;
        const endProgress = startProgress + step * 0.9;

        const totalScrollDistance = Math.max(
          600,
          section.offsetHeight - frame.offsetHeight
        );
        const startPx = Math.round(startProgress * totalScrollDistance);
        const endPx = Math.round(endProgress * totalScrollDistance);

        const itemTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            scroller: scrollerTarget,
            start: `top+=${startPx} top`,
            end: `top+=${endPx} top`,
            scrub: 0.5,
          },
        });

        itemTimeline
          .to(lineSelector, {
            scaleY: 1,
            duration: normalizedDuration * 0.4,
          })
          .to(
            dotSelector,
            {
              scale: 1,
              duration: normalizedDuration * 0.4,
            },
            "<"
          )
          .fromTo(
            titleLines,
            { y: 35, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              delay: -0.8 * normalizedDuration,
              duration: normalizedDuration,
              stagger: 0.02,
              ease: "power2.out",
            }
          )
          .fromTo(
            descriptionLines,
            { y: 35, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: normalizedDuration,
              stagger: 0.02,
              ease: "power2.out",
            },
            "<"
          );
      });

      const refreshTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);

      const handleResize = () => {
        ScrollTrigger.refresh();
      };

      window.addEventListener("resize", handleResize);

      return () => {
        clearTimeout(refreshTimer);
        Object.values(titleSplits).forEach((split) => split?.revert?.());
        Object.values(descriptionSplits).forEach((split) => split?.revert?.());
        window.removeEventListener("resize", handleResize);
      };
    },
    {
      dependencies: [normalizedDuration, reducedMotion, scrollerId],
      scope: sectionRef,
    }
  );

  return (
    <div
      ref={sectionRef}
      id="jhusk-timeline-section"
      className="relative w-full shrink-0"
      style={{ height: "1400px" }}
    >
      <div
        ref={frameRef}
        className="sticky top-0 w-full h-[380px] sm:h-[420px] overflow-hidden rounded-lg bg-black border border-transparent select-none"
        style={sectionStyle}
      >
        <div
          ref={wholeSliderRef}
          className="h-full flex items-center gap-6 sm:gap-10 px-5 sm:px-8 w-max will-change-transform"
        >
          {/* Logo container: border invisible, card background removed, size increased */}
          <div className="h-[280px] sm:h-[320px] w-[260px] sm:w-[340px] md:w-[380px] shrink-0 border border-transparent flex items-center justify-center p-2 sm:p-4">
            <img
              src={logoUrl}
              alt={logoAlt}
              draggable={false}
              className="w-full max-h-[140px] sm:max-h-[180px] object-contain select-none"
            />
          </div>

          {/* Timeline and milestone entries */}
          <div className="relative h-[280px] sm:h-[320px] flex flex-col justify-between">
            {/* Center horizontal orange line */}
            <div className="w-full absolute left-0 top-[49%] -translate-y-1/2 flex items-center h-fit pointer-events-none z-10">
              <div
                className="size-2.5 sm:size-3 rounded-full shrink-0"
                style={activeStyle}
              />
              <div
                className="h-px w-[0%] rounded-full journey-line"
                style={activeStyle}
              />
              <div
                className="size-2.5 sm:size-3 rounded-full shrink-0"
                style={activeStyle}
              />
            </div>

            {/* Top row: heading empty placeholder + top milestones */}
            <div className="flex h-1/2 w-full items-center justify-start gap-4">
              {/* Product Storyline heading removed completely: keeping empty spacing container */}
              <div
                className="h-full w-[140px] sm:w-[180px] shrink-0 pt-3"
                aria-hidden="true"
              />

              <div className="flex h-full gap-x-16 sm:gap-x-24">
                {topJourneyData.map((item) => (
                  <div
                    key={`top-${item.id}`}
                    className="relative h-full w-[260px] sm:w-[300px] shrink-0 px-4 flex flex-col justify-end pb-3"
                  >
                    {/* Vertical indicator line and dot */}
                    <div className="w-full absolute left-0 bottom-0 top-0 h-full pointer-events-none">
                      <div
                        className={`size-3 sm:size-3.5 translate-x-[-50%] relative aspect-square rounded-full jd-${item.id}`}
                        style={activeStyle}
                      />
                      <div
                        className={`h-[92%] w-px origin-bottom rounded-full jl-${item.id}`}
                        style={activeStyle}
                      />
                    </div>

                    <div className="space-y-1.5 pb-1">
                      <h4
                        className={`title-${item.id} font-heading text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight`}
                      >
                        {item.version}{" "}
                        <span className="text-zinc-400 font-normal text-xs sm:text-sm">
                          · {item.date}
                        </span>
                      </h4>
                      <p
                        className={`description-${item.id} font-body text-xs sm:text-sm leading-relaxed text-zinc-400`}
                        style={mutedTextStyle}
                      >
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom row: period label + bottom milestones */}
            <div className="h-1/2 flex items-center justify-start w-full">
              {/* Period label */}
              <div className="w-[140px] sm:w-[180px] shrink-0 pt-3 h-full flex flex-col justify-start">
                <p
                  className="text-xs sm:text-sm font-tag font-semibold text-zinc-400 uppercase tracking-wider"
                  style={mutedTextStyle}
                >
                  {periodLabel}
                </p>
              </div>

              <div className="flex h-full gap-x-20 sm:gap-x-28 ml-16 sm:ml-24">
                {bottomJourneyData.map((item) => (
                  <div
                    key={`bottom-${item.id}`}
                    className="relative h-full w-[260px] sm:w-[300px] shrink-0 px-4 flex flex-col justify-start pt-3"
                  >
                    {/* Vertical indicator line and dot */}
                    <div className="w-full absolute left-0 bottom-[-1%] top-0 h-full pointer-events-none">
                      <div
                        className={`h-[92%] origin-top w-px rounded-full jl-${item.id}`}
                        style={activeStyle}
                      />
                      <div
                        className={`size-3 sm:size-3.5 translate-x-[-50%] relative aspect-square rounded-full jd-${item.id}`}
                        style={activeStyle}
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <h4
                        className={`title-${item.id} font-heading text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight`}
                      >
                        {item.version}{" "}
                        <span className="text-zinc-400 font-normal text-xs sm:text-sm">
                          · {item.date}
                        </span>
                      </h4>
                      <p
                        className={`description-${item.id} font-body text-xs sm:text-sm leading-relaxed text-zinc-400`}
                        style={mutedTextStyle}
                      >
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
