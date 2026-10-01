import {
  ArrowDown,
  ArrowRight,
  Braces,
  GitBranch,
  Layers3,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { stages } from "../content";
import { download } from "../export";
import { usePlayback } from "../hooks";
import type { Compilation, Stage, TraceEvent } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { Inspector } from "./Inspector";
import { Playback } from "./Playback";
import { Simulator } from "./Simulator";
import { MappingTable, TraceHistory, TransitionTable } from "./Tables";

export function Workspace({
  compilation,
  stage,
  setStage,
  testInput,
}: {
  compilation: Compilation | null;
  stage: Stage | "test";
  setStage: (s: Stage | "test") => void;
  testInput?: string;
}) {
  return (
    <>
      <div className="journey" aria-label="Compilation stages">
        {stages.map((s, i) => (
          <button
            key={s.id}
            className={stage === s.id ? "stage active" : "stage"}
            onClick={() => setStage(s.id)}
            disabled={!compilation}
          >
            <span className="stage-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <b>{s.title}</b>
              <small>{s.subtitle}</small>
            </span>
            {i < 4 && <ArrowRight size={13} className="stage-arrow" />}
          </button>
        ))}
      </div>
      {!compilation ? (
        <EmptyWorkspace />
      ) : stage === "test" ? (
        <Simulator
          key={compilation.regex + (testInput ?? "")}
          compilation={compilation}
          initialInput={testInput}
        />
      ) : (
        <AlgorithmStage
          key={`${compilation.regex}-${stage}`}
          compilation={compilation}
          stage={stage}
        />
      )}
    </>
  );
}

export function EmptyWorkspace() {
  return (
    <section className="empty-workspace">
      <div className="empty-topline">
        <span className="section-label">YOUR COMPILATION WORKSPACE</span>
        <span className="tiny-tag">READY WHEN YOU ARE</span>
      </div>
      <div className="empty-symbol">
        <Workflow size={37} strokeWidth={1.2} />
      </div>
      <h2>Every pattern has a path.</h2>
      <p>
        Enter a regular expression and watch its automata take shape.
        <br />
        One operation, one state, one insight at a time.
      </p>
      <div className="empty-flow">
        <span>
          <Braces size={18} /> Regex
        </span>
        <ArrowRight size={16} />
        <span>
          <GitBranch size={18} /> ε-NFA
        </span>
        <ArrowRight size={16} />
        <span>
          <Workflow size={18} /> DFA
        </span>
        <ArrowRight size={16} />
        <span>
          <Layers3 size={18} /> Minimal DFA
        </span>
      </div>
      <div className="empty-foot">
        <span>
          <i className="status-dot" /> Real algorithms, fully traceable
        </span>
        <span>Forward, backward, at your own pace</span>
      </div>
    </section>
  );
}

function ParseCanvas({
  expression,
  event,
}: {
  expression: string;
  event: TraceEvent;
}) {
  if (event.data.kind !== "parse") return null;
  const data = event.data;
  return (
    <div className="parser-panel">
      <div className="graph-heading">
        <div>
          <span className="status-dot" />
          <h3>From expression to instructions</h3>
        </div>
        <span className="tiny-tag">{data.phase}</span>
      </div>
      <div className="parser-content">
        <div className="section-label">01 / SOURCE EXPRESSION</div>
        <div className="source-expression" aria-label="Source token highlight">
          {Array.from(expression).map((character, i) => (
            <span
              key={i}
              className={i === event.token?.position ? "current-token" : ""}
            >
              {character}
            </span>
          ))}
        </div>
        <div className="parser-connector">
          <span />
          <ArrowDown size={17} />
          <span />
        </div>
        <div className="section-label">
          02 /{" "}
          {data.phase === "tokenize"
            ? "RECOGNIZED TOKENS"
            : "EXPLICIT CONCATENATION"}
        </div>
        <div className="token-row">
          {data.tokens.map((token, i) => (
            <span
              className={`token ${token.synthetic ? "synthetic" : ""} ${event.token?.position === token.position && event.token.value === token.value ? "current" : ""}`}
              key={i}
            >
              {token.value}
              <small>{token.synthetic ? "inserted" : token.position + 1}</small>
            </span>
          ))}
        </div>
        <div className="parser-connector">
          <span />
          <ArrowDown size={17} />
          <span />
        </div>
        <div className="section-label">03 / POSTFIX OUTPUT</div>
        <div className="postfix-output">
          {data.output.length ? (
            data.output.join(" ")
          ) : (
            <span>Operands first. Operators follow.</span>
          )}
        </div>
        <div className="parser-note">
          <span className="tiny-tag">PRECEDENCE</span>
          <code>*</code>
          <span>repetition</span>
          <b>›</b>
          <code>·</code>
          <span>concatenation</span>
          <b>›</b>
          <code>|</code>
          <span>union</span>
        </div>
      </div>
    </div>
  );
}

function AlgorithmStage({
  compilation,
  stage,
}: {
  compilation: Compilation;
  stage: Stage;
}) {
  const events = compilation.traces[stage];
  const player = usePlayback(events);
  const event = events[player.index];
  const [tab, setTab] = useState<"tables" | "history">("tables");
  const graph = event.graph;
  const nfa = stage === "nfa";
  const min = event.data.kind === "minimize" ? event.data : null;
  const subset = event.data.kind === "dfa" ? event.data : null;
  return (
    <div className="stage-body">
      <div className="stage-summary">
        <div>
          <span className="eyebrow">
            {stages.find((s) => s.id === stage)?.subtitle}
          </span>
          <h2>{stages.find((s) => s.id === stage)?.title}</h2>
        </div>
        <div className="summary-right">
          {stage === "minimize" && (
            <span className="reduction-badge">
              {compilation.counts.dfa} → {compilation.counts.minimized} states
            </span>
          )}
          <button
            className="text-button"
            onClick={() =>
              download(
                "automatalab-compilation.json",
                "application/json",
                JSON.stringify(compilation, null, 2),
              )
            }
          >
            Export compilation <ArrowDown size={14} />
          </button>
        </div>
      </div>
      <div className="explorer-grid">
        <div className="visualization-column">
          {stage === "parse" ? (
            <ParseCanvas expression={compilation.regex} event={event} />
          ) : (
            graph && (
              <div
                className={
                  stage === "dfa" || graph.kind === "minimized"
                    ? "dual-graphs"
                    : ""
                }
              >
                {stage === "dfa" && (
                  <GraphCanvas
                    title="Source ε-NFA"
                    graph={compilation.nfa}
                    layoutGraph={compilation.nfa}
                    active={event.nfa_states}
                    activeEdges={event.nfa_transitions}
                    fresh={subset?.closure?.discovered}
                    compact
                  />
                )}
                {graph.kind === "minimized" && (
                  <GraphCanvas
                    title="Original DFA"
                    graph={compilation.dfa}
                    layoutGraph={compilation.dfa}
                    active={min?.examined}
                    partitions={min?.partitions}
                    compact
                  />
                )}
                <GraphCanvas
                  title={
                    nfa
                      ? "Thompson construction"
                      : stage === "dfa"
                        ? "Emerging DFA"
                        : graph.kind === "minimized"
                          ? "Minimized DFA"
                          : "Partition refinement"
                  }
                  graph={graph}
                  layoutGraph={
                    graph.kind === "nfa"
                      ? compilation.nfa
                      : graph.kind === "minimized"
                        ? compilation.minimized
                        : compilation.dfa
                  }
                  active={event.highlighted_states}
                  activeEdges={[
                    ...event.highlighted_transitions,
                    ...event.new_transitions,
                  ]}
                  fresh={event.new_states}
                  partitions={
                    graph.kind !== "minimized"
                      ? min?.partitions
                      : min?.partitions.map((_, i) => [`M${i}`])
                  }
                  subsets={subset?.subsets}
                  compact={stage === "dfa" || graph.kind === "minimized"}
                />
              </div>
            )
          )}
          <Playback player={player} title={event.title} />
        </div>
        <Inspector event={event} />
      </div>
      <div className="data-tabs">
        <button
          className={tab === "tables" ? "active" : ""}
          onClick={() => setTab("tables")}
        >
          {stage === "parse" ? "Compiler output" : "Tables & mappings"}
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          Execution history <span>{events.length}</span>
        </button>
        <span className="sync-label">
          <span className="status-dot" /> Synced to step {player.index + 1}
        </span>
      </div>
      {tab === "history" ? (
        <TraceHistory events={events} index={player.index} seek={player.seek} />
      ) : stage === "parse" ? (
        <div className="parse-summary">
          <div>
            <span className="section-label">SUPPORTED GRAMMAR</span>
            <code>literal | ε | (expr) | expr* | expr expr | expr|expr</code>
            <p>
              ASCII letters and digits are literals. Whitespace is ignored. Dots
              are inserted internally; user-entered dots are unsupported.
            </p>
          </div>
          <div>
            <span className="section-label">CURRENT OUTPUT</span>
            <code>
              {event.data.kind === "parse"
                ? event.data.output.join("") || "∅"
                : ""}
            </code>
            <p>
              This output grows as tokens are processed. Use Last step to
              inspect the completed postfix expression.
            </p>
          </div>
        </div>
      ) : (
        graph && (
          <div className="tables-grid">
            <TransitionTable graph={graph} active={event.highlighted_states} />
            <MappingTable event={event} />
            {stage === "minimize" && graph.kind === "minimized" && (
              <TransitionTable
                title="Original DFA (preserved)"
                graph={compilation.dfa}
              />
            )}
          </div>
        )
      )}
    </div>
  );
}
