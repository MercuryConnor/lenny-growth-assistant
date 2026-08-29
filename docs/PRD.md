# Product Requirements Document (PRD): The Lenny Growth Assistant

## 1. Discovery Brief

### User and Problem
**Primary User:** Internal product and growth team members.
**Job to be Done:** Quickly synthesize insights from Lenny's Podcast transcripts to answer specific product/growth questions and generate reusable content (e.g., Ship 30 for 30 essays, UI mockups).
**Pain Point:** Manually reading through hours of transcripts or searching unstructured text is time-consuming. Users lack technical expertise to build complex prompts or manage AI models directly. They need a reliable, grounded assistant that provides formatted, ready-to-use artifacts.

### Success Metric
**Operational Metric:** Time saved per content generation task (e.g., reducing the time to draft a "Ship 30 for 30" essay based on transcript insights from hours to under 5 minutes).
**Product Metric:** Percentage of answers successfully grounded in transcripts vs. generic or hallucinated responses (target: >95%).

### Assumptions
- The primary language for interaction and content generation is English.
- The transcript dataset is static or updated periodically via a batch process; real-time ingestion is not required for the demo.
- Users have basic familiarity with chat interfaces and markdown formatting.
- For the local demo, the evaluator's machine has sufficient resources to run Ollama and a moderately sized model (e.g., Llama 3 8B).

### Scope Choices
**Included:**
- Conversational interface with context preservation.
- RAG pipeline utilizing a vector database (pgvector) for accurate transcript retrieval.
- "Ship 30 for 30" essay generation skill.
- In-app Artifact Viewer for Markdown and HTML/CSS.
- Flexible LLM configuration (Cloud APIs vs. Local Ollama).

**Excluded (and why):**
- Authentication/Authorization: Not specified in requirements; adds unnecessary complexity for a demo.
- Real-time transcript scraping: We will assume a pre-populated or easily loaded static dataset to focus on the RAG and agentic aspects.
- Complex user management: We will use simple session IDs for persistence.

### Risks and Trade-offs
- **Hallucination vs. Strict Grounding:** Risk of the model answering from its pre-training rather than transcripts. We will mitigate this with strong system prompts and strict retrieval thresholds.
- **Latency (Local Models):** Running Ollama locally may result in higher latency compared to cloud APIs. We trade speed for privacy and local executability.
- **Artifact Rendering Security:** Generating raw HTML/CSS poses XSS risks. We will mitigate this by using sandboxed iframes for rendering artifacts.

### User Flows
1. **Chat Q&A:** User opens app -> Types a product question -> System retrieves context -> Anthropic/Ollama generates grounded answer -> UI displays answer.
2. **Ship 30 Essay Generation:** User asks for an essay -> System retrieves context -> Triggers specific Ship 30 prompt chain -> UI displays formatted essay.
3. **Artifact Generation:** User asks for a UI mockup -> System retrieves context -> Triggers artifact prompt chain -> UI renders output securely in side-by-side Artifact Viewer.

### Acceptance Criteria
- System successfully parses and ingests Lenny's transcripts into a local `pgvector` database.
- RAG correctly retrieves relevant transcripts based on semantic similarity.
- "Local" mode successfully queries the host Ollama `qwen3:4b` model.
- "Cloud" mode successfully routes queries to the Anthropic API via the `X-LLM-Provider` header.
- Artifacts containing HTML/JS are rendered securely without XSS vulnerabilities.
- Backend API includes health checks, robust error handling, and session persistence.

### Implementation Plan
1. **Foundation:** Set up Next.js frontend, FastAPI backend, and PostgreSQL with pgvector using Docker Compose.
2. **Ingestion Pipeline:** Write Python script to parse markdown transcripts and embed them using local Ollama.
3. **Core APIs:** Develop `/sessions` and `/messages` endpoints.
4. **Agent Layer:** Implement Langchain/Anthropic SDK routing logic with specific tools for Ship 30 and Artifacts.
5. **UI Development:** Build chat interface, typing indicators, and the sandboxed Artifact Viewer.
6. **Polish & Deploy:** Add LLM Cloud toggle, automated tests, logging, and finalize documentation.
