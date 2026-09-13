import { useState, useRef, useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
  type PanInfo,
} from 'framer-motion';

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
    whatItIs: "A GitHub App that watches pull requests for risky changes to AI agent configuration before they get merged. v2.0.0 is its final planned release.",
    whatItDoes: "AI coding agents read their permissions and instructions from files sitting in a repo, an MCP config, a CLAUDE.md, a .cursor/rules file, and a pull request is where that configuration actually changes. RedFlag CI runs two deterministic checks: one flags drift in agent config (a new MCP server, a swapped tool version, a widened permission, a changed hook), the other scans rule files for hidden Unicode tricks and lookalike characters that can hide instructions in a diff that looks completely normal. If a PR doesn't touch any of those files, it stays silent. No dashboard noise, no false-positive fatigue.",
    howItWorks: "Node.js and TypeScript in strict mode, Express 5, and Octokit for the GitHub integration, with Zod handling payload validation. There are no LLM calls anywhere in the pipeline. Every check is a plain, deterministic function over file content, so the same diff always produces the same result. It's benchmarked against a 139-scenario adversarial test corpus, currently sitting at 1.000 precision and 1.000 recall.",
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/RedFlag-CI' },
    ],
  },
  {
    title: 'JHusk',
    logo: '/logos/jhusk.svg',
    status: 'Shipped',
    whatItIs: "A property-based testing library for Java, published on Maven Central as io.github.nikhilvirdi:jhusk. Built solo, it brings Hypothesis-style testing, generate a huge range of inputs and shrink any failure down to the smallest reproducible case, to the JVM.",
    whatItDoes: "Instead of hand-picking three or four example inputs, you state a rule your code should always hold, and JHusk generates a wide spread of inputs, including the edge cases nobody thinks to write by hand, to check it. When something fails, its internal shrinking finds the smallest input that still breaks the rule, so a rare bug turns into something actually debuggable.",
    howItWorks: "Generators are composable, built up from map, filter, flatMap, and combine, so complex generators come from simple ones rather than being written from scratch. Shrinking works on the underlying byte stream, so even custom generators get high-quality shrinking for free. A persistent local failure database replays known failures first on every run, and everything is deterministic and seed-reproducible. It plugs into JUnit 5 through a @Property annotation, running in the same suite as regular tests. Beyond the library's own test suite, an independent adversarial suite tests it from the outside, as a consumer of the published artifact, currently covering 210 scenarios including 17 deliberately planted bugs.",
    links: [
      { label: "GitHub", url: "https://github.com/nikhilvirdi/JHusk" },
      { label: "Documentation", url: "https://nikhilvirdi.github.io/JHusk/" },
      { label: "API Reference (Javadoc)", url: "https://javadoc.io/doc/io.github.nikhilvirdi/jhusk/latest/io/github/nikhilvirdi/jhusk/package-summary.html" },
      { label: "Maven Central", url: "https://central.sonatype.com/artifact/io.github.nikhilvirdi/jhusk" },
    ],
  },
  {
    title: 'ASTRA-NET',
    logo: '/logos/astra-net.png',
    status: 'Live',
    liveUrl: 'https://astra-net-8mu.pages.dev/',
    whatItIs: "A live, honest sky companion. It shows what's actually happening above your exact location right now: the ISS passing overhead, real satellites tracing their true positions, whether an aurora might reach your latitude tonight, and what's actually visible in the sky from where you're standing.",
    whatItDoes: "Most space tools show a fact with no context, a dot moving on a map, a Kp-index number, a headline about a solar flare, with nothing connecting them. ASTRA-NET's Causal Engine chains them together: a coronal mass ejection is detected, run through a physics-based transit model to estimate arrival time, checked against live geomagnetic data, then compared to your actual latitude to tell you whether it'll be visible tonight. Every prediction is later scored against what really happened, so the app's confidence stays earned instead of just claimed. One rule governs everything: if the data isn't real and verifiable, it doesn't show up.",
    howItWorks: "A TypeScript monorepo end to end, so the frontend and backend can never disagree on a formula. React, Three.js, and React Three Fiber render the live 3D sky (real satellite orbits, real star catalog, real constellation lines), Zustand handles state and GSAP the motion. The backend is Node/Express with PostgreSQL and Prisma, polling around a dozen free sources (NASA, NOAA, N2YO, CelesTrak, JPL Horizons, Open-Meteo, among others) on its own schedule and pushing updates out over Server-Sent Events, so visitors never hit those APIs directly.",
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/ASTRA-NET' },
      { label: 'Live', url: 'https://astra-net-8mu.pages.dev/' },
    ],
  },
  {
    title: 'Stenod',
    logo: '/logos/stenod.svg',
    status: 'In Progress',
    whatItIs: "A local, deterministic memory daemon for AI coding sessions, published on npm as steno-daemon and run via the stenod CLI. Still actively in progress.",
    whatItDoes: "AI coding tools lose context the moment a session ends. Stenod runs alongside them, capturing filesystem changes, terminal activity, and AI-provider network traffic during a coding session, and compiles all of it into a handoff manifest that lets work resume cleanly, in the same tool or a different one, without re-explaining everything from scratch.",
    howItWorks: "Node.js and TypeScript, watching the filesystem and terminal directly rather than depending on any one AI tool's internals. The project deliberately avoids hosted AI accounts, silent automatic AI calls, and cloud logins, everything runs locally and deterministically, with a companion dashboard that never relays data off the machine. It's currently under active architecture work, being rebuilt with a broader multi-tool capture system than its first version supported.",
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
    whatItIs: "A grid-based pathfinding visualizer built for DAA coursework. Pick two points, pick from seven algorithms, and watch the search happen in real time.",
    whatItDoes: "Runs BFS, DFS, A*, JPS, Theta*, Bidirectional BFS, and Greedy on the same 50x50 grid, with maze generation, five terrain biomes that carry real movement costs, diagonal movement, and a side-by-side comparison mode for running two algorithms at once.",
    howItWorks: "React, TypeScript, Vite, and Tailwind CSS, with Framer Motion driving the UI animations.",
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/GridLab' },
      { label: 'Live', url: 'https://nikhilvirdi.github.io/GridLab/' },
    ],
  },
  {
    title: 'Cockpit',
    status: 'Shipped',
    whatItIs: "A local dev utility that gives you one glance at the state of all your projects instead of juggling terminal tabs.",
    whatItDoes: "Scans your filesystem for git-tracked repos automatically, no manual list to maintain, and checks a fixed set of common dev-service ports on localhost, so you can see what's uncommitted and what's actually running in one place.",
    howItWorks: "Node.js core HTTP server on the backend, plain HTML/CSS/vanilla JS on the frontend. Zero runtime dependencies by design, no Express, no framework, no database.",
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/Cockpit' },
    ],
  },
  {
    title: 'Network Intrusion Detection MLP',
    status: 'Shipped',
    whatItIs: "A PyTorch multi-layer perceptron that classifies network traffic as normal or one of four attack families, trained on the NSL-KDD dataset.",
    whatItDoes: "Built to learn deep learning fundamentals hands-on: the forward and backward pass, loss functions, optimizers, and what overfitting actually looks like, using a dataset whose test set deliberately includes attack types the model never saw during training.",
    howItWorks: "Two notebook stages kept side by side rather than just the final result: a baseline model at 76% accuracy, then a regularized version (Dropout, BatchNorm, L2, early stopping) at 78%. Preprocessing with pandas and scikit-learn, trained in Google Colab.",
    links: [
      { label: 'GitHub', url: 'https://github.com/nikhilvirdi/Network-Intrusion-Detection-MLP-NSL-KDD' },
    ],
  },
  {
    title: 'CI/CD Pipeline Anatomy',
    status: 'Reference',
    liveUrl: 'https://nikhilvirdi.github.io/Pipeline-Anatomy/',
    whatItIs: "An interactive reference diagram explaining the CI/CD pipeline as a structure, what happens at each phase, and why the stages are ordered the way they are.",
    whatItDoes: "Built as a place to think through the logic of a pipeline, not a tutorial or a working implementation.",
    howItWorks: "React, React Flow, and Tailwind CSS, deployed with GitHub Actions to GitHub Pages.",
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

interface CarouselCardProps {
  project: Project;
  index: number;
  faceCount: number;
  radius: number;
  faceWidth: number;
  faceHeight: number;
  springRotation: MotionValue<number>;
  onSelect: (project: Project) => void;
  isDraggingRef: React.RefObject<boolean>;
}

function CarouselCard({
  project,
  index,
  faceCount,
  radius,
  faceWidth,
  faceHeight,
  springRotation,
  onSelect,
  isDraggingRef,
}: CarouselCardProps) {
  const angle = index * (360 / faceCount);

  // Depth dimming: live function of current rotation angle relative to front-center (0 deg)
  const opacity = useTransform(springRotation, (r) => {
    let diff = (r + angle) % 360;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const absDiff = Math.abs(diff);
    // 0 deg -> 1.0 (full opacity), falling off toward sides/back to floor of 0.48
    const factor = Math.min(absDiff / 90, 1);
    return 1 - 0.52 * factor;
  });

  // Live brightness falloff matching depth
  const filter = useTransform(opacity, (op) => `brightness(${0.35 + 0.65 * op})`);

  return (
    <motion.div
      className="absolute top-0 left-0 flex items-center justify-center cursor-pointer overflow-hidden select-none [transform-style:preserve-3d]"
      style={{
        width: `${faceWidth}px`,
        height: `${faceHeight}px`,
        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        opacity,
        filter,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (isDraggingRef.current) return;
        onSelect(project);
      }}
    >
      {/* Inline SVG fractal noise grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.06,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Card Content: centered logo or title text */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-5">
        {project.logo ? (
          <img
            src={project.logo}
            alt={project.title}
            className="max-h-[48%] max-w-[72%] object-contain select-none pointer-events-none"
          />
        ) : (
          <h3
            className={`${
              LOGO_LESS_PROJECT_TITLES.includes(project.title)
                ? 'font-oxygen font-bold'
                : 'font-heading font-semibold'
            } text-lg text-foreground text-center px-4 leading-snug select-none`}
          >
            {project.title}
          </h3>
        )}
      </div>
    </motion.div>
  );
}

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
      className="relative w-full max-w-3xl bg-black overflow-hidden shrink-0"
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
      className="relative w-full max-w-3xl bg-black overflow-hidden shrink-0"
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
      className="relative w-full max-w-3xl bg-black overflow-hidden shrink-0"
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

export default function ProjectsGrid() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(844);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || 844);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Initial rotation offset of -135 puts Stenod in front
  const rotation = useMotionValue(-135);
  const springRotation = useSpring(rotation, {
    stiffness: 100,
    damping: 30,
    mass: 0.1,
  });

  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);

  // Derived cylinderWidth based on measured container element bounds: 1800 desktop / 1100 mobile
  const isMobile = containerWidth < 600;
  const cylinderWidth = isMobile ? 1100 : 1800;
  const faceCount = PROJECTS.length;
  const faceWidth = cylinderWidth / faceCount; // 225px on desktop, 137.5px on mobile
  const radius = cylinderWidth / (2 * Math.PI); // ~286.5px on desktop, 175px on mobile
  // Proportional height ratio ~1:0.8 (225px width -> 180px height)
  const faceHeight = Math.round(faceWidth * 0.8);

  const isModalOpen = Boolean(selectedProject);

  const handleDragStart = () => {
    isDraggingRef.current = false;
    dragDistanceRef.current = 0;
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (isModalOpen) return;
    dragDistanceRef.current += Math.abs(info.delta.x);
    if (dragDistanceRef.current > 4) {
      isDraggingRef.current = true;
    }
    // 1:1 tactile drag tracking
    rotation.set(rotation.get() + info.delta.x * (360 / cylinderWidth));
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (isModalOpen) return;
    rotation.set(rotation.get() + info.velocity.x * 0.03);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  // Close modal on Escape key and manage body overflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProject(null);
      }
    };
    const mainEl = document.getElementById('main-scroll-pane') || document.querySelector('main');
    if (selectedProject) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      if (mainEl) mainEl.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (mainEl) mainEl.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (mainEl) mainEl.style.overflow = '';
    };
  }, [selectedProject]);

  return (
    <div
      ref={containerRef}
      className="relative w-[844px] max-w-full pt-6 flex flex-col items-center justify-center select-none"
      style={{ width: '844px' }}
    >
      {/* Outer carousel container with fixed height 380px */}
      <motion.div
        className="relative w-full h-[380px] flex items-center justify-center overflow-hidden [perspective:1000px] cursor-grab active:cursor-grabbing"
        style={{ perspective: 1000 }}
        drag={isModalOpen ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {/* Rotating 3D Cylinder */}
        <motion.div
          className="relative [transform-style:preserve-3d]"
          style={{
            width: `${faceWidth}px`,
            height: `${faceHeight}px`,
            rotateY: springRotation,
            transformStyle: 'preserve-3d',
          }}
        >
          {PROJECTS.map((project, i) => (
            <CarouselCard
              key={project.title}
              project={project}
              index={i}
              faceCount={faceCount}
              radius={radius}
              faceWidth={faceWidth}
              faceHeight={faceHeight}
              springRotation={springRotation}
              onSelect={setSelectedProject}
              isDraggingRef={isDraggingRef}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Centered Overlay Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            key="modal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setSelectedProject(null)}
          >
            {/* Centered Panel - Sharp 90° corners, thin 1px hairline border, no heavy shadow */}
            <motion.div
              key="modal-panel"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{
                duration: 0.5,
                ease: [0.32, 0.72, 0, 1],
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl border border-white/10 p-6 sm:p-8 overflow-y-auto max-h-[90vh] flex flex-col space-y-6"
              style={{ backgroundColor: '#000000' }}
            >
              {/* Header row: project name on left, links pills + close button on right */}
              <div className="flex items-center justify-between gap-4 pb-2">
                <h3
                  className={`${
                    LOGO_LESS_PROJECT_TITLES.includes(selectedProject.title)
                      ? 'font-oxygen'
                      : 'font-heading'
                  } text-2xl sm:text-3xl font-medium text-foreground tracking-tight`}
                >
                  {selectedProject.title}
                </h3>

                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                  {selectedProject.links && selectedProject.links.length > 0 && (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {selectedProject.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-tag font-medium text-foreground bg-transparent border border-white/20 hover:border-white/50 hover:bg-white/5 transition-colors"
                        >
                          <span>{link.label}</span>
                          <svg
                            className="w-3.5 h-3.5 opacity-70"
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
                    className="text-zinc-400 hover:text-white transition-colors p-1 leading-none text-xl ml-1"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Frame area (top of modal) */}
              {selectedProject.liveUrl ? (
                /* Live interactive iframe for projects with liveUrl: centered, clean edge with no border/bezel */
                <div
                  className={`w-full flex justify-center overflow-hidden ${
                    selectedProject.title === 'ASTRA-NET' || selectedProject.title === 'GridLab' || selectedProject.title === 'CI/CD Pipeline Anatomy' ? 'shrink-0' : ''
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
                      className="relative w-full max-w-3xl bg-black overflow-hidden"
                      style={{ height: '56vh', minHeight: '440px', overflow: 'hidden', flexShrink: 0 }}
                    >
                      <iframe
                        src={selectedProject.liveUrl}
                        title={`${selectedProject.title} live application`}
                        className="w-full h-full border-0 block"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Natural size logo or title text for projects with no liveUrl, no boundary box */
                <div className="py-10 sm:py-14 flex items-center justify-center">
                  {selectedProject.logo ? (
                    <img
                      src={selectedProject.logo}
                      alt={selectedProject.title}
                      className="max-h-[180px] sm:max-h-[220px] max-w-[85%] object-contain select-none"
                    />
                  ) : (
                    <h4
                      className={`${
                        LOGO_LESS_PROJECT_TITLES.includes(selectedProject.title)
                          ? 'font-oxygen'
                          : 'font-heading'
                      } text-3xl sm:text-4xl font-bold text-foreground text-center px-6 max-w-lg leading-snug`}
                    >
                      {selectedProject.title}
                    </h4>
                  )}
                </div>
              )}

              {/* Info block below the frame, using data from Part 1 */}
              <div className="space-y-8 pt-4">
                {selectedProject.whatItIs && (
                  <div>
                    <h4 className="font-heading text-xl sm:text-2xl font-medium text-foreground tracking-tight mb-2.5">
                      What it is
                    </h4>
                    <p className="font-body text-base text-foreground/90 leading-relaxed">
                      {selectedProject.whatItIs}
                    </p>
                  </div>
                )}

                {selectedProject.whatItDoes && (
                  <div>
                    <h4 className="font-heading text-xl sm:text-2xl font-medium text-foreground tracking-tight mb-2.5">
                      What it does
                    </h4>
                    <p className="font-body text-base text-foreground/90 leading-relaxed">
                      {selectedProject.whatItDoes}
                    </p>
                  </div>
                )}

                {selectedProject.howItWorks && (
                  <div>
                    <h4 className="font-heading text-xl sm:text-2xl font-medium text-foreground tracking-tight mb-2.5">
                      How it works
                    </h4>
                    <p className="font-body text-base text-foreground/90 leading-relaxed">
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
  );
}
