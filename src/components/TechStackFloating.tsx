import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

import javaSvg from 'devicon/icons/java/java-original.svg';
import typescriptSvg from 'devicon/icons/typescript/typescript-original.svg';
import javascriptSvg from 'devicon/icons/javascript/javascript-original.svg';
import pythonSvg from 'devicon/icons/python/python-original.svg';
import cSvg from 'devicon/icons/c/c-original.svg';
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

interface TechDef {
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
}

const BASE_TECH_DEFS: TechDef[] = [
  { name: 'Java', svg: javaSvg, message: "Java's my favorite language btw" },
  { name: 'TypeScript', svg: typescriptSvg, message: "i just add type annotations over javascript and call it TypeScript" },
  { name: 'JavaScript', svg: javascriptSvg, message: "haha i always forget JavaScript's syntax" },
  { name: 'Python', svg: pythonSvg, message: "i use python for AI stuff" },
  { name: 'C', svg: cSvg, message: "C's the OG, i respect it from a distance" },

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

function generateFloatingItems(containerWidth: number = 844): TechItem[] {
  const MARGIN_X = 45;
  const X_MIN = MARGIN_X;
  const X_MAX = Math.max(X_MIN + 100, containerWidth - MARGIN_X);
  const Y_MIN = 14;
  const Y_MAX = 86;
  const cols = 5;
  const rows = 4;
  const colStep = (X_MAX - X_MIN) / (cols - 1);
  const rowStep = (Y_MAX - Y_MIN) / (rows - 1);

  const slots: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rawX = X_MIN + c * colStep + (Math.random() - 0.5) * (colStep * 0.35);
      const rawY = Y_MIN + r * rowStep + (Math.random() - 0.5) * (rowStep * 0.35);
      slots.push({
        x: Math.max(X_MIN, Math.min(X_MAX, Math.round(rawX))),
        y: Math.max(12, Math.min(88, rawY)),
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
    const signX = Math.random() > 0.5 ? 1 : -1;
    const signY = Math.random() > 0.5 ? 1 : -1;
    const signR = Math.random() > 0.5 ? 1 : -1;

    return {
      ...def,
      x: slot.x,
      y: slot.y,
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
}

function FloatingIcon({
  item,
  mouseX,
  mouseY,
  containerRef,
}: FloatingIconProps) {
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { damping: 20, stiffness: 200 });
  const springY = useSpring(offsetY, { damping: 20, stiffness: 200 });

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

            // Clamp target position so icons never push past either edge of bounding container
            const MARGIN_X = 40;
            const targetX = baseCenterX + pushX;
            const clampedX = Math.max(MARGIN_X, Math.min(contRect.width - MARGIN_X, targetX));
            pushX = clampedX - baseCenterX;

            const MARGIN_Y = 32;
            const targetY = baseCenterY + pushY;
            const clampedY = Math.max(MARGIN_Y, Math.min(contRect.height - MARGIN_Y, targetY));
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
  }, [containerRef, item.x, item.y, mouseX, mouseY, offsetX, offsetY]);

  return (
    <motion.div
      className="absolute select-none pointer-events-auto cursor-default -translate-x-1/2 -translate-y-1/2 z-10"
      style={{
        left: `${item.x}px`,
        top: `${item.y}%`,
        x: springX,
        y: springY,
      }}
    >
      <motion.div
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
  );
}

interface TechStackFloatingProps {
  onActiveMessageChange?: (message: string | null) => void;
}

export default function TechStackFloating({ onActiveMessageChange }: TechStackFloatingProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseX = useRef<number>(-9999);
  const mouseY = useRef<number>(-9999);
  const [items, setItems] = useState<TechItem[]>(() => generateFloatingItems(844));
  const onActiveChangeRef = useRef(onActiveMessageChange);

  useEffect(() => {
    onActiveChangeRef.current = onActiveMessageChange;
  }, [onActiveMessageChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateBounds = () => {
      if (!containerRef.current) return;
      const measuredWidth = containerRef.current.clientWidth || 844;
      setItems(generateFloatingItems(measuredWidth));
    };

    updateBounds();

    const ro = new ResizeObserver(() => {
      updateBounds();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
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
      className="py-20 px-16 bg-background"
    >
      <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
        <span className="bg-[#1D4FD8] box-decoration-clone">Tech Stack</span>
      </h2>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-[844px] max-w-full h-[600px] overflow-hidden mt-8"
        style={{ width: '844px' }}
      >
        {items.map((item) => (
          <FloatingIcon
            key={item.name}
            item={item}
            mouseX={mouseX}
            mouseY={mouseY}
            containerRef={containerRef}
          />
        ))}
      </div>
    </section>
  );
}
