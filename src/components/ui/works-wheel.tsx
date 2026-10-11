import * as React from "react";

import { cn } from "@/lib/utils";
import type { Project } from "@/components/ProjectsGrid";

export type WorksWheelItem = Project;

export interface WorksWheelProps extends Omit<
  React.ComponentPropsWithoutRef<"section">,
  "children" | "onSelect"
> {
  items: WorksWheelItem[];
  onSelect: (item: WorksWheelItem) => void;
  /** Sits in the middle of the ring. @default undefined */
  label?: string;
  /** Label on the card's hover affordance. Omit to drop it. @default undefined */
  action?: string;
}

const LOGO_LESS_PROJECT_TITLES: string[] = [];

export const DEFAULT_LOGO_SIZE = {
  wheel: "max-w-[70%] max-h-[65%]",
  overlay: "max-h-[110px] sm:max-h-[140px] max-w-[65%]",
};

export const LOGO_SCALE_OVERRIDES: Record<
  string,
  { wheel: string; overlay: string }
> = {
  "CI/CD Pipeline Anatomy": {
    wheel: "max-w-[60%] max-h-[55%]",
    overlay: "max-h-[95px] sm:max-h-[120px] max-w-[55%]",
  },
  "Network Intrusion Detection MLP": {
    wheel: "max-w-[60%] max-h-[55%]",
    overlay: "max-h-[95px] sm:max-h-[120px] max-w-[55%]",
  },
};

const CARD_H = 0.38;
const CARD_MAX_W = 0.34;
const CARD_RATIO = 1.45;
const STEP = 40;
const DRUM = 2.22;
const LENS = 2.7;
const RING_R = 1.14;
const BOW = 1.82;
const TITLE = 0.124;
const INDEX = 0.062;
const CULL = 1.6;

