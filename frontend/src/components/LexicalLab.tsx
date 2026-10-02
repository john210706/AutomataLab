import { ArrowRight, Plus, ScanText, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePlayback, useRequest } from "../hooks";
import type { LexResult } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { Playback } from "./Playback";
import { ErrorNotice } from "./common";

interface Rule {
  name: string;
  regex: string;
  skip: boolean;
}

const letters = "a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z";
const digits = "0|1|2|3|4|5|6|7|8|9";
const examples: Rule[] = [
  { name: "KEYWORD", regex: "if|then|else", skip: false },
  {
    name: "IDENTIFIER",
    regex: "(" + letters + ")(" + letters + ")*",
    skip: false,
  },
  { name: "INTEGER", regex: "(" + digits + ")(" + digits + ")*", skip: false },
];

export function LexicalLab() {
  const [rules, setRules] = useState<Rule[]>(examples);
  const [input, setInput] = useState("if42then");
  const [selected, setSelected] = useState(0);
  const request = useRequest<LexResult>("lex");
  const steps = request.data?.steps ?? [];
  const player = usePlayback(steps);
  const step = steps[player.index];
  const definition = request.data?.definitions[selected];
  const update = (index: number, change: Partial<Rule>) => {
    setRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...change } : rule)),
    );
    request.reset();
  };
  return (
    <div className="lexer-lab">
      <div className="page-intro">
        <span className="eyebrow">From automata to source tokens</span>
        <h1>
          Lexical analysis lab<span>.</span>
        </h1>
        <p>
          Define ordered token categories, compile each expression into a DFA,
          and watch longest-match scanning resolve your input.
        </p>
      </div>
      <form
        className="lexer-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSelected(0);
          void request.run({ rules, input });
        }}
      >
        <div className="panel-heading">
          <div>
            <ScanText size={17} />
            <h2>Ordered token rules</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setRules((current) => [
                ...current,
                {
                  name: "TOKEN_" + (current.length + 1),
                  regex: "a",
                  skip: false,
                },
              ]);
              request.reset();
            }}
            disabled={rules.length >= 32}
          >
            <Plus size={14} /> Add rule
          </button>
        </div>
        <div className="lexer-rule-list">
          {rules.map((rule, index) => (
            <div className="lexer-rule" key={index}>
              <span className="rule-priority" title="Priority">
                {index + 1}
              </span>
              <label>
                <span>NAME</span>
                <input
                  aria-label={"Rule " + (index + 1) + " name"}
                  value={rule.name}
                  maxLength={32}
                  onChange={(event) =>
                    update(index, { name: event.target.value })
                  }
                />
              </label>
              <label className="rule-regex">
                <span>REGULAR EXPRESSION</span>
                <input
                  aria-label={"Rule " + (index + 1) + " expression"}
                  value={rule.regex}
                  maxLength={256}
                  spellCheck={false}
                  onChange={(event) =>
                    update(index, { regex: event.target.value })
                  }
                />
              </label>
              <label className="skip-rule">
                <input
                  type="checkbox"
                  checked={rule.skip}
                  onChange={(event) =>
                    update(index, { skip: event.target.checked })
                  }
                />
                Skip
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={"Remove rule " + (index + 1)}
                disabled={rules.length === 1}
                onClick={() => {
                  setRules((current) => current.filter((_, i) => i !== index));
                  request.reset();
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="lexer-input-row">
          <label>
            <span>INPUT PROGRAM</span>
            <input
              aria-label="Input program"
              value={input}
              maxLength={512}
              spellCheck={false}
              onChange={(event) => {
                setInput(event.target.value);
                request.reset();
              }}
            />
          </label>
          <button className="primary-button" disabled={request.loading}>
            {request.loading ? "Scanning…" : "Compile and scan"}
            <ArrowRight size={15} />
          </button>
        </div>
        <p className="lexer-note">
          Earlier rules win equal-length ties. Longer matches always win. Input
          characters must be covered exactly by a rule.
        </p>
      </form>
      <ErrorNotice error={request.error} />
      {request.data && (
        <>
          <section className="lexer-output" aria-label="Recognized tokens">
            <div className="panel-heading">
              <h2>Recognized token stream</h2>
              <span className="small muted">
                {request.data.tokens.length} token
                {request.data.tokens.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="token-stream">
              {request.data.tokens.length ? (
                request.data.tokens.map((token, index) => (
                  <div
                    className="recognized-token"
                    key={token.start + "-" + index}
                  >
                    <span>{token.token}</span>
                    <code>{token.lexeme}</code>
                    <small>
                      [{token.start}, {token.end})
                    </small>
                  </div>
                ))
              ) : (
                <span className="muted small">
                  The empty input produces no tokens.
                </span>
              )}
            </div>
          </section>
          {step && (
            <section className="lexer-scan">
              <div className="scan-step">
                <span className="section-label">
                  SCANNER STEP {player.index + 1}
                </span>
                <h2>
                  Chose <code>{step.chosen.token}</code> for{" "}
                  <code>{step.chosen.lexeme}</code>
                </h2>
                <p>
                  At position {step.position}, {step.candidates.length} rule
                  {step.candidates.length === 1 ? "" : "s"} accepted a prefix.
                  The longest match won{step.skipped ? " and was skipped" : ""}.
                </p>
                <div className="candidate-list">
                  {step.candidates.map((candidate) => (
                    <span
                      className={
                        candidate.token === step.chosen.token ? "chosen" : ""
                      }
                      key={candidate.token}
                    >
                      <b>{candidate.token}</b> <code>{candidate.lexeme}</code>
                    </span>
                  ))}
                </div>
                <Playback player={player} title={"Position " + step.position} />
              </div>
              <div className="compiled-rule">
                <div
                  className="data-tabs"
                  role="tablist"
                  aria-label="Compiled token rules"
                >
                  {request.data.definitions.map((item, index) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected === index}
                      className={selected === index ? "active" : ""}
                      key={item.name}
                      onClick={() => setSelected(index)}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                {definition && (
                  <GraphCanvas
                    graph={definition.automaton}
                    layoutGraph={definition.automaton}
                    title={definition.name + " · /" + definition.regex + "/"}
                    compact
                  />
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
