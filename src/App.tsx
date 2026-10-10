import { lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import CustomCursor from './components/CustomCursor';
import HeroBioReveal from './components/HeroBioReveal';
import TechStackFloating from './components/TechStackFloating';
import ProjectsGrid from './components/ProjectsGrid';
import GitHubActivity from './components/GitHubActivity';
import CodingActivity from './components/CodingActivity';
import ContactGrid from './components/ContactGrid';
import TechStackMobile from './components/TechStackMobile';

const AvatarModel = lazy(() => import('./components/AvatarModel'));

export default function App() {
  return (
    <>
      <div className="hidden lg:flex h-screen w-screen overflow-hidden bg-background text-foreground font-body">
        <CustomCursor />

      {/* Persistent fixed left sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[28vw] bg-background flex flex-col items-center justify-center overflow-hidden z-20">
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
                <AvatarModel />
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
              I'm <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#F5D76E] text-[#171717]">Nikhil Virdi</span>, a 20 year old. I'm just a Jammu guy currently living in Bangalore, pursuing <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#7656A5] text-white">Computer Science</span> & Engineering and enjoying the exposure here. I'm more drawn to <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#8B624A] text-white">Backend Development</span>, mainly using <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#166534] text-white">Node.js</span> and <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#FFFFFF] text-[#111111]">Express</span>, and I'm trying to fit <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#2463C5] text-white">Golang</span> into the stack as well, toward the same goal. <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#C83F49] text-white">Java</span> is my primary programming language, mostly because that's what I use for practicing DSA problems. I enjoy <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#596579] text-white">System Design</span>, especially sketching out system architectures, and I've been exploring <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#326CE5] text-white">DevOps</span> along the way. Right now I'm diving into <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#B87543] text-[#171717]">AI Engineering</span>, less into core ML and more into deep learning, GenAI, and LLMs. Frontend doesn't excite me much.
            </p>
            <p className="font-outfit text-[22px] font-normal leading-relaxed text-foreground">
              Outside code, I run{' '}
              <img
                src="/socials/riyasat_e_duggar.svg"
                alt="Riyasat-e-Duggar logo"
                className="inline-block h-[1em] w-[1em] align-[-0.15em] mx-1 object-contain"
              />{' '}
              Riyasat-e-Duggar, a page about the history, culture, and identity of my home region. I document whatever I'm learning on <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#FFFFFF] text-[#171717]">Notion</span> and sometimes <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#24292F] text-[#FFFFFF]">GitHub</span> too, can talk about cricket for hours, and regularly fall into random Wikipedia rabbit holes. I also run on chai and apparently complain about things more than I realize. I'm a chill human, though. Mostly.
            </p>
            <p className="font-outfit text-[22px] font-normal leading-relaxed text-foreground">
              And btw, if you're reading this late at night, there's a good chance I'm in my room, coding something up.
            </p>
          </div>
        </section>

        {/* Tech Stack section */}
        <TechStackFloating />

        {/* Projects section */}
        <section
          id="projects"
          className="pt-16 pb-0 px-16 bg-background"
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

    {/* Mobile layout: sibling tree, visible only below lg */}
    <div className="flex lg:hidden flex-col w-full min-h-screen px-[10%] bg-background text-foreground font-body overflow-x-hidden">
      {/* Hero block: avatar centered on top, heading full-width below */}
      <section
        id="hero-mobile"
        className="w-full pt-8 pb-10 bg-background flex flex-col items-center gap-6"
      >
        <div className="w-full h-[420px] flex items-center justify-center">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center font-tag text-muted text-xs font-medium tracking-widest uppercase">
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
                    <span className="font-tag text-muted text-xs font-medium tracking-widest uppercase">
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
        <div className="w-full">
          <HeroBioReveal isMobile={true} />
        </div>
      </section>

      {/* About section: same content, full width */}
      <section
        id="about-mobile"
        className="py-10 bg-background"
      >
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          About Nikhil Virdi
        </h2>
        <div className="mt-6 space-y-4 max-w-3xl">
          <p className="font-outfit text-base sm:text-lg font-normal leading-relaxed text-foreground">
            I'm <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#F5D76E] text-[#171717]">Nikhil Virdi</span>, a 20 year old. I'm just a Jammu guy currently living in Bangalore, pursuing <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#7656A5] text-white">Computer Science</span> and enjoying the exposure here. I'm more drawn to <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#8B624A] text-white">backend development</span>, mainly using <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#166534] text-white">Node.js</span> and <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#FFFFFF] text-[#111111]">Express</span>, and I'm trying to fit <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#2463C5] text-white">Golang</span> into the stack as well, toward the same goal. <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#C83F49] text-white">Java</span> is my primary programming language, mostly because that's what I use for practicing DSA problems. I enjoy <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#596579] text-white">System Design</span>, especially sketching out system architectures, and I've been exploring <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#326CE5] text-white">DevOps</span> along the way. Right now I'm diving into <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#B87543] text-[#171717]">AI engineering</span>, less into core ML and more into deep learning, GenAI, and LLMs. Frontend doesn't excite me much.
          </p>
          <p className="font-outfit text-base sm:text-lg font-normal leading-relaxed text-foreground">
            Outside code, I run{' '}
            <img
              src="/socials/riyasat_e_duggar.svg"
              alt="Riyasat-e-Duggar logo"
              className="inline-block h-[1em] w-[1em] align-[-0.15em] mx-1 object-contain"
            />{' '}
            Riyasat-e-Duggar, a page about the history, culture, and identity of my home region. I document whatever I'm learning on <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#FFFFFF] text-[#171717]">Notion</span> and sometimes <span className="inline px-1 py-[1px] rounded-[2px] box-decoration-clone [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#24292F] text-[#FFFFFF]">GitHub</span> too, can talk about cricket for hours, and regularly fall into random Wikipedia rabbit holes. I also run on chai and apparently complain about things more than I realize. I'm a chill human, though. Mostly.
          </p>
          <p className="font-outfit text-base sm:text-lg font-normal leading-relaxed text-foreground">
            And btw, if you're reading this late at night, there's a good chance I'm in my room, coding something up.
          </p>
        </div>
      </section>

      {/* Tech Stack section: static responsive grid */}
      <TechStackMobile />

      {/* Projects section: reuse carousel component as-is */}
      <section
        id="projects-mobile"
        className="pt-10 pb-0 bg-background"
      >
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-8">
          Projects
        </h2>
        <ProjectsGrid />
      </section>

      {/* GitHub Activity section */}
      <section
        id="github-activity-mobile"
        className="py-10 bg-background"
      >
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          GitHub Activity
        </h1>
        <div className="overflow-x-auto">
          <GitHubActivity />
        </div>
      </section>

      {/* Coding Activity section */}
      <section
        id="coding-activity-mobile"
        className="py-10 bg-background"
      >
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Coding Activity
        </h2>
        <div className="overflow-x-auto">
          <CodingActivity />
        </div>
      </section>

      {/* Contact section: bento grid */}
      <section
        id="contact-mobile"
        className="pt-10 pb-16 bg-background"
      >
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-6">
          Contact
        </h2>
        <ContactGrid />
      </section>
    </div>
  </>
  );
}
