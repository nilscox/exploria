# CLAUDE.md

## Project Overview

**Exploria** is a full-stack web application for guided deep-thinking and reflection sessions powered by an AI assistant. The assistant acts as a thinking facilitator — it poses questions, challenges reasoning, and identifies cognitive biases — rather than providing direct answers. The system prompt lives in `server/templates/instructions.{en,fr}.md`, rendered per-session via the i18n adapter.

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
│   ├── session.ts   # Session aggregate root (event-sourced write model)
│   ├── timer.ts     # Timer value object (domain calculations)
│   ├── assistant.ts # AI interaction logic
│   ├── projections/ # Read models: session-view (UI), chat-context (LLM)
│   ├── assistant-tools.ts  # AI tools (setSubject, addTopics, saveNote, startTimer, setPosture, etc.)
│   └── summary-generator.ts # Generates the exportable end-of-session summary
├── database/        # Drizzle schema + SessionRepository
├── http/            # Express routes + SSE notifier
├── di.ts            # Awilix container wiring
├── event-bus.ts     # Pub/sub event bus (reserved for future cross-context use)
└── main.ts
```

### Key Patterns

- **Event Sourcing**: the `domain_events` table is the single source of truth for session state. The `sessions` table holds only lightweight columns (id, model, subject, createdAt) for listing. `Session.replay()` rebuilds an aggregate by applying its events in order.
- **Aggregate Root**: `Session` owns all business logic. A command validates invariants and `emit`s an event; a single `apply(event)` mutates state and is the _only_ place state changes — shared by the live path (`emit` calls `apply`) and replay. Domain calculations live in value objects (e.g. `Timer`).
- **CQRS / read-model projections**: read models are pure folds over the event stream, decoupled from the write model (they may legitimately diverge from it). `projections/session-view.ts` builds the `Shared.Session` the client consumes (including the `timeline`); `projections/chat-context.ts` builds the OpenAI message list. The aggregate keeps only the state it needs to enforce invariants.
- **Repository Pattern**: `SessionRepository` persists new domain events (plus the lightweight `sessions` row); `find()` loads events and calls `Session.replay()`.
- **Adapter Pattern**: `AiClient`, `Clock`, `Generator` have stub implementations for testing
- **Dependency Injection**: Awilix container in `di.ts`; all dependencies injected, never imported directly in domain

### Where to find more

- **Database schema**: `server/src/database/schema.ts`
- **API endpoints**: `server/src/http/` (one file per route group)
- **AI tools**: `server/src/domain/assistant-tools.ts` (all tools in one file, built by `createTools`)
- **System prompt & templates**: `server/templates/*.{en,fr}.md`

## Client/Server Communication

- **REST** drives commands (`POST`/`PUT`/`DELETE` on `/session/...`) and the initial read: `GET /session/:id` returns a `Shared.Session` read model built by the SessionView projection (not the aggregate).
- **SSE** (`GET /session/:id/stream`) streams real-time updates:
  - `SessionChanged { changes: Partial<Shared.Session> }` — projection deltas (sidebar state + the recomputed `timeline`).
  - `Chunk` — LLM token streaming, ephemeral, emitted by the `Assistant`.
- UI updates are pushed **optimistically during** use-case execution via the injected `UiNotifier` (the SSE notifier). Token streaming bypasses the event log; state changes are sent as projection deltas, never as raw domain events.
- The `Shared` namespace (server package) is the single source of truth for the contract — the client only sees the projected read model.

## Client Architecture

```
client/src/
├── components/      # Reusable UI components (Button, Input, Modal, etc.)
├── session/         # Session feature (sidebar, timer, topics, timeline, notes)
├── hooks/           # useNow, useSession
├── i18n/            # Lingui setup
├── api.ts           # HTTP + SSE client
├── main.tsx
└── utils.ts
```

### State Flow

1. React Query fetches the `Shared.Session` read model via `GET /session/:id`
2. An SSE connection (`/session/:id/stream`) streams `Chunk` (AI text) and `SessionChanged` (projection deltas)
3. `useSession` holds local state via an Immer reducer (`SessionChanged` → `Object.assign`; `Chunk` → append to the streaming buffer)
4. The conversation renders from `session.timeline` (message + notification items); the sidebar from `topics`/`notes`/`timer`
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
pnpm typecheck  # run the type checker
pnpm lint       # run the linter (oxlint)
pnpm fmt        # run the formatter (oxfmt)
```

> These commands should be launched from the repository's root directory. When adding `--filter <workspace>`, they will run for a specific workspace only. The two available workspaces are `@exploria/server` and `@exploria/client`.

```bash
pnpm --filter @exploria/server test 'src/**/*.spec.ts'      # run the server's unit tests
pnpm --filter @exploria/server test 'src/**/*.e2e-spec.ts'  # run the server's end-to-end tests
```

### i18n (Lingui)

After adding or modifying `<Trans>` tags in the client, update translations:

```bash
pnpm --filter @exploria/client exec lingui extract --clean   # update .po files (removes obsolete, adds missing)
# then fill in msgstr "" entries in client/src/i18n/fr/messages.po
pnpm --filter @exploria/client exec lingui compile --typescript  # generate .ts catalogs from .po files
```

When filling in translations: read the full `.po` file, generate **all** missing `msgstr` entries at once, then write the file in a **single Write operation** (not multiple Edits).

Source language is English. Translation files live in `client/src/i18n/{locale}/messages.po`.

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
- **Always use braces** for `if` blocks, even single-line returns: `if (x) { return; }` not `if (x) return;`
- **Blank line between `const` declarations and surrounding instructions**: separate declaration blocks from imperative statements with an empty line above and below. Exception: there may be no empty line between a const declaration and an assertion on this value.
- **Private static helpers** on a class (e.g. `private static mapEvent`) are preferred over module-level functions when the helper is only used by that class. Add `this: void` to the signature when passing it as a callback (e.g. `.map(MyClass.helper)`) to satisfy the linter.
- **Commit messages**: one short imperative line, no bullet list, no `Co-Authored-By` trailer.
