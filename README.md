# Exploria

A web application for guided deep-thinking and reflection sessions powered by an AI assistant. The assistant acts as a thinking facilitator — it poses questions, challenges reasoning, and identifies cognitive biases — rather than providing direct answers.

## Use cases

**Professional**
- Negotiation preparation (salary, contract)
- Personal retrospective (what happened, why)
- Clarifying a product vision

**Intellectual**
- Structured philosophical debate
- Analyzing a text or thesis
- Formulating an opinion on a complex topic

**Personal**
- Decision-making under emotional stress
- Clarifying personal values
- Guided, in-depth journaling

**Creative**
- Brainstorming with progressive constraints
- World-building
- Constructive critique of a creative project

## Stack

- **Frontend**: React 19, React Router, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express 5, PostgreSQL, Drizzle ORM
- **AI**: OpenAI-compatible API (model-agnostic via `OPEN_AI_BASE_URL`)
- **Monorepo**: pnpm workspaces

## Getting started

```bash
# Install dependencies
pnpm install

# Server
cd server && pnpm dev

# Client
cd client && pnpm dev
```

See `CLAUDE.md` for architecture details and code conventions.
