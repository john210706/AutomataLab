"""Epsilon traversal and reachable-subset determinization."""

from collections import deque
from collections.abc import Callable, Collection

from app.algorithms.core import Automaton, Budget, ordered, set_label
from app.models import ClosureData, SubsetData, TraceEvent


def epsilon_closure(nfa: Automaton, seeds: Collection[str], budget: Budget, emit: Callable[[ClosureData], None] | None = None) -> frozenset[str]:
    visited = set(seeds)
    queue = deque(ordered(visited))

    def event(current=None, discovered=(), edge=None):
        if emit:
            emit(ClosureData(seeds=ordered(seeds), current=current, visited=ordered(visited),
                             worklist=list(queue), discovered=ordered(discovered), edge=edge))
    event()
    while queue:
        budget.check()
        current = queue.popleft()
        event(current)
        for edge in nfa.outgoing[(current, None)]:
            fresh = edge.target not in visited
            if fresh:
                visited.add(edge.target)
                queue.append(edge.target)
            event(current, [edge.target] if fresh else [], edge.id)
    return frozenset(visited)


def move(nfa: Automaton, states: Collection[str], symbol: str) -> tuple[frozenset[str], list[str]]:
    edges = [e for s in ordered(states) for e in nfa.outgoing[(s, symbol)]]
    return frozenset(e.target for e in edges), [e.id for e in edges]


def determinize(nfa: Automaton, budget: Budget) -> tuple[Automaton, dict[str, list[str]], list[TraceEvent]]:
    dfa = Automaton("dfa", nfa.alphabet)
    subsets, names, trace = {}, {}, []
    queue = deque()
    current = None
    symbol = None
    moved = frozenset()

    def data(closure=None, target=None):
        return SubsetData(subsets=subsets.copy(), worklist=list(queue), current=current,
                          symbol=symbol, move=ordered(moved), closure=closure, target=target)

    def closure_event(closure):
        if closure.current is None:
            reason = f"Start ε-closure from {set_label(closure.seeds)}, including the seeds themselves."
        elif closure.edge:
            reason = f"Follow an ε edge from {closure.current}. " + (f"Discover and enqueue {set_label(closure.discovered)}." if closure.discovered else "Its target is already visited; do not enqueue it again.")
        else:
            reason = f"Remove {closure.current} from the worklist and inspect its outgoing ε transitions."
        budget.record(trace, "dfa", "closure", "Explore ε-closure", reason, 3, data(closure), graph=dfa.graph(),
                      highlighted_states=[current] if current else [], nfa_states=closure.visited,
                      nfa_transitions=[closure.edge] if closure.edge else [])

    def discover(subset):
        name = dfa.add_state(f"D{len(names)}", budget)
        names[subset] = name
        subsets[name] = ordered(subset)
        if nfa.accepting.intersection(subset):
            dfa.accepting.add(name)
        queue.append(name)
        return name

    initial = epsilon_closure(nfa, {nfa.start}, budget, closure_event if budget.tracing else None)
    dfa.start = discover(initial)
    budget.record(trace, "dfa", "initial", "Create initial subset D0", f"D0 = ε-closure({nfa.start}) = {set_label(initial)}.", 1,
                  data(target=dfa.start), graph=dfa.graph(), new_states=[dfa.start], nfa_states=ordered(initial))
    while queue:
        current = queue.popleft()
        subset = subsets[current]
        for symbol in dfa.alphabet:
            moved, edges = move(nfa, subset, symbol)
            budget.record(trace, "dfa", "move", f"move({current}, {symbol})",
                          f"From {set_label(subset)}, follow only {symbol!r} edges to get {set_label(moved)}.", 2,
                          data(), graph=dfa.graph(), highlighted_states=[current], nfa_states=ordered(set(subset) | moved), nfa_transitions=edges)
            closure = epsilon_closure(nfa, moved, budget, closure_event if budget.tracing else None)
            fresh = closure not in names
            target = discover(closure) if fresh else names[closure]
            edge = dfa.edge(current, target, symbol)
            reason = f"ε-closure(move) = {set_label(closure)}. " + (f"Create {target}" if fresh else f"Reuse {target}, which represents exactly this subset") + f" and add {current} —{symbol}→ {target}."
            if not closure:
                reason += " The empty subset is a rejecting sink."
            budget.record(trace, "dfa", "transition", f"{current} —{symbol}→ {target}", reason, 4 if fresh else 5,
                          data(target=target), graph=dfa.graph(), highlighted_states=[current, target],
                          highlighted_transitions=[edge.id], new_states=[target] if fresh else [],
                          new_transitions=[edge.id], nfa_states=ordered(closure))
    budget.record(trace, "dfa", "complete", "DFA complete", "Every reachable subset has been processed; each state has one transition per alphabet symbol.", 6,
                  data(), graph=dfa.graph())
    return dfa, subsets, trace
