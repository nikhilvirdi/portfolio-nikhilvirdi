import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import javaSvg from 'devicon/icons/java/java-original.svg';
import typescriptSvg from 'devicon/icons/typescript/typescript-original.svg';
import javascriptSvg from 'devicon/icons/javascript/javascript-original.svg';
import pythonSvg from 'devicon/icons/python/python-original.svg';
import nodejsSvg from 'devicon/icons/nodejs/nodejs-original.svg';
import postmanSvg from 'devicon/icons/postman/postman-original.svg';
import postgresqlSvg from 'devicon/icons/postgresql/postgresql-original.svg';
import dockerSvg from 'devicon/icons/docker/docker-original.svg';
import nginxSvg from 'devicon/icons/nginx/nginx-original.svg';
import githubactionsSvg from 'devicon/icons/githubactions/githubactions-original.svg';
import gitSvg from 'devicon/icons/git/git-original.svg';
import html5Svg from 'devicon/icons/html5/html5-original.svg';
import css3Svg from 'devicon/icons/css3/css3-original.svg';
import expressSvg from 'devicon/icons/express/express-original.svg';
import prismaSvg from 'devicon/icons/prisma/prisma-original.svg';

export interface TechDef {
  name: string;
  svg: string;
  invert?: boolean;
}

export interface TechScatterPoint {
  id: string;
  name: string;
  svg: string;
  invert?: boolean;
  x: number;
  y: number;
  cluster: string;
  domain: string;
}

// ============================================================================
// Seven Organic Constellation Clusters (Exact 24 Technologies)
// ============================================================================

export const TECH_SCATTER_DATA: TechScatterPoint[] = [
  // --------------------------------------------------------------------------
  // Cluster 1: Programming Languages (Upper-Left Constellation, Center ~ [21, 81])
  // --------------------------------------------------------------------------
  { id: 'c', name: 'C', svg: '/icons/C.webp', x: 13, y: 87, cluster: 'Programming Languages', domain: 'Programming' },
  { id: 'python', name: 'Python', svg: pythonSvg, x: 24, y: 89, cluster: 'Programming Languages', domain: 'Programming' },
  { id: 'java', name: 'Java', svg: javaSvg, x: 15, y: 72, cluster: 'Programming Languages', domain: 'Programming' },
  { id: 'go', name: 'Go', svg: '/logos/golang.png', x: 29, y: 75, cluster: 'Programming Languages', domain: 'Programming' },

  // --------------------------------------------------------------------------
  // Cluster 2: Frontend & Web (Upper-Right Constellation, Center ~ [79, 81])
  // --------------------------------------------------------------------------
  { id: 'html5', name: 'HTML5', svg: html5Svg, x: 71, y: 88, cluster: 'Frontend & Web', domain: 'Frontend' },
  { id: 'css3', name: 'CSS3', svg: css3Svg, x: 85, y: 86, cluster: 'Frontend & Web', domain: 'Frontend' },
  { id: 'javascript', name: 'JavaScript', svg: javascriptSvg, x: 73, y: 75, cluster: 'Frontend & Web', domain: 'Programming' },
  { id: 'typescript', name: 'TypeScript', svg: typescriptSvg, x: 87, y: 73, cluster: 'Frontend & Web', domain: 'Programming' },

  // --------------------------------------------------------------------------
  // Cluster 3: Backend & API Engineering (Central Radial Constellation, Center ~ [38, 45])
  // --------------------------------------------------------------------------
  { id: 'express', name: 'Express', svg: expressSvg, invert: true, x: 36, y: 54, cluster: 'Backend & API Engineering', domain: 'Backend' },
  { id: 'nodejs', name: 'Node.js', svg: nodejsSvg, x: 23, y: 48, cluster: 'Backend & API Engineering', domain: 'Backend' },
  { id: 'prisma', name: 'Prisma', svg: prismaSvg, invert: true, x: 52, y: 51, cluster: 'Backend & API Engineering', domain: 'Database' },
  { id: 'grpc', name: 'gRPC', svg: '/logos/grpc.png', x: 38, y: 44, cluster: 'Backend & API Engineering', domain: 'Backend & API Engineering' },
  { id: 'graphql', name: 'GraphQL', svg: '/logos/graphql.png', x: 26, y: 36, cluster: 'Backend & API Engineering', domain: 'Backend & API Engineering' },
  { id: 'jwt', name: 'JWT', svg: '/icons/jwt.png', x: 50, y: 37, cluster: 'Backend & API Engineering', domain: 'Authentication' },

  // --------------------------------------------------------------------------
  // Cluster 4: Databases & Data Engineering (Right-Middle Constellation, Center ~ [81, 45])
  // --------------------------------------------------------------------------
  { id: 'postgresql', name: 'PostgreSQL', svg: postgresqlSvg, x: 74, y: 47, cluster: 'Databases & Data Engineering', domain: 'Database' },
  { id: 'redis', name: 'Redis', svg: '/logos/redis.png', x: 88, y: 51, cluster: 'Databases & Data Engineering', domain: 'Database' },
  // Temporarily hidden: Apache Kafka logo and label commented out to preserve coordinates and domain metadata
  // { id: 'kafka', name: 'Kafka', svg: '/logos/kafka.png', x: 82, y: 37, cluster: 'Databases & Data Engineering', domain: 'Data Streaming' },

  // --------------------------------------------------------------------------
  // Cluster 5: DevOps & Infrastructure (Lower-Left Constellation, Center ~ [22, 18])
  // --------------------------------------------------------------------------
  { id: 'docker', name: 'Docker', svg: dockerSvg, x: 13, y: 25, cluster: 'DevOps & Infrastructure', domain: 'DevOps' },
  { id: 'nginx', name: 'Nginx', svg: nginxSvg, x: 28, y: 23, cluster: 'DevOps & Infrastructure', domain: 'Infrastructure' },
  { id: 'git', name: 'Git', svg: gitSvg, x: 17, y: 13, cluster: 'DevOps & Infrastructure', domain: 'Version Control' },
  { id: 'githubactions', name: 'GitHub Actions', svg: githubactionsSvg, x: 31, y: 11, cluster: 'DevOps & Infrastructure', domain: 'CI/CD' },

  // --------------------------------------------------------------------------
  // Cluster 6: Testing & API Tooling (Lower-Right Constellation, Center ~ [79, 16])
  // --------------------------------------------------------------------------
  { id: 'jest', name: 'Jest', svg: '/logos/jest.png', x: 72, y: 18, cluster: 'Testing & API Tooling', domain: 'Testing' },
  { id: 'postman', name: 'Postman', svg: postmanSvg, x: 86, y: 15, cluster: 'Testing & API Tooling', domain: 'API Testing' },

  // --------------------------------------------------------------------------
  // Cluster 7: Scientific Computing & AI (Positioned immediately to the right of Python)
  // --------------------------------------------------------------------------
  { id: 'numpy', name: 'NumPy', svg: '/logos/numpy.png', x: 34, y: 87, cluster: 'Scientific Computing & AI', domain: 'Scientific Computing' },
];

