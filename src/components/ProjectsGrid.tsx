import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion';

// ============================================================================
// Types & Project Data (preserved exactly from existing portfolio)
// ============================================================================

type ProjectStatus = 'Shipped' | 'Live' | 'In Progress' | 'Reference';

interface ProjectLink {
  label: string;
  url: string;
}

interface Project {
  title: string;
  logo?: string;
  status: ProjectStatus;
  liveUrl?: string;
  whatItIs: string;
  whatItDoes: string;
  howItWorks: string;
  links: ProjectLink[];
}

const PROJECTS: Project[] = [
  {
    title: 'RedFlag-CI',
    logo: '/logos/redflag-ci.svg',
    status: 'Shipped',
    whatItIs:
      'A GitHub App that watches pull requests for risky changes to AI agent configuration before they get merged. v2.0.0 is its final planned release.',
    whatItDoes:
      "AI coding agents read their permissions and instructions from files sitting in a repo, an MCP config, a CLAUDE.md, a .cursor/rules file, and a pull request is where that configuration actually changes. RedFlag CI runs two deterministic checks: one flags drift in agent config (a new MCP server, a swapped tool version, a widened permission, a changed hook), the other scans rule files for hidden Unicode tricks and lookalike characters that can hide instructions in a diff that looks completely normal. If a PR doesn't touch any of those files, it stays silent. No dashboard noise, no false-positive fatigue.",
    howItWorks:
      "Node.js and TypeScript in strict mode, Express 5, and Octokit for the GitHub integration, with Zod handling payload validation. There are no LLM calls anywhere in the pipeline. Every check is a plain, deterministic function over file content, so the same diff always produces the same result. It's benchmarked against a 139-scenario adversarial test corpus, currently sitting at 1.000 precision and 1.000 recall.",
    links: [{ label: 'GitHub', url: 'https://github.com/nikhilvirdi/RedFlag-CI' }],
  },
  {
    title: 'JHusk',
    logo: '/logos/jhusk.svg',
    status: 'Shipped',
    whatItIs:
      'A property-based testing library for Java, published on Maven Central as io.github.nikhilvirdi:jhusk. Built solo, it brings Hypothesis-style testing, generate a huge range of inputs and shrink any failure down to the smallest reproducible case, to the JVM.',
    whatItDoes:
      'Instead of hand-picking three or four example inputs, you state a rule your code should always hold, and JHusk generates a wide spread of inputs, including the edge cases nobody thinks to write by hand, to check it. When something fails, its internal shrinking finds the smallest input that still breaks the rule, so a rare bug turns into something actually debuggable.',
    howItWorks:
      'Generators are composable, built up from map, filter, flatMap, and combine, so complex generators come from simple ones rather than being written from scratch. Shrinking works on the underlying byte stream, so even custom generators get high-quality shrinking for free. A persistent local failure database replays known failures first on every run, and everything is deterministic and seed-reproducible. It plugs into JUnit 5 through a @Property annotation, running in the same suite as regular tests. Beyond the library\'s own test suite, an independent adversarial suite tests it from the outside, as a consumer of the published artifact, currently covering 210 scenarios including 17 deliberately planted bugs.',
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/JHusk' },
      { label: 'Documentation', url: 'https://nikhilvirdi.github.io/JHusk/' },
      {
        label: 'API Reference (Javadoc)',
        url: 'https://javadoc.io/doc/io.github.nikhilvirdi/jhusk/latest/io/github/nikhilvirdi/jhusk/package-summary.html',
      },
      { label: 'Maven Central', url: 'https://central.sonatype.com/artifact/io.github.nikhilvirdi/jhusk' },
    ],
  },
  {
    title: 'ASTRA-NET',
    logo: '/logos/astra-net.png',
    status: 'Live',
    liveUrl: 'https://astra-net-8mu.pages.dev/',
    whatItIs:
      "A live, honest sky companion. It shows what's actually happening above your exact location right now: the ISS passing overhead, real satellites tracing their true positions, whether an aurora might reach your latitude tonight, and what's actually visible in the sky from where you're standing.",
    whatItDoes:
      "Most space tools show a fact with no context, a dot moving on a map, a Kp-index number, a headline about a solar flare, with nothing connecting them. ASTRA-NET's Causal Engine chains them together: a coronal mass ejection is detected, run through a physics-based transit model to estimate arrival time, checked against live geomagnetic data, then compared to your actual latitude to tell you whether it'll be visible tonight. Every prediction is later scored against what really happened, so the app's confidence stays earned instead of just claimed. One rule governs everything: if the data isn't real and verifiable, it doesn't show up.",
    howItWorks:
      'A TypeScript monorepo end to end, so the frontend and backend can never disagree on a formula. React, Three.js, and React Three Fiber render the live 3D sky (real satellite orbits, real star catalog, real constellation lines), Zustand handles state and GSAP the motion. The backend is Node/Express with PostgreSQL and Prisma, polling around a dozen free sources (NASA, NOAA, N2YO, CelesTrak, JPL Horizons, Open-Meteo, among others) on its own schedule and pushing updates out over Server-Sent Events, so visitors never hit those APIs directly.',
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/ASTRA-NET' },
      { label: 'Live', url: 'https://astra-net-8mu.pages.dev/' },
    ],
  },
  {
    title: 'Stenod',
    logo: '/logos/stenod.svg',
    status: 'In Progress',
    whatItIs:
      'A local, deterministic memory daemon for AI coding sessions, published on npm as steno-daemon and run via the stenod CLI. Still actively in progress.',
    whatItDoes:
      'AI coding tools lose context the moment a session ends. Stenod runs alongside them, capturing filesystem changes, terminal activity, and AI-provider network traffic during a coding session, and compiles all of it into a handoff manifest that lets work resume cleanly, in the same tool or a different one, without re-explaining everything from scratch.',
    howItWorks:
      "Node.js and TypeScript, watching the filesystem and terminal directly rather than depending on any one AI tool's internals. The project deliberately avoids hosted AI accounts, silent automatic AI calls, and cloud logins, everything runs locally and deterministically, with a companion dashboard that never relays data off the machine. It's currently under active architecture work, being rebuilt with a broader multi-tool capture system than its first version supported.",
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/stenod' },
      { label: 'npm', url: 'https://www.npmjs.com/package/steno-daemon' },
    ],
  },
  {
    title: 'GridLab',
    logo: '/logos/gridlab.png',
    status: 'Shipped',
    liveUrl: 'https://nikhilvirdi.github.io/GridLab/',
    whatItIs:
      'A grid-based pathfinding visualizer built for DAA coursework. Pick two points, pick from seven algorithms, and watch the search happen in real time.',
    whatItDoes:
      'Runs BFS, DFS, A*, JPS, Theta*, Bidirectional BFS, and Greedy on the same 50x50 grid, with maze generation, five terrain biomes that carry real movement costs, diagonal movement, and a side-by-side comparison mode for running two algorithms at once.',
    howItWorks:
      'React, TypeScript, Vite, and Tailwind CSS, with Framer Motion driving the UI animations.',
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/GridLab' },
      { label: 'Live', url: 'https://nikhilvirdi.github.io/GridLab/' },
    ],
  },
  {
    title: 'Cockpit',
    status: 'Shipped',
    whatItIs:
      'A local dev utility that gives you one glance at the state of all your projects instead of juggling terminal tabs.',
    whatItDoes:
      "Scans your filesystem for git-tracked repos automatically, no manual list to maintain, and checks a fixed set of common dev-service ports on localhost, so you can see what's uncommitted and what's actually running in one place.",
    howItWorks:
      'Node.js core HTTP server on the backend, plain HTML/CSS/vanilla JS on the frontend. Zero runtime dependencies by design, no Express, no framework, no database.',
    links: [{ label: 'GitHub', url: 'https://github.com/nikhilvirdi/Cockpit' }],
  },
  {
    title: 'Network Intrusion Detection MLP',
    status: 'Shipped',
    whatItIs:
      'A PyTorch multi-layer perceptron that classifies network traffic as normal or one of four attack families, trained on the NSL-KDD dataset.',
    whatItDoes:
      'Built to learn deep learning fundamentals hands-on: the forward and backward pass, loss functions, optimizers, and what overfitting actually looks like, using a dataset whose test set deliberately includes attack types the model never saw during training.',
    howItWorks:
      'Two notebook stages kept side by side rather than just the final result: a baseline model at 76% accuracy, then a regularized version (Dropout, BatchNorm, L2, early stopping) at 78%. Preprocessing with pandas and scikit-learn, trained in Google Colab.',
    links: [
      {
        label: 'GitHub',
        url: 'https://github.com/nikhilvirdi/Network-Intrusion-Detection-MLP-NSL-KDD',
      },
    ],
  },
  {
    title: 'CI/CD Pipeline Anatomy',
    status: 'Reference',
    liveUrl: 'https://nikhilvirdi.github.io/Pipeline-Anatomy/',
    whatItIs:
      'An interactive reference diagram explaining the CI/CD pipeline as a structure, what happens at each phase, and why the stages are ordered the way they are.',
    whatItDoes:
      'Built as a place to think through the logic of a pipeline, not a tutorial or a working implementation.',
    howItWorks:
      'React, React Flow, and Tailwind CSS, deployed with GitHub Actions to GitHub Pages.',
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/Pipeline-Anatomy' },
      { label: 'Live', url: 'https://nikhilvirdi.github.io/Pipeline-Anatomy/' },
    ],
  },
];

