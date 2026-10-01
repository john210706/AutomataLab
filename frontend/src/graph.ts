import dagre from "@dagrejs/dagre";
import type { Graph, Transition } from "./types";

export const NODE_SIZE = 58;
export interface Point {
  x: number;
  y: number;
}
export interface EdgeGroup {
  id: string;
  source: string;
  target: string;
  labels: string[];
  ids: string[];
}

export function layout(graph: Graph): Record<string, Point> {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: "LR",
    nodesep: 55,
    ranksep: graph.kind === "nfa" ? 48 : 80,
    marginx: 40,
    marginy: 65,
  });
  g.setDefaultEdgeLabel(() => ({}));
  graph.states.forEach((id) =>
    g.setNode(id, { width: NODE_SIZE, height: NODE_SIZE }),
  );
  // The shortest-depth skeleton keeps epsilon bypasses from stretching an NFA
  // into one long row. Every actual transition is still drawn by the renderer.
  const depth = new Map<string, number>();
  if (graph.kind === "nfa" && graph.start) {
    depth.set(graph.start, 0);
    const queue = [graph.start];
    const outgoing = new Map<string, string[]>();
    graph.transitions.forEach((e) =>
      outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]),
    );
    for (let i = 0; i < queue.length; i++) {
      for (const target of outgoing.get(queue[i]) ?? []) {
        if (!depth.has(target)) {
          depth.set(target, depth.get(queue[i])! + 1);
          queue.push(target);
        }
      }
    }
  }
  graph.transitions
    .filter(
      (e) =>
        e.source !== e.target &&
        (!depth.size ||
          depth.get(e.target) === (depth.get(e.source) ?? -2) + 1),
    )
    .forEach((e) => g.setEdge(e.source, e.target, {}, e.id));
  dagre.layout(g);
  return Object.fromEntries(
    graph.states.map((id) => [
      id,
      { x: g.node(id).x - NODE_SIZE / 2, y: g.node(id).y - NODE_SIZE / 2 },
    ]),
  );
}

export function groupEdges(transitions: Transition[]): EdgeGroup[] {
  const groups = new Map<string, EdgeGroup>();
  for (const edge of transitions) {
    const key = `${edge.source}-${edge.target}`;
    const group = groups.get(key) ?? {
      id: key,
      source: edge.source,
      target: edge.target,
      labels: [],
      ids: [],
    };
    group.labels.push(edge.symbol ?? "ε");
    group.ids.push(edge.id);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function edgeGeometry(
  source: Point,
  target: Point,
  self: boolean,
  curved: boolean,
  nodes: Point[] = [],
) {
  const r = NODE_SIZE / 2;
  const s = { x: source.x + r, y: source.y + r },
    t = { x: target.x + r, y: target.y + r };
  const obstacles = nodes.filter(
    (p) =>
      !(p.x === source.x && p.y === source.y) &&
      !(p.x === target.x && p.y === target.y),
  );
  if (self) {
    const direction = obstacles.some(
      (p) =>
        Math.abs(p.x - source.x) < NODE_SIZE &&
        p.y < source.y &&
        source.y - p.y < 150,
    )
      ? 1
      : -1;
    const label = { x: s.x, y: s.y + direction * 83 };
    return {
      path: `M ${s.x - 19} ${s.y + direction * 22} C ${s.x - 85} ${s.y + direction * 105}, ${s.x + 85} ${s.y + direction * 105}, ${s.x + 19} ${s.y + direction * 22}`,
      label,
      labelCandidates: [label],
    };
  }
  const dx = t.x - s.x,
    dy = t.y - s.y,
    length = Math.hypot(dx, dy) || 1;
  let bend = curved ? Math.min(110, Math.max(45, length * 0.18)) : 0;
  let bestCollisions = Infinity;
  // ponytail: sample a few curves for bounded classroom graphs; use an obstacle
  // routing engine if dense graphs need guaranteed crossing-free node avoidance.
  for (const candidate of [bend, 90, -90, 170, -170, 260, -260]) {
    const cx = (s.x + t.x) / 2 - (dy / length) * candidate;
    const cy = (s.y + t.y) / 2 + (dx / length) * candidate;
    let collisions = 0;
    for (let sample = 1; sample < 20; sample++) {
      const u = sample / 20;
      const x = (1 - u) ** 2 * s.x + 2 * (1 - u) * u * cx + u ** 2 * t.x;
      const y = (1 - u) ** 2 * s.y + 2 * (1 - u) * u * cy + u ** 2 * t.y;
      for (const p of obstacles) {
        if (Math.hypot(x - p.x - r, y - p.y - r) < r + 12) collisions++;
      }
    }
    if (collisions < bestCollisions) {
      bend = candidate;
      bestCollisions = collisions;
    }
    if (collisions === 0) break;
  }
  const control = {
    x: (s.x + t.x) / 2 - (dy / length) * bend,
    y: (s.y + t.y) / 2 + (dx / length) * bend,
  };
  const sl = Math.hypot(control.x - s.x, control.y - s.y) || 1;
  const tl = Math.hypot(control.x - t.x, control.y - t.y) || 1;
  const start = {
    x: s.x + ((control.x - s.x) / sl) * r,
    y: s.y + ((control.y - s.y) / sl) * r,
  };
  const end = {
    x: t.x + ((control.x - t.x) / tl) * (r + 3),
    y: t.y + ((control.y - t.y) / tl) * (r + 3),
  };
  const labelCandidates = [0.5, 0.35, 0.65, 0.25, 0.75].map((u) => ({
    x: (1 - u) ** 2 * start.x + 2 * (1 - u) * u * control.x + u ** 2 * end.x,
    y: (1 - u) ** 2 * start.y + 2 * (1 - u) * u * control.y + u ** 2 * end.y,
  }));
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    label: labelCandidates[0],
    labelCandidates,
  };
}

export function graphRoutes(graph: Graph, positions: Record<string, Point>) {
  const groups = groupEdges(graph.transitions);
  const points = graph.states.map((id) => positions[id]);
  const labels: { point: Point; width: number }[] = [];
  // Reserve loop labels first; other labels can slide along their actual curves.
  const routes = [...groups]
    .sort(
      (a, b) => Number(b.source === b.target) - Number(a.source === a.target),
    )
    .map((edge) => {
      const geometry = edgeGeometry(
        positions[edge.source],
        positions[edge.target],
        edge.source === edge.target,
        groups.some(
          (other) =>
            other.source === edge.target && other.target === edge.source,
        ),
        points,
      );
      const width = edge.labels.join(", ").length * 9 + 10;
      geometry.label =
        geometry.labelCandidates.find((point) =>
          labels.every(
            (other) =>
              Math.abs(point.x - other.point.x) >
                (width + other.width) / 2 + 8 ||
              Math.abs(point.y - other.point.y) > 24,
          ),
        ) ?? geometry.label;
      labels.push({ point: geometry.label, width });
      return { edge, geometry };
    });
  // Draw loop labels above long return edges that cross the loop's area.
  return routes.sort(
    (a, b) =>
      Number(a.edge.source === a.edge.target) -
      Number(b.edge.source === b.edge.target),
  );
}
