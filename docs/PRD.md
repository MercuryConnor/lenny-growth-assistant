# Product Requirements Document: The Lenny Growth Assistant

## 1. Discovery Brief

### User and problem

**Primary user:** Internal product and growth team members.

**Job to be done:** Turn Lenny's Podcast knowledge into a useful answer, reusable piece of writing, or rendered artifact without manually searching hours of transcripts or understanding model infrastructure.

**Problem:** Generic AI can produce plausible product advice, but plausibility is not enough for a knowledge assistant. The user needs answers grounded in a defined source corpus, visible source metadata, conversational continuity, and outputs that can be reused immediately.

### Success metrics

- **Grounding:** Target >95% of evaluated answers to be supported by retrieved transcript context.
- **Time-to-draft:** Reduce a transcript-grounded Ship 30 for 30 draft from a multi-step manual research workflow to under five minutes.
- **Operational:** A fresh evaluator should be able to clone the repository, acquire the documented transcript dependency, start the local stack, and reach a working chat UI without developer-specific files.

These are evaluation targets, not measured production KPIs for this take-home.

### Assumptions

- Interaction and generated content are primarily in English.
- The transcript corpus is batch-ingested rather than continuously scraped.
- The evaluator has Docker, Git, and Ollama available locally.
- Ollama runs on the host machine so the local model can access host resources.
- No authentication is required for this single-user evaluation application.
- The transcript corpus remains external to the application repository because it is third-party content.

## 2. Scope choices

### Included

- Conversational UI with independent persisted sessions.
- PostgreSQL + pgvector transcript retrieval.
- Local Ollama model for the mandatory demo path.
- Optional Anthropic and Gemini provider routing.
- Ship 30 for 30 essay generation.
- In-app Markdown/HTML artifact viewer.
- Basic automated backend tests and a manual UI test plan.
- Docker Compose startup and documented transcript acquisition.

### Excluded

- Authentication and multi-user authorization: not required for the take-home and would add infrastructure without improving the core evaluation.
- Real-time transcript scraping: batch ingestion is sufficient for the demo.
- Production-grade multi-region deployment, streaming generation, and enterprise observability: useful follow-on work, but outside the time-boxed engagement.

## 3. Problem → methodology → outcome

### Problem

A product team has a large body of expert conversation but no fast way to turn it into trustworthy, reusable answers. The core risk is not simply “the model may be wrong”; it is that a confident answer can be impossible to trace back to the knowledge source.

### Methodology

The system treats retrieval as the grounding boundary:

1. Acquire the transcript archive into a documented external data directory.
2. Parse episode metadata and transcript text.
3. Chunk transcripts and embed them with `nomic-embed-text` via Ollama.
4. Store chunks and vectors in PostgreSQL + pgvector.
5. Retrieve the top relevant chunks for each request.
6. Route the request to QA, Ship 30, or artifact generation.
7. Generate with the selected local or cloud provider using retrieved context.
8. Return source metadata and persist the conversation/artifact.

### Outcome

The product gives a user one workflow for researching, writing, and making. The evaluator can inspect where the answer came from, switch model providers, generate an artifact beside the conversation, and reproduce the setup without relying on a private transcript directory.

## 4. User flows

### Chat Q&A

User opens the application → starts/loads a session → asks a product or growth question → system retrieves transcript context → selected provider generates a grounded response → UI shows the answer and source metadata.

### Ship 30 for 30

User asks for an essay → system retrieves transcript context → `ship30` skill applies the requested structure → generated essay is returned in the chat.

### Artifact generation

User asks for a Markdown or HTML artifact → system retrieves relevant context → `artifact` skill generates the artifact marker → backend persists it → frontend opens the Artifact Viewer and renders HTML in a sandboxed iframe.

## 5. Acceptance criteria

- A fresh evaluator can identify where the transcript data comes from and fetch it with the documented command.
- The ingestion service reads the expected `episodes/*/transcript.md` layout and exits clearly when the dependency is missing.
- Transcript metadata and vector chunks are committed atomically for each ingestion unit.
- RAG retrieves relevant transcript chunks and returns source metadata.
- Local mode uses `llama3.2:1b` through host Ollama.
- Cloud modes route to Anthropic or Gemini when the corresponding key is configured.
- Sessions and messages persist in PostgreSQL.
- Artifact HTML is isolated in a sandboxed iframe rather than injected into the application DOM.
- Automated backend tests can be run with `make test`.
- The repository contains a concise manual UI test plan.
- README, PRD, architecture, and frontend documentation describe the implementation that actually exists.

## 6. Risks and trade-offs

### Grounding vs. recall

Strictly limiting generation to retrieved context reduces unsupported claims but can miss information when retrieval is weak. The current design favors traceability and explicit “not supported by the available material” behavior over broad model knowledge.

### Local quality vs. reproducibility

A small Ollama model makes the demo easier to run but is less capable than a larger cloud model. The provider toggle preserves a path to stronger models without making the local demo dependent on an API key.

### Latency vs. privacy

Local inference can be slower, especially on machines without sufficient memory/GPU. Running Ollama on the host was chosen after Dockerized Ollama caused OOM failures during corpus embedding.

### Data distribution

The transcript corpus is not committed to the application repository. This creates one additional setup step, but makes the ownership boundary explicit and avoids treating third-party transcript content as application source code.

### Artifact security

Generated HTML is untrusted. The viewer uses an iframe sandbox as an isolation boundary. A production system should add CSP, sanitization, and a separate origin for stronger defense-in-depth.

## 7. Implementation plan

1. **Foundation:** Next.js frontend, FastAPI backend, PostgreSQL + pgvector, Docker Compose.
2. **Knowledge layer:** External transcript acquisition, parsing, chunking, Ollama embeddings, vector retrieval.
3. **Core API:** Session and message endpoints with PostgreSQL persistence.
4. **Agent layer:** Explicit skill routing and provider-specific clients.
5. **Product surface:** Chat, session history, model toggle, citations, and Artifact Viewer.
6. **Hardening:** Atomic ingestion, error handling, automated tests, manual test plan, and evaluator documentation.

## 8. Evidence of engineering judgment

The project keeps a condensed record of three important corrections in `agent_transcripts/session_summary.md`: moving Ollama out of Docker after OOM failures, making ingestion atomic after discovering a partial-ingestion/idempotency bug, and simplifying the initial LangChain-based routing layer into explicit provider clients.
