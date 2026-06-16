export interface Node {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface Graph {
  readonly nodes: readonly Node[];
  readonly weights: Float32Array;
  readonly n: number;
  readonly type: 'symmetric' | 'asymmetric';
}

export function cost(g: Graph, from: number, to: number): number {
  const value = g.weights[from * g.n + to];
  return value ?? Number.POSITIVE_INFINITY;
}

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
