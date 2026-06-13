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
- UI dédiée à construire séparément (plan visible en parallèle de la conversation, mis à jour en temps réel via SSE)

---

## Architecture

```
src/
  main.ts               # Point d'entrée CLI (boucle de conversation)
  server.ts             # Point d'entrée HTTP — POST /chat (SSE) + DELETE /session
  conversation-loop.ts  # runTurn(session, onChunk, onPlanUpdate) — stream + tool calls + récursion
  types.ts              # Session, Topic, Plan, Message
  tools/
    index.ts            # Définitions ChatCompletionTool[]
    handlers.ts         # Exécution des tools + retour du plan mis à jour
instructions.md         # Prompt système de l'agent
AGENTS.md               # Ce fichier — contexte projet injecté à l'agent
```

### Boucle de conversation (`runTurn`)

- Prend une `Session` (messages + plan) en entrée, retourne une `Session` mise à jour
- Stream OpenAI avec accumulation des chunks texte et tool calls
- Callbacks : `onChunk(text)` et `onPlanUpdate(plan)`
- Après le stream : exécution des tool calls → injection des résultats dans l'historique
- **Récursion** si des tools ont été appelés, pour que le modèle reprenne la parole
- Historique immutable (spread à chaque étape)

### État du plan

- Vit côté serveur
- Injecté en tête de contexte à chaque tour (avec indicateurs de statut : ✅ done / 🔄 active / ⬜ pending)
- L'UI le lira via SSE

---

## Tools implémentés

| Tool           | Description                                                     | Bloquant                       |
| -------------- | --------------------------------------------------------------- | ------------------------------ |
| `init_plan`    | Initialise le plan de discussion avec les grandes étapes        | Oui (confirmation utilisateur) |
| `update_topic` | Met à jour le statut d'un topic (`pending` → `active` → `done`) | Non                            |

---

## Backlog des tools

### Gestion du plan

- `add_topic` — ajoute un sujet en cours de session

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
- [ ] Implémenter `add_topic`
- [ ] UI dédiée avec plan visible en parallèle
