/**
 * Core Graph data model for the TSP Simulator.
 *
 * ## Design decisions
 *
 * - **Float32Array weights**: O(1) indexed access via `from * n + to` row-major
 *   indexing. Much faster than nested arrays or Map<[number,number],number>
 *   for the millions of lookups algorithms perform. Also cache-friendly and
 *   transferable to Web Workers without copying.
 * - **Immutable interfaces**: Node and Graph fields are `readonly`. Graph
 *   instances are created once and never mutated — algorithms work on
 *   temporary state (best tours, DP tables) while the source graph stays
 *   constant. This eliminates a class of bugs and makes Web Worker data
 *   transfer semantics simple.
 * - **Unit-square node layout**: x/y coordinates are normalized to [0,1] so
 *   rendering can scale to any canvas/screen size independently of the
 *   underlying data.
 */

/**
 * A single vertex in the TSP graph.
 *
 * Nodes use 0-indexed integer IDs matching their position in the Graph's
 * `nodes` array. x/y coordinates are normalized to the [0,1] unit square,
 * providing a coordinate system that scales independently of the renderer's
 * viewport dimensions.
 */
export interface Node {
  /** Zero-based index matching position in `Graph.nodes`. */
  readonly id: number;
  /** Horizontal position in [0,1] unit square. */
  readonly x: number;
  /** Vertical position in [0,1] unit square. */
  readonly y: number;
}

/**
 * A complete TSP problem instance — the weighted graph that algorithms solve.
 *
 * Stores nodes (with 2D positions for visualization) and a flat weight matrix
 * in a Float32Array for fast indexed access. The `type` field governs how
 * algorithms interpret the matrix: symmetric graphs store each edge once (in
 * both i→j and j→i slots), while asymmetric graphs may have different weights
 * in each direction.
 */
export interface Graph {
  /** All vertices, ordered by id. */
  readonly nodes: readonly Node[];
  /** Row-major n×n weight matrix. `weights[i*n + j]` is the cost of i→j. */
  readonly weights: Float32Array;
  /** Number of nodes (same as nodes.length, cached for convenience). */
  readonly n: number;
  /** Whether the graph is symmetric (i→j == j→i) or asymmetric. */
  readonly type: 'symmetric' | 'asymmetric';
}

/**
 * O(1) edge-weight lookup with safety for out-of-bounds indices.
 *
 * Performs a direct Float32Array access using row-major indexing. If the
 * computed index is out of range (e.g., from < 0, to >= n), the Float32Array
 * returns `undefined`, and we fall back to Infinity — this makes algorithm
 * inner loops safe without bounds-check branches on every access.
 *
 * @param g - The graph to query.
 * @param from - Source node index.
 * @param to - Destination node index.
 * @returns The edge weight, or Infinity if the indices are invalid.
 */
export function cost(g: Graph, from: number, to: number): number {
  const value = g.weights[from * g.n + to];
  return value ?? Number.POSITIVE_INFINITY;
}

/**
 * Graph factory — constructs an immutable Graph instance.
 *
 * This is the only way to create a Graph; there are no mutating methods.
 * The `n` field is derived from `nodes.length` to ensure consistency
 * (no possibility of mismatch between nodes and n).
 *
 * @param nodes - Ordered array of Node objects (id should match index).
 * @param weights - Pre-populated n×n Float32Array weight matrix.
 * @param type - Whether the graph is symmetric or asymmetric.
 * @returns A new, immutable Graph instance.
 */
export function makeGraph(
  nodes: readonly Node[],
  weights: Float32Array,
  type: 'symmetric' | 'asymmetric',
): Graph {
  return {
    nodes,
    weights,
    n: nodes.length,
    type,
  };
}
