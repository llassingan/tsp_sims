import { makeGraph, type Graph } from './types';

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

export interface GraphPreset {
  readonly id: string;
  readonly name: string;
  readonly build: () => Graph;
}

export const PRESETS: readonly GraphPreset[] = [
  { id: 'star5', name: '5-node star', build: starGraph5 },
  { id: 'figure8', name: '6-node figure-8', build: figure8Graph6 },
];
