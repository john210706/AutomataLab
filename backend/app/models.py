"""Serializable algorithm results. None is epsilon, never an alphabet symbol."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field


class Token(BaseModel):
    value: str
    position: int
    synthetic: bool = False


class Transition(BaseModel):
    id: str
    source: str
    target: str
    symbol: str | None


class Graph(BaseModel):
    kind: Literal["nfa", "dfa", "minimized"]
    states: list[str]
    alphabet: list[str]
    start: str | None
    accepting: list[str]
    transitions: list[Transition]


class Fragment(BaseModel):
    start: str
    end: str
    states: list[str]


class ClosureData(BaseModel):
    seeds: list[str]
    current: str | None = None
    visited: list[str]
    worklist: list[str]
    discovered: list[str] = []
    edge: str | None = None


class ParseData(BaseModel):
    kind: Literal["parse"] = "parse"
    phase: Literal["tokenize", "concatenate", "postfix"]
    tokens: list[Token] = []
    output: list[str] = []
    stack: list[str] = []


class ThompsonData(BaseModel):
    kind: Literal["nfa"] = "nfa"
    stack: list[Fragment]
    popped: list[Fragment] = []


class SubsetData(BaseModel):
    kind: Literal["dfa"] = "dfa"
    subsets: dict[str, list[str]]
    worklist: list[str]
    current: str | None = None
    symbol: str | None = None
    move: list[str] = []
    closure: ClosureData | None = None
    target: str | None = None


class MinimizeData(BaseModel):
    kind: Literal["minimize"] = "minimize"
    partitions: list[list[str]]
    iteration: int = 0
    examined: list[str] = []
    signatures: dict[str, list[int]] = {}
    mapping: dict[str, str] = {}
    removed: list[str] = []


class SimulateData(BaseModel):
    kind: Literal["simulate"] = "simulate"
    consumed: int
    active: list[str]
    symbol: str | None = None
    closure: ClosureData | None = None
    accepted: bool | None = None


class CompareData(BaseModel):
    kind: Literal["compare"] = "compare"
    pair: list[str]
    word: str
    worklist: list[list[str]]
    visited_count: int
    disagreement: bool


EventData = Annotated[
    ParseData | ThompsonData | SubsetData | MinimizeData | SimulateData | CompareData,
    Field(discriminator="kind"),
]


class TraceEvent(BaseModel):
    id: str
    index: int
    stage: Literal["parse", "nfa", "dfa", "minimize", "simulate", "compare"]
    type: str
    title: str
    explanation: str
    line: int
    token: Token | None = None
    graph: Graph | None = None
    highlighted_states: list[str] = []
    highlighted_transitions: list[str] = []
    nfa_states: list[str] = []
    nfa_transitions: list[str] = []
    new_states: list[str] = []
    new_transitions: list[str] = []
    data: EventData


class CompileResult(BaseModel):
    regex: str
    tokens: list[Token]
    explicit: str
    postfix: str
    nfa: Graph
    dfa: Graph
    minimized: Graph
    traces: dict[str, list[TraceEvent]]
    subsets: dict[str, list[str]]
    partitions: list[list[str]]
    mapping: dict[str, str]
    counts: dict[str, int]
    warnings: list[str] = []


class SimulationResult(BaseModel):
    regex: str
    input: str
    automaton: Graph
    accepted: bool
    initial: list[str]
    final: list[str]
    trace: list[TraceEvent]
    agreement: dict[str, bool]


class CompareResult(BaseModel):
    valid: bool = True
    equivalent: bool
    alphabet: list[str]
    counterexample: str | None
    left: Graph
    right: Graph
    trace: list[TraceEvent]
    left_path: list[TraceEvent]
    right_path: list[TraceEvent]
