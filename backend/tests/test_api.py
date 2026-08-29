import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db

client = TestClient(app)

def test_health_check():
    """
    Verifies that the API is up and running.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_session():
    """
    Verifies that a user can create a new session.
    """
    response = client.post("/api/v1/sessions", json={"title": "Test Chat"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["title"] == "Test Chat"

def test_send_message_provider_routing(monkeypatch):
    """
    Verifies that the X-LLM-Provider header correctly routes the request
    (We mock the actual LLM call to avoid hitting external APIs during tests).
    """
    # Create a session first
    session_res = client.post("/api/v1/sessions", json={"title": "Test Chat"})
    session_id = session_res.json()["id"]

    # Mock the router.py route_and_execute function so we don't actually call Ollama/Anthropic
    def mock_route_and_execute(db, message, skill, provider):
        if provider == "cloud":
            return "Mocked Cloud Response", None, []
        return "Mocked Local Response", None, []

    import app.agents.router as router_module
    monkeypatch.setattr(router_module, "route_and_execute", mock_route_and_execute)

    # Test Local Provider (Default)
    res_local = client.post(f"/api/v1/sessions/{session_id}/messages", json={
        "content": "Hello",
        "skill": "qa"
    })
    assert res_local.status_code == 200
    assert "Mocked Local Response" in res_local.json()["message"]

    # Test Cloud Provider
    res_cloud = client.post(f"/api/v1/sessions/{session_id}/messages", json={
        "content": "Hello",
        "skill": "qa"
    }, headers={"X-LLM-Provider": "cloud"})
    
    assert res_cloud.status_code == 200
    assert "Mocked Cloud Response" in res_cloud.json()["message"]

def test_persistence_behavior(monkeypatch):
    """
    Verifies that sessions and messages are persisted to the database.
    """
    # Create a session
    session_res = client.post("/api/v1/sessions", json={"title": "Persistence Test"})
    session_id = session_res.json()["id"]

    # Mock routing to avoid hitting LLM
    import app.agents.router as router_module
    monkeypatch.setattr(router_module, "route_and_execute", lambda db, m, s, provider: ("Hello Persistence", None, []))

    # Send a message
    client.post(f"/api/v1/sessions/{session_id}/messages", json={"content": "Persist this"})

    # Check database directly for persistence
    db = next(get_db())
    from app.models import domain
    session_in_db = db.query(domain.Session).filter(domain.Session.id == session_id).first()
    assert session_in_db is not None
    assert session_in_db.title == "Persistence Test"

    messages = db.query(domain.Message).filter(domain.Message.session_id == session_id).all()
    assert len(messages) == 2 # 1 user, 1 assistant
    assert messages[0].content == "Persist this"
    assert messages[0].role.value == "user"
    assert messages[1].content == "Hello Persistence"
    assert messages[1].role.value == "assistant"

def test_retrieval_behavior():
    """
    Verifies the RAG retrieval function works. 
    (Assumes database has been seeded with at least one transcript chunk).
    """
    db = next(get_db())
    from app.services.rag import retrieve_relevant_chunks
    # We just want to make sure the function executes without crashing
    # and returns a list. If DB is empty, it returns [].
    try:
        chunks = retrieve_relevant_chunks(db, "growth strategies", top_k=2)
        assert isinstance(chunks, list)
    except Exception as e:
        pytest.fail(f"Retrieval function failed with error: {e}")
