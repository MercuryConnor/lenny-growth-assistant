from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import domain
from pydantic import BaseModel
from typing import List

router = APIRouter()

class SessionCreate(BaseModel):
    title: str

class SessionResponse(BaseModel):
    id: str
    title: str

@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.post("/sessions", response_model=SessionResponse)
def create_session(session_req: SessionCreate, db: Session = Depends(get_db)):
    # Create a dummy user for now if we aren't doing auth
    user = db.query(domain.User).first()
    if not user:
        user = domain.User()
        db.add(user)
        db.commit()
        db.refresh(user)

    db_session = domain.Session(title=session_req.title, user_id=user.id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return SessionResponse(id=str(db_session.id), title=db_session.title)

class MessageRequest(BaseModel):
    content: str
    role: str = "user"
    skill: str = "qa" # "qa", "ship30", "artifact"

from fastapi import Header
from typing import Optional

@router.post("/sessions/{session_id}/messages")
def send_message(
    session_id: str, 
    message: MessageRequest, 
    db: Session = Depends(get_db),
    x_llm_provider: Optional[str] = Header(default="ollama")
):
    db_session = db.query(domain.Session).filter(domain.Session.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_msg = domain.Message(session_id=db_session.id, role=domain.MessageRole.user, content=message.content)
    db.add(user_msg)
    db.commit()
    
    # Agent routing and LLM call
    from app.agents.router import route_and_execute
    
    try:
        bot_reply_content, artifact = route_and_execute(db, message.content, message.skill, provider=x_llm_provider)
    except Exception as e:
        import traceback
        traceback.print_exc()
        bot_reply_content = f"I'm sorry, the AI model encountered an error: {str(e)[:200]}. Please try again."
        artifact = None
    
    assistant_msg = domain.Message(session_id=db_session.id, role=domain.MessageRole.assistant, content=bot_reply_content)
    db.add(assistant_msg)
    
    if artifact:
        db_artifact = domain.Artifact(
            message_id=assistant_msg.id, 
            type=artifact["type"], 
            content=artifact["content"]
        )
        db.add(db_artifact)
        
    db.commit()
    
    return {"message": bot_reply_content, "artifact": artifact}
