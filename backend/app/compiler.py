"""Composition of pure algorithms; no dependency on FastAPI."""

from app.algorithms.core import Automaton, Budget, CompileError, Limits
from app.algorithms.equivalence import compare
from app.algorithms.minimization import minimize
from app.algorithms.parser import parse
from app.algorithms.simulation import simulate
from app.algorithms.subset import determinize
from app.algorithms.thompson import thompson
from app.models import (
    CompareResult,
    CompileResult,
    LexCandidate,
    LexDefinition,
    LexResult,
    LexStep,
    LexToken,
    SimulationResult,
)


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


def tokenize_program(rules: list[tuple[str, str, bool]], text: str, limits: Limits) -> LexResult:
    budget = Budget(limits=limits, tracing=False)
    compiled = []
    definitions = []
    for priority, (name, expression, skip) in enumerate(rules):
        try:
            result, automata = compile_regex(expression, budget)
        except CompileError as error:
            error.field = f"rules.{priority}.regex"
            raise
        automaton = automata["minimized"]
        if automaton.start in automaton.accepting:
            error = CompileError(
                f"Token {name!r} accepts the empty string and could prevent scanning from advancing.",
                code="empty_token",
            )
            error.field = f"rules.{priority}.regex"
            raise error
        compiled.append((name, skip, automaton))
        definitions.append(LexDefinition(name=name, regex=expression, skip=skip, automaton=result.minimized))

    tokens = []
    steps = []
    position = 0
    while position < len(text):
        budget.check()
        candidates = []
        for priority, (name, _, automaton) in enumerate(compiled):
            state = automaton.start
            accepted_end = None
            for end in range(position, len(text)):
                symbol = text[end]
                if symbol not in automaton.alphabet:
                    break
                state = automaton.next(state, symbol)
                if state in automaton.accepting:
                    accepted_end = end + 1
            if accepted_end is not None:
                candidates.append(LexCandidate(token=name, lexeme=text[position:accepted_end], priority=priority))
        if not candidates:
            raise CompileError(
                f"No token rule matches the input at position {position} ({text[position]!r}).",
                position=position,
                code="lexical_error",
            )
        winner = max(candidates, key=lambda candidate: (len(candidate.lexeme), -candidate.priority))
        end = position + len(winner.lexeme)
        token = LexToken(**winner.model_dump(), start=position, end=end)
        skipped = compiled[winner.priority][1]
        steps.append(LexStep(position=position, candidates=candidates, chosen=token, skipped=skipped))
        if not skipped:
            tokens.append(token)
        position = end
    return LexResult(input=text, definitions=definitions, tokens=tokens, steps=steps)
