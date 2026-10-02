export type Kind = "nfa" | "dfa" | "minimized";
export type Stage = "parse" | "nfa" | "dfa" | "minimize";
export interface Token {
  value: string;
  position: number;
  synthetic: boolean;
}
export interface Transition {
  id: string;
  source: string;
  target: string;
  symbol: string | null;
}
export interface Graph {
  kind: Kind;
  states: string[];
  alphabet: string[];
  start: string | null;
  accepting: string[];
  transitions: Transition[];
}
export interface Fragment {
  start: string;
  end: string;
  states: string[];
}
export interface Closure {
  seeds: string[];
  current: string | null;
  visited: string[];
  worklist: string[];
  discovered: string[];
  edge: string | null;
}
export interface ParseData {
  kind: "parse";
  phase: "tokenize" | "concatenate" | "postfix";
  tokens: Token[];
  output: string[];
  stack: string[];
}
export interface NfaData {
  kind: "nfa";
  stack: Fragment[];
  popped: Fragment[];
}
export interface DfaData {
  kind: "dfa";
  subsets: Record<string, string[]>;
  worklist: string[];
  current: string | null;
  symbol: string | null;
  move: string[];
  closure: Closure | null;
  target: string | null;
}
export interface MinData {
  kind: "minimize";
  partitions: string[][];
  iteration: number;
  examined: string[];
  signatures: Record<string, number[]>;
  mapping: Record<string, string>;
  removed: string[];
}
export interface SimData {
  kind: "simulate";
  consumed: number;
  active: string[];
  symbol: string | null;
  closure: Closure | null;
  accepted: boolean | null;
}
export interface CompareData {
  kind: "compare";
  pair: string[];
  word: string;
  worklist: string[][];
  visited_count: number;
  disagreement: boolean;
}
export interface TraceEvent {
  id: string;
  index: number;
  stage: Stage | "simulate" | "compare";
  type: string;
  title: string;
  explanation: string;
  line: number;
  token: Token | null;
  graph: Graph | null;
  highlighted_states: string[];
  highlighted_transitions: string[];
  nfa_states: string[];
  nfa_transitions: string[];
  new_states: string[];
  new_transitions: string[];
  data: ParseData | NfaData | DfaData | MinData | SimData | CompareData;
}
export interface Compilation {
  regex: string;
  tokens: Token[];
  explicit: string;
  postfix: string;
  nfa: Graph;
  dfa: Graph;
  minimized: Graph;
  traces: Record<Stage, TraceEvent[]>;
  subsets: Record<string, string[]>;
  partitions: string[][];
  mapping: Record<string, string>;
  counts: Record<Kind, number>;
  warnings: string[];
}
export interface Simulation {
  regex: string;
  input: string;
  automaton: Graph;
  accepted: boolean;
  initial: string[];
  final: string[];
  trace: TraceEvent[];
  agreement: Record<Kind, boolean>;
}
export interface Comparison {
  valid: boolean;
  equivalent: boolean;
  alphabet: string[];
  counterexample: string | null;
  left: Graph;
  right: Graph;
  trace: TraceEvent[];
  left_path: TraceEvent[];
  right_path: TraceEvent[];
}
export interface LexDefinition {
  name: string;
  regex: string;
  skip: boolean;
  automaton: Graph;
}
export interface LexCandidate {
  token: string;
  lexeme: string;
  priority: number;
}
export interface LexToken extends LexCandidate {
  start: number;
  end: number;
}
export interface LexStep {
  position: number;
  candidates: LexCandidate[];
  chosen: LexToken;
  skipped: boolean;
}
export interface LexResult {
  input: string;
  definitions: LexDefinition[];
  tokens: LexToken[];
  steps: LexStep[];
}
export interface ApiError {
  code: string;
  message: string;
  position?: number | null;
  field?: string | null;
  details?: { field: string; message: string }[];
}
export const setText = (states: string[]) =>
  states.length ? `{${states.join(", ")}}` : "∅";
export const kindNames: Record<Kind, string> = {
  nfa: "ε-NFA",
  dfa: "DFA",
  minimized: "Minimized DFA",
};
