import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { useLayout, type Layout } from './useLayout';

const COLORS = {
  nodeStroke: '#000000',
  nodeFill: '#FFFFFF',
  start: '#E69F00',
  dest: '#CC79A7',
  defaultEdge: '#999999',
  currentTour: '#56B4E9',
  bestTour: '#009E73',
  explored: '#D55E00',
  pruned: '#777777',
  currentNode: '#F0E442',
  text: '#111111',
};

function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: Array<{ a: number; b: number; color: string; width: number; dash?: number[] }>,
  layout: Layout,
  animated: ReadonlyMap<string, number>,
): void {
  for (const edge of edges) {
    const a = layout.get(edge.a);
    const b = layout.get(edge.b);
    if (!a || !b) continue;
    const key = `${edge.a}-${edge.b}`;
    const animOffset = animated.get(key) ?? 0;
    ctx.save();
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = edge.width;
    if (edge.dash) {
      ctx.setLineDash(edge.dash);
      if (edge.color === COLORS.bestTour) {
        ctx.lineDashOffset = -animOffset;
      }
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  n: number,
  layout: Layout,
  start: number,
  dest: number | undefined,
  current: number | undefined,
  visited: ReadonlySet<number>,
  pulse: number,
): void {
  for (let i = 0; i < n; i++) {
    const pos = layout.get(i);
    if (!pos) continue;
    const isCurrent = i === current;
    const isVisited = visited.has(i);
    const isStart = i === start;
    const isDest = i === dest;
    let fill = COLORS.nodeFill;
    const stroke = COLORS.nodeStroke;
    let radius = 8;
    if (isCurrent) {
      fill = COLORS.currentNode;
      radius = 10;
    } else if (isStart) {
      fill = COLORS.start;
    } else if (isDest) {
      fill = COLORS.dest;
    } else if (isVisited) {
      fill = COLORS.explored;
    }
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (isCurrent) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 4 + Math.sin(pulse) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.currentNode;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), pos.x, pos.y);
  }
}

function buildDefaultEdges(n: number): Array<{
  a: number;
  b: number;
  color: string;
  width: number;
  dash?: number[];
}> {
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      edges.push({ a: i, b: j, color: COLORS.defaultEdge, width: 1, dash: [2, 3] });
    }
  }
  return edges;
}

function drawCurrentTour(
  ctx: CanvasRenderingContext2D,
  currentTour: readonly number[],
  layout: Layout,
): void {
  if (currentTour.length < 2) return;
  for (let i = 0; i < currentTour.length - 1; i++) {
    const a = currentTour[i];
    const b = currentTour[i + 1];
    if (a === undefined || b === undefined) continue;
    drawEdges(ctx, [{ a, b, color: COLORS.currentTour, width: 3 }], layout, new Map());
  }
}

function drawBestTour(
  ctx: CanvasRenderingContext2D,
  bestTour: readonly number[] | null,
  layout: Layout,
  t: number,
): void {
  if (!bestTour || bestTour.length < 2) return;
  const animated = new Map<string, number>();
  const offset = (t / 8) % 16;
  for (let i = 0; i < bestTour.length - 1; i++) {
    const a = bestTour[i];
    const b = bestTour[i + 1];
    if (a === undefined || b === undefined) continue;
    const key = `${a}-${b}`;
    animated.set(key, offset);
    drawEdges(
      ctx,
      [{ a, b, color: COLORS.bestTour, width: 4, dash: [8, 4] }],
      layout,
      animated,
    );
  }
}

function drawIdleText(
  ctx: CanvasRenderingContext2D,
  status: string,
  hasCurrent: boolean,
  w: number,
  h: number,
): void {
  if (status !== 'idle' && !(status === 'ready' && !hasCurrent)) return;
  ctx.save();
  ctx.fillStyle = '#6b7280';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click Start to begin', w / 2, h / 2);
  ctx.restore();
}

function drawCurrentNode(
  currentTour: readonly number[],
): number | undefined {
  return currentTour.length > 0 ? currentTour[currentTour.length - 1] : undefined;
}

export function GraphCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const graph = useSimulationStore((s) => s.graph);
  const startNode = 0;
  const destNodeRaw = useSimulationStore((s) => s.config.destinationNode - 1);
  const destNode = useSimulationStore((s) =>
    s.config.problemType === 'path' ? destNodeRaw : undefined,
  );
  const bestTour = useSimulationStore((s) => s.bestTour);
  const currentTour = useSimulationStore((s) => s.currentTour);
  const visited = useSimulationStore((s) => s.visitedNodes);
  const status = useSimulationStore((s) => s.status);

  const layout = useLayout(graph?.nodes ?? [], Math.max(1, size.w), Math.max(1, size.h));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
  }, [size.w, size.h]);

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      if (!graph) return;
      drawEdges(ctx, buildDefaultEdges(graph.n), layout, new Map());
      drawCurrentTour(ctx, currentTour, layout);
      drawBestTour(ctx, bestTour, layout, t);
      drawNodes(
        ctx,
        graph.n,
        layout,
        startNode,
        destNode,
        drawCurrentNode(currentTour),
        visited,
        t / 200,
      );
      drawIdleText(ctx, status, currentTour.length > 0, size.w, size.h);
    },
    [graph, layout, size.w, size.h, currentTour, bestTour, visited, destNode, status],
  );

  useEffect(() => {
    let raf = 0;
    const tick = (t: number): void => {
      draw(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Graph visualization"
        className="block"
      />
    </div>
  );
}
