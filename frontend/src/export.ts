import { graphRoutes, layout, NODE_SIZE } from "./graph";
import type { Point } from "./graph";
import type { Graph } from "./types";

export function download(name: string, type: string, data: string | Blob) {
  const url = URL.createObjectURL(
    data instanceof Blob ? data : new Blob([data], { type }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export function graphSvg(
  graph: Graph,
  positions = layout(graph),
  title = "AutomataLab",
  active: string[] = [],
  activeEdges: string[] = [],
) {
  const points = graph.states.map((s) => positions[s]);
  const routes = graphRoutes(graph, positions);
  const edges = routes.map((route) => route.edge);
  const geometries = routes.map((route) => route.geometry);
  const minX =
    Math.min(
      0,
      ...points.map((p) => p.x),
      ...geometries.map(
        (g, i) => g.label.x - edges[i].labels.join(", ").length * 4.5 - 5,
      ),
    ) - 100;
  const minY =
    Math.min(
      0,
      ...points.map((p) => p.y),
      ...geometries.map((g) => g.label.y),
    ) - 140;
  const width = Math.max(
    title.length * 11 + 60,
    Math.max(
      400,
      ...points.map((p) => p.x + NODE_SIZE),
      ...geometries.map(
        (g, i) => g.label.x + edges[i].labels.join(", ").length * 4.5 + 5,
      ),
    ) -
      minX +
      100,
  );
  const height =
    Math.max(
      160,
      ...points.map((p) => p.y + NODE_SIZE),
      ...geometries.map((g) => g.label.y + 12),
    ) -
    minY +
    80;
  const svgEdges = edges
    .map((e, i) => {
      const geometry = geometries[i];
      const color = e.ids.some((id) => activeEdges.includes(id))
        ? "#477426"
        : "#66716c";
      const labels = e.labels
        .map(
          (label, index) =>
            `<tspan data-transition-id="${escape(e.ids[index])}" fill="${activeEdges.includes(e.ids[index]) ? "#477426" : "#22302a"}">${index ? ", " : ""}${escape(label)}</tspan>`,
        )
        .join("");
      return `<path d="${geometry.path}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arrow)"/><rect x="${geometry.label.x - e.labels.join(", ").length * 4.5 - 5}" y="${geometry.label.y - 12}" width="${e.labels.join(", ").length * 9 + 10}" height="24" rx="5" fill="#f6f8f3"/><text x="${geometry.label.x}" y="${geometry.label.y + 5}" text-anchor="middle" font-size="15">${labels}</text>`;
    })
    .join("");
  const svgNodes = graph.states
    .map((s) => {
      const { x, y } = positions[s];
      const cx = x + NODE_SIZE / 2,
        cy = y + NODE_SIZE / 2;
      return `${s === graph.start ? `<path d="M ${cx - 70} ${cy} L ${cx - 34} ${cy}" stroke="#477426" stroke-width="2" marker-end="url(#arrow)"/>` : ""}<circle cx="${cx}" cy="${cy}" r="29" fill="${active.includes(s) ? "#e0f0ce" : "#fff"}" stroke="#477426" stroke-width="2"/>${graph.accepting.includes(s) ? `<circle cx="${cx}" cy="${cy}" r="23" fill="none" stroke="#477426" stroke-width="1.5"/>` : ""}<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14">${escape(s)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}"><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#f6f8f3"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#66716c"/></marker></defs><g font-family="monospace" fill="#22302a"><text x="${minX + 30}" y="${minY + 35}" font-size="17">${escape(title)}</text>${svgEdges}${svgNodes}</g></svg>`;
}

export async function exportGraph(
  graph: Graph,
  positions: Record<string, Point>,
  format: "svg" | "png",
  title: string,
  active: string[],
  activeEdges: string[],
) {
  const svg = graphSvg(graph, positions, title, active, activeEdges);
  if (format === "svg") {
    download(`${graph.kind}.svg`, "image/svg+xml", svg);
    return;
  }
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(2, 8000 / Math.max(image.width, image.height));
    canvas.width = Math.ceil(image.width * scale);
    canvas.height = Math.ceil(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG export failed"))),
        "image/png",
      ),
    );
    download(`${graph.kind}.png`, "image/png", blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}
