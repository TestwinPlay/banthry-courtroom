import pytest
from backend.courtroom.agents.case_architect.agent import root_agent as case_architect_agent
from backend.courtroom.agents.bench.agent import root_agent as bench_agent
from backend.courtroom.agents.opposing_counsel.agent import root_agent as counsel_agent
from backend.courtroom.agents.witness.agent import root_agent as witness_agent
from backend.courtroom.agents.hearing_director.agent import root_agent as director_agent
from backend.courtroom.agents.citation_verifier.agent import root_agent as verifier_agent
from backend.courtroom.agents.memorial_coach.agent import root_agent as coach_agent
from backend.courtroom.agents.evaluator.agent import root_agent as evaluator_agent
from backend.courtroom.agents.exhibit_maker.agent import root_agent as exhibit_agent


def test_case_architect_agent():
    assert case_architect_agent.name == "case_architect"
    assert "Section 482 BNSS" in case_architect_agent.instruction
    assert case_architect_agent.model is not None


def test_bench_agent():
    assert bench_agent.name == "bench"
    assert len(bench_agent.tools) >= 3
    tool_names = [t.name if hasattr(t, "name") else str(t) for t in bench_agent.tools]
    assert any("check_citation" in str(name) for name in tool_names)
    assert any("get_fact" in str(name) for name in tool_names)
    assert any("call_witness" in str(name) for name in tool_names)


def test_opposing_counsel_agent():
    assert counsel_agent.name == "opposing_counsel"
    assert "Verified Precedents Only" in counsel_agent.instruction


def test_witness_agent():
    assert witness_agent.name == "witness"
    assert len(witness_agent.tools) >= 1


def test_hearing_director_agent():
    assert director_agent.name == "hearing_director"
    assert "submissions" in director_agent.instruction


def test_citation_verifier_agent():
    assert verifier_agent.name == "citation_verifier"
    assert verifier_agent.model is not None


def test_memorial_coach_agent():
    assert coach_agent.name == "memorial_coach"
    assert "Prayer" in coach_agent.instruction


def test_evaluator_agent():
    assert evaluator_agent.name == "evaluator"
    assert "0 to 10 scale" in evaluator_agent.instruction


def test_exhibit_maker_agent():
    assert exhibit_agent.name == "exhibit_maker"
    assert "FICTIONAL EXHIBIT" in exhibit_agent.instruction
