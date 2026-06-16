import { useEffect, useMemo, useState } from 'react';
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
import type { Node } from '@/lib/graph/types';

interface PositionedNode extends SimulationNodeDatum {
  id: number;
}

export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

export type Layout = ReadonlyMap<number, NodePosition>;

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

function forceLayout(nodes: ReadonlyArray<Node>, width: number, height: number): Layout {
  const n = nodes.length;
  const simNodes: PositionedNode[] = nodes.map((node) => ({
    id: node.id,
    x: node.x * width,
    y: node.y * height,
  }));
  const byIndex: PositionedNode[] = simNodes;
  const simLinks: SimulationLinkDatum<PositionedNode>[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const source = byIndex[i];
      const target = byIndex[j];
      if (source === undefined || target === undefined) continue;
      simLinks.push({ source, target });
    }
  }
  const sim: Simulation<PositionedNode, undefined> = forceSimulation(simNodes)
    .force('charge', forceManyBody().strength(-Math.min(width, height) * 0.5))
    .force(
      'link',
      forceLink<PositionedNode, SimulationLinkDatum<PositionedNode>>(simLinks)
        .distance(Math.min(width, height) * 0.18)
        .strength(0.3),
    )
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide().radius(Math.min(width, height) * 0.05))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();
  const map = new Map<number, NodePosition>();
  for (const node of simNodes) {
    map.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
  }
  return map;
}

export function useLayout(
  nodes: ReadonlyArray<Node>,
  width: number,
  height: number,
): Layout {
  const [size, setSize] = useState({ w: width, h: height });
  useEffect(() => {
    if (Math.abs(size.w - width) > 8 || Math.abs(size.h - height) > 8) {
      setSize({ w: width, h: height });
    }
  }, [width, height, size]);
  return useMemo(() => {
    if (nodes.length === 0) return new Map();
    if (nodes.length <= 8) return circularLayout(nodes, size.w, size.h);
    return forceLayout(nodes, size.w, size.h);
  }, [nodes, size.w, size.h]);
}
