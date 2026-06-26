/**
 * GraphCanvas.tsx — 2D Canvas TSP Graph Visualizer
 *
 * The primary visualization surface for the TSP simulator. Renders the
 * graph as a 2D HTML Canvas with a per-frame draw loop driven by
 * requestAnimationFrame.
 *
 * Visual layers (drawn back-to-front each frame):
 *   1. Default edges     — dashed gray lines for the complete graph skeleton
 *   2. Edge weight labels — numeric weights at edge midpoints; highlighted
 *                           when the edge belongs to the best tour
 *   3. Current tour      — thick solid blue lines showing the solver's
 *                           active exploration path
 *   4. Best tour         — thick dashed green lines with marching-ants
 *                           animation (dash-offset translates over time)
 *   5. Nodes             — filled circles with state-dependent coloring:
 *       - Default  : white fill, dark stroke
 *       - Start    : orange (#E69F00)
 *       - Dest     : pink (#CC79A7)
 *       - Current  : yellow (#FACC15) with animated pulse ring
 *       - Visited  : explored-orange (#C2410C)
 *   6. Idle text        — "Click Start to begin" in idle/ready states
 *
 * Color scheme is the Wong 8-color color-blind safe palette, adapted for
 * TSP semantic roles.
 *
 * Handles HiDPI displays by scaling the canvas buffer to devicePixelRatio
 * while keeping CSS dimensions at 1:1 logical pixels. Canvas size is kept
 * in sync with the container via ResizeObserver.
 *
 * @module GraphCanvas
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { cost, type Graph } from '@/lib/graph/types';
import { useLayout, type Layout } from './useLayout';

/** Wong color-blind safe palette adapted for TSP visualization. */
const COLORS = {
  nodeStroke: '#1a1a1a',
  nodeFill: '#ffffff',
  start: '#E69F00',
  dest: '#CC79A7',
  defaultEdge: '#9ca3af',
  currentTour: '#2563eb',
  bestTour: '#059669',
  explored: '#c2410c',
  pruned: '#6b7280',
  currentNode: '#facc15',
  text: '#111827',
  labelBg: 'rgba(255, 255, 255, 0.92)',
  labelBorder: 'rgba(0, 0, 0, 0.12)',
};

/**
 * Draws a batch of edges with shared styling. Handles dashed lines,
 * animated dash offset (for marching-ants on best-tour edges), and
 * skips edges whose endpoints aren't positioned.
 *
 * @param ctx      - Canvas 2D rendering context.
 * @param edges    - Edge descriptors with endpoint ids, color, width, dash.
 * @param layout   - Node position lookup.
 * @param animated  - Dash-offset overrides per edge key for marching ants.
 */
function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: ReadonlyArray<{ a: number; b: number; color: string; width: number; dash?: number[] }>,
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

/**
 * Draws numeric edge-weight labels at the midpoint of every edge in the
 * complete graph. Labels are drawn as small rectangles with semi-transparent
 * fill for readability. Labels on best-tour edges receive highlight styling.
 *
 * @param ctx        - Canvas 2D rendering context.
 * @param graph      - The graph data (provides edge weights).
 * @param layout     - Node position lookup.
 * @param showLabels - Whether labels should be drawn at all.
 * @param highlight  - Set of edge keys ("i-j") that should be highlighted.
 */
function drawEdgeWeights(
  ctx: CanvasRenderingContext2D,
  graph: Graph,
  layout: Layout,
  showLabels: boolean,
  highlight: ReadonlySet<string>,
): void {
  if (!showLabels) return;
  const n = graph.n;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = layout.get(i);
      const b = layout.get(j);
      if (!a || !b) continue;
      const w = cost(graph, i, j);
      const isHighlight = highlight.has(`${i}-${j}`) || highlight.has(`${j}-${i}`);
      drawWeightLabel(ctx, a, b, w, isHighlight);
    }
  }
}

