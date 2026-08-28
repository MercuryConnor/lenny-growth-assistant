import sys
sys.path.insert(0, "/app")
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import SessionLocal
from app.models.domain import Transcript, TranscriptChunk

def cleanup_orphaned_transcripts():
    db: Session = SessionLocal()
    
    # Find all transcripts
    transcripts = db.query(Transcript).all()
    deleted_count = 0
    
    for t in transcripts:
        # Check if it has any chunks
        chunk_count = db.query(func.count(TranscriptChunk.id)).filter(TranscriptChunk.transcript_id == t.id).scalar()
        if chunk_count == 0:
            print(f"Deleting orphaned transcript: {t.title}")
            db.delete(t)
            deleted_count += 1
            
    db.commit()
    db.close()
    print(f"Deleted {deleted_count} orphaned transcripts.")

if __name__ == "__main__":
    cleanup_orphaned_transcripts()
