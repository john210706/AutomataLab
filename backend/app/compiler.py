"""Composition of pure algorithms; no dependency on FastAPI."""

from app.algorithms.core import Automaton, Budget, CompileError, Limits
from app.algorithms.equivalence import compare
from app.algorithms.minimization import minimize
from app.algorithms.parser import parse
from app.algorithms.simulation import simulate
from app.algorithms.subset import determinize
from app.algorithms.thompson import thompson
from app.models import CompareResult, CompileResult, SimulationResult


def compile_regex(expression: str, budget: Budget | None = None) -> tuple[CompileResult, dict[str, Automaton]]:
    budget = budget or Budget()
    tokens, explicit, postfix, parse_trace = parse(expression, budget)
    nfa, nfa_trace = thompson(postfix, budget)
    dfa, subsets, dfa_trace = determinize(nfa, budget)
    minimized, partitions, mapping, min_trace = minimize(dfa, budget)
    result = CompileResult(regex=expression, tokens=tokens, explicit="".join(t.value for t in explicit),
                           postfix="".join(t.value for t in postfix), nfa=nfa.graph(), dfa=dfa.graph(), minimized=minimized.graph(),
                           traces={"parse": parse_trace, "nfa": nfa_trace, "dfa": dfa_trace, "minimize": min_trace},
                           subsets=subsets, partitions=partitions, mapping=mapping,
                           counts={"nfa": len(nfa.states), "dfa": len(dfa.states), "minimized": len(minimized.states)})
    return result, {"nfa": nfa, "dfa": dfa, "minimized": minimized}


def simulate_regex(expression: str, text: str, kind: str, limits: Limits) -> SimulationResult:
    budget = Budget(limits=limits, tracing=False)
    _, automata = compile_regex(expression, budget)
    agreement = {name: simulate(a, text, budget)[0] for name, a in automata.items()}
    budget.tracing = True
    accepted, initial, final, trace = simulate(automata[kind], text, budget)
    return SimulationResult(regex=expression, input=text, automaton=automata[kind].graph(), accepted=accepted,
                            initial=initial, final=final, trace=trace, agreement=agreement)


def compare_regex(left: str, right: str, limits: Limits) -> CompareResult:
    budget = Budget(limits=limits, tracing=False)
    compiled = {}
    for field, expression in (("left", left), ("right", right)):
        try:
            compiled[field] = compile_regex(expression, budget)[1]["dfa"]
        except CompileError as error:
            error.field = field
            raise
    budget.tracing = True
    return compare(compiled["left"], compiled["right"], budget)