const LOGO_LESS_PROJECT_TITLES = [
  'Cockpit',
  'Network Intrusion Detection MLP',
  'CI/CD Pipeline Anatomy',
];

// ============================================================================
// Stack Spread Spatial Configuration
// ============================================================================

interface CardLayoutDef {
  projectIndex: number;
  stackOffset: { x: number; y: number }; // Initial cluster offset in px
  stackRotate: number; // Initial cluster rotation in degrees
  z: number;
  target: { x: number; y: number }; // Target spread position (% of stage bounds) on desktop
  targetSm: { x: number; y: number }; // Target spread position (% of stage bounds) on mobile
}

const CARD_LAYOUTS: CardLayoutDef[] = [
  // 0: RedFlag-CI -> Top Left
  {
    projectIndex: 0,
    stackOffset: { x: -16, y: -18 },
    stackRotate: -15,
    z: 2,
    target: { x: -33, y: -34 },
    targetSm: { x: -24, y: -37 },
  },
  // 1: ASTRA-NET -> Top Center
  {
    projectIndex: 2,
    stackOffset: { x: 2, y: -20 },
    stackRotate: -2,
    z: 3,
    target: { x: 0, y: -37 },
    targetSm: { x: 24, y: -37 },
  },
  // 2: JHusk -> Top Right
  {
    projectIndex: 1,
    stackOffset: { x: 18, y: -14 },
    stackRotate: 16,
    z: 4,
    target: { x: 33, y: -34 },
    targetSm: { x: -24, y: -19 },
  },
  // 3: Stenod -> Mid Left
  {
    projectIndex: 3,
    stackOffset: { x: -20, y: 2 },
    stackRotate: -6,
    z: 5,
    target: { x: -36, y: 0 },
    targetSm: { x: 24, y: -19 },
  },
  // 4: GridLab -> Mid Right
  {
    projectIndex: 4,
    stackOffset: { x: 20, y: 4 },
    stackRotate: 8,
    z: 6,
    target: { x: 36, y: 0 },
    targetSm: { x: -24, y: 19 },
  },
  // 5: Cockpit -> Bottom Left
  {
    projectIndex: 5,
    stackOffset: { x: -14, y: 16 },
    stackRotate: 11,
    z: 7,
    target: { x: -33, y: 34 },
    targetSm: { x: 24, y: 19 },
  },
  // 6: Network Intrusion Detection MLP -> Bottom Center
  {
    projectIndex: 6,
    stackOffset: { x: 4, y: 15 },
    stackRotate: -8,
    z: 8,
    target: { x: 0, y: 37 },
    targetSm: { x: -24, y: 37 },
  },
  // 7: CI/CD Pipeline Anatomy -> Bottom Right
  {
    projectIndex: 7,
    stackOffset: { x: 16, y: 18 },
    stackRotate: -5,
    z: 9,
    target: { x: 33, y: 34 },
    targetSm: { x: 24, y: 37 },
  },
];

