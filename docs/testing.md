# Verification

Run commands are in the README. See `PROGRESS.md` for the latest executed results; this document describes what the checks cover, not a claim that every future checkout has passed.

## Backend

`test_compiler.py` checks the primary 12 → 4 → 3 construction, isomorphism to the reference minimized DFA, and all strings over `{a,b}` up to length six for the language ending in `ab`.

Parameterized cases cover literals, union, concatenation, repetition, epsilon, nested stars, ASCII digits/case, whitespace, and invalid grammar with exact source positions. Structural invariants cover valid endpoints, accepting states, initial states, transition identities, and complete deterministic transition functions.

Bounded acceptance comparisons run NFA, DFA, and minimized DFA against a test-only Python regex oracle. A seeded generator supplies 35 additional expression trees. This is empirical support for compiler behavior; full DFA language equivalence is also checked using product BFS, and bounded tests are not described as a proof.

Specific tests cover empty alphabets, epsilon cycles, accepting initial states, sink states, completion of partial DFAs, unreachable-state removal, different comparison alphabets, an empty-string witness, shortest witnesses, reproducibility, historical snapshot detachment, and all resource-limit categories.

`test_api.py` exercises real FastAPI validation/serialization, OpenAPI, routes, error positions, strict inputs, simulation, comparison, and local-only CORS.

## Frontend

Unit/component tests use Vitest, Testing Library, and jsdom. They cover timeline progression, speed, pause-on-seek, stage cleanup, accessible controls, stale-response suppression, network errors, synchronized transition tables, grouped edge identities, reverse curves, complete SVG export, and validation display.

Browser tests use Playwright Chromium against the real backend. They cover the complete compiler journey; growing and shrinking historical graphs; source/postfix output; subset mapping; minimized/original tables; state inspection; `bab` simulation and clickable history; comparison and witness replay including epsilon; invalid input and expression attribution; non-ASCII rejection; examples that do not auto-generate; workspace reset; autoplay; speed and seeking; light theme; SVG/PNG downloads; fullscreen; keyboard state inspection and movement preservation; fitting all states after a layout split; and a 390-pixel mobile viewport with no horizontal page overflow.

Screenshots are captured in `frontend/test-results/`. On failure, Playwright also saves traces and error screenshots. These are generated verification artifacts and are ignored by Git.

## Manual visual review

Inspect desktop and mobile screenshots for clipped panels, graph labels, accepting double circles, initial arrows, edge routes, contrast, and theme consistency. Test-generated screenshots should be reviewed after layout changes. Dense graph legibility should also be checked with zoom and manual state positioning, rather than relying only on DOM assertions.

Known environment notes: Python 3.14 can print a harmless virtualenv prefix warning when invoked through a path containing `..`; use an activated environment or an absolute interpreter path. The installed Starlette version warns about its `httpx` compatibility test client; tests still exercise actual HTTP behavior.
