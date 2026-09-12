import React from 'react';
import { useAnimate } from 'framer-motion';
import { Github, Linkedin, Mail, FileText } from 'lucide-react';
import { SiNpm } from 'react-icons/si';

const NO_CLIP = 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)';
const BOTTOM_RIGHT_CLIP = 'polygon(0 0, 100% 0, 0 0, 0% 100%)';
const TOP_RIGHT_CLIP = 'polygon(0 0, 0 100%, 100% 100%, 0% 100%)';
const BOTTOM_LEFT_CLIP = 'polygon(100% 100%, 100% 0, 100% 100%, 0 100%)';
const TOP_LEFT_CLIP = 'polygon(0 0, 100% 0, 100% 100%, 100% 0)';

const ENTRANCE_KEYFRAMES: Record<string, string[]> = {
  left: [BOTTOM_RIGHT_CLIP, NO_CLIP],
  bottom: [BOTTOM_RIGHT_CLIP, NO_CLIP],
  top: [BOTTOM_RIGHT_CLIP, NO_CLIP],
  right: [TOP_LEFT_CLIP, NO_CLIP],
};

const EXIT_KEYFRAMES: Record<string, string[]> = {
  left: [NO_CLIP, TOP_RIGHT_CLIP],
  bottom: [NO_CLIP, TOP_RIGHT_CLIP],
  top: [NO_CLIP, TOP_RIGHT_CLIP],
  right: [NO_CLIP, BOTTOM_LEFT_CLIP],
};

interface LinkBoxProps {
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
  className?: string;
  style?: React.CSSProperties;
  iconClassName?: string;
}

const LinkBox = ({
  Icon,
  href,
  className,
  style,
  iconClassName = 'text-xs sm:text-sm md:text-base',
}: LinkBoxProps) => {
  const [scope, animate] = useAnimate();

  const getNearestSide = (e: any) => {
    const box = e.target.getBoundingClientRect();

    const proximityToLeft = { proximity: Math.abs(box.left - e.clientX), side: 'left' };
    const proximityToRight = { proximity: Math.abs(box.right - e.clientX), side: 'right' };
    const proximityToTop = { proximity: Math.abs(box.top - e.clientY), side: 'top' };
    const proximityToBottom = { proximity: Math.abs(box.bottom - e.clientY), side: 'bottom' };

    const sortedProximity = [
      proximityToLeft,
      proximityToRight,
      proximityToTop,
      proximityToBottom,
    ].sort((a, b) => a.proximity - b.proximity);

    return sortedProximity[0].side;
  };

  const handleMouseEnter = (e: any) => {
    const side = getNearestSide(e);
    animate(scope.current, { clipPath: ENTRANCE_KEYFRAMES[side] });
  };

  const handleMouseLeave = (e: any) => {
    const side = getNearestSide(e);
    animate(scope.current, { clipPath: EXIT_KEYFRAMES[side] });
  };

  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={style}
    >
      <Icon className={iconClassName} />
      <div
        ref={scope}
        style={{ clipPath: BOTTOM_RIGHT_CLIP }}
        className="absolute inset-0 grid place-content-center bg-white text-black transition-colors duration-300"
      >
        <Icon className={iconClassName} />
      </div>
    </a>
  );
};

const MavenIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/contact/maven.png"
    alt="Maven Central"
    className={`w-[1em] h-[1em] object-contain pointer-events-none inline-block ${className || ''}`}
  />
);

export default function ContactGrid() {
  return (
    <div
      className="w-full border border-white/10 bg-white/10 gap-[1px]"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(3, minmax(45px, auto))',
        gridTemplateAreas: `
          "github github linkedin linkedin"
          "github github email    resume"
          "npm    maven  maven    resume"
        `,
      }}
    >
      <LinkBox
        Icon={Github}
        href="https://github.com/nikhilvirdi"
        style={{ gridArea: 'github' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
        iconClassName="text-base sm:text-lg md:text-xl"
      />
      <LinkBox
        Icon={Linkedin}
        href="https://linkedin.com/in/nikhil-virdi-819nv"
        style={{ gridArea: 'linkedin' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
        iconClassName="text-xs sm:text-sm md:text-base"
      />
      <LinkBox
        Icon={Mail}
        href="mailto:nkvir2468@gmail.com"
        style={{ gridArea: 'email' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
        iconClassName="text-xs sm:text-sm"
      />
      <LinkBox
        Icon={FileText}
        href="https://drive.google.com/file/d/1b5M8mg647Y988meZGTPLvF1MelJrUlLT/view?usp=drive_link"
        style={{ gridArea: 'resume' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
        iconClassName="text-xs sm:text-sm md:text-base"
      />
      <LinkBox
        Icon={SiNpm}
        href="https://www.npmjs.com/~nikhilvirdi"
        style={{ gridArea: 'npm' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
        iconClassName="text-xs sm:text-sm"
      />
      <LinkBox
        Icon={MavenIcon}
        href="https://central.sonatype.com/namespace/io.github.nikhilvirdi"
        style={{ gridArea: 'maven' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
        iconClassName="text-xs sm:text-sm md:text-base"
      />
    </div>
  );
}
