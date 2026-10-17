import { useState, useRef, useEffect, useCallback } from 'react';

export interface ProjectPetProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/**
 * Interactive pixel-art pet character.
 * Uses the 8-frame sequential waving sprite sheet from character/hi.png (2172x724px).
 *
 * Each frame is 271.5px wide and 724px high (exact aspect ratio 3:8).
 * Frame 0: Neutral standing pose (idle)
 * Frame 1: Happy blink
 * Frames 2-7: Waving arm greeting cycle returning to neutral pose
 */
export default function ProjectPet({ className = '', size = 'md', onClick }: ProjectPetProps) {
  const [frame, setFrame] = useState<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Responsive dimensions preserving exact 3:8 aspect ratio (271.5 / 724)
  // Default 'md':
  // - Desktop (lg): 104px height, 39px width (exact integer ratio 8:3, within 90-120px range)
  // - Tablet (sm): 80px height, 30px width
  // - Mobile: 64px height, 24px width
  const sizeClasses =
    size === 'sm'
      ? 'h-[56px] w-[21px] sm:h-[72px] sm:w-[27px] lg:h-[88px] lg:w-[33px]'
      : size === 'lg'
        ? 'h-[80px] w-[30px] sm:h-[96px] sm:w-[36px] lg:h-[120px] lg:w-[45px]'
        : 'h-[64px] w-[24px] sm:h-[80px] sm:w-[30px] lg:h-[104px] lg:w-[39px]';

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playWave = useCallback(() => {
    // If already animating, let the current wave complete
    if (isAnimatingRef.current) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      isAnimatingRef.current = true;
      setFrame(1); // Happy blink pose
      timerRef.current = window.setTimeout(() => {
        setFrame(0);
        isAnimatingRef.current = false;
        timerRef.current = null;
      }, 500);
      return;
    }

    isAnimatingRef.current = true;

    // Sequence of frames to play through: 1 through 7, then back to neutral (0)
    // At ~10 frames per second (100ms per frame)
    const sequence = [1, 2, 3, 4, 5, 6, 7, 0];
    let step = 0;

    const nextFrame = () => {
      if (step < sequence.length) {
        const nextF = sequence[step];
        setFrame(nextF);
        step += 1;
        timerRef.current = window.setTimeout(nextFrame, 100);
      } else {
        // Animation finished cleanly: return to neutral pose
        setFrame(0);
        isAnimatingRef.current = false;
        timerRef.current = null;
      }
    };

    nextFrame();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      isAnimatingRef.current = false;
    };
  }, [clearTimer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      playWave();
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        playWave();
        onClick?.();
      }}
      onMouseEnter={playWave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Say hi"
      title="Say hi"
      className={`group relative shrink-0 inline-flex items-center justify-center p-0.5 bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded transition-transform active:scale-95 ${className}`}
      style={{
        touchAction: 'manipulation',
      }}
    >
      {/* Sprite frame container: clips to exact single-frame aspect ratio */}
      <div
        className={`relative overflow-hidden shrink-0 ${sizeClasses}`}
        style={{
          imageRendering: 'pixelated',
        }}
      >
        <img
          src="/character/hi.png"
          alt="Pixel-art character waving"
          draggable={false}
          className="absolute top-0 left-0 h-full max-w-none select-none pointer-events-none"
          style={{
            // 8 frames horizontally: total width is 800% of container
            width: '800%',
            height: '100%',
            objectFit: 'fill',
            imageRendering: 'pixelated',
            transform: `translateX(-${frame * 12.5}%)`,
            willChange: 'transform',
          }}
        />
      </div>
    </button>
  );
}
