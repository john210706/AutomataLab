# Compiler algorithms

## Grammar and postfix

```text
expression := union
union      := concat ('|' concat)*
concat     := repeat repeat*
repeat     := atom ['*']
atom       := ASCII_LETTER | DIGIT | 'ε' | '(' expression ')'
```

Whitespace is skipped while preserving original source positions. Validation tracks whether an operand is expected and maintains opening-parenthesis positions. Empty union operands, misplaced/repeated stars, empty groups, unbalanced groups, and unsupported characters are errors.

Concatenation is inserted between a token that can end an expression (literal, epsilon, `)`, `*`) and a token that can start one (literal, epsilon, `(`). The shunting-yard converter outputs operands immediately, uses parentheses as stack boundaries, and pops operators with greater or equal precedence. Precedence is `* > . > |`.

For `(a|b)*ab`, the explicit representation is `(a|b)*.a.b`, and postfix is `ab|*a.b.`. Token reads, dot insertion, stack pushes/pops, and output changes are recorded independently.

## Thompson construction

Read postfix tokens with a fragment stack. A fragment has one entry and one exit.

- A literal creates two states and a consuming edge. Epsilon creates two states and an epsilon edge.
- Concatenation pops right and left fragments, connects the left exit to the right entry by epsilon, and keeps the outer endpoints. It creates no new states.
- Union creates a new entry and exit, with epsilon branches into both fragments and epsilon joins from both exits.
- Star creates a new entry and exit, adds a bypass for zero repetitions, entry/exit connections, and an epsilon back-edge for repetition.

During construction, disconnected fragments are a working forest rather than a single completed automaton; each stack fragment's exit is marked accepting within that fragment. The final stack contains one fragment. State IDs are assigned in creation order.

Inductively, each construction rule preserves the regex operation's language. With two-state literals and new union/star endpoints, `(a|b)*ab` uses 12 states. Parsing and NFA construction take linear algorithmic time in expression size, excluding snapshot-copy costs.

## Epsilon closure and subset construction

Initialize the closure's visited set and FIFO worklist with the seeds. Repeatedly inspect a state and follow its epsilon edges, adding only newly discovered targets. Including the seeds accounts for zero epsilon transitions. A visited set guarantees termination even for `(ε*)*`.

A DFA state's identity is an immutable NFA subset. Start with `ε-closure({nfa.start})`. For each queued subset S and alphabet symbol a, compute:

```text
move(S, a) = {t | an a-edge connects some state of S to t}
next(S, a) = ε-closure(move(S, a))
```

Create and enqueue an unseen subset, or reuse the existing state for an equal subset. A subset accepts exactly when it intersects the NFA accepting set. The empty subset is a rejecting sink with transitions back to itself. With an empty alphabet, no consuming transitions are required.

This invariant explains determinization: after any consumed prefix, the DFA state represents exactly the NFA's possible active states. A DFA can have up to 2^N subsets for an N-state NFA; resource limits therefore apply even to short inputs.

## Partition refinement

Complete transitions first and traverse the initial state to remove unreachable states. Initially partition reachable states into non-accepting and accepting groups, omitting empty groups.

For each state, compute the ordered vector of destination partition numbers under the sorted alphabet. Split each group by these signatures. Every signature in a round uses the same old partition mapping; splits are applied between rounds. Repeat until no group splits.

States separated by acceptance or a destination class have a distinguishing suffix. At a fixed point, states in a group share acceptance and send every symbol to the same equivalence classes, so replacing a group with one state preserves the language. Name the initial state's final group M0, then reconstruct transitions through the final mapping.

This is straightforward repeated refinement, not Hopcroft's optimized algorithm. It is suitable for the bounded classroom DFA sizes. Worst-case refinement work is O(|Σ| × |Q|²), excluding snapshot copies. The original DFA remains available for comparison.

## Simulation

For an NFA, start at the initial epsilon closure. For each input character, take the union of matching outgoing transitions and then expand epsilon closure. All active states are retained. For a DFA the active set has at most one state. A symbol outside the alphabet leads to the empty active set.

After consuming the complete input, accept iff the active set intersects the accepting set. No early accepting state can accept unread trailing input. Empty input checks the initial configuration. The three automata are simulated independently to report agreement.

## Exact language equivalence

Complete both DFAs over the union of their alphabets. Explore their product from the pair of initial states with BFS. If exactly one member of a visited pair is accepting, reconstruct the path's symbols through parent links.

Each product edge consumes one symbol, so BFS discovers a shortest distinguishing string. Sorted alphabet expansion makes ties reproducible. An initial disagreement yields the empty string (`""`), distinct from `null`, which means no counterexample exists.

If every reachable pair agrees, all strings have the same acceptance result and the languages are equivalent. The search costs O(|Σ| × |QL| × |QR|) in the worst case, excluding trace storage. Testing a few strings is never used as the equivalence decision.
