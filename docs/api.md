# REST API

All request bodies are JSON objects. Types are strict and unknown fields are rejected. The full nested response schema is available from `GET /openapi.json` and the interactive `/docs` page.

## POST /api/compile

```json
{"regex":"(a|b)*ab"}
```

Returns `regex`, source `tokens`, `explicit`, `postfix`, `nfa`, `dfa`, `minimized`, `traces`, `subsets`, final `partitions`, original-to-minimal `mapping`, `counts`, and `warnings`.

`traces` contains `parse`, `nfa`, `dfa`, and `minimize` arrays. Events have ordered indices, stable IDs, operation types, explanations, pseudocode lines, stage-specific typed data, and the relevant graph/highlight snapshots. A graph has `kind`, `states`, `alphabet`, nullable `start`, `accepting`, and `transitions`. Transition symbols are one character or `null` for epsilon.

## POST /api/simulate

```json
{"regex":"(a|b)*ab","input":"bab","automaton":"minimized"}
```

`automaton` is `nfa`, `dfa`, or `minimized` (default). `input` may be empty and is never trimmed. Returns the selected `automaton`, `accepted`, `initial` and `final` active-state sets, a replayable `trace`, and independently computed `agreement` results for all three representations.

## POST /api/compare

```json
{"left":"a*b","right":"ab"}
```

Returns `valid: true`, `equivalent`, sorted union `alphabet`, nullable `counterexample`, completed `left` and `right` graphs, product BFS `trace`, and `left_path` / `right_path` for witness replay. For this example the counterexample is `"b"`. Invalid expressions produce HTTP 422; the API never reports equivalence for invalid input.

`counterexample: ""` means epsilon distinguishes the expressions. `counterexample: null` means the languages are equivalent. Do not use a truthiness check to distinguish them.

## GET /api/health

Returns `status: "ok"` and active server limits. It does not compile an expression.

## POST /api/lex

```json
{
  "rules": [
    {"name": "KEYWORD", "regex": "if|then", "skip": false},
    {"name": "INTEGER", "regex": "(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)*", "skip": false}
  ],
  "input": "if42then"
}
```

Rules are ordered. The scanner chooses the longest accepted prefix; the earlier rule wins equal-length ties. A rule that accepts epsilon is rejected because it cannot advance the scanner. The response contains compiled minimized DFAs, emitted tokens with half-open source ranges, and each scanner step with all accepting candidates. Unmatched input returns `lexical_error` with its zero-based position.

## Error responses

Grammar and resource errors use HTTP 422:

```json
{"error":{"code":"invalid_regex","message":"Union operator is missing its right-hand operand.","position":1}}
```

Positions are zero-based original character offsets, including ignored whitespace. The UI displays one-based positions. Comparison grammar errors also include `field: "left"` or `field: "right"` so the UI identifies the invalid expression. Resource errors use `code: "resource_limit"`; no incomplete result accompanies them.

Schema errors use `code: "invalid_request"` and a `details` array of field/message pairs. Unexpected exceptions become HTTP 500 with a generic `internal_error` message; implementation details are logged locally, not returned to the browser.

Local CORS accepts `http://localhost:5173` and `http://127.0.0.1:5173`, GET/POST, and the Content-Type header. Vite development and preview use a same-origin proxy.
