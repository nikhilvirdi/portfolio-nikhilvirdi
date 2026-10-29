import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RandomMarkdownBlock } from './random-markdown-block';

interface RawTextPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RawTextPanel({ isOpen, onClose }: RawTextPanelProps) {
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [showNav, setShowNav] = useState(false);
  const [page1Height, setPage1Height] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1);
      setShowNav(false);
      setPage1Height(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentPage, isOpen]);

  const handlePage1Complete = useCallback(() => {
    if (scrollContainerRef.current && scrollContainerRef.current.offsetHeight > 0) {
      setPage1Height(scrollContainerRef.current.offsetHeight);
    }
    setShowNav(true);
  }, []);

  // Measure Page 1 height to ensure Page 2 maintains the exact same dimensions
  useEffect(() => {
    if (!isOpen || currentPage !== 1) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el.offsetHeight > 0) {
        setPage1Height(el.offsetHeight);
      }
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, currentPage]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
          {/* Smooth gradual fade to black over 1.25s */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.25, ease: "easeInOut" }}
            className="fixed inset-0 bg-black pointer-events-auto"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            ref={panelRef}
            className="relative w-full max-w-[560px] pointer-events-auto z-10"
            role="dialog"
            aria-modal="true"
            aria-label="Random markdown document"
          >
            {/* Minimal monochrome page navigation chevrons - revealed after Page 1 completes reveal */}
            <AnimatePresence>
              {showNav && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="absolute top-3.5 right-4 sm:top-4 sm:right-5 z-20 flex items-center gap-1 select-none"
                >
                  {currentPage === 2 && (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      aria-label="Previous page"
                      className="text-[#f2f2f0]/70 hover:text-[#f2f2f0] transition-colors text-base sm:text-lg leading-none p-1 focus:outline-none"
                    >
                      ‹
                    </button>
                  )}
                  {currentPage === 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(2)}
                      aria-label="Next page"
                      className="text-[#f2f2f0]/70 hover:text-[#f2f2f0] transition-colors text-base sm:text-lg leading-none p-1 focus:outline-none"
                    >
                      ›
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div
              ref={scrollContainerRef}
              className="bg-[#0a0a0c] text-[#f2f2f0] rounded-lg p-4 sm:p-5 flex flex-col max-h-[85vh] overflow-hidden"
              style={currentPage === 2 && page1Height ? { height: `${page1Height}px` } : undefined}
            >
              <RandomMarkdownBlock
                isOpen={isOpen}
                page={currentPage}
                onPage1Complete={handlePage1Complete}
                className="flex flex-col flex-1 min-h-0"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
