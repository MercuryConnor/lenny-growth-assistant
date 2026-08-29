import os
from sqlalchemy.orm import Session
from app.models.domain import Transcript, TranscriptChunk
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from pgvector.sqlalchemy import Vector

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

# Using nomic-embed-text for local embeddings, as it's a good default for Ollama RAG
embeddings_model = OllamaEmbeddings(base_url=OLLAMA_BASE_URL, model="nomic-embed-text")

def ingest_transcript(db: Session, title: str, source_url: str, content: str):
    # 1. Save transcript metadata
    transcript = Transcript(title=title, source_url=source_url, content=content)
    db.add(transcript)
    db.flush() # flush to get the ID without committing

    # 2. Chunk the text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    chunks = text_splitter.split_text(content)

    # 3. Embed and save chunks
    for chunk_text in chunks:
        embedding = embeddings_model.embed_query(chunk_text)
        chunk_record = TranscriptChunk(
            transcript_id=transcript.id,
            content=chunk_text,
            embedding=embedding
        )
        db.add(chunk_record)
    
    db.commit()
    return transcript

def retrieve_relevant_chunks(db: Session, query: str, top_k: int = 5):
    query_embedding = embeddings_model.embed_query(query)
    
    # Perform cosine similarity search using pgvector
    from sqlalchemy.orm import joinedload
    results = db.query(TranscriptChunk).options(joinedload(TranscriptChunk.transcript)).order_by(
        TranscriptChunk.embedding.cosine_distance(query_embedding)
    ).limit(top_k).all()
    
    formatted_results = []
    for r in results:
        formatted_results.append({
            "text": r.content,
            "title": r.transcript.title if r.transcript else "Unknown Episode",
            "url": r.transcript.source_url if r.transcript else "#"
        })
        
    return formatted_results
