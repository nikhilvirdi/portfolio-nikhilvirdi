let heroProgress = 0;

export function setHeroProgress(p: number) {
  heroProgress = Math.max(0, Math.min(1, p));
  if (typeof window !== 'undefined') {
    (window as any).__heroBioProgress = heroProgress;
  }
}

export function getHeroProgress(): number {
  if (typeof window !== 'undefined' && typeof (window as any).__heroBioProgress === 'number') {
    return (window as any).__heroBioProgress;
  }
  return heroProgress;
}
