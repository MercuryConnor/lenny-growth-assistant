"""
Ingestion script for Lenny's Podcast transcripts.
Reads markdown transcript files from the mounted data directory,
parses YAML frontmatter for metadata, and ingests them into the
pgvector-backed database using the RAG service.
"""

import os
import sys
import yaml
import time
import logging

# Add the app directory to the path
sys.path.insert(0, "/app")

from sqlalchemy.orm import Session
from app.models.domain import Base, Transcript, TranscriptChunk
from app.core.database import engine, SessionLocal
from app.services.rag import ingest_transcript

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

TRANSCRIPTS_DIR = os.environ.get("TRANSCRIPTS_DIR", "/data/lenny-transcripts/episodes")


def parse_transcript_file(filepath: str) -> dict:
    """Parse a markdown transcript file with YAML frontmatter."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        raw = f.read()

    # Split YAML frontmatter from content
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) >= 3:
            frontmatter = parts[1].strip()
            content = parts[2].strip()
            try:
                metadata = yaml.safe_load(frontmatter)
            except yaml.YAMLError:
                metadata = {}
        else:
            metadata = {}
            content = raw
    else:
        metadata = {}
        content = raw

    return {
        "title": metadata.get("title", os.path.basename(os.path.dirname(filepath))),
        "guest": metadata.get("guest", "Unknown"),
        "source_url": metadata.get("youtube_url", ""),
        "content": content,
    }


def run_ingestion():
    """Main ingestion loop: iterate over all episode directories and ingest."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    if not os.path.isdir(TRANSCRIPTS_DIR):
        logger.error(f"Transcripts directory not found: {TRANSCRIPTS_DIR}")
        logger.error("Make sure the volume is mounted correctly in docker-compose.yml")
        sys.exit(1)

    episode_dirs = sorted([
        d for d in os.listdir(TRANSCRIPTS_DIR)
        if os.path.isdir(os.path.join(TRANSCRIPTS_DIR, d))
    ])

    logger.info(f"Found {len(episode_dirs)} episode directories in {TRANSCRIPTS_DIR}")

    ingested = 0
    skipped = 0
    failed = 0

    for episode_name in episode_dirs:
        transcript_path = os.path.join(TRANSCRIPTS_DIR, episode_name, "transcript.md")

        if not os.path.isfile(transcript_path):
            logger.warning(f"  Skipping {episode_name}: no transcript.md found")
            skipped += 1
            continue

        # Check if already ingested (by title)
        parsed = parse_transcript_file(transcript_path)
        existing = db.query(Transcript).filter_by(title=parsed["title"]).first()
        if existing:
            logger.info(f"  Skipping {episode_name}: already ingested")
            skipped += 1
            continue

        try:
            logger.info(f"  Ingesting [{ingested + 1}] {episode_name} — \"{parsed['title'][:60]}...\"")
            ingest_transcript(
                db=db,
                title=parsed["title"],
                source_url=parsed["source_url"],
                content=parsed["content"],
            )
            ingested += 1
        except Exception as e:
            logger.error(f"  FAILED {episode_name}: {e}")
            db.rollback()
            failed += 1
            continue

    db.close()
    logger.info("=" * 60)
    logger.info(f"Ingestion complete! Ingested: {ingested}, Skipped: {skipped}, Failed: {failed}")
    logger.info("=" * 60)


if __name__ == "__main__":
    # Wait a few seconds for the database to be ready
    logger.info("Waiting 10 seconds for database to be ready...")
    time.sleep(10)
    run_ingestion()
