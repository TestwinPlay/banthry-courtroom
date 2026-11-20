import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["app"] == "Banthry Courtroom"
        assert "models" in data
        assert "disclaimer" in data


@pytest.mark.asyncio
async def test_verify_citation_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/verify", json={"text": "As held in Arnesh Kumar v. State of Bihar, arrest is not automatic."})
        assert response.status_code == 200
        results = response.json()
        assert len(results) >= 1
        assert results[0]["name"] == "Arnesh Kumar v. State of Bihar"
        assert results[0]["status"] == "verified"


@pytest.mark.asyncio
async def test_exhibit_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/exhibits", json={"id": "EX-01", "title": "FIR No. 0412/2025"})
        assert response.status_code == 200
        data = response.json()
        assert data["watermark"] == "FICTIONAL EXHIBIT"
        assert data["image_base64"].startswith("data:image/png;base64,")


@pytest.mark.asyncio
async def test_evaluate_endpoint():
    transcript = [
        {"speaker": "J1", "text": "Counsel, why did your client fail to comply with notice?"},
        {"speaker": "counsel", "text": "My Lords, the applicant cooperated fully and there is no flight risk."},
        {"speaker": "J2", "text": "What about the diverted funds?"},
        {"speaker": "counsel", "text": "All accounts have been submitted to the IO without hesitation."}
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/evaluate", json={"transcript": transcript})
        assert response.status_code == 200
        data = response.json()
        assert "scores" in data
        assert "overall" in data
        assert len(data["improvements"]) == 3
        assert "J1" in data["judge_comments"]
        assert "J2" in data["judge_comments"]
        assert "J3" in data["judge_comments"]
