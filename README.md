# Lenny Growth Assistant

A RAG-powered AI assistant built on top of Lenny's Podcast transcripts. It answers product management and growth strategy questions grounded in real podcast conversations, generates Ship 30 essays, and produces live HTML artifacts — all from a single chat interface.

![Dashboard](screenshots/UI_front.jpg)

## Screenshots

| Chat with RAG Citations | Artifact Viewer |
|---|---|
| ![Chat View](screenshots/Chat_view.png) | ![Artifact View](screenshots/Artifact_view.png) |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL + pgvector |
| Embeddings | `nomic-embed-text` via Ollama |
| Local LLM | `llama3.2:1b` via Ollama |
| Cloud LLM | Gemini, Anthropic (optional) |
| Infra | Docker Compose |

## Features

- **Retrieval-Augmented Generation** — vector similarity search over 33k+ transcript chunks using pgvector
- **Multi-provider LLM routing** — switch between local Ollama, Gemini, or Anthropic from the UI dropdown
- **Ship 30 essay generation** — structured long-form essays grounded in podcast context
- **HTML artifact generation** — renders live HTML/CSS previews in a sandboxed iframe
- **Session persistence** — chat history and artifacts saved to PostgreSQL, survives page refresh
- **Inline session rename** — hover any chat in the sidebar to rename it
- **Dark / Light mode** — manual toggle, not tied to system preference
- **Markdown rendering** — assistant responses rendered with proper formatting via `react-markdown`

## Project Structure

```
rag_systems/
├── docker-compose.yml
├── .env.example
├── Makefile
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # FastAPI app entrypoint
│   │   ├── api/
│   │   │   └── endpoints.py         # REST routes (sessions, messages, health)
│   │   ├── agents/
│   │   │   ├── router.py            # Skill routing (qa, ship30, artifact)
│   │   │   ├── llm_client.py        # Ollama LLM wrapper
│   │   │   ├── gemini_client.py     # Google Gemini client
│   │   │   └── anthropic_client.py  # Anthropic Claude client
│   │   ├── core/
│   │   │   └── database.py          # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── domain.py            # ORM models (User, Session, Message, Artifact, Transcript)
│   │   └── services/
│   │       └── rag.py               # Vector search + embedding logic
│   ├── scripts/
│   │   └── ingest_transcripts.py    # One-shot transcript ingestion pipeline
│   └── tests/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/app/
│       ├── layout.tsx
│       ├── globals.css
│       └── page.tsx                  # Main UI (chat, sidebar, artifact viewer, theme toggle)
│
├── screenshots/
│   ├── UI_front.jpg
│   ├── Chat_view.png
│   └── Artifact_view.png
│
└── docs/
    ├── PRD.md
    ├── architecture.md
    └── design.md
```

## Prerequisites

- Docker & Docker Compose
- [Ollama](https://ollama.com/) installed on the host machine
- ~4 GB RAM (for `llama3.2:1b` + `nomic-embed-text`)

## Setup

**1. Clone and configure environment**

```bash
git clone https://github.com/MercuryConnor/lenny-growth-assistant.git
cd lenny-growth-assistant
cp .env.example .env
```

Edit `.env` to add your API keys if you want to use cloud providers (Gemini/Anthropic). Local Ollama works out of the box.

**2. Pull the Ollama models**

```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
ollama serve
```

**3. Start the stack**

```bash
docker-compose up -d --build
```

This brings up four containers:

| Service | URL | Purpose |
|---|---|---|
| `frontend` | http://localhost:3000 | Chat UI |
| `backend` | http://localhost:8000 | FastAPI server |
| `db` | localhost:5432 | PostgreSQL + pgvector |
| `ingest` | — | One-shot transcript ingestion (exits after completion) |

**4. Verify**

```bash
# Check all services are healthy
docker-compose ps

# Check backend health
curl http://localhost:8000/api/v1/health

# Check ingestion progress
docker-compose logs -f ingest
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/sessions` | List all chat sessions |
| `POST` | `/api/v1/sessions` | Create a new session |
| `GET` | `/api/v1/sessions/{id}` | Get session with full message history |
| `PATCH` | `/api/v1/sessions/{id}` | Rename a session |
| `POST` | `/api/v1/sessions/{id}/messages` | Send a message and get AI response |

The `POST /messages` endpoint accepts an `X-LLM-Provider` header (`ollama`, `gemini`, `anthropic`) to switch providers per-request.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Network Error` in the frontend | Make sure `ollama serve` is running on the host. Backend connects to Ollama via `host.docker.internal:11434`. |
| Backend crashes on startup | Check `docker-compose logs backend` for Python import errors. |
| Ingestion stops midway | Restart with `docker-compose restart ingest`. The script is idempotent — it skips already-ingested transcripts. |
| LLM loops or gives garbage | You may be on a model too small for the context window. Switch to `llama3.2:1b` or use a cloud provider. |

## License

MIT
