import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { BASE_TECH_DEFS, type TechDef } from './TechStackFloating';

interface MobileTechItem extends TechDef {
  x: number; // pixels
  y: number; // percentage
  driftX: number;
  driftY: number;
  driftR: number;
  duration: number;
  width?: number;
  height?: number;
}

function getInitialEstimatedSize(name: string): { width: number; height: number } {
  const labelWidth = Math.round(name.length * 7 + 20);
  return {
    width: Math.max(56, labelWidth),
    height: 54,
  };
}

function generateMobileFloatingItems(
  containerWidth: number = 360,
  containerHeight: number = 540,
  iconSizes?: { [name: string]: { width: number; height: number } }
): MobileTechItem[] {
  let maxHalfW = 40;
  let maxHalfH = 26;

  for (const def of BASE_TECH_DEFS) {
    const s = iconSizes?.[def.name] ?? getInitialEstimatedSize(def.name);
    if (s.width / 2 > maxHalfW) maxHalfW = s.width / 2;
    if (s.height / 2 > maxHalfH) maxHalfH = s.height / 2;
  }

  // Safety buffer including drift and rotation
  const BUFFER = 10;
  const X_MIN = maxHalfW + BUFFER;
  const X_MAX = Math.max(X_MIN + 60, containerWidth - maxHalfW - BUFFER);
  const Y_MIN = ((maxHalfH + BUFFER) / containerHeight) * 100;
  const Y_MAX = ((containerHeight - maxHalfH - BUFFER) / containerHeight) * 100;

  // 4 columns x 5 rows = 20 slots
  const cols = 4;
  const rows = 5;
  const colStep = cols > 1 ? (X_MAX - X_MIN) / (cols - 1) : 0;
  const rowStep = rows > 1 ? (Y_MAX - Y_MIN) / (rows - 1) : 0;

  const slots: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = (Math.random() - 0.5) * (colStep * 0.3);
      const jitterY = (Math.random() - 0.5) * (rowStep * 0.3);
      const rawX = X_MIN + c * colStep + jitterX;
      const rawY = Y_MIN + r * rowStep + jitterY;
      slots.push({
        x: Math.max(X_MIN, Math.min(X_MAX, Math.round(rawX))),
        y: Math.max(Y_MIN, Math.min(Y_MAX, rawY)),
      });
    }
  }

  // Fisher-Yates shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = slots[i];
    slots[i] = slots[j];
    slots[j] = temp;
  }

  return BASE_TECH_DEFS.map((def, idx) => {
    const slot = slots[idx] || { x: X_MIN, y: Y_MIN };
    const s = iconSizes?.[def.name] ?? getInitialEstimatedSize(def.name);
    const halfW = s.width / 2 + BUFFER;
    const halfH = s.height / 2 + BUFFER;

    const clampedX = Math.max(halfW, Math.min(containerWidth - halfW, slot.x));
    const minYPercent = (halfH / containerHeight) * 100;
    const maxYPercent = ((containerHeight - halfH) / containerHeight) * 100;
    const clampedY = Math.max(minYPercent, Math.min(maxYPercent, slot.y));

    const signX = Math.random() > 0.5 ? 1 : -1;
    const signY = Math.random() > 0.5 ? 1 : -1;
    const signR = Math.random() > 0.5 ? 1 : -1;

    return {
      ...def,
      x: clampedX,
      y: clampedY,
      width: s.width,
      height: s.height,
      driftX: (Math.random() * 2.5 + 4.5) * signX,
      driftY: (Math.random() * 2.5 + 4.5) * signY,
      driftR: (Math.random() * 2 + 3) * signR,
      duration: Math.random() * 1.5 + 4.0,
    };
  });
}

interface IconPhysicsHandle {
  getName: () => string;
  getBasePos: () => { x: number; y: number };
  getCurrentPos: (contHeight: number) => { x: number; y: number };
  getSize: () => { width: number; height: number };
  getDrift: () => { driftX: number; driftY: number };
  setTargetOffset: (x: number, y: number) => void;
}

interface FloatingMobileIconProps {
  item: MobileTechItem;
  registerIcon: (name: string, handle: IconPhysicsHandle) => void;
  unregisterIcon: (name: string) => void;
  measureRef: (name: string, el: HTMLDivElement | null) => void;
}

