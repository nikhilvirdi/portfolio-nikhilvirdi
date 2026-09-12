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

interface Project {
  title: string;
  logo?: string;
  status: ProjectStatus;
  liveUrl?: string;
}

const PROJECTS: Project[] = [
  {
    title: 'RedFlag-CI',
    logo: '/logos/redflag-ci.png',
    status: 'Shipped',
  },
  {
    title: 'JHusk',
    logo: '/logos/jhusk.png',
    status: 'Shipped',
  },
  {
    title: 'ASTRA-NET',
    logo: '/logos/astra-net.png',
    status: 'Live',
    liveUrl: 'https://astra-net-8mu.pages.dev/',
  },
  {
    title: 'Stenod',
    logo: '/logos/stenod.png',
    status: 'In Progress',
  },
  {
    title: 'GridLab',
    logo: '/logos/gridlab.png',
    status: 'Shipped',
    liveUrl: 'https://nikhilvirdi.github.io/GridLab/',
  },
  {
    title: 'Cockpit',
    status: 'Shipped',
  },
  {
    title: 'Network Intrusion Detection MLP',
    status: 'Shipped',
  },
  {
    title: 'CI/CD Pipeline Anatomy',
    status: 'Reference',
    liveUrl: 'https://nikhilvirdi.github.io/Pipeline-Anatomy/',
  },
];

const STATUS_CONFIG: Record<
  ProjectStatus,
  { badge: string; dot: string }
> = {
  Shipped: {
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
    dot: 'bg-accent-green',
  },
  Live: {
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
    dot: 'bg-accent-green',
  },
  'In Progress': {
    badge: 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20',
    dot: 'bg-accent-amber',
  },
  Reference: {
    badge: 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40',
    dot: 'bg-zinc-400',
  },
};

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
      className="absolute top-0 left-0 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden select-none [transform-style:preserve-3d]"
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
        className="absolute inset-0 pointer-events-none rounded-2xl"
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
          <h3 className="font-heading text-lg font-semibold text-foreground text-center px-4 leading-snug select-none">
            {project.title}
          </h3>
        )}
      </div>
    </motion.div>
  );
}

export default function ProjectsGrid() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initial rotation offset of -90 puts JHusk, ASTRA-NET, Stenod in front
  const rotation = useMotionValue(-90);
  const springRotation = useSpring(rotation, {
    stiffness: 100,
    damping: 30,
    mass: 0.1,
  });

  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);

  // Reference cylinderWidth: 1800 desktop / 1100 mobile
  const cylinderWidth = isMobile ? 1100 : 1800;
  const faceCount = PROJECTS.length;
  const faceWidth = cylinderWidth / faceCount; // 225px on desktop, 137.5px on mobile
  const radius = cylinderWidth / (2 * Math.PI); // ~286.5px on desktop, 175px on mobile
  const faceHeight = Math.round(faceWidth * 1.3); // ~293px on desktop (ratio ~1:1.3)

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
    if (selectedProject) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedProject]);

  return (
    <div className="relative w-full py-6 flex flex-col items-center justify-center select-none">
      {/* Outer carousel container with fixed height 420px */}
      <motion.div
        className="relative w-full h-[420px] flex items-center justify-center overflow-hidden [perspective:1000px] cursor-grab active:cursor-grabbing"
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
            {/* Centered Panel */}
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
              className={`w-full ${
                selectedProject.liveUrl ? 'max-w-5xl' : 'max-w-2xl'
              } border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col`}
              style={{ backgroundColor: '#000000' }}
            >
              {/* Header row: project name + existing status badge + live site link */}
              <div className="flex items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
                <div className="flex items-center gap-3.5 flex-wrap">
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    {selectedProject.title}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-tag font-medium ${
                      STATUS_CONFIG[selectedProject.status].badge
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        STATUS_CONFIG[selectedProject.status].dot
                      }`}
                    />
                    {selectedProject.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {selectedProject.liveUrl && (
                    <a
                      href={selectedProject.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-blue text-sm font-tag font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Visit live site ↗
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="text-zinc-400 hover:text-white transition-colors p-1 leading-none text-xl"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              {selectedProject.liveUrl ? (
                /* Live interactive iframe for projects with liveUrl */
                <div className="mt-6 w-full h-[560px] max-h-[65vh] rounded-xl overflow-hidden bg-black border border-zinc-800/80">
                  <iframe
                    src={selectedProject.liveUrl}
                    title={`${selectedProject.title} live application`}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                /* Enlarged logo or title text for projects with no liveUrl */
                <div className="py-16 sm:py-24 flex items-center justify-center">
                  {selectedProject.logo ? (
                    <img
                      src={selectedProject.logo}
                      alt={selectedProject.title}
                      className="max-h-[160px] sm:max-h-[200px] max-w-[80%] object-contain select-none"
                    />
                  ) : (
                    <h4 className="font-heading text-3xl sm:text-4xl font-bold text-foreground text-center px-6 max-w-lg leading-snug">
                      {selectedProject.title}
                    </h4>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