export const BASE_TECH_DEFS: TechDef[] = [
  ...TECH_SCATTER_DATA.map((t) => ({
    name: t.name,
    svg: t.svg,
    invert: t.invert,
  })),
  { name: 'Golang', svg: '/logos/golang.png' },
];

// ============================================================================
// Custom Marker Components
// ============================================================================

export interface MarkerProps {
  cx?: number;
  cy?: number;
  payload?: TechScatterPoint;
  activeTechId?: string | null;
  activeCluster?: string | null;
  onHover?: (tech: TechScatterPoint | null) => void;
}

export function TechLogoMarker(props: MarkerProps) {
  const { cx, cy, payload, activeTechId, activeCluster, onHover } = props;

  if (cx === undefined || cy === undefined || !payload) {
    return null;
  }

  const isSelfHovered = activeTechId === payload.id;
  const isSameCluster = activeCluster === payload.cluster;
  const isDimmed = activeCluster !== null && !isSameCluster;

  const size = 30;

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      className="cursor-pointer outline-none focus:outline-none"
      onMouseEnter={() => onHover?.(payload)}
      onMouseLeave={() => onHover?.(null)}
      tabIndex={-1}
      role="button"
      aria-label={`${payload.name} (${payload.domain})`}
      style={{
        outline: 'none',
        opacity: isDimmed ? 0.35 : 1,
        transition: 'opacity 180ms ease',
      }}
    >
      {/* Subtle hover halo */}
      {isSelfHovered && (
        <circle
          cx={0}
          cy={-size / 2}
          r={size * 0.75}
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={1}
        />
      )}

      {/* Technology Logo */}
      <image
        href={payload.svg}
        xlinkHref={payload.svg}
        x={-size / 2}
        y={-size + 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        style={{
          filter: payload.invert ? 'invert(1)' : undefined,
          transition: 'transform 150ms ease',
          transform: isSelfHovered ? 'scale(1.15)' : 'scale(1)',
          transformOrigin: '0px -13px',
          outline: 'none',
        }}
      />

      {/* Technology Name directly beneath logo */}
      <text
        x={0}
        y={14}
        textAnchor="middle"
        fill={isSelfHovered ? '#ffffff' : isSameCluster ? '#e4e4e7' : '#a1a1aa'}
        fontSize={10.5}
        fontWeight={isSelfHovered ? 600 : 500}
        className="font-tag select-none tracking-wide transition-colors duration-150"
      >
        {payload.name}
      </text>
    </g>
  );
}

