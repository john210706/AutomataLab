import { Check, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useState } from "react";
import { usePlayback, useRequest } from "../hooks";
import type { Compilation, Kind, Simulation, TraceEvent } from "../types";
import { kindNames } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { Inspector } from "./Inspector";
import { Playback } from "./Playback";
import { TraceHistory, TransitionTable } from "./Tables";
import { ErrorNotice } from "./common";

const noEvents: TraceEvent[] = [];
export function Simulator({
  compilation,
  initialInput = "bab",
}: {
  compilation: Compilation;
  initialInput?: string;
}) {
  const [input, setInput] = useState(initialInput);
  const characters = Array.from(input);
  const [kind, setKind] = useState<Kind>("minimized");
  const [tab, setTab] = useState<"table" | "history">("table");
  const request = useRequest<Simulation>("simulate");
  const events = request.data?.trace ?? noEvents;
  const player = usePlayback(events);
  const event = events[player.index];
  const data = event?.data.kind === "simulate" ? event.data : null;
  const graph = request.data?.automaton ?? compilation[kind];
  const finished = event?.type === "result";
  const agrees = request.data
    ? new Set(Object.values(request.data.agreement)).size === 1
    : true;
  const run = () => {
    void request.run({ regex: compilation.regex, input, automaton: kind });
  };
  const seekCharacter = (direction: number) => {
    const target = Math.max(
      0,
      Math.min(characters.length, (data?.consumed ?? 0) + direction),
    );
    const indices = events
      .map((e, i) =>
        e.data.kind === "simulate" && e.data.consumed === target ? i : -1,
      )
      .filter((i) => i >= 0);
    if (indices.length) player.seek(indices[indices.length - 1]);
  };
  return (
    <div className="stage-body">
      <div className="stage-summary">
        <div>
          <span className="eyebrow">Follow the input. Watch the states.</span>
          <h2>String simulator</h2>
        </div>
        <span className="small muted">
          Compiled expression <code>{compilation.regex}</code>
        </span>
      </div>
      <form
        className="simulation-form"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label>
          Test string
          <input
            aria-label="Test string"
            placeholder="Leave empty to test ε"
            value={input}
            maxLength={512}
            onChange={(e) => {
              setInput(e.target.value);
              request.reset();
            }}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label>
          Automaton
          <select
            aria-label="Simulation automaton"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as Kind);
              request.reset();
            }}
          >
            {Object.entries(kindNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" disabled={request.loading}>
          <Play size={15} />
          {request.loading ? "Simulating…" : "Start simulation"}
        </button>
      </form>
      <ErrorNotice error={request.error} />
      <div className="input-tape">
        <span className="section-label">INPUT TAPE</span>
        <div>
          {(characters.length ? characters : ["ε"]).map((c, i) => (
            <span
              key={i}
              className={`tape-cell ${input && i < (data?.consumed ?? 0) ? "consumed" : ""} ${input && i === (data?.consumed ?? 0) - 1 ? "current" : ""}`}
            >
              {c === " " ? "␠" : c}
            </span>
          ))}
        </div>
        <span
          className={`result-badge ${finished ? (request.data?.accepted ? "accepted" : "rejected") : ""}`}
          role="status"
        >
          {finished ? (
            request.data?.accepted ? (
              <>
                <Check size={14} /> Accepted
              </>
            ) : (
              <>
                <X size={14} /> Rejected
              </>
            )
          ) : data ? (
            `${data.consumed} / ${characters.length} consumed`
          ) : (
            "Ready to run"
          )}
        </span>
      </div>
      <div className="explorer-grid">
        <div className="visualization-column">
          <GraphCanvas
            graph={graph}
            layoutGraph={compilation[kind]}
            title={`${kindNames[kind]} simulation`}
            active={event?.highlighted_states}
            activeEdges={event?.highlighted_transitions}
            subsets={kind === "dfa" ? compilation.subsets : undefined}
          />
          {event && (
            <>
              <Playback player={player} title={event.title} />
              <div className="character-controls">
                <button
                  className="text-button"
                  disabled={!data?.consumed}
                  onClick={() => seekCharacter(-1)}
                >
                  <ChevronLeft size={14} /> Previous character
                </button>
                <button
                  className="text-button"
                  disabled={(data?.consumed ?? 0) >= characters.length}
                  onClick={() => seekCharacter(1)}
                >
                  Next character <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
        {event ? (
          <Inspector event={event} />
        ) : (
          <aside className="simulation-help">
            <div className="section-label">TRY A STRING</div>
            <h3>Does it belong to the language?</h3>
            <p>
              Choose an automaton and follow each character through its
              transitions.
            </p>
            <p>
              For an ε-NFA, the highlighted set includes every active state.
              Epsilon transitions consume no input.
            </p>
            <div className="mono-box">Empty input = ε</div>
            <p className="small">
              Input is exact and case-sensitive. Spaces are consumed, not
              ignored.
            </p>
          </aside>
        )}
      </div>
      {finished && request.data && (
        <div className={`agreement-panel ${agrees ? "" : "disagreement"}`}>
          <div>
            {agrees ? <Check size={17} /> : <X size={17} />}
            <b>
              {agrees
                ? "All three representations agree"
                : "The representations disagree — a compiler error was detected"}
            </b>
          </div>
          {Object.entries(request.data.agreement).map(([name, accepted]) => (
            <span key={name}>
              {kindNames[name as Kind]} <b>{accepted ? "Accept" : "Reject"}</b>
            </span>
          ))}
        </div>
      )}
      <div className="data-tabs">
        <button
          className={tab === "table" ? "active" : ""}
          onClick={() => setTab("table")}
        >
          Transition table
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          disabled={!events.length}
          onClick={() => setTab("history")}
        >
          Simulation history <span>{events.length}</span>
        </button>
        {event && (
          <span className="sync-label">Synced to step {player.index + 1}</span>
        )}
      </div>
      {tab === "history" && events.length ? (
        <TraceHistory events={events} index={player.index} seek={player.seek} />
      ) : (
        <TransitionTable graph={graph} active={event?.highlighted_states} />
      )}
    </div>
  );
}
