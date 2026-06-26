/**
 * useLayout.ts — Force-Directed Graph Layout Hook
 *
 * Computes 2D positions for graph nodes using d3-force. The layout strategy
 * adapts to graph size for visual clarity:
 *
 *   - n = 0             : empty Map (no nodes to position)
 *   - n <= 3            : simple circular layout (no force simulation needed)
 *   - n > 3             : d3-force simulation with:
 *       - forceLink      — edges mapped to distance; weight → distance via
 *                           linear interpolation [minDist, maxDist]
 *       - forceManyBody  — repulsive charge between all node pairs
 *       - forceCenter    — gravity toward canvas center
 *       - forceCollide   — overlap prevention via radius-based collision
 *
 * Edge weights are normalized to a distance range of [basePadding=20px,
 * (basePadding + 0.85 * min(canvas w, h))] so heavier edges pull nodes closer.
 * The simulation runs a fixed 400 ticks for a stable layout; no alpha decay
 * or velocity decay is used since we stop after the tick loop.
 *
 * Returns a memoized Layout (ReadonlyMap<nodeId, {x, y}>) that only
 * recomputes when the graph, width, or height change.
 *
 * @module useLayout
 */

import { useMemo } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { Graph, Node } from '@/lib/graph/types';

/** A d3-force simulation node augmented with a stable integer id. */
interface PositionedNode extends SimulationNodeDatum {
  id: number;
}

/** A d3-force link that carries the graph edge weight for distance mapping. */
interface WeightedLink extends SimulationLinkDatum<PositionedNode> {
  weight: number;
}

/** Screen-space coordinates for a positioned node. */
export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

/** A read-only mapping from node id to its computed 2D position. */
export type Layout = ReadonlyMap<number, NodePosition>;

/** Retrieves the edge weight between nodes i and j from the flat weight matrix. */
function pickWeight(g: Graph, i: number, j: number): number {
  const idx = i * g.n + j;
  return g.weights[idx] ?? 0;
}

/**
 * Route layout computation: empty, circular (n <= 3), or force-directed (n > 3).
 * The zero-width/zero-height guards prevent degenerate force domains.
 */
function buildLayout(
  graph: Graph,
  width: number,
  height: number,
): Layout {
  const n = graph.n;
  if (n === 0) return new Map();
  if (n <= 3) {
    return circularLayout(graph.nodes, width, height);
  }
  return forceLayout(graph, width, height);
}

/**
 * Positions nodes evenly around a circle centered at (cx, cy).
 * Radius is 40% of the smaller canvas dimension. Nodes start from the top
 * (-PI/2) and proceed clockwise.
 */
function circularLayout(nodes: ReadonlyArray<Node>, width: number, height: number): Layout {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;
  const map = new Map<number, NodePosition>();
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    map.set(i, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return map;
}

/**
 * Runs a d3-force simulation to compute a 2D layout.
 *
 * Force configuration:
 *   - Link strength 0.7, distance linearly mapped from weight.
 *   - Many-body charge strength = -0.6 * minDim.
 *   - Collision radius 4% of minDim.
 *   - Center gravity anchors the graph at the canvas midpoint.
 *
 * 400 ticks are applied to reach a stable configuration before returning.
 */
function forceLayout(graph: Graph, width: number, height: number): Layout {
  const n = graph.n;
  const minDim = Math.min(width, height);
  const basePadding = 20;

  let maxWeight = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const w = pickWeight(graph, i, j);
      if (w > maxWeight) maxWeight = w;
    }
  }
  if (maxWeight === 0) maxWeight = 1;

  const minDist = basePadding;
  const maxDist = basePadding + minDim * 0.85;

  const simNodes: PositionedNode[] = graph.nodes.map((node) => ({
    id: node.id,
    x: node.x * width,
    y: node.y * height,
  }));
  const byIndex: PositionedNode[] = simNodes;

  const simLinks: WeightedLink[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const source = byIndex[i];
      const target = byIndex[j];
      if (source === undefined || target === undefined) continue;
      const w = pickWeight(graph, i, j);
      simLinks.push({ source, target, weight: w });
    }
  }

  const sim: Simulation<PositionedNode, undefined> = forceSimulation(simNodes)
    .force('charge', forceManyBody().strength(-minDim * 0.6))
    .force(
      'link',
      forceLink<PositionedNode, WeightedLink>(simLinks)
        .distance((d) => minDist + (d.weight / maxWeight) * (maxDist - minDist))
        .strength(0.7),
    )
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide().radius(minDim * 0.04))
    .stop();

  for (let i = 0; i < 400; i++) sim.tick();

  const map = new Map<number, NodePosition>();
  for (const node of simNodes) {
    map.set(node.id, { x: node.x ?? width / 2, y: node.y ?? height / 2 });
  }
  return map;
}

/**
 * React hook that computes and memoizes the force-directed 2D node layout.
 *
 * @param graph  - The TSP graph (or null when no graph is loaded).
 * @param width  - Canvas width in CSS pixels.
 * @param height - Canvas height in CSS pixels.
 * @returns A read-only Map of node ids to their {x, y} positions.
 */
export function useLayout(
  graph: Graph | null,
  width: number,
  height: number,
): Layout {
  return useMemo(() => {
    if (graph === null) return new Map();
    return buildLayout(graph, Math.max(1, width), Math.max(1, height));
  }, [graph, width, height]);
}
