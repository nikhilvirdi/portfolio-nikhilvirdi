import { useState, useRef, useEffect, useCallback } from 'react';

export interface ProjectPetProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  idleSrc?: string;
  greetingSrc?: string;
  cokeSrc?: string;
  // Backward compatibility alias for idleSrc
  spriteSrc?: string;
}

/**
 * Available character sprite sheets:
 * - Original blue-haired character (preserved): '/character/hi.png'
 * - Current character idle pose: '/character/pet.png'
 * - New greeting animation (bald, green-visor): '/character/newHi.png'
 * - Diet Coke drinking animation (bald, green-visor): '/character/coke.png'
 */
export const PET_SPRITES = {
  originalHi: '/character/hi.png',
  idle: '/character/pet.png',
  greeting: '/character/newHi.png',
  coke: '/character/coke.png',
} as const;

type PetAnimationState = 'idle' | 'greeting' | 'drinking';

/**
 * Interactive pixel-art pet character.
 *
 * Behaviors:
 * - Idle: standing pose from pet.png (271.5x724px, 3:8 aspect ratio)
 * - Click/Tap: 8-frame greeting animation from newHi.png (271.5x724px, 3:8 aspect ratio)
 * - Projects entry: 12-frame Diet Coke drinking animation from coke.png (181x724px, 1:4 aspect ratio)
 */
