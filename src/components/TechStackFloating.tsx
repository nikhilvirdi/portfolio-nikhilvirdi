import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

import javaSvg from 'devicon/icons/java/java-original.svg';
import typescriptSvg from 'devicon/icons/typescript/typescript-original.svg';
import javascriptSvg from 'devicon/icons/javascript/javascript-original.svg';
import pythonSvg from 'devicon/icons/python/python-original.svg';
import nodejsSvg from 'devicon/icons/nodejs/nodejs-original.svg';
import postmanSvg from 'devicon/icons/postman/postman-original.svg';
import reactSvg from 'devicon/icons/react/react-original.svg';
import tailwindcssSvg from 'devicon/icons/tailwindcss/tailwindcss-original.svg';
import postgresqlSvg from 'devicon/icons/postgresql/postgresql-original.svg';
import dockerSvg from 'devicon/icons/docker/docker-original.svg';
import nginxSvg from 'devicon/icons/nginx/nginx-original.svg';
import githubactionsSvg from 'devicon/icons/githubactions/githubactions-original.svg';
import gitSvg from 'devicon/icons/git/git-original.svg';
import githubSvg from 'devicon/icons/github/github-original.svg';
import html5Svg from 'devicon/icons/html5/html5-original.svg';
import css3Svg from 'devicon/icons/css3/css3-original.svg';
import expressSvg from 'devicon/icons/express/express-original.svg';
import prismaSvg from 'devicon/icons/prisma/prisma-original.svg';

export interface TechDef {
  name: string;
  svg: string;
  invert?: boolean;
  message?: string;
}

interface TechItem extends TechDef {
  x: number; // percentage
  y: number; // percentage
  driftX: number;
  driftY: number;
  driftR: number;
  duration: number;
  width?: number;
  height?: number;
}

export const BASE_TECH_DEFS: TechDef[] = [
  { name: 'Java', svg: javaSvg, message: "Java's my favorite language btw" },
  { name: 'TypeScript', svg: typescriptSvg, message: "i just add type annotations over javascript and call it TypeScript" },
  { name: 'JavaScript', svg: javascriptSvg, message: "haha i always forget JavaScript's syntax" },
  { name: 'Python', svg: pythonSvg, message: "i use python for AI stuff" },
  { name: 'C', svg: '/icons/C.webp', message: "C's the OG, i respect it from a distance" },

  { name: 'Node.js', svg: nodejsSvg, message: "yk i use Node.js for backend??" },
  { name: 'Express', svg: expressSvg, invert: true, message: "express is the framework holding my APIs together" },
  { name: 'Postman', svg: postmanSvg, message: "i test my APIs on postman before trusting them anywhere else" },
  { name: 'React', svg: reactSvg, message: "i use react for vibecoding frontend nd still think it's boring to learn" },
  { name: 'Tailwind CSS', svg: tailwindcssSvg, message: "tailwind's the supporting guy to react for me, i find both boring lol" },

  { name: 'PostgreSQL', svg: postgresqlSvg, message: "my data lives in postgres, rent free" },
  { name: 'Prisma', svg: prismaSvg, invert: true, message: "prisma's the middleman between me and my postgres" },
  { name: 'HTML5', svg: html5Svg, message: "html reminds me of my 1st sem" },
  { name: 'CSS3', svg: css3Svg, message: "css used to help me add colors in my dead frontends till i started vibecoding frontend using tailwind" },

  { name: 'Docker', svg: dockerSvg, message: "docker's my fav technology, once helped me run 10 servers on my one laptop only" },
  { name: 'Nginx', svg: nginxSvg, message: "nginx is my load balancer, reverse proxy friend, and sometimes cacher too" },
  { name: 'GitHub Actions', svg: githubactionsSvg, message: "github actions runs my CI so i don't have to remember to" },
  { name: 'Git', svg: gitSvg, message: "git remembers every mistake i've ever committed, literally" },
  { name: 'GitHub', svg: githubSvg, invert: true, message: "github's home to way too many of my repos, only some of them finished" },
  {
    name: 'JWT',
    svg: '/icons/jwt.png',
    message: "i've hardly used jwt in any of my projects as of now",
  },
];

function getInitialEstimatedSize(name: string): { width: number; height: number } {
  const labelWidth = Math.round(name.length * 7 + 20);
  return {
    width: Math.max(60, labelWidth),
    height: 58,
  };
}

