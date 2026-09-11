import { lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import CustomCursor from './components/CustomCursor';

const AvatarModel = lazy(() => import('./components/AvatarModel'));

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-body">
      <CustomCursor />
      {/* Left region: fixed position, does not scroll, roughly 28% viewport width, full viewport height */}
      <aside className="fixed left-0 top-0 h-screen w-[28vw] bg-background flex items-center justify-center overflow-hidden">
        <Suspense
          fallback={
            <div className="font-tag text-muted text-sm font-medium tracking-widest uppercase">
              Loading...
            </div>
          }
        >
          <Canvas
            className="w-full h-full"
            camera={{ position: [0, 0, 2.5], fov: 45 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <directionalLight position={[-5, 5, -5]} intensity={0.8} />
            <directionalLight position={[0, -5, 2]} intensity={0.4} />
            <Suspense
              fallback={
                <Html center>
                  <span className="font-tag text-muted text-sm font-medium tracking-widest uppercase">
                    Loading...
                  </span>
                </Html>
              }
            >
              <AvatarModel />
            </Suspense>
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={true} />
          </Canvas>
        </Suspense>
      </aside>

      {/* Right region: takes remaining width, full viewport height, scrolls independently */}
      <main className="ml-[28vw] h-screen w-[72vw] overflow-y-auto">
        {/* Hero section */}
        <section
          id="hero"
          className="py-20 px-16 bg-background"
        >
          <div>
            <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
              Nikhil Virdi
            </h1>
            <p>
              Yo gng! I'm Nik. I genuinely can't function without chai. It's less a drink and more a personality trait at this point. I do my best thinking during the kind of sleepless nights most people would call a bad idea. I've built a little watchdog that quietly keeps an eye on pull requests so nothing sketchy slips through unnoticed, a testing library that hunts down bugs I'd never have thought to check for myself, and a live sky companion that tells you what's actually happening in space above you right now. Currently tinkering with a memory tool that helps keep track of what we were even doing mid-project. Outside of building things, I run Riyasat-e-Duggar, where I document the culture and history of the trans-Himalayan region, something I'll call a side chic of mine.
            </p>
          </div>
        </section>

        {/* About section */}
        <section
          id="about"
          className="py-20 px-16 bg-background"
        >
          <p>
            I build backend systems and security tooling — things like a GitHub App that catches risky PR changes before they merge, and a testing library published on Maven Central. DevOps and infra work sit right alongside it.
          </p>
        </section>

        {/* Tech Stack section */}
        <section
          id="tech-stack"
          className="py-20 px-16 bg-background"
        >
          <ul>
            <li>Java</li>
            <li>TypeScript</li>
            <li>Node.js</li>
            <li>Express</li>
            <li>PostgreSQL</li>
            <li>Prisma</li>
            <li>Redis</li>
            <li>Docker</li>
            <li>AWS</li>
            <li>GitHub Actions</li>
            <li>Nginx</li>
          </ul>
        </section>

        {/* Projects section */}
        <section
          id="projects"
          className="py-20 px-16 bg-background"
        >
          <ul>
            <li>RedFlag-CI — GitHub App that scans PRs for risky AI-agent config changes — Shipped</li>
            <li>JHusk — Property-based testing library for Java, published on Maven Central — Shipped</li>
            <li>ASTRA-NET — Real-time sky observation web app — Live</li>
            <li>GridLab — Pathfinding algorithm visualizer, 7 algorithms — Shipped</li>
            <li>Stenod — Local memory daemon for AI coding sessions — In Progress</li>
            <li>Cockpit — Local dev utility for tracking git repo status and service ports — Shipped</li>
            <li>Network Intrusion Detection MLP — PyTorch classifier on NSL-KDD dataset — Shipped</li>
            <li>CI/CD Pipeline Anatomy — Interactive diagram explaining CI/CD pipeline structure — Reference</li>
          </ul>
        </section>

        {/* GitHub Activity section */}
        <section
          id="github-activity"
          className="py-20 px-16 bg-background"
        >
          <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
            GitHub Activity
          </h1>
        </section>

        {/* Contact section */}
        <section
          id="contact"
          className="py-20 px-16 bg-background"
        >
          <ul>
            <li>GitHub: github.com/nikhilvirdi</li>
            <li>LinkedIn: [REPLACE ME]</li>
            <li>Email: [REPLACE ME]</li>
            <li>Resume: [REPLACE ME — link to PDF]</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
