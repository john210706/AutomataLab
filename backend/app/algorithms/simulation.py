"""Exact character consumption with sets of active NFA states."""

from app.algorithms.core import Automaton, Budget, CompileError, ordered, set_label
from app.algorithms.subset import epsilon_closure, move
from app.models import SimulateData, TraceEvent


def simulate(automaton: Automaton, text: str, budget: Budget) -> tuple[bool, list[str], list[str], list[TraceEvent]]:
    if len(text) > budget.limits.input_length:
        raise CompileError(f"Test string exceeds {budget.limits.input_length} characters.", code="resource_limit")
    trace = []
    consumed = 0
    symbol = None

    def closure_event(closure):
        budget.record(trace, "simulate", "closure", "Expand ε-closure", "Follow epsilon edges without consuming input; keep every simultaneously active state.", 2,
                      SimulateData(consumed=consumed, active=closure.visited, symbol=symbol, closure=closure),
                      graph=automaton.graph(), highlighted_states=closure.visited,
                      highlighted_transitions=[closure.edge] if closure.edge else [])

    active = frozenset({automaton.start})
    if automaton.kind == "nfa":
        active = epsilon_closure(automaton, active, budget, closure_event if budget.tracing else None)
    initial = ordered(active)
    budget.record(trace, "simulate", "initial", "Initial configuration", f"Before consuming input, active states are {set_label(active)}.", 1,
                  SimulateData(consumed=0, active=initial), graph=automaton.graph(), highlighted_states=initial)
    for consumed, symbol in enumerate(text, 1):
        budget.check()
        active, edges = move(automaton, active, symbol)
        budget.record(trace, "simulate", "consume", f"Read {symbol!r}", f"Consume character {consumed}; symbol transitions reach {set_label(active)}.", 3,
                      SimulateData(consumed=consumed, active=ordered(active), symbol=symbol), graph=automaton.graph(),
                      highlighted_states=ordered(active), highlighted_transitions=edges)
        if automaton.kind == "nfa":
            active = epsilon_closure(automaton, active, budget, closure_event if budget.tracing else None)
    accepted = bool(automaton.accepting.intersection(active))
    reason = "At least one active state is accepting." if accepted else ("No active state remains; the input has no valid run." if not active else "Input ended without an active accepting state.")
    budget.record(trace, "simulate", "result", "Accepted" if accepted else "Rejected", reason, 4,
                  SimulateData(consumed=len(text), active=ordered(active), accepted=accepted), graph=automaton.graph(), highlighted_states=ordered(active))
    return accepted, initial, ordered(active), trace