function generateFloatingItems(
  containerWidth: number = 844,
  containerHeight: number = 640,
  iconSizes?: { [name: string]: { width: number; height: number } }
): TechItem[] {
  let maxHalfW = 55;
  let maxHalfH = 30;

  for (const def of BASE_TECH_DEFS) {
    const s = iconSizes?.[def.name] ?? getInitialEstimatedSize(def.name);
    if (s.width / 2 > maxHalfW) maxHalfW = s.width / 2;
    if (s.height / 2 > maxHalfH) maxHalfH = s.height / 2;
  }

  // Include drift and rotation safety buffer (14px) so no icon or label ever clips at container boundaries
  const BUFFER = 14;
  const X_MIN = maxHalfW + BUFFER;
  const X_MAX = Math.max(X_MIN + 100, containerWidth - maxHalfW - BUFFER);
  const Y_MIN = ((maxHalfH + BUFFER) / containerHeight) * 100;
  const Y_MAX = ((containerHeight - maxHalfH - BUFFER) / containerHeight) * 100;
  const cols = 5;
  const rows = 4;
  const colStep = (X_MAX - X_MIN) / (cols - 1);
  const rowStep = (Y_MAX - Y_MIN) / (rows - 1);

  const slots: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rawX = X_MIN + c * colStep + (Math.random() - 0.5) * (colStep * 0.25);
      const rawY = Y_MIN + r * rowStep + (Math.random() - 0.5) * (rowStep * 0.25);
      slots.push({
        x: Math.max(X_MIN, Math.min(X_MAX, Math.round(rawX))),
        y: Math.max(Y_MIN, Math.min(Y_MAX, rawY)),
      });
    }
  }

  // Shuffle slots randomly so icons land in random cell positions
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = slots[i];
    slots[i] = slots[j];
    slots[j] = temp;
  }

  return BASE_TECH_DEFS.map((def, idx) => {
    const slot = slots[idx];
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
      driftX: (Math.random() * 3 + 6) * signX,
      driftY: (Math.random() * 3 + 6) * signY,
      driftR: (Math.random() * 2 + 4) * signR,
      duration: Math.random() * 1.5 + 4.2,
    };
  });
}

interface FloatingIconProps {
  item: TechItem;
  mouseX: React.RefObject<number>;
  mouseY: React.RefObject<number>;
  containerRef: React.RefObject<HTMLElement | null>;
  measureRef?: (el: HTMLDivElement | null) => void;
}

function FloatingIcon({
  item,
  mouseX,
  mouseY,
  containerRef,
  measureRef,
}: FloatingIconProps) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { damping: 20, stiffness: 200 });
  const springY = useSpring(offsetY, { damping: 20, stiffness: 200 });

  const setRef = (el: HTMLDivElement | null) => {
    localRef.current = el;
    measureRef?.(el);
  };

  useEffect(() => {
    let animId: number;
    const REPEL_RADIUS = 150;
    const MAX_PUSH = 85;

    const checkRepel = () => {
      if (containerRef.current) {
        const contRect = containerRef.current.getBoundingClientRect();
        const baseCenterX = item.x;
        const baseCenterY = (item.y / 100) * contRect.height;

        const mx = mouseX.current;
        const my = mouseY.current;

        if (mx !== null && my !== null && mx !== -9999 && my !== -9999) {
          const dx = baseCenterX - mx;
          const dy = baseCenterY - my;
          const dist = Math.hypot(dx, dy);

          if (dist < REPEL_RADIUS) {
            const force = 1 - dist / REPEL_RADIUS;
            const push = force * MAX_PUSH;
            const angle = Math.atan2(dy, dx);
            let pushX = Math.cos(angle) * push;
            let pushY = Math.sin(angle) * push;

            // Measure this specific icon's own rendered bounding box
            const iconEl = localRef.current;
            const iconW = iconEl
              ? Math.max(iconEl.offsetWidth, iconEl.getBoundingClientRect().width)
              : (item.width || 80);
            const iconH = iconEl
              ? Math.max(iconEl.offsetHeight, iconEl.getBoundingClientRect().height)
              : (item.height || 56);
            const marginX = iconW / 2 + Math.abs(item.driftX) + 4;
            const marginY = iconH / 2 + Math.abs(item.driftY) + 4;

            // Clamp target position so this icon's own edge never crosses the container boundary
            const targetX = baseCenterX + pushX;
            const clampedX = Math.max(marginX, Math.min(contRect.width - marginX, targetX));
            pushX = clampedX - baseCenterX;

            const targetY = baseCenterY + pushY;
            const clampedY = Math.max(marginY, Math.min(contRect.height - marginY, targetY));
            pushY = clampedY - baseCenterY;

            offsetX.set(pushX);
            offsetY.set(pushY);
          } else {
            offsetX.set(0);
            offsetY.set(0);
          }
        } else {
          offsetX.set(0);
          offsetY.set(0);
        }
      }
      animId = requestAnimationFrame(checkRepel);
    };

    animId = requestAnimationFrame(checkRepel);
    return () => cancelAnimationFrame(animId);
  }, [containerRef, item.x, item.y, item.width, item.height, item.driftX, item.driftY, mouseX, mouseY, offsetX, offsetY]);

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
          className="relative text-foreground/80 hover:text-foreground transition-colors flex flex-col items-center"
        >
          <img
            src={item.svg}
            alt={item.name}
            width={38}
            height={38}
            className={`w-[38px] h-[38px] select-none pointer-events-none object-contain ${item.invert ? 'invert' : ''}`}
            style={{ width: 38, height: 38 }}
          />
          <span className="text-[10px] tracking-wide text-muted font-tag mt-1 whitespace-nowrap">
            {item.name}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

