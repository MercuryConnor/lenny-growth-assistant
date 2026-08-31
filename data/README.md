# Transcript data

The transcript corpus is intentionally **not committed** to this repository. It contains third-party podcast content and is large enough that checking it into the application repo would make the take-home unnecessarily heavy.

The ingestion container expects the following layout:

```text
data/lenny-transcripts/
└── episodes/
    └── <episode>/
        └── transcript.md
```

## Fetch the corpus

The default source used by this project is the public transcript archive maintained by ChatPRD:

```bash
git clone https://github.com/ChatPRD/lennys-podcast-transcripts.git data/lenny-transcripts
```

The archive provides the `episodes/<guest>/transcript.md` structure expected by the ingestion pipeline.

Alternatively, point `TRANSCRIPTS_HOST_DIR` in `.env` at an existing checkout of a compatible transcript archive.

## Why it is external

The application source code is MIT-licensed, but the podcast transcripts are third-party content. Keeping the corpus outside this repository makes that boundary explicit and avoids redistributing the transcript archive as part of the application.

If the transcript directory is missing, `ingest` exits with a clear error instead of silently presenting an empty knowledge base.
