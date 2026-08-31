# Frontend

This directory contains the Next.js frontend for **The Lenny Growth Assistant**.

The frontend is normally run as part of the root Docker Compose stack. For the full setup, transcript acquisition steps, API configuration, and testing instructions, start with the [root README](../README.md).

For local frontend-only development:

```bash
npm install
npm run dev
```

The app expects the FastAPI backend at `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`).