const SCATTER_START = 0.12;
const SCATTER_END = 0.88;

const PARALLAX_SPRING = { stiffness: 90, damping: 22, mass: 0.6 };

function usePointerParallax(active: boolean, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, PARALLAX_SPRING);
  const y = useSpring(rawY, PARALLAX_SPRING);

  useEffect(() => {
    if (!enabled) return;

    if (!active) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const onMove = (event: PointerEvent) => {
      rawX.set((event.clientX / window.innerWidth) * 2 - 1);
      rawY.set((event.clientY / window.innerHeight) * 2 - 1);
    };

    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [active, enabled, rawX, rawY]);

  return { x, y };
}

// Custom hook to cleanly measure scroll progression within either #main-scroll-pane or window
function useSectionScrollProgress(targetRef: React.RefObject<HTMLDivElement | null>) {
  const progress = useMotionValue(0);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const getScrollContainer = (): HTMLElement | Window => {
      if (typeof window === 'undefined') return window;
      const pane = document.getElementById('main-scroll-pane');
      if (pane && window.innerWidth >= 1024 && pane.scrollHeight > pane.clientHeight) {
        return pane;
      }
      return window;
    };

    const update = () => {
      const el = targetRef.current;
      if (!el) return;

      const container = getScrollContainer();
      const rect = el.getBoundingClientRect();

      let currentScrolled: number;
      let totalScrollableDistance: number;

      if (container instanceof HTMLElement) {
        const cRect = container.getBoundingClientRect();
        currentScrolled = cRect.top - rect.top;
        totalScrollableDistance = rect.height - cRect.height;
      } else {
        currentScrolled = -rect.top;
        totalScrollableDistance = rect.height - window.innerHeight;
      }

      const p = totalScrollableDistance > 0
        ? Math.max(0, Math.min(1, currentScrolled / totalScrollableDistance))
        : 0;

      progress.set(p);
    };

    update();

    const container = getScrollContainer();
    const eventTarget = container instanceof HTMLElement ? container : window;

    eventTarget.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      eventTarget.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [targetRef, progress]);

  return progress;
}

