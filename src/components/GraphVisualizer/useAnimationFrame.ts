import { useEffect } from 'react';

export function useAnimationFrame(callback: (dt: number, t: number) => void, running: boolean): void {
  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number): void => {
      const dt = t - last;
      last = t;
      callback(dt, t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [callback, running]);
}