// ============================================================================
// Redesigned Compact Tooltip
// ============================================================================

export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TechScatterPoint;
  }>;
}

export const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data || !data.domain) return null;

    return (
      <div
        className="flex items-center gap-2.5 rounded border border-white/10 bg-black/95 px-3 py-2 shadow-2xl backdrop-blur-md pointer-events-none font-tag z-50 select-none"
        style={{ outline: 'none' }}
      >
        {/* Small original technology logo */}
        <img
          src={data.svg}
          alt=""
          width={18}
          height={18}
          className={`w-[18px] h-[18px] object-contain shrink-0 ${data.invert ? 'invert' : ''}`}
        />
        {/* Technology Name & Functional Domain */}
        <div className="flex flex-col justify-center leading-tight">
          <span className="text-[12px] font-semibold text-white tracking-wide">
            {data.name}
          </span>
          <span className="text-[10px] text-zinc-400 font-normal mt-0.5 tracking-normal">
            {data.domain}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// ============================================================================
// TechStackFloating Component
// ============================================================================

export default function TechStackFloating() {
  const [activeTech, setActiveTech] = useState<TechScatterPoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const stripSvgFocus = () => {
      const svgs = el.querySelectorAll('svg');
      svgs.forEach((svg) => {
        if (svg.getAttribute('tabindex') === '0') {
          svg.setAttribute('tabindex', '-1');
        }
      });
    };
    stripSvgFocus();
    const observer = new MutationObserver(stripSvgFocus);
    observer.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['tabindex'] });
    return () => observer.disconnect();
  }, []);

  const handleHover = useCallback((tech: TechScatterPoint | null) => {
    setActiveTech(tech);
  }, []);

  return (
    <section
      id="tech-stack"
      className="py-16 px-16 bg-background font-heading outline-none focus:outline-none"
    >
      <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
        Tech Stack
      </h2>
      <div
        ref={containerRef}
        className="relative w-[844px] max-w-full h-[600px] mt-8 bg-background outline-none focus:outline-none select-none"
        style={{ width: '844px', maxWidth: '100%', height: '600px', outline: 'none' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            tabIndex={-1}
            margin={{
              top: 24,
              right: 34,
              bottom: 20,
              left: -10,
            }}
            style={{ outline: 'none', overflow: 'visible' }}
            className="outline-none focus:outline-none overflow-visible"
          >
            <defs>
              {/* Arrowhead marker for positive X-axis (rightmost endpoint) */}
              <marker
                id="tech-axis-arrow-x"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 2 L 7 5 L 0 8 z" fill="#B8B8B8" />
              </marker>

              {/* Arrowhead marker for positive Y-axis (topmost endpoint) */}
              <marker
                id="tech-axis-arrow-y"
                viewBox="0 0 10 10"
                refX="1"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 7 2 L 0 5 L 7 8 z" fill="#B8B8B8" />
              </marker>
            </defs>

            {/* Note: CartesianGrid is omitted per visual design requirements */}
            <XAxis
              type="number"
              dataKey="x"
              name="X Coordinate"
              domain={[0, 100]}
              axisLine={{
                stroke: '#B8B8B8',
                strokeWidth: 2.8,
                markerEnd: 'url(#tech-axis-arrow-x)',
              }}
              tickLine={false}
              tick={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Y Coordinate"
              width={10}
              domain={[0, 100]}
              axisLine={{
                stroke: '#B8B8B8',
                strokeWidth: 2.8,
                markerStart: 'url(#tech-axis-arrow-y)',
              }}
              tickLine={false}
              tick={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />

            {/* Technology Scatter Points — Organic Constellations */}
            <Scatter
              name="Technologies"
              data={TECH_SCATTER_DATA}
              shape={
                <TechLogoMarker
                  activeTechId={activeTech?.id ?? null}
                  activeCluster={activeTech?.cluster ?? null}
                  onHover={handleHover}
                />
              }
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
