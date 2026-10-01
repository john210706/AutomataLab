"""Small automaton representation and shared computation/trace budgets."""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass, field
from time import monotonic
from typing import Literal

from app.models import EventData, Graph, TraceEvent, Transition


class CompileError(ValueError):
    def __init__(self, message: str, position: int | None = None, code: str = "invalid_regex"):
        super().__init__(message)
        self.position = position
        self.code = code
        self.field: str | None = None


@dataclass(frozen=True)
class Limits:
    regex_length: int = 256
    states: int = 512
    trace_events: int = 8000
    snapshot_items: int = 600_000
    comparison_pairs: int = 20_000
    input_length: int = 512
    seconds: float = 5.0


@dataclass
class Budget:
    limits: Limits = field(default_factory=Limits)
    started: float = field(default_factory=monotonic)
    events: int = 0
    items: int = 0
    tracing: bool = True

    def check(self) -> None:
        if monotonic() - self.started > self.limits.seconds:
            raise CompileError("Computation exceeded the time limit. Try a smaller expression.", code="resource_limit")

    def states(self, count: int) -> None:
        self.check()
        if count > self.limits.states:
            raise CompileError(f"Automaton exceeds the {self.limits.states}-state limit.", code="resource_limit")

    def record(self, trace: list[TraceEvent], stage: str, event_type: str, title: str,
               explanation: str, line: int, data: EventData, **kwargs) -> None:
        self.check()
        if not self.tracing:
            return
        self.events += 1
        graph = kwargs.get("graph")
        # Count graph and data payload, including subset/partition/worklist snapshots.
        self.items += (len(graph.states) + len(graph.transitions) if graph else 0)
        self.items += len(data.model_dump_json()) // 8 + 1
        if self.events > self.limits.trace_events or self.items > self.limits.snapshot_items:
            raise CompileError("Execution history exceeds the trace limit. Try a smaller expression.", code="resource_limit")
        # ponytail: bounded full snapshots; use structural sharing if larger inputs are needed.
        trace.append(TraceEvent(
            id=f"{stage}-{len(trace)}", index=len(trace), stage=stage, type=event_type,
            title=title, explanation=explanation, line=line, data=data, **kwargs,
        ).model_copy(deep=True))


@dataclass
class Automaton:
    kind: Literal["nfa", "dfa", "minimized"]
    alphabet: tuple[str, ...]
    states: list[str] = field(default_factory=list)
    start: str | None = None
    accepting: set[str] = field(default_factory=set)
    transitions: list[Transition] = field(default_factory=list)
    outgoing: dict[tuple[str, str | None], list[Transition]] = field(default_factory=lambda: defaultdict(list), repr=False)

    def add_state(self, name: str, budget: Budget) -> str:
        budget.states(len(self.states) + 1)
        self.states.append(name)
        return name

    def edge(self, source: str, target: str, symbol: str | None) -> Transition:
        edge = Transition(id=f"{self.kind}-e{len(self.transitions)}", source=source, target=target, symbol=symbol)
        self.transitions.append(edge)
        self.outgoing[(source, symbol)].append(edge)
        return edge

    def graph(self) -> Graph:
        return Graph(kind=self.kind, states=self.states.copy(), alphabet=list(self.alphabet),
                     start=self.start, accepting=ordered(self.accepting), transitions=self.transitions.copy())

    def next(self, state: str, symbol: str) -> str:
        return self.outgoing[(state, symbol)][0].target


def ordered(states: Iterable[str]) -> list[str]:
    """Natural state order without depending on set/hash iteration."""
    return sorted(states, key=lambda s: (s.rstrip("0123456789"), int(s[len(s.rstrip("0123456789")):] or 0)))


def set_label(states: Iterable[str]) -> str:
    return "{" + ", ".join(ordered(states)) + "}" if states else "∅"
