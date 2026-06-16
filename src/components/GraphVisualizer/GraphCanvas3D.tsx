import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useSimulationStore } from '@/store/simulationStore';
import { cost, type Graph } from '@/lib/graph/types';
import { useLayout } from './useLayout';

const NODE_COLORS_HEX = {
  default: 0xffffff,
  start: 0xe69f00,
  dest: 0xcc79a7,
  current: 0xfacc15,
  visited: 0xc2410c,
} as const;

const EDGE_COLOR_DEFAULT = 0x9ca3af;
const EDGE_COLOR_CURRENT = 0x2563eb;
const EDGE_COLOR_BEST = 0x059669;
const NODE_RADIUS = 7;
const SPHERE_W_SEG = 16;
const SPHERE_H_SEG = 12;

const NODE_COLORS_CSS = {
  default: { bg: '#ffffff', color: '#111827', border: '#1a1a1a' },
  start: { bg: '#e69f00', color: '#ffffff', border: '#e69f00' },
  dest: { bg: '#cc79a7', color: '#ffffff', border: '#cc79a7' },
  current: { bg: '#facc15', color: '#111827', border: '#facc15' },
  visited: { bg: '#c2410c', color: '#ffffff', border: '#c2410c' },
} as const;

const EDGE_COLORS_CSS = {
  default: '#9ca3af',
  current: '#2563eb',
  best: '#059669',
} as const;

type NodeKind = keyof typeof NODE_COLORS_HEX;

interface NodePos {
  x: number;
  y: number;
  z: number;
}

interface SceneState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  group: THREE.Group;
  sphereGeom: THREE.SphereGeometry;
  sphereMeshes: THREE.Mesh[];
  edgeMeshes: THREE.Line[];
  currentTourLine: THREE.Line | null;
  bestTourObject: THREE.Object3D | null;
  positions: Map<number, NodePos>;
  labelCanvas: HTMLCanvasElement;
  labelCtx: CanvasRenderingContext2D;
}

