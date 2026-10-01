from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_health_and_openapi():
    assert client.get("/api/health").json()["status"] == "ok"
    schema = client.get("/openapi.json").json()
    assert all(path in schema["paths"] for path in ["/api/compile", "/api/simulate", "/api/compare"])


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
