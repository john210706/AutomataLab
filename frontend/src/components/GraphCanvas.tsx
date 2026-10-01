import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeText,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type {
  Edge,
  EdgeProps,
  Node,
  NodeChange,
  NodeProps,
} from "@xyflow/react";
import { Download, Expand, Maximize, RotateCcw, X } from "lucide-react";
import { graphRoutes, layout, NODE_SIZE } from "../graph";
import type { Point } from "../graph";
import { download, exportGraph } from "../export";
import type { Graph } from "../types";
import { setText } from "../types";
import { partitionColors } from "./Inspector";

type StateNode = Node<
  {
    label: string;
    initial: boolean;
    accepting: boolean;
    active: boolean;
    fresh: boolean;
    color?: string;
  },
  "state"
>;
type AutomataEdge = Edge<
  {
    labels: string[];
    activeLabels: boolean[];
    ids: string[];
    active: boolean;
    geometry: ReturnType<typeof graphRoutes>[number]["geometry"];
  },
  "automata"
>;

const StateCircle = memo(function StateCircle({
  data,
  selected,
}: NodeProps<StateNode>) {
  return (
    <div
      className={`state-node ${data.accepting ? "accepting" : ""} ${data.active ? "active" : ""} ${data.fresh ? "fresh" : ""} ${selected ? "selected" : ""}`}
      style={
        data.color
          ? ({ "--state-color": data.color } as React.CSSProperties)
          : undefined
      }
    >
      {data.initial && (
        <svg
          className="initial-arrow"
          viewBox="0 0 38 16"
          aria-label="Initial state"
        >
          <path d="M0 8H31M24 2L31 8L24 14" />
        </svg>
      )}
      <Handle type="target" position={Position.Left} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const AutomataLine = memo(function AutomataLine({
  id,
  data,
}: EdgeProps<AutomataEdge>) {
  const uniqueId = useId();
  if (!data) return null;
  const { geometry } = data;
  const color = data.active ? "var(--accent)" : "var(--graph-edge)";
  const markerId = `arrow-${uniqueId}`;
  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={geometry.path}
        markerEnd={`url(#${markerId})`}
        style={{ stroke: color, strokeWidth: data.active ? 2.6 : 1.6 }}
      />
      <EdgeText
        x={geometry.label.x}
        y={geometry.label.y}
        label={
          <>
            {data.labels.map((label, i) => (
              <tspan
                key={data.ids[i]}
                data-transition-id={data.ids[i]}
                data-active={data.activeLabels[i]}
                fill={data.activeLabels[i] ? "var(--accent)" : "var(--text)"}
              >
                {i ? ", " : ""}
                {label}
              </tspan>
            ))}
          </>
        }
        labelStyle={{
          fill: data.active ? "var(--accent)" : "var(--text)",
          fontSize: 13,
          fontFamily: "var(--mono)",
        }}
        labelBgStyle={{ fill: "var(--canvas)" }}
        labelBgPadding={[5, 4]}
        labelBgBorderRadius={4}
      />
    </>
  );
});

const nodeTypes = { state: StateCircle },
  edgeTypes = { automata: AutomataLine };
interface Props {
  graph: Graph;
  layoutGraph?: Graph;
  title: string;
  active?: string[];
  activeEdges?: string[];
  fresh?: string[];
  partitions?: string[][];
  subsets?: Record<string, string[]>;
  compact?: boolean;
}
const empty: string[] = [];

export function GraphCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({
  graph,
  layoutGraph,
  title,
  active = empty,
  activeEdges = empty,
  fresh = empty,
  partitions,
  subsets,
  compact = false,
}: Props) {
  const fullGraph = layoutGraph ?? graph;
  const basePositions = useMemo(() => layout(fullGraph), [fullGraph]);
  const manual = useRef<Record<string, Point>>({});
  const panel = useRef<HTMLElement | null>(null);
  const canvas = useRef<HTMLDivElement | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<StateNode>([]);
  const handleNodesChange = useCallback(
    (changes: NodeChange<StateNode>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position)
          manual.current[change.id] = change.position;
      }
      onNodesChange(changes);
    },
    [onNodesChange],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");
  const { fitView, getNodes } = useReactFlow<StateNode, AutomataEdge>();
  const [resetVersion, setResetVersion] = useState(0);
  useEffect(() => {
    manual.current = {};
    setSelected(null);
  }, [layoutGraph]);
  useEffect(() => {
    setNodes(
      graph.states.map((id) => ({
        id,
        type: "state",
        position: manual.current[id] ?? basePositions[id] ?? { x: 0, y: 0 },
        width: NODE_SIZE,
        height: NODE_SIZE,
        ariaRole: "button",
        selected: id === selected,
        ariaLabel: `State ${id}${id === graph.start ? ", initial" : ""}${graph.accepting.includes(id) ? ", accepting" : ""}`,
        data: {
          label: id,
          initial: id === graph.start,
          accepting: graph.accepting.includes(id),
          active: active.includes(id),
          fresh: fresh.includes(id),
          color: partitions?.some((p) => p.includes(id))
            ? partitionColors[
                partitions.findIndex((p) => p.includes(id)) %
                  partitionColors.length
              ]
            : undefined,
        },
      })),
    );
    if (selected && !graph.states.includes(selected)) setSelected(null);
  }, [
    graph,
    basePositions,
    active,
    fresh,
    partitions,
    setNodes,
    resetVersion,
    selected,
  ]);
  const edges = useMemo<AutomataEdge[]>(() => {
    const positions = {
      ...basePositions,
      ...Object.fromEntries(nodes.map((node) => [node.id, node.position])),
    };
    return graphRoutes(graph, positions).map(({ edge: e, geometry }) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "automata",
      data: {
        labels: e.labels,
        ids: e.ids,
        activeLabels: e.ids.map((id) => activeEdges.includes(id)),
        geometry,
        active: e.ids.some((id) => activeEdges.includes(id)),
      },
    }));
  }, [graph, basePositions, activeEdges, nodes]);
  useEffect(() => {
    let frame = 0;
    const refit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        void fitView({ padding: 0.16, duration: 0, maxZoom: 1.1 });
      });
    };
    const observer = new ResizeObserver(refit);
    if (canvas.current) observer.observe(canvas.current);
    refit();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [graph.states.length, fitView, resetVersion]);
  const reset = () => {
    manual.current = {};
    setResetVersion((v) => v + 1);
  };
  const save = useCallback(
    async (format: "svg" | "png") => {
      try {
        setExportError("");
        const positions = Object.fromEntries(
          getNodes().map((n) => [n.id, n.position]),
        );
        await exportGraph(graph, positions, format, title, active, activeEdges);
      } catch {
        setExportError("Image export failed. Try SVG or JSON instead.");
      }
    },
    [getNodes, graph, title, active, activeEdges],
  );
  return (
    <section
      ref={panel}
      className={`graph-panel ${compact ? "compact" : ""}`}
      aria-label={title}
    >
      <div className="graph-heading">
        <div>
          <span className="status-dot" />
          <h3>{title}</h3>
          <span className="graph-count" data-testid="graph-state-count">
            {graph.states.length} states
          </span>
        </div>
        <div className="graph-tools">
          <button
            className="icon-button"
            aria-label={`Fit ${title}`}
            title="Fit to screen"
            onClick={() => {
              void fitView({ padding: 0.16, duration: 250, maxZoom: 1.2 });
            }}
          >
            <Maximize size={14} />
          </button>
          <button
            className="icon-button"
            aria-label={`Expand ${title}`}
            title="Fullscreen graph (Escape to exit)"
            onClick={() => {
              const action = document.fullscreenElement
                ? document.exitFullscreen()
                : panel.current?.requestFullscreen();
              action?.catch(() =>
                setExportError(
                  "Fullscreen is unavailable in this browser. Use zoom and pan to inspect the graph.",
                ),
              );
            }}
          >
            <Expand size={14} />
          </button>
          <button
            className="icon-button"
            aria-label={`Reset ${title} layout`}
            title="Reset layout"
            onClick={reset}
          >
            <RotateCcw size={14} />
          </button>
          <details className="export-menu">
            <summary aria-label={`Export ${title}`} title="Export diagram">
              <Download size={14} />
            </summary>
            <div>
              {(["svg", "png"] as const).map((format) => (
                <button
                  key={format}
                  disabled={!graph.states.length}
                  onClick={() => void save(format)}
                >
                  Download {format.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() =>
                  download(
                    `${graph.kind}.json`,
                    "application/json",
                    JSON.stringify(graph, null, 2),
                  )
                }
              >
                Download JSON
              </button>
            </div>
          </details>
        </div>
      </div>
      <div ref={canvas} className="graph-canvas" data-testid="graph-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onNodeClick={(_, node) => setSelected(node.id)}
          onKeyDownCapture={(e) => {
            const id = (e.target as HTMLElement)
              .closest(".react-flow__node")
              ?.getAttribute("data-id");
            if (id && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              e.stopPropagation();
              setSelected(id);
            }
          }}
          onPaneClick={() => setSelected(null)}
          onNodeDragStop={(_, node) => {
            manual.current[node.id] = node.position;
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          minZoom={0.06}
          maxZoom={2.5}
          fitView
        >
          <Background gap={22} size={1} color="var(--grid)" />
          <Controls showInteractive={false} />
        </ReactFlow>
        {!graph.states.length && (
          <div className="graph-empty">
            <span className="empty-ring">∅</span>
            <p>No states yet</p>
            <span>Advance the timeline to begin construction.</span>
          </div>
        )}
        {selected && (
          <div className="state-inspection">
            <button
              className="icon-button"
              aria-label="Close state details"
              onClick={() => setSelected(null)}
            >
              <X size={13} />
            </button>
            <div className="section-label">STATE INSPECTOR</div>
            <h4>{selected}</h4>
            <p>
              {selected === graph.start ? "Initial · " : ""}
              {graph.accepting.includes(selected)
                ? "Accepting"
                : "Non-accepting"}
            </p>
            {subsets?.[selected] && (
              <p>
                Subset: <code>{setText(subsets[selected])}</code>
              </p>
            )}
            {partitions?.some((p) => p.includes(selected)) && (
              <p>
                Partition: P{partitions.findIndex((p) => p.includes(selected))}
              </p>
            )}
            <div className="small">
              <b>Outgoing</b>
              {graph.transitions
                .filter((e) => e.source === selected)
                .map((e) => (
                  <code key={e.id}>
                    {e.symbol ?? "ε"} → {e.target}
                  </code>
                ))}
              <b>Incoming</b>
              {graph.transitions
                .filter((e) => e.target === selected)
                .map((e) => (
                  <code key={e.id}>
                    {e.source} → {e.symbol ?? "ε"}
                  </code>
                ))}
            </div>
          </div>
        )}
      </div>
      <div className="graph-legend">
        <span>
          <i className="legend-initial">→</i> Initial
        </span>
        <span>
          <i className="legend-accept" /> Accepting
        </span>
        <span>
          <i className="legend-active" /> Active
        </span>
        <span className="graph-hint">Scroll to zoom · drag to explore</span>
      </div>
      {exportError && (
        <p role="alert" className="error-text">
          {exportError}
        </p>
      )}
    </section>
  );
}
