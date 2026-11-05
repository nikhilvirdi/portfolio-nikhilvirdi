import { useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  TECH_SCATTER_DATA,
  TechLogoMarker,
  CustomTooltip,
  BASE_TECH_DEFS,
  type TechDef,
  type TechScatterPoint,
} from './TechStackFloating';

export { BASE_TECH_DEFS, type TechDef };

export default function TechStackMobile() {
  const [activeTech, setActiveTech] = useState<TechScatterPoint | null>(null);

  const handleHover = useCallback((tech: TechScatterPoint | null) => {
    setActiveTech(tech);
  }, []);

  return (
    <section
      id="tech-stack-mobile"
      className="w-full py-12 bg-background font-heading flex flex-col items-center outline-none focus:outline-none"
    >
      <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground mb-6 self-start">
        Tech Stack
      </h2>
      <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none outline-none focus:outline-none select-none">
        <div
          className="w-full min-w-[520px] h-[520px] outline-none focus:outline-none"
          style={{ outline: 'none' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{
                top: 20,
                right: 28,
                bottom: 20,
                left: -10,
              }}
              style={{ outline: 'none', overflow: 'visible' }}
              className="outline-none focus:outline-none overflow-visible"
            >
              <defs>
                <marker
                  id="tech-axis-arrow-mobile-x"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 2 L 7 5 L 0 8 z" fill="#B8B8B8" />
                </marker>
                <marker
                  id="tech-axis-arrow-mobile-y"
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

              <XAxis
                type="number"
                dataKey="x"
                name="X Coordinate"
                domain={[0, 100]}
                axisLine={{
                  stroke: '#B8B8B8',
                  strokeWidth: 1.4,
                  markerEnd: 'url(#tech-axis-arrow-mobile-x)',
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
                  strokeWidth: 1.4,
                  markerStart: 'url(#tech-axis-arrow-mobile-y)',
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
      </div>
    </section>
  );
}
