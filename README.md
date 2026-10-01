# AutomataLab

An interactive regex-to-DFA compiler for learning Compiler Design. Follow an expression through tokenization, postfix conversion, Thompson ε-NFA construction, subset construction, and partition-refinement minimization. Every timeline step comes from the actual computation for your input.

## Run locally

Requires Python 3.11+ and Node.js 22.12+ (or a compatible newer LTS version). Development was verified with Python 3.14.7 and Node 24.20.0 on Linux. No account, database, external service, or API key is needed. Runtime requests stay local.

Fedora system dependencies, if missing:

```bash
sudo dnf install python3 python3-pip nodejs npm
```

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.lock
npm ci --prefix frontend
bash scripts/dev.sh
```

Open [AutomataLab](http://127.0.0.1:5173). Press Ctrl+C in the terminal to stop both servers. Installations need internet access; the installed app does not. Graphviz is not required: diagram exports use SVG and the browser's native canvas.

To run the servers separately, use two terminals from the repository root:

```bash
# Terminal 1
source .venv/bin/activate
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

```bash
# Terminal 2
npm run dev --prefix frontend
```

The frontend proxies `/api` requests to port 8000. FastAPI documentation is available at [Swagger UI](http://127.0.0.1:8000/docs). The backend and frontend bind to the local machine only.

## Use the lab

1. Enter a regex or select an example. Examples populate the editor without starting a request.
2. Click **Generate automata** (or press Enter in the editor).
3. Explore the five stages. Use Next/Previous, Play/Pause, the step slider, speed controls, or the clickable execution history.
4. Select a state to inspect its transitions, acceptance, and available subset/partition information. Drag states, use arrow keys on a focused state, zoom, enter fullscreen, or reset the graph layout.
5. Test strings on the ε-NFA, DFA, or minimized DFA. Empty input tests ε; spaces and all other test characters are consumed exactly.
6. Compare two regexes. The product search either proves equivalence or returns a shortest distinguishing string, with synchronized replay on both automata.
7. Export a graph or the current step as SVG, PNG, or JSON. Export transition tables as CSV, or the complete compilation and traces as JSON.

Light/dark theme and up to five recent compiled expressions are stored locally in your browser. Algorithm-stage switches reset playback to the first step; editing a regex clears the previous compilation. Manual timeline navigation pauses playback.

## Supported syntax

| Construct | Syntax | Meaning |
| --- | --- | --- |
| Literal | `a-z`, `A-Z`, `0-9` | Consume that exact character |
| Empty string | `ε` | Consume no character |
| Union | `a|b` | Either expression |
| Concatenation | `ab` | First `a`, then `b` |
| Repetition | `a*` | Zero or more repetitions |
| Group | `(a|b)` | Override precedence |

Precedence is `*`, then concatenation, then `|`. Whitespace in the regex is ignored and original character positions are preserved for errors. User-entered dots, escapes, ranges, `.`, `+`, `?`, `∅`, Unicode literals, empty groups, and empty expressions are unsupported. Use `ε` for an empty-string expression. `a**` is rejected as a repeated bare operator; `(a*)*` is valid.

Epsilon is `None` internally and `null` in JSON. It is never part of the alphabet. A typed `ε` in the **test string** is an ordinary character and is rejected because no consuming transition is labeled with it.

## Algorithms and architecture

- Custom tokenization and stack-based infix-to-postfix conversion.
- Original Thompson construction using two-state literal fragments and epsilon connections.
- Worklist epsilon closure with a visited set.
- Reachable subset construction with an empty-subset rejecting sink when necessary.
- Completion, unreachable-state removal, and repeated partition refinement.
- Exact NFA/DFA simulation and breadth-first product search for language equivalence.
- Typed, bounded snapshots for accurate backward navigation and synchronized tables, stacks, graphs, and explanations.

The Python algorithms do not use a regex engine or automata library to recognize languages. React Flow renders backend results; Dagre positions nodes. A Python regex engine appears only in tests as an independent reference for the supported grammar.

```text
frontend/src/
  App.tsx                 Navigation, editor, compilation state
  components/             Graphs, playback, explorer, simulator, comparator, tables
  hooks.ts                Abortable requests and shared playback
  graph.ts, export.ts     Layout, edge geometry, full-graph exports
  types.ts, content.ts    Typed contracts and educational reference
backend/app/
  main.py                 Validated FastAPI endpoints
  compiler.py             Algorithm composition
  models.py               Typed results and stage-specific events
  algorithms/             Original compiler and automata algorithms
backend/tests/            Algorithm, invariant, resource-limit, and API tests
frontend/src/tests/       Component, request, playback, layout, and export tests
frontend/e2e/             Real-browser workflows
docs/                    Architecture, algorithms, API, testing, faculty demo
PROGRESS.md              Current verification and resume notes
```

For `(a|b)*ab`, the conventional Thompson construction gives 12 NFA states, reachable subset construction gives 4 DFA states, and minimization gives 3 states. Its language is exactly the strings over `{a,b}` ending in `ab`. These counts are tested, not hardcoded.

## Tests and build

```bash
source .venv/bin/activate
cd backend
python -m pytest -q
cd ..
npm test --prefix frontend
npm run build --prefix frontend
```

Browser tests require the Playwright Chromium runtime:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

Browser tests automatically start the API and frontend if those ports are free, or reuse running local servers. Playwright may use its Ubuntu fallback browser build on Fedora; if it reports missing system libraries, install the specifically reported libraries using Fedora's package manager. Do not assume Playwright's Debian-oriented system installation command applies to Fedora.

`npm run preview --prefix frontend` serves a built frontend at [port 4173](http://127.0.0.1:4173), still using the local backend on port 8000. The production build is a local preview, not a hosted deployment.

## Limits and known tradeoffs

Defaults are designed for classroom examples, not industrial regex workloads:

| Environment variable | Default |
| --- | --- |
| `AUTOMATALAB_REGEX_LENGTH` | 256 characters |
| `AUTOMATALAB_STATES` | 512 states per automaton |
| `AUTOMATALAB_TRACE_EVENTS` | 8,000 events per request |
| `AUTOMATALAB_SNAPSHOT_ITEMS` | 600,000 weighted snapshot items |
| `AUTOMATALAB_COMPARISON_PAIRS` | 20,000 discovered state pairs |
| `AUTOMATALAB_INPUT_LENGTH` | 512 test characters |
| `AUTOMATALAB_SECONDS` | 5 seconds of computation |

Configure these before starting the backend. Exceeded limits produce explicit errors; partial automata are never reported as completed results. Subset construction can grow exponentially, so a short expression may still hit a state or trace limit. Frontend editor caps match the default limits; increasing server limits alone does not raise those UI caps.

- Snapshot history intentionally trades memory for easy, correct replay; payloads are bounded. The snapshot budget is a conservative weighted estimate, not a byte-exact memory limit.
- Dense graphs can require zooming or manual rearrangement; general optimal edge routing is outside this version.
- Test-string replay operates on the restricted ASCII input alphabet; Unicode and advanced production-regex syntax are not supported.
- SVG/PNG exports preserve all current nodes, edges, highlights, and manually moved positions. They use a readable light export theme rather than a screenshot of the whole interface. PNG dimensions are capped at 8,000 pixels on the longer side.
- The optional multi-token lexical analyzer is not implemented. Token priority and longest-match behavior belong to a later extension.
- These local development servers are not hardened for public hosting. Keep them on localhost.

See [architecture](docs/architecture.md), [algorithm explanations](docs/algorithms.md), [API contract](docs/api.md), [testing](docs/testing.md), the [requirements checklist](docs/requirements-checklist.md), and the [faculty demonstration](docs/demo.md). Actual run results and outstanding work are recorded in [PROGRESS.md](PROGRESS.md).
