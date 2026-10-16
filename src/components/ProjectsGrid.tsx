import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorksWheel, LOGO_SCALE_OVERRIDES, DEFAULT_LOGO_SIZE } from './ui/works-wheel';
import JHuskTimeline from './JHuskTimeline';

// ============================================================================
// Types & Project Data (preserved exactly from existing portfolio)
// ============================================================================

export type ProjectStatus = 'Shipped' | 'Live' | 'In Progress' | 'Reference';

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
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
    title: 'Network Intrusion Detection MLP',
    logo: '/logos/network-intrusion-detection-mlp.svg',
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
    title: 'Cockpit',
    logo: '/logos/cockpit.svg',
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
    title: 'CI/CD Pipeline Anatomy',
    logo: '/logos/cicd-pipeline-anatomy.svg',
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

const LOGO_LESS_PROJECT_TITLES: string[] = [];
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

  // Handle outside click/tap to close selected project view
  useEffect(() => {
    if (!selectedProject) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (cardRef.current && !cardRef.current.contains(target)) {
        setSelectedProject(null);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [selectedProject]);

  const handleSelect = useCallback((project: Project) => {
    setSelectedProject((prev) => (prev?.title === project.title ? null : project));
  }, []);

  return (
    <div className="relative w-[844px] max-w-full h-[580px] sm:h-[640px]">
      <WorksWheel
        items={PROJECTS}
        onSelect={handleSelect}
        label={`Scroll down to\nexplore each project.`}
        action="View"
      />

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
                ref={cardRef}
                key="project-details-card"
                id="project-details-card"
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-full min-h-0 overflow-y-auto border border-transparent bg-black p-6 sm:p-8 rounded-xl flex flex-col space-y-6 shadow-2xl"
              >
                {/* Header row: project links and close icon aligned in the top-right */}
                <div className="flex items-start justify-end gap-3 sm:gap-4 w-full">
                  {selectedProject.links && selectedProject.links.length > 0 && (
                    <div className="flex items-center justify-end gap-2 flex-wrap min-w-0">
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
                    className="inline-flex items-center justify-center h-[30px] w-[30px] text-zinc-400 hover:text-white bg-transparent border border-white/20 hover:border-white/50 hover:bg-white/5 transition-colors rounded-sm cursor-pointer shrink-0"
                    aria-label="Close project view"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Title */}
                <h3
                  className={`${
                    LOGO_LESS_PROJECT_TITLES.includes(selectedProject.title)
                      ? 'font-jakarta'
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
                ) : selectedProject.title === 'JHusk' ? (
                  <JHuskTimeline scrollerId="project-details-card" />
                ) : (
                  <div className="py-8 sm:py-12 flex items-center justify-center border border-transparent rounded-lg bg-black">
                    {selectedProject.logo ? (
                      <img
                        src={selectedProject.logo}
                        alt={selectedProject.title}
                        className={`object-contain select-none ${
                          LOGO_SCALE_OVERRIDES[selectedProject.title]?.overlay ??
                          DEFAULT_LOGO_SIZE.overlay
                        }`}
                      />
                    ) : (
                      <h4
                        className={`${
                          LOGO_LESS_PROJECT_TITLES.includes(selectedProject.title)
                            ? 'font-jakarta'
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
  );
}
