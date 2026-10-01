"""Exact product-automaton BFS; parent links reconstruct a shortest witness."""

from collections import deque

from app.algorithms.core import Automaton, Budget, CompileError
from app.algorithms.minimization import complete
from app.algorithms.simulation import simulate
from app.models import CompareData, CompareResult


def compare(left: Automaton, right: Automaton, budget: Budget) -> CompareResult:
    alphabet = sorted(set(left.alphabet) | set(right.alphabet))
    left, right = complete(left, alphabet, budget), complete(right, alphabet, budget)
    start = (left.start, right.start)
    queue, parents = deque([start]), {start: None}
    trace = []
    witness = None

    def word(pair):
        symbols = []
        while parents[pair] is not None:
            pair, symbol = parents[pair]
            symbols.append(symbol)
        return "".join(reversed(symbols))

    while queue:
        budget.check()
        pair = queue.popleft()
        disagreement = (pair[0] in left.accepting) != (pair[1] in right.accepting)
        prefix = word(pair)
        budget.record(trace, "compare", "visit", f"Inspect ({pair[0]}, {pair[1]})",
                      (f"The string {prefix or 'ε'} reaches different acceptance statuses." if disagreement else "Both states agree on acceptance; explore their symbol successors."),
                      2, CompareData(pair=list(pair), word=prefix, worklist=[list(p) for p in queue], visited_count=len(parents), disagreement=disagreement))
        if disagreement:
            witness = prefix
            break
        for symbol in alphabet:
            target = (left.next(pair[0], symbol), right.next(pair[1], symbol))
            if target not in parents:
                if len(parents) >= budget.limits.comparison_pairs:
                    raise CompileError("Comparison exceeds the product-state search limit.", code="resource_limit")
                parents[target] = (pair, symbol)
                queue.append(target)
    left_path = simulate(left, witness, budget)[3] if witness is not None else []
    right_path = simulate(right, witness, budget)[3] if witness is not None else []
    return CompareResult(equivalent=witness is None, alphabet=alphabet, counterexample=witness,
                         left=left.graph(), right=right.graph(), trace=trace, left_path=left_path, right_path=right_path)
