# System Architecture: The Lenny Growth Assistant

## 1. High-Level Architecture
The system follows a classic three-tier web application architecture within a monorepo, augmented with an AI Agent layer and a Vector Database for RAG (Retrieval-Augmented Generation).

### Components
1.  **Frontend (Next.js):** Client-side application providing the chat UI, settings toggle, and Artifact Viewer.
2.  **Backend API (FastAPI):** Core service handling HTTP requests, orchestrating agents, and managing persistence.
3.  **Database (PostgreSQL + pgvector):** Persistent storage for relational data (users, sessions, conversations) and vector embeddings of transcripts.
4.  **LLM Provider (Ollama / Cloud):** The language model responsible for generation and reasoning.

## 2. Component Boundaries & SOLID/OOP Design
The backend is structured using Domain-Driven Design (DDD) principles:
-   **API Layer (`backend/api/`):** FastAPI routers handling request/response serialization (Pydantic models).
-   **Service Layer (`backend/services/`):** Business logic (session management, transcript ingestion).
-   **Agent Layer (`backend/agents/`):** Encapsulates interactions with the LLM. Implements the Strategy Pattern to allow switching between Ollama and Cloud providers without changing core logic.
-   **Data Access Layer (`backend/repositories/`):** Encapsulates database interactions using the Repository Pattern, abstracting SQLAlchemy operations.
-   **Models (`backend/models/`):** SQLAlchemy ORM models.

## 3. Database Schema

### `users`
- `id` (UUID, PK)
- `created_at` (Timestamp)
- `metadata` (JSONB)

### `sessions`
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users.id)
- `title` (String)
- `created_at` (Timestamp)

### `messages`
- `id` (UUID, PK)
- `session_id` (UUID, FK -> sessions.id)
- `role` (Enum: 'user', 'assistant', 'system')
- `content` (Text)
- `created_at` (Timestamp)

### `transcripts`
- `id` (UUID, PK)
- `source_url` (String)
- `title` (String)
- `content` (Text)
- `metadata` (JSONB)

### `transcript_chunks`
- `id` (UUID, PK)
- `transcript_id` (UUID, FK -> transcripts.id)
- `content` (Text)
- `embedding` (Vector)

### `artifacts`
- `id` (UUID, PK)
- `message_id` (UUID, FK -> messages.id)
- `type` (Enum: 'markdown', 'html', 'css')
- `content` (Text)

## 4. Ingestion & Retrieval Flow (RAG)
1.  **Ingestion:** Transcripts are parsed, split into manageable chunks (e.g., using RecursiveCharacterTextSplitter), embedded using an embedding model (e.g., `nomic-embed-text` via Ollama), and stored in the `transcript_chunks` table using `pgvector`.
2.  **Retrieval:** When a user asks a question, the query is embedded. We perform a cosine similarity search in `pgvector` to find the top $K$ most relevant transcript chunks.
3.  **Generation:** The retrieved chunks are formatted into the prompt context along with the conversation history and sent to the LLM to generate a grounded response.

## 5. Agent Routing
We use a simple routing mechanism (or a specialized routing agent) to determine the intent of the user's message:
-   **General Q&A:** Routes to the RAG pipeline.
-   **Ship 30 for 30:** Routes to a specialized prompt chain that enforces the essay structure (1250 words, hook, formatting, takeaway) using retrieved context.
-   **Artifact Generation:** If the user asks for code, UI mockups, or formatted documents, the agent is instructed to output the content wrapped in specific XML tags (e.g., `<artifact>...</artifact>`), which the backend parses and stores in the `artifacts` table.

## 6. Model Toggle & Security
-   **Model Toggle:** The frontend sends the preferred model configuration in the request headers or payload. The Agent Layer's factory instantiates the correct Strategy (Ollama vs. Cloud) based on this preference.
-   **Security:** Artifacts containing HTML are treated as untrusted. The Next.js frontend renders them inside an `<iframe>` with the `sandbox` attribute (e.g., `sandbox="allow-scripts"` but restricted origin) to prevent Cross-Site Scripting (XSS).

## 7. Deployment Topology & Database Scaling Strategy
-   **Local Development:** `docker-compose up` orchestrates PostgreSQL, the FastAPI backend, and the Next.js frontend. Ollama runs natively on the host machine to access GPU resources optimally.
-   **Production Scaling:** For the sake of a frictionless "one-command startup" evaluator experience, PostgreSQL is containerized locally for the demo. However, the system is designed to be cloud-agnostic. For production scaling, we simply swap the `DATABASE_URL` to a managed provider like Supabase or AWS RDS to gain high availability and automated backups without touching a single line of application code.