function drawWeightLabel(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  weight: number,
  highlight: boolean,
): void {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const label = String(Math.round(weight));
  ctx.save();
  ctx.font = `${highlight ? '600 ' : '500 '}10px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(label);
  const padX = 3;
  const w = metrics.width + padX * 2;
  const h = 12;
  ctx.fillStyle = COLORS.labelBg;
  ctx.strokeStyle = highlight ? COLORS.bestTour : COLORS.labelBorder;
  ctx.lineWidth = highlight ? 1.5 : 1;
  ctx.beginPath();
  ctx.rect(mx - w / 2, my - h / 2, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = highlight ? COLORS.bestTour : COLORS.text;
  ctx.fillText(label, mx, my + 0.5);
  ctx.restore();
}

/**
 * Draws all graph nodes as filled circles with optional state-dependent
 * coloring. Each node's label (1-indexed id) is centered inside.
 *
 * Node states (priority order: current > start > dest > visited > default):
 *   - default : white fill, dark stroke
 *   - start   : orange fill, white text
 *   - dest    : pink fill, white text
 *   - current : yellow fill, enlarged radius, pulsing outer ring
 *   - visited : explored-orange fill, white text
 *
 * The pulse ring uses a sinusoidal scale/opacity animation driven by the
 * `pulse` parameter (typically derived from rAF elapsed time).
 *
 * @param n       - Number of nodes in the graph.
 * @param layout  - Node position lookup.
 * @param start   - Index of the start node.
 * @param dest    - Index of the destination node (path mode) or undefined.
 * @param current - Index of the current node (last in the current tour).
 * @param visited - Set of visited node indices.
 * @param pulse   - Phase value for the pulse-ring animation.
 */
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
    let radius = 9;
    if (isCurrent) {
      fill = COLORS.currentNode;
      radius = 11;
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
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = isCurrent || isStart || isDest || isVisited ? '#ffffff' : COLORS.text;
    ctx.font = '600 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), pos.x, pos.y);
  }
}

/**
 * Builds the default edge list for the complete graph skeleton.
 * Every edge is a dashed gray line (color: COLORS.defaultEdge, dash: [2, 3])
 * connecting every pair of nodes (i, j) where i < j.
 *
 * @param n - Number of nodes; returns n*(n-1)/2 edges.
 * @returns Array of edge descriptors with endpoint indices, color, width, dash.
 */
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

/**
 * Draws the current (exploration-in-progress) tour as thick solid blue lines.
 * Each consecutive pair in `currentTour` gets a solid edge in COLORS.currentTour
 * with lineWidth 3.
 *
 * @param currentTour - Ordered node sequence of the active exploration path.
 * @param layout      - Node position lookup.
 */
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

function tourKey(tour: readonly number[] | null, i: number, j: number): string {
  if (tour === null) return '';
  if (tour.length > i + 1 && tour[i] === i && tour[i + 1] === j) return `${i}-${j}`;
  return '';
}

/**
 * Draws the best tour found so far as thick dashed green lines with a
 * marching-ants animation. The dash-offset cycles over time (t/8 % 16)
 * to create a flowing directional effect along the tour edges.
 *
 * Each edge is drawn individually so its animated dash offset propagates
 * correctly. Edges are also added to the `highlight` set so edge-weight
 * labels on the best tour receive highlight styling.
 *
 * @param bestTour  - Best tour node sequence (or null if none found).
 * @param layout    - Node position lookup.
 * @param t         - Elapsed animation time in ms (drives marching ants).
 * @param highlight - Set mutated in-place; best-tour edge keys are added.
 */
function drawBestTour(
  ctx: CanvasRenderingContext2D,
  bestTour: readonly number[] | null,
  layout: Layout,
  t: number,
  highlight: Set<string>,
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
    highlight.add(key);
    drawEdges(
      ctx,
      [{ a, b, color: COLORS.bestTour, width: 4, dash: [8, 4] }],
      layout,
      animated,
    );
  }
}

/**
 * Draws an idle-state message centered on the canvas. Only renders when
 * the simulator is in `idle` status, or `ready` status with no active tour.
 *
 * @param status     - Current simulation status string.
 * @param hasCurrent - Whether the currentTour is non-empty.
 * @param w          - Canvas width in logical pixels.
 * @param h          - Canvas height in logical pixels.
 */
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

function getCurrentNode(currentTour: readonly number[]): number | undefined {
  return currentTour.length > 0 ? currentTour[currentTour.length - 1] : undefined;
}

/**
 * Renders the 2D TSP graph on an HTML Canvas. Sets up a ResizeObserver to
 * track container size, scales the canvas buffer for HiDPI via
 * devicePixelRatio, and runs a per-frame rAF draw loop that composites
 * all visual layers.
 */
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

  const layout = useLayout(graph, Math.max(1, size.w), Math.max(1, size.h));

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
      const highlight = new Set<string>();
      drawEdges(ctx, buildDefaultEdges(graph.n), layout, new Map());
      drawEdgeWeights(ctx, graph, layout, true, highlight);
      drawCurrentTour(ctx, currentTour, layout);
      drawBestTour(ctx, bestTour, layout, t, highlight);
      drawNodes(
        ctx,
        graph.n,
        layout,
        startNode,
        destNode,
        getCurrentNode(currentTour),
        visited,
        t / 200,
      );
      drawIdleText(ctx, status, currentTour.length > 0, size.w, size.h);
      void tourKey;
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
