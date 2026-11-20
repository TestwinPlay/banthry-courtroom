import pytest
from backend.courtroom.tools.citation_tool import check_local_citation, extract_distinctive_tokens
from backend.courtroom.agents.citation_verifier.agent import extract_and_verify


def test_distinctive_token_filtering():
    tokens = extract_distinctive_tokens("State of Rajasthan v. Balchand")
    assert "state" not in tokens
    assert "of" not in tokens
    assert "balchand" in tokens


def test_fictional_citation_not_in_local():
    # Planted fake citations
    res = check_local_citation("Keshav v. State 2024")
    assert res is None

    res2 = check_local_citation("Ramesh v. State (2019) 4 SCC 999")
    assert res2 is None


def test_landmark_local_citations():
    # Authentic landmark citations
    res = check_local_citation("Arnesh Kumar v. State of Bihar")
    assert res is not None
    assert "2014" in res.get("citation", "")

    res_sibbia = check_local_citation("Gurbaksh Singh Sibbia")
    assert res_sibbia is not None


@pytest.mark.asyncio
async def test_extract_and_verify_real_and_fake():
    # 1. Real citation
    real_results = await extract_and_verify("We rely on Arnesh Kumar v. State of Bihar for bail conditions.")
    assert len(real_results) >= 1
    assert any(r["name"] == "Arnesh Kumar v. State of Bihar" and r["status"] == "verified" for r in real_results)

    # 2. Fake citation
    fake_results = await extract_and_verify("In Keshav v. State 2024, the court held that bail is automatic.")
    assert len(fake_results) >= 1
    assert any("Keshav" in r["name"] and r["status"] in ("not_found", "unconfirmed") for r in fake_results)
