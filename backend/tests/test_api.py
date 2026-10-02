from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_health_and_openapi():
    assert client.get("/api/health").json()["status"] == "ok"
    schema = client.get("/openapi.json").json()
    assert all(path in schema["paths"] for path in ["/api/compile", "/api/simulate", "/api/compare", "/api/lex"])


def test_compile_response():
    response = client.post("/api/compile", json={"regex": "(a|b)*ab"})
    assert response.status_code == 200
    result = response.json()
    assert result["counts"] == {"nfa": 12, "dfa": 4, "minimized": 3}
    assert set(result["traces"]) == {"parse", "nfa", "dfa", "minimize"}
    assert any(e["symbol"] is None for e in result["nfa"]["transitions"])


@pytest.mark.parametrize("payload", [{}, {"regex": 42}, {"regex": "a", "unexpected": True}, {"regex": "a" * 257}])
def test_request_validation(payload):
    response = client.post("/api/compile", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_grammar_error_has_source_position():
    response = client.post("/api/compile", json={"regex": "a|"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["position"] == 1
    assert "right-hand" in error["message"]


@pytest.mark.parametrize("kind", ["nfa", "dfa", "minimized"])
def test_simulation(kind):
    response = client.post("/api/simulate", json={"regex": "(a|b)*ab", "input": "bab", "automaton": kind})
    assert response.status_code == 200
    result = response.json()
    assert result["accepted"]
    assert all(result["agreement"].values())
    assert result["trace"][-1]["data"]["accepted"]


def test_comparison():
    response = client.post("/api/compare", json={"left": "a*b", "right": "ab"})
    assert response.status_code == 200
    assert response.json()["counterexample"] == "b"
    assert not response.json()["equivalent"]


def test_cors_is_local_only():
    for origin, allowed in [("http://localhost:5173", True), ("https://unrelated.example", False)]:
        response = client.options("/api/compile", headers={"Origin": origin, "Access-Control-Request-Method": "POST"})
        assert (response.headers.get("access-control-allow-origin") == origin) is allowed


@pytest.mark.parametrize("field", ["left", "right"])
def test_compare_errors_identify_the_invalid_expression(field):
    body = {"left": "a", "right": "b", field: "a|"}
    response = client.post("/api/compare", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["field"] == field


def test_lexer_uses_longest_match_then_rule_priority():
    response = client.post("/api/lex", json={
        "rules": [
            {"name": "KEYWORD", "regex": "if|then"},
            {"name": "WORD", "regex": "(i|f|t|h|e|n)(i|f|t|h|e|n)*"},
            {"name": "INTEGER", "regex": "(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)*"},
        ],
        "input": "if42then",
    })
    assert response.status_code == 200
    result = response.json()
    assert [(token["token"], token["lexeme"]) for token in result["tokens"]] == [
        ("KEYWORD", "if"), ("INTEGER", "42"), ("KEYWORD", "then"),
    ]
    assert [candidate["token"] for candidate in result["steps"][0]["candidates"]] == ["KEYWORD", "WORD"]


def test_lexer_reports_rule_and_input_errors():
    empty = client.post("/api/lex", json={"rules": [{"name": "EMPTY", "regex": "a*"}], "input": "a"})
    assert empty.status_code == 422
    assert empty.json()["error"]["field"] == "rules.0.regex"
    invalid = client.post("/api/lex", json={"rules": [{"name": "A", "regex": "a"}], "input": "ab"})
    assert invalid.status_code == 422
    assert invalid.json()["error"] == {
        "code": "lexical_error",
        "message": "No token rule matches the input at position 1 ('b').",
        "position": 1,
        "field": None,
    }


def test_lexer_can_skip_rules_and_rejects_duplicate_names():
    skipped = client.post(
        "/api/lex",
        json={
            "rules": [
                {"name": "LETTER", "regex": "a"},
                {"name": "SEPARATOR", "regex": "x", "skip": True},
            ],
            "input": "axa",
        },
    )
    assert [(token["token"], token["lexeme"]) for token in skipped.json()["tokens"]] == [
        ("LETTER", "a"),
        ("LETTER", "a"),
    ]
    assert skipped.json()["steps"][1]["skipped"]
    duplicate = client.post(
        "/api/lex",
        json={
            "rules": [
                {"name": "TOKEN", "regex": "a"},
                {"name": "TOKEN", "regex": "b"},
            ],
            "input": "a",
        },
    )
    assert duplicate.status_code == 422
    assert duplicate.json()["error"]["code"] == "duplicate_token"
