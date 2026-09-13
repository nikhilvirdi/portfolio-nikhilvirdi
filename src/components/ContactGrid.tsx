import React from 'react';
import { useAnimate } from 'framer-motion';
import { FileText } from 'lucide-react';

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
  Icon: React.ComponentType;
  HoverIcon?: React.ComponentType;
  href: string;
  className?: string;
  style?: React.CSSProperties;
}

const LinkBox = ({
  Icon,
  HoverIcon,
  href,
  className,
  style,
}: LinkBoxProps) => {
  const [scope, animate] = useAnimate();
  const ActiveHoverIcon = HoverIcon || Icon;

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
      <Icon />
      <div
        ref={scope}
        style={{ clipPath: BOTTOM_RIGHT_CLIP }}
        className="absolute inset-0 grid place-content-center bg-white text-black transition-colors duration-300"
      >
        <ActiveHoverIcon />
      </div>
    </a>
  );
};

const GithubIcon = () => (
  <img
    src="/icons/contact/github.png"
    alt="GitHub"
    loading="eager"
    decoding="async"
    className="h-7 sm:h-8 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

const GithubHoverIcon = () => (
  <img
    src="/icons/contact/github-hover.png"
    alt="GitHub"
    loading="eager"
    decoding="async"
    className="h-7 sm:h-8 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

const LinkedinIcon = () => (
  <img
    src="/icons/contact/linkedin.png"
    alt="LinkedIn"
    loading="eager"
    decoding="async"
    className="h-5 sm:h-6 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

const EmailIcon = () => (
  <img
    src="/icons/contact/email.png"
    alt="Email"
    loading="eager"
    decoding="async"
    className="h-5 sm:h-6 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

const ResumeIcon = () => (
  <FileText className="h-6 w-6 sm:h-7 sm:w-7 pointer-events-none inline-block" />
);

const NpmIcon = () => (
  <img
    src="/icons/contact/npm.png"
    alt="npm"
    loading="eager"
    decoding="async"
    className="h-5 sm:h-6 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

const MavenIcon = () => (
  <img
    src="/icons/contact/maven.svg"
    alt="Maven Central"
    loading="eager"
    decoding="async"
    className="h-5 sm:h-6 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

const LeetcodeIcon = () => (
  <img
    src="/icons/contact/leetcode.png"
    alt="LeetCode"
    loading="eager"
    decoding="async"
    className="h-5 sm:h-6 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

const LeetcodeHoverIcon = () => (
  <img
    src="/icons/contact/leetcode-hover.png"
    alt="LeetCode"
    loading="eager"
    decoding="async"
    className="h-5 sm:h-6 w-auto max-w-[85%] object-contain pointer-events-none inline-block"
  />
);

export default function ContactGrid() {
  return (
    <div
      className="w-[844px] border border-white/10 bg-white/10 gap-[1px]"
      style={{
        width: '844px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(3, minmax(45px, auto))',
        gridTemplateAreas: `
          "github github linkedin linkedin"
          "github github email    resume"
          "npm    maven  leetcode resume"
        `,
      }}
    >
      <LinkBox
        Icon={GithubIcon}
        HoverIcon={GithubHoverIcon}
        href="https://github.com/nikhilvirdi"
        style={{ gridArea: 'github' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full"
      />
      <LinkBox
        Icon={LinkedinIcon}
        href="https://linkedin.com/in/nikhil-virdi-819nv"
        style={{ gridArea: 'linkedin' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full"
      />
      <LinkBox
        Icon={EmailIcon}
        href="mailto:nkvir2468@gmail.com"
        style={{ gridArea: 'email' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full"
      />
      <LinkBox
        Icon={ResumeIcon}
        href="https://drive.google.com/file/d/1b5M8mg647Y988meZGTPLvF1MelJrUlLT/view?usp=drive_link"
        style={{ gridArea: 'resume' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full"
      />
      <LinkBox
        Icon={NpmIcon}
        href="https://www.npmjs.com/~nikhilvirdi"
        style={{ gridArea: 'npm' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full"
      />
      <LinkBox
        Icon={MavenIcon}
        href="https://central.sonatype.com/namespace/io.github.nikhilvirdi"
        style={{ gridArea: 'maven' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full"
      />
      <LinkBox
        Icon={LeetcodeIcon}
        HoverIcon={LeetcodeHoverIcon}
        href="https://leetcode.com/u/nikhilvirdi/"
        style={{ gridArea: 'leetcode' }}
        className="relative grid place-content-center bg-black text-foreground overflow-hidden w-full h-full"
      />
    </div>
  );
}
