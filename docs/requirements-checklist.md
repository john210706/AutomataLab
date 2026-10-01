# Delivery checklist

This maps the mandatory master-prompt scope to the implementation. Test counts and the latest run status live in `PROGRESS.md`.

| Requirement | Implementation and verification |
| --- | --- |
| Restricted, documented grammar | Parser validates ASCII literals, epsilon, union, concatenation, star, grouping, whitespace, and original error positions. Invalid cases are parameterized in backend tests. |
| Actual parser execution | Token reads, inserted dots, output changes, and stack operations are recorded in the parser and shown against the source text. |
| Thompson construction | Original fragment-stack algorithm; intermediate graphs, combined fragments, new states, and new edges are recorded. Backward replay is checked in the browser. |
| Epsilon closure | Visited-set traversal with seeds, current state, explored edge, newly discovered states, and worklist; integrated into subset construction and NFA simulation. Cycles and empty alphabets are tested. |
| DFA construction | Reachable subsets, sorted symbols, move/closure, subset reuse, accepting subsets, and empty-subset sink. NFA/DFA diagrams and subset/transition tables are synchronized. |
| DFA minimization | Complete transitions; remove unreachable states; refine acceptance groups by destination signatures; merge one class per step; rebuild transitions. Original and minimized graphs remain comparable. |
| Shared playback | First/previous/play/pause/next/last/restart, click/drag timeline, speed, event count, and clickable history. Timers clean up on stage changes. Manual seeks pause even at the same slider value. |
| String simulator | Exact input including empty input; NFA active sets and epsilon traversal; DFA/minimal simulation; character navigation, detailed history, transition highlights, and independently calculated agreement. |
| Regex equivalence | Complete over the union alphabet; exact product BFS; reproducible shortest witness including epsilon; paired graph replay; send the witness to either simulator. |
| Graph renderer | Shared React Flow components with Dagre layout, initial arrows, double accepting circles, loops, curved edges, individual grouped-label highlights, state inspection, manual/keyboard movement, zoom/pan/fit/reset, and fullscreen. |
| Historical state fidelity | Deeply detached snapshots; selected graph, stacks, subsets, partitions, explanations, and tables derive from the same event. Unit and browser tests verify restoration. |
| Interface and education | Workspace/converter/simulator/comparator/reference navigation, examples, reset, dark/light themes, mobile layout, accessible control labels, pseudocode, and general reference explanations separated from computed explanations. |
| API and models | Typed Pydantic results and stage-discriminated event data; compile/simulate/compare/health routes; OpenAPI; strict requests; structured errors and local CORS. |
| Exports | Current graph/step SVG, PNG, and JSON; full compilation JSON; transition-table CSV. Bounds include all nodes and long labels rather than the visible viewport. |
| Performance and reliability | Limits on regex/input length, states, events, snapshot estimate, comparison pairs, and computation time. Abort plus request identity prevents stale UI results. Explicit failure instead of incomplete automata. |
| Required example | `(a|b)*ab` yields 12 → 4 → 3 states. Isomorphic minimal transitions are tested, and `bab` is accepted through a real browser journey. |
| Tests | Original-language oracle comparisons, seeded generated expressions, exact DFA equivalence, graph invariants, detached histories, limits, HTTP tests, frontend controls, and real browser workflows. |
| Local delivery | Dependency locks, Linux/Fedora installation notes, combined development launcher, production build, architecture/algorithm/API/test docs, and faculty demonstration. |

## Deliberate limits

- The optional lexical-analysis extension, escaped literals, `+`, `?`, character classes, and empty-language syntax are outside this version.
- Graph routing uses a bounded curve heuristic; dense graphs may need zoom, fullscreen, or manual rearrangement. It does not promise a crossing-free layout for every input.
- Partition refinement is the straightforward educational algorithm, not Hopcroft's optimized algorithm.
- Full snapshots simplify replay but impose a documented trace-size ceiling. PNG exports cap their long side at 8,000 pixels.
- Browser verification uses Chromium. Firefox/WebKit behavior is not claimed as tested.
- Local development/preview is implemented; no public deployment was requested or performed.
