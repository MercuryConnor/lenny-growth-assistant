# The Lenny Growth Assistant

A full-stack, AI-powered conversational web application that ingests transcripts from Lenny's Podcast to act as a grounded internal assistant for product and growth teams.

## Architecture Overview
- **Frontend**: Next.js 14, React, TailwindCSS. Features an interactive chat UI and a dedicated Artifact Viewer for rendering HTML/CSS mockups securely in a sandboxed iframe.
- **Backend**: FastAPI (Python), SQLAlchemy, Pydantic. Implements Agent routing to handle conversational Q&A, structured "Ship 30 for 30" essays, and HTML artifact generation.
- **Database**: PostgreSQL with `pgvector` for storing chat sessions, transcripts, and performing vector similarity search for Retrieval-Augmented Generation (RAG).
- **LLM**: Local Ollama running `qwen3:4b` for chat and `nomic-embed-text` for vector embeddings.

## Prerequisites
- **Docker & Docker Compose** installed
- **Ollama** installed on the host machine
- At least 8GB of RAM available

## Installation & Environment Variables
1. Clone the repository.
2. Ensure you have the Lenny's Podcast transcripts data available in the expected path (configured in `docker-compose.yml`).
3. Copy the environment variables example file:
   ```bash
   cp .env.example .env
   ```
4. **Ollama Setup**: Ensure your host Ollama is running and has the required models downloaded:
   ```bash
   ollama pull qwen3:4b
   ollama pull nomic-embed-text
   ollama serve
   ```

## Run Commands
Start the entire stack using Docker Compose. This starts the PostgreSQL database, the FastAPI backend, the Next.js frontend, and the background transcript ingestion job:

```bash
docker-compose up -d --build
```

- **Frontend UI**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Ingestion Logs**: `docker-compose logs -f ingest`

## Troubleshooting
- **Cannot connect to Ollama**: Ensure Ollama is running on your host machine (`ollama serve`) and not inside a Docker container that lacks GPU/memory access. The services are configured to hit `host.docker.internal:11434`.
- **Database Connection Errors**: If the backend fails to connect to the database, verify that the `db` service is healthy using `docker-compose ps`.
- **Ingestion Skipping**: If ingestion stops midway, check the logs for network timeouts (`docker-compose logs --tail 50 ingest`). You can safely restart the ingestion container (`docker-compose restart ingest`); it is idempotent and will pick up where it left off.
