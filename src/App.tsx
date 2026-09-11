import { lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import CustomCursor from './components/CustomCursor';
import ScrollIntercept from './components/ScrollIntercept';
import HeroBioReveal from './components/HeroBioReveal';

const AvatarModel = lazy(() => import('./components/AvatarModel'));

export default function App() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <CustomCursor />
      <ScrollIntercept />

      <main className="w-full">
        {/* Hero section */}
        <section
          id="hero"
          className="min-h-screen w-full flex flex-row bg-background"
        >
          {/* Avatar element alongside Hero section content only */}
          <aside className="w-[28vw] h-screen shrink-0 bg-background flex flex-col items-center justify-center overflow-hidden self-start">
            {/* 3D avatar fills most of the sidebar */}
            <div className="flex-1 w-full min-h-0">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center font-tag text-muted text-sm font-medium tracking-widest uppercase">
                    Loading...
                  </div>
                }
              >
                <Canvas
                  className="w-full h-full"
                  camera={{ position: [0, 0, 1.92], fov: 45 }}
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
            </div>
          </aside>

          {/* Hero heading text */}
          <div className="flex-1 pt-[19vh] pb-20 px-16 bg-background">
            <HeroBioReveal />
          </div>
        </section>

        {/* Name tag positioned after Hero and before About */}
        <div className="pt-12 pb-6 px-16 bg-background">
          <span className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Nikhil Virdi
          </span>
        </div>

        {/* About section */}
        <section
          id="about"
          className="py-20 px-16 bg-background"
        >
          <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
            About Nikhil Virdi
          </h2>
          <div className="mt-8 max-w-3xl space-y-6">
            <p className="font-heading text-lg font-normal leading-relaxed text-foreground">
              I'm Nikhil, though most people just call me Nik. I grew up in Jammu, Jammu and Kashmir, and I'm now in Bangalore pursuing my degree in Computer Science Engineering, currently in my third year. Java is my favorite programming language by far, and most of my backend work happens in Node.js with Express.js. Frontend has never pulled me in the same way backend has. I also kind of larp having DevOps knowledge, when really it's just Docker, CI/CD pipelines, and Nginx. I'm genuinely interested in system design though, and I enjoy sketching out architecture diagrams on draw.io. Lately, I've been deep in AI engineering, including deep learning, large language models, and generative AI, though core machine learning isn't really my focus.
            </p>
            <p className="font-heading text-lg font-normal leading-relaxed text-foreground">
              Outside of code, I run Riyasat-e-Duggar, a page where I try to show the real side of my motherland, the trans-Himalayan region I come from. I'm 20 as of now, and I run on chai. I genuinely enjoy writing documentation on Notion about whatever I'm learning, it's oddly satisfying. Cricket can keep me talking for hours without my losing interest, and whenever I'm bored, I end up falling down random Wikipedia rabbit holes simply because something caught my curiosity. Everyone says I overcomplain about things, and honestly, they might be right. Jk, I'm a chill human.
            </p>
          </div>
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
