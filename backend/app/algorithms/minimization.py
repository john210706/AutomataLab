"""Complete-DFA partition refinement. No library automata operations."""

from collections import deque
from collections.abc import Iterable

from app.algorithms.core import Automaton, Budget, ordered, set_label
from app.models import MinimizeData, TraceEvent


def complete(dfa: Automaton, alphabet: Iterable[str], budget: Budget) -> Automaton:
    result = Automaton(dfa.kind, tuple(sorted(alphabet)), dfa.states.copy(), dfa.start, dfa.accepting.copy())
    budget.states(len(result.states))
    for e in dfa.transitions:
        result.edge(e.source, e.target, e.symbol)
    sink = "sink"
    while sink in result.states:
        sink += "_"
    missing = [(s, a) for s in result.states for a in result.alphabet if not result.outgoing[(s, a)]]
    if missing:
        result.add_state(sink, budget)
        for s, a in missing:
            result.edge(s, sink, a)
        for a in result.alphabet:
            result.edge(sink, sink, a)
    return result


def minimize(original: Automaton, budget: Budget) -> tuple[Automaton, list[list[str]], dict[str, str], list[TraceEvent]]:
    dfa = complete(original, original.alphabet, budget)
    reachable, queue = {dfa.start}, deque([dfa.start])
    while queue:
        budget.check()
        for a in dfa.alphabet:
            target = dfa.next(queue[0], a)
            if target not in reachable:
                reachable.add(target)
                queue.append(target)
        queue.popleft()
    removed = ordered(set(dfa.states) - reachable)
    partitions = [ordered(p) for p in (reachable - dfa.accepting, reachable & dfa.accepting) if p]
    trace = []
    budget.record(trace, "minimize", "reachable", "Remove unreachable states",
                  f"Traverse from {dfa.start}. " + (f"Remove {set_label(removed)}." if removed else "All states are reachable; nothing is removed.") + " Reachability is separate from equivalence merging.", 1,
                  MinimizeData(partitions=[], removed=removed), graph=dfa.graph(), highlighted_states=ordered(reachable))
    dfa.states = [s for s in dfa.states if s in reachable]
    dfa.accepting &= reachable
    dfa.transitions = [e for e in dfa.transitions if e.source in reachable]
    budget.record(trace, "minimize", "initial", "Separate accepting and rejecting states",
                  "States with different acceptance cannot be equivalent, even before reading a symbol.", 2,
                  MinimizeData(partitions=partitions, removed=removed), graph=dfa.graph())
    iteration = 0
    while True:
        iteration += 1
        membership = {s: i for i, group in enumerate(partitions) for s in group}
        refined = []
        changed = False
        for group_index, group in enumerate(partitions):
            budget.check()
            signatures = {s: [membership[dfa.next(s, a)] for a in dfa.alphabet] for s in group}
            buckets = {}
            for s in group:
                buckets.setdefault(tuple(signatures[s]), []).append(s)
            split = list(buckets.values())
            budget.record(trace, "minimize", "inspect", f"Examine partition {group_index}",
                          f"In alphabet order {list(dfa.alphabet)}, each signature lists destination partition numbers. " +
                          ("Different signatures require a split." if len(split) > 1 else "All signatures agree in this iteration."), 3,
                          MinimizeData(partitions=partitions, iteration=iteration, examined=group, signatures=signatures),
                          graph=dfa.graph(), highlighted_states=group)
            refined.extend(split)
            if len(split) > 1:
                changed = True
        if not changed:
            break
        partitions = refined
        budget.record(trace, "minimize", "split", f"Refinement round {iteration}",
                      "Split every group by its transition signature, using the previous round's partition numbers consistently.", 4,
                      MinimizeData(partitions=partitions, iteration=iteration), graph=dfa.graph())
    # Stable order with the initial partition first gives reproducible minimized names.
    partitions.sort(key=lambda group: (dfa.start not in group, dfa.states.index(group[0])))
    mapping = {s: f"M{i}" for i, group in enumerate(partitions) for s in group}
    result = Automaton("minimized", dfa.alphabet)
    budget.record(trace, "minimize", "stable", "Partitions are stable", "No signatures split a group. Each final equivalence class becomes one state.", 5,
                  MinimizeData(partitions=partitions, iteration=iteration, mapping=mapping), graph=dfa.graph())
    for i, group in enumerate(partitions):
        name = result.add_state(f"M{i}", budget)
        if dfa.start in group:
            result.start = name
        if dfa.accepting.intersection(group):
            result.accepting.add(name)
        budget.record(trace, "minimize", "merge", f"Merge {set_label(group)} into {name}",
                      "Create one state for this equivalence class, preserving its initial and accepting status.", 6,
                      MinimizeData(partitions=partitions, iteration=iteration, mapping=mapping, examined=group),
                      graph=result.graph(), highlighted_states=[name], new_states=[name])
    for i, group in enumerate(partitions):
        edges = [result.edge(f"M{i}", mapping[dfa.next(group[0], a)], a).id for a in dfa.alphabet]
        budget.record(trace, "minimize", "transitions", f"Rebuild transitions from M{i}",
                      "All members have the same acceptance and destination classes, so one representative defines these transitions.", 6,
                      MinimizeData(partitions=partitions, iteration=iteration, mapping=mapping, examined=group),
                      graph=result.graph(), highlighted_states=[f"M{i}"], new_transitions=edges)
    budget.record(trace, "minimize", "complete", "Minimal DFA ready", f"{len(dfa.states)} reachable states become {len(result.states)} distinguishable states.", 6,
                  MinimizeData(partitions=partitions, iteration=iteration, mapping=mapping), graph=result.graph())
    return result, partitions, mapping, trace
