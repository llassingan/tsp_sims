/**
 * Hardcoded test/benchmark graphs for the TSP Simulator.
 *
 * These are small, hand-constructed graphs designed to exercise specific
 * algorithmic behaviors. Unlike generated graphs (which are random), preset
 * graphs have known optimal solutions and predictable structure, making them
 * ideal for:
 *
 * - **Smoke testing**: Quick verification that algorithms produce correct output.
 * - **Visual debugging**: Fixed layouts make it easy to spot rendering issues.
 * - **Deterministic demos**: Always the same graph, regardless of seed.
 */

import { makeGraph, type Graph } from './types';

/**
 * Builds a 5-node star graph where all leaves connect to a central hub.
 *
 * ## Structure
 *
 * - **Node 0** (center at [0.5, 0.5]): The hub. Weight 1 to/from every leaf.
 * - **Nodes 1-4** (corners at [0,0], [1,0], [1,1], [0,1]): The leaves.
 *   Connected to the center with weight 1, and to each other with weight 10.
 *
 * ## Why this graph?
 *
 * The huge disparity between center-leaf edges (1) and leaf-leaf edges (10)
 * forces optimal algorithms to always enter/exit the cluster through the
 * center. This tests whether an algorithm correctly prioritizes cheap hub
 * edges over expensive leaf-to-leaf shortcuts. The optimal TSP tour is
 * center->leaf (1) then leaf->center (1) between every leaf visit, with
 * no reason to ever pay the 10-cost cross-leaf edge.
 *
 * @returns A 5-node symmetric star graph.
 */
export function starGraph5(): Graph {
  const weights = new Float32Array(25);
  for (let i = 0; i < 25; i++) weights[i] = 0;
  for (let i = 1; i < 5; i++) {
    weights[0 * 5 + i] = 1;
    weights[i * 5 + 0] = 1;
  }
  for (let i = 1; i < 5; i++) {
    for (let j = 1; j < 5; j++) {
      if (i !== j) {
        weights[i * 5 + j] = 10;
      }
    }
  }
  const nodes = [
    { id: 0, x: 0.5, y: 0.5 },
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 1, y: 0 },
    { id: 3, x: 1, y: 1 },
    { id: 4, x: 0, y: 1 },
  ];
  return makeGraph(nodes, weights, 'symmetric');
}

/**
 * Builds a 6-node figure-8 shaped graph for testing.
 *
 * ## Structure
 *
 * The graph is two triangles (0-1-2-3 and 2-4-5) sharing node 2 as a
 * choke point:
 *
 * - **Triangle A**: nodes 0→1 (2), 1→2 (2), 2→3 (2), 3→0 (2)
 * - **Triangle B**: nodes 2→4 (3), 4→5 (3), 5→2 (3)
 * - Edges 2-3 in Triangle A and 2-4 in Triangle B share node 2,
 *   which has degree 4 (two internal + two external connections).
 *
 * ## Why this graph?
 *
 * The shared node (2) forces algorithms to decide how to interleave visits
 * to the two triangles — a classic "merge two subtours" problem that
 * exercises branch-and-bound pruning and DP state transitions. The slightly
 * higher weight (3 vs 2) in Triangle B adds a cost asymmetry that can
 * reveal ordering bugs in tour construction.
 *
 * @returns A 6-node symmetric figure-8 graph.
 */
export function figure8Graph6(): Graph {
  const weights = new Float32Array(36);
  for (let i = 0; i < 36; i++) weights[i] = 0;
  const setEdge = (a: number, b: number, w: number) => {
    weights[a * 6 + b] = w;
    weights[b * 6 + a] = w;
  };
  setEdge(0, 1, 2);
  setEdge(1, 2, 2);
  setEdge(2, 3, 2);
  setEdge(3, 0, 2);
  setEdge(2, 4, 3);
  setEdge(4, 5, 3);
  setEdge(5, 2, 3);
  const nodes = [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 1, y: 0 },
    { id: 2, x: 0.5, y: 0.5 },
    { id: 3, x: 0, y: 1 },
    { id: 4, x: 1, y: 1 },
    { id: 5, x: 1.5, y: 0.5 },
  ];
  return makeGraph(nodes, weights, 'symmetric');
}

/**
 * Descriptor for a preset graph in the UI dropdown.
 *
 * Each preset has a stable `id` (used as the selection key), a human-readable
 * `name`, and a `build` function that constructs the Graph instance.
 */
export interface GraphPreset {
  /** Stable identifier used as the selection key in dropdowns/URLs. */
  readonly id: string;
  /** Human-readable label shown in the preset selector UI. */
  readonly name: string;
  /** Factory function that returns a new Graph instance each call. */
  readonly build: () => Graph;
}

/**
 * Registry of all available preset graphs.
 *
 * Adding a new preset is just a matter of defining its builder function and
 * inserting a descriptor here — the UI dropdown reads this array dynamically.
 */
export const PRESETS: readonly GraphPreset[] = [
  { id: 'star5', name: '5-node star', build: starGraph5 },
  { id: 'figure8', name: '6-node figure-8', build: figure8Graph6 },
];
