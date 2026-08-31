# Agent Coding Session Summary

This file summarizes the AI coding-agent sessions used to build **The Lenny Growth Assistant**, including key failures, corrections, and the resulting engineering decisions.

## Session 1: Initial RAG setup and Ollama containerization

**Attempt:** We initially attempted to containerize Ollama alongside the FastAPI and Next.js applications using Docker Compose.

**Failure:** The Dockerized Ollama instance encountered repeated Out Of Memory (OOM) failures while embedding the podcast corpus, crashing the ingestion pipeline.

**Correction:** We removed Ollama from `docker-compose.yml` and configured the backend and ingestion service to target `http://host.docker.internal:11434`. Ollama now runs natively on the host, allowing it to use the host's available GPU and memory. This stabilized the embedding pipeline and kept the local demo reproducible without forcing the model into the application container.

## Session 2: Ingestion idempotency

**Attempt:** The ingestion script stored transcript metadata before all vector chunks had been generated.

**Failure:** When Ollama crashed mid-ingestion, the database could contain transcript metadata without a complete set of chunks. A subsequent run saw the transcript row and incorrectly treated it as already ingested.

**Correction:**

1. `rag.py` now uses `db.flush()` to obtain the transcript ID while keeping transcript metadata and vector chunks inside the same database transaction.
2. Failed ingestion calls roll back the transaction instead of leaving a partially ingested transcript.
3. A cleanup script (`scripts/cleanup_db.py`) was used during development to remove orphaned records created by the earlier implementation.

The important design principle is that an ingestion unit is committed only when its source record and generated chunks are complete.

## Session 3: Provider routing and dependency simplification

**Attempt:** The first response-generation implementation used LangChain for routing.

**Constraint:** The take-home requires an explicit agent/provider integration path, while the application also needed a local Ollama fallback.

**Correction:** The response-routing layer was simplified into explicit provider clients under `backend/app/agents/`: Ollama, Anthropic, and Gemini. The frontend exposes the provider selection and sends it through `X-LLM-Provider`.

LangChain remains a dependency for the transcript text-splitting/embedding implementation, but it is no longer the abstraction responsible for selecting or generating the final LLM response.

## What these sessions changed

The final architecture is intentionally shaped by the failures above:

- **Host Ollama** rather than Dockerized Ollama for resource access and stability.
- **Atomic ingestion** rather than “metadata first, vectors later.”
- **Explicit provider clients** rather than a large routing abstraction for a small application.
- **External transcript acquisition** rather than an implicit local-only dataset.

The raw coding-agent transcript is retained separately where appropriate; this summary surfaces the decisions that are most useful to a reviewer without requiring them to reconstruct the entire development history.