export function GraphCanvas3D(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
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
  const sceneRef = useRef<SceneState | null>(null);
  const graphRef = useRef(graph);
  const layoutRef = useRef(layout);
  const sizeRef = useRef(size);
  graphRef.current = graph;
  layoutRef.current = layout;
  sizeRef.current = size;

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
    const el = containerRef.current;
    if (!el) return undefined;
    if (size.w === 0 || size.h === 0) return undefined;
    if (sceneRef.current !== null) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglFailed(true);
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(dpr);
    renderer.setSize(size.w, size.h);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const aspect = size.w / size.h;
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 5000);
    const dist = Math.max(size.w, size.h) * 0.95;
    const cx = size.w * 0.5;
    const cy = size.h * 0.5;
    camera.position.set(cx + dist * 0.55, cy + dist * 0.45, dist * 0.75);
    camera.lookAt(cx, cy, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, cy, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 80;
    controls.maxDistance = dist * 4;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.7;
    controls.panSpeed = 0.6;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(dist * 0.6, dist * 0.8, dist * 0.9);
    scene.add(dirLight);
    const rim = new THREE.DirectionalLight(0xffffff, 0.25);
    rim.position.set(-dist * 0.4, -dist * 0.3, dist * 0.5);
    scene.add(rim);

    const sphereGeom = new THREE.SphereGeometry(NODE_RADIUS, SPHERE_W_SEG, SPHERE_H_SEG);
    const group = new THREE.Group();
    scene.add(group);

    const labelCanvas = document.createElement('canvas');
    labelCanvas.style.position = 'absolute';
    labelCanvas.style.top = '0';
    labelCanvas.style.left = '0';
    labelCanvas.style.pointerEvents = 'none';
    labelCanvas.width = Math.floor(size.w * dpr);
    labelCanvas.height = Math.floor(size.h * dpr);
    labelCanvas.style.width = `${size.w}px`;
    labelCanvas.style.height = `${size.h}px`;
    el.appendChild(labelCanvas);
    const labelCtx = labelCanvas.getContext('2d');
    if (labelCtx === null) {
      setWebglFailed(true);
      return;
    }
    labelCtx.scale(dpr, dpr);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      controls,
      group,
      sphereGeom,
      sphereMeshes: [],
      edgeMeshes: [],
      currentTourLine: null,
      bestTourObject: null,
      positions: new Map(),
      labelCanvas,
      labelCtx,
    };

    let raf = 0;
    const tick = (): void => {
      controls.update();
      renderer.render(scene, camera);
      if (sceneRef.current !== null && graphRef.current !== null) {
        drawLabels(sceneRef.current, graphRef.current, sizeRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      sphereGeom.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      el.removeChild(labelCanvas);
      sceneRef.current = null;
    };
  }, [size.w, size.h]);

  useEffect(() => {
    const s = sceneRef.current;
    if (s === null || graph === null) return;
    if (graph.n === 0) return;

    while (s.group.children.length > 0) {
      const obj = s.group.children[0];
      if (obj === undefined) break;
      s.group.remove(obj);
      disposeObject(obj);
    }
    s.sphereMeshes.length = 0;
    s.edgeMeshes.length = 0;
    s.positions.clear();
    s.currentTourLine = null;
    s.bestTourObject = null;

    const layoutNow = layoutRef.current;
    for (let i = 0; i < graph.n; i++) {
      const pos = layoutNow.get(i);
      if (!pos) continue;
      const nodePos: NodePos = { x: pos.x, y: pos.y, z: 0 };
      s.positions.set(i, nodePos);
      const sphere = new THREE.Mesh(
        s.sphereGeom,
        new THREE.MeshLambertMaterial({ color: NODE_COLORS_HEX.default }),
      );
      sphere.position.set(nodePos.x, nodePos.y, nodePos.z);
      s.group.add(sphere);
      s.sphereMeshes.push(sphere);
    }
    for (let i = 0; i < graph.n; i++) {
      for (let j = i + 1; j < graph.n; j++) {
        const a = s.positions.get(i);
        const b = s.positions.get(j);
        if (!a || !b) continue;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]);
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({ color: EDGE_COLOR_DEFAULT });
        const line = new THREE.Line(geom, mat);
        s.group.add(line);
        s.edgeMeshes.push(line);
      }
    }
  }, [graph, layout]);

  useEffect(() => {
    const s = sceneRef.current;
    if (s === null || graph === null) return;
    const n = graph.n;
    const current = currentTour.length > 0 ? currentTour[currentTour.length - 1] ?? -1 : -1;
    for (let i = 0; i < n; i++) {
      const sphere = s.sphereMeshes[i];
      if (sphere === undefined) continue;
      let kind: NodeKind = 'default';
      if (i === current) kind = 'current';
      else if (i === startNode) kind = 'start';
      else if (destNode !== undefined && i === destNode) kind = 'dest';
      else if (visited.has(i)) kind = 'visited';
      const mat = sphere.material as THREE.MeshLambertMaterial;
      mat.color.setHex(NODE_COLORS_HEX[kind]);
      mat.needsUpdate = true;
    }

    if (s.currentTourLine) {
      s.group.remove(s.currentTourLine);
      disposeObject(s.currentTourLine);
      s.currentTourLine = null;
    }
    if (currentTour.length >= 2) {
      const line = buildTourLineFromMap(currentTour, s.positions, EDGE_COLOR_CURRENT);
      if (line) {
        s.group.add(line);
        s.currentTourLine = line;
      }
    }
  }, [currentTour, bestTour, visited, startNode, destNode, graph]);

  useEffect(() => {
    const s = sceneRef.current;
    if (s === null || bestTour === null || bestTour.length < 2) return;
    if (s.positions.size === 0) return;
    if (s.bestTourObject) {
      s.group.remove(s.bestTourObject);
      disposeObject(s.bestTourObject);
      s.bestTourObject = null;
    }
    const tube = buildBestTourTube(bestTour, s.positions, EDGE_COLOR_BEST);
    if (tube) {
      s.group.add(tube);
      s.bestTourObject = tube;
    }
  }, [bestTour, graph, layout]);

  if (webglFailed) {
    return (
      <div
        ref={containerRef}
        className="relative grid h-full w-full place-items-center bg-white text-sm text-gray-500"
      >
        <p>WebGL is not available in this browser. Falling back to 2D view.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white">
      {status === 'idle' || (status === 'ready' && currentTour.length === 0) ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded border border-gray-300 bg-white/90 px-4 py-2 text-sm text-gray-700 shadow-sm">
            Click Start to begin
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildTourLineFromMap(
  tour: readonly number[],
  positions: ReadonlyMap<number, NodePos>,
  color: number,
): THREE.Line | null {
  const pts: number[] = [];
  for (let i = 0; i < tour.length - 1; i++) {
    const a = positions.get(tour[i]!);
    const b = positions.get(tour[i + 1]!);
    if (!a || !b) continue;
    pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  if (pts.length < 6) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 3 });
  return new THREE.Line(geom, mat);
}

const BEST_TUBE_RADIUS = 3.5;
const BEST_TUBE_Z_OFFSET = 2;

function buildBestTourTube(
  tour: readonly number[],
  positions: ReadonlyMap<number, NodePos>,
  color: number,
): THREE.Mesh | null {
  if (tour.length < 2) return null;
  const points: THREE.Vector3[] = [];
  for (const nodeId of tour) {
    if (nodeId === undefined) continue;
    const pos = positions.get(nodeId);
    if (!pos) continue;
    points.push(new THREE.Vector3(pos.x, pos.y, pos.z + BEST_TUBE_Z_OFFSET));
  }
  if (points.length < 2) return null;
  const isCycle = points.length > 2 && points[0]?.equals(points[points.length - 1] ?? new THREE.Vector3());
  const curve = new THREE.CatmullRomCurve3(points, isCycle, 'catmullrom', 0.0);
  const segments = Math.max(64, points.length * 8);
  const geom = new THREE.TubeGeometry(curve, segments, BEST_TUBE_RADIUS, 10, isCycle);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geom, mat);
}

interface NodeStateSnapshot {
  kinds: NodeKind[];
  bestEdgeSet: Set<string>;
}

function snapshotNodeStates(
  graphN: number,
  startNode: number,
  destNode: number | undefined,
  visited: ReadonlySet<number>,
  currentTour: readonly number[],
  bestTour: readonly number[] | null,
): NodeStateSnapshot {
  const current = currentTour.length > 0 ? currentTour[currentTour.length - 1] ?? -1 : -1;
  const kinds: NodeKind[] = new Array<NodeKind>(graphN).fill('default');
  for (let i = 0; i < graphN; i++) {
    if (i === current) kinds[i] = 'current';
    else if (i === startNode) kinds[i] = 'start';
    else if (destNode !== undefined && i === destNode) kinds[i] = 'dest';
    else if (visited.has(i)) kinds[i] = 'visited';
  }
  const bestEdgeSet = new Set<string>();
  if (bestTour) {
    for (let i = 0; i < bestTour.length - 1; i++) {
      const a = bestTour[i];
      const b = bestTour[i + 1];
      if (a === undefined || b === undefined) continue;
      bestEdgeSet.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }
  }
  return { kinds, bestEdgeSet };
}

interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

function projectToScreen(
  camera: THREE.PerspectiveCamera,
  pos: NodePos,
  w: number,
  h: number,
): ProjectedPoint | null {
  const v = new THREE.Vector3(pos.x, pos.y, pos.z);
  v.project(camera);
  if (v.z < -1 || v.z > 1) return null;
  const x = (v.x + 1) * 0.5 * w;
  const y = (1 - v.y) * 0.5 * h;
  return { x, y, depth: v.z };
}

function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  kind: NodeKind,
): void {
  const r = 11;
  const c = NODE_COLORS_CSS[kind];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = c.bg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = c.border;
  ctx.stroke();
  ctx.fillStyle = c.color;
  ctx.font = '600 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 0.5);
}

function drawWeightLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  highlight: boolean,
): void {
  ctx.font = `${highlight ? '600 ' : '500 '}10px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const m = ctx.measureText(text);
  const padX = 4;
  const w = m.width + padX * 2;
  const h = 14;
  const left = x - w / 2;
  const top = y - h / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = highlight ? EDGE_COLORS_CSS.best : 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = highlight ? 1.5 : 1;
  ctx.beginPath();
  ctx.rect(left, top, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = highlight ? EDGE_COLORS_CSS.best : '#111827';
  ctx.fillText(text, x, y + 0.5);
}

interface DrawTask {
  depth: number;
  draw: () => void;
}

function drawLabels(
  s: SceneState,
  graph: Graph,
  size: { w: number; h: number },
): void {
  const ctx = s.labelCtx;
  ctx.clearRect(0, 0, size.w, size.h);
  const state = useSimulationStore.getState();
  const snapshot = snapshotNodeStates(
    graph.n,
    0,
    state.config.problemType === 'path' ? state.config.destinationNode - 1 : undefined,
    state.visitedNodes,
    state.currentTour,
    state.bestTour,
  );

  const tasks: DrawTask[] = [];

  for (let i = 0; i < graph.n; i++) {
    const pos = s.positions.get(i);
    if (!pos) continue;
    const screen = projectToScreen(s.camera, pos, size.w, size.h);
    if (screen === null) continue;
    const kind = snapshot.kinds[i] ?? 'default';
    tasks.push({
      depth: screen.depth,
      draw: () => drawNodeLabel(ctx, screen.x, screen.y, String(i + 1), kind),
    });
  }

  for (let i = 0; i < graph.n; i++) {
    for (let j = i + 1; j < graph.n; j++) {
      const a = s.positions.get(i);
      const b = s.positions.get(j);
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const mz = (a.z + b.z) / 2;
      const screen = projectToScreen(s.camera, { x: mx, y: my, z: mz }, size.w, size.h);
      if (screen === null) continue;
      const w = cost(graph, i, j);
      const text = String(Math.round(w));
      const isBest = snapshot.bestEdgeSet.has(`${i}-${j}`);
      tasks.push({
        depth: screen.depth,
        draw: () => drawWeightLabel(ctx, screen.x, screen.y, text, isBest),
      });
    }
  }

  tasks.sort((a, b) => b.depth - a.depth);
  for (const t of tasks) t.draw();
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry && mesh.geometry !== (obj as unknown as { geometry?: THREE.BufferGeometry }).geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}