// ============================================================================
// Interactive Spread Card Component
// ============================================================================

interface CardProps {
  layoutDef: CardLayoutDef;
  project: Project;
  progress: MotionValue<number>;
  isReduced: boolean;
  isMobile: boolean;
  stageSize: { width: number; height: number };
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  onSelect: (p: Project) => void;
  isSelected: boolean;
}

function SpreadCard({
  layoutDef,
  project,
  progress,
  isReduced,
  isMobile,
  stageSize,
  pointer,
  onSelect,
  isSelected,
}: CardProps) {
  const { stackOffset, stackRotate, target, targetSm, z } = layoutDef;

  const endXPercent = isMobile ? targetSm.x : target.x;
  const endYPercent = isMobile ? targetSm.y : target.y;

  // Convert target percentage of stage into exact pixel coordinates
  const targetPxX = (stageSize.width * endXPercent) / 100;
  const targetPxY = (stageSize.height * endYPercent) / 100;

  // Interpolate position from clustered stack (progress 0) to spread boundary (progress 1)
  const translate = useTransform(
    [progress, pointer.x, pointer.y],
    ([p, px, py]: number[]) => {
      if (isReduced) {
        return `calc(-50% + ${targetPxX.toFixed(1)}px) calc(-50% + ${targetPxY.toFixed(1)}px)`;
      }

      const curX = stackOffset.x + (targetPxX - stackOffset.x) * p;
      const curY = stackOffset.y + (targetPxY - stackOffset.y) * p;

      // Subtle parallax drift on desktop once spread completes
      const drift = p * (isMobile ? 0 : 0.85);
      const dx = px * 14 * drift;
      const dy = py * 12 * drift;

      return `calc(-50% + ${(curX - dx).toFixed(1)}px) calc(-50% + ${(curY - dy).toFixed(1)}px)`;
    }
  );

  const rotate = useTransform(progress, [0, 1], [
    isReduced ? 0 : stackRotate,
    0,
  ]);

  const scale = useTransform(progress, [0, 1], [
    isReduced ? 1 : 0.88,
    1,
  ]);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 will-change-transform cursor-pointer select-none outline-none"
      style={{
        zIndex: isSelected ? 25 : z,
        translate,
        rotate,
        scale,
      }}
      tabIndex={0}
      role="button"
      aria-label={`Select project: ${project.title}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(project);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(project);
        }
      }}
    >
      <div
        className={`group relative flex items-center justify-center overflow-hidden rounded-xl border transition-all duration-300 ${
          isSelected
            ? 'border-white/60 ring-2 ring-white/20 bg-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,0.8)] scale-105'
            : 'border-white/10 bg-zinc-950/85 hover:border-white/35 hover:bg-zinc-900/90 shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
        } ${
          isMobile
            ? 'w-[145px] h-[105px] p-2.5'
            : 'w-[195px] lg:w-[215px] h-[135px] lg:h-[145px] p-3.5'
        }`}
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Subtle SVG fractal noise texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Centered Logo/Visual */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {project.logo ? (
            <img
              src={project.logo}
              alt={project.title}
              className="max-h-[52px] sm:max-h-[64px] max-w-[76%] object-contain select-none pointer-events-none drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <h4
              className={`${
                LOGO_LESS_PROJECT_TITLES.includes(project.title)
                  ? 'font-oxygen font-bold'
                  : 'font-heading font-semibold'
              } text-[13px] sm:text-base text-foreground text-center px-1.5 sm:px-2 leading-snug select-none line-clamp-2`}
            >
              {project.title}
            </h4>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Iframe Frame Components (for live web application projects)
// ============================================================================

function GridLabFrame({ liveUrl }: { liveUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const BASE_WIDTH = 1600;
  const BASE_HEIGHT = 900;
  const [scale, setScale] = useState<number>(768 / BASE_WIDTH);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          setScale(w / BASE_WIDTH);
        }
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-3xl bg-black overflow-hidden shrink-0 rounded-lg"
      style={{
        aspectRatio: `${BASE_WIDTH} / ${BASE_HEIGHT}`,
        height: `${Math.round(BASE_HEIGHT * scale)}px`,
      }}
    >
      <iframe
        src={liveUrl}
        title="GridLab live application"
        className="border-0 block"
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}

function AstraNetFrame({ liveUrl }: { liveUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const BASE_WIDTH = 1920;
  const BASE_HEIGHT = 1080;
  const [scale, setScale] = useState<number>(768 / BASE_WIDTH);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          setScale(w / BASE_WIDTH);
        }
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-3xl bg-black overflow-hidden shrink-0 rounded-lg"
      style={{
        aspectRatio: `${BASE_WIDTH} / ${BASE_HEIGHT}`,
        height: `${Math.round(BASE_HEIGHT * scale)}px`,
      }}
    >
      <iframe
        src={liveUrl}
        title="ASTRA-NET live application"
        className="border-0 block"
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}

function PipelineAnatomyFrame({ liveUrl }: { liveUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const BASE_WIDTH = 1920;
  const BASE_HEIGHT = 1080;
  const [scale, setScale] = useState<number>(768 / BASE_WIDTH);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          setScale(w / BASE_WIDTH);
        }
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-3xl bg-black overflow-hidden shrink-0 rounded-lg"
      style={{
        aspectRatio: `${BASE_WIDTH} / ${BASE_HEIGHT}`,
        height: `${Math.round(BASE_HEIGHT * scale)}px`,
      }}
    >
      <iframe
        src={liveUrl}
        title="CI/CD Pipeline Anatomy live application"
        className="border-0 block"
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}

// ============================================================================
// Main ProjectsGrid Component with Stack Spread Scroll Architecture
// ============================================================================

export default function ProjectsGrid() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const reduceMotion = useReducedMotion();
  const isReduced = reduceMotion === true;

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 844, height: 640 });

  // Measure stage element dimensions for responsive spread interpolation
  useEffect(() => {
    const updateDimensions = () => {
      const mobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
      setIsMobile(mobile);
      if (stageRef.current) {
        setStageSize({
          width: stageRef.current.clientWidth || 844,
          height: stageRef.current.clientHeight || 640,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const ro = new ResizeObserver(updateDimensions);
    if (stageRef.current) {
      ro.observe(stageRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      ro.disconnect();
    };
  }, []);

  // Section scroll progression: hold -> spread -> settle
  const rawProgress = useSectionScrollProgress(wrapRef);
  const scatterProgress = useTransform(
    rawProgress,
    [0, SCATTER_START, SCATTER_END, 1],
    [0, 0, 1, 1]
  );

  // Pointer parallax activates only after cards are fully spread
  const [isSpreadComplete, setIsSpreadComplete] = useState(false);
  useEffect(() => {
    const unsub = scatterProgress.on('change', (v) => {
      setIsSpreadComplete(v >= 0.95);
    });
    return () => unsub();
  }, [scatterProgress]);

  const parallaxEnabled = !isReduced && !isMobile;
  const pointer = usePointerParallax(isSpreadComplete, parallaxEnabled);

  // Center instructional text animation
  const centerTextOpacity = useTransform(scatterProgress, [0.28, 0.65], [0, 1]);
  const centerTextScale = useTransform(scatterProgress, [0.28, 0.85], [0.88, 1]);

  // Scroll hint fades out as scatter begins
  const scrollHintOpacity = useTransform(rawProgress, [0, SCATTER_START], [1, 0]);

  // Handle escape key to close selected project view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProject(null);
      }
    };
    if (selectedProject) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject]);

  const handleSelect = useCallback((project: Project) => {
    setSelectedProject((prev) => (prev?.title === project.title ? null : project));
  }, []);

  // Tailored scroll length: ~220vh on desktop, ~180vh on mobile
  const scrollLength = isMobile ? 180 : 220;

  return (
    <div
      ref={wrapRef}
      className="relative w-[844px] max-w-full"
      style={{ height: `${scrollLength}vh` }}
    >
      {/* Sticky Viewport Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center">
        {/* Center instructional text: fades into view during the spread */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-4 text-center select-none"
          style={{
            opacity: isReduced ? 1 : centerTextOpacity,
            scale: isReduced ? 1 : centerTextScale,
          }}
        >
          <h3 className="font-heading text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-foreground">
            Tap on any project
            <br />
            to explore and preview it
          </h3>
        </motion.div>

        {/* Stack Spread Cards Container */}
        <div
          ref={stageRef}
          className="relative w-full h-[580px] sm:h-[640px] flex items-center justify-center"
        >
          {CARD_LAYOUTS.map((layout) => {
            const project = PROJECTS[layout.projectIndex];
            const isSelected = selectedProject?.title === project.title;
            return (
              <SpreadCard
                key={project.title}
                layoutDef={layout}
                project={project}
                progress={scatterProgress}
                isReduced={isReduced}
                isMobile={isMobile}
                stageSize={stageSize}
                pointer={pointer}
                onSelect={handleSelect}
                isSelected={isSelected}
              />
            );
          })}
        </div>

        {/* Initial Scroll Hint */}
        {!isReduced && (
          <motion.div
            className="pointer-events-none absolute bottom-4 sm:bottom-6 z-20 flex flex-col items-center gap-1 text-[10px] sm:text-xs font-tag uppercase tracking-[0.2em] text-muted select-none"
            style={{ opacity: scrollHintOpacity }}
          >
            <span>Scroll to spread</span>
            <svg
              className="w-3.5 h-3.5 animate-bounce text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        )}

        {/* Selected Project In-Place View within the SAME Area */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              key="project-details-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedProject(null)}
            >
              <motion.div
                key="project-details-card"
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto border border-white/10 bg-zinc-950 p-6 sm:p-8 rounded-xl flex flex-col space-y-6 shadow-2xl"
              >
                {/* Header row with "Back to projects", links, and close */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-tag font-medium text-muted hover:text-foreground transition-colors group cursor-pointer"
                  >
                    <span className="transition-transform group-hover:-translate-x-1">←</span>
                    <span>Back to projects</span>
                  </button>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {selectedProject.links && selectedProject.links.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedProject.links.map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-tag font-medium text-foreground bg-transparent border border-white/20 hover:border-white/50 hover:bg-white/5 transition-colors rounded-sm"
                          >
                            <span>{link.label}</span>
                            <svg
                              className="w-3 h-3 opacity-70"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedProject(null)}
                      className="text-zinc-400 hover:text-white transition-colors p-1 leading-none text-xl ml-1 cursor-pointer"
                      aria-label="Close project view"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3
                  className={`${
                    LOGO_LESS_PROJECT_TITLES.includes(selectedProject.title)
                      ? 'font-oxygen'
                      : 'font-heading'
                  } text-2xl sm:text-3xl font-medium text-foreground tracking-tight`}
                >
                  {selectedProject.title}
                </h3>

                {/* Live frame or Logo visual */}
                {selectedProject.liveUrl ? (
                  <div
                    className={`w-full flex justify-center overflow-hidden border border-white/10 rounded-lg bg-black ${
                      selectedProject.title === 'ASTRA-NET' ||
                      selectedProject.title === 'GridLab' ||
                      selectedProject.title === 'CI/CD Pipeline Anatomy'
                        ? 'shrink-0'
                        : ''
                    }`}
                  >
                    {selectedProject.title === 'GridLab' ? (
                      <GridLabFrame liveUrl={selectedProject.liveUrl} />
                    ) : selectedProject.title === 'ASTRA-NET' ? (
                      <AstraNetFrame liveUrl={selectedProject.liveUrl} />
                    ) : selectedProject.title === 'CI/CD Pipeline Anatomy' ? (
                      <PipelineAnatomyFrame liveUrl={selectedProject.liveUrl} />
                    ) : (
                      <div
                        className="relative w-full max-w-3xl bg-black"
                        style={{ height: '48vh', minHeight: '380px' }}
                      >
                        <iframe
                          src={selectedProject.liveUrl}
                          title={`${selectedProject.title} live application`}
                          className="w-full h-full border-0 block"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 sm:py-12 flex items-center justify-center border border-white/5 rounded-lg bg-zinc-900/30">
                    {selectedProject.logo ? (
                      <img
                        src={selectedProject.logo}
                        alt={selectedProject.title}
                        className="max-h-[140px] sm:max-h-[180px] max-w-[80%] object-contain select-none"
                      />
                    ) : (
                      <h4
                        className={`${
                          LOGO_LESS_PROJECT_TITLES.includes(selectedProject.title)
                            ? 'font-oxygen'
                            : 'font-heading'
                        } text-2xl sm:text-3xl font-bold text-foreground text-center px-6 max-w-lg leading-snug`}
                      >
                        {selectedProject.title}
                      </h4>
                    )}
                  </div>
                )}

                {/* Detailed descriptions */}
                <div className="space-y-6 pt-2">
                  {selectedProject.whatItIs && (
                    <div>
                      <h4 className="font-heading text-lg font-medium text-foreground tracking-tight mb-2">
                        What it is
                      </h4>
                      <p className="font-body text-sm sm:text-base text-foreground/90 leading-relaxed">
                        {selectedProject.whatItIs}
                      </p>
                    </div>
                  )}

                  {selectedProject.whatItDoes && (
                    <div>
                      <h4 className="font-heading text-lg font-medium text-foreground tracking-tight mb-2">
                        What it does
                      </h4>
                      <p className="font-body text-sm sm:text-base text-foreground/90 leading-relaxed">
                        {selectedProject.whatItDoes}
                      </p>
                    </div>
                  )}

                  {selectedProject.howItWorks && (
                    <div>
                      <h4 className="font-heading text-lg font-medium text-foreground tracking-tight mb-2">
                        How it works
                      </h4>
                      <p className="font-body text-sm sm:text-base text-foreground/90 leading-relaxed">
                        {selectedProject.howItWorks}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
