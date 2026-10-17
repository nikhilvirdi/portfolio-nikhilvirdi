import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RandomMarkdownBlock } from './random-markdown-block';

interface RawTextPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RawTextPanel({ isOpen, onClose }: RawTextPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
            <div className="bg-[#0a0a0c] text-[#f2f2f0] rounded-lg p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
              <RandomMarkdownBlock isOpen={isOpen} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
