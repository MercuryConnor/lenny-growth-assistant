# Agent Coding Session Summary

This file summarizes the AI coding agent sessions used to build "The Lenny Growth Assistant", including key challenges, failed attempts, and the resulting architectural corrections.

## Session 1: Initial RAG Setup and Ollama Containerization
**Attempt:** We initially attempted to containerize Ollama directly alongside the FastAPI and Next.js applications using `docker-compose`.
**Failure:** The Dockerized Ollama instance encountered frequent Out of Memory (OOM) errors during the embedding of 303 podcast transcripts, crashing the ingestion pipeline (`{"error":"llama-server process has terminated: exit status 1"}`).
**Correction:** We removed Ollama from the `docker-compose.yml` and reconfigured the backend and ingestion scripts to target `http://host.docker.internal:11434`. This allowed Ollama to run natively on the host machine, granting it full access to the host's GPU and memory, which stabilized the pipeline.

## Session 2: Ingestion Pipeline Idempotency
**Attempt:** The ingestion script was designed to process transcripts and mark them as ingested in the PostgreSQL database.
**Failure:** When the Ollama process crashed mid-ingestion, the database committed the transcript metadata *before* the chunks were generated. Upon restarting the ingestion pipeline, the script skipped "half-baked" transcripts, assuming they were fully ingested.
**Correction:** 
1. We modified `rag.py` to use a single atomic transaction (`db.flush()`) so that transcript metadata and their vector chunks are committed together (all-or-nothing).
2. We wrote a cleanup script (`scripts/cleanup_db.py`) to purge 256 orphaned transcripts from the database.
3. Restarting the ingestion pipeline successfully processed the remaining transcripts.

## Session 3: Cloud LLM Integration & SDK Compliance
**Attempt:** We built the initial agent routing layer using `langchain`.
**Feedback:** The assignment rubric specifically requested using the Anthropic Claude Agent SDK or Pi Coding Agent.
**Correction:** We refactored `backend/app/agents/router.py` to remove Langchain dependency for response generation. We implemented a native `Anthropic` client in `anthropic_client.py` and added a frontend UI toggle that passes an `X-LLM-Provider` header. This allowed us to meet the SDK requirement while maintaining local Ollama fallback capability.

## Note on Raw Transcripts
The complete JSONL transcripts of the conversation are maintained locally on the development machine by the IDE. This summary abstracts the core technical pivots for evaluation purposes.
