"""Conventional two-state literal Thompson construction; concatenation adds an edge."""

from app.algorithms.core import Automaton, Budget
from app.algorithms.parser import ATOMS, LITERALS
from app.models import Fragment, ThompsonData, Token, TraceEvent


def thompson(postfix: list[Token], budget: Budget) -> tuple[Automaton, list[TraceEvent]]:
    nfa = Automaton("nfa", tuple(sorted({t.value for t in postfix if t.value in LITERALS})))
    stack, trace = [], []
    budget.record(trace, "nfa", "start", "An empty fragment stack", "Read the postfix expression from left to right.", 1,
                  ThompsonData(stack=[]), graph=nfa.graph())

    def state():
        return nfa.add_state(f"q{len(nfa.states)}", budget)

    for token in postfix:
        old_states, old_edges = len(nfa.states), len(nfa.transitions)
        value = token.value
        popped = []
        if value in ATOMS:
            start, end = state(), state()
            nfa.edge(start, end, None if value == "ε" else value)
            fragment = Fragment(start=start, end=end, states=[start, end])
            reason = f"Create {start} → {end} labeled {value}. " + ("Epsilon consumes no input." if value == "ε" else "This fragment consumes exactly one symbol.")
            line = 2
        elif value == ".":
            right, left = stack.pop(), stack.pop()
            popped = [left, right]
            nfa.edge(left.end, right.start, None)
            fragment = Fragment(start=left.start, end=right.end, states=left.states + right.states)
            reason = f"Connect {left.end} to {right.start} by ε. The left fragment must finish before the right starts."
            line = 3
        else:
            right = stack.pop()
            left = stack.pop() if value == "|" else None
            popped = [left, right] if left else [right]
            start, end = state(), state()
            nfa.edge(start, right.start, None)
            nfa.edge(right.end, end, None)
            if left:
                nfa.edge(start, left.start, None)
                nfa.edge(left.end, end, None)
                members = left.states + right.states
                reason = f"New entry {start} branches by ε to either fragment; both paths join at {end}."
                line = 4
            else:
                nfa.edge(start, end, None)
                nfa.edge(right.end, right.start, None)
                members = right.states
                reason = f"New entry {start} can bypass to {end} (zero repetitions), or enter {right.start}. The ε edge {right.end} → {right.start} permits repetition."
                line = 5
            fragment = Fragment(start=start, end=end, states=[start] + members + [end])
        stack.append(fragment)
        # During construction each fragment's exit is accepting within that fragment.
        nfa.start = stack[0].start
        nfa.accepting = {f.end for f in stack}
        budget.record(trace, "nfa", "fragment", f"Apply {'concatenation' if value == '.' else value}", reason, line,
                      ThompsonData(stack=stack.copy(), popped=popped), token=token, graph=nfa.graph(),
                      new_states=nfa.states[old_states:], new_transitions=[e.id for e in nfa.transitions[old_edges:]],
                      highlighted_states=fragment.states)
    return nfa, trace