interface TechStackFloatingProps {
  onActiveMessageChange?: (message: string | null) => void;
}

export default function TechStackFloating({ onActiveMessageChange }: TechStackFloatingProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseX = useRef<number>(-9999);
  const mouseY = useRef<number>(-9999);
  const iconRefs = useRef<{ [name: string]: HTMLElement | null }>({});
  const prevWidthRef = useRef<number>(844);
  const [items, setItems] = useState<TechItem[]>(() => generateFloatingItems(844, 640));
  const onActiveChangeRef = useRef(onActiveMessageChange);

  useEffect(() => {
    onActiveChangeRef.current = onActiveMessageChange;
  }, [onActiveMessageChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const measureAllIcons = (): { [name: string]: { width: number; height: number } } => {
      const sizes: { [name: string]: { width: number; height: number } } = {};
      for (const def of BASE_TECH_DEFS) {
        const el = iconRefs.current[def.name];
        if (el) {
          const rect = el.getBoundingClientRect();
          const w = Math.max(el.offsetWidth, rect.width);
          const h = Math.max(el.offsetHeight, rect.height);
          if (w > 0 && h > 0) {
            sizes[def.name] = { width: w, height: h };
          }
        }
      }
      return sizes;
    };

    const updateBounds = () => {
      if (!containerRef.current) return;
      const contRect = containerRef.current.getBoundingClientRect();
      const measuredWidth = containerRef.current.clientWidth || contRect.width || 844;
      const measuredHeight = containerRef.current.clientHeight || contRect.height || 640;
      const prevW = prevWidthRef.current || measuredWidth;
      prevWidthRef.current = measuredWidth;
      const scaleX = measuredWidth / prevW;

      const sizes = measureAllIcons();
      const BUFFER = 14;

      setItems((prevItems) => {
        return prevItems.map((item) => {
          const size = sizes[item.name];
          const iconW = size ? size.width : (item.width || 80);
          const iconH = size ? size.height : (item.height || 56);
          const halfW = iconW / 2 + BUFFER;
          const halfH = iconH / 2 + BUFFER;

          const scaledX = prevW === measuredWidth ? item.x : item.x * scaleX;
          const clampedX = Math.max(halfW, Math.min(measuredWidth - halfW, scaledX));

          const minYPercent = (halfH / measuredHeight) * 100;
          const maxYPercent = ((measuredHeight - halfH) / measuredHeight) * 100;
          const clampedY = Math.max(minYPercent, Math.min(maxYPercent, item.y));

          return {
            ...item,
            x: clampedX,
            y: clampedY,
            width: iconW,
            height: iconH,
          };
        });
      });
    };

    // Recompute on mount once layout settles
    requestAnimationFrame(() => {
      updateBounds();
    });

    const timer = setTimeout(() => {
      updateBounds();
    }, 150);

    // Recompute on font load since label rendering width can shift with font loading
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        updateBounds();
      });
    }

    const ro = new ResizeObserver(() => {
      updateBounds();
    });
    ro.observe(containerRef.current);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    let animId: number;
    let currentActiveRef: string | null = null;
    const REPEL_RADIUS = 150;

    const updateClosest = () => {
      if (containerRef.current) {
        const mx = mouseX.current;
        const my = mouseY.current;
        let closestMsg: string | null = null;

        if (mx !== -9999 && my !== -9999) {
          const contRect = containerRef.current.getBoundingClientRect();
          let minDist = REPEL_RADIUS;

          for (const item of items) {
            const baseCenterX = item.x;
            const baseCenterY = (item.y / 100) * contRect.height;
            const dist = Math.hypot(baseCenterX - mx, baseCenterY - my);
            if (dist < minDist) {
              minDist = dist;
              closestMsg = item.message || null;
            }
          }
        }

        if (closestMsg !== currentActiveRef) {
          currentActiveRef = closestMsg;
          onActiveChangeRef.current?.(closestMsg);
        }
      }
      animId = requestAnimationFrame(updateClosest);
    };

    animId = requestAnimationFrame(updateClosest);
    return () => {
      cancelAnimationFrame(animId);
      onActiveChangeRef.current?.(null);
    };
  }, [items]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.current = e.clientX - rect.left;
    mouseY.current = e.clientY - rect.top;
  };

  const handleMouseLeave = () => {
    mouseX.current = -9999;
    mouseY.current = -9999;
    onActiveChangeRef.current?.(null);
  };

  return (
    <section
      id="tech-stack"
      className="py-16 px-16 bg-background"
    >
      <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
        Tech Stack
      </h2>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-[844px] max-w-full h-[640px] overflow-hidden mt-8"
        style={{ width: '844px', height: '640px' }}
      >
        {items.map((item) => (
          <FloatingIcon
            key={item.name}
            item={item}
            mouseX={mouseX}
            mouseY={mouseY}
            containerRef={containerRef}
            measureRef={(el) => {
              if (el) iconRefs.current[item.name] = el;
            }}
          />
        ))}
      </div>
    </section>
  );
}
