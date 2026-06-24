# CLAUDE.md

## Project Overview

**Exploria** is a full-stack web application for guided deep-thinking and reflection sessions powered by an AI assistant. The assistant acts as a thinking facilitator — it poses questions, challenges reasoning, and identifies cognitive biases — rather than providing direct answers. The system prompt is in French (`server/src/domain/instructions.md`).

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

## Monorepo Structure

```
exploria/
├── client/          # React frontend
├── server/          # Node.js/Express backend
├── package.json     # Root scripts (lint, fmt)
├── pnpm-workspace.yaml
├── oxlint.config.ts
└── oxfmt.config.ts
```

**Package manager**: pnpm 10 with workspaces.

## Technology Stack

### Frontend (`client/`)

- React 19, React Router 7, Vite 8
- TanStack React Query 5 (server state), Immer 11 (immutable state)
- Tailwind CSS 4, Class Variance Authority (CVA) for component variants
- Radix UI primitives, Lucide icons, React Hot Toast
- Lingui (i18n — English and French)
- Remark/Rehype for Markdown rendering
- Storybook 10 for component development
- TypeScript 6 strict mode, Zod for validation

### Backend (`server/`)

- Node.js + Express 5, TypeScript 6
- PostgreSQL + Drizzle ORM (beta)
- OpenAI SDK for LLM interactions (model-agnostic via `OPEN_AI_BASE_URL`)
- Awilix 13 for dependency injection (IoC container)
- Server-Sent Events (SSE) for real-time streaming
- Nanoid 5 for 8-character IDs
- Node native test runner (`*.spec.ts` files)

## Server Architecture

Domain-Driven Design with layered architecture:

```
server/src/
├── adapters/        # Pluggable infrastructure (AiClient, Clock, Generator, Config)
├── domain/
│   ├── session.ts   # Session aggregate root (event sourcing)
│   ├── assistant.ts # AI interaction logic
│   └── tools/       # AI tools (initPlan, saveNote, startTimer, etc.)
├── database/        # Drizzle schema + SessionRepository
├── http/            # Express routes + SSE notifier
├── di.ts            # Awilix container wiring
├── event-bus.ts     # Pub/sub event bus
└── main.ts
```

### Key Patterns

- **Event Sourcing**: all session state changes are captured as immutable domain events stored in `domain_events` table
- **Aggregate Root**: `Session` owns all business logic; mutated only via domain events
- **Repository Pattern**: `SessionRepository` handles persistence; replay events to reconstruct state
- **Adapter Pattern**: `AiClient`, `Clock`, `Generator` have stub implementations for testing
- **Dependency Injection**: Awilix container in `di.ts`; all dependencies injected, never imported directly in domain

### Where to find more

- **Database schema**: `server/src/database/schema.ts`
- **API endpoints**: `server/src/http/` (one file per route group)
- **AI tools**: `server/src/domain/tools/` (one file per tool)

## Client Architecture

```
client/src/
├── components/      # Reusable UI components (Button, Input, Modal, etc.)
├── session/         # Session feature (sidebar, timer, topics, events, notes)
├── hooks/           # useNow, useSession
├── i18n/            # Lingui setup
├── api.ts           # HTTP + SSE client
├── main.tsx
└── utils.ts
```

### State Flow

1. React Query fetches session data via REST
2. SSE connection (`/session/:id/stream`) streams real-time events
3. SSE events: `Chunk` (AI text streaming), `SessionChanged`, `EventEmitted`
4. `useSession` hook holds local state, updated via Immer reducer
5. Shared types come from the server package (`Shared` namespace)

## Environment Variables

**Server** (`.env`):

```
OPEN_AI_BASE_URL=   # LLM provider endpoint
OPEN_AI_API_KEY=    # API key
DATABASE_URL=       # PostgreSQL connection string
HOST=localhost
PORT=3000
ASSISTANT=test      # Use stub assistant (omit for real)
```

**Client** (`.env`):

```
VITE_DEFAULT_MODEL= # Default LLM model name
```

## Development Commands

```bash
# Root
pnpm lint           # oxlint
pnpm fmt            # oxfmt

# Server (cd server/)
pnpm dev            # nodemon hot reload
pnpm test           # native Node test runner

# Client (cd client/)
pnpm dev            # Vite dev server on :8000
pnpm storybook      # Storybook on :6006
```

## Code Conventions

- **Files**: kebab-case (`session-sidebar.tsx`, `event-bus.ts`)
- **Components/Classes**: PascalCase
- **Functions/Variables**: camelCase
- **No comments** unless the WHY is non-obvious
- CVA for component variants (never ad-hoc conditional className strings)
- Zod schemas colocated with the types they validate
- Tests use stub adapters (`StubAiClient`, `StubClock`, `StubGenerator`, `StubUiNotifier`)
- IDs are 8-character nanoid strings, not UUIDs
- **Each component has one clear responsibility**: when a piece of JSX represents a distinct concept, extract it into a named component defined just below in the same file, regardless of its size.
