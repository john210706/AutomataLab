import type { Stage } from "./types";

export const examples = [
  "(a|b)*ab",
  "(a|b)*abb",
  "a*b",
  "(a|b)*",
  "(a|b)(a|b)",
  "a|ε",
];
export const stages: {
  id: Stage | "test";
  title: string;
  short: string;
  subtitle: string;
}[] = [
  {
    id: "parse",
    title: "Parse the regex",
    short: "Parse",
    subtitle: "From symbols to postfix",
  },
  {
    id: "nfa",
    title: "Build the ε-NFA",
    short: "ε-NFA",
    subtitle: "Thompson’s construction",
  },
  {
    id: "dfa",
    title: "Construct the DFA",
    short: "DFA",
    subtitle: "Subset construction",
  },
  {
    id: "minimize",
    title: "Minimize the DFA",
    short: "Minimize",
    subtitle: "Partition refinement",
  },
  {
    id: "test",
    title: "Test the result",
    short: "Test",
    subtitle: "Follow an input string",
  },
];
export const pseudocode: Record<string, string[]> = {
  parse: [
    "Read and validate each token",
    "Insert explicit concatenation",
    "Operand → output queue",
    "Push opening parenthesis",
    "Close group; pop until “(”",
    "Pop higher/equal precedence",
    "Push the current operator",
    "Flush stack to postfix output",
  ],
  nfa: [
    "Start with an empty fragment stack",
    "Literal / ε → two-state fragment",
    "Concat → connect left exit to right entry",
    "Union → branch and rejoin with ε",
    "Star → add bypass and repetition edges",
  ],
  dfa: [
    "Start at ε-closure(NFA start)",
    "For each symbol: move(subset, symbol)",
    "Traverse ε-closure of the moved set",
    "If new: create and enqueue subset",
    "Reuse existing subset; add transition",
    "Stop when the worklist is empty",
  ],
  minimize: [
    "Find and keep reachable states",
    "Partition accepting / non-accepting",
    "Compare destination partition signatures",
    "Split groups with different signatures",
    "Repeat until no partition changes",
    "Build one state per final partition",
  ],
  simulate: [
    "Start at the initial configuration",
    "Expand ε-closure for the NFA",
    "Consume symbol; follow matching edges",
    "Accept if a final active state accepts",
  ],
  compare: [
    "Complete DFAs over the union alphabet",
    "BFS state pairs; compare acceptance",
    "Enqueue unseen symbol successors",
    "Reconstruct the shortest disagreement",
  ],
};
export const reference = [
  {
    title: "Regular expressions",
    tag: "01 / LANGUAGE",
    text: "A regular expression describes a set of strings. Union chooses between languages, concatenation joins strings, and Kleene star repeats zero or more times. ε denotes the empty string.",
    formula: "Precedence: * > concatenation > |",
    example: "(a|b)*ab",
    detail:
      "The language of strings over {a, b} ending in ab. Here * applies to the whole parenthesized union.",
  },
  {
    title: "Thompson’s construction",
    tag: "02 / CONSTRUCTION",
    text: "Build a small NFA fragment for each operand, then combine fragments using the postfix operators. Every fragment has one entry and one exit; ε edges connect them without consuming input.",
    formula: "Regex → postfix → fragment stack → ε-NFA",
    example: "a|ε",
    detail:
      "Union creates a choice between consuming a and consuming nothing. An NFA can have multiple active states at once.",
  },
  {
    title: "Epsilon closure",
    tag: "03 / REACHABILITY",
    text: "The epsilon closure of a set includes that set and every state reachable through zero or more ε transitions. A visited set prevents infinite traversal of cycles.",
    formula: "ε-closure(S) = {q | ∃ s ∈ S, s →ε* q}",
    example: "(a*)*",
    detail:
      "Nested repetition creates epsilon cycles. Each state is discovered at most once during a closure traversal.",
  },
  {
    title: "Subset construction",
    tag: "04 / DETERMINIZATION",
    text: "A DFA state represents a set of NFA states. Follow one input symbol from every state in the set, then expand epsilon closure. Equal subsets reuse the same DFA state.",
    formula: "δD(S, a) = ε-closure(move(S, a))",
    example: "a(b|c)",
    detail:
      "The empty subset is a rejecting sink. Completeness is defined over the expression’s alphabet; ε is not an alphabet symbol.",
  },
  {
    title: "DFA minimization",
    tag: "05 / EQUIVALENCE CLASSES",
    text: "First remove unreachable states. Separate accepting from rejecting states, then split groups whenever a symbol leads their members to different current groups. Repeat until stable.",
    formula: "signature(q) = [block(δ(q, a)) for a ∈ Σ]",
    example: "(a|b)*ab",
    detail:
      "Four reachable subsets reduce to three states. Unreachable-state removal and merging equivalent states are different operations.",
  },
  {
    title: "String acceptance",
    tag: "06 / EXECUTION",
    text: "Consume every input character. A DFA has one active state; an NFA tracks a set of active states and expands epsilon closure. Acceptance is checked after the complete input is consumed.",
    formula: "Accept ⇔ active states ∩ accepting states ≠ ∅",
    example: "a*b",
    detail:
      "An empty test input represents ε. Typing the character ε as test input is different: it is a literal input character, outside the supported alphabet.",
  },
  {
    title: "Language equivalence",
    tag: "07 / PRODUCT SEARCH",
    text: "Complete both DFAs over their combined alphabet and explore pairs of states with breadth-first search. A pair with different acceptance gives a distinguishing string; no reachable disagreement proves equivalence.",
    formula: "L(A) = L(B) ⇔ no reachable pair disagrees",
    example: "a*b",
    detail:
      "Compare a*b with ab: b is a shortest counterexample. Breadth-first traversal also finds ε when the initial states disagree.",
  },
];
