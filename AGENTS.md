# Contexte du projet — Conversation Agent

Tu travailles sur un projet en cours de développement. Ce fichier est ton point de référence : il décrit l'état actuel du projet, l'architecture, les tools disponibles et les prochaines étapes. Il est mis à jour au fil des sessions.

---

## Instructions pour l'agent de dev (toi)

- **Tiens ce fichier à jour** de manière autonome après chaque changement significatif : nouvelle étape cochée, nouvelle convention apprise, architecture modifiée.
- **Mets à jour les "Prochaines étapes"** dès qu'une tâche est terminée, sans attendre qu'on te le demande.
- **Enregistre les conventions de travail** apprises en cours de session. Exemple : si l'utilisateur te dit qu'une pratique n'est pas nécessaire, note-le ici pour ne pas la répéter.

### Conventions de travail

- Ne pas vérifier la compilation (`pnpm tsc --noEmit`) après chaque étape — l'utilisateur signalera les erreurs si besoin.

---

## Concept

Un agent IA pour structurer et challenger la réflexion, avec une UI dédiée. La valeur ajoutée vs un chatbot classique : des **tool calls** pour planifier et structurer la discussion en temps réel.

L'agent suit un plan de discussion structuré (topics avec statuts), l'adapte en cours de route, et apporte un regard critique après chaque réponse de l'utilisateur.

---

## Stack

- **TypeScript / Node.js**
- **SDK OpenAI** avec `baseURL` → `https://api.mammouth.ai/v1`
- **Express 5** pour le point d'entrée HTTP
- **React 19 + Vite + Tailwind CSS v4** pour le client

---

## Architecture

```
client/
  main.tsx              # Point d'entrée React
  app.tsx               # Composant racine
  types.ts              # Types partagés côté client
  utils.ts              # Utilitaires côté client
  details.tsx           # Composant Details
  markdown.tsx          # Composant Markdown
  index.css             # Styles Tailwind
server/
  main.ts               # Point d'entrée HTTP (lance le serveur Express)
  server.ts             # Routes Express — GET /chat (SSE), GET/DELETE /session
  assistant.ts          # Classe Assistant (EventEmitter) — stream LLM + tool calls
  session.ts            # Classe Session (EventEmitter) — état messages + plan + events
  cli.ts                # Point d'entrée CLI (boucle de conversation)
  types.ts              # Message, Plan, Topic, TopicStatus, SessionEvent
  utils.ts              # Utilitaires (assert, createId, has, etc.)
  tools/
    tool.ts             # Type Tool<Param> — interface commune pour tous les tools
    index.ts            # Export du tableau de tools
    init-plan.ts        # Tool init_plan
    add-topic.ts        # Tool add_topic
    update-topic.ts     # Tool update_topic
index.html              # Point d'entrée HTML (Vite)
instructions.md         # Prompt système de l'agent
AGENTS.md               # Ce fichier — contexte projet injecté à l'agent
```

### Classe `Assistant`

- `EventEmitter<{ chunk: [text: string] }>` — émet les chunks de texte au fil du stream
- `run(session)` — stream OpenAI, accumule texte + tool calls, récursion si tools appelés
- Les tools sont définis comme objets `Tool<Param>` avec Zod pour la validation des args
- Injecte l'état du plan sérialisé en fin de contexte à chaque appel

> `TopicStatus` : `pending` | `in_progress` | `done`

### Classe `Session`

- `EventEmitter` typé sur `SessionEvent` — émet `plan_updated`, `topic_added`, `topic_updated`, `message_added`
- Méthodes : `setPlan()`, `addTopic()`, `updateTopic()`, `setCurrentTopic()`, `addMessage()`, `serialize()`
- `Session.from(data)` — factory pour restaurer une session depuis des données sérialisées
- Accumule les events dans `_sessionEvents` (source de vérité pour l'UI)
- Le serveur SSE s'abonne aux events pour les streamer au client

### Routes HTTP

| Méthode  | Route               | Description                           |
| -------- | ------------------- | ------------------------------------- |
| `GET`    | `/session`          | Retourne l'état courant de la session |
| `DELETE` | `/session`          | Réinitialise la session               |
| `GET`    | `/chat?message=...` | Stream SSE                            |

### Type `Tool<Param>`

```ts
type Tool<Param extends z.ZodType> = {
  name: string;
  description: string;
  param: Param; // schéma Zod — utilisé pour la définition ET la validation
  execute(session: Session, param: z.infer<Param>): string | Promise<string>;
};
```

---

## Tools implémentés

| Tool           | Description                                              |
| -------------- | -------------------------------------------------------- |
| `init_plan`    | Initialise le plan de discussion avec les grandes étapes |
| `add_topic`    | Ajoute un sujet au plan en cours de session              |
| `update_topic` | Met à jour le statut d'un topic                          |

---

## Backlog des tools

### Mémoire & contexte

- `save_note` — sauvegarde un point clé ou une citation de l'utilisateur
- `get_session_summary` — récupère les notes accumulées pour générer la synthèse

### Structuration

- `create_mindmap` — génère une mind map à partir des éléments discutés
- `generate_synthesis` — produit la synthèse finale structurée

### Gestion du temps

- `start_timer` — démarre un timer pour une section
- `get_elapsed_time` — consulte le temps écoulé

### Enrichissement externe

- `web_search` — recherche web pour ancrer la discussion dans des faits
- `fetch_url` — récupère le contenu d'une URL fournie par l'utilisateur

### Calibrage de session

- `set_session_config` — définit le mode, la posture, la durée cible
- `suggest_session_type` — suggère un type de session selon le sujet

---

## Types de sessions supportés

### Professionnel

- Préparation à une négociation (salaire, contrat)
- Rétrospective personnelle (ce qui s'est passé, pourquoi)
- Clarification d'une vision produit

### Intellectuel

- Débat philosophique structuré
- Analyse d'un texte ou d'une thèse
- Construction d'une opinion sur un sujet complexe

### Personnel

- Prise de décision sous stress émotionnel
- Clarification de valeurs personnelles
- Journaling guidé avec approfondissement

### Créatif

- Brainstorming avec contraintes progressives
- Worldbuilding / construction d'un univers
- Critique constructive d'un projet créatif

---

## Prochaines étapes

- [x] Boucle de conversation continue dans `main.ts`
- [x] Injection du plan dans le contexte à chaque tour (avec indicateurs de statut)
- [x] Point d'entrée HTTP avec SSE pour streamer vers le client
- [ ] Gestion des actions utilisateur (édition du plan entre deux messages)
- [x] Implémenter `add_topic`
- [ ] UI dédiée avec plan visible en parallèle
