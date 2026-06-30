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

1. Set environment variables

Server env (`server/.env`)

- `OPEN_AI_BASE_URL` - OpenAI-compatible API URL for chat completion
- `OPEN_AI_API_KEY` - Chat completion API key
- `DATABASE_URL` - Postgres database URL
- `TAVILY_API_KEY` - Tavily API key (optional)
- `COOKIE_SECRET` - Random string to sign cookies
- `CLIENT_URL` - Client URL

Client env (`client/.env`)

- `VITE_API_BASE_URL` - API URL
- `VITE_DEFAULT_MODEL` - Default model when creating a session

2. Install dependencies

```bash
pnpm install
```

3. Run the database migrations

```bash
pnpm --filter @exploria/server exec drizzle-kit migrate
```

4. Start the project

```bash
pnpm --filter @exploria/server dev
pnpm --filter @exploria/client dev
```

See `CLAUDE.md` for architecture details and code conventions.
