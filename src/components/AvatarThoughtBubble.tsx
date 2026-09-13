import { motion, AnimatePresence } from 'framer-motion';

interface AvatarThoughtBubbleProps {
  message: string | null;
}

export default function AvatarThoughtBubble({ message }: AvatarThoughtBubbleProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="avatar-thought-bubble"
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.85 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute top-[5%] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-30 w-[230px] select-none"
        >
          <div className="relative w-full aspect-[250/180] flex items-center justify-center">
            {/* Inline SVG Thought Bubble (Scalloped Cloud Outline + 3 Trailing Circles) */}
            <svg
              viewBox="0 0 250 180"
              className="absolute inset-0 w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
              fill="none"
            >
              {/* Cloud body outline with scalloped rounded lobes */}
              <path
                d="M 76,38 C 95,10 148,8 165,32 C 186,26 210,42 210,62 C 230,70 234,92 218,102 C 218,118 200,132 170,128 C 148,140 106,140 85,130 C 56,138 24,124 30,96 C 16,75 26,44 76,38 Z"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 3 Trailing circles decreasing in size toward avatar head */}
              <ellipse
                cx="140"
                cy="144"
                rx="8"
                ry="7"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              <ellipse
                cx="127"
                cy="158"
                rx="5.8"
                ry="5.2"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              <ellipse
                cx="116"
                cy="169"
                rx="3.8"
                ry="3.4"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
            </svg>

            {/* Centered HTML Message inside cloud body */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-center pointer-events-none z-10 w-[156px] max-w-[70%]"
              style={{ left: '50.4%', top: '42.5%' }}
            >
              <p
                className="w-full block text-center text-white text-xs font-outfit font-medium leading-snug whitespace-normal m-0"
                style={{ textAlign: 'center' }}
              >
                {message}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