function FloatingMobileIcon({
  item,
  registerIcon,
  unregisterIcon,
  measureRef,
}: FloatingMobileIconProps) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { damping: 22, stiffness: 180 });
  const springY = useSpring(offsetY, { damping: 22, stiffness: 180 });

  const setRef = (el: HTMLDivElement | null) => {
    localRef.current = el;
    measureRef(item.name, el);
  };

  useEffect(() => {
    registerIcon(item.name, {
      getName: () => item.name,
      getBasePos: () => ({ x: item.x, y: item.y }),
      getCurrentPos: (contHeight: number) => ({
        x: item.x + springX.get(),
        y: (item.y / 100) * contHeight + springY.get(),
      }),
      getSize: () => {
        const el = localRef.current;
        if (!el) return { width: item.width || 60, height: item.height || 50 };
        return {
          width: Math.max(el.offsetWidth, item.width || 60),
          height: Math.max(el.offsetHeight, item.height || 50),
        };
      },
      getDrift: () => ({ driftX: item.driftX, driftY: item.driftY }),
      setTargetOffset: (x: number, y: number) => {
        offsetX.set(x);
        offsetY.set(y);
      },
    });

    return () => unregisterIcon(item.name);
  }, [item, registerIcon, unregisterIcon, springX, springY, offsetX, offsetY]);

  return (
    <div
      className="absolute select-none pointer-events-auto cursor-default -translate-x-1/2 -translate-y-1/2 z-10"
      style={{
        left: `${item.x}px`,
        top: `${item.y}%`,
      }}
    >
      <motion.div
        style={{
          x: springX,
          y: springY,
        }}
      >
        <motion.div
          ref={setRef}
          animate={{
            x: [-item.driftX, item.driftX],
            y: [-item.driftY, item.driftY],
            rotate: [-item.driftR, item.driftR],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
          className="relative text-foreground/80 flex flex-col items-center select-none"
        >
          <img
            src={item.svg}
            alt={item.name}
            width={34}
            height={34}
            className={`w-[34px] h-[34px] select-none pointer-events-none object-contain ${
              item.invert ? 'invert' : ''
            }`}
            style={{ width: 34, height: 34 }}
          />
          <span className="text-[10px] tracking-wide text-muted font-tag mt-1 whitespace-nowrap">
            {item.name}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function TechStackMobile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevWidthRef = useRef<number>(360);
  const iconSizesRef = useRef<{ [name: string]: { width: number; height: number } }>({});
  const [items, setItems] = useState<MobileTechItem[]>(() => generateMobileFloatingItems(360, 540));
  const handlesRef = useRef<Map<string, IconPhysicsHandle>>(new Map());

  const registerIcon = useCallback((name: string, handle: IconPhysicsHandle) => {
    handlesRef.current.set(name, handle);
  }, []);

  const unregisterIcon = useCallback((name: string) => {
    handlesRef.current.delete(name);
  }, []);

  const measureRef = useCallback((name: string, el: HTMLDivElement | null) => {
    if (el) {
      const rect = el.getBoundingClientRect();
      const w = Math.max(el.offsetWidth, rect.width);
      const h = Math.max(el.offsetHeight, rect.height);
      if (w > 0 && h > 0) {
        iconSizesRef.current[name] = { width: w, height: h };
      }
    }
  }, []);

  // Update container size on resize / orientation change
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || 360;
      const h = containerRef.current.clientHeight || 540;
      if (Math.abs(w - prevWidthRef.current) > 5) {
        prevWidthRef.current = w;
        setItems(generateMobileFloatingItems(w, h, iconSizesRef.current));
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Mutual pairwise icon-to-icon repulsion physics loop
  useEffect(() => {
    let animId: number;
    const REPEL_DIST = 72; // px: distance below which mutual repulsion engages
    const MAX_PUSH = 55; // px: maximum push per pair interaction

    const updateRepulsion = () => {
      const contEl = containerRef.current;
      if (contEl) {
        const contWidth = contEl.clientWidth || 360;
        const contHeight = contEl.clientHeight || 540;

        const handles = Array.from(handlesRef.current.values());
        const n = handles.length;

        if (n > 1) {
          const positions: { x: number; y: number }[] = new Array(n);
          const basePositions: { x: number; y: number }[] = new Array(n);
          const netPushes: { x: number; y: number }[] = new Array(n);

          for (let i = 0; i < n; i++) {
            netPushes[i] = { x: 0, y: 0 };
            const base = handles[i].getBasePos();
            const baseYPx = (base.y / 100) * contHeight;
            basePositions[i] = { x: base.x, y: baseYPx };
            positions[i] = handles[i].getCurrentPos(contHeight);
          }

          // Pairwise checks across all 190 pairs
          for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
              let dx = positions[i].x - positions[j].x;
              let dy = positions[i].y - positions[j].y;
              let dist = Math.hypot(dx, dy);

              if (dist < REPEL_DIST) {
                if (dist < 0.001) {
                  dx = (i % 2 === 0 ? 1 : -1) * 0.1;
                  dy = 0.1;
                  dist = 0.14;
                }

                const overlap = REPEL_DIST - dist;
                const force = (overlap / REPEL_DIST) * MAX_PUSH;
                const angle = Math.atan2(dy, dx);
                const pushX = Math.cos(angle) * force;
                const pushY = Math.sin(angle) * force;

                // Mutual repulsion: push both apart symmetrically
                netPushes[i].x += pushX;
                netPushes[i].y += pushY;
                netPushes[j].x -= pushX;
                netPushes[j].y -= pushY;
              }
            }
          }

          // Edge clamping per icon (using each icon's own measured bounding box)
          for (let i = 0; i < n; i++) {
            const h = handles[i];
            const size = h.getSize();
            const drift = h.getDrift();
            const marginX = size.width / 2 + Math.abs(drift.driftX) + 4;
            const marginY = size.height / 2 + Math.abs(drift.driftY) + 4;

            const baseCenterX = basePositions[i].x;
            const baseCenterY = basePositions[i].y;

            const targetX = baseCenterX + netPushes[i].x;
            const clampedX = Math.max(marginX, Math.min(contWidth - marginX, targetX));
            const finalPushX = clampedX - baseCenterX;

            const targetY = baseCenterY + netPushes[i].y;
            const clampedY = Math.max(marginY, Math.min(contHeight - marginY, targetY));
            const finalPushY = clampedY - baseCenterY;

            h.setTargetOffset(finalPushX, finalPushY);
          }
        }
      }

      animId = requestAnimationFrame(updateRepulsion);
    };

    animId = requestAnimationFrame(updateRepulsion);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section id="tech-stack-mobile" className="py-10 bg-background">
      <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-6">
        Tech Stack
      </h2>
      <div
        ref={containerRef}
        className="relative w-full h-[540px] overflow-hidden"
        style={{ height: '540px' }}
      >
        {items.map((item) => (
          <FloatingMobileIcon
            key={item.name}
            item={item}
            registerIcon={registerIcon}
            unregisterIcon={unregisterIcon}
            measureRef={measureRef}
          />
        ))}
      </div>
    </section>
  );
}
