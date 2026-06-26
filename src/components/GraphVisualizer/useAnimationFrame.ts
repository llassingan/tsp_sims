/**
 * useAnimationFrame.ts — requestAnimationFrame Hook
 *
 * Provides a declarative rAF loop for canvas rendering. When `running` is
 * true the callback fires every frame with:
 *   - dt: delta time in milliseconds since the previous frame
 *   - t : total elapsed time in milliseconds (DOMHighResTimeStamp style)
 *
 * The effect cleans up by cancelling the animation frame on unmount or when
 * the `running` flag flips to false.
 *
 * @module useAnimationFrame
 */

import { useEffect } from 'react';

/**
 * Runs a callback on every animation frame while `running` is true.
 *
 * @param callback - Invoked each frame with (deltaMs, totalMs).
 * @param running  - When false the loop stops and resources are released.
 */
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
