# AutomataLab progress

## Request and working agreement

Build the complete local educational regex compiler described in the supplied master prompt. Work carefully, verify actual behavior, and keep this file current so work can resume after a usage reset. Do not spend reset credits. No deployment, accounts, database, or optional lexer needed.

## Execution plan

1. Implement and test the restricted regex parser, Thompson construction, epsilon closure, subset construction, partition refinement, simulation, and exact equivalence checking.
2. Record typed snapshots of real algorithm operations; verify historical snapshots and final results.
3. Expose validated, resource-bounded FastAPI endpoints.
4. Build the React workspace, reusable graph renderer, and synchronized playback.
5. Complete simulation, comparison, reference material, and exports.
6. Run unit/API/browser tests, visually inspect the application, and document setup and the faculty demo.

## Decisions

- React/TypeScript/Vite/Tailwind + React Flow/Dagre; Python/FastAPI/Pydantic.
- Algorithms live independently from HTTP routes. Epsilon is `None` internally and `null` in JSON, rendered as ε.
- Immutable snapshots for bounded educational inputs; deterministic traversal and IDs.
- Explicit user dots are unsupported. Empty input requires ε. Repeated bare stars (`a**`) are rejected; nested repetition `(a*)*` is valid.
- Input alphabet consists only of ASCII letters and digits. Whitespace in regexes is ignored, but simulation strings are exact.
- All complete DFAs use a sink where required. Comparison completes both over the union alphabet.
- Shared playback and graph components; no invented algorithm events.

## Status

- Repository inspected: clean Git repository containing only a short README.
- Available: Node 24, npm 11, Python 3.14. No pre-existing application or tests.
- Initial usage check: five-hour allowance 94% remaining.
- Compiler algorithms, typed immutable trace snapshots, resource budgets, and FastAPI routes implemented.
- React workspace, parser visualization, reusable graph renderer, stage playback, simulation, comparator, reference pages, theme switching, local recent history, SVG/PNG/JSON/CSV export implemented.
- All seven planned milestones implemented, including Linux startup script and architecture/algorithm/API/testing/demo documentation.
- Browser-verified source parsing, intermediate graph restoration, epsilon handling, incremental minimization, exact comparisons, simulation, themes, mobile overflow, exports, fullscreen, and keyboard state inspection.
- Graph curves avoid sampled state obstacles and grouped edges highlight their consumed symbol individually. SVG export shares the same geometry.
- Visual review found and fixed a resize/fit race when switching from one graph to two. A ResizeObserver now refits to the actual canvas size. New browser assertions verify all minimized nodes remain within the canvas.
- Keyboard node positions persist across timeline changes; that regression is browser-tested.
- Core delivery complete on 2026-10-02. Final frontend regressions and production build passed; local preview is ready for user review.
- Final visual review confirmed readable self-loop/return-edge labels, full minimized-graph visibility, double accepting circles, initial arrows, and matching original/minimized mappings.

## Verification

- Backend: `cd backend && ../.venv/bin/python -m pytest -q`: **68 passed** (one Starlette/httpx deprecation warning).
- Frontend: `npm test` — **15 unit/component tests passed**. `npm run test:e2e` — **7 Chromium browser tests passed** on the final source, including viewport and keyboard-movement regressions (13.3 seconds).
- Frontend production build: **passed**, now split into chunks below 250 kB; the earlier bundle-size warning is resolved.
- Last build: `npm run build` (TypeScript + Vite) passed. `git diff --check` passed. Real backend health check returned `status: ok`.
- Frontend dependencies installed; npm reported zero known vulnerabilities.
- `bash scripts/dev.sh` started both servers successfully, including backend hot reload. Its signal handler was checked to stop the processes it owns. Local preview is running at `http://127.0.0.1:5173` (backend `http://127.0.0.1:8000`).
- Source specification: `/home/J4hn/.codex/attachments/de163faf-3cdb-4a7b-93f4-3bbbabc81573/pasted-text.txt`.
- The original five-hour window reset naturally during development; no reset credits were consumed. Last usage check at delivery: 8% of the new five-hour allowance remaining. The requested core scope finished before that remaining allowance was exhausted.

## Delivery files and operation

- Start both services from the repository root: `bash scripts/dev.sh`.
- Workspace: `http://127.0.0.1:5173`; API documentation: `http://127.0.0.1:8000/docs`.
- Dependencies are installed in `.venv` and `frontend/node_modules`; lockfiles are saved for clean setup.
- Main entry points: `backend/app/compiler.py`, `backend/app/main.py`, `frontend/src/App.tsx`.
- Documentation: README plus `docs/architecture.md`, `docs/algorithms.md`, `docs/api.md`, `docs/testing.md`, `docs/demo.md`, and `docs/requirements-checklist.md`.
- The local servers were left running for review. A browser panel was requested in Codex; the app reported it as queued for the task window.
- Source changes are saved in the working tree. No commits, pushes, or deployment were performed.

## Remaining limitations

- Optional multi-token lexer and additional regex syntax are not implemented.
- Large/dense automata can hit the documented resource limits or benefit from fullscreen/manual rearrangement. Routing is a bounded heuristic, not a universal optimal-layout guarantee.
- Browser tests ran in Chromium; Firefox/WebKit have not been claimed as tested.
- One upstream Starlette/httpx test-client deprecation warning remains; the API tests pass.

## Resume

Read this file and inspect Git status. The requested core application is implemented and verified. Do not restart implementation or infer that quota exhaustion left a missing milestone. Continue from user feedback or a newly requested enhancement, preserving existing work. If the preview has stopped, run the documented launcher. The optional lexical-analysis extension remains a separately considered extension.
