import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

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
  { name: 'Java', svg: javaSvg, message: "am Nik's favorite language btw" },
  { name: 'TypeScript', svg: typescriptSvg, message: "he just uses type annotations over javascript and thinks its me" },
  { name: 'JavaScript', svg: javascriptSvg, message: "haha nik always forgets my syntax" },
  { name: 'Python', svg: pythonSvg, message: "he uses me for AI stuff" },
  { name: 'C', svg: cSvg, message: "the OG, he respects me from a distance" },

  { name: 'Node.js', svg: nodejsSvg, message: "yk nik uses me for backend??" },
  { name: 'Express', svg: expressSvg, invert: true, message: "am the framework holding his APIs together" },
  { name: 'Postman', svg: postmanSvg, message: "he tests his APIs on me before trusting them anywhere else" },
  { name: 'React', svg: reactSvg, message: "he uses me for vibecoding frontend nd still thinks am boring to learn" },
  { name: 'Tailwind CSS', svg: tailwindcssSvg, message: "supporting guy to react for nik as he finds both boring" },

  { name: 'PostgreSQL', svg: postgresqlSvg, message: "his data lives in me, rent free" },
  { name: 'Prisma', svg: prismaSvg, invert: true, message: "am the middleman bw nik and his postgre" },
  { name: 'HTML5', svg: html5Svg, message: "i remind him of his 1st sem" },
  { name: 'CSS3', svg: css3Svg, message: "i used to help him add colors in his dead frontends till he started vibecoding frontend using tailwind" },

  { name: 'Docker', svg: dockerSvg, message: "nik's fav technology, i once helped him run 10 servers on his one laptop only" },
  { name: 'Nginx', svg: nginxSvg, message: "am nik's load balancer, reverse proxy friend, and sometimes cacher too" },
  { name: 'GitHub Actions', svg: githubactionsSvg, message: "i run his CI so he doesn't have to remember to" },
  { name: 'Git', svg: gitSvg, message: "i remember every mistake he's ever committed, literally" },
  { name: 'GitHub', svg: githubSvg, invert: true, message: "home of way too many repos, only some of them finished" },
  {
    name: 'JWT',
    svg: '/icons/jwt.png',
    message: "he has hardly used me in any of the projects as of now",
  },
];

function generateFloatingItems(): TechItem[] {
  const X_MIN = 8;
  const X_MAX = 92;
  const Y_MIN = 12;
  const Y_MAX = 86;
  const cols = 5;
  const rows = 4;
  const colStep = (X_MAX - X_MIN) / (cols - 1);
  const rowStep = (Y_MAX - Y_MIN) / (rows - 1);

  const slots: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        x: X_MIN + c * colStep + (Math.random() - 0.5) * (colStep * 0.4),
        y: Y_MIN + r * rowStep + (Math.random() - 0.5) * (rowStep * 0.4),
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
  isBubbleActive: boolean;
}

