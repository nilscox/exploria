## Concept

This projet is a conversational AI agent to help users structure their thoughts and guide their reasoning. The agent can interact with the system through dedicated tools: add topics, save notes, etc. Users have access to a dedicated UI to interact with the system.

### Use cases

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

- **TypeScript / Node.js**
- **OpenAI SDK**
- **Express 5**
- **React 19 + Vite**
- **Tailwind CSS v4**

## Domain model

Session: A conversation with an IA agent
Topic: A topic of a conversation
Note: A note about something worth remembering
Message: A conversation message (system, assistant or user)
Timer: A session timer
SessionEvent: An event that happened during the session

## Architecture

Here are some important files.

```
client/src
  main.tsx              # React entrypoint
  index.css             # Tailwind styles
  components/           # Base components
  hooks/                # Reusable react hooks
  i18n/                 # Translation system
  session/              # Session module
server/src
  main.ts               # Server entrypoint
  di.ts                 # Dependency injection container
  shared.ts             # Code exposed to the client
  adapters/             # Interface and implementations of infrastructure code
  database/             # Persistance related code
  domain/               # Implementation of the domain's features
  http/                 # Controllers definition and http related code
```
