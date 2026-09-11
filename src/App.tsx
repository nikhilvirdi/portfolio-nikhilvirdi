import CustomCursor from './components/CustomCursor';

const SECTIONS = [
  { id: 'hero', name: 'Hero' },
  { id: 'about', name: 'About' },
  { id: 'tech-stack', name: 'Tech Stack' },
  { id: 'projects', name: 'Projects' },
  { id: 'github-activity', name: 'GitHub Activity' },
  { id: 'contact', name: 'Contact' },
] as const;

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-body">
      <CustomCursor />
      {/* Left region: fixed position, does not scroll, roughly 28% viewport width, full viewport height */}
      <aside className="fixed left-0 top-0 h-screen w-[28vw] bg-background flex items-center justify-center border-r border-muted/20">
        <div className="font-tag text-muted text-sm font-medium tracking-widest uppercase">
          AVATAR PLACEHOLDER
        </div>
      </aside>

      {/* Right region: takes remaining width, full viewport height, scrolls independently */}
      <main className="ml-[28vw] h-screen w-[72vw] overflow-y-auto">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="h-screen bg-background flex items-center justify-center border-b border-muted/20"
          >
            <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
              {section.name}
            </h1>
          </section>
        ))}
      </main>
    </div>
  );
}
