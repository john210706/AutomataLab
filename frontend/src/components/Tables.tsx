import { Download } from "lucide-react";
import type { Graph, TraceEvent } from "../types";
import { setText } from "../types";
import { download } from "../export";

export function TransitionTable({
  graph,
  active = [],
  title = "Transition table",
}: {
  graph: Graph;
  active?: string[];
  title?: string;
}) {
  const symbols: (string | null)[] =
    graph.kind === "nfa" ? [null, ...graph.alphabet] : graph.alphabet;
  const cell = (state: string, symbol: string | null) =>
    graph.transitions
      .filter((t) => t.source === state && t.symbol === symbol)
      .map((t) => t.target);
  const csv = () =>
    download(
      "transition-table.csv",
      "text/csv",
      [
        ["State", "Initial", "Accepting", ...symbols.map((s) => s ?? "ε")],
        ...graph.states.map((s) => [
          s,
          String(s === graph.start),
          String(graph.accepting.includes(s)),
          ...symbols.map((a) => cell(s, a).join(";")),
        ]),
      ]
        .map((row) => row.map((c) => `"${c.replaceAll('"', '""')}"`).join(","))
        .join("\n"),
    );
  return (
    <div className="table-panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        <span className="small muted">δ(state, symbol)</span>
        <button
          className="icon-button"
          aria-label="Export transition table"
          title="Export CSV"
          onClick={csv}
        >
          <Download size={14} />
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>State</th>
              {symbols.map((s) => (
                <th key={s ?? "epsilon"}>{s ?? "ε"}</th>
              ))}
              <th>Accepting</th>
            </tr>
          </thead>
          <tbody>
            {graph.states.map((state) => (
              <tr
                key={state}
                className={active.includes(state) ? "active-row" : ""}
              >
                <td>
                  <code>
                    {state === graph.start ? "→ " : ""}
                    {state}
                  </code>
                </td>
                {symbols.map((symbol) => (
                  <td key={symbol ?? "epsilon"}>
                    <code>{cell(state, symbol).join(", ") || "∅"}</code>
                  </td>
                ))}
                <td>
                  <span
                    className={
                      graph.accepting.includes(state) ? "accept-badge" : "muted"
                    }
                  >
                    {graph.accepting.includes(state) ? "Yes" : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!graph.states.length && (
          <p className="table-empty">States will appear as you advance.</p>
        )}
      </div>
    </div>
  );
}

export function MappingTable({ event }: { event: TraceEvent }) {
  const data = event.data;
  if (data.kind === "dfa")
    return (
      <div className="table-panel">
        <div className="panel-heading">
          <h3>DFA → NFA subsets</h3>
          <span className="small muted">Exact state membership</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>DFA state</th>
                <th>NFA subset</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.subsets).map(([state, subset]) => (
                <tr
                  className={
                    data.current === state || data.target === state
                      ? "active-row"
                      : ""
                  }
                  key={state}
                >
                  <td>
                    <code>{state}</code>
                  </td>
                  <td>
                    <code>{setText(subset)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  if (data.kind === "minimize" && Object.keys(data.mapping).length)
    return (
      <div className="table-panel">
        <div className="panel-heading">
          <h3>Original → minimized states</h3>
        </div>
        <div className="mapping-chips">
          {Object.entries(data.mapping).map(([a, b]) => (
            <code key={a}>
              {a} <span>→</span> {b}
            </code>
          ))}
        </div>
      </div>
    );
  return null;
}

export function TraceHistory({
  events,
  index,
  seek,
}: {
  events: TraceEvent[];
  index: number;
  seek: (index: number) => void;
}) {
  return (
    <div className="history-panel" aria-label="Execution history">
      {events.map((item, i) => (
        <button
          key={item.id}
          className={i === index ? "history-event active" : "history-event"}
          onClick={() => seek(i)}
        >
          <code>{String(i + 1).padStart(2, "0")}</code>
          <b>{item.title}</b>
          <span>{item.explanation}</span>
        </button>
      ))}
    </div>
  );
}
