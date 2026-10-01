"""Behavioral and structural checks, including an independent test-only oracle."""

from dataclasses import replace
from itertools import product
import random
import re

import pytest

from app.algorithms.core import Automaton, Budget, CompileError, Limits
from app.algorithms.equivalence import compare
from app.algorithms.minimization import minimize
from app.algorithms.parser import parse
from app.algorithms.simulation import simulate
from app.algorithms.subset import epsilon_closure
from app.compiler import compare_regex, compile_regex, simulate_regex


def words(alphabet, length=4):
    return ["".join(chars) for n in range(length + 1) for chars in product(alphabet, repeat=n)]


def validate_graph(graph, complete=True):
    states = set(graph.states)
    assert len(states) == len(graph.states)
    assert graph.start in states
    assert set(graph.accepting) <= states
    assert len({e.id for e in graph.transitions}) == len(graph.transitions)
    assert "ε" not in graph.alphabet
    for e in graph.transitions:
        assert e.source in states and e.target in states
        assert e.symbol is None or e.symbol in graph.alphabet
    if complete and graph.kind != "nfa":
        for state in states:
            for symbol in graph.alphabet:
                assert sum(e.source == state and e.symbol == symbol for e in graph.transitions) == 1


def test_primary_acceptance_example():
    result, automata = compile_regex("(a|b)*ab")
    assert result.explicit == "(a|b)*.a.b"
    assert result.postfix == "ab|*a.b."
    assert result.counts == {"nfa": 12, "dfa": 4, "minimized": 3}
    mini = automata["minimized"]
    s0 = mini.start
    s1 = mini.next(s0, "a")
    s2 = mini.next(s1, "b")
    assert len({s0, s1, s2}) == 3
    assert mini.accepting == {s2}
    assert [mini.next(s, a) for s in (s0, s1, s2) for a in "ab"] == [s1, s0, s1, s2, s1, s0]
    for word in words("ab", 6):
        for automaton in automata.values():
            assert simulate(automaton, word, Budget(tracing=False))[0] == word.endswith("ab")


@pytest.mark.parametrize("expression", [
    "a", "b", "a*", "(a|b)*", "a|b", "ab", "a(b|c)", "ε", "a|ε", "εa",
    "(a|b)*ab", "(a|b)*abb", "a(b|c)*", "(ε|a)*", "(a*)*", "ε*", "A1|2", " a ( b | ε ) ",
])
def test_languages_and_invariants(expression):
    result, automata = compile_regex(expression)
    reference = "".join(expression.split()).replace("ε", "(?:)")
    for graph in (result.nfa, result.dfa, result.minimized):
        validate_graph(graph)
    for word in words(result.dfa.alphabet, 4) + ["#"]:
        # Python regex is used only as an independent test oracle, never by the compiler.
        expected = re.fullmatch(reference, word) is not None
        assert all(simulate(a, word, Budget(tracing=False))[0] == expected for a in automata.values())
    assert compare(automata["dfa"], automata["minimized"], Budget(tracing=False)).equivalent


@pytest.mark.parametrize("expression,position", [
    ("", 0), ("  ", 0), ("a|", 1), ("*a", 0), ("(ab", 0), ("a||b", 2), ("()", 1),
    ("a**", 2), ("a.b", 1), ("a+", 1), ("[ab]", 0), ("a)", 1), ("(a|)", 3), ("é", 0),
])
def test_validation_and_original_positions(expression, position):
    with pytest.raises(CompileError) as error:
        compile_regex(expression)
    assert error.value.position == position


def test_precedence_and_concatenation_tokens():
    tokens, explicit, postfix, _ = parse(" a | b c* ", Budget())
    assert [t.position for t in tokens] == [1, 3, 5, 7, 8]
    assert "".join(t.value for t in explicit) == "a|b.c*"
    assert "".join(t.value for t in postfix) == "abc*.|"
    assert [t.position for t in explicit if t.synthetic] == [7]


def test_trace_snapshots_are_historical_and_detached():
    result, automata = compile_regex("(a|b)*ab")
    assert result.traces["nfa"][0].graph.states == []
    assert len(result.traces["nfa"][1].graph.states) == 2
    for stage, name in [("nfa", "nfa"), ("dfa", "dfa"), ("minimize", "minimized")]:
        events = result.traces[stage]
        assert [e.index for e in events] == list(range(len(events)))
        assert events[-1].graph == automata[name].graph()
        for event in events:
            graph = event.graph
            assert set(event.highlighted_states + event.new_states) <= set(graph.states)
            assert set(event.highlighted_transitions + event.new_transitions) <= {e.id for e in graph.transitions}
            for edge in graph.transitions:
                assert edge.source in graph.states and edge.target in graph.states
    assert any(e.type == "closure" and e.data.closure.edge for e in result.traces["dfa"])
    assert any(e.type == "split" for e in result.traces["minimize"])
    assert [len(e.graph.states) for e in result.traces["minimize"] if e.type == "merge"] == [1, 2, 3]
    before = result.traces["nfa"][1].model_dump_json()
    automata["nfa"].states.append("q999")
    automata["nfa"].transitions[0].target = "q999"
    assert result.traces["nfa"][1].model_dump_json() == before
    assert compile_regex("(a|b)*ab")[0].model_dump_json() == compile_regex("(a|b)*ab")[0].model_dump_json()


