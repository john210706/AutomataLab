"""Validated theoretical regex grammar and traced shunting-yard conversion."""

from string import ascii_letters, digits

from app.algorithms.core import Budget, CompileError
from app.models import ParseData, Token, TraceEvent

LITERALS = frozenset(ascii_letters + digits)
ATOMS = LITERALS | {"ε"}
PRECEDENCE = {"|": 1, ".": 2, "*": 3}


def parse(expression: str, budget: Budget) -> tuple[list[Token], list[Token], list[Token], list[TraceEvent]]:
    if len(expression) > budget.limits.regex_length:
        raise CompileError(f"Expression exceeds {budget.limits.regex_length} characters.", code="resource_limit")
    tokens = []
    trace = []
    opens = []
    expect_atom = True
    for position, value in enumerate(expression):
        budget.check()
        if value.isspace():
            continue
        if value not in ATOMS | set("|*()"):
            raise CompileError(f"Unsupported character {value!r}. Use letters, digits, |, *, parentheses, or ε.", position)
        previous = tokens[-1].value if tokens else None
        if value == "(":
            opens.append(position)
            expect_atom = True
        elif value == ")":
            if not opens:
                raise CompileError("Closing parenthesis has no matching opening parenthesis.", position)
            if expect_atom:
                raise CompileError("Empty parentheses are not allowed; use ε." if previous == "(" else "Expected an operand before ')'.", position)
            opens.pop()
            expect_atom = False
        elif value == "|":
            if expect_atom:
                raise CompileError("Union operator is missing its left-hand operand.", position)
            expect_atom = True
        elif value == "*":
            if expect_atom or previous == "*":
                raise CompileError("Kleene star must follow a literal, ε, or a closing parenthesis.", position)
        else:
            expect_atom = False
        token = Token(value=value, position=position)
        tokens.append(token)
        budget.record(trace, "parse", "token", f"Read {value}", f"Recognize {value!r} at character {position + 1}.", 1,
                      ParseData(phase="tokenize", tokens=tokens.copy()), token=token)
    if not tokens:
        raise CompileError("Enter an expression. Use ε for the empty string.", 0)
    if expect_atom:
        raise CompileError("Union operator is missing its right-hand operand." if tokens[-1].value == "|" else "Expected an operand.", tokens[-1].position)
    if opens:
        raise CompileError("Opening parenthesis has no matching closing parenthesis.", opens[-1])

    explicit = []
    for token in tokens:
        if explicit and (explicit[-1].value in ATOMS | {"*", ")"}) and token.value in ATOMS | {"("}:
            dot = Token(value=".", position=token.position, synthetic=True)
            explicit.append(dot)
            budget.record(trace, "parse", "concatenate", "Insert concatenation",
                          f"An expression ending in {explicit[-2].value!r} followed by {token.value!r} means concatenation.", 2,
                          ParseData(phase="concatenate", tokens=explicit.copy()), token=dot)
        explicit.append(token)
    budget.record(trace, "parse", "normalized", "Concatenation is explicit", "Inserted dots are internal operators, not user-entered literals.", 2,
                  ParseData(phase="concatenate", tokens=explicit))

    output, stack = [], []

    def event(kind, title, reason, token, line):
        budget.record(trace, "parse", kind, title, reason, line,
                      ParseData(phase="postfix", tokens=explicit, output=[t.value for t in output], stack=[t.value for t in stack]), token=token)

    for token in explicit:
        value = token.value
        if value in ATOMS:
            output.append(token)
            event("output", f"Output {value}", "Operands go directly to the postfix output.", token, 3)
        elif value == "(":
            stack.append(token)
            event("push", "Open a group", "Push '(' as a boundary for this group.", token, 4)
        elif value == ")":
            while stack[-1].value != "(":
                popped = stack.pop()
                output.append(popped)
                event("pop", f"Output {popped.value}", "Closing a group flushes operators up to '('.", token, 5)
            stack.pop()
            event("close", "Close the group", "Discard the matching '('; parentheses do not appear in postfix.", token, 5)
        else:
            while stack and stack[-1].value != "(" and PRECEDENCE[stack[-1].value] >= PRECEDENCE[value]:
                popped = stack.pop()
                output.append(popped)
                event("pop", f"Output {popped.value}", f"{popped.value} has precedence greater than or equal to {value}. Precedence: * > · > |.", token, 6)
            stack.append(token)
            event("push", f"Push {value}", "Hold the operator until its operands have been output. Precedence: * > · > |.", token, 7)
    while stack:
        token = stack.pop()
        output.append(token)
        event("flush", f"Output {token.value}", "Input is exhausted; flush the remaining operator stack.", token, 8)
    event("complete", "Postfix ready", "Every operator now follows its operands; Thompson construction can use a fragment stack.", tokens[-1], 8)
    return tokens, explicit, output, trace
