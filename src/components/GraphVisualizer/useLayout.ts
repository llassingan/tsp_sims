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

interface PositionedNode extends SimulationNodeDatum {
  id: number;
}

interface WeightedLink extends SimulationLinkDatum<PositionedNode> {
  weight: number;
}

export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

export type Layout = ReadonlyMap<number, NodePosition>;

function pickWeight(g: Graph, i: number, j: number): number {
  const idx = i * g.n + j;
  return g.weights[idx] ?? 0;
}

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