def test_epsilon_cycle_and_empty_alphabet():
    _, automata = compile_regex("(ε*)*")
    nfa = automata["nfa"]
    closure = epsilon_closure(nfa, {nfa.start}, Budget())
    assert nfa.accepting & closure
    assert automata["dfa"].alphabet == ()
    assert len(automata["minimized"].states) == 1
    assert simulate_regex("ε", "", "nfa", Limits()).accepted
    assert not simulate_regex("ε", "ε", "nfa", Limits()).accepted


def test_sink_and_unreachable_state_removal():
    _, automata = compile_regex("a")
    dfa = automata["dfa"]
    sink = next(s for s in dfa.states if s != dfa.start and s not in dfa.accepting)
    assert dfa.next(sink, "a") == sink
    dfa.add_state("D99", Budget())
    dfa.edge("D99", "D99", "a")
    result, _, mapping, trace = minimize(dfa, Budget())
    assert trace[0].data.removed == ["D99"]
    assert "D99" not in mapping
    assert len(result.states) == 3


def test_minimization_completes_partial_dfa():
    partial = Automaton("dfa", ("a",), ["D0"], "D0", {"D0"})
    result, _, _, _ = minimize(partial, Budget())
    validate_graph(result.graph())
    assert len(result.states) == 2


@pytest.mark.parametrize("left,right,witness", [
    ("a*b", "ab", "b"), ("a*", "a", ""), ("a", "b", "a"), ("ε", "a*", "a"),
    ("(a|b)*ab", "(b|a)*ab", None), ("a|ε", "ε|a", None), ("a*", "(aa*)|ε", None),
])
def test_exact_comparison_and_shortest_witness(left, right, witness):
    result = compare_regex(left, right, Limits())
    assert result.counterexample == witness
    assert result.equivalent == (witness is None)
    validate_graph(result.left)
    validate_graph(result.right)
    if witness is not None:
        assert result.left_path[-1].data.accepted != result.right_path[-1].data.accepted
        a = compile_regex(left, Budget(tracing=False))[1]["dfa"]
        b = compile_regex(right, Budget(tracing=False))[1]["dfa"]
        for word in words(result.alphabet, len(witness) - 1):
            assert simulate(a, word, Budget(tracing=False))[0] == simulate(b, word, Budget(tracing=False))[0]


def test_seeded_generated_expressions_against_oracle():
    rng = random.Random(2026)

    def expression(depth):
        if not depth:
            return rng.choice(["a", "b", "ε"])
        left = expression(depth - 1)
        op = rng.choice(["union", "concat", "star"])
        if op == "star":
            return f"({left})*"
        right = expression(depth - 1)
        return f"({left}|{right})" if op == "union" else f"({left})({right})"

    for _ in range(35):
        regex = expression(3)
        _, automata = compile_regex(regex, Budget(tracing=False))
        for word in words("ab", 4):
            expected = re.fullmatch(regex.replace("ε", "(?:)"), word) is not None
            assert all(simulate(a, word, Budget(tracing=False))[0] == expected for a in automata.values()), (regex, word)


@pytest.mark.parametrize("changes,expression", [
    ({"regex_length": 2}, "abc"), ({"states": 2}, "ab"), ({"trace_events": 2}, "ab"),
    ({"snapshot_items": 2}, "a"), ({"seconds": 0.000000001}, "a"),
])
def test_limits_fail_explicitly(changes, expression):
    with pytest.raises(CompileError) as error:
        compile_regex(expression, Budget(limits=replace(Limits(), **changes)))
    assert error.value.code == "resource_limit"


def test_simulation_and_comparison_limits():
    with pytest.raises(CompileError):
        simulate_regex("a*", "aaaa", "nfa", replace(Limits(), input_length=3))
    with pytest.raises(CompileError):
        compare_regex("a", "b", replace(Limits(), comparison_pairs=1))


def test_exponential_subset_growth_is_bounded_without_traces():
    regex = "(a|b)*a" + "(a|b)" * 6
    with pytest.raises(CompileError, match="64-state"):
        compile_regex(regex, Budget(limits=replace(Limits(), states=64), tracing=False))


def test_all_rejecting_states_merge_and_the_input_is_not_mutated():
    original = Automaton("dfa", ("a",), ["D0", "D1"], "D0", set())
    original.edge("D0", "D1", "a")
    original.edge("D1", "D0", "a")
    before = original.graph().model_dump_json()
    result, groups, _, _ = minimize(original, Budget())
    assert len(result.states) == 1
    assert groups == [["D0", "D1"]]
    assert result.accepting == set()
    assert original.graph().model_dump_json() == before
