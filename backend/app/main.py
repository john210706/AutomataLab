"""Local REST API with bounded inputs and structured errors."""

import logging
import os
from dataclasses import asdict
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from app.algorithms.core import Budget, CompileError, Limits
from app.compiler import compare_regex, compile_regex, simulate_regex, tokenize_program
from app.models import CompareResult, CompileResult, LexResult, SimulationResult


def configured_limits():
    defaults = Limits()
    values = {}
    for name, value in asdict(defaults).items():
        values[name] = type(value)(os.getenv(f"AUTOMATALAB_{name.upper()}", str(value)))
        if values[name] <= 0:
            raise ValueError(f"AUTOMATALAB_{name.upper()} must be positive")
    return Limits(**values)


limits = configured_limits()
app = FastAPI(title="AutomataLab", version="1.0.0", description="A traced theoretical regular-expression compiler.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["POST", "GET"], allow_headers=["Content-Type"])


class CompileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    regex: str = Field(max_length=limits.regex_length)


class SimulateRequest(CompileRequest):
    input: str = Field(max_length=limits.input_length)
    automaton: Literal["nfa", "dfa", "minimized"] = "minimized"


class CompareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    left: str = Field(max_length=limits.regex_length)
    right: str = Field(max_length=limits.regex_length)


class TokenRuleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    name: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z_][A-Za-z0-9_]*$")
    regex: str = Field(max_length=limits.regex_length)
    skip: bool = False


class LexRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    rules: list[TokenRuleRequest] = Field(min_length=1, max_length=32)
    input: str = Field(max_length=limits.input_length)


@app.exception_handler(CompileError)
async def compiler_error(request: Request, error: CompileError):
    return JSONResponse(status_code=422, content={"error": {"code": error.code, "message": str(error), "position": error.position, "field": error.field}})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError):
    details = [{"field": ".".join(map(str, e["loc"][1:])), "message": e["msg"]} for e in error.errors()]
    return JSONResponse(status_code=422, content={"error": {"code": "invalid_request", "message": "Check the request fields.", "details": details}})


@app.exception_handler(Exception)
async def unexpected_error(request: Request, error: Exception):
    logging.exception("Unexpected compiler failure", exc_info=error)
    return JSONResponse(status_code=500, content={"error": {"code": "internal_error", "message": "The compiler encountered an unexpected error."}})


@app.get("/api/health")
def health():
    return {"status": "ok", "limits": asdict(limits)}


@app.post("/api/compile", response_model=CompileResult)
def compile_endpoint(body: CompileRequest):
    return compile_regex(body.regex, Budget(limits=limits))[0]


@app.post("/api/simulate", response_model=SimulationResult)
def simulate_endpoint(body: SimulateRequest):
    return simulate_regex(body.regex, body.input, body.automaton, limits)


@app.post("/api/compare", response_model=CompareResult)
def compare_endpoint(body: CompareRequest):
    return compare_regex(body.left, body.right, limits)


@app.post("/api/lex", response_model=LexResult)
def lex_endpoint(body: LexRequest):
    names = [rule.name for rule in body.rules]
    if len(names) != len(set(names)):
        raise CompileError("Token rule names must be unique.", code="duplicate_token")
    return tokenize_program([(rule.name, rule.regex, rule.skip) for rule in body.rules], body.input, limits)


static_directory = os.getenv("AUTOMATALAB_STATIC_DIR")
if static_directory and Path(static_directory).is_dir():
    app.mount("/", StaticFiles(directory=static_directory, html=True), name="frontend")
