import { useState, lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import CustomCursor from './components/CustomCursor';
import HeroBioReveal from './components/HeroBioReveal';
import TechStackFloating from './components/TechStackFloating';
import ProjectsGrid from './components/ProjectsGrid';
import GitHubActivity from './components/GitHubActivity';
import CodingActivity from './components/CodingActivity';
import ContactGrid from './components/ContactGrid';
import AvatarThoughtBubble from './components/AvatarThoughtBubble';

const AvatarModel = lazy(() => import('./components/AvatarModel'));

export default function App() {
  const [activeTechMessage, setActiveTechMessage] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-body">
      <CustomCursor />

      {/* Persistent fixed left sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[28vw] bg-background flex flex-col items-center justify-center overflow-hidden z-20">
        <AvatarThoughtBubble message={activeTechMessage} />
        {/* 3D avatar fills the sidebar */}
        <div className="w-full h-full">
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
                <AvatarModel hasActiveTech={Boolean(activeTechMessage)} />
              </Suspense>
              <OrbitControls enableZoom={false} enablePan={false} enableRotate={true} />
            </Canvas>
          </Suspense>
        </div>

      </aside>

      {/* Right scrollable pane: margin-left 28vw, width 72vw, height 100vh, overflow-y auto */}
      <main
        id="main-scroll-pane"
        className="ml-[28vw] h-screen w-[72vw] overflow-y-auto overflow-x-hidden bg-background"
      >
        {/* Hero section */}
        <section
          id="hero"
          className="min-h-screen pt-[19vh] pb-20 pr-16 pl-12 bg-background"
        >
          <HeroBioReveal />
        </section>

        {/* About section */}
        <section
          id="about"
          className="pt-12 pb-16 px-16 bg-background"
        >
          <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
            About Nikhil Virdi
          </h2>
          <div className="mt-8 max-w-3xl space-y-6">
            <p className="font-outfit text-[22px] font-normal leading-relaxed text-foreground">
              I'm Nikhil, though most people just call me Nik. I grew up in Jammu, Jammu and Kashmir, and I'm now in Bangalore pursuing my degree in Computer Science Engineering, currently in my third year. Java is my favorite programming language by far, and most of my backend work happens in Node.js with Express.js. Frontend has never pulled me in the same way backend has. I also kind of larp having DevOps knowledge, when really it's just Docker, CI/CD pipelines, and Nginx. I'm genuinely interested in system design though, and I enjoy sketching out architecture diagrams on draw.io. Lately, I've been deep in AI engineering, including deep learning, large language models, and generative AI, though core machine learning isn't really my focus.
            </p>
            <p className="font-outfit text-[22px] font-normal leading-relaxed text-foreground">
              Outside of code, I run Riyasat-e-Duggar, a page where I try to show the real side of my motherland, the trans-Himalayan region I come from. I'm 20 as of now, and I run on chai. I genuinely enjoy writing documentation on Notion about whatever I'm learning, it's oddly satisfying. Cricket can keep me talking for hours without my losing interest, and whenever I'm bored, I end up falling down random Wikipedia rabbit holes simply because something caught my curiosity. Everyone says I overcomplain about things, and honestly, they might be right. Jk, I'm a chill human.
            </p>
          </div>
        </section>

        {/* Tech Stack section */}
        <TechStackFloating onActiveMessageChange={setActiveTechMessage} />

        {/* Projects section */}
        <section
          id="projects"
          className="py-16 px-16 bg-background"
        >
          <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground mb-8">
            Projects
          </h2>
          <ProjectsGrid />
        </section>

        {/* GitHub Activity section */}
        <section
          id="github-activity"
          className="py-16 px-16 bg-background"
        >
          <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
            GitHub Activity
          </h1>
          <GitHubActivity />
        </section>

        {/* Coding Activity section */}
        <section
          id="coding-activity"
          className="py-16 px-16 bg-background"
        >
          <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
            Coding Activity
          </h2>
          <CodingActivity />
        </section>

        {/* Contact section */}
        <section
          id="contact"
          className="pt-16 pb-16 px-16 bg-background"
        >
          <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground mb-6">
            Contact
          </h2>
          <ContactGrid />
        </section>
      </main>
    </div>
  );
}
