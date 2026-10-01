# Faculty demonstration (about 5–7 minutes)

## Opening

“AutomataLab compiles a theoretical regular expression into an NFA, DFA, and minimal DFA. Each graph and explanation comes from the computation for the expression you enter. You can inspect every recorded construction step.”

## 1. Parse the expression

Enter `(a|b)*ab` and click Generate automata. Describe its language: strings over `{a,b}` ending in `ab`. The status line reports 12 NFA states, 4 DFA states, and 3 minimal states.

Step through the parser. Point out source-token highlighting and the original character positions. The inserted dots make concatenation explicit. Jump to the last step and show postfix `ab|*a.b.`. Explain why star has higher precedence than concatenation, and concatenation higher precedence than union.

## 2. Construct the NFA

Open Build the ε-NFA. The first graph is empty. Step forward to create the two-state `a` fragment, then `b`, then union. Show the stack and the new epsilon branches. At star, point out the zero-repetition bypass and the repetition back-edge. Continue through concatenation.

Move backward: edges and fragment-stack contents must return to the earlier snapshot. Explain that concatenation adds an epsilon edge rather than adding states.

## 3. Discover the DFA

Open Construct the DFA. The NFA remains on the left; the right graph begins empty. Step through an epsilon closure and inspect its visited set and worklist. Explain that one DFA state is a set of NFA states. Show move followed by closure, discovery of a new subset, and reuse of an existing subset. Inspect the subset mapping and transition table.

Use the execution-history tab to jump to a transition creation without waiting through every closure traversal.

## 4. Minimize

Open Minimize the DFA. Start with accepting/non-accepting partitions. Show transition signatures in alphabet order and a partition split. Continue until stable. The four-state DFA becomes the three-state minimal DFA; the original table remains available for comparison.

Explain that unreachable-state removal is a separate operation and that a stable partition groups states with identical future acceptance behavior.

## 5. Simulate

Open Test the result. Enter `bab`, select Minimized DFA, and start. Advance by character: `b`, `a`, `b`. The final state accepts. Show that the independently simulated NFA, DFA, and minimized DFA agree. Repeat with `abb` to show rejection. If time permits, select ε-NFA and demonstrate the active-state set rather than a single path.

## 6. Compare languages

Open Regex comparator. Compare `a*b` against `ab`. The shortest witness is `b`; A accepts and B rejects. Replay the witness on both DFAs.

Then use the equivalent example `(a|b)*ab` versus `(b|a)*ab`. Explain that BFS explored reachable pairs with no acceptance disagreement. This is an exact language decision, not a few trial strings.

## Finish with robustness

Enter `a|` to show the useful error and highlighted position. Mention the documented restricted grammar and explicit computation limits. Export an SVG diagram or CSV table. Point out tests, architecture documentation, and that the app runs locally without external services.
