import React from 'react';
import { useAnimate } from 'framer-motion';
import { Github, Linkedin, Mail, FileText } from 'lucide-react';
import { SiNpm, SiApachemaven } from 'react-icons/si';

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
  iconClassName?: string;
}

const LinkBox = ({ Icon, href, className, iconClassName = 'text-lg sm:text-xl md:text-2xl' }: LinkBoxProps) => {
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

export default function ContactGrid() {
  return (
    <div className="w-full border border-white/10 bg-black">
      {/* Row 1 (2 columns, taller cells) */}
      <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10">
        <LinkBox
          Icon={Github}
          href="https://github.com/nikhilvirdi"
          className="relative grid place-content-center bg-black text-foreground overflow-hidden h-20 sm:h-24 [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
          iconClassName="text-xl sm:text-2xl md:text-[1.65rem]"
        />
        <LinkBox
          Icon={Linkedin}
          href="https://linkedin.com/in/nikhil-virdi-819nv"
          className="relative grid place-content-center bg-black text-foreground overflow-hidden h-20 sm:h-24 [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
          iconClassName="text-xl sm:text-2xl md:text-[1.65rem]"
        />
      </div>

      {/* Row 2 (4 columns) */}
      <div className="grid grid-cols-4 divide-x divide-white/10">
        <LinkBox
          Icon={Mail}
          href="mailto:nkvir2468@gmail.com"
          className="relative grid place-content-center bg-black text-foreground overflow-hidden h-14 sm:h-16 [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
          iconClassName="text-base sm:text-lg md:text-xl"
        />
        <LinkBox
          Icon={FileText}
          href="https://drive.google.com/file/d/1b5M8mg647Y988meZGTPLvF1MelJrUlLT/view?usp=drive_link"
          className="relative grid place-content-center bg-black text-foreground overflow-hidden h-14 sm:h-16 [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
          iconClassName="text-base sm:text-lg md:text-xl"
        />
        <LinkBox
          Icon={SiNpm}
          href="https://www.npmjs.com/~nikhilvirdi"
          className="relative grid place-content-center bg-black text-foreground overflow-hidden h-14 sm:h-16 [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
          iconClassName="text-base sm:text-lg md:text-xl"
        />
        <LinkBox
          Icon={SiApachemaven}
          href="https://central.sonatype.com/namespace/io.github.nikhilvirdi"
          className="relative grid place-content-center bg-black text-foreground overflow-hidden h-14 sm:h-16 [&_svg]:w-[1em] [&_svg]:h-[1em] [&_svg]:pointer-events-none"
          iconClassName="text-base sm:text-lg md:text-xl"
        />
      </div>
    </div>
  );
}
