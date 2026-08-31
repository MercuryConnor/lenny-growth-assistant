# System Architecture: The Lenny Growth Assistant

## 1. Architecture at a glance

The application is a three-tier web application with a dedicated retrieval/agent layer:

```text
Next.js frontend
      │
      │ REST + X-LLM-Provider
      ▼
FastAPI API
      │
      ├── Session / message persistence ──► PostgreSQL + pgvector
      │
      ├── Skill router
      │      ├── QA ───────────────┐
      │      ├── Ship 30 ──────────┤
      │      └── Artifact ─────────┤
      │                             ▼
      │                    Provider client
      │                    ├── Ollama
      │                    ├── Anthropic
      │                    └── Gemini
      │
      └── RAG service
             ├── Ollama embeddings
             ├── pgvector similarity search
             └── transcript source metadata

External transcript archive ──► ingest container ──► PostgreSQL + pgvector
```

Ollama runs on the host for the local demo rather than inside Docker. This was a deliberate operational decision after containerized Ollama hit OOM failures during corpus ingestion; the debugging rationale is recorded in `agent_transcripts/session_summary.md`.

## 2. Component boundaries

The implementation uses a deliberately small service structure rather than a separate repository abstraction layer.

- **Frontend (`frontend/src/app/`)**: Next.js UI for sessions, chat, provider selection, citations, and the Artifact Viewer.
- **API (`backend/app/api/`)**: FastAPI routes, request validation, persistence orchestration, and HTTP errors.
- **Agents (`backend/app/agents/`)**: Skill routing and provider-specific generation clients.
- **RAG service (`backend/app/services/rag.py`)**: Transcript chunking, embedding, ingestion, and vector retrieval.
- **Models (`backend/app/models/domain.py`)**: SQLAlchemy ORM models for users, sessions, messages, transcripts, chunks, and artifacts.
- **Database (`backend/app/core/database.py`)**: SQLAlchemy engine/session configuration.
- **Ingestion (`backend/scripts/ingest_transcripts.py`)**: Reads the externally mounted transcript archive and sends transcripts through the RAG ingestion service.

There is **no `backend/repositories/` package** in the implementation. Database access is intentionally kept close to the API/service code for this take-home's scope.

## 3. Database schema

### `users`
- `id` — UUID primary key
- `created_at` — timestamp
- `metadata` — JSON metadata

### `sessions`
- `id` — UUID primary key
- `user_id` — foreign key to `users.id`
- `title` — session title
- `created_at` — timestamp

### `messages`
- `id` — UUID primary key
- `session_id` — foreign key to `sessions.id`
- `role` — user / assistant / system
- `content` — text
- `created_at` — timestamp

### `transcripts`
- `id` — UUID primary key
- `source_url` — original episode URL when available
- `title` — episode title
- `content` — full transcript text
- `metadata` — JSON metadata

### `transcript_chunks`
- `id` — UUID primary key
- `transcript_id` — foreign key to `transcripts.id`
- `content` — chunk text
- `embedding` — pgvector embedding

### `artifacts`
- `id` — UUID primary key
- `message_id` — foreign key to the assistant message
- `type` — markdown or html
- `content` — generated artifact content

## 4. Ingestion and retrieval

### Ingestion

1. A compatible transcript archive is placed at `data/lenny-transcripts` or supplied through `TRANSCRIPTS_HOST_DIR`.
2. `ingest_transcripts.py` reads `episodes/*/transcript.md` files.
3. YAML frontmatter provides title, guest, and YouTube source URL metadata.
4. Transcript text is split into 1,000-character chunks with 200-character overlap.
5. Each chunk is embedded with `nomic-embed-text` through Ollama.
6. Transcript metadata and all generated chunks are committed together.

The ingestion transaction is intentionally atomic. A failed embedding operation rolls the session back instead of leaving a transcript that looks complete but has missing chunks.

### Retrieval

1. The user's question is embedded with the same embedding model.
2. pgvector orders chunks by cosine distance.
3. The top five chunks are selected.
4. The router passes those chunks into the provider prompt and returns source title/URL metadata to the frontend.
5. The QA prompt explicitly instructs the model to acknowledge when the retrieved context does not support an answer.

## 5. Agent / skill routing

The frontend currently selects a skill from the user's request:

- **`qa`** — grounded product/growth Q&A.
- **`ship30`** — approximately 1,250-word Ship 30 for 30-style essay with hook, headings, skimmability, and takeaway.
- **`artifact`** — Markdown or HTML/CSS generation wrapped in an internal artifact marker for persistence and rendering.

The backend then selects the provider:

- `ollama` → local Ollama client
- `anthropic` → Anthropic client
- `gemini` → Gemini client

This makes the provider boundary explicit without coupling application code to a single model vendor.

## 6. API contract

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/sessions` | List sessions |
| POST | `/api/v1/sessions` | Create session |
| GET | `/api/v1/sessions/{id}` | Read session history |
| PATCH | `/api/v1/sessions/{id}` | Rename session |
| POST | `/api/v1/sessions/{id}/messages` | Generate response |

`POST /messages` accepts `X-LLM-Provider` with `ollama`, `anthropic`, or `gemini`.

## 7. Artifact security

Generated HTML is untrusted. The frontend renders HTML artifacts in an iframe using the browser's `sandbox` mechanism rather than injecting generated markup directly into the application's DOM.

The current viewer deliberately does **not** grant the sandbox capabilities that would give the artifact access to the parent application's origin, cookies, or local storage. This limits the blast radius of generated markup and scripts.

This is a browser isolation boundary, not a claim that generated HTML is inherently safe. A production deployment should add content sanitization, stricter CSP, and potentially a separate origin for untrusted artifacts.

## 8. Deployment topology

### Local evaluator path

- PostgreSQL + pgvector: Docker
- FastAPI: Docker
- Next.js: Docker
- Ollama: host machine
- Transcript archive: host filesystem mounted into the one-shot ingestion container

### Why the transcript archive is external

The application source is MIT-licensed, but the podcast transcripts are third-party content. The repository therefore documents and automates acquisition rather than committing the corpus itself.

### Production direction

The database connection is configured through `DATABASE_URL`, so a managed PostgreSQL/pgvector service can replace the local database without changing the application's persistence interfaces. The current submission is optimized for a reproducible local evaluation rather than production HA.