function FloatingIcon({
  item,
  mouseX,
  mouseY,
  containerRef,
  isBubbleActive,
}: FloatingIconProps) {
  const [flipBelow, setFlipBelow] = useState(item.y < 28);
  const [shiftX, setShiftX] = useState<'left' | 'right' | 'center'>(
    item.x < 20 ? 'right' : item.x > 80 ? 'left' : 'center'
  );
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { damping: 20, stiffness: 200 });
  const springY = useSpring(offsetY, { damping: 20, stiffness: 200 });

  useEffect(() => {
    let animId: number;
    let flipBelowRef = item.y < 28;
    let shiftXRef: 'left' | 'right' | 'center' =
      item.x < 20 ? 'right' : item.x > 80 ? 'left' : 'center';
    const REPEL_RADIUS = 150;
    const MAX_PUSH = 85;

    const checkRepel = () => {
      if (containerRef.current) {
        const contRect = containerRef.current.getBoundingClientRect();
        const baseCenterX = (item.x / 100) * contRect.width;
        const baseCenterY = (item.y / 100) * contRect.height;

        const mx = mouseX.current;
        const my = mouseY.current;
        let repelling = false;

        if (mx !== null && my !== null && mx !== -9999 && my !== -9999) {
          const dx = baseCenterX - mx;
          const dy = baseCenterY - my;
          const dist = Math.hypot(dx, dy);

          if (dist < REPEL_RADIUS) {
            repelling = true;
            const force = 1 - dist / REPEL_RADIUS;
            const push = force * MAX_PUSH;
            const angle = Math.atan2(dy, dx);
            offsetX.set(Math.cos(angle) * push);
            offsetY.set(Math.sin(angle) * push);
          } else {
            offsetX.set(0);
            offsetY.set(0);
          }
        } else {
          offsetX.set(0);
          offsetY.set(0);
        }

        const currentX = baseCenterX + (repelling ? offsetX.get() : 0);
        const currentY = baseCenterY + (repelling ? offsetY.get() : 0);

        const shouldFlip = currentY < 140;
        if (shouldFlip !== flipBelowRef) {
          flipBelowRef = shouldFlip;
          setFlipBelow(shouldFlip);
        }

        const shouldShift: 'left' | 'right' | 'center' =
          currentX < 130 ? 'right' : contRect.width - currentX < 130 ? 'left' : 'center';
        if (shouldShift !== shiftXRef) {
          shiftXRef = shouldShift;
          setShiftX(shouldShift);
        }
      }
      animId = requestAnimationFrame(checkRepel);
    };

    animId = requestAnimationFrame(checkRepel);
    return () => cancelAnimationFrame(animId);
  }, [containerRef, item.x, item.y, mouseX, mouseY, offsetX, offsetY]);

  const shiftClass =
    shiftX === 'right'
      ? 'translate-x-8'
      : shiftX === 'left'
      ? '-translate-x-8'
      : 'translate-x-0';

  return (
    <motion.div
      className={`absolute select-none pointer-events-auto cursor-default -translate-x-1/2 -translate-y-1/2 ${
        isBubbleActive ? 'z-40' : 'z-10'
      }`}
      style={{
        left: `${item.x}%`,
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
        <AnimatePresence>
          {isBubbleActive && item.message && (
            <motion.div
              initial={{ opacity: 0, y: flipBelow ? -8 : 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: flipBelow ? -6 : 6, scale: 0.85 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`absolute ${
                flipBelow ? 'top-full mt-1' : 'bottom-full mb-1'
              } left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-50 w-max`}
            >
              {flipBelow && (
                /* Small triangular tail pointing UP toward the icon */
                <svg
                  viewBox="0 0 16 10"
                  className="w-4 h-2.5 -mb-[1px] pointer-events-none overflow-visible rotate-180 z-20"
                >
                  <polygon points="0,-1 16,-1 8,9" fill="#000000" />
                  <path
                    d="M 0,0 L 8,9 L 16,0"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Simple rectangle with slightly rounded corners */}
              <div
                className={`relative bg-black text-white text-xs font-tag font-medium px-3.5 py-2 rounded-md border border-white shadow-[0_0_15px_rgba(255,255,255,0.15)] text-center leading-snug whitespace-normal max-w-[210px] z-10 transition-transform duration-150 ${shiftClass}`}
              >
                {item.message}
              </div>

              {!flipBelow && (
                /* Small triangular tail pointing DOWN toward the icon */
                <svg
                  viewBox="0 0 16 10"
                  className="w-4 h-2.5 -mt-[1px] pointer-events-none overflow-visible z-20"
                >
                  <polygon points="0,-1 16,-1 8,9" fill="#000000" />
                  <path
                    d="M 0,0 L 8,9 L 16,0"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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

export default function TechStackFloating() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseX = useRef<number>(-9999);
  const mouseY = useRef<number>(-9999);
  const [items] = useState<TechItem[]>(generateFloatingItems);
  const [activeBubbleName, setActiveBubbleName] = useState<string | null>(null);

  useEffect(() => {
    let animId: number;
    let currentActiveRef: string | null = null;
    const REPEL_RADIUS = 150;

    const updateClosest = () => {
      if (containerRef.current) {
        const mx = mouseX.current;
        const my = mouseY.current;
        let closestName: string | null = null;

        if (mx !== -9999 && my !== -9999) {
          const contRect = containerRef.current.getBoundingClientRect();
          let minDist = REPEL_RADIUS;

          for (const item of items) {
            const baseCenterX = (item.x / 100) * contRect.width;
            const baseCenterY = (item.y / 100) * contRect.height;
            const dist = Math.hypot(baseCenterX - mx, baseCenterY - my);
            if (dist < minDist) {
              minDist = dist;
              closestName = item.name;
            }
          }
        }

        if (closestName !== currentActiveRef) {
          currentActiveRef = closestName;
          setActiveBubbleName(closestName);
        }
      }
      animId = requestAnimationFrame(updateClosest);
    };

    animId = requestAnimationFrame(updateClosest);
    return () => cancelAnimationFrame(animId);
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
    setActiveBubbleName(null);
  };

  return (
    <section
      id="tech-stack"
      className="py-20 bg-background"
    >
      <div className="px-16">
        <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
          <span className="bg-[#1D4FD8] box-decoration-clone">Tech Stack</span>
        </h2>
      </div>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[600px] overflow-hidden mt-8"
      >
        {items.map((item) => (
          <FloatingIcon
            key={item.name}
            item={item}
            mouseX={mouseX}
            mouseY={mouseY}
            containerRef={containerRef}
            isBubbleActive={activeBubbleName === item.name}
          />
        ))}
      </div>
    </section>
  );
}
