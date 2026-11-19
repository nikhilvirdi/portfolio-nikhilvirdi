import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScreenshotItem {
  src: string;
  title: string;
  shortLabel: string;
  description: string;
}

const SCREENSHOTS: ScreenshotItem[] = [
  {
    src: '/projects/retroamp98/photo-left.png',
    title: 'Main Player & Playlist',
    shortLabel: 'Player View',
    description: 'Nostalgic desktop media player interface with album art, track details, and active playlist',
  },
  {
    src: '/projects/retroamp98/photo-right.png',
    title: 'Options & Playlist Management',
    shortLabel: 'Context Menu',
    description: 'Contextual menu for importing audio files and folders, loading/saving M3U playlists, and playback actions',
  },
];

export default function RetroAmpGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');
  const touchStartX = useRef<number | null>(null);

  const nextScreenshot = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SCREENSHOTS.length);
  }, []);

  const prevScreenshot = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);
  }, []);

  // Keyboard navigation for arrow keys when viewing gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextScreenshot();
      } else if (e.key === 'ArrowLeft') {
        prevScreenshot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextScreenshot, prevScreenshot]);

  // Touch swipe support for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextScreenshot();
      } else {
        prevScreenshot();
      }
    }
    touchStartX.current = null;
  };

  const activeItem = SCREENSHOTS[activeIndex];

  return (
    <div className="w-full shrink-0 flex flex-col border border-white/10 rounded-lg bg-zinc-950/90 overflow-hidden select-none">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-white/10 bg-black/60 flex-wrap gap-2">
        {/* View switcher tabs */}
        <div className="flex items-center gap-1.5">
          {SCREENSHOTS.map((item, idx) => {
            const isActive = viewMode === 'single' && activeIndex === idx;
            return (
              <button
                key={item.shortLabel}
                type="button"
                onClick={() => {
                  setViewMode('single');
                  setActiveIndex(idx);
                }}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white border border-white/30 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                }`}
                aria-label={`Switch to ${item.shortLabel}`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Right side controls: Side-by-side mode toggle (desktop) and index indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'single' ? 'compare' : 'single'))}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-white bg-transparent border border-white/15 hover:border-white/30 rounded transition-colors"
            title="Toggle between single focused view and side-by-side comparison"
          >
            <span>{viewMode === 'single' ? 'Side by Side' : 'Focus View'}</span>
          </button>

          <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {activeIndex + 1} / {SCREENSHOTS.length}
          </span>
        </div>
      </div>

      {/* Main preview stage */}
      {viewMode === 'single' ? (
        <div
          className="relative w-full flex flex-col items-center justify-center p-3 sm:p-5 min-h-[360px] sm:min-h-[460px] bg-black/40 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Previous Button */}
          <button
            type="button"
            onClick={prevScreenshot}
            className="absolute left-2 sm:left-4 z-10 p-2 text-zinc-400 hover:text-white bg-black/60 hover:bg-black/90 border border-white/20 hover:border-white/50 rounded-full transition-all cursor-pointer backdrop-blur-sm"
            aria-label="Previous screenshot"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Screenshot Display */}
          <div className="relative flex items-center justify-center max-h-[340px] sm:max-h-[440px] w-full">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeItem.src}
                src={activeItem.src}
                alt={activeItem.title}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="max-h-[340px] sm:max-h-[440px] w-auto max-w-full object-contain rounded shadow-2xl border border-white/10"
              />
            </AnimatePresence>
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={nextScreenshot}
            className="absolute right-2 sm:right-4 z-10 p-2 text-zinc-400 hover:text-white bg-black/60 hover:bg-black/90 border border-white/20 hover:border-white/50 rounded-full transition-all cursor-pointer backdrop-blur-sm"
            aria-label="Next screenshot"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      ) : (
        /* Side by side comparison view on wider screens */
        <div className="w-full grid grid-cols-2 gap-4 p-4 sm:p-6 bg-black/40 min-h-[360px] sm:min-h-[460px] items-center justify-items-center">
          {SCREENSHOTS.map((item, idx) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                setViewMode('single');
                setActiveIndex(idx);
              }}
              className="group flex flex-col items-center gap-2 p-2 rounded-lg border border-white/10 hover:border-white/40 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer"
              title="Click to focus this screenshot"
            >
              <div className="flex items-center justify-between w-full px-2 text-[11px] font-mono text-zinc-400 group-hover:text-white">
                <span>{item.shortLabel}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-400">
                  Click to focus
                </span>
              </div>
              <img
                src={item.src}
                alt={item.title}
                className="max-h-[300px] sm:max-h-[380px] w-auto object-contain rounded border border-white/10 group-hover:border-white/30 transition-all"
              />
            </button>
          ))}
        </div>
      )}

      {/* Caption & Thumbnail footer */}
      <div className="px-3 sm:px-4 py-3 border-t border-white/10 bg-black/70 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Caption text */}
        <div className="text-center sm:text-left min-w-0 flex-1">
          <p className="text-xs font-mono text-white/90 font-medium">
            {activeItem.title}
          </p>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-snug">
            {activeItem.description}
          </p>
        </div>

        {/* Thumbnail buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {SCREENSHOTS.map((item, idx) => {
            const isSelected = activeIndex === idx && viewMode === 'single';
            return (
              <button
                key={item.src}
                type="button"
                onClick={() => {
                  setViewMode('single');
                  setActiveIndex(idx);
                }}
                className={`relative rounded overflow-hidden border transition-all cursor-pointer h-12 w-auto aspect-[526/737] ${
                  isSelected
                    ? 'border-white ring-1 ring-white/50 scale-105 opacity-100'
                    : 'border-white/20 opacity-50 hover:opacity-90 hover:border-white/40'
                }`}
                aria-label={`Thumbnail ${idx + 1}: ${item.shortLabel}`}
              >
                <img
                  src={item.src}
                  alt={item.shortLabel}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