const WHEEL_UNITS = 900;
const DRAG_UNITS = 420;
const SETTLE = 140;
const EASE = 0.12;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Stage = { w: number; h: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

const bowAt = (drumDeg: number, bow: number) =>
  -bow * (1 - Math.cos(rad(drumDeg)));

function place(
  ringDeg: number,
  drumDeg: number,
  ringR: number,
  drumR: number,
  bow: number,
  m: number,
) {
  return (
    `translateX(${m * bowAt(drumDeg, bow)}px)` +
    ` rotateZ(${(1 - m) * ringDeg}deg) translateY(${-(1 - m) * ringR}px)` +
    ` rotateX(${m * drumDeg}deg) translateZ(${m * drumR}px)`
  );
}

export function WorksWheel({
  items,
  onSelect,
  label = "Works '26",
  action = "View",
  className,
  ...props
}: WorksWheelProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const wheelRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);
  const labelRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLDivElement>(null);
  const indexRef = React.useRef<HTMLOListElement>(null);

  const turn = React.useRef(0);
  const target = React.useRef(0);
  const [active, setActive] = React.useState(0);
  const [stage, setStage] = React.useState<Stage>({ w: 0, h: 0 });

  const count = items.length;
  const last = Math.max(count - 1, 0);

  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const metrics = React.useMemo(() => {
    const { w, h } = stage;
    const cardW = Math.min(h * CARD_H * CARD_RATIO, w * CARD_MAX_W);
    const cardH = cardW / CARD_RATIO;
    const drumR = cardH * DRUM;
    const ringR = cardH * RING_R;
    const ringScale = count
      ? clamp((((2 * Math.PI * ringR) / count) * 0.82) / (cardW || 1), 0.16, 1)
      : 1;
    return {
      cardW,
      cardH,
      ringR,
      ringScale,
      drumR,
      bow: cardH * BOW,
      depth: cardH * LENS,
      title: cardH * TITLE,
      index: cardH * INDEX,
    };
  }, [stage, count]);

  React.useEffect(() => {
    if (!stage.h) return;
    let frame = 0;
    const { ringR, ringScale, drumR, bow } = metrics;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const gap = target.current - turn.current;
      if (Math.abs(gap) < 0.0005) turn.current = target.current;
      else turn.current += gap * (reduced ? 1 : EASE);

      const t = turn.current;
      const m = clamp(t, 0, 1);
      const pos = Math.max(0, t - 1);

      if (wheelRef.current) {
        wheelRef.current.style.transform = `translateZ(${-m * drumR}px)`;
      }

      for (let i = 0; i < count; i++) {
        const d = i - pos;
        const drumDeg = d * STEP;
        const card = cardRefs.current[i];
        if (card) {
          card.style.transform = place(
            d * (360 / count),
            drumDeg,
            ringR,
            drumR,
            bow,
            m,
          );
          const isCulled = m > 0.5 && Math.abs(d) > CULL;
          card.style.opacity = isCulled ? "0" : "1";
          card.style.pointerEvents = isCulled ? "none" : "auto";
          card.style.visibility = isCulled ? "hidden" : "visible";
          card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
        }
        const face = card?.firstElementChild as HTMLElement | null;
        if (face) face.style.transform = `scale(${lerp(ringScale, 1, m)})`;
      }

      if (labelRef.current) labelRef.current.style.opacity = String(1 - m);
      if (titleRef.current) titleRef.current.style.opacity = String(m);
      if (indexRef.current) {
        indexRef.current.style.opacity = String(m);
        indexRef.current.style.pointerEvents = m > 0.05 ? "auto" : "none";
      }
      const near = clamp(Math.round(pos), 0, last);
      setActive((prev) => (prev === near ? prev : near));
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [metrics, stage.h, count, last, reduced]);

  const to = React.useCallback(
    (next: number) => {
      target.current = clamp(next, 0, last + 1);
    },
    [last],
  );

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const next = target.current + event.deltaY / WHEEL_UNITS;
      if (next > 0 && next < last + 1) event.preventDefault();
      to(next);
      window.clearTimeout(settling.current);
      settling.current = window.setTimeout(
        () => to(Math.round(target.current)),
        SETTLE,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(settling.current);
    };
  }, [to, last]);

  const pointerStart = React.useRef<{ x: number; y: number } | null>(null);
  const isDragging = React.useRef(false);
  const lastY = React.useRef(0);
  const settling = React.useRef(0);

  return (
    <section
      aria-label={label}
      className={cn(
        "bg-background text-foreground relative h-full min-h-[24rem] w-full overflow-hidden select-none",
        className,
      )}
      {...props}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`works-wheel-${active}`}
        className="focus-visible:outline-foreground absolute inset-0 cursor-grab touch-pan-x outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 active:cursor-grabbing"
        style={{ perspective: `${metrics.depth}px` }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          pointerStart.current = { x: event.clientX, y: event.clientY };
          isDragging.current = false;
          lastY.current = event.clientY;
        }}
        onPointerMove={(event) => {
          if (!pointerStart.current) return;
          const dy = event.clientY - pointerStart.current.y;
          const dx = event.clientX - pointerStart.current.x;
          if (!isDragging.current) {
            if (Math.hypot(dx, dy) > 5) {
              isDragging.current = true;
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {}
            } else {
              return;
            }
          }
          to(target.current + (lastY.current - event.clientY) / DRAG_UNITS);
          lastY.current = event.clientY;
        }}
        onPointerUp={(event) => {
          if (isDragging.current) {
            try {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            } catch {}
            if (target.current > 1) to(Math.round(target.current));
            window.setTimeout(() => {
              isDragging.current = false;
            }, 60);
          } else {
            isDragging.current = false;
          }
          pointerStart.current = null;
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
          isDragging.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") to(Math.round(target.current) + 1);
          else if (event.key === "ArrowUp") to(Math.round(target.current) - 1);
          else return;
          event.preventDefault();
        }}
      >
        <div
          ref={wheelRef}
          className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]"
        >
          {items.map((item, i) => {
            return (
              <div
                key={item.title}
                id={`works-wheel-${i}`}
                role="button"
                tabIndex={0}
                aria-label={`Select project: ${item.title}`}
                aria-selected={i === active}
                ref={(node: HTMLElement | null) => {
                  cardRefs.current[i] = node;
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDragging.current) return;
                  onSelect(item);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item);
                  }
                }}
                className="group absolute cursor-pointer [backface-visibility:hidden] outline-none pointer-events-auto"
                style={{
                  width: metrics.cardW,
                  height: metrics.cardH,
                  marginLeft: -metrics.cardW / 2,
                  marginTop: -metrics.cardH / 2,
                }}
              >
                <span className="relative flex size-full items-center justify-center">
                  {item.logo ? (
                    <img
                      src={item.logo}
                      alt={item.title}
                      draggable={false}
                      className={cn(
                        "object-contain select-none pointer-events-none drop-shadow-sm transition-transform duration-300 group-hover:scale-105",
                        LOGO_SCALE_OVERRIDES[item.title]?.wheel ?? DEFAULT_LOGO_SIZE.wheel
                      )}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center p-3">
                      <h4
                        className={cn(
                          LOGO_LESS_PROJECT_TITLES.includes(item.title)
                            ? "font-jakarta font-bold"
                            : "font-heading font-semibold",
                          "text-[13px] sm:text-base text-foreground text-center px-1.5 sm:px-2 leading-snug select-none line-clamp-2",
                        )}
                      >
                        {item.title}
                      </h4>
                    </div>
                  )}
                  {action ? (
                    <span className="bg-background/80 text-foreground pointer-events-none absolute right-3 bottom-3 flex translate-y-1 items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] opacity-0 backdrop-blur-sm transition group-hover:translate-y-0 group-hover:opacity-100">
                      <svg
                        viewBox="0 0 12 12"
                        className="size-2.5"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 9 9 3M4 3h5v5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {action}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={labelRef}
        className="font-heading pointer-events-none absolute inset-0 grid place-items-center tracking-tight whitespace-pre-line text-center"
        style={{ fontSize: metrics.title }}
      >
        {label}
      </div>
      <div
        ref={titleRef}
        className="font-heading pointer-events-none absolute top-1/2 left-[3%] sm:left-[4%] -translate-y-1/2 tracking-tight opacity-0 leading-tight"
        style={{
          fontSize: metrics.title,
          maxWidth: `calc(50% - ${metrics.cardW / 2 + 28}px)`,
        }}
      >
        {items[active]?.title}
      </div>

      <ol
        ref={indexRef}
        className="text-muted-foreground absolute top-[7.5%] right-[2.5%] text-right leading-[1.75] opacity-0 pointer-events-none"
        style={{ fontSize: metrics.index }}
      >
        {items.map((item, i) => (
          <li key={item.title}>
            <button
              type="button"
              onClick={() => to(i + 1)}
              className={cn(
                "focus-visible:outline-foreground cursor-pointer transition-colors outline-none focus-visible:outline-1",
                i === active && "text-foreground font-medium",
              )}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default WorksWheel;
