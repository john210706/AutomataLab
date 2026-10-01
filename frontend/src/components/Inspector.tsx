import { Code2, ListTree, Sparkles } from "lucide-react";
import { pseudocode } from "../content";
import { setText } from "../types";
import type { Closure, TraceEvent } from "../types";

export function ClosurePanel({ closure }: { closure: Closure }) {
  return (
    <div className="closure-panel">
      <div className="section-label">ε-CLOSURE EXPLORER</div>
      <dl className="data-list">
        <dt>Starting set</dt>
        <dd>{setText(closure.seeds)}</dd>
        <dt>Examining</dt>
        <dd>{closure.current ?? "—"}</dd>
        <dt>Discovered</dt>
        <dd>{setText(closure.visited)}</dd>
        <dt>Worklist</dt>
        <dd>{setText(closure.worklist)}</dd>
      </dl>
      {closure.discovered.length > 0 && (
        <p className="small success">New: {setText(closure.discovered)}</p>
      )}
    </div>
  );
}

export function Inspector({ event }: { event: TraceEvent }) {
  const data = event.data;
  return (
    <aside className="inspector">
      <div className="panel-heading">
        <ListTree size={16} />
        <h3>Algorithm explorer</h3>
        <span className="tiny-tag">LIVE TRACE</span>
      </div>
      <div className="operation">
        <div className="section-label">
          CURRENT OPERATION{" "}
          <span>{String(event.index + 1).padStart(2, "0")}</span>
        </div>
        <h3>{event.title}</h3>
        <p>{event.explanation}</p>
      </div>
      <div className="inspector-data">
        {data.kind === "parse" && (
          <>
            <div className="section-label">
              OPERATOR STACK <span>TOP →</span>
            </div>
            <div className="stack-row">
              {data.stack.length ? (
                data.stack.map((t, i) => (
                  <span className="stack-token" key={i}>
                    {t}
                  </span>
                ))
              ) : (
                <span className="muted small">Empty stack</span>
              )}
            </div>
            <div className="section-label">OUTPUT QUEUE</div>
            <div className="mono-box">
              {data.output.join(" ") || "Waiting for operands…"}
            </div>
          </>
        )}
        {data.kind === "nfa" && (
          <>
            <div className="section-label">
              FRAGMENT STACK <span>{data.stack.length}</span>
            </div>
            <div className="fragment-list">
              {[...data.stack].reverse().map((f, i) => (
                <div
                  className={i === 0 ? "fragment top" : "fragment"}
                  key={f.start}
                >
                  <span>{i === 0 ? "TOP" : String(data.stack.length - i)}</span>
                  <code>
                    {f.start} → {f.end}
                  </code>
                  <small>{f.states.length} states</small>
                </div>
              ))}
            </div>
            {data.popped.length > 0 && (
              <p className="small muted">
                Combined:{" "}
                {data.popped.map((f) => `${f.start} → ${f.end}`).join(" and ")}
              </p>
            )}
          </>
        )}
        {data.kind === "dfa" && (
          <>
            <div className="section-label">SUBSET CONSTRUCTION</div>
            <dl className="data-list">
              <dt>Current state</dt>
              <dd>{data.current ?? "—"}</dd>
              <dt>Input symbol</dt>
              <dd>{data.symbol ?? "—"}</dd>
              <dt>move result</dt>
              <dd>{setText(data.move)}</dd>
              <dt>DFA worklist</dt>
              <dd>{setText(data.worklist)}</dd>
            </dl>
            {data.closure && <ClosurePanel closure={data.closure} />}
          </>
        )}
        {data.kind === "minimize" && (
          <>
            <div className="section-label">
              PARTITIONS <span>ROUND {data.iteration}</span>
            </div>
            <div className="partition-list">
              {data.partitions.map((group, i) => (
                <div
                  className="partition"
                  key={i}
                  style={
                    {
                      "--partition-color":
                        partitionColors[i % partitionColors.length],
                    } as React.CSSProperties
                  }
                >
                  <b>P{i}</b>
                  <code>{setText(group)}</code>
                </div>
              ))}
            </div>
            {Object.entries(data.signatures).length > 0 && (
              <>
                <div className="section-label">TRANSITION SIGNATURES</div>
                <dl className="data-list">
                  {Object.entries(data.signatures).map(([s, values]) => (
                    <div className="data-entry" key={s}>
                      <dt>{s}</dt>
                      <dd>[{values.join(", ")}]</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {data.removed.length > 0 && (
              <p className="small">Unreachable: {data.removed.join(", ")}</p>
            )}
          </>
        )}
        {data.kind === "simulate" && (
          <>
            <div className="section-label">ACTIVE CONFIGURATION</div>
            <div className="mono-box">{setText(data.active)}</div>
            <p className="small muted">
              {data.consumed} character{data.consumed === 1 ? "" : "s"} consumed
            </p>
            {data.closure && <ClosurePanel closure={data.closure} />}
          </>
        )}
        {data.kind === "compare" && (
          <>
            <div className="section-label">PRODUCT SEARCH</div>
            <dl className="data-list">
              <dt>State pair</dt>
              <dd>({data.pair.join(", ")})</dd>
              <dt>String</dt>
              <dd>{data.word || "ε"}</dd>
              <dt>Discovered pairs</dt>
              <dd>{data.visited_count}</dd>
              <dt>Queued pairs</dt>
              <dd>{data.worklist.length}</dd>
            </dl>
          </>
        )}
      </div>
      <details className="pseudocode" open>
        <summary>
          <Code2 size={15} /> Algorithm pseudocode
        </summary>
        <ol>
          {pseudocode[event.stage]?.map((line, i) => (
            <li
              className={i + 1 === event.line ? "current-line" : ""}
              key={line}
            >
              <span>{i + 1}</span>
              {line}
            </li>
          ))}
        </ol>
      </details>
      <div className="trace-note">
        <Sparkles size={14} />
        <span>Computed from your expression. Every step is replayable.</span>
      </div>
    </aside>
  );
}
export const partitionColors = [
  "var(--partition-0)",
  "var(--partition-1)",
  "var(--partition-2)",
  "var(--partition-3)",
  "var(--partition-4)",
  "var(--partition-5)",
];