export default function ProjectPet({
  className = '',
  size = 'md',
  onClick,
  idleSrc,
  greetingSrc,
  cokeSrc,
  spriteSrc,
}: ProjectPetProps) {
  const effectiveIdleSrc = idleSrc ?? spriteSrc ?? PET_SPRITES.idle;
  const effectiveGreetingSrc = greetingSrc ?? PET_SPRITES.greeting;
  const effectiveCokeSrc = cokeSrc ?? PET_SPRITES.coke;

  const [animationState, setAnimationState] = useState<PetAnimationState>('idle');
  const [frame, setFrame] = useState<number>(0);

  const currentAnimationRef = useRef<PetAnimationState>('idle');
  const timerRef = useRef<number | null>(null);
  const queuedDrinkRef = useRef<boolean>(false);
  const hasTriggeredProjectsRef = useRef<boolean>(false);

  // Responsive dimensions preserving exact 3:8 aspect ratio for greeting & idle (271.5 / 724)
  // Default 'md':
  // - Desktop (lg): 104px height, 39px width (exact integer ratio 8:3)
  // - Tablet (sm): 80px height, 30px width
  // - Mobile: 64px height, 24px width
  const waveSizeClasses =
    size === 'sm'
      ? 'h-[56px] w-[21px] sm:h-[72px] sm:w-[27px] lg:h-[88px] lg:w-[33px]'
      : size === 'lg'
        ? 'h-[80px] w-[30px] sm:h-[96px] sm:w-[36px] lg:h-[120px] lg:w-[45px]'
        : 'h-[64px] w-[24px] sm:h-[80px] sm:w-[30px] lg:h-[104px] lg:w-[39px]';

  // Responsive dimensions preserving exact 1:4 aspect ratio for drinking (181 / 724)
  // Matches character vertical height and scale without jumping
  const drinkingSizeClasses =
    size === 'sm'
      ? 'h-[56px] w-[14px] sm:h-[72px] sm:w-[18px] lg:h-[88px] lg:w-[22px]'
      : size === 'lg'
        ? 'h-[80px] w-[20px] sm:h-[96px] sm:w-[24px] lg:h-[120px] lg:w-[30px]'
        : 'h-[64px] w-[16px] sm:h-[80px] sm:w-[20px] lg:h-[104px] lg:w-[26px]';

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Preload all sprite sheets for instant, flicker-free playback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const img1 = new Image();
      img1.src = effectiveIdleSrc;
      const img2 = new Image();
      img2.src = effectiveGreetingSrc;
      const img3 = new Image();
      img3.src = effectiveCokeSrc;
    }
  }, [effectiveIdleSrc, effectiveGreetingSrc, effectiveCokeSrc]);

  // Forward ref for playDrink to allow mutual references without circular dependencies
  const playDrinkRef = useRef<() => void>(() => {});

  // Diet Coke drinking animation
  const playDrink = useCallback(() => {
    // If already drinking, do not restart
    if (currentAnimationRef.current === 'drinking') return;

    clearTimer();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      currentAnimationRef.current = 'drinking';
      setAnimationState('drinking');
      setFrame(7); // Drinking pose with raised can
      timerRef.current = window.setTimeout(() => {
        setFrame(0);
        setAnimationState('idle');
        currentAnimationRef.current = 'idle';
        timerRef.current = null;
      }, 800);
      return;
    }

    currentAnimationRef.current = 'drinking';
    setAnimationState('drinking');

    // 12 sequential frames in coke.png
    const sequence = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    let step = 0;

    const nextFrame = () => {
      if (step < sequence.length) {
        const nextF = sequence[step];
        setFrame(nextF);
        step += 1;
        // ~10 fps (100ms per frame), with a slightly longer hold on sip frame 7 (180ms)
        const delay = nextF === 7 ? 180 : 100;
        timerRef.current = window.setTimeout(nextFrame, delay);
      } else {
        // Drinking sequence finished: return cleanly to neutral idle pose
        setFrame(0);
        setAnimationState('idle');
        currentAnimationRef.current = 'idle';
        timerRef.current = null;
      }
    };

    nextFrame();
  }, [clearTimer]);

  playDrinkRef.current = playDrink;

  // Greeting animation using newHi.png (triggered on click or tap)
  const playGreeting = useCallback(() => {
    // If already greeting, do not restart continuously
    if (currentAnimationRef.current === 'greeting') return;

    // If currently drinking, do not interrupt
    if (currentAnimationRef.current === 'drinking') return;

    clearTimer();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      currentAnimationRef.current = 'greeting';
      setAnimationState('greeting');
      setFrame(1);
      timerRef.current = window.setTimeout(() => {
        if (queuedDrinkRef.current) {
          queuedDrinkRef.current = false;
          playDrinkRef.current();
        } else {
          setFrame(0);
          setAnimationState('idle');
          currentAnimationRef.current = 'idle';
          timerRef.current = null;
        }
      }, 600);
      return;
    }

    currentAnimationRef.current = 'greeting';
    setAnimationState('greeting');

    // 8 sequential frames in newHi.png: 0 through 7
    const sequence = [0, 1, 2, 3, 4, 5, 6, 7];
    let step = 0;

    const nextFrame = () => {
      if (step < sequence.length) {
        const nextF = sequence[step];
        setFrame(nextF);
        step += 1;
        timerRef.current = window.setTimeout(nextFrame, 100);
      } else {
        // Greeting finished: check if a drink was queued while greeting was active
        if (queuedDrinkRef.current) {
          queuedDrinkRef.current = false;
          playDrinkRef.current();
        } else {
          setFrame(0);
          setAnimationState('idle');
          currentAnimationRef.current = 'idle';
          timerRef.current = null;
        }
      }
    };

    nextFrame();
  }, [clearTimer]);

  // Trigger drink safely with queue support
  const triggerDrink = useCallback(() => {
    // If currently drinking, do not re-trigger
    if (currentAnimationRef.current === 'drinking') return;

    // If currently greeting, queue the Diet Coke animation to play as soon as greeting finishes
    if (currentAnimationRef.current === 'greeting') {
      queuedDrinkRef.current = true;
      return;
    }

    playDrink();
  }, [playDrink]);

  // Trigger greeting safely (click or tap)
  const triggerGreeting = useCallback(() => {
    // If already greeting, let it complete
    if (currentAnimationRef.current === 'greeting') return;

    // If currently drinking, do not interrupt
    if (currentAnimationRef.current === 'drinking') return;

    playGreeting();
  }, [playGreeting]);

  // IntersectionObserver to detect when the Projects section enters the viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopRoot = document.getElementById('main-scroll-pane');
    const desktopProjects = document.getElementById('projects');
    const mobileProjects = document.getElementById('projects-mobile');

    let observerDesktop: IntersectionObserver | null = null;
    let observerMobile: IntersectionObserver | null = null;

    if (desktopProjects && desktopRoot) {
      observerDesktop = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (!hasTriggeredProjectsRef.current) {
                hasTriggeredProjectsRef.current = true;
                triggerDrink();
              }
            } else {
              // Left the projects section: reset so re-entering will trigger again
              hasTriggeredProjectsRef.current = false;
            }
          }
        },
        {
          root: desktopRoot,
          threshold: 0.15,
        }
      );
      observerDesktop.observe(desktopProjects);
    }

    if (mobileProjects) {
      observerMobile = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (!hasTriggeredProjectsRef.current) {
                hasTriggeredProjectsRef.current = true;
                triggerDrink();
              }
            } else {
              // Left the mobile projects section: reset so re-entering will trigger again
              hasTriggeredProjectsRef.current = false;
            }
          }
        },
        {
          root: null, // viewport for mobile window scroll
          threshold: 0.15,
        }
      );
      observerMobile.observe(mobileProjects);
    }

    return () => {
      observerDesktop?.disconnect();
      observerMobile?.disconnect();
    };
  }, [triggerDrink]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      currentAnimationRef.current = 'idle';
      queuedDrinkRef.current = false;
    };
  }, [clearTimer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      triggerGreeting();
      onClick?.();
    }
  };

  const isDrinking = animationState === 'drinking';
  const isGreeting = animationState === 'greeting';

  // Active sprite sheet and alt text
  const currentSrc = isDrinking
    ? effectiveCokeSrc
    : isGreeting
      ? effectiveGreetingSrc
      : effectiveIdleSrc;

  const currentAlt = isDrinking
    ? 'Pixel-art character drinking Diet Coke'
    : isGreeting
      ? 'Pixel-art character waving hello'
      : 'Pixel-art character standing';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        triggerGreeting();
        onClick?.();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={
        isDrinking
          ? 'Drinking Diet Coke'
          : isGreeting
            ? 'Waving hello'
            : 'Say hi'
      }
      title={
        isDrinking
          ? 'Drinking Diet Coke'
          : isGreeting
            ? 'Waving hello'
            : 'Click to say hi'
      }
      className={`group relative shrink-0 inline-flex items-center justify-center p-0.5 bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded transition-transform active:scale-95 ${waveSizeClasses} ${className}`}
      style={{
        touchAction: 'manipulation',
      }}
    >
      {/* Sprite frame container: clips to exact single-frame aspect ratio */}
      <div
        className={`relative overflow-hidden shrink-0 ${isDrinking ? drinkingSizeClasses : waveSizeClasses}`}
        style={{
          imageRendering: 'pixelated',
          contain: 'paint',
        }}
      >
        <img
          src={currentSrc}
          alt={currentAlt}
          draggable={false}
          className="absolute top-0 left-0 h-full max-w-none select-none pointer-events-none"
          style={{
            // 12 frames for drinking (1200% width), 8 frames for greeting & idle (800% width)
            width: isDrinking ? '1200%' : '800%',
            height: '100%',
            objectFit: 'fill',
            imageRendering: 'pixelated',
            transform: isDrinking
              ? `translateX(-${(frame * 100) / 12}%)`
              : `translateX(-${frame * 12.5}%)`,
            willChange: 'transform',
          }}
        />
      </div>
    </button>
  );
}
