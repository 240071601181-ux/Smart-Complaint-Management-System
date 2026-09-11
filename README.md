# AI Voice Lead Qualification System

## Overview

A modular, production‑ready backend for an AI‑driven voice sales assistant tailored for logistics & transport companies. The system will:
- Receive leads and automatically call them via Vapi.
- Conduct multilingual conversations (Tamil, Hindi, English) using speech‑to‑text / text‑to‑speech.
- Qualify leads (HOT/WARM/COLD) and store all data in PostgreSQL.
- Integrate with CRM, Google Calendar/Meet, WhatsApp and n8n for automation.

## Quick Start (local development)

```bash
# Clone the repo (or copy the generated folder)
cd "C:/Users/Santhosh/OneDrive/ai project1/ai-voice-lead-qualification"

# Install dependencies
npm install

# Copy example env and fill in your credentials
cp .env.example .env
# edit .env with your keys

# Run the development server
npm run dev
```

The server starts on `http://localhost:3000` and exposes health‑check endpoints.

## Project Structure

```
ai-voice-lead-qualification/
├─ src/                # Application source code
│  ├─ config/          # Configuration loaders
│  ├─ routes/          # Express route definitions
│  ├─ controllers/     # Request handling logic
│  ├─ services/        # Business logic & integrations
│  ├─ integrations/    # Vapi, LLM, CRM, Calendar wrappers
│  ├─ tools/           # Function‑calling utilities
│  ├─ database/        # DB models & migrations
│  ├─ middleware/      # Auth, error handling, logging
│  └─ utils/           # Helpers
├─ tests/              # Unit / integration tests
├─ docs/               # Architecture & design docs
├─ .env.example        # Environment variable template
├─ .gitignore
├─ package.json
├─ tsconfig.json
└─ README.md
```

For detailed architecture, see `docs/architecture.md`.
