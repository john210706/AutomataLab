import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { edgeGeometry, graphRoutes, groupEdges, layout } from "../graph";
import { graphSvg } from "../export";
import type { Graph } from "../types";
import { TransitionTable } from "../components/Tables";
import { ErrorNotice } from "../components/common";

const graph: Graph = {
  kind: "dfa",
  alphabet: ["a", "b"],
  states: ["D0", "D1"],
  start: "D0",
  accepting: ["D1"],
  transitions: [
    { id: "e0", source: "D0", target: "D1", symbol: "a" },
    { id: "e1", source: "D0", target: "D1", symbol: "b" },
    { id: "e2", source: "D1", target: "D1", symbol: "a" },
    { id: "e3", source: "D1", target: "D0", symbol: "b" },
  ],
};

it("combines overlapping labels without losing transition identities", () => {
  const edges = groupEdges(graph.transitions);
  expect(edges).toHaveLength(3);
  expect(edges[0]).toMatchObject({ labels: ["a", "b"], ids: ["e0", "e1"] });
});

it("lays out all states and exports the complete graph with accepting circles and a self-loop", () => {
  const positions = layout(graph);
  expect(Object.keys(positions)).toEqual(graph.states);
  const svg = graphSvg(graph, positions, "Pattern <a> & b");
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(document.querySelector("parsererror")).toBeNull();
  expect(document.querySelectorAll("circle")).toHaveLength(3);
  expect(document.documentElement.textContent).toContain("Pattern <a> & b");
  expect(document.documentElement.textContent).toContain("a, b");
  expect(svg).toContain(" C ");
  expect(svg).not.toContain("NaN");
});

it("renders reverse transitions on different curves", () => {
  const a = { x: 0, y: 0 },
    b = { x: 200, y: 0 };
  const forward = edgeGeometry(a, b, false, true);
  const backward = edgeGeometry(b, a, false, true);
  expect(forward.label.y).not.toEqual(backward.label.y);
});

it("routes a long edge around an intervening state", () => {
  const a = { x: 0, y: 0 },
    b = { x: 400, y: 0 },
    middle = { x: 200, y: 0 };
  const direct = edgeGeometry(a, b, false, false);
  const routed = edgeGeometry(a, b, false, false, [a, middle, b]);
  expect(routed.path).not.toEqual(direct.path);
  expect(Math.abs(routed.label.y - (middle.y + 29))).toBeGreaterThan(41);
});

it("exports the consumed symbol separately within a grouped edge", () => {
  const svg = new DOMParser().parseFromString(
    graphSvg(graph, layout(graph), "Test", [], ["e0"]),
    "image/svg+xml",
  );
  expect(
    svg.querySelector('[data-transition-id="e0"]')?.getAttribute("fill"),
  ).toBe("#477426");
  expect(
    svg.querySelector('[data-transition-id="e1"]')?.getAttribute("fill"),
  ).toBe("#22302a");
});

it("keeps the minimal DFA self-loop label separate from its return-edge label", () => {
  const minimal: Graph = {
    kind: "minimized",
    states: ["M0", "M1", "M2"],
    alphabet: ["a", "b"],
    start: "M0",
    accepting: ["M2"],
    transitions: [
      ["M0", "M1", "a"],
      ["M0", "M0", "b"],
      ["M1", "M1", "a"],
      ["M1", "M2", "b"],
      ["M2", "M1", "a"],
      ["M2", "M0", "b"],
    ].map(([source, target, symbol], i) => ({
      id: `e${i}`,
      source,
      target,
      symbol,
    })),
  };
  const routes = graphRoutes(minimal, layout(minimal));
  const loop = routes.find(
    (r) => r.edge.source === "M1" && r.edge.target === "M1",
  )!.geometry.label;
  const back = routes.find(
    (r) => r.edge.source === "M2" && r.edge.target === "M0",
  )!.geometry.label;
  expect(Math.abs(loop.x - back.x) > 27 || Math.abs(loop.y - back.y) > 24).toBe(
    true,
  );
});

it("includes long grouped labels in the exported bounds", () => {
  const transitions = Array.from(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    (symbol, i) => ({ id: `e${i}`, source: "D0", target: "D1", symbol }),
  );
  const svg = new DOMParser().parseFromString(
    graphSvg({ ...graph, transitions }),
    "image/svg+xml",
  );
  const [x, , width] = svg.documentElement
    .getAttribute("viewBox")!
    .split(" ")
    .map(Number);
  const label = [...svg.querySelectorAll("rect")].find(
    (rect) => Number(rect.getAttribute("height")) === 24,
  )!;
  expect(Number(label.getAttribute("x"))).toBeGreaterThanOrEqual(x);
  expect(
    Number(label.getAttribute("x")) + Number(label.getAttribute("width")),
  ).toBeLessThanOrEqual(x + width);
});

it("synchronizes table rows and labels acceptance from the selected snapshot", () => {
  const { rerender } = render(
    <TransitionTable graph={graph} active={["D0"]} />,
  );
  expect(screen.getByText("→ D0").closest("tr")).toHaveClass("active-row");
  expect(screen.getByText("Yes")).toBeInTheDocument();
  rerender(
    <TransitionTable
      graph={{ ...graph, states: ["D0"], transitions: [], accepting: [] }}
      active={[]}
    />,
  );
  expect(screen.queryByText("Yes")).not.toBeInTheDocument();
  expect(screen.queryAllByText("D1")).toHaveLength(0);
});

it("renders useful validation messages with the original character position", () => {
  render(
    <ErrorNotice
      error={{
        code: "invalid_regex",
        message: "Union needs a right operand.",
        position: 1,
      }}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Union needs a right operand.",
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Character 2");
});
