import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const sparksContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = sparksContainerRef.current;
      if (!container) return;

      const x = e.clientX;
      const y = e.clientY;
      const count = Math.floor(Math.random() * 5) + 6; // 6 to 10 particles

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        const size = 8 + Math.random() * 6; // 8px to 14px varied size
        const duration = 400 + Math.random() * 200; // 400ms to 600ms
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 35; // 20px to 55px burst distance
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        particle.style.position = 'fixed';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = '#ffffff';
        particle.style.clipPath =
          'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)';
        particle.style.filter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))';
        particle.style.pointerEvents = 'none';
        particle.style.transform = 'translate(-50%, -50%) scale(1)';
        particle.style.opacity = '1';
        particle.style.zIndex = '99999';
        particle.style.willChange = 'transform, opacity';

        container.appendChild(particle);

        const anim = particle.animate(
          [
            {
              transform: 'translate(-50%, -50%) translate3d(0, 0, 0) scale(1)',
              opacity: 1,
            },
            {
              transform: `translate(-50%, -50%) translate3d(${targetX}px, ${targetY}px, 0) scale(0)`,
              opacity: 0,
            },
          ],
          {
            duration,
            easing: 'cubic-bezier(0.12, 0.8, 0.32, 1)',
            fill: 'forwards',
          }
        );

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          if (particle.parentNode) {
            particle.remove();
          }
        };

        anim.onfinish = cleanup;
        setTimeout(cleanup, duration + 100);
      }
    };

    window.addEventListener('click', handleClick, { capture: true, passive: true });

    const sparksContainer = sparksContainerRef.current;

    return () => {
      window.removeEventListener('click', handleClick, { capture: true });
      if (sparksContainer) {
        sparksContainer.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={sparksContainerRef}
      className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden"
      aria-hidden="true"
    />
  );
}
