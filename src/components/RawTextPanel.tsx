import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RandomMarkdownBlock } from './random-markdown-block';

interface RawTextPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RawTextPanel({ isOpen, onClose }: RawTextPanelProps) {
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3>(1);
  const [showNav, setShowNav] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1);
      setShowNav(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentPage, isOpen]);

  const handlePage1Complete = useCallback(() => {
    setShowNav(true);
  }, []);

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
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1) as 1 | 2 | 3)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    className="text-[#f2f2f0]/70 hover:text-[#f2f2f0] disabled:text-[#f2f2f0]/20 disabled:hover:text-[#f2f2f0]/20 disabled:cursor-default transition-colors text-base sm:text-lg leading-none p-1 focus:outline-none"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(3, p + 1) as 1 | 2 | 3)}
                    disabled={currentPage === 3}
                    aria-label="Next page"
                    className="text-[#f2f2f0]/70 hover:text-[#f2f2f0] disabled:text-[#f2f2f0]/20 disabled:hover:text-[#f2f2f0]/20 disabled:cursor-default transition-colors text-base sm:text-lg leading-none p-1 focus:outline-none"
                  >
                    ›
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              ref={scrollContainerRef}
              className="bg-[#0a0a0c] text-[#f2f2f0] rounded-lg p-4 sm:p-5"
            >
              <RandomMarkdownBlock
                isOpen={isOpen}
                page={currentPage}
                onPage1Complete={handlePage1Complete}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
