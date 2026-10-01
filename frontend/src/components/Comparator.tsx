import { ArrowRight, Check, GitCompareArrows, Play, X } from "lucide-react";
import { useState } from "react";
import { usePlayback, useRequest } from "../hooks";
import type { Comparison, TraceEvent } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { Inspector } from "./Inspector";
import { Playback } from "./Playback";
import { ErrorNotice } from "./common";

const empty: TraceEvent[] = [];
export function Comparator({
  onSimulate,
}: {
  onSimulate: (regex: string, input: string) => void;
}) {
  const [left, setLeft] = useState("a*b"),
    [right, setRight] = useState("ab");
  const [mode, setMode] = useState<"search" | "witness">("search");
  const request = useRequest<Comparison>("compare");
  const result = request.data;
  const events =
    (mode === "search" ? result?.trace : result?.left_path) ?? empty;
  const player = usePlayback(events);
  const event = events[player.index];
  const pair =
    mode === "search" && event?.data.kind === "compare"
      ? event.data.pair
      : null;
  const rightEvent = result?.right_path[player.index];
  return (
    <div className="comparator">
      <div className="page-intro">
        <span className="eyebrow">Two patterns. One language?</span>
        <h1>
          Regex comparator<span>.</span>
        </h1>
        <p>
          Prove language equivalence, or find the shortest string that tells two
          expressions apart.
        </p>
      </div>
      <form
        className="compare-form"
        onSubmit={(e) => {
          e.preventDefault();
          setMode("search");
          void request.run({ left, right });
        }}
      >
        <label>
          <span>EXPRESSION A</span>
          <input
            aria-label="Expression A"
            value={left}
            maxLength={256}
            onChange={(e) => {
              setLeft(e.target.value);
              request.reset();
            }}
            spellCheck={false}
          />
        </label>
        <GitCompareArrows size={23} />
        <label>
          <span>EXPRESSION B</span>
          <input
            aria-label="Expression B"
            value={right}
            maxLength={256}
            onChange={(e) => {
              setRight(e.target.value);
              request.reset();
            }}
            spellCheck={false}
          />
        </label>
        <button className="primary-button" disabled={request.loading}>
          {request.loading ? "Comparing…" : "Compare languages"}
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="compare-examples">
        <span>Try an equivalent pair</span>
        <button
          className="code-chip"
          onClick={() => {
            setLeft("(a|b)*ab");
            setRight("(b|a)*ab");
            request.reset();
          }}
        >
          (a|b)*ab ↔ (b|a)*ab
        </button>
      </div>
      <ErrorNotice error={request.error} />
      {result ? (
        <>
          <div
            className={`comparison-result ${result.equivalent ? "equal" : "different"}`}
            role="status"
          >
            {result.equivalent ? <Check size={24} /> : <X size={24} />}
            <div>
              <h2>
                {result.equivalent
                  ? "These expressions are equivalent."
                  : "These expressions recognize different languages."}
              </h2>
              <p>
                {result.equivalent ? (
                  "Every reachable state pair agrees on acceptance. This checks the complete languages, including the empty string."
                ) : (
                  <>
                    Shortest distinguishing string:{" "}
                    <code className="witness">
                      {result.counterexample || "ε"}
                    </code>{" "}
                    · A{" "}
                    {result.left_path.at(-1)?.data.kind === "simulate" &&
                    result.left_path.at(-1)?.data &&
                    (result.left_path.at(-1)!.data as { accepted: boolean })
                      .accepted
                      ? "accepts"
                      : "rejects"}
                    , B{" "}
                    {result.right_path.at(-1)?.data.kind === "simulate" &&
                    (result.right_path.at(-1)!.data as { accepted: boolean })
                      .accepted
                      ? "accepts"
                      : "rejects"}
                    .
                  </>
                )}
              </p>
            </div>
            {result.counterexample !== null && (
              <button
                className="secondary-button"
                onClick={() => {
                  setMode("witness");
                  player.seek(0);
                }}
              >
                <Play size={14} />
                Replay counterexample
              </button>
            )}
          </div>
          <div className="data-tabs">
            <button
              className={mode === "search" ? "active" : ""}
              onClick={() => setMode("search")}
            >
              Product-state search
            </button>
            {result.counterexample !== null && (
              <button
                className={mode === "witness" ? "active" : ""}
                onClick={() => setMode("witness")}
              >
                Counterexample replay
              </button>
            )}
            <span className="sync-label">
              Alphabet: {"{" + result.alphabet.join(", ") + "}"}
            </span>
          </div>
          <div className="explorer-grid">
            <div className="visualization-column">
              <div className="dual-graphs">
                <GraphCanvas
                  graph={result.left}
                  layoutGraph={result.left}
                  title={`A · ${left}`}
                  active={pair ? [pair[0]] : event?.highlighted_states}
                  activeEdges={
                    mode === "witness"
                      ? event?.highlighted_transitions
                      : undefined
                  }
                  compact
                />
                <GraphCanvas
                  graph={result.right}
                  layoutGraph={result.right}
                  title={`B · ${right}`}
                  active={pair ? [pair[1]] : rightEvent?.highlighted_states}
                  activeEdges={
                    mode === "witness"
                      ? rightEvent?.highlighted_transitions
                      : undefined
                  }
                  compact
                />
              </div>
              <Playback player={player} title={event?.title} />
            </div>
            {event && <Inspector event={event} />}
          </div>
          {result.counterexample !== null && (
            <div className="compare-actions">
              <span>Continue investigating the counterexample</span>
              <button
                className="text-button"
                onClick={() => onSimulate(left, result.counterexample!)}
              >
                Test with A <ArrowRight size={14} />
              </button>
              <button
                className="text-button"
                onClick={() => onSimulate(right, result.counterexample!)}
              >
                Test with B <ArrowRight size={14} />
              </button>
            </div>
          )}
          {mode === "search" && (
            <div className="table-panel">
              <div className="panel-heading">
                <h3>Explored state pairs</h3>
                <span className="small muted">Breadth-first order</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Left state</th>
                      <th>Right state</th>
                      <th>String</th>
                      <th>Acceptance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trace.slice(0, player.index + 1).map(
                      (item, i) =>
                        item.data.kind === "compare" && (
                          <tr
                            className={i === player.index ? "active-row" : ""}
                            key={item.id}
                            onClick={() => player.seek(i)}
                          >
                            <td>{i + 1}</td>
                            <td>
                              <code>{item.data.pair[0]}</code>
                            </td>
                            <td>
                              <code>{item.data.pair[1]}</code>
                            </td>
                            <td>
                              <code>{item.data.word || "ε"}</code>
                            </td>
                            <td>
                              {item.data.disagreement ? "Disagrees" : "Agrees"}
                            </td>
                          </tr>
                        ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        !request.loading && (
          <div className="compare-empty">
            <GitCompareArrows size={34} />
            <h2>Beyond a few example strings.</h2>
            <p>
              The compiler explores the product of both DFAs. A breadth-first
              search finds a shortest counterexample, or proves there is none.
            </p>
            <div className="small muted">
              Union alphabet · complete DFAs · exact comparison
            </div>
          </div>
        )
      )}
    </div>
  );
}
